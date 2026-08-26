const db = require('../../db');

module.exports = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Não autenticado' });

    if (user.role === 'super_admin') {
      // Super admin: usa header x-empresa-id, ou empresa_id do JWT (set via switchEmpresa)
      const empresaId = req.headers['x-empresa-id'] || req.query.empresa_id || user.empresa_id;
      req.empresa_id = empresaId ? parseInt(empresaId, 10) : null;
    } else {
      req.empresa_id = user.empresa_id;
    }

    if (!req.empresa_id && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Verificar se a empresa do tenant comum está suspensa por inadimplência
    // Permitir rotas de faturamento e regularização para que o tenant possa pagar/assinar
    const url = req.originalUrl || req.url || '';
    const isBillingRoute =
      url.includes('/api/saas-faturas') ||
      url.includes('/api/saas-cartao') ||
      url.includes('/api/public/saas-planos') ||
      url.includes('/api/saas-planos');

    if (user.role !== 'super_admin' && req.empresa_id && !isBillingRoute) {
      const [[emp]] = await db.query(
        "SELECT status_financeiro, liberacao_confianca_ate, nome FROM empresas WHERE id = ?",
        [req.empresa_id]
      );
      if (emp) {
        // Se a liberação de confiança expirou, volta automaticamente para suspenso
        if (emp.status_financeiro === 'liberado_confianca' && emp.liberacao_confianca_ate) {
          const ateData = new Date(emp.liberacao_confianca_ate);
          if (ateData < new Date()) {
            await db.execute("UPDATE empresas SET status_financeiro = 'suspenso' WHERE id = ?", [req.empresa_id]);
            emp.status_financeiro = 'suspenso';
          }
        }

        if (emp.status_financeiro === 'suspenso') {
          return res.status(403).json({
            error: 'Empresa suspensa temporariamente devido a pendência financeira.',
            status_financeiro: 'suspenso',
            empresa_nome: emp.nome
          });
        }
      }
    }

    next();
  } catch (err) {
    console.error("[Tenant Middleware] Erro interno:", err);
    return res.status(500).json({ error: 'Erro interno ao validar contexto da empresa' });
  }
};
