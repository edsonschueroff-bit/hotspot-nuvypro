const db = require("../../db");
const { DEFAULT_WHATSAPP_TEMPLATE, DEFAULT_PORTAL_PLANOS_CONFIG } = require("../constants/whatsappDefaults");

function gerarSlug(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

exports.listarEmpresas = async (req, res) => {
  try {
    const [empresas] = await db.query(`
      SELECT e.*,
        p.nome AS saas_plano_nome,
        p.limite_mikrotiks,
        p.limite_portais,
        p.destaque,
        (SELECT COUNT(*) FROM admins WHERE empresa_id = e.id) AS total_admins,
        (SELECT COUNT(*) FROM mikrotiks WHERE empresa_id = e.id) AS total_mikrotiks,
        (SELECT COUNT(*) FROM portais WHERE empresa_id = e.id) AS total_portais,
        (SELECT COUNT(*) FROM planos WHERE empresa_id = e.id) AS total_planos
      FROM empresas e
      LEFT JOIN saas_planos p ON p.id = e.saas_plano_id
      ORDER BY e.criado_em DESC
    `);
    res.json(empresas);
  } catch (err) {
    console.error("Erro ao listar empresas:", err);
    res.status(500).json({ message: "Erro ao listar empresas" });
  }
};

exports.criarEmpresa = async (req, res) => {
  try {
    const {
      nome, cnpj, email, telefone,
      razao_social, inscricao_estadual, inscricao_municipal,
      responsavel_nome, responsavel_cargo,
      cep, logradouro, numero, complemento, bairro, cidade, uf, pix_chave,
      saas_plano_id, tipo_cobranca, valor_mensal, comissao_porcentagem, dia_vencimento, status_financeiro, trial_ate
    } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ message: "Nome e email são obrigatórios" });
    }

    let slug = gerarSlug(nome);

    // Garantir slug único
    const [[existing]] = await db.execute('SELECT id FROM empresas WHERE slug = ?', [slug]);
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Se informou um saas_plano_id mas nao informou tipo/valor/comissao, busca do plano
    let finalTipo = tipo_cobranca || 'fixo';
    let finalValor = parseFloat(valor_mensal) || 0.00;
    let finalComissao = parseFloat(comissao_porcentagem) || 0.00;

    if (saas_plano_id) {
      const [[plano]] = await db.query('SELECT * FROM saas_planos WHERE id = ?', [saas_plano_id]);
      if (plano) {
        if (!tipo_cobranca) finalTipo = plano.tipo_cobranca;
        if (valor_mensal === undefined || valor_mensal === null) finalValor = plano.valor_mensal;
        if (comissao_porcentagem === undefined || comissao_porcentagem === null) finalComissao = plano.comissao_porcentagem;
      }
    }

    const [result] = await db.execute(
      `INSERT INTO empresas (
        nome, slug, cnpj, email, telefone,
        razao_social, inscricao_estadual, inscricao_municipal,
        responsavel_nome, responsavel_cargo,
        cep, logradouro, numero, complemento, bairro, cidade, uf, pix_chave,
        saas_plano_id, tipo_cobranca, valor_mensal, comissao_porcentagem, dia_vencimento, status_financeiro, trial_ate
       ) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome, slug, cnpj || null, email, telefone || null,
        razao_social || null, inscricao_estadual || null, inscricao_municipal || null,
        responsavel_nome || null, responsavel_cargo || null,
        cep || null, logradouro || null, numero || null, complemento || null, bairro || null, cidade || null, uf || null, pix_chave || null,
        saas_plano_id || null, finalTipo, finalValor, finalComissao,
        parseInt(dia_vencimento, 10) || 10,
        status_financeiro || 'trial',
        trial_ate || null
      ]
    );

    const empresaId = result.insertId;

    // Auto-criar portais padrao para a nova empresa.
    const planosConfigJson = JSON.stringify(DEFAULT_PORTAL_PLANOS_CONFIG);
    await db.execute(
      `INSERT INTO portais (empresa_id, nome, slug, tipo, url_redirect, ativo, whatsapp_template, configuracoes) VALUES
       (?, 'LGPD - Coleta de Dados', 'lgpd', 'lgpd', '/cadastro', 1, ?, NULL),
       (?, 'Planos - Pagamento', 'planos', 'planos', '/planos-cliente', 1, ?, ?),
       (?, 'Cadastro de LEAD', 'lead', 'lead', '/lead', 1, ?, NULL),
       (?, 'Cadastro de LEAD (Sem Internet)', 'lead-passivo', 'lead_passivo', '/lead-passivo', 1, ?, NULL),
       (?, 'Acesso Wi-Fi', 'login', 'login', '/login-hotspot', 1, ?, NULL),
       (?, 'Login Social (Google / Facebook)', 'social', 'social', '/portal/social', 1, ?, NULL)`,
      [
        empresaId, DEFAULT_WHATSAPP_TEMPLATE,
        empresaId, DEFAULT_WHATSAPP_TEMPLATE, planosConfigJson,
        empresaId, DEFAULT_WHATSAPP_TEMPLATE,
        empresaId, DEFAULT_WHATSAPP_TEMPLATE,
        empresaId, DEFAULT_WHATSAPP_TEMPLATE,
        empresaId, DEFAULT_WHATSAPP_TEMPLATE,
      ]
    );

    // Disparar e-mail de boas-vindas para a nova empresa
    try {
      const emailService = require("../services/emailService");
      emailService.enviarEmailBoasVindasEmpresa({
        email,
        nome: responsavel_nome || nome,
        empresaNome: nome,
        slug
      }).catch(e => console.warn("[Empresa Email ⚠️] Erro ao enviar e-mail de boas-vindas:", e.message));
    } catch (e) { }

    res.status(201).json({ id: empresaId, nome, slug, email });
  } catch (err) {
    console.error("Erro ao criar empresa:", err);
    res.status(500).json({ message: "Erro ao criar empresa" });
  }
};

exports.atualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, cnpj, email, telefone, logo_url, ativo,
      razao_social, inscricao_estadual, inscricao_municipal,
      responsavel_nome, responsavel_cargo,
      cep, logradouro, numero, complemento, bairro, cidade, uf, pix_chave,
      saas_plano_id, tipo_cobranca, valor_mensal, comissao_porcentagem, dia_vencimento, status_financeiro, trial_ate
    } = req.body;

    await db.execute(
      `UPDATE empresas 
       SET nome = ?, cnpj = ?, email = ?, telefone = ?, logo_url = ?, ativo = ?,
           razao_social = ?, inscricao_estadual = ?, inscricao_municipal = ?,
           responsavel_nome = ?, responsavel_cargo = ?,
           cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, uf = ?, pix_chave = ?,
           saas_plano_id = ?, tipo_cobranca = ?, valor_mensal = ?, comissao_porcentagem = ?,
           dia_vencimento = ?, status_financeiro = ?, trial_ate = ?
       WHERE id = ?`,
      [
        nome, cnpj || null, email, telefone || null, logo_url || null, ativo !== undefined ? ativo : 1,
        razao_social || null, inscricao_estadual || null, inscricao_municipal || null,
        responsavel_nome || null, responsavel_cargo || null,
        cep || null, logradouro || null, numero || null, complemento || null, bairro || null, cidade || null, uf || null, pix_chave || null,
        saas_plano_id || null, tipo_cobranca || 'fixo', parseFloat(valor_mensal) || 0.00, parseFloat(comissao_porcentagem) || 0.00,
        parseInt(dia_vencimento, 10) || 10, status_financeiro || 'adimplente', trial_ate || null,
        id
      ]
    );

    res.json({ message: "Empresa atualizada" });
  } catch (err) {
    console.error("Erro ao atualizar empresa:", err);
    res.status(500).json({ message: "Erro ao atualizar empresa" });
  }
};

exports.deletarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir deletar empresa padrão
    const [[empresa]] = await db.execute('SELECT slug FROM empresas WHERE id = ?', [id]);
    if (empresa && empresa.slug === 'default') {
      return res.status(400).json({ message: "Não é possível deletar a empresa padrão" });
    }

    await db.execute('DELETE FROM admin_empresas WHERE empresa_id = ?', [id]);
    await db.execute('DELETE FROM admins WHERE empresa_id = ? AND role != "super_admin"', [id]);
    await db.execute('DELETE FROM portais WHERE empresa_id = ?', [id]);
    await db.execute('DELETE FROM empresa_configs WHERE empresa_id = ?', [id]);
    await db.execute('DELETE FROM mikrotiks WHERE empresa_id = ?', [id]);
    await db.execute('DELETE FROM empresas WHERE id = ?', [id]);
    res.json({ message: "Empresa deletada com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar empresa:", err);
    res.status(500).json({ message: "Erro ao deletar empresa" });
  }
};

exports.obterEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const [[empresa]] = await db.execute('SELECT * FROM empresas WHERE id = ?', [id]);
    if (!empresa) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }
    res.json(empresa);
  } catch (err) {
    console.error("Erro ao obter empresa:", err);
    res.status(500).json({ message: "Erro ao obter empresa" });
  }
};

exports.obterMinhaEmpresa = async (req, res) => {
  try {
    let empresaId = req.empresa_id || req.user?.empresa_id;

    if (req.user?.role === 'super_admin' && req.query.slug) {
      const [[emp]] = await db.execute('SELECT id FROM empresas WHERE slug = ?', [req.query.slug]);
      if (emp) {
        empresaId = emp.id;
      }
    }

    if (!empresaId) return res.status(401).json({ message: "Não autorizado" });

    const [[empresa]] = await db.execute(
      'SELECT id, nome, slug, cnpj, email, telefone, razao_social, inscricao_estadual, inscricao_municipal, cep, logradouro, numero, complemento, bairro, cidade, uf, pix_chave, responsavel_nome, responsavel_cargo, logo_url, ativo, tipo_cobranca, status_financeiro FROM empresas WHERE id = ?',
      [empresaId]
    );

    if (!empresa) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }
    res.json(empresa);
  } catch (err) {
    console.error("Erro ao obter dados da própria empresa:", err);
    res.status(500).json({ message: "Erro ao obter dados da empresa" });
  }
};

exports.listarAdminsEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      `SELECT a.id, a.email, a.nome, a.role AS role_global, ae.role AS role_empresa, ae.criado_em
       FROM admin_empresas ae
       JOIN admins a ON ae.admin_id = a.id
       WHERE ae.empresa_id = ?
       ORDER BY a.nome`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar admins da empresa:", err);
    res.status(500).json({ message: "Erro ao listar admins" });
  }
};

exports.vincularAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id, role } = req.body;

    if (!admin_id) return res.status(400).json({ message: "admin_id obrigatório" });

    await db.execute(
      `INSERT INTO admin_empresas (admin_id, empresa_id, role) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [admin_id, id, role || 'operator']
    );

    res.json({ message: "Admin vinculado com sucesso" });
  } catch (err) {
    console.error("Erro ao vincular admin:", err);
    res.status(500).json({ message: "Erro ao vincular admin" });
  }
};

exports.desvincularAdmin = async (req, res) => {
  try {
    const { id, adminId } = req.params;

    const [result] = await db.execute(
      'DELETE FROM admin_empresas WHERE admin_id = ? AND empresa_id = ?',
      [adminId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Vínculo não encontrado" });
    }

    res.json({ message: "Admin desvinculado" });
  } catch (err) {
    console.error("Erro ao desvincular admin:", err);
    res.status(500).json({ message: "Erro ao desvincular admin" });
  }
};

exports.listarTodosAdmins = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, nome, role FROM admins ORDER BY nome'
    );
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar admins:", err);
    res.status(500).json({ message: "Erro ao listar admins" });
  }
};

