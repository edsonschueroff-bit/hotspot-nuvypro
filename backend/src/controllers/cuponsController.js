const db = require("../../db");
const crypto = require("crypto");

// ── LISTAR CUPONS DA EMPRESA COM MÉTRICAS ──
exports.listCupons = async (req, res) => {
  try {
    const empresaId = req.empresa_id;

    const [cupons] = await db.query(
      `SELECT 
         c.*,
         COUNT(r.id) as total_resgates,
         SUM(CASE WHEN r.status = 'utilizado' THEN 1 ELSE 0 END) as total_utilizados
       FROM cupons c
       LEFT JOIN cupons_resgatados r ON r.cupom_id = c.id AND r.empresa_id = ?
       WHERE c.empresa_id = ?
       GROUP BY c.id
       ORDER BY c.criado_em DESC`,
      [empresaId, empresaId]
    );

    res.json({ success: true, data: cupons });
  } catch (err) {
    console.error("Erro ao listar cupons:", err);
    res.status(500).json({ success: false, message: "Erro ao listar cupons" });
  }
};

// ── CRIAR NOVO CUPOM ──
exports.createCupom = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const {
      titulo,
      descricao,
      codigo_prefixo = "PROMO",
      tipo_desconto = "porcentagem",
      valor = 10,
      regras = "",
      validade_dias = 7,
      max_resgates_total = 0,
      ativo = 1
    } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ success: false, message: "O título do cupom é obrigatório" });
    }

    const prefixoLimpo = (codigo_prefixo || "PROMO")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);

    const [result] = await db.execute(
      `INSERT INTO cupons 
       (empresa_id, titulo, descricao, codigo_prefixo, tipo_desconto, valor, regras, validade_dias, max_resgates_total, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        titulo.trim(),
        descricao ? descricao.trim() : null,
        prefixoLimpo || "PROMO",
        tipo_desconto,
        parseFloat(valor) || 0,
        regras ? regras.trim() : null,
        parseInt(validade_dias, 10) || 7,
        parseInt(max_resgates_total, 10) || 0,
        ativo ? 1 : 0
      ]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: "Cupom promocional criado com sucesso!"
    });
  } catch (err) {
    console.error("Erro ao criar cupom:", err);
    res.status(500).json({ success: false, message: "Erro interno ao criar cupom" });
  }
};

// ── ATUALIZAR CUPOM ──
exports.updateCupom = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;
    const {
      titulo,
      descricao,
      codigo_prefixo,
      tipo_desconto,
      valor,
      regras,
      validade_dias,
      max_resgates_total,
      ativo
    } = req.body;

    const prefixoLimpo = codigo_prefixo 
      ? codigo_prefixo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) 
      : "PROMO";

    const [result] = await db.execute(
      `UPDATE cupons 
       SET titulo = ?, descricao = ?, codigo_prefixo = ?, tipo_desconto = ?, valor = ?,
           regras = ?, validade_dias = ?, max_resgates_total = ?, ativo = ?
       WHERE id = ? AND empresa_id = ?`,
      [
        titulo.trim(),
        descricao ? descricao.trim() : null,
        prefixoLimpo,
        tipo_desconto,
        parseFloat(valor) || 0,
        regras ? regras.trim() : null,
        parseInt(validade_dias, 10) || 7,
        parseInt(max_resgates_total, 10) || 0,
        ativo ? 1 : 0,
        id,
        empresaId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Cupom não encontrado" });
    }

    res.json({ success: true, message: "Cupom atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar cupom:", err);
    res.status(500).json({ success: false, message: "Erro ao atualizar cupom" });
  }
};

// ── EXCLUIR CUPOM ──
exports.deleteCupom = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;

    const [result] = await db.execute(
      "DELETE FROM cupons WHERE id = ? AND empresa_id = ?",
      [id, empresaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Cupom não encontrado" });
    }

    res.json({ success: true, message: "Cupom excluído com sucesso!" });
  } catch (err) {
    console.error("Erro ao excluir cupom:", err);
    res.status(500).json({ success: false, message: "Erro ao excluir cupom" });
  }
};

// ── VALIDADOR DO CAIXA / BALCÃO ──
exports.validarCupom = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { codigo, dar_baixa = false } = req.body;

    if (!codigo || !codigo.trim()) {
      return res.status(400).json({ success: false, message: "Informe o código do cupom" });
    }

    const codigoBusca = codigo.trim().toUpperCase();

    const [[resgate]] = await db.query(
      `SELECT 
         r.*,
         c.titulo,
         c.descricao,
         c.tipo_desconto,
         c.valor,
         c.regras,
         c.validade_dias,
         DATE_ADD(r.resgatado_em, INTERVAL c.validade_dias DAY) as expira_em
       FROM cupons_resgatados r
       JOIN cupons c ON c.id = r.cupom_id AND c.empresa_id = ?
       WHERE r.codigo_unico = ? AND r.empresa_id = ?
       LIMIT 1`,
      [empresaId, codigoBusca, empresaId]
    );

    if (!resgate) {
      return res.status(404).json({
        success: false,
        status: "invalido",
        message: "Cupom não encontrado ou não pertence a este estabelecimento."
      });
    }

    // Verificar se já foi utilizado
    if (resgate.status === "utilizado") {
      return res.status(400).json({
        success: false,
        status: "ja_utilizado",
        message: `Este cupom já foi utilizado em ${new Date(resgate.utilizado_em).toLocaleString('pt-BR')}.`,
        dados: resgate
      });
    }

    // Verificar se expirou
    const agora = new Date();
    const dataExpiracao = new Date(resgate.expira_em);
    if (agora > dataExpiracao) {
      await db.execute(
        "UPDATE cupons_resgatados SET status = 'expirado' WHERE id = ? AND empresa_id = ?",
        [resgate.id, empresaId]
      );
      return res.status(400).json({
        success: false,
        status: "expirado",
        message: `Este cupom expirou em ${dataExpiracao.toLocaleDateString('pt-BR')}.`,
        dados: resgate
      });
    }

    // Se a intenção for apenas consultar validade
    if (!dar_baixa) {
      return res.json({
        success: true,
        status: "valido",
        message: "Cupom válido e pronto para uso!",
        dados: resgate
      });
    }

    // Se for para dar baixa (utilizar)
    await db.execute(
      "UPDATE cupons_resgatados SET status = 'utilizado', utilizado_em = NOW() WHERE id = ? AND empresa_id = ?",
      [resgate.id, empresaId]
    );

    // ── Disparar Webhooks Outbound ──
    try {
      const { dispararWebhooks } = require("../services/webhookOutboundService");
      dispararWebhooks(empresaId, "cupom.redeemed", {
        codigo_unico: resgate.codigo_unico,
        cupom_id: resgate.cupom_id,
        titulo: resgate.titulo,
        tipo_desconto: resgate.tipo_desconto,
        valor: resgate.valor,
        cliente_nome: resgate.cliente_nome,
        telefone: resgate.telefone,
        mac: resgate.mac,
        utilizado_em: new Date().toISOString()
      });
    } catch (whErr) {
      console.warn("[Cupons] Erro ao disparar webhook cupom.redeemed:", whErr.message);
    }

    res.json({
      success: true,
      status: "utilizado_com_sucesso",
      message: `Cupom ${resgate.codigo_unico} validado com sucesso! Desconto aplicado.`,
      dados: { ...resgate, status: "utilizado", utilizado_em: new Date() }
    });
  } catch (err) {
    console.error("Erro ao validar cupom:", err);
    res.status(500).json({ success: false, message: "Erro ao validar cupom" });
  }
};

// ── GERAR CUPOM PARA O CLIENTE PÓS-LOGIN (Público/Interno) ──
exports.gerarCupomConexao = async (req, res) => {
  try {
    const { mac, telefone, nome, mikrotik_id, empresa_id, cupom_id } = req.body;

    let empresaId = empresa_id;
    if (!empresaId && mikrotik_id) {
      const [[mk]] = await db.query("SELECT empresa_id FROM mikrotiks WHERE id = ?", [mikrotik_id]);
      if (mk?.empresa_id) empresaId = mk.empresa_id;
    }

    if (!empresaId) {
      return res.status(400).json({ success: false, message: "Empresa não identificada" });
    }

    // Busca o cupom ativo selecionado ou o primeiro ativo da empresa
    let cupomQuery = "SELECT * FROM cupons WHERE empresa_id = ? AND ativo = 1";
    const queryParams = [empresaId];

    if (cupom_id) {
      cupomQuery += " AND id = ?";
      queryParams.push(cupom_id);
    } else {
      cupomQuery += " ORDER BY id DESC LIMIT 1";
    }

    const [[cupom]] = await db.query(cupomQuery, queryParams);
    if (!cupom) {
      return res.json({ success: false, message: "Nenhum cupom ativo no momento" });
    }

    // Verifica se este cliente (por telefone ou MAC) já resgatou este cupom recentemente e ainda está disponível
    let existingQuery = `
      SELECT * FROM cupons_resgatados 
      WHERE empresa_id = ? AND cupom_id = ? AND status = 'disponivel' 
        AND (
          (cliente_mac IS NOT NULL AND cliente_mac = ?) 
          OR (cliente_telefone IS NOT NULL AND cliente_telefone = ?)
        )
      LIMIT 1`;
    const [[existente]] = await db.query(existingQuery, [empresaId, cupom.id, mac || "", telefone || ""]);

    if (existente) {
      return res.json({
        success: true,
        novo: false,
        cupom: {
          codigo_unico: existente.codigo_unico,
          titulo: cupom.titulo,
          descricao: cupom.descricao,
          tipo_desconto: cupom.tipo_desconto,
          valor: cupom.valor,
          regras: cupom.regras,
          validade_dias: cupom.validade_dias,
          resgatado_em: existente.resgatado_em
        }
      });
    }

    // Gera um código único seguro (ex: PROMO-9A4B)
    const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();
    const randomNum = Math.floor(10 + Math.random() * 90);
    const codigoUnico = `${cupom.codigo_prefixo || 'PROMO'}-${randomHex}${randomNum}`;

    await db.execute(
      `INSERT INTO cupons_resgatados 
       (empresa_id, cupom_id, codigo_unico, cliente_nome, cliente_telefone, cliente_mac, status, resgatado_em)
       VALUES (?, ?, ?, ?, ?, ?, 'disponivel', NOW())`,
      [empresaId, cupom.id, codigoUnico, nome || null, telefone || null, mac || null]
    );

    res.status(201).json({
      success: true,
      novo: true,
      cupom: {
        codigo_unico: codigoUnico,
        titulo: cupom.titulo,
        descricao: cupom.descricao,
        tipo_desconto: cupom.tipo_desconto,
        valor: cupom.valor,
        regras: cupom.regras,
        validade_dias: cupom.validade_dias,
        resgatado_em: new Date()
      }
    });
  } catch (err) {
    console.error("Erro ao gerar cupom de conexão:", err);
    res.status(500).json({ success: false, message: "Erro ao gerar cupom" });
  }
};

// ── HISTÓRICO DE RESGATES E UTILIZAÇÃO ──
exports.listResgates = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { status, q, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let whereSql = "WHERE r.empresa_id = ?";
    const params = [empresaId];

    if (status && status !== "todos") {
      whereSql += " AND r.status = ?";
      params.push(status);
    }

    if (q && q.trim()) {
      whereSql += " AND (r.codigo_unico LIKE ? OR r.cliente_nome LIKE ? OR r.cliente_telefone LIKE ? OR c.titulo LIKE ?)";
      const search = `%${q.trim()}%`;
      params.push(search, search, search, search);
    }

    const [rows] = await db.query(
      `SELECT 
         r.*,
         c.titulo as cupom_titulo,
         c.tipo_desconto,
         c.valor as cupom_valor,
         c.validade_dias
       FROM cupons_resgatados r
       JOIN cupons c ON c.id = r.cupom_id AND c.empresa_id = ?
       ${whereSql}
       ORDER BY r.resgatado_em DESC
       LIMIT ? OFFSET ?`,
      [empresaId, ...params, limitNum, offset]
    );

    const [[countResult]] = await db.query(
      `SELECT COUNT(*) as total
       FROM cupons_resgatados r
       JOIN cupons c ON c.id = r.cupom_id AND c.empresa_id = ?
       ${whereSql}`,
      [empresaId, ...params]
    );

    res.json({
      success: true,
      data: rows,
      total: countResult?.total || 0,
      page: pageNum,
      totalPages: Math.ceil((countResult?.total || 0) / limitNum) || 1
    });
  } catch (err) {
    console.error("Erro ao listar histórico de resgates:", err);
    res.status(500).json({ success: false, message: "Erro ao listar resgates" });
  }
};

// ── MÉTRICAS DE CONVERSÃO DOS CUPONS ──
exports.getMetricas = async (req, res) => {
  try {
    const empresaId = req.empresa_id;

    const [[kpis]] = await db.query(
      `SELECT
         COUNT(DISTINCT c.id) as total_cupons_criados,
         COUNT(DISTINCT CASE WHEN c.ativo = 1 THEN c.id END) as total_cupons_ativos,
         COUNT(r.id) as total_gerados,
         SUM(CASE WHEN r.status = 'utilizado' THEN 1 ELSE 0 END) as total_utilizados,
         SUM(CASE WHEN r.status = 'disponivel' THEN 1 ELSE 0 END) as total_disponiveis
       FROM cupons c
       LEFT JOIN cupons_resgatados r ON r.cupom_id = c.id AND r.empresa_id = ?
       WHERE c.empresa_id = ?`,
      [empresaId, empresaId]
    );

    const gerados = parseInt(kpis?.total_gerados, 10) || 0;
    const utilizados = parseInt(kpis?.total_utilizados, 10) || 0;
    const taxaConversao = gerados > 0 ? Math.round((utilizados / gerados) * 100) : 0;

    res.json({
      success: true,
      data: {
        total_cupons_criados: parseInt(kpis?.total_cupons_criados, 10) || 0,
        total_cupons_ativos: parseInt(kpis?.total_cupons_ativos, 10) || 0,
        total_gerados: gerados,
        total_utilizados: utilizados,
        total_disponiveis: parseInt(kpis?.total_disponiveis, 10) || 0,
        taxa_conversao: taxaConversao
      }
    });
  } catch (err) {
    console.error("Erro ao buscar métricas de cupons:", err);
    res.status(500).json({ success: false, message: "Erro ao buscar métricas" });
  }
};
