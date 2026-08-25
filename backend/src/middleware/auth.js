const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (authHeader) {
    token = authHeader;
  }

  // Fallback seguro: aceitar token via query param APENAS para downloads/previews em nova aba (GET)
  if (!token && req.method === 'GET' && req.query.token) {
    const isAllowedQueryRoute = 
      req.path.includes('/preview') || 
      req.path.includes('/export') || 
      req.path.includes('/download');

    if (isAllowedQueryRoute) {
      token = req.query.token;
    } else {
      return res.status(401).json({ error: 'Tokens via query param não são permitidos nesta rota. Utilize o header Authorization.' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};
