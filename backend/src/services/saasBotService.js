const db = require("../../db");
const { gerarPixFaturaSaas } = require("./saasPixService");
const { enviarMensagemDireta } = require("../controllers/whatsappController");

/**
 * Normaliza um número de telefone mantendo os últimos 8 ou 9 dígitos para comparação segura.
 */
function extrairDigitosTelefone(telefone) {
    if (!telefone) return "";
    return String(telefone).replace(/\D/g, "");
}

/**
 * Garante que a fatura tenha chave PIX ativa no Mercado Pago
 */
async function garantirPixFatura(fatura) {
    if (fatura.pix_copia_cola) {
        return { pix_copia_cola: fatura.pix_copia_cola, pix_qr_code: fatura.pix_qr_code };
    }
    try {
        const pixRes = await gerarPixFaturaSaas(fatura);
        return pixRes;
    } catch (e) {
        console.warn(`[saasBotService] Aviso ao gerar PIX para fatura #${fatura.id}:`, e.message);
        return { pix_copia_cola: null, pix_qr_code: null };
    }
}

/**
 * Consulta empresa e fatura pendente por número de telefone e gera resposta 2ª via PIX.
 */
async function consultarEEmitirPixSaasPorTelefone(telefoneBruto) {
    const digits = extrairDigitosTelefone(telefoneBruto);
    if (!digits || digits.length < 8) {
        return {
            sucesso: false,
            motivo: "telefone_invalido",
            mensagem_formatada: "Telefone inválido para consulta de fatura."
        };
    }

    const last8Digits = digits.slice(-8);

    // 1. Buscar empresa associada ao telefone
    const [empresas] = await db.query(
        `SELECT id, nome, slug, email, telefone, status_financeiro
     FROM empresas
     WHERE slug != 'default'
       AND RIGHT(REGEXP_REPLACE(COALESCE(telefone, ''), '[^0-9]', ''), 8) = ?
     LIMIT 1`,
        [last8Digits]
    );

    if (!empresas || empresas.length === 0) {
        return {
            sucesso: false,
            motivo: "empresa_nao_encontrada",
            mensagem_formatada: `Olá! 👋\nNão encontramos nenhuma empresa cadastrada com o telefone informado em nossa plataforma SaaS.`
        };
    }

    const empresa = empresas[0];

    // 2. Buscar fatura pendente ou vencida
    const [faturas] = await db.query(
        `SELECT *
     FROM saas_faturas
     WHERE empresa_id = ?
       AND status IN ('pendente', 'vencido')
     ORDER BY data_vencimento ASC, id ASC
     LIMIT 1`,
        [empresa.id]
    );

    if (!faturas || faturas.length === 0) {
        return {
            sucesso: true,
            empresa,
            tem_pendencia: false,
            motivo: "sem_fatura_pendente",
            mensagem_formatada: `Olá *${empresa.nome}*! 👋\n\nVerificamos em nosso sistema que você *não possui faturas pendentes* no momento. Seu cadastro está 100% em dia e adimplente! 🎉`
        };
    }

    const fatura = faturas[0];

    // 3. Garantir que o PIX esteja gerado no Mercado Pago
    const pixInfo = await garantirPixFatura(fatura);

    const vencimentoFmt = new Date(fatura.data_vencimento).toLocaleDateString('pt-BR');
    const valorFmt = parseFloat(fatura.valor).toFixed(2).replace('.', ',');
    const isVencido = fatura.status === 'vencido' || new Date(fatura.data_vencimento) < new Date();
    const statusBadge = isVencido ? '🚨 *VENCIDA*' : '⏳ *Pendente*';

    let msg = `Olá *${empresa.nome}*! 👋\n\n`;
    msg += `Aqui está a sua *2ª via da Fatura SaaS*:\n\n`;
    msg += `📋 *Descrição:* ${fatura.descricao}\n`;
    msg += `💵 *Valor:* R$ ${valorFmt}\n`;
    msg += `📅 *Vencimento:* ${vencimentoFmt} (${statusBadge})\n\n`;

    if (pixInfo.pix_copia_cola) {
        msg += `⚡ *Chave PIX Copia e Cola:*\n${pixInfo.pix_copia_cola}\n\n`;
        msg += `📲 *Como pagar:*\n`;
        msg += `1. Copie a chave PIX acima.\n`;
        msg += `2. Abra o aplicativo do seu banco e acesse a opção *PIX Copia e Cola*.\n`;
        msg += `3. Cole o código e confirme o pagamento.\n\n`;
        msg += `O seu acesso será liberado/reativado automaticamente assim que o pagamento for confirmado!`;
    } else {
        msg += `Por favor, acesse seu painel para efetuar o pagamento ou entre em contato com nosso suporte financeiro.`;
    }

    return {
        sucesso: true,
        empresa,
        fatura,
        tem_pendencia: true,
        pix_copia_cola: pixInfo.pix_copia_cola,
        pix_qr_code: pixInfo.pix_qr_code,
        mensagem_formatada: msg
    };
}

/**
 * Intercepta webhook do WhatsApp (Evolution API) e responde automaticamente intenções de 2ª via PIX.
 */
async function processarAutoRespostaIaWhatsapp({ telefone, mensagemTexto, pushName, empresaId = 1 }) {
    if (!telefone || !mensagemTexto) return false;

    const textoLower = mensagemTexto.toLowerCase().trim();

    // Intenção de 2ª via PIX / Fatura / Cobrança
    const regexIntentPix = /(pix|fatura|cobran[cç]a|2\s*a\s*via|segunda\s*via|boleto|pagar|mensalidade|débito|debito)/i;

    if (regexIntentPix.test(textoLower)) {
        console.log(`[Bot WhatsApp SaaS 🤖] Intenção de PIX detectada para ${telefone}: "${mensagemTexto}"`);

        const resultado = await consultarEEmitirPixSaasPorTelefone(telefone);

        if (resultado.mensagem_formatada) {
            try {
                const telefoneFormatado = telefone.startsWith("55") ? telefone : `55${telefone}`;
                await enviarMensagemDireta(telefoneFormatado, resultado.mensagem_formatada, empresaId);

                // Registrar no histórico de mensagens do CRM Chat
                await db.execute(
                    `INSERT INTO crm_chat_messages (empresa_id, telefone, cliente_nome, direcao, mensagem, status)
           VALUES (?, ?, 'Agente IA (SaaS)', 'enviada', ?, 'enviado')`,
                    [empresaId, telefoneFormatado, resultado.mensagem_formatada]
                );

                console.log(`[Bot WhatsApp SaaS 🤖] Resposta automática enviada com sucesso para ${telefoneFormatado}!`);
                return true;
            } catch (err) {
                console.error(`[Bot WhatsApp SaaS 🤖] Erro ao enviar auto-resposta:`, err.message);
            }
        }
    }

    return false;
}

module.exports = {
    extrairDigitosTelefone,
    consultarEEmitirPixSaasPorTelefone,
    processarAutoRespostaIaWhatsapp
};
