const db = require('../db');
require('dotenv').config();

async function run() {
  try {
    const [cols] = await db.query('DESCRIBE saas_planos');
    const existing = cols.map(c => c.Field);

    const toAdd = [
      { name: 'valor_anual', def: 'DECIMAL(10,2) NULL' },
      { name: 'dias_trial', def: 'INT DEFAULT 0' },
      { name: 'limite_leads', def: 'INT DEFAULT 0' },
      { name: 'limite_whatsapp', def: 'INT DEFAULT 0' },
      { name: 'limite_filiais', def: 'INT DEFAULT 1' },
      { name: 'limite_usuarios', def: 'INT DEFAULT 2' },
      { name: 'modulos_liberados', def: 'JSON NULL' }
    ];

    for (const item of toAdd) {
      if (!existing.includes(item.name)) {
        await db.query(`ALTER TABLE saas_planos ADD COLUMN ${item.name} ${item.def}`);
        console.log('Adicionada coluna:', item.name);
      }
    }

    // Preencher modulos_liberados padrão para os planos existentes caso nulo
    const [planos] = await db.query('SELECT id, mod_vpn, mod_hotspot, permite_portal_vendas, permite_automacao_whatsapp FROM saas_planos');
    for (const p of planos) {
      const defaultMods = {
        mod_vpn: Boolean(p.mod_vpn ?? 1),
        mod_hotspot: Boolean(p.mod_hotspot ?? 1),
        mod_leads: true,
        mod_whatsapp: Boolean(p.permite_automacao_whatsapp),
        mod_ia: Boolean(p.permite_automacao_whatsapp),
        mod_vendas: Boolean(p.permite_portal_vendas),
        mod_cupons: true,
        mod_cardapio: true,
        mod_analytics: true,
        mod_vouchers: true,
        mod_filiais: p.id === 5,
        mod_smtp: true,
        mod_webhooks: true
      };
      await db.query('UPDATE saas_planos SET modulos_liberados = ? WHERE id = ? AND modulos_liberados IS NULL', [JSON.stringify(defaultMods), p.id]);
    }

    const [colsFinal] = await db.query('DESCRIBE saas_planos');
    console.log('✅ Migração concluída com sucesso. Colunas:', colsFinal.map(c => c.Field));
    process.exit(0);
  } catch (e) {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  }
}

run();
