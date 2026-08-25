const db = require("../../db");
const axios = require("axios");
const { enviarMensagemDireta } = require("../controllers/whatsappController");

/**
 * Normaliza número de telefone para formato internacional com DDI 55
 */
function normalizarTelefone(numero) {
    if (!numero) return null;
    const digits = String(numero).replace(/\D/g, "");
    if (!digits || digits.length < 8) return null;
    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }
    return digits;
}

/**
 * Busca configurações de alertas do proprietário para uma empresa
 */
async function obterConfigAlertas(empresaId) {
    try {
        const [[configRow]] = await db.query(
            "SELECT config_json FROM empresa_configs WHERE empresa_id = ? AND config_type = 'alertas_dono'",
            [empresaId]
        );

        if (configRow?.config_json) {
            return typeof configRow.config_json === "string"
                ? JSON.parse(configRow.config_json)
                : configRow.config_json;
        }

        // Fallback: busca telefone padrão cadastrado na tabela empresas
        const [[empresa]] = await db.query(
            "SELECT nome, telefone FROM empresas WHERE id = ?",
            [empresaId]
        );

        return {
            notif_vendas_ativo: true,
            notif_vendas_telefone: empresa?.telefone || "",
            notif_offline_ativo: true,
            notif_offline_telefone: empresa?.telefone || "",
            notif_resumo_diario_ativo: false,
            telegram_ativo: false,
            telegram_bot_token: "",
            telegram_chat_id: ""
        };
    } catch (err) {
        console.warn("[OwnerAlertsService] Erro ao buscar config de alertas:", err.message);
        return { notif_vendas_ativo: false };
    }
}

/**
 * Dispara notificação no Telegram (se configurado)
 */
async function dispararTelegram(botToken, chatId, mensagem) {
    if (!botToken || !chatId) return;
    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: mensagem,
            parse_mode: "Markdown"
        }, { timeout: 4000 });
    } catch (err) {
        console.warn("[OwnerAlertsService] Falha ao enviar para Telegram:", err.message);
    }
}

/**
 * 💰 Notifica o proprietário sobre nova venda de pacote Wi-Fi aprovada
 */
async function notificarVendaDono({
    empresa_id,
    plano,
    valor,
    nomeCliente,
    telefoneCliente,
    formaPagamento = "PIX Automático"
}) {
    if (!empresa_id) return;

    setImmediate(async () => {
        try {
            const config = await obterConfigAlertas(empresa_id);
            if (!config || !config.notif_vendas_ativo) return;

            const [[empresa]] = await db.query("SELECT nome FROM empresas WHERE id = ?", [empresa_id]);
            const nomeEmpresa = empresa?.nome || "Seu Estabelecimento";
            const valorFmt = Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const horarioFmt = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const dataFmt = new Date().toLocaleDateString("pt-BR");

            let msg = `💰 *NOVA VENDA NO SEU HOTSPOT WI-FI!*\n\n`;
            msg += `🏢 *Estabelecimento:* ${nomeEmpresa}\n`;
            msg += `📋 *Plano:* ${plano || "Acesso Wi-Fi"}\n`;
            msg += `💵 *Valor:* R$ ${valorFmt}\n`;
            msg += `👤 *Cliente:* ${nomeCliente || "Visitante"}${telefoneCliente ? ` (${telefoneCliente})` : ""}\n`;
            msg += `💳 *Forma de Pagamento:* ${formaPagamento}\n`;
            msg += `🕒 *Data/Hora:* ${dataFmt} às ${horarioFmt}\n\n`;
            msg += `🚀 *Status:* Acesso liberado no Wi-Fi com sucesso!`;

            // Envio WhatsApp
            const telDono = normalizarTelefone(config.notif_vendas_telefone);
            if (telDono) {
                await enviarMensagemDireta(telDono, msg, empresa_id).catch(err => {
                    console.warn(`[OwnerAlerts] Erro ao enviar WhatsApp para ${telDono}:`, err.message);
                });
            }

            // Envio Telegram (se ativo)
            if (config.telegram_ativo && config.telegram_bot_token && config.telegram_chat_id) {
                await dispararTelegram(config.telegram_bot_token, config.telegram_chat_id, msg);
            }
        } catch (err) {
            console.error("[OwnerAlertsService] Erro ao processar notificação de venda:", err.message);
        }
    });
}

/**
 * ⚠️ Notifica o proprietário sobre queda de roteador / equipamento offline
 */
async function notificarEquipamentoOffline({
    empresa_id,
    equipamento_nome,
    equipamento_ip,
    motivo = "Sem resposta de ping/API"
}) {
    if (!empresa_id) return;

    setImmediate(async () => {
        try {
            const config = await obterConfigAlertas(empresa_id);
            if (!config || !config.notif_offline_ativo) return;

            const [[empresa]] = await db.query("SELECT nome FROM empresas WHERE id = ?", [empresa_id]);
            const nomeEmpresa = empresa?.nome || "Seu Estabelecimento";
            const horarioFmt = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            let msg = `⚠️ *ALERTA DE INFRAESTRUTURA: ROTEADOR OFFLINE*\n\n`;
            msg += `🏢 *Estabelecimento:* ${nomeEmpresa}\n`;
            msg += `📡 *Equipamento:* ${equipamento_nome || "Roteador Principal"}\n`;
            if (equipamento_ip) msg += `🌐 *IP:* ${equipamento_ip}\n`;
            msg += `⏱️ *Horário:* ${horarioFmt}\n`;
            msg += `🔍 *Diagnóstico:* ${motivo}\n\n`;
            msg += `Por favor, verifique a energia elétrica e o link de internet do local.`;

            // Envio WhatsApp
            const telDono = normalizarTelefone(config.notif_offline_telefone || config.notif_vendas_telefone);
            if (telDono) {
                await enviarMensagemDireta(telDono, msg, empresa_id).catch(() => { });
            }

            // Envio Telegram
            if (config.telegram_ativo && config.telegram_bot_token && config.telegram_chat_id) {
                await dispararTelegram(config.telegram_bot_token, config.telegram_chat_id, msg);
            }
        } catch (err) {
            console.error("[OwnerAlertsService] Erro ao notificar equipamento offline:", err.message);
        }
    });
}

/**
 * 🧪 Envia teste imediato para o número/canal configurado
 */
async function enviarTesteAlerta({
    empresa_id,
    telefone,
    telegram_bot_token,
    telegram_chat_id
}) {
    const [[empresa]] = await db.query("SELECT nome FROM empresas WHERE id = ?", [empresa_id]);
    const nomeEmpresa = empresa?.nome || "NuvyCore Hotspot";

    let msg = `🧪 *TESTE DE ALERTA DO PROPRIETÁRIO*\n\n`;
    msg += `🏢 *Empresa:* ${nomeEmpresa}\n`;
    msg += `✅ Se você recebeu esta mensagem, as notificações em tempo real de *Vendas Wi-Fi* e *Alertas de Infraestrutura* estão 100% configuradas e operacionais!\n\n`;
    msg += `Nuvy Pro 🚀`;

    let waOk = false;
    let waErr = null;
    let tgOk = false;
    let tgErr = null;

    const telFormatado = normalizarTelefone(telefone);
    if (telFormatado) {
        try {
            await enviarMensagemDireta(telFormatado, msg, empresa_id);
            waOk = true;
        } catch (err) {
            waErr = err.message;
        }
    }

    if (telegram_bot_token && telegram_chat_id) {
        try {
            await dispararTelegram(telegram_bot_token, telegram_chat_id, msg);
            tgOk = true;
        } catch (err) {
            tgErr = err.message;
        }
    }

    return {
        whatsapp: { enviado: waOk, telefone: telFormatado, erro: waErr },
        telegram: { enviado: tgOk, erro: tgErr }
    };
}

module.exports = {
    notificarVendaDono,
    notificarEquipamentoOffline,
    enviarTesteAlerta,
    obterConfigAlertas
};
