const db = require("../../db");
const Mikrotik = require("../models/Mikrotik");

exports.createMikrotik = async (req, res) => {
  const { nome, ip, usuario, senha, porta, end_hotspot } = req.body;

  if (!nome || !ip || !usuario || !senha || !porta) {
    return res.status(400).json({ message: "Campos obrigatórios faltando" });
  }

  try {
    // ── Verificar Limite do Plano SaaS da Empresa ──
    if (req.empresa_id) {
      const [[empresa]] = await db.query(
        `SELECT e.saas_plano_id, p.nome as plano_nome, p.limite_mikrotiks 
         FROM empresas e 
         LEFT JOIN saas_planos p ON p.id = e.saas_plano_id 
         WHERE e.id = ?`,
        [req.empresa_id]
      );

      if (empresa && empresa.limite_mikrotiks > 0) {
        const [[{ count }]] = await db.query(
          "SELECT COUNT(*) as count FROM mikrotiks WHERE empresa_id = ?",
          [req.empresa_id]
        );

        if (count >= empresa.limite_mikrotiks) {
          return res.status(403).json({
            message: `Limite de Roteadores Atingido: O seu plano atual (${empresa.plano_nome || 'Padrão'}) permite no máximo ${empresa.limite_mikrotiks} roteador(es). Faça upgrade do seu plano para cadastrar novos equipamentos.`
          });
        }
      }
    }

    await Mikrotik.create({ nome, ip, usuario, senha, porta, end_hotspot, empresa_id: req.empresa_id });
    res.status(201).json({ message: "Mikrotik cadastrado com sucesso" });
  } catch (error) {
    console.error("Erro ao cadastrar Mikrotik:", error);
    res.status(500).json({ message: "Erro interno ao salvar Mikrotik" });
  }
};

exports.listarMikrotiks = async (req, res) => {
  try {
    if (!req.empresa_id) {
      return res.status(400).json({ message: "Empresa não identificada" });
    }
    const lista = await Mikrotik.findAll(req.empresa_id);
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar Mikrotiks" });
  }
};
