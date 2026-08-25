const db = require('../db');

/**
 * Rotina de Limpeza de Órfãos FreeRADIUS
 * Remove registros em radcheck, radreply, radusergroup e radpostauth
 * que não possuem vínculo correspondente na tabela radius_users.
 */
async function limparOrfaosRadius() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [delCheck] = await connection.query(`
      DELETE rc FROM radcheck rc
      LEFT JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = rc.username COLLATE utf8mb4_unicode_ci
      WHERE ru.id IS NULL
    `);

    const [delReply] = await connection.query(`
      DELETE rr FROM radreply rr
      LEFT JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = rr.username COLLATE utf8mb4_unicode_ci
      WHERE ru.id IS NULL
    `);

    const [delGroup] = await connection.query(`
      DELETE rg FROM radusergroup rg
      LEFT JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = rg.username COLLATE utf8mb4_unicode_ci
      WHERE ru.id IS NULL
    `);

    const [delPostAuth] = await connection.query(`
      DELETE rp FROM radpostauth rp
      LEFT JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = rp.username COLLATE utf8mb4_unicode_ci
      WHERE ru.id IS NULL
    `);

    await connection.commit();

    const resultado = {
      radcheck_removidos: delCheck.affectedRows,
      radreply_removidos: delReply.affectedRows,
      radusergroup_removidos: delGroup.affectedRows,
      radpostauth_removidos: delPostAuth.affectedRows,
      limpo_em: new Date().toISOString()
    };

    console.log("✅ [RADIUS Cleanup] Limpeza concluída com sucesso:", resultado);
    return resultado;
  } catch (err) {
    await connection.rollback();
    console.error("❌ [RADIUS Cleanup] Falha na limpeza. Rollback executado:", err);
    throw err;
  } finally {
    connection.release();
  }
}

// Permite execução direta via CLI (`node jobs/limpezaRadiusOrfaos.js`)
if (require.main === module) {
  limparOrfaosRadius()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { limparOrfaosRadius };
