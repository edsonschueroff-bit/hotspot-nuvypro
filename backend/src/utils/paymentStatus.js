/**
 * Módulo Centralizado de Status de Pagamentos - Nuvy Pro
 * Padroniza os estados de transações PIX, Cartão e Boletos entre todos os módulos.
 */

// Estados que representam pagamento aprovado e liberado
const STATUS_PAGOS = ['pago', 'approved', 'aprovado', 'CONFIRMED'];

// Estados que representam cobranças pendentes aguardando pagamento
const STATUS_PENDENTES = ['pendente', 'pending', 'waiting_payment'];

// Estados que representam cobranças canceladas, recusadas ou estornadas
const STATUS_CANCELADOS = ['cancelado', 'cancelled', 'rejected', 'refunded', 'charged_back'];

/**
 * Verifica se um determinado status representa pagamento concluído
 * @param {string} status 
 * @returns {boolean}
 */
function isStatusPago(status) {
  if (!status) return false;
  return STATUS_PAGOS.includes(String(status).toLowerCase().trim());
}

/**
 * Gera a cláusula SQL WHERE para pagamentos aprovados
 * @param {string} [alias] - Prefixo da tabela (ex: 'p', 'pag')
 * @returns {string} Ex: "p.status IN ('pago', 'approved', 'aprovado', 'CONFIRMED')"
 */
function sqlStatusPagos(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  const list = STATUS_PAGOS.map(s => `'${s}'`).join(', ');
  return `${prefix}status IN (${list})`;
}

/**
 * Gera a cláusula SQL WHERE para pagamentos pendentes
 * @param {string} [alias]
 * @returns {string}
 */
function sqlStatusPendentes(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  const list = STATUS_PENDENTES.map(s => `'${s}'`).join(', ');
  return `${prefix}status IN (${list})`;
}

module.exports = {
  STATUS_PAGOS,
  STATUS_PENDENTES,
  STATUS_CANCELADOS,
  isStatusPago,
  sqlStatusPagos,
  sqlStatusPendentes
};
