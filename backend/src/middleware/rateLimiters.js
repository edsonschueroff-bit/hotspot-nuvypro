const rateLimit = require('express-rate-limit');

// Rate limit estrito para tentativas de login admin e reset de senha
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15, // máximo 15 tentativas
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas tentativas de login a partir deste IP. Tente novamente após 15 minutos." },
    skipSuccessfulRequests: true // logins com sucesso não consomem a cota!
});

// Rate limit para registro de empresas
const registroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Limite de cadastros atingido para este IP. Tente mais tarde." }
});

// Rate limit para endpoints públicos de portais (hotspot login, templates, configs)
const publicApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas requisições enviadas. Aguarde um instante." }
});

// Rate limit para geração de pagamentos (prevenção de DoS / flood em gateways)
const pagamentoLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Limite de geração de pagamentos atingido. Aguarde um momento antes de tentar novamente." }
});

// Rate limit para testes manuais de alertas e notificações WhatsApp/Telegram
const alertasLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Aguarde 1 minuto antes de enviar um novo teste de notificação." }
});

module.exports = {
    loginLimiter,
    registroLimiter,
    publicApiLimiter,
    pagamentoLimiter,
    alertasLimiter
};
