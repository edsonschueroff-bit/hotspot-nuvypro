const db = require("../../db");
const { testarWebhook } = require("../services/webhookOutboundService");

// ── LISTAR WEBHOOKS DA EMPRESA COM ESTATÍSTICAS ──
exports.listarWebhooks = async (req, res) => {
    try {
        const empresaId = req.empresa_id;

        const [rows] = await db.query(
            `SELECT 
                w.*,
                (SELECT COUNT(*) FROM empresa_webhook_logs WHERE webhook_id = w.id) AS total_disparos,
                (SELECT COUNT(*) FROM empresa_webhook_logs WHERE webhook_id = w.id AND sucesso = 1) AS total_sucesso,
                (SELECT MAX(criado_em) FROM empresa_webhook_logs WHERE webhook_id = w.id) AS ultimo_disparo
             FROM empresa_webhooks w
             WHERE w.empresa_id = ?
             ORDER BY w.criado_em DESC`,
            [empresaId]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error("Erro ao listar webhooks outbound:", err);
        res.status(500).json({ success: false, message: "Erro ao listar webhooks" });
    }
};

// ── CRIAR NOVO WEBHOOK ──
exports.criarWebhook = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { nome, url, secret, eventos, ativo = 1 } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ success: false, message: "O nome da integração é obrigatório." });
        }

        if (!url || !url.trim() || (!url.startsWith("http://") && !url.startsWith("https://"))) {
            return res.status(400).json({ success: false, message: "Informe uma URL válida (iniciando com http:// ou https://)." });
        }

        const eventosArray = Array.isArray(eventos) && eventos.length > 0
            ? eventos
            : ["lead.connected", "lead.created"];

        const [result] = await db.execute(
            `INSERT INTO empresa_webhooks (empresa_id, nome, url, secret, eventos, ativo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                empresaId,
                nome.trim(),
                url.trim(),
                secret ? secret.trim() : null,
                JSON.stringify(eventosArray),
                ativo !== undefined ? (ativo ? 1 : 0) : 1
            ]
        );

        res.status(201).json({
            success: true,
            id: result.insertId,
            message: "Webhook cadastrado com sucesso!"
        });
    } catch (err) {
        console.error("Erro ao criar webhook outbound:", err);
        res.status(500).json({ success: false, message: "Erro ao criar webhook" });
    }
};

// ── ATUALIZAR WEBHOOK ──
exports.atualizarWebhook = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { id } = req.params;
        const { nome, url, secret, eventos, ativo } = req.body;

        const [[wh]] = await db.query(
            "SELECT id FROM empresa_webhooks WHERE id = ? AND empresa_id = ?",
            [id, empresaId]
        );

        if (!wh) {
            return res.status(404).json({ success: false, message: "Webhook não encontrado." });
        }

        const eventosArray = Array.isArray(eventos) && eventos.length > 0
            ? eventos
            : ["lead.connected", "lead.created"];

        await db.execute(
            `UPDATE empresa_webhooks 
             SET nome = ?, url = ?, secret = ?, eventos = ?, ativo = ?
             WHERE id = ? AND empresa_id = ?`,
            [
                nome ? nome.trim() : "Integração Webhook",
                url ? url.trim() : "",
                secret !== undefined ? (secret ? secret.trim() : null) : null,
                JSON.stringify(eventosArray),
                ativo !== undefined ? (ativo ? 1 : 0) : 1,
                id,
                empresaId
            ]
        );

        res.json({ success: true, message: "Webhook atualizado com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar webhook outbound:", err);
        res.status(500).json({ success: false, message: "Erro ao atualizar webhook" });
    }
};

// ── EXCLUIR WEBHOOK ──
exports.deletarWebhook = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { id } = req.params;

        await db.execute(
            "DELETE FROM empresa_webhooks WHERE id = ? AND empresa_id = ?",
            [id, empresaId]
        );

        res.json({ success: true, message: "Webhook removido com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir webhook outbound:", err);
        res.status(500).json({ success: false, message: "Erro ao excluir webhook" });
    }
};

// ── TESTAR ENVIO DE WEBHOOK (PING) ──
exports.testarEnvio = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { id } = req.params;

        const resultado = await testarWebhook(id, empresaId);

        res.json({
            success: true,
            resultado,
            message: resultado.sucesso
                ? `✅ Teste bem-sucedido! O endpoint respondeu com status ${resultado.statusCode}.`
                : `⚠️ O endpoint respondeu com status ${resultado.statusCode || "erro"}.`
        });
    } catch (err) {
        console.error("Erro ao testar webhook outbound:", err);
        res.status(500).json({ success: false, message: err.message || "Erro ao testar webhook" });
    }
};

// ── OBTER LOGS DE DISPAROS DE UM WEBHOOK ──
exports.obterLogs = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { id } = req.params;

        const [logs] = await db.query(
            `SELECT id, webhook_id, evento, payload, status_code, resposta_body, sucesso, criado_em
             FROM empresa_webhook_logs
             WHERE webhook_id = ? AND empresa_id = ?
             ORDER BY criado_em DESC
             LIMIT 50`,
            [id, empresaId]
        );

        res.json({ success: true, data: logs });
    } catch (err) {
        console.error("Erro ao carregar logs de webhook:", err);
        res.status(500).json({ success: false, message: "Erro ao carregar logs" });
    }
};
