const db = require("../../db");
const axios = require("axios");
const crypto = require("crypto");

const MAX_TENTATIVAS = 5;

/**
 * Dispara eventos para todos os webhooks ativos de uma empresa configurados para aquele evento.
 * Execução assíncrona (não bloqueia a thread principal).
 * 
 * @param {number} empresaId 
 * @param {string} evento - Ex: 'lead.connected', 'lead.created', 'cupom.redeemed', 'payment.approved'
 * @param {object} dados - Dados do payload do evento
 */
async function dispararWebhooks(empresaId, evento, dados) {
    if (!empresaId || !evento) return;

    // Executa em background sem bloquear
    setImmediate(async () => {
        try {
            const [webhooks] = await db.query(
                `SELECT * FROM empresa_webhooks WHERE empresa_id = ? AND ativo = 1`,
                [empresaId]
            );

            if (!webhooks || webhooks.length === 0) return;

            for (const wh of webhooks) {
                let eventosArray = [];
                try {
                    eventosArray = typeof wh.eventos === "string" ? JSON.parse(wh.eventos) : (wh.eventos || []);
                } catch (e) {
                    eventosArray = [];
                }

                // Verifica se o webhook está ouvindo este evento específico ou '*'
                if (eventosArray.includes(evento) || eventosArray.includes("*")) {
                    await executarEnvioWebhook(wh, evento, dados, empresaId);
                }
            }
        } catch (err) {
            console.error(`[WebhookOutbound] Erro ao buscar webhooks para empresa #${empresaId}:`, err.message);
        }
    });
}

/**
 * Validação rigorosa contra SSRF com suporte a serviços internos autorizados (ex: n8n).
 */
function validarSegurancaUrlWebhook(urlString, empresaId) {
    try {
        const urlObj = new URL(urlString);
        const protocol = urlObj.protocol.toLowerCase();
        const hostname = urlObj.hostname.toLowerCase();
        const port = urlObj.port;
        const fullUrl = urlObj.href.toLowerCase();

        // 1. Apenas protocolos HTTP e HTTPS
        if (protocol !== 'http:' && protocol !== 'https:') {
            return { valido: false, statusCode: 400, msg: "Apenas protocolos HTTP e HTTPS são permitidos." };
        }

        // 2. Metadados de Nuvem (AWS, GCP, Azure, OpenStack) — NUNCA PERMITIR
        const cloudMetadataPattern = /^(169\.254\.|metadata\.google\.internal|100\.100\.100\.200)/i;
        if (cloudMetadataPattern.test(hostname)) {
            console.warn(`[WebhookOutbound SSRF] Bloqueio Crítico: Tentativa de acesso a metadados cloud (${urlString})`);
            return { valido: false, statusCode: 403, msg: "SSRF Prevention: Acesso a metadados de infraestrutura/nuvem bloqueado." };
        }

        // 3. Whitelist de Serviços Internos Autorizados (ex: n8n na porta 5678 ou via TRUSTED_INTERNAL_WEBHOOKS / N8N_WEBHOOK_URL)
        const trustedList = process.env.TRUSTED_INTERNAL_WEBHOOKS
            ? process.env.TRUSTED_INTERNAL_WEBHOOKS.split(',').map(u => u.trim().toLowerCase())
            : [];
        if (process.env.N8N_WEBHOOK_URL) {
            trustedList.push(process.env.N8N_WEBHOOK_URL.trim().toLowerCase());
        }

        const isExplicitlyTrusted = trustedList.some(trusted => trusted && fullUrl.startsWith(trusted));
        const isN8nDefault = (hostname === 'n8n' || hostname === 'localhost' || hostname === '127.0.0.1') && (port === '5678' || fullUrl.includes(':5678/'));

        if (isExplicitlyTrusted || isN8nDefault) {
            return { valido: true, isInternalTrusted: true };
        }

        // 4. Bloqueio de Outras Faixas Privadas Não Confiáveis (RFC 1918, loopback, link-local)
        const ipRangePattern = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|0\.0\.0\.0|localhost)/i;
        if (ipRangePattern.test(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
            console.warn(`[WebhookOutbound SSRF] Tentativa bloqueada para a empresa #${empresaId}: URL interna não autorizada (${urlString})`);
            return { valido: false, statusCode: 403, msg: "SSRF Prevention: URL ou IP interno não autorizado bloqueado por segurança." };
        }

        return { valido: true };
    } catch (e) {
        return { valido: false, statusCode: 400, msg: "SSRF Prevention: URL inválida fornecida." };
    }
}

/**
 * Executa o envio HTTP POST para uma URL de webhook específica e salva/atualiza o log com controle de DLQ.
 */
async function executarEnvioWebhook(webhook, evento, dados, empresaId, logId = null, tentativaAtual = 1) {
    // PREVENÇÃO SSRF: Valida o hostname antes de montar o request
    const checagemUrl = validarSegurancaUrlWebhook(webhook.url, empresaId);
    if (!checagemUrl.valido) {
        return { sucesso: 0, statusCode: checagemUrl.statusCode, respostaBody: checagemUrl.msg };
    }

    const payload = dados && dados.event ? dados : {
        event: evento,
        timestamp: new Date().toISOString(),
        empresa_id: empresaId,
        data: dados
    };

    const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "NuvyCore-Webhooks/1.0",
        "X-Webhook-Event": evento,
        "X-Webhook-Delivery": crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
        "X-Webhook-Attempt": String(tentativaAtual)
    };

    if (webhook.secret && webhook.secret.trim()) {
        const hmac = crypto.createHmac("sha256", webhook.secret.trim());
        hmac.update(payloadJson);
        headers["X-Webhook-Signature"] = `sha256=${hmac.digest("hex")}`;
    }

    let statusCode = null;
    let respostaBody = null;
    let sucesso = 0;

    try {
        const response = await axios.post(webhook.url, payload, {
            headers,
            timeout: 5000,
            validateStatus: () => true // Captura qualquer status HTTP sem lançar exception
        });

        statusCode = response.status;
        respostaBody = typeof response.data === "object" ? JSON.stringify(response.data) : String(response.data || "");
        respostaBody = respostaBody.slice(0, 1000);
        sucesso = response.status >= 200 && response.status < 300 ? 1 : 0;
    } catch (err) {
        statusCode = err.response?.status || 500;
        respostaBody = (err.message || "Erro de conexão/timeout").slice(0, 1000);
        sucesso = 0;
    }

    // Cálculo de Backoff Exponencial e DLQ
    let statusEntrega = "sucesso";
    let proximaTentativaEm = null;

    if (sucesso === 0) {
        if (tentativaAtual < MAX_TENTATIVAS) {
            statusEntrega = "pendente";
            // Backoff exponencial: 1min, 2min, 4min, 8min...
            const delayMinutos = Math.pow(2, tentativaAtual - 1);
            proximaTentativaEm = new Date(Date.now() + delayMinutos * 60 * 1000);
        } else {
            statusEntrega = "falha_definitiva"; // DLQ (Dead Letter Queue)
            console.warn(`[WebhookOutbound DLQ] Webhook #${webhook.id} atingiu limite de ${MAX_TENTATIVAS} tentativas e foi para DLQ.`);
        }
    }

    try {
        if (logId) {
            // Atualiza registro existente (durante retry)
            await db.execute(
                `UPDATE empresa_webhook_logs 
                 SET status_code = ?, resposta_body = ?, sucesso = ?, tentativas = ?, proxima_tentativa_em = ?, status_entrega = ?
                 WHERE id = ?`,
                [statusCode, respostaBody, sucesso, tentativaAtual, proximaTentativaEm, statusEntrega, logId]
            );
        } else {
            // Novo registro
            await db.execute(
                `INSERT INTO empresa_webhook_logs 
                 (empresa_id, webhook_id, evento, payload, status_code, resposta_body, sucesso, tentativas, proxima_tentativa_em, status_entrega)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [empresaId, webhook.id, evento, payloadJson, statusCode, respostaBody, sucesso, tentativaAtual, proximaTentativaEm, statusEntrega]
            );
        }
    } catch (logErr) {
        console.warn(`[WebhookOutbound] Erro ao gravar/atualizar log do webhook #${webhook.id}:`, logErr.message);
    }

    return { sucesso, statusCode, respostaBody, statusEntrega, tentativaAtual };
}

/**
 * Worker que reprocessa webhooks pendentes da fila (Retries com Backoff Exponencial).
 */
async function processarFilaWebhooks() {
    try {
        const [pendentes] = await db.query(
            `SELECT l.*, w.url, w.secret, w.ativo
             FROM empresa_webhook_logs l
             JOIN empresa_webhooks w ON w.id = l.webhook_id
             WHERE l.status_entrega = 'pendente' 
               AND l.proxima_tentativa_em <= NOW()
               AND w.ativo = 1
             LIMIT 20`
        );

        if (!pendentes || pendentes.length === 0) return;

        for (const item of pendentes) {
            let payloadObj;
            try {
                payloadObj = JSON.parse(item.payload);
            } catch (e) {
                payloadObj = item.payload;
            }

            const webhook = {
                id: item.webhook_id,
                url: item.url,
                secret: item.secret
            };

            const proximaTentativa = (item.tentativas || 1) + 1;
            await executarEnvioWebhook(webhook, item.evento, payloadObj, item.empresa_id, item.id, proximaTentativa);
        }
    } catch (err) {
        console.error("[WebhookOutbound Worker] Erro ao processar fila de retries:", err.message);
    }
}

/**
 * Envia um ping/teste manual imediato para um webhook e retorna o resultado síncrono.
 */
async function testarWebhook(webhookId, empresaId) {
    const [[wh]] = await db.query(
        "SELECT * FROM empresa_webhooks WHERE id = ? AND empresa_id = ?",
        [webhookId, empresaId]
    );

    if (!wh) {
        throw new Error("Webhook não encontrado.");
    }

    const payloadMock = {
        mensagem: "Este é um disparo de teste da plataforma NuvyCore Hotspot.",
        lead: {
            nome: "Visitante de Teste",
            telefone: "5511999998888",
            email: "teste@nuvycore.online",
            cpf: "123.456.789-00",
            mac: "AA:BB:CC:11:22:33",
            origem: "portal_teste"
        }
    };

    return await executarEnvioWebhook(wh, "ping.test", payloadMock, empresaId);
}

// Inicializa o worker em background a cada 60 segundos
let workerInterval = null;
function iniciarWorkerFila() {
    if (!workerInterval) {
        workerInterval = setInterval(processarFilaWebhooks, 60 * 1000);
        // Não impede o encerramento do processo Node
        if (workerInterval.unref) workerInterval.unref();
    }
}

iniciarWorkerFila();

module.exports = {
    dispararWebhooks,
    executarEnvioWebhook,
    processarFilaWebhooks,
    testarWebhook
};
