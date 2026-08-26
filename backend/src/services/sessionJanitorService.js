const db = require('../../db');

let isJanitorRunning = false;

/**
 * Retorna a cláusula SQL WHERE para identificar apenas sessões verdadeiramente ativas/online
 * @param {string} alias - Prefixo da tabela radacct (ex: 'ra')
 * @returns {string}
 */
function sqlSessoesAtivas(alias = 'ra') {
  const p = alias ? `${alias}.` : '';
  return `(${p}acctstoptime IS NULL AND ${p}acctstarttime >= DATE_SUB(NOW(), INTERVAL 2 HOUR) AND (${p}acctupdatetime IS NULL OR ${p}acctupdatetime >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)))`;
}

/**
 * Janitor Service: Limpa e encerra sessões órfãs no FreeRADIUS (radacct)
 * - Identifica conexões cujo cliente perdeu o Wi-Fi sem enviar Acct-Stop
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

    // Encerra sessões sem Acct-Stop que:
    // 1. Ultrapassaram o Session-Timeout padrão (2 horas)
    // 2. Ou não recebem interim-update de tráfego há mais de 15 minutos
    const [result] = await conn.execute(`
      UPDATE radacct 
      SET acctstoptime = COALESCE(acctupdatetime, DATE_ADD(acctstarttime, INTERVAL 2 HOUR)),
          acctsessiontime = TIMESTAMPDIFF(SECOND, acctstarttime, COALESCE(acctupdatetime, DATE_ADD(acctstarttime, INTERVAL 2 HOUR))),
          acctterminatecause = 'Session-Timeout'
      WHERE acctstoptime IS NULL 
        AND (
          acctstarttime < DATE_SUB(NOW(), INTERVAL 2 HOUR)
          OR (acctupdatetime IS NOT NULL AND acctupdatetime < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
        )
    `);

    const encerradas = result.affectedRows || 0;
    if (encerradas > 0) {
      console.log(`[SessionJanitor] ${encerradas} sessão(ões) órfã(s) encerrada(s) com sucesso.`);
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
