/**
 * Helper para formatar datas no padrão aceito pelo módulo rlm_expiration do FreeRADIUS:
 * Formato: "DD Mon YYYY HH:MM:SS" (ex: "27 Aug 2026 18:30:00")
 */
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatRadiusExpirationDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS_EN[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  formatRadiusExpirationDate
};
