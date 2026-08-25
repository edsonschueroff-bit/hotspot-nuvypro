const db = require('../../db');
const path = require('path');
const fs = require('fs');

/**
 * Retorna dados públicos de branding (com cache em memória para alta performance)
 */
let brandingCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 segundos de cache

exports.obterBrandingPublico = async (req, res) => {
  try {
    const now = Date.now();
    if (brandingCache && (now - lastCacheTime < CACHE_TTL_MS)) {
      return res.json(brandingCache);
    }

    const [[branding]] = await db.query(
      'SELECT nome_sistema, slogan, logo_url, favicon_url, texto_rodape, cor_primaria FROM sistema_branding WHERE id = 1 LIMIT 1'
    );

    const dados = branding || {
      nome_sistema: 'Nuvy Pro',
      slogan: 'Gestão Inteligente de Wi-Fi, Marketing & Fidelização de Clientes',
      logo_url: '/nuvycore.svg',
      favicon_url: null,
      texto_rodape: 'Tecnologia Nuvy Pro',
      cor_primaria: '#2563eb'
    };

    brandingCache = dados;
    lastCacheTime = now;

    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json(dados);
  } catch (err) {
    console.error('Erro ao obter branding público:', err);
    return res.status(500).json({
      nome_sistema: 'Nuvy Pro',
      slogan: 'Gestão Inteligente de Wi-Fi, Marketing & Fidelização de Clientes',
      logo_url: '/nuvycore.svg',
      favicon_url: null,
      texto_rodape: 'Tecnologia Nuvy Pro',
      cor_primaria: '#2563eb'
    });
  }
};

/**
 * Retorna dados completos para o Super Admin
 */
exports.obterBrandingSuper = async (req, res) => {
  try {
    const [[branding]] = await db.query('SELECT * FROM sistema_branding WHERE id = 1 LIMIT 1');
    if (!branding) {
      return res.status(404).json({ error: 'Configuração de branding não encontrada.' });
    }
    return res.json(branding);
  } catch (err) {
    console.error('Erro ao obter branding Super Admin:', err);
    return res.status(500).json({ error: 'Erro ao consultar branding.' });
  }
};

/**
 * Atualiza campos de texto e cores (Super Admin)
 */
exports.atualizarBranding = async (req, res) => {
  try {
    const { nome_sistema, slogan, texto_rodape, cor_primaria } = req.body;

    if (!nome_sistema || !nome_sistema.trim()) {
      return res.status(400).json({ error: 'Nome do sistema é obrigatório.' });
    }

    await db.query(
      `UPDATE sistema_branding SET 
        nome_sistema = ?, 
        slogan = ?, 
        texto_rodape = ?, 
        cor_primaria = ? 
       WHERE id = 1`,
      [
        nome_sistema.trim(),
        slogan ? slogan.trim() : '',
        texto_rodape ? texto_rodape.trim() : 'Tecnologia Hotspot por NuvyCore',
        cor_primaria ? cor_primaria.trim() : '#2563eb'
      ]
    );

    // Invalidar cache
    brandingCache = null;

    const [[atualizado]] = await db.query('SELECT * FROM sistema_branding WHERE id = 1');
    return res.json({ message: 'Identidade visual atualizada com sucesso!', branding: atualizado });
  } catch (err) {
    console.error('Erro ao atualizar branding:', err);
    return res.status(500).json({ error: 'Erro ao salvar alterações.' });
  }
};

/**
 * Upload da Logo Principal
 */
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const logoUrl = `/uploads/branding/${req.file.filename}`;

    await db.query('UPDATE sistema_branding SET logo_url = ? WHERE id = 1', [logoUrl]);

    // Invalidar cache
    brandingCache = null;

    const [[atualizado]] = await db.query('SELECT * FROM sistema_branding WHERE id = 1');
    return res.json({
      message: 'Logo da plataforma atualizada com sucesso em todo o sistema!',
      logo_url: logoUrl,
      branding: atualizado
    });
  } catch (err) {
    console.error('Erro no upload de logo:', err);
    return res.status(500).json({ error: 'Erro ao processar upload da logo.' });
  }
};

/**
 * Upload do Favicon / Ícone
 */
exports.uploadFavicon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const faviconUrl = `/uploads/branding/${req.file.filename}`;

    await db.query('UPDATE sistema_branding SET favicon_url = ? WHERE id = 1', [faviconUrl]);

    // Invalidar cache
    brandingCache = null;

    const [[atualizado]] = await db.query('SELECT * FROM sistema_branding WHERE id = 1');
    return res.json({
      message: 'Favicon/Ícone da plataforma atualizado com sucesso!',
      favicon_url: faviconUrl,
      branding: atualizado
    });
  } catch (err) {
    console.error('Erro no upload de favicon:', err);
    return res.status(500).json({ error: 'Erro ao processar upload do favicon.' });
  }
};

/**
 * Restaura os valores e caminhos originais da marca NuvyCore
 */
exports.restaurarPadrao = async (req, res) => {
  try {
    await db.query(`
      UPDATE sistema_branding SET
        nome_sistema = 'Nuvy Pro',
        slogan = 'Gestão Inteligente de Wi-Fi, Marketing & Fidelização de Clientes',
        logo_url = '/nuvycore.svg',
        favicon_url = NULL,
        texto_rodape = 'Tecnologia Nuvy Pro',
        cor_primaria = '#2563eb'
      WHERE id = 1
    `);

    // Invalidar cache
    brandingCache = null;

    const [[atualizado]] = await db.query('SELECT * FROM sistema_branding WHERE id = 1');
    return res.json({
      message: 'Identidade visual padrão restaurada com sucesso!',
      branding: atualizado
    });
  } catch (err) {
    console.error('Erro ao restaurar branding padrão:', err);
    return res.status(500).json({ error: 'Erro ao restaurar padrões.' });
  }
};
