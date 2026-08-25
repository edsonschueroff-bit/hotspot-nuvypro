const db = require("../../db");
const { DEFAULT_WHATSAPP_TEMPLATE } = require("../constants/whatsappDefaults");

exports.listarPortais = async (req, res) => {
  try {
    const [portais] = await db.query(`
      SELECT p.*,
        pt.nome as template_nome,
        (SELECT COUNT(*) FROM mikrotiks WHERE portal_id = p.id AND empresa_id = p.empresa_id) as mikrotiks_vinculados
      FROM portais p
      LEFT JOIN portal_templates pt ON pt.id = p.template_id
      WHERE p.empresa_id = ?
      ORDER BY p.tipo, p.nome
    `, [req.empresa_id]);
    res.json(portais);
  } catch (err) {
    console.error("Erro ao listar portais:", err);
    res.status(500).json({ message: "Erro ao listar portais" });
  }
};

exports.criarPortal = async (req, res) => {
  const {
    nome, slug, descricao, html_content, url_redirect,
    template_id, custom_css, logo_url, cor_primaria, cor_fundo,
    campos_cadastro, mostrar_planos, mostrar_lgpd
  } = req.body;
  if (!nome || !slug) return res.status(400).json({ message: "Nome e slug são obrigatórios" });

  try {
    // ── Verificar Limite do Plano SaaS da Empresa ──
    if (req.empresa_id) {
      const [[empresa]] = await db.query(
        `SELECT e.saas_plano_id, p.nome as plano_nome, p.limite_portais, p.permite_portal_vendas, p.permite_multiplos_pix 
         FROM empresas e 
         LEFT JOIN saas_planos p ON p.id = e.saas_plano_id 
         WHERE e.id = ?`,
        [req.empresa_id]
      );

      if (empresa && req.body.tipo === 'planos' && !empresa.permite_portal_vendas) {
        return res.status(403).json({
          message: `Recurso Exclusivo PRO: A Venda Automatizada de Internet (Painel Pix) não está liberada no seu plano atual (${empresa.plano_nome}). Faça um Upgrade para faturar no automático!`
        });
      }

      if (empresa && empresa.limite_portais > 0) {
        const [[{ count }]] = await db.query(
          "SELECT COUNT(*) as count FROM portais WHERE empresa_id = ?",
          [req.empresa_id]
        );

        if (count >= empresa.limite_portais) {
          return res.status(403).json({
            message: `Limite de Portais Atingido: O seu plano atual (${empresa.plano_nome || 'Padrão'}) permite no máximo ${empresa.limite_portais} portal(is) captivo(s). Faça upgrade do seu plano para criar novos portais.`
          });
        }
      }
    }

    const [existing] = await db.query("SELECT id FROM portais WHERE slug = ? AND empresa_id = ?", [slug, req.empresa_id]);
    if (existing.length > 0) return res.status(400).json({ message: "Já existe um portal com esse slug" });

    const { tipo } = req.body;
    const finalTipo = tipo || 'custom';

    // Auto-map empty redirects for known types
    let finalRedirect = url_redirect || null;
    let finalTemplateId = template_id || null;
    let finalHtml = html_content || null;

    if (!finalRedirect && !finalHtml) {
      if (finalTipo === 'planos') finalRedirect = '/planos-cliente';
      else if (finalTipo === 'lgpd') finalRedirect = '/cadastro';
      else if (finalTipo === 'lead') finalRedirect = '/lead';
      else if (finalTipo === 'lead_passivo') finalRedirect = '/lead-passivo';
      else if (finalTipo === 'social') finalRedirect = '/portal/social';
      else if (finalTipo === 'custom') finalTemplateId = 1; // Basic portal template
    }

    if (finalTemplateId && !html_content) {
      const [[tmpl]] = await db.query("SELECT html_template FROM portal_templates WHERE id = ?", [finalTemplateId]);
      if (tmpl) finalHtml = tmpl.html_template;
    }

    await db.execute(
      `INSERT INTO portais (empresa_id, nome, slug, tipo, url_redirect, html_content, descricao,
        template_id, custom_css, logo_url, cor_primaria, cor_fundo, campos_cadastro, mostrar_planos, mostrar_lgpd,
        whatsapp_template)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.empresa_id, nome, slug, finalTipo,
        finalRedirect,
        finalHtml,
        descricao || null,
        finalTemplateId,
        custom_css || null,
        logo_url || null,
        cor_primaria || '#3B82F6',
        cor_fundo || '#0f111a',
        campos_cadastro ? JSON.stringify(campos_cadastro) : null,
        mostrar_planos !== undefined ? (mostrar_planos ? 1 : 0) : 1,
        mostrar_lgpd !== undefined ? (mostrar_lgpd ? 1 : 0) : 1,
        DEFAULT_WHATSAPP_TEMPLATE
      ]
    );
    res.status(201).json({ message: "Portal criado com sucesso" });
  } catch (err) {
    console.error("Erro ao criar portal:", err);
    res.status(500).json({ message: "Erro ao criar portal" });
  }
};

exports.atualizarPortal = async (req, res) => {
  const { id } = req.params;
  const {
    nome, descricao, html_content, url_redirect,
    template_id, custom_css, logo_url, cor_primaria, cor_fundo,
    campos_cadastro, mostrar_planos, mostrar_lgpd, configuracoes,
    whatsapp_enabled, whatsapp_template,
    email_welcome_enabled, email_welcome_subject, email_welcome_body, email_welcome_coupon
  } = req.body;

  try {
    const [[portal]] = await db.query("SELECT * FROM portais WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    if (!portal) return res.status(404).json({ message: "Portal não encontrado" });

    // If template_id provided but no html_content, load from template
    let finalHtml = html_content ?? portal.html_content;
    if (template_id && !html_content) {
      const [[tmpl]] = await db.query("SELECT html_template FROM portal_templates WHERE id = ?", [template_id]);
      if (tmpl) finalHtml = tmpl.html_template;
    }

    const configJson = configuracoes ? (typeof configuracoes === 'string' ? configuracoes : JSON.stringify(configuracoes)) : portal.configuracoes;

    await db.execute(
      `UPDATE portais SET
        nome = ?, descricao = ?, html_content = ?, url_redirect = ?,
        template_id = ?, custom_css = ?, logo_url = ?, cor_primaria = ?, cor_fundo = ?,
        campos_cadastro = ?, mostrar_planos = ?, mostrar_lgpd = ?, configuracoes = ?,
        whatsapp_enabled = ?, whatsapp_template = ?
       WHERE id = ? AND empresa_id = ?`,
      [
        nome || portal.nome,
        descricao ?? portal.descricao,
        finalHtml,
        url_redirect ?? portal.url_redirect,
        template_id !== undefined ? (template_id || null) : portal.template_id,
        custom_css !== undefined ? custom_css : portal.custom_css,
        logo_url !== undefined ? logo_url : portal.logo_url,
        cor_primaria || portal.cor_primaria || '#3B82F6',
        cor_fundo || portal.cor_fundo || '#0f111a',
        campos_cadastro ? JSON.stringify(campos_cadastro) : (portal.campos_cadastro || null),
        mostrar_planos !== undefined ? (mostrar_planos ? 1 : 0) : portal.mostrar_planos,
        mostrar_lgpd !== undefined ? (mostrar_lgpd ? 1 : 0) : portal.mostrar_lgpd,
        configJson,
        whatsapp_enabled !== undefined ? (whatsapp_enabled ? 1 : 0) : portal.whatsapp_enabled,
        whatsapp_template !== undefined ? whatsapp_template : portal.whatsapp_template,
        id,
        req.empresa_id
      ]
    );
    res.json({ message: "Portal atualizado" });
  } catch (err) {
    console.error("Erro ao atualizar portal:", err);
    res.status(500).json({ message: "Erro ao atualizar portal" });
  }
};

// Variaveis fake para preview/teste de template de WhatsApp
const FAKE_VARS = {
  nome: "Joao da Silva",
  username: "12345678900",
  password: "12345678900",
  plano: "Plano 1 Hora",
  duracao: 60,
  velocidade: "10M/50M",
  valor: "R$ 5,00",
  empresa: "Hotspot Demo",
  login_url: "http://hotspot.local/login?username=12345678900&password=12345678900",
  expira_em: "01/01/2026 10:00",
  cpf: "123.456.789-00",
};

function renderFakeTemplate(template) {
  if (!template) return "";
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = FAKE_VARS[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

// POST /api/portais/:id/whatsapp-preview - retorna o template renderizado com variaveis fake
exports.whatsappPreview = async (req, res) => {
  const { id } = req.params;
  try {
    const [[portal]] = await db.query(
      "SELECT whatsapp_template FROM portais WHERE id = ? AND empresa_id = ?",
      [id, req.empresa_id]
    );
    if (!portal) return res.status(404).json({ message: "Portal não encontrado" });

    const template = req.body?.template ?? portal.whatsapp_template ?? "";
    const preview = renderFakeTemplate(template);
    res.json({ preview, vars: FAKE_VARS });
  } catch (err) {
    console.error("Erro no preview WhatsApp:", err);
    res.status(500).json({ message: "Erro ao gerar preview" });
  }
};

// POST /api/portais/:id/whatsapp-teste - envia mensagem de teste real para um numero
exports.whatsappTeste = async (req, res) => {
  const { id } = req.params;
  const { telefone, template } = req.body || {};
  if (!telefone) return res.status(400).json({ message: "Telefone obrigatorio" });

  try {
    const [[portal]] = await db.query(
      "SELECT whatsapp_template FROM portais WHERE id = ? AND empresa_id = ?",
      [id, req.empresa_id]
    );
    if (!portal) return res.status(404).json({ message: "Portal não encontrado" });

    const tpl = template ?? portal.whatsapp_template ?? "";
    const mensagem = renderFakeTemplate(tpl);
    if (!mensagem.trim()) {
      return res.status(400).json({ message: "Template vazio" });
    }

    // Normalizacao por comprimento (ver whatsappNotify.normalizarTelefone).
    // NAO usar startsWith("55") — DDD 55 (RS) confunde com DDI.
    const telDigits = String(telefone).replace(/\D/g, "");
    let telComDDI;
    if (telDigits.length === 10 || telDigits.length === 11) telComDDI = `55${telDigits}`;
    else if (telDigits.length === 12 || telDigits.length === 13) telComDDI = telDigits;
    else return res.status(400).json({ message: "Telefone invalido (tamanho inesperado)" });

    const { enviarMensagemDireta } = require("./whatsappController");
    try {
      await enviarMensagemDireta(telComDDI, mensagem, req.empresa_id);
      await db.query(
        `INSERT INTO whatsapp_logs (empresa_id, portal_id, telefone, mensagem, contexto_tipo, status)
         VALUES (?, ?, ?, ?, 'teste', 'ok')`,
        [req.empresa_id, id, telComDDI, mensagem]
      );
      res.json({ ok: true, message: "Mensagem enviada", mensagem });
    } catch (sendErr) {
      const erroMsg = sendErr?.response?.data?.message || sendErr?.message || "erro";
      await db.query(
        `INSERT INTO whatsapp_logs (empresa_id, portal_id, telefone, mensagem, contexto_tipo, status, erro_msg)
         VALUES (?, ?, ?, ?, 'teste', 'erro', ?)`,
        [req.empresa_id, id, telComDDI, mensagem, String(erroMsg).slice(0, 500)]
      );
      res.status(500).json({ ok: false, message: erroMsg });
    }
  } catch (err) {
    console.error("Erro no teste WhatsApp:", err);
    res.status(500).json({ message: "Erro ao enviar teste" });
  }
};

exports.deletarPortal = async (req, res) => {
  const { id } = req.params;
  try {
    const [[portal]] = await db.query("SELECT tipo FROM portais WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    if (!portal) return res.status(404).json({ message: "Portal não encontrado" });
    if (portal.tipo !== "custom") return res.status(400).json({ message: "Não é possível remover portais built-in" });

    await db.execute("UPDATE mikrotiks SET portal_id = NULL WHERE portal_id = ? AND empresa_id = ?", [id, req.empresa_id]);
    await db.execute("DELETE FROM portais WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    res.json({ message: "Portal removido" });
  } catch (err) {
    console.error("Erro ao deletar portal:", err);
    res.status(500).json({ message: "Erro ao deletar portal" });
  }
};

exports.previewPortal = async (req, res) => {
  const { id } = req.params;
  try {
    const [[portal]] = await db.query("SELECT * FROM portais WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    if (!portal) return res.status(404).json({ message: "Portal não encontrado" });

    if (portal.tipo === "custom" && portal.html_content) {
      let html = portal.html_content
        .replace(/\$\(mac\)/g, "AA:BB:CC:DD:EE:FF")
        .replace(/\$\(ip\)/g, "192.168.1.100")
        .replace(/\$\(mikrotik_id\)/g, "1");

      // Parse das configurações para injetar no visual
      let cfg = {};
      try { if (portal.configuracoes) cfg = JSON.parse(portal.configuracoes); } catch (e) { }

      let injector = `<style>
        body { background: linear-gradient(135deg, ${cfg.cor_fundo_1 || '#0f111a'} 0%, ${cfg.cor_fundo_2 || cfg.cor_fundo_1 || '#1a1d2e'} 100%) !important; }
        .btn-connect, .btn-plan, .btn { background: ${cfg.cor_botao || '#3B82F6'} !important; border:none!important; color:#fff!important; box-shadow:none!important; }
        .btn-connect:hover, .btn-plan:hover, .btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
      </style>
      <script>
      document.addEventListener("DOMContentLoaded", function() {
        const titulo = ${JSON.stringify(cfg.titulo || '')};
        const subtitulo = ${JSON.stringify(cfg.subtitulo || '')};
        const textoBotao = ${JSON.stringify(cfg.texto_botao || '')};
        const logoUrl = ${JSON.stringify(cfg.logo_url || '')};
        
        const h1 = document.querySelector("h1");
        if (h1 && titulo) h1.textContent = titulo;
        
        const sub = document.querySelector(".subtitle");
        if (sub && subtitulo) sub.textContent = subtitulo;
        
        const btn = document.querySelector(".btn-connect, .btn-plan, .btn");
        if (btn && textoBotao) {
          const span = btn.querySelector("span");
          if (span) span.textContent = textoBotao;
          else btn.textContent = textoBotao;
        }
        
        if (logoUrl) {
          const iconDiv = document.querySelector(".icon");
          if (iconDiv) {
            iconDiv.style.background = "none";
            iconDiv.innerHTML = '<img src="' + logoUrl + '" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:16px;">';
          }
        }
      });
      </script>`;

      // Inject custom CSS if present
      if (portal.custom_css) {
        html = html.replace('</head>', `<style>${portal.custom_css}</style></head>`);
      }

      html = html.replace('</body>', `${injector}</body>`);

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    }

    if (portal.url_redirect) {
      return res.redirect(portal.url_redirect + "?mac=AA:BB:CC:DD:EE:FF&ip=192.168.1.100&preview=1&empresa_id=" + req.empresa_id);
    }

    res.status(400).json({ message: "Portal sem conteúdo para preview" });
  } catch (err) {
    console.error("Erro no preview:", err);
    res.status(500).json({ message: "Erro ao gerar preview" });
  }
};

exports.uploadLogo = async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.file) return res.status(400).json({ message: "Nenhuma imagem enviada" });

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update the logo_url inside the portal's 'configuracoes' JSON
    const [[portal]] = await db.query("SELECT configuracoes FROM portais WHERE id = ? AND empresa_id = ?", [id, req.empresa_id]);
    if (!portal) return res.status(404).json({ message: "Portal não encontrado" });

    let config = {};
    try { config = JSON.parse(portal.configuracoes || '{}'); } catch (e) { }
    config.logo_url = logoUrl;

    await db.query(
      "UPDATE portais SET configuracoes = ?, logo_url = ? WHERE id = ? AND empresa_id = ?",
      [JSON.stringify(config), logoUrl, id, req.empresa_id]
    );

    res.json({ message: "Logo enviada com sucesso", logo_url: logoUrl });
  } catch (err) {
    console.error("Erro no upload de logo:", err);
    res.status(500).json({ message: "Erro ao fazer upload da logo" });
  }
};

exports.vincularCampanha = async (req, res) => {
  const portalId = parseInt(req.params.portalId, 10);
  const { campanha_ativa_id } = req.body;

  try {
    const [[portal]] = await db.query(
      "SELECT id FROM portais WHERE id = ? AND empresa_id = ?",
      [portalId, req.empresa_id]
    );
    if (!portal) return res.status(404).json({ message: "Portal não encontrado" });

    if (campanha_ativa_id) {
      const [[campanha]] = await db.query(
        "SELECT id FROM campanhas WHERE id = ? AND empresa_id = ?",
        [campanha_ativa_id, req.empresa_id]
      );
      if (!campanha) return res.status(400).json({ message: "Campanha não encontrada" });
    }

    await db.execute(
      "UPDATE portais SET campanha_ativa_id = ? WHERE id = ? AND empresa_id = ?",
      [campanha_ativa_id || null, portalId, req.empresa_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Erro ao vincular campanha ao portal:", err);
    res.status(500).json({ message: "Erro ao vincular campanha ao portal" });
  }
};

// Endpoint público: retorna config visual de um portal para a página pública renderizar
exports.getPortalConfig = async (req, res) => {
  const { tipo } = req.params;
  const empresa_id = req.query.empresa_id;
  if (!empresa_id) return res.status(400).json({ message: "empresa_id obrigatório" });

  try {
    const [[portal]] = await db.query(
      "SELECT configuracoes, cor_primaria, cor_fundo, logo_url, custom_css FROM portais WHERE tipo = ? AND empresa_id = ?",
      [tipo, empresa_id]
    );
    if (!portal) return res.json({});

    let config = {};
    if (portal.configuracoes) {
      try { config = JSON.parse(portal.configuracoes); } catch (e) { }
    }
    config.cor_primaria = portal.cor_primaria;
    config.cor_fundo = portal.cor_fundo;
    config.logo_url = portal.logo_url;
    config.custom_css = portal.custom_css;

    res.json(config);
  } catch (err) {
    console.error("Erro ao buscar config do portal:", err);
    res.status(500).json({});
  }
};
