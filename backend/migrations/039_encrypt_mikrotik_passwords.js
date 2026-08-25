const db = require('../db');
const { encrypt, isEncrypted } = require('../src/utils/cryptoHelper');

async function migrate() {
  console.log('=== Migration 039: Criptografia AES-256-GCM das Senhas MikroTik ===\n');

  try {
    const [rows] = await db.query('SELECT id, nome, senha FROM mikrotiks WHERE senha IS NOT NULL AND senha != ""');
    console.log(`Encontrados ${rows.length} registros de MikroTik para validação.`);

    let count = 0;
    for (const row of rows) {
      if (!isEncrypted(row.senha)) {
        const encrypted = encrypt(row.senha);
        await db.execute('UPDATE mikrotiks SET senha = ? WHERE id = ?', [encrypted, row.id]);
        console.log(`✅ [ID ${row.id} - ${row.nome}] Senha criptografada com sucesso.`);
        count++;
      } else {
        console.log(`ℹ️ [ID ${row.id} - ${row.nome}] Já estava criptografado.`);
      }
    }

    console.log(`\n🎉 Migração concluída: ${count} senhas criptografadas com sucesso.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migração 039:', err);
    process.exit(1);
  }
}

migrate();
