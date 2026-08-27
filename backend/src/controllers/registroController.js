const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { DEFAULT_WHATSAPP_TEMPLATE, DEFAULT_PORTAL_PLANOS_CONFIG } = require("../constants/whatsappDefaults");
const { enviarMensagemDireta } = require("./whatsappController");

function gerarSlug(nome) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

exports.registrarEmpresa = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { nome, email, cnpj, telefone, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
    }

    // 1. Verificar se e-mail já existe
    const [[existingAdmin]] = await conn.execute(
      "SELECT id FROM admins WHERE email = ?",
      [email.trim()]
    );
    if (existingAdmin) {
      return res.status(400).json({ message: "Este e-mail já está cadastrado no sistema." });
    }

    // 2. Verificar se CNPJ/CPF já existe no banco (higienizando pontuação)
    const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, "") : null;
    if (cnpjLimpo && cnpjLimpo.length >= 11) {
      const [[existingCnpj]] = await conn.execute(
        "SELECT id FROM empresas WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '-', ''), '/', ''), ' ', '') = ?",
        [cnpjLimpo]
      );
      if (existingCnpj) {
        return res.status(400).json({ message: "Este CNPJ/CPF já possui um cadastro no sistema." });
      }
    }

    // 3. Verificar se WhatsApp/Telefone já foi utilizado em outra conta
    const telefoneLimpo = telefone ? telefone.replace(/\D/g, "") : null;
    if (telefoneLimpo && telefoneLimpo.length >= 8) {
      const sulfixoTel = telefoneLimpo.slice(-8); // Checar últimos 8 dígitos para cobrir DDDs
      const [[existingTelefone]] = await conn.execute(
        "SELECT id FROM empresas WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, '.', ''), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?",
        [`%${sulfixoTel}%`]
      );
      if (existingTelefone) {
        return res.status(400).json({ message: "Este número de WhatsApp já foi utilizado para cadastrar uma conta de teste." });
      }
    }

    // Gerar slug único
    let slug = gerarSlug(nome);
    const [[existingSlug]] = await conn.execute(
      "SELECT id FROM empresas WHERE slug = ?",
      [slug]
    );
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    await conn.beginTransaction();

    const planoId = req.body.plano_id ? parseInt(req.body.plano_id, 10) : null;
    let diasTrial = 7;
    let saasPlanoId = null;

    if (planoId) {
      const [[planoRow]] = await conn.execute(
        "SELECT id, dias_trial, valor_mensal, tipo_cobranca FROM saas_planos WHERE id = ? AND ativo = 1",
        [planoId]
      );
      if (planoRow) {
        saasPlanoId = planoRow.id;
        if (planoRow.dias_trial !== undefined && planoRow.dias_trial !== null) {
          diasTrial = parseInt(planoRow.dias_trial, 10);
        }
      }
    }

    // 1. Criar empresa em modo TRIAL (dias configurados no plano ou 7 dias)
    const [empresaResult] = await conn.execute(
      `INSERT INTO empresas 
       (nome, slug, cnpj, email, telefone, ativo, status_financeiro, trial_ate, saas_plano_id, tipo_cobranca, dia_vencimento) 
       VALUES (?, ?, ?, ?, ?, 1, 'trial', DATE_ADD(NOW(), INTERVAL ? DAY), ?, 'fixo', 10)`,
      [nome.trim(), slug, cnpj || null, email.trim(), telefone || null, diasTrial, saasPlanoId]
    );
    const empresaId = empresaResult.insertId;

    // 2. Criar admin owner
    const hashedPassword = await bcrypt.hash(senha, 10);
    const [adminResult] = await conn.execute(
      `INSERT INTO admins (empresa_id, email, nome, role, password) VALUES (?, ?, ?, 'owner', ?)`,
      [empresaId, email.trim(), nome.trim(), hashedPassword]
    );
    const adminId = adminResult.insertId;

    // 3. Auto-criar os 6 portais padrão para a nova empresa
    const planosConfigJson = JSON.stringify(DEFAULT_PORTAL_PLANOS_CONFIG);
    await conn.execute(
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

    await conn.commit();

    // 4. Disparar Boas-Vindas no WhatsApp (se telefone informado) de forma assíncrona
    if (telefone) {
      const msgBoasVindas = `🎉 *Bem-vindo(a) ao Hotspot SaaS, ${nome.trim()}!*\n\nSua conta foi criada com sucesso com *7 dias de teste grátis* para você explorar todos os recursos.\n\n🔗 *Acesso ao seu Painel:* https://hotspot.nuvycore.online/admin/${slug}\n📧 *Login / E-mail:* ${email.trim()}\n🔑 *Senha Escolhida:* ${senha}\n\nAcesse seu painel agora mesmo para conectar seu MikroTik e testar os portais! 🚀`;

      enviarMensagemDireta(telefone, msgBoasVindas, 1).catch(err => {
        console.warn("[Onboarding WhatsApp] Aviso ao enviar boas-vindas:", err.message);
      });
    }

    // 5. Gerar token JWT com informações de trial
    const token = jwt.sign(
      {
        id: adminId,
        email,
        empresa_id: empresaId,
        empresa_slug: slug,
        role: "owner",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Calcular data final de trial (+7 dias)
    const trialAte = new Date();
    trialAte.setDate(trialAte.getDate() + 7);

    res.status(201).json({
      token,
      user: {
        id: adminId,
        email,
        nome,
        role: "owner",
        empresa_id: empresaId,
        empresa_slug: slug,
        empresa_nome: nome,
        status_financeiro: "trial",
        trial_ate: trialAte.toISOString()
      },
      empresa: {
        id: empresaId,
        nome,
        slug,
        cnpj: cnpj || null,
        email,
        telefone: telefone || null,
        status_financeiro: "trial",
        trial_ate: trialAte.toISOString()
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Erro ao registrar empresa:", err);
    res.status(500).json({ message: "Erro ao registrar empresa", error: err.message });
  } finally {
    conn.release();
  }
};
