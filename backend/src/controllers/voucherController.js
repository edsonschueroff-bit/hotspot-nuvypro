const db = require("../../db");
const crypto = require("crypto");

function gerarCodigoUnico(prefixo = "WIFI", tamanho = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0, O, 1, I para legibilidade
  let str = "";
  for (let i = 0; i < tamanho; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefixo.trim().toUpperCase()}-${str}`;
}

exports.gerarLote = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const empresaId = req.empresa_id;
    const { nome_lote, plano_id, quantidade, prefixo } = req.body;

    if (!empresaId) return res.status(401).json({ message: "Não autorizado" });
    if (!nome_lote || !plano_id || !quantidade) {
      return res.status(400).json({ message: "Nome do lote, plano e quantidade são obrigatórios" });
    }

    const qtd = Math.min(Math.max(parseInt(quantidade, 10) || 10, 1), 200);
    const pref = (prefixo || "WIFI").replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);

    // Buscar dados do plano
    const [[plano]] = await conn.execute(
      "SELECT * FROM planos WHERE id = ? AND empresa_id = ?",
      [plano_id, empresaId]
    );
    if (!plano) {
      return res.status(404).json({ message: "Plano selecionado não encontrado" });
    }

    await conn.beginTransaction();

    // 1. Inserir lote
    const [loteRes] = await conn.execute(
      `INSERT INTO vouchers_lotes (empresa_id, plano_id, nome_lote, quantidade, prefixo)
       VALUES (?, ?, ?, ?, ?)`,
      [empresaId, plano_id, nome_lote, qtd, pref]
    );
    const loteId = loteRes.insertId;

    // 2. Gerar vouchers e registrar no RADIUS
    const vouchersCriados = [];
    const duracaoSegundos = (plano.duracao_minutos || 60) * 60;
    const speedLimit = `${plano.velocidade_up || 2}M/${plano.velocidade_down || 5}M`;

    for (let i = 0; i < qtd; i++) {
      const codigo = gerarCodigoUnico(pref, 4);
      const senha = codigo; // Senha igual ao código para facilitar uso

      // Inserir no banco
      const [vRes] = await conn.execute(
        `INSERT INTO vouchers (lote_id, empresa_id, plano_id, codigo, senha, status)
         VALUES (?, ?, ?, ?, ?, 'disponivel')`,
        [loteId, empresaId, plano_id, codigo, senha]
      );

      // Provisionar no FreeRADIUS (radcheck, radreply, radius_users)
      await conn.execute(
        `INSERT INTO radcheck (username, attribute, op, value) VALUES (?, 'Cleartext-Password', ':=', ?)
         ON DUPLICATE KEY UPDATE value = ?`,
        [codigo, senha, senha]
      );

      await conn.execute(
        `INSERT INTO radcheck (username, attribute, op, value) VALUES (?, 'Max-Daily-Session', ':=', ?)
         ON DUPLICATE KEY UPDATE value = ?`,
        [codigo, String(duracaoSegundos), String(duracaoSegundos)]
      );

      await conn.execute(
        `INSERT INTO radreply (username, attribute, op, value) VALUES (?, 'Mikrotik-Rate-Limit', ':=', ?)
         ON DUPLICATE KEY UPDATE value = ?`,
        [codigo, speedLimit, speedLimit]
      );

      await conn.execute(
        `INSERT INTO radius_users (empresa_id, username, plano_id, nas_id) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE plano_id = ?`,
        [empresaId, codigo, plano_id, plano.mikrotik_id || null, plano_id]
      );

      vouchersCriados.push({ id: vRes.insertId, codigo, senha, status: "disponivel" });
    }

    await conn.commit();

    res.status(201).json({
      message: `Lote criado com sucesso com ${qtd} vouchers!`,
      lote: {
        id: loteId,
        nome_lote,
        plano_nome: plano.nome,
        quantidade: qtd,
        vouchers: vouchersCriados
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error("Erro ao gerar lote de vouchers:", err);
    res.status(500).json({ message: "Erro ao gerar lote de vouchers" });
  } finally {
    conn.release();
  }
};

exports.listarLotes = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const [lotes] = await db.query(
      `SELECT vl.*, p.nome AS plano_nome, p.valor AS plano_valor, p.duracao_minutos,
        (SELECT COUNT(*) FROM vouchers WHERE lote_id = vl.id) AS total_vouchers,
        (SELECT COUNT(*) FROM vouchers WHERE lote_id = vl.id AND status = 'disponivel') AS total_disponiveis,
        (SELECT COUNT(*) FROM vouchers WHERE lote_id = vl.id AND status = 'utilizado') AS total_utilizados
       FROM vouchers_lotes vl
       JOIN planos p ON p.id = vl.plano_id
       WHERE vl.empresa_id = ?
       ORDER BY vl.criado_em DESC`,
      [empresaId]
    );
    res.json(lotes);
  } catch (err) {
    console.error("Erro ao listar lotes de vouchers:", err);
    res.status(500).json({ message: "Erro ao listar lotes de vouchers" });
  }
};

exports.obterLoteDetalhado = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;

    const [[lote]] = await db.query(
      `SELECT vl.*, p.nome AS plano_nome, p.valor AS plano_valor, p.duracao_minutos, p.velocidade_down, p.velocidade_up,
        e.nome AS empresa_nome
       FROM vouchers_lotes vl
       JOIN planos p ON p.id = vl.plano_id
       JOIN empresas e ON e.id = vl.empresa_id
       WHERE vl.id = ? AND vl.empresa_id = ?`,
      [id, empresaId]
    );

    if (!lote) return res.status(404).json({ message: "Lote não encontrado" });

    const [vouchers] = await db.query(
      "SELECT * FROM vouchers WHERE lote_id = ? AND empresa_id = ? ORDER BY id ASC",
      [id, empresaId]
    );

    res.json({ ...lote, vouchers });
  } catch (err) {
    console.error("Erro ao obter detalhes do lote:", err);
    res.status(500).json({ message: "Erro ao obter detalhes do lote" });
  }
};

exports.deletarLote = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;

    // Buscar vouchers desse lote
    const [vouchers] = await conn.execute(
      "SELECT codigo FROM vouchers WHERE lote_id = ? AND empresa_id = ?",
      [id, empresaId]
    );

    await conn.beginTransaction();

    // Limpar RADIUS
    for (const v of vouchers) {
      await conn.execute("DELETE FROM radcheck WHERE username = ?", [v.codigo]);
      await conn.execute("DELETE FROM radreply WHERE username = ?", [v.codigo]);
      await conn.execute("DELETE FROM radusergroup WHERE username = ?", [v.codigo]);
      await conn.execute("DELETE FROM radius_users WHERE username = ? AND empresa_id = ?", [v.codigo, empresaId]);
    }

    // Deletar lote (cascateia na tabela vouchers)
    await conn.execute("DELETE FROM vouchers_lotes WHERE id = ? AND empresa_id = ?", [id, empresaId]);

    await conn.commit();
    res.json({ message: "Lote e credenciais de vouchers removidos com sucesso!" });
  } catch (err) {
    await conn.rollback();
    console.error("Erro ao deletar lote:", err);
    res.status(500).json({ message: "Erro ao deletar lote" });
  } finally {
    conn.release();
  }
};
