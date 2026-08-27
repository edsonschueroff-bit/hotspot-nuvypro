const db = require('../../db');

let isJanitorRunning = false;

/**
 * Retorna a cláusula SQL WHERE para identificar apenas sessões verdadeiramente ativas/online
 * @param {string} alias - Prefixo da tabela radacct (ex: 'ra')
 * @returns {string}
 */
function sqlSessoesAtivas(alias = 'ra') {
  const p = alias ? `${alias}.` : '';
  // Sessão ativa quando não recebeu Acct‑Stop e o último timestamp (acctupdatetime ou acctstarttime)
  // está dentro de um intervalo curto (ex.: 4 minutos). Isso permite que sessões sem
  // interim‑updates (acctupdatetime ainda = acctstarttime) sejam consideradas online.
  return `(${p}acctstoptime IS NULL AND COALESCE(${p}acctupdatetime, ${p}acctstarttime) >= DATE_SUB(NOW(), INTERVAL 4 MINUTE))`;
}

/**
 * Janitor Service: Limpa e encerra sessões órfãs no FreeRADIUS (radacct)
 * - Identifica conexões antigas (> 24h) cujo roteador perdeu energia sem enviar Acct-Stop
 * - Idempotente, protegido contra concorrência e gera logs de auditoria
 * @returns {Promise<{ sessoesEncerradas: number }>}
 */
async function encerrarSessoesOrfas() {
  if (isJanitorRunning) {
    return { sessoesEncerradas: 0, status: 'already_running' };
  }

  isJanitorRunning = true;
  let conn = null;

  try {
    conn = await db.getConnection();

    // Encerra apenas sessoes verdadeiramente orfas (> 24h sem Acct-Stop)
    const [result] = await conn.execute(`
      UPDATE radacct 
      SET acctstoptime = COALESCE(acctupdatetime, DATE_ADD(acctstarttime, INTERVAL 2 HOUR)),
          acctsessiontime = TIMESTAMPDIFF(SECOND, acctstarttime, COALESCE(acctupdatetime, DATE_ADD(acctstarttime, INTERVAL 2 HOUR))),
          acctterminatecause = 'Lost-Carrier'
      WHERE acctstoptime IS NULL 
        AND acctstarttime < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    const encerradas = result.affectedRows || 0;
    if (encerradas > 0) {
      console.log(`[SessionJanitor] ${encerradas} sessão(ões) órfã(s) encerrada(s) com sucesso.`);
    }

    // Sincroniza vouchers utilizados com as sessões de conexão do FreeRADIUS
    try {
      await conn.execute(`
        UPDATE vouchers v
        JOIN radacct ra ON ra.username COLLATE utf8mb4_unicode_ci = v.codigo COLLATE utf8mb4_unicode_ci
        SET v.status = 'utilizado',
            v.primeiro_uso_em = COALESCE(v.primeiro_uso_em, ra.acctstarttime)
        WHERE v.status = 'disponivel'
      `);
    } catch (vErr) {
      console.warn('[SessionJanitor] Aviso ao sincronizar status de vouchers:', vErr.message);
    }

    return { sessoesEncerradas: encerradas, status: 'success' };
  } catch (err) {
    console.error('[SessionJanitor] Erro ao encerrar sessões órfãs:', err);
    throw err;
  } finally {
    if (conn) conn.release();
    isJanitorRunning = false;
  }
}

module.exports = {
  sqlSessoesAtivas,
  encerrarSessoesOrfas
};
