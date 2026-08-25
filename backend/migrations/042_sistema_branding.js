const db = require('../db');

async function migrate() {
  console.log('=== Migration 042: Sistema Branding & Identidade Visual Centralizada ===\n');

  try {
    // 1. Criar tabela sistema_branding se não existir
    await db.query(`
      CREATE TABLE IF NOT EXISTS sistema_branding (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nome_sistema VARCHAR(100) NOT NULL DEFAULT 'SpotNuvy Pro',
        slogan VARCHAR(255) NOT NULL DEFAULT 'Gestão Inteligente de Hotspot & Wi-Fi',
        logo_url VARCHAR(500) NOT NULL DEFAULT '/nuvycore.svg',
        favicon_url VARCHAR(500) NULL,
        texto_rodape VARCHAR(255) NOT NULL DEFAULT 'Tecnologia Hotspot por NuvyCore',
        cor_primaria VARCHAR(20) NOT NULL DEFAULT '#2563eb',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'sistema_branding' criada/verificada com sucesso.");

    // 2. Inserir registro padrão se tabela estiver vazia
    const [[existente]] = await db.query('SELECT id FROM sistema_branding WHERE id = 1');
    if (!existente) {
      await db.query(`
        INSERT INTO sistema_branding (id, nome_sistema, slogan, logo_url, favicon_url, texto_rodape, cor_primaria)
        VALUES (1, 'SpotNuvy Pro', 'Gestão Inteligente de Hotspot & Wi-Fi', '/nuvycore.svg', NULL, 'Tecnologia Hotspot por NuvyCore', '#2563eb')
      `);
      console.log("✅ Registro padrão ID 1 inserido em 'sistema_branding'.");
    } else {
      console.log("ℹ️ Registro ID 1 já existe em 'sistema_branding'.");
    }

    console.log('\n🎉 Migration 042 concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migration 042:', err);
    process.exit(1);
  }
}

migrate();
