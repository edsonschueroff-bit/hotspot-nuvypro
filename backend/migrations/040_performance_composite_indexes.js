const db = require('../db');

async function createIndexIfNotExists(tableName, indexName, columnsSql) {
  try {
    const [indexes] = await db.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = ?`, [indexName]);
    if (indexes.length === 0) {
      await db.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columnsSql})`);
      console.log(`✅ [${tableName}] Índice '${indexName}' criado com sucesso.`);
    } else {
      console.log(`ℹ️ [${tableName}] Índice '${indexName}' já existe.`);
    }
  } catch (err) {
    console.error(`❌ [${tableName}] Erro ao criar índice '${indexName}':`, err.message);
  }
}

async function migrate() {
  console.log('=== Migration 040: Criação de Índices Compostos de Alta Performance ===\n');

  try {
    // 1. Tabela radacct (FreeRADIUS - alto volume de conexões)
    await createIndexIfNotExists('radacct', 'idx_radacct_user_stoptime', 'username, acctstoptime');
    await createIndexIfNotExists('radacct', 'idx_radacct_calling_start', 'callingstationid(32), acctstarttime');
    await createIndexIfNotExists('radacct', 'idx_radacct_nas_stoptime', 'nasipaddress, acctstoptime');

    // 2. Tabela leads (CRM / Captação multi-tenant)
    await createIndexIfNotExists('leads', 'idx_leads_empresa_mac', 'empresa_id, mac');
    await createIndexIfNotExists('leads', 'idx_leads_empresa_cpf', 'empresa_id, cpf');
    await createIndexIfNotExists('leads', 'idx_leads_empresa_telefone', 'empresa_id, telefone');
    await createIndexIfNotExists('leads', 'idx_leads_empresa_criado', 'empresa_id, criado_em');

    // 3. Tabela saas_faturas (Cobrança e Faturamento)
    await createIndexIfNotExists('saas_faturas', 'idx_faturas_empresa_status_venc', 'empresa_id, status, data_vencimento');

    // 4. Tabela nas (Verificação de IP/Client)
    await createIndexIfNotExists('nas', 'idx_nas_empresa_nasname', 'empresa_id, nasname');

    // 5. Tabelas de Marketing e Fidelidade
    await createIndexIfNotExists('cupons_resgatados', 'idx_resgates_empresa_codigo', 'empresa_id, codigo_unico');
    await createIndexIfNotExists('cupons_resgatados', 'idx_resgates_empresa_tel', 'empresa_id, cliente_telefone');
    await createIndexIfNotExists('fidelidade_historico', 'idx_fidel_empresa_tel', 'empresa_id, cliente_telefone');
    await createIndexIfNotExists('campanhas', 'idx_campanhas_empresa_ativo', 'empresa_id, ativo');

    console.log('\n🎉 Migração de índices concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migração 040:', err);
    process.exit(1);
  }
}

migrate();
