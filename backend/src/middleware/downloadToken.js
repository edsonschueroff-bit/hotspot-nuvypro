const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_hotspot_2025';

function gerarTokenDownload(payloadExpiraEmSegundos = 60, dados = {}) {
    return jwt.sign(dados, JWT_SECRET, { expiresIn: payloadExpiraEmSegundos });
}

function validarTokenDownload(req, res, next) {
    const token = req.query.token || req.headers['x-download-token'];
    if (!token) {
        return res.status(401).json({ message: "Token de download não informado." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.downloadData = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Token de download inválido ou expirado." });
    }
}

module.exports = {
    gerarTokenDownload,
    validarTokenDownload
};
