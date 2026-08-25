const db = require("../../db");
const { enviarMensagemDireta } = require("./whatsappController");

// ==================== REGRAS DE FIDELIDADE ====================

exports.listarRegras = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const [regras] = await db.query(
      `SELECT fr.*, c.titulo AS cupom_titulo, c.codigo_prefixo AS cupom_prefixo,
        (SELECT COUNT(*) FROM fidelidade_historico WHERE regra_id = fr.id AND empresa_id = ?) AS total_recompensas_entregues
       FROM fidelidade_regras fr
       LEFT JOIN cupons c ON c.id = fr.cupom_id AND c.empresa_id = ?
       WHERE fr.empresa_id = ?
       ORDER BY fr.visitas_necessarias ASC`,
      [empresaId, empresaId, empresaId]
    );
    res.json(regras);
  } catch (err) {
    console.error("Erro ao listar regras de fidelidade:", err);
    res.status(500).json({ message: "Erro ao listar regras" });
  }
};

exports.criarRegra = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const {
      titulo, visitas_necessarias, tipo_recompensa,
      cupom_id, descricao_recompensa, mensagem_whatsapp, ativo
    } = req.body;

    if (!titulo || !visitas_necessarias || !descricao_recompensa) {
      return res.status(400).json({ message: "Título, visitas necessárias e descrição são obrigatórios" });
    }

    const [result] = await db.execute(
      `INSERT INTO fidelidade_regras 
       (empresa_id, titulo, visitas_necessarias, tipo_recompensa, cupom_id, descricao_recompensa, mensagem_whatsapp, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        titulo,
        parseInt(visitas_necessarias, 10) || 5,
        tipo_recompensa || "cupom_desconto",
        cupom_id || null,
        descricao_recompensa,
        mensagem_whatsapp || null,
        ativo !== false ? 1 : 0
      ]
    );

    res.status(201).json({ id: result.insertId, message: "Regra de fidelidade criada com sucesso!" });
  } catch (err) {
    console.error("Erro ao criar regra de fidelidade:", err);
    res.status(500).json({ message: "Erro ao criar regra" });
  }
};

exports.atualizarRegra = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;
    const {
      titulo, visitas_necessarias, tipo_recompensa,
      cupom_id, descricao_recompensa, mensagem_whatsapp, ativo
    } = req.body;

    await db.execute(
      `UPDATE fidelidade_regras
       SET titulo = ?, visitas_necessarias = ?, tipo_recompensa = ?,
           cupom_id = ?, descricao_recompensa = ?, mensagem_whatsapp = ?, ativo = ?
       WHERE id = ? AND empresa_id = ?`,
      [
        titulo,
        parseInt(visitas_necessarias, 10) || 5,
        tipo_recompensa || "cupom_desconto",
        cupom_id || null,
        descricao_recompensa,
        mensagem_whatsapp || null,
        ativo ? 1 : 0,
        id,
        empresaId
      ]
    );

    res.json({ message: "Regra de fidelidade atualizada com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar regra de fidelidade:", err);
    res.status(500).json({ message: "Erro ao atualizar regra" });
  }
};

exports.deletarRegra = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;
    await db.execute("DELETE FROM fidelidade_regras WHERE id = ? AND empresa_id = ?", [id, empresaId]);
    res.json({ message: "Regra removida com sucesso!" });
  } catch (err) {
    console.error("Erro ao deletar regra de fidelidade:", err);
    res.status(500).json({ message: "Erro ao deletar regra" });
  }
};

// ==================== RANKING & HISTÓRICO ====================

exports.obterRankingEHistorico = async (req, res) => {
  try {
    const empresaId = req.empresa_id;

    // Top 15 Clientes mais frequentes baseados no histórico de conexões/leads
    const [ranking] = await db.query(
      `SELECT l.id, l.nome, l.telefone, l.email, COUNT(DISTINCT DATE(ra.acctstarttime)) AS total_visitas,
        MAX(ra.acctstarttime) AS ultima_visita
       FROM leads l
       LEFT JOIN radacct ra ON ra.callingstationid COLLATE utf8mb4_unicode_ci = l.mac COLLATE utf8mb4_unicode_ci
       WHERE l.empresa_id = ? AND l.telefone IS NOT NULL AND l.telefone != ''
       GROUP BY l.id, l.nome, l.telefone, l.email
       HAVING total_visitas > 0
       ORDER BY total_visitas DESC
       LIMIT 15`,
      [empresaId]
    );

    // Histórico de recompensas concedidas
    const [historico] = await db.query(
      `SELECT fh.*, fr.titulo AS regra_titulo
       FROM fidelidade_historico fh
       LEFT JOIN fidelidade_regras fr ON fr.id = fh.regra_id AND fr.empresa_id = ?
       WHERE fh.empresa_id = ?
       ORDER BY fh.criado_em DESC
       LIMIT 50`,
      [empresaId, empresaId]
    );

    res.json({
      ranking,
      historico
    });
  } catch (err) {
    console.error("Erro ao obter dados de fidelidade:", err);
    res.status(500).json({ message: "Erro ao obter histórico e ranking" });
  }
};

// ==================== PROCESSAMENTO DE VISITA ====================

exports.processarVisitaFidelidade = async (empresaId, telefone, nome) => {
  if (!empresaId || !telefone) return;
  try {
    const telLimpo = telefone.replace(/\D/g, "");
    if (telLimpo.length < 8) return;

    // 1. Contar total de visitas do cliente
    const [[visitaCount]] = await db.query(
      `SELECT COUNT(DISTINCT DATE(ra.acctstarttime)) AS total
       FROM radacct ra
       JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci
       WHERE ru.empresa_id = ? AND (ra.username LIKE ? OR ra.callingstationid COLLATE utf8mb4_unicode_ci IN (SELECT mac FROM leads WHERE empresa_id = ? AND telefone LIKE ?))`,
      [empresaId, `%${telLimpo.slice(-8)}%`, empresaId, `%${telLimpo.slice(-8)}%`]
    );

    const totalVisitas = (visitaCount?.total || 0) + 1;

    // 2. Verificar se bateu com alguma regra ativa
    const [regras] = await db.query(
      `SELECT * FROM fidelidade_regras 
       WHERE empresa_id = ? AND ativo = 1 AND visitas_necessarias = ?`,
      [empresaId, totalVisitas]
    );

    for (const regra of regras) {
      let cupomCodigo = null;

      // Se for cupom de desconto, gerar voucher no banco
      if (regra.tipo_recompensa === "cupom_desconto" && regra.cupom_id) {
        const [[cupom]] = await db.query("SELECT * FROM cupons WHERE id = ? AND empresa_id = ?", [regra.cupom_id, empresaId]);
        if (cupom) {
          const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
          cupomCodigo = `${cupom.codigo_prefixo || "FIDELIDADE"}-${rand}`;
          await db.execute(
            `INSERT INTO cupons_resgatados (cupom_id, empresa_id, cliente_nome, cliente_telefone, codigo_unico, status, resgatado_em)
             VALUES (?, ?, ?, ?, ?, 'disponivel', NOW())`,
            [cupom.id, empresaId, nome || "Cliente VIP", telLimpo, cupomCodigo]
          );
        }
      }

      // Inserir no histórico
      await db.execute(
        `INSERT INTO fidelidade_historico 
         (empresa_id, regra_id, cliente_telefone, cliente_nome, total_visitas, recompensa_concedida, cupom_gerado_codigo, notificado_whatsapp)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [empresaId, regra.id, telLimpo, nome || "Cliente VIP", totalVisitas, regra.descricao_recompensa, cupomCodigo]
      );

      // Disparar mensagem WhatsApp se configurada
      if (regra.mensagem_whatsapp) {
        let msg = regra.mensagem_whatsapp
          .replace(/{nome}/g, nome || "Cliente")
          .replace(/{visitas}/g, String(totalVisitas))
          .replace(/{recompensa}/g, regra.descricao_recompensa)
          .replace(/{cupom}/g, cupomCodigo || "");

        try {
          await enviarMensagemDireta(telLimpo, msg, empresaId);
        } catch (wErr) {
          console.warn("[Fidelidade] Não foi possível enviar WhatsApp:", wErr.message);
        }
      }
    }
  } catch (err) {
    console.error("[Fidelidade] Erro ao processar visita:", err);
  }
};
