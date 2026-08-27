const db = require("../../db");
const { enviarMensagemDireta } = require("../controllers/whatsappController");

function normalizarTelefone(telefone) {
    if (!telefone) return null;
    const digits = String(telefone).replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    if (digits.length === 12 || digits.length === 13) return digits;
    return null;
}

function processarTags(msg, vars = {}) {
    if (!msg) return "";
    return msg
        .replace(/{nome}/g, vars.nome || "Cliente")
        .replace(/{telefone}/g, vars.telefone || "")
        .replace(/{email}/g, vars.email || "")
        .replace(/{cpf}/g, vars.cpf || "")
        .replace(/{plano}/g, vars.plano || "")
        .replace(/{link_pix}/g, vars.link_pix || "")
        .replace(/{origem}/g, vars.origem || "Hotspot");
}

async function registrarLogEHistorico(empresaId, tipo, telefone, clienteNome, mensagem, status = "enviado", refId = null) {
    try {
        await db.execute(
            `INSERT INTO crm_automacoes_log (empresa_id, automacao_tipo, telefone, referencia_id)
       VALUES (?, ?, ?, ?)`,
            [empresaId, tipo, telefone, refId ? String(refId) : null]
        );

        await db.execute(
            `INSERT INTO crm_historico_envios (empresa_id, cliente_nome, telefone, mensagem, tipo_envio, status)
       VALUES (?, ?, ?, ?, 'api', ?)`,
            [empresaId, clienteNome || null, telefone, mensagem, status]
        );
    } catch (err) {
        console.warn(`[crmAutomationsJob] Erro ao registrar log/historico (${tipo}):`, err.message);
    }
}

async function processarBoasVindas(auto) {
    try {
        // Busca contatos criados nos ultimos 10 minutos na tabela leads
        const [logins] = await db.query(
            `SELECT DISTINCT nome, telefone, email, cpf, 
               CASE WHEN origem = 'lgpd' THEN 'LGPD' ELSE COALESCE(origem, 'Lead') END as origem
             FROM leads
             WHERE empresa_id = ? AND telefone IS NOT NULL AND telefone != ''
               AND criado_em >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
            [auto.empresa_id]
        );

        for (const item of logins) {
            const telFormatado = normalizarTelefone(item.telefone);
            if (!telFormatado) continue;

            // Verificar se ja recebeu boas-vindas
            const [[jaEnviado]] = await db.query(
                `SELECT id FROM crm_automacoes_log
         WHERE empresa_id = ? AND automacao_tipo = 'boas_vindas' AND telefone = ?
         LIMIT 1`,
                [auto.empresa_id, telFormatado]
            );

            if (jaEnviado) continue;

            const mensagemFinal = processarTags(auto.mensagem, {
                nome: item.nome,
                telefone: item.telefone,
                email: item.email,
                cpf: item.cpf,
                origem: item.origem,
            });

            try {
                await enviarMensagemDireta(telFormatado, mensagemFinal, auto.empresa_id);
                await registrarLogEHistorico(auto.empresa_id, "boas_vindas", telFormatado, item.nome, mensagemFinal, "enviado");
                console.log(`[crmAutomationsJob] Boas-vindas enviada para ${telFormatado}`);
            } catch (sendErr) {
                console.warn(`[crmAutomationsJob] Falha ao enviar boas-vindas para ${telFormatado}:`, sendErr.message);
                await registrarLogEHistorico(auto.empresa_id, "boas_vindas", telFormatado, item.nome, mensagemFinal, "erro");
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro em processarBoasVindas:", err);
    }
}

async function processarAvisoExpiracao(auto) {
    try {
        const tempoMinutos = auto.tempo_minutos || 5;

        // Busca sessoes ativas no radacct cujo tempo limite (Max-All-Session) falta entre 1 e X minutos
        const [sessoes] = await db.query(
            `SELECT ra.username, MAX(ra.nasipaddress) as nasipaddress,
              MAX(rc.value) AS max_tempo,
              COALESCE(SUM(
                IF(ra.acctstoptime IS NULL,
                   UNIX_TIMESTAMP() - UNIX_TIMESTAMP(ra.acctstarttime),
                   ra.acctsessiontime)
              ), 0) AS tempo_usado,
              MAX(l.nome) as nome, MAX(l.telefone) as telefone
       FROM radacct ra
       JOIN radcheck rc ON rc.username COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci AND rc.attribute = 'Max-All-Session'
       LEFT JOIN leads l ON l.cpf COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci OR l.telefone COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci
       WHERE ra.acctstoptime IS NULL
       GROUP BY ra.username
       HAVING (CAST(max_tempo AS SIGNED) - tempo_usado) BETWEEN 60 AND (? * 60)`,
            [tempoMinutos]
        );

        for (const sessao of sessoes) {
            const tel = sessao.telefone || sessao.username;
            const telFormatado = normalizarTelefone(tel);
            if (!telFormatado) continue;

            // Evitar notificar mais de uma vez a cada 6 horas para a mesma sessao/username
            const [[jaEnviado]] = await db.query(
                `SELECT id FROM crm_automacoes_log
          WHERE empresa_id = ? AND automacao_tipo = 'expiracao_aviso' AND telefone = ?
            AND enviado_em >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
          LIMIT 1`,
                [auto.empresa_id, telFormatado]
            );

            if (jaEnviado) continue;

            const mensagemFinal = processarTags(auto.mensagem, {
                nome: sessao.nome || "Cliente",
                telefone: tel,
            });

            try {
                await enviarMensagemDireta(telFormatado, mensagemFinal, auto.empresa_id);
                await registrarLogEHistorico(auto.empresa_id, "expiracao_aviso", telFormatado, sessao.nome, mensagemFinal, "enviado", sessao.username);
                console.log(`[crmAutomationsJob] Aviso expiração enviado para ${telFormatado}`);
            } catch (sendErr) {
                console.warn(`[crmAutomationsJob] Falha no aviso de expiração para ${telFormatado}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro em processarAvisoExpiracao:", err);
    }
}

async function processarPixAbandonado(auto) {
    try {
        const tempoMinutos = auto.tempo_minutos || 5;

        // Busca pagamentos pendentes criados entre X minutos e 1 hora atras
        const [pags] = await db.query(
            `SELECT p.id, p.telefone, p.cpf, p.nome_plano, p.criado_em, l.nome
       FROM pagamentos p
       LEFT JOIN leads l ON (l.cpf COLLATE utf8mb4_unicode_ci = p.cpf COLLATE utf8mb4_unicode_ci OR l.telefone COLLATE utf8mb4_unicode_ci = p.telefone COLLATE utf8mb4_unicode_ci) AND l.empresa_id = p.empresa_id
       WHERE p.empresa_id = ? AND p.status = 'pending' AND p.telefone IS NOT NULL
         AND p.criado_em BETWEEN DATE_SUB(NOW(), INTERVAL 60 MINUTE) AND DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
            [auto.empresa_id, tempoMinutos]
        );

        for (const pag of pags) {
            const telFormatado = normalizarTelefone(pag.telefone);
            if (!telFormatado) continue;

            // Verificar se ja enviou cobranca deste pagamento_id
            const [[jaEnviado]] = await db.query(
                `SELECT id FROM crm_automacoes_log
          WHERE empresa_id = ? AND automacao_tipo = 'pix_abandonado' AND referencia_id = ?
          LIMIT 1`,
                [auto.empresa_id, String(pag.id)]
            );

            if (jaEnviado) continue;

            const mensagemFinal = processarTags(auto.mensagem, {
                nome: pag.nome || "Cliente",
                telefone: pag.telefone,
                plano: pag.nome_plano || "Acesso Wi-Fi",
            });

            try {
                await enviarMensagemDireta(telFormatado, mensagemFinal, auto.empresa_id);
                await registrarLogEHistorico(auto.empresa_id, "pix_abandonado", telFormatado, pag.nome, mensagemFinal, "enviado", String(pag.id));
                console.log(`[crmAutomationsJob] PIX abandonado enviado para ${telFormatado}`);
            } catch (sendErr) {
                console.warn(`[crmAutomationsJob] Falha no envio de PIX abandonado para ${telFormatado}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro em processarPixAbandonado:", err);
    }
}

async function processarRetencaoAusentes(auto) {
    try {
        const diasAusente = auto.dias_ausente || 15;

        // Usa radacct como fonte de verdade da ultima conexao real.
        // Faz LEFT JOIN para que clientes sem registro RADIUS (so leads) tambem sejam incluidos,
        // usando leads.criado_em como fallback via COALESCE.
        const [ausentes] = await db.query(
            `SELECT
               MAX(l.nome) as nome,
               l.telefone,
               COALESCE(MAX(ra.acctstarttime), MAX(l.criado_em)) as ult_conexao
             FROM leads l
             LEFT JOIN radius_users ru ON ru.empresa_id = ?
               AND (
                 (l.cpf IS NOT NULL AND l.cpf != '' AND ru.username COLLATE utf8mb4_unicode_ci = l.cpf COLLATE utf8mb4_unicode_ci)
                 OR RIGHT(REGEXP_REPLACE(ru.username, '[^0-9]', ''), 8) COLLATE utf8mb4_unicode_ci
                    = RIGHT(REGEXP_REPLACE(l.telefone, '[^0-9]', ''), 8) COLLATE utf8mb4_unicode_ci
               )
             LEFT JOIN radacct ra ON ra.username COLLATE utf8mb4_unicode_ci = ru.username COLLATE utf8mb4_unicode_ci
             WHERE l.empresa_id = ? AND l.telefone IS NOT NULL AND l.telefone != ''
             GROUP BY l.telefone
             HAVING ult_conexao <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [auto.empresa_id, auto.empresa_id, diasAusente]
        );

        for (const item of ausentes) {
            const telFormatado = normalizarTelefone(item.telefone);
            if (!telFormatado) continue;

            // Evita reenviar retencao para o mesmo numero nos ultimos 30 dias
            const [[jaEnviado]] = await db.query(
                `SELECT id FROM crm_automacoes_log
                 WHERE empresa_id = ? AND automacao_tipo = 'retencao_ausente' AND telefone = ?
                   AND enviado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 LIMIT 1`,
                [auto.empresa_id, telFormatado]
            );

            if (jaEnviado) continue;

            const mensagemFinal = processarTags(auto.mensagem, {
                nome: item.nome || "Cliente",
                telefone: item.telefone,
            });

            try {
                await enviarMensagemDireta(telFormatado, mensagemFinal, auto.empresa_id);
                await registrarLogEHistorico(auto.empresa_id, "retencao_ausente", telFormatado, item.nome, mensagemFinal, "enviado");
                console.log(`[crmAutomationsJob] Retenção enviada para ${telFormatado} (ausente há ${diasAusente}+ dias)`);
            } catch (sendErr) {
                console.warn(`[crmAutomationsJob] Falha na retenção para ${telFormatado}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro em processarRetencaoAusentes:", err);
    }
}

// ── RETORNO DE CLIENTE (novo) ──
// Detecta clientes que se conectaram nos ultimos 10 minutos, mas cuja sessao
// anterior a hoje foi ha mais de N dias — ou seja: voltaram depois de sumidos.
async function processarRetornoCliente(auto) {
    try {
        const diasAusente = auto.dias_ausente || 3;

        const [retornos] = await db.query(
            `SELECT
               ra.username,
               MAX(l.nome)     as nome,
               MAX(l.telefone) as telefone
             FROM radacct ra
             JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci AND ru.empresa_id = ?
             LEFT JOIN leads l ON l.empresa_id = ?
               AND (
                 (l.cpf IS NOT NULL AND l.cpf != '' AND l.cpf COLLATE utf8mb4_unicode_ci = ru.username COLLATE utf8mb4_unicode_ci)
                 OR RIGHT(REGEXP_REPLACE(l.telefone, '[^0-9]', ''), 8) COLLATE utf8mb4_unicode_ci
                    = RIGHT(REGEXP_REPLACE(ru.username, '[^0-9]', ''), 8) COLLATE utf8mb4_unicode_ci
               )
             WHERE ra.acctstarttime >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
               AND l.telefone IS NOT NULL AND l.telefone != ''
             GROUP BY ra.username
             HAVING (
               SELECT MAX(ra2.acctstarttime)
               FROM   radacct ra2
               WHERE  ra2.username COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci
                 AND  DATE(ra2.acctstarttime) < CURDATE()
             ) <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [auto.empresa_id, auto.empresa_id, diasAusente]
        );

        for (const item of retornos) {
            const telFormatado = normalizarTelefone(item.telefone);
            if (!telFormatado) continue;

            // Evita enviar mais de uma vez no mesmo dia para o mesmo numero
            const [[jaEnviado]] = await db.query(
                `SELECT id FROM crm_automacoes_log
                 WHERE empresa_id = ? AND automacao_tipo = 'retorno_cliente' AND telefone = ?
                   AND enviado_em >= CURDATE()
                 LIMIT 1`,
                [auto.empresa_id, telFormatado]
            );

            if (jaEnviado) continue;

            const mensagemFinal = processarTags(auto.mensagem, {
                nome: item.nome || "Cliente",
                telefone: item.telefone,
            });

            try {
                await enviarMensagemDireta(telFormatado, mensagemFinal, auto.empresa_id);
                await registrarLogEHistorico(auto.empresa_id, "retorno_cliente", telFormatado, item.nome, mensagemFinal, "enviado");
                console.log(`[crmAutomationsJob] Boas-vindas de retorno enviada para ${telFormatado}`);
            } catch (sendErr) {
                console.warn(`[crmAutomationsJob] Falha no retorno cliente para ${telFormatado}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro em processarRetornoCliente:", err);
    }
}

async function processarAniversariantes(auto) {
    try {
        const [aniversariantes] = await db.query(
            `SELECT l.nome, l.telefone, e.nome AS empresa_nome
             FROM leads l
             JOIN empresas e ON e.id = l.empresa_id
             WHERE l.empresa_id = ? AND l.telefone IS NOT NULL AND l.telefone != ''
               AND DATE_FORMAT(l.criado_em, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')`,
            [auto.empresa_id]
        );

        for (const item of aniversariantes) {
            const telFormatado = normalizarTelefone(item.telefone);
            if (!telFormatado) continue;

            const [[jaEnviado]] = await db.query(
                `SELECT id FROM crm_automacoes_log
                 WHERE empresa_id = ? AND automacao_tipo = 'aniversariantes' AND telefone = ?
                   AND enviado_em >= DATE_SUB(NOW(), INTERVAL 300 DAY)
                 LIMIT 1`,
                [auto.empresa_id, telFormatado]
            );

            if (jaEnviado) continue;

            const mensagemFinal = processarTags(auto.mensagem, {
                nome: item.nome || "Cliente",
                telefone: item.telefone,
                empresa: item.empresa_nome || "Hotspot",
            });

            try {
                await enviarMensagemDireta(telFormatado, mensagemFinal, auto.empresa_id);
                await registrarLogEHistorico(auto.empresa_id, "aniversariantes", telFormatado, item.nome, mensagemFinal, "enviado");
                console.log(`[crmAutomationsJob] Aniversariante notificado: ${telFormatado}`);
            } catch (sendErr) {
                console.warn(`[crmAutomationsJob] Falha ao notificar aniversariante ${telFormatado}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro em processarAniversariantes:", err);
    }
}

async function processarPesquisaNps(auto) {
    try {
        const [sessoesFinalizadas] = await db.query(
            `SELECT ra.username, ra.callingstationid, ra.acctstoptime, l.nome, l.telefone, e.nome AS empresa_nome
             FROM radacct ra
             JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci
             JOIN empresas e ON e.id = ru.empresa_id
             LEFT JOIN leads l ON (l.cpf COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci OR l.telefone COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci) AND l.empresa_id = ru.empresa_id
             WHERE ru.empresa_id = ? AND ra.acctstoptime BETWEEN DATE_SUB(NOW(), INTERVAL 60 MINUTE) AND DATE_SUB(NOW(), INTERVAL 30 MINUTE)
             LIMIT 50`,
            [auto.empresa_id]
        );

        for (const sessao of sessoesFinalizadas) {
            const tel = sessao.telefone || (sessao.username.length >= 10 ? sessao.username : null);
            const telFormatado = normalizarTelefone(tel);
            if (!telFormatado) continue;

            const [[jaEnviado]] = await db.query(
                `SELECT id FROM crm_automacoes_log
                 WHERE empresa_id = ? AND automacao_tipo = 'pesquisa_nps' AND telefone = ?
                   AND enviado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                 LIMIT 1`,
                [auto.empresa_id, telFormatado]
            );

            if (jaEnviado) continue;

            const mensagemFinal = processarTags(auto.mensagem, {
                nome: sessao.nome || "Visitante",
                telefone: tel,
                empresa: sessao.empresa_nome || "Hotspot",
            });

            try {
                await enviarMensagemDireta(telFormatado, mensagemFinal, auto.empresa_id);
                await registrarLogEHistorico(auto.empresa_id, "pesquisa_nps", telFormatado, sessao.nome, mensagemFinal, "enviado");
                console.log(`[crmAutomationsJob] Pesquisa NPS enviada para ${telFormatado}`);
            } catch (sendErr) {
                console.warn(`[crmAutomationsJob] Falha na Pesquisa NPS para ${telFormatado}:`, sendErr.message);
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro em processarPesquisaNps:", err);
    }
}

async function runCrmAutomationsJob() {
    try {
        // Busca todas as automacoes ativas de empresas que POSSUEM o recurso liberado no plano SaaS
        const [automacoes] = await db.query(
            `SELECT a.* 
             FROM crm_automacoes a
             JOIN empresas e ON e.id = a.empresa_id
             LEFT JOIN saas_planos p ON p.id = e.saas_plano_id
             WHERE a.ativo = 1 AND p.permite_automacao_whatsapp = 1`
        );
        if (automacoes.length === 0) return;

        for (const auto of automacoes) {
            if (auto.tipo === "boas_vindas") {
                await processarBoasVindas(auto);
            } else if (auto.tipo === "expiracao_aviso") {
                await processarAvisoExpiracao(auto);
            } else if (auto.tipo === "pix_abandonado") {
                await processarPixAbandonado(auto);
            } else if (auto.tipo === "retencao_ausente") {
                await processarRetencaoAusentes(auto);
            } else if (auto.tipo === "retorno_cliente") {
                await processarRetornoCliente(auto);
            } else if (auto.tipo === "aniversariantes") {
                await processarAniversariantes(auto);
            } else if (auto.tipo === "pesquisa_nps") {
                await processarPesquisaNps(auto);
            }
        }
    } catch (err) {
        console.error("[crmAutomationsJob] Erro geral ao executar automações:", err);
    }
}

module.exports = runCrmAutomationsJob;
