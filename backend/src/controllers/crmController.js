const db = require("../../db");

// ── GET CONTATOS CONSOLIDADOS ──
exports.getContatos = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { q, origem, periodo, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * limitNum;

        let dateWhereLeads = "";
        let dateWherePag = "";

        if (periodo === "hoje") {
            dateWhereLeads = " AND criado_em >= CURDATE()";
            dateWherePag = " AND criado_em >= CURDATE()";
        } else if (periodo === "7dias") {
            dateWhereLeads = " AND criado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            dateWherePag = " AND criado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if (periodo === "30dias") {
            dateWhereLeads = " AND criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            dateWherePag = " AND criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }

        let unionSql = `
      SELECT
        COALESCE(nome, 'Sem Nome') as nome,
        telefone,
        email,
        cpf,
        mac,
        origem,
        criado_em as ult_conexao
      FROM (
        SELECT
          CONVERT(nome USING utf8mb4) COLLATE utf8mb4_unicode_ci as nome,
          CONVERT(telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci as telefone,
          CONVERT(email USING utf8mb4) COLLATE utf8mb4_unicode_ci as email,
          CONVERT(cpf USING utf8mb4) COLLATE utf8mb4_unicode_ci as cpf,
          CONVERT(mac USING utf8mb4) COLLATE utf8mb4_unicode_ci as mac,
          CASE 
            WHEN origem = 'lgpd' THEN 'LGPD'
            WHEN origem LIKE 'portal_%' THEN 'Portal Lead'
            ELSE COALESCE(origem, 'Lead')
          END COLLATE utf8mb4_unicode_ci as origem,
          criado_em
        FROM leads
        WHERE empresa_id = ? ${dateWhereLeads}

        UNION ALL

        SELECT
          NULL as nome,
          CONVERT(telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci as telefone,
          CONVERT(email USING utf8mb4) COLLATE utf8mb4_unicode_ci as email,
          CONVERT(cpf USING utf8mb4) COLLATE utf8mb4_unicode_ci as cpf,
          CONVERT(mac USING utf8mb4) COLLATE utf8mb4_unicode_ci as mac,
          'Pagamento' COLLATE utf8mb4_unicode_ci as origem,
          criado_em
        FROM pagamentos
        WHERE empresa_id = ? AND status = 'approved' ${dateWherePag}
      ) AS unificados
      WHERE telefone IS NOT NULL AND telefone != ''
    `;

        const params = [empresaId, empresaId];

        if (q && q.trim()) {
            const search = `%${q.trim()}%`;
            unionSql += ` AND (nome LIKE ? OR telefone LIKE ? OR email LIKE ? OR cpf LIKE ? OR mac LIKE ?)`;
            params.push(search, search, search, search, search);
        }

        if (origem && origem !== "todos") {
            if (origem === "lgpd") {
                unionSql += ` AND origem = 'LGPD'`;
            } else if (origem === "pagamento") {
                unionSql += ` AND origem = 'Pagamento'`;
            } else if (origem === "lead") {
                unionSql += ` AND origem NOT IN ('LGPD', 'Pagamento')`;
            }
        }

        const groupedSql = `
      SELECT
        MAX(nome) as nome,
        telefone,
        MAX(email) as email,
        MAX(cpf) as cpf,
        MAX(mac) as mac,
        GROUP_CONCAT(DISTINCT origem SEPARATOR ', ') as origens,
        MAX(ult_conexao) as ult_conexao,
        COUNT(*) as total_conexoes
      FROM (${unionSql}) AS sub
      GROUP BY telefone
      ORDER BY ult_conexao DESC
    `;

        const countSql = `SELECT COUNT(*) as total FROM (${groupedSql}) as count_sub`;
        const [[countResult]] = await db.query(countSql, params);
        const totalRecords = countResult ? countResult.total : 0;

        const finalSql = `${groupedSql} LIMIT ? OFFSET ?`;
        const finalParams = [...params, limitNum, offset];

        const [rows] = await db.query(finalSql, finalParams);

        res.json({
            data: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalRecords,
                totalPages: Math.ceil(totalRecords / limitNum) || 1
            }
        });
    } catch (err) {
        console.error("Erro ao buscar contatos CRM:", err);
        res.status(500).json({ message: "Erro ao buscar contatos" });
    }
};

// ── GET TEMPLATES DE MENSAGEM ──
exports.getTemplates = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM crm_templates WHERE empresa_id = ? ORDER BY criado_em DESC",
            [req.empresa_id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar templates CRM:", err);
        res.status(500).json({ message: "Erro ao buscar templates de mensagem" });
    }
};

// ── CRIAR TEMPLATE DE MENSAGEM ──
exports.createTemplate = async (req, res) => {
    try {
        const { titulo, mensagem } = req.body;
        if (!titulo || !mensagem) {
            return res.status(400).json({ message: "Título e Mensagem são obrigatórios" });
        }

        const [result] = await db.execute(
            "INSERT INTO crm_templates (empresa_id, titulo, mensagem) VALUES (?, ?, ?)",
            [req.empresa_id, titulo.trim(), mensagem.trim()]
        );

        res.status(201).json({ id: result.insertId, message: "Template criado com sucesso" });
    } catch (err) {
        console.error("Erro ao criar template CRM:", err);
        res.status(500).json({ message: "Erro ao criar template" });
    }
};

// ── ATUALIZAR TEMPLATE ──
exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, mensagem, ativo } = req.body;

        const fields = [];
        const params = [];

        if (titulo !== undefined) { fields.push("titulo = ?"); params.push(titulo.trim()); }
        if (mensagem !== undefined) { fields.push("mensagem = ?"); params.push(mensagem.trim()); }
        if (ativo !== undefined) { fields.push("ativo = ?"); params.push(ativo ? 1 : 0); }

        if (fields.length === 0) {
            return res.status(400).json({ message: "Nenhum campo informado para atualização" });
        }

        params.push(id, req.empresa_id);

        const [result] = await db.execute(
            `UPDATE crm_templates SET ${fields.join(", ")} WHERE id = ? AND empresa_id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Template não encontrado" });
        }

        res.json({ message: "Template atualizado com sucesso" });
    } catch (err) {
        console.error("Erro ao atualizar template CRM:", err);
        res.status(500).json({ message: "Erro ao atualizar template" });
    }
};

// ── DELETAR TEMPLATE ──
exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.execute(
            "DELETE FROM crm_templates WHERE id = ? AND empresa_id = ?",
            [id, req.empresa_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Template não encontrado" });
        }

        res.json({ message: "Template excluído com sucesso" });
    } catch (err) {
        console.error("Erro ao excluir template CRM:", err);
        res.status(500).json({ message: "Erro ao excluir template" });
    }
};

// ── REGISTRAR DISPARO DE MENSAGEM NO HISTÓRICO ──
exports.registrarEnvio = async (req, res) => {
    try {
        const { cliente_nome, telefone, mensagem, tipo_envio = "manual", status = "enviado" } = req.body;

        if (!telefone || !mensagem) {
            return res.status(400).json({ message: "Telefone e mensagem são obrigatórios" });
        }

        const [result] = await db.execute(
            `INSERT INTO crm_historico_envios (empresa_id, cliente_nome, telefone, mensagem, tipo_envio, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [req.empresa_id, cliente_nome || null, telefone.trim(), mensagem.trim(), tipo_envio, status]
        );

        res.status(201).json({ id: result.insertId, message: "Envio registrado com sucesso" });
    } catch (err) {
        console.error("Erro ao registrar envio CRM:", err);
        res.status(500).json({ message: "Erro ao registrar envio no histórico" });
    }
};

// ── GET HISTÓRICO DE ENVIOS ──
exports.getHistorico = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM crm_historico_envios WHERE empresa_id = ? ORDER BY enviado_em DESC LIMIT 100",
            [req.empresa_id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar histórico CRM:", err);
        res.status(500).json({ message: "Erro ao buscar histórico de envios" });
    }
};

// ── DEFAULTS DE AUTOMAÇÃO ──
const DEFAULT_AUTOMACOES = [
    {
        tipo: "boas_vindas",
        titulo: "Boas-vindas ao 1º Login",
        mensagem: "Olá {nome}! Seja bem-vindo ao nosso Wi-Fi. Fique à vontade para navegar!",
        tempo_minutos: 0,
        dias_ausente: 0,
        ativo: 0
    },
    {
        tipo: "expiracao_aviso",
        titulo: "Aviso de Expiração de Acesso",
        mensagem: "Olá {nome}! Seu tempo de acesso Wi-Fi vai vencer em 5 minutos. Clique aqui para renovar por PIX: {link_pix}",
        tempo_minutos: 5,
        dias_ausente: 0,
        ativo: 0
    },
    {
        tipo: "pix_abandonado",
        titulo: "Recuperação de PIX Abandonado",
        mensagem: "Olá {nome}! Vimos que você iniciou a compra do plano {plano}. Seu PIX ainda está válido! Conclua o pagamento aqui: {link_pix}",
        tempo_minutos: 5,
        dias_ausente: 0,
        ativo: 0
    },
    {
        tipo: "retencao_ausente",
        titulo: "Reengajamento de Clientes Sumidos",
        mensagem: "Olá {nome}! Sentimos sua falta em nosso Wi-Fi. Venha nos visitar novamente!",
        tempo_minutos: 0,
        dias_ausente: 15,
        ativo: 0
    },
    {
        tipo: "retorno_cliente",
        titulo: "Boas-vindas de Retorno",
        mensagem: "Que bom ter você de volta, {nome}! 😊 Sentimos sua falta. Seja bem-vindo(a) novamente ao nosso Wi-Fi!",
        tempo_minutos: 0,
        dias_ausente: 3,
        ativo: 0
    },
    {
        tipo: "aniversariantes",
        titulo: "Parabéns aos Aniversariantes do Dia",
        mensagem: "🎉 Parabéns {nome}! A equipe do {empresa} deseja a você um feliz aniversário! Venha nos visitar hoje para aproveitar um benefício exclusivo!",
        tempo_minutos: 0,
        dias_ausente: 0,
        ativo: 0
    },
    {
        tipo: "pesquisa_nps",
        titulo: "Pesquisa de Satisfação NPS Pós-Desconexão",
        mensagem: "Olá {nome}! De 0 a 10, como você avalia sua experiência com o Wi-Fi do {empresa} hoje?",
        tempo_minutos: 30,
        dias_ausente: 0,
        ativo: 0
    }
];

// ── GET CONFIGURAÇÃO DE AUTOMAÇÕES ──
exports.getAutomacoes = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM crm_automacoes WHERE empresa_id = ?",
            [req.empresa_id]
        );

        const result = DEFAULT_AUTOMACOES.map((def) => {
            const found = rows.find((r) => r.tipo === def.tipo);
            if (found) {
                return {
                    ...found,
                    ativo: !!found.ativo
                };
            }
            return def;
        });

        res.json(result);
    } catch (err) {
        console.error("Erro ao buscar automações CRM:", err);
        res.status(500).json({ message: "Erro ao buscar automações de marketing" });
    }
};

// ── SALVAR/ATUALIZAR AUTOMAÇÃO ──
exports.saveAutomacao = async (req, res) => {
    try {
        const { tipo, titulo, mensagem, tempo_minutos = 5, dias_ausente = 15, ativo = false } = req.body;

        if (!tipo || !titulo || !mensagem) {
            return res.status(400).json({ message: "Tipo, título e mensagem são obrigatórios" });
        }

        await db.execute(
            `INSERT INTO crm_automacoes (empresa_id, tipo, titulo, mensagem, tempo_minutos, dias_ausente, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         titulo = VALUES(titulo),
         mensagem = VALUES(mensagem),
         tempo_minutos = VALUES(tempo_minutos),
         dias_ausente = VALUES(dias_ausente),
         ativo = VALUES(ativo)`,
            [
                req.empresa_id,
                tipo,
                titulo.trim(),
                mensagem.trim(),
                parseInt(tempo_minutos, 10) || 5,
                parseInt(dias_ausente, 10) || 15,
                ativo ? 1 : 0
            ]
        );

        res.json({ message: "Automação salva com sucesso" });
    } catch (err) {
        console.error("Erro ao salvar automação CRM:", err);
        res.status(500).json({ message: "Erro ao salvar automação" });
    }
};

// ── GET CONVERSAS (CHAT LIVE NÍVEL 3) ──
exports.getConversas = async (req, res) => {
    try {
        const empresaId = req.empresa_id;

        const [rows] = await db.query(
            `SELECT
         MAX(c.telefone_limpo) as telefone,
         MAX(c.cliente_nome) as cliente_nome,
         (
           SELECT m.mensagem FROM (
             SELECT REGEXP_REPLACE(telefone, '[^0-9]', '') COLLATE utf8mb4_unicode_ci as tel, CONVERT(mensagem USING utf8mb4) COLLATE utf8mb4_unicode_ci as mensagem, criado_em FROM crm_chat_messages WHERE empresa_id = ?
             UNION ALL
             SELECT REGEXP_REPLACE(telefone, '[^0-9]', '') COLLATE utf8mb4_unicode_ci as tel, CONVERT(mensagem USING utf8mb4) COLLATE utf8mb4_unicode_ci as mensagem, criado_em FROM whatsapp_logs WHERE empresa_id = ? AND mensagem IS NOT NULL AND status IN ('ok', 'erro')
           ) m WHERE RIGHT(m.tel, 8) = RIGHT(MAX(c.telefone_limpo), 8) ORDER BY m.criado_em DESC LIMIT 1
         ) as ult_mensagem,
         (
           SELECT m.direcao FROM (
             SELECT REGEXP_REPLACE(telefone, '[^0-9]', '') COLLATE utf8mb4_unicode_ci as tel, CONVERT(direcao USING utf8mb4) COLLATE utf8mb4_unicode_ci as direcao, criado_em FROM crm_chat_messages WHERE empresa_id = ?
             UNION ALL
             SELECT REGEXP_REPLACE(telefone, '[^0-9]', '') COLLATE utf8mb4_unicode_ci as tel, 'enviada' COLLATE utf8mb4_unicode_ci as direcao, criado_em FROM whatsapp_logs WHERE empresa_id = ? AND mensagem IS NOT NULL AND status IN ('ok', 'erro')
           ) m WHERE RIGHT(m.tel, 8) = RIGHT(MAX(c.telefone_limpo), 8) ORDER BY m.criado_em DESC LIMIT 1
         ) as direcao,
         MAX(c.criado_em) as ult_envio
       FROM (
         SELECT REGEXP_REPLACE(telefone, '[^0-9]', '') COLLATE utf8mb4_unicode_ci as telefone_limpo, CONVERT(cliente_nome USING utf8mb4) COLLATE utf8mb4_unicode_ci as cliente_nome, criado_em FROM crm_chat_messages WHERE empresa_id = ?
         UNION ALL
         SELECT REGEXP_REPLACE(telefone, '[^0-9]', '') COLLATE utf8mb4_unicode_ci as telefone_limpo, CONVERT('Cliente' USING utf8mb4) COLLATE utf8mb4_unicode_ci as cliente_nome, criado_em FROM whatsapp_logs WHERE empresa_id = ? AND telefone IS NOT NULL AND telefone != '' AND mensagem IS NOT NULL
         UNION ALL
         SELECT REGEXP_REPLACE(telefone, '[^0-9]', '') COLLATE utf8mb4_unicode_ci as telefone_limpo, CONVERT(nome USING utf8mb4) COLLATE utf8mb4_unicode_ci as cliente_nome, criado_em FROM leads WHERE empresa_id = ? AND telefone IS NOT NULL AND telefone != ''
       ) c
       WHERE c.telefone_limpo IS NOT NULL AND c.telefone_limpo != '' AND LENGTH(c.telefone_limpo) >= 8
       GROUP BY RIGHT(c.telefone_limpo, 8)
       ORDER BY ult_envio DESC
       LIMIT 100`,
            [
                empresaId, empresaId,
                empresaId, empresaId,
                empresaId, empresaId, empresaId
            ]
        );

        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar conversas CRM Chat:", err);
        res.status(500).json({ message: "Erro ao buscar conversas do chat" });
    }
};

// ── GET MENSAGENS DE UM TELEFONE ──
exports.getMensagensChat = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { telefone } = req.params;

        if (!telefone) {
            return res.status(400).json({ message: "Telefone é obrigatório" });
        }

        const telDigits = String(telefone).replace(/\D/g, "");
        const last8Digits = telDigits.slice(-8);

        // Marca automaticamente todas as mensagens recebidas deste contato como LIDA
        await db.execute(
            `UPDATE crm_chat_messages
             SET status = 'lida'
             WHERE empresa_id = ? AND status != 'lida' AND direcao IN ('recebida', 'entrada')
               AND RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ?`,
            [empresaId, last8Digits]
        ).catch(err => console.warn("[CRM Chat] Aviso ao marcar mensagens como lidas:", err.message));

        const [mensagens] = await db.query(
            `SELECT id, telefone, cliente_nome, direcao, mensagem, status, criado_em
       FROM (
         SELECT id, telefone, CONVERT(cliente_nome USING utf8mb4) COLLATE utf8mb4_unicode_ci as cliente_nome, CONVERT(direcao USING utf8mb4) COLLATE utf8mb4_unicode_ci as direcao, CONVERT(mensagem USING utf8mb4) COLLATE utf8mb4_unicode_ci as mensagem, CONVERT(status USING utf8mb4) COLLATE utf8mb4_unicode_ci as status, criado_em
         FROM crm_chat_messages
         WHERE empresa_id = ? AND RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ?
         UNION ALL
         SELECT id, telefone, 'Sistema' COLLATE utf8mb4_unicode_ci as cliente_nome, 'enviada' COLLATE utf8mb4_unicode_ci as direcao, CONVERT(mensagem USING utf8mb4) COLLATE utf8mb4_unicode_ci as mensagem, CONVERT(status USING utf8mb4) COLLATE utf8mb4_unicode_ci as status, criado_em
         FROM whatsapp_logs
         WHERE empresa_id = ? AND mensagem IS NOT NULL AND status IN ('ok', 'erro') 
           AND RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ?
           AND NOT EXISTS (
             SELECT 1 FROM crm_chat_messages c 
             WHERE c.empresa_id = ? AND RIGHT(REGEXP_REPLACE(c.telefone, '[^0-9]', ''), 8) = ?
               AND c.mensagem = whatsapp_logs.mensagem
           )
       ) m
       ORDER BY m.criado_em ASC`,
            [empresaId, last8Digits, empresaId, last8Digits, empresaId, last8Digits]
        );

        res.json(mensagens);
    } catch (err) {
        console.error("Erro ao buscar mensagens do chat:", err);
        res.status(500).json({ message: "Erro ao carregar mensagens do chat" });
    }
};

// ── ENVIAR MENSAGEM CHAT AO VIVO ──
exports.enviarMensagemChat = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { telefone, mensagem, cliente_nome } = req.body;

        if (!telefone || !mensagem) {
            return res.status(400).json({ message: "Telefone e mensagem são obrigatórios" });
        }

        const { enviarMensagemDireta, formatarNumeroComNonoDigito } = require("./whatsappController");
        const telFormatado = formatarNumeroComNonoDigito(telefone) || String(telefone).replace(/\D/g, "");

        let statusEnvio = "enviado";
        // 1. Tenta enviar via Evolution API
        try {
            const resEvo = await enviarMensagemDireta(telFormatado, mensagem.trim(), empresaId);
            if (!resEvo) {
                statusEnvio = "erro";
            }
        } catch (sendErr) {
            console.warn("Aviso ao disparar mensagem via Evolution API:", sendErr.message);
            statusEnvio = "erro";
        }

        // 2. Grava na tabela crm_chat_messages com status real de envio
        const [result] = await db.execute(
            `INSERT INTO crm_chat_messages (empresa_id, telefone, cliente_nome, direcao, mensagem, status)
       VALUES (?, ?, ?, 'enviada', ?, ?)`,
            [empresaId, telFormatado, cliente_nome || null, mensagem.trim(), statusEnvio]
        );

        res.status(201).json({
            id: result.insertId,
            telefone: telFormatado,
            cliente_nome,
            direcao: "enviada",
            mensagem: mensagem.trim(),
            status: statusEnvio,
            criado_em: new Date(),
        });
    } catch (err) {
        console.error("Erro ao enviar mensagem no chat:", err);
        res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
};

// ── WEBHOOK DE MENSAGEM RECEBIDA (EVOLUTION API) ──
exports.receberWebhookWhatsapp = async (req, res) => {
    try {
        const body = req.body || {};
        console.log("[CRM Webhook] Recebido:", JSON.stringify(body).slice(0, 300));

        const data = body.data || body;
        const key = data.key || body.key || {};

        if (key.fromMe) {
            return res.json({ ok: true, ignored: "fromMe" });
        }

        const remoteJid = key.remoteJid || data.remoteJid || body.remoteJid || "";
        // Ignora mensagens de grupos do WhatsApp (@g.us)
        if (remoteJid.includes("@g.us") || key.participant || (remoteJid.includes("-") && !remoteJid.includes("@s.whatsapp.net"))) {
            return res.json({ ok: true, ignored: "group_message" });
        }

        const rawPhone = remoteJid.split("@")[0] || body.sender || "";
        const telefone = rawPhone.replace(/\D/g, "");

        const messageObj = data.message || body.message || {};
        const msgTexto =
            messageObj.conversation ||
            messageObj.extendedTextMessage?.text ||
            messageObj.imageMessage?.caption ||
            messageObj.videoMessage?.caption ||
            data.body ||
            body.text ||
            "";

        const pushName = data.pushName || body.pushName || "Cliente WhatsApp";

        const instanceName = body.instance || body.instanceName || "";
        let empresaId = null;

        if (instanceName) {
            const [[configRow]] = await db.query(
                `SELECT empresa_id FROM empresa_configs 
                 WHERE config_type = 'whatsapp' 
                   AND (JSON_UNQUOTE(JSON_EXTRACT(config_json, '$.instance_name')) = ? 
                        OR config_json LIKE ?) 
                 LIMIT 1`,
                [instanceName, `%"instance_name"%${instanceName}%`]
            );
            if (configRow) empresaId = configRow.empresa_id;
        }

        if (!empresaId) {
            console.log(`[CRM Webhook ⚠️] Descartado: Instância não reconhecida ou forjada (${instanceName})`);
            return res.status(401).json({ ok: false, error: "Autenticação falhou: Instância não autorizada" });
        }

        if (telefone && msgTexto && msgTexto.trim()) {
            await db.execute(
                `INSERT INTO crm_chat_messages (empresa_id, telefone, cliente_nome, direcao, mensagem, status)
         VALUES (?, ?, ?, 'recebida', ?, 'recebido')`,
                [empresaId, telefone, pushName, msgTexto.trim()]
            );
            console.log(`[CRM Webhook ✅] Salvo! Cliente: ${pushName} (${telefone}): "${msgTexto.trim()}"`);

            // Verifica se é uma resposta de NPS
            const isNumber = /^([0-9]|10)$/.test(msgTexto.trim());
            let handledNps = false;

            if (isNumber) {
                const nota = parseInt(msgTexto.trim(), 10);
                const [[recentNps]] = await db.query(
                    `SELECT id FROM crm_automacoes_log 
                     WHERE empresa_id = ? AND telefone = ? AND automacao_tipo = 'pesquisa_nps' 
                     AND enviado_em >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
                     ORDER BY enviado_em DESC LIMIT 1`,
                    [empresaId, telefone]
                );

                if (recentNps) {
                    const [[alreadyAnswered]] = await db.query(
                        `SELECT id FROM nps_respostas WHERE empresa_id = ? AND telefone = ? AND criado_em >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                        [empresaId, telefone]
                    );

                    if (!alreadyAnswered) {
                        await db.execute(
                            `INSERT INTO nps_respostas (empresa_id, telefone, nota) VALUES (?, ?, ?)`,
                            [empresaId, telefone, nota]
                        );
                        handledNps = true;
                        console.log(`[CRM Webhook] NPS capturado: ${nota} de ${telefone}`);

                        const { enviarMensagemDireta } = require("./whatsappController");
                        enviarMensagemDireta(rawPhone, "Obrigado pela sua avaliação! Seu feedback é muito importante para nós.", empresaId)
                            .catch(() => { });
                    }
                }
            }

            if (!handledNps) {
                // 1. Verificar se é uma solicitação de 2ª via de PIX/Cobrança
                const { processarAutoRespostaIaWhatsapp } = require("../services/saasBotService");
                const tratouPix = await processarAutoRespostaIaWhatsapp({ telefone, mensagemTexto: msgTexto.trim(), pushName, empresaId })
                    .catch(bErr => {
                        console.error("[CRM Webhook Bot Error]:", bErr.message);
                        return false;
                    });

                // 2. Se não foi solicitação de PIX, processa com a IA Assistente (Com Memória de Histórico)
                if (!tratouPix) {
                    const { processarIaComMemoria } = require("./crmIaController");
                    processarIaComMemoria({
                        empresaId,
                        telefone: rawPhone,  // Usa JID original para garantir entrega correta
                        mensagemText: msgTexto.trim(),
                        clienteNome: pushName
                    }).catch(iaErr => {
                        console.error("[CRM Webhook IA Error]:", iaErr.message);
                    });
                }

                // 3. Notificar n8n de forma assíncrona (Analytics / Backup)
                fetch("http://localhost:5678/webhook/webhook-ia-atendimento", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        empresa_id: empresaId,
                        telefone,
                        mensagem: msgTexto.trim(),
                        cliente_nome: pushName
                    })
                }).catch(() => { });
            }
        } else {
            console.log(`[CRM Webhook ⚠️] Ignorado. Telefone: "${telefone}", Texto: "${msgTexto}"`);
        }

        res.json({ ok: true });
    } catch (err) {
        console.error("[CRM Webhook ❌] Erro ao processar webhook:", err.message);
        res.status(200).json({ ok: false, error: err.message });
    }
};

// ── CADASTRAR LEAD DA LANDING PAGE NUVYCORE (PÚBLICO) ──
exports.cadastrarLeadLanding = async (req, res) => {
    try {
        const { nome, empresa, telefone, perfil, clientes, email } = req.body || {};

        if (!nome || !empresa || !telefone) {
            return res.status(400).json({ error: "Nome, empresa e WhatsApp são obrigatórios." });
        }

        const empresaId = 1; // NuvyCore Super Admin
        const telefoneDigitos = String(telefone).replace(/\D/g, "");
        const emailFinal = email && String(email).trim() ? String(email).trim() : null;
        const perfilText = perfil || "Não informado";
        const clientesText = clientes || "Não informado";
        const empresaText = empresa.trim();
        const nomeText = nome.trim();

        const obsLead = `Empresa: ${empresaText} | Perfil: ${perfilText} | Clientes: ${clientesText}`;

        // 1. Gravar Lead no banco de dados
        await db.execute(
            `INSERT INTO leads (empresa_id, nome, telefone, email, origem, observacoes, status, criado_em)
             VALUES (?, ?, ?, ?, 'landing_page', ?, 'novo', NOW())`,
            [empresaId, nomeText, telefoneDigitos, emailFinal, obsLead]
        );

        // 2. Disparar WhatsApp automático de boas-vindas ao Lead
        const whatsappController = require("./whatsappController");

        const msgLead =
            `Olá *${nomeText}*! 👋 Obrigado pelo seu contato com a *NuvyCore Hotspot*.\n\n` +
            `Recebemos o cadastro da empresa *${empresaText}* (${clientesText}).\n\n` +
            `Nossa equipe técnica e comercial já está analisando o seu perfil para apresentar a melhor solução em segurança, compliance LGPD e monetização Wi-Fi.\n\n` +
            `🌐 *Conheça nossa plataforma:* https://hotspot.nuvycore.online\n\n` +
            `Qualquer dúvida, você pode responder diretamente a esta mensagem!`;

        whatsappController.enviarMensagemDireta(telefoneDigitos, msgLead, empresaId).catch(wErr => {
            console.warn("[Landing Lead] Aviso ao enviar WhatsApp para o lead:", wErr.message);
        });

        // 3. Notificar o proprietário/vendas via WhatsApp (5567992553089)
        const msgOwner =
            `🚨 *NOVO LEAD SITE NUVYCORE!*\n\n` +
            `👤 *Nome:* ${nomeText}\n` +
            `🏢 *Empresa:* ${empresaText}\n` +
            `📱 *WhatsApp:* ${telefoneDigitos}\n` +
            `📧 *E-mail:* ${emailFinal || 'Não informado'}\n` +
            `📋 *Perfil:* ${perfilText}\n` +
            `📊 *Pontos/Clientes:* ${clientesText}`;

        whatsappController.enviarMensagemDireta("5567992553089", msgOwner, empresaId).catch(wErr => {
            console.warn("[Landing Lead] Aviso ao notificar dono via WhatsApp:", wErr.message);
        });

        return res.json({
            sucesso: true,
            mensagem: "Cadastro realizado com sucesso! Enviamos os detalhes de confirmação para o seu WhatsApp."
        });
    } catch (err) {
        console.error("[Landing Lead ❌] Erro ao registrar lead da landing page:", err);
        return res.status(500).json({ error: "Erro interno ao processar cadastro." });
    }
};

exports.dispararEmailMassa = async (req, res) => {
    try {
        const { assunto, conteudoHtml, destinatarios } = req.body;
        if (!assunto || !conteudoHtml || !Array.isArray(destinatarios) || destinatarios.length === 0) {
            return res.status(400).json({ error: "Assunto, conteúdo HTML e lista de destinatários são obrigatórios." });
        }

        const [[empresa]] = await db.query('SELECT nome FROM empresas WHERE id = ?', [req.empresa_id]);
        const emailService = require('../services/emailService');

        const resultado = await emailService.enviarEmailMarketingBatch({
            destinatarios,
            assunto,
            conteudoHtml,
            empresaNome: empresa?.nome || 'NuvyCore Hotspot'
        });

        if (resultado.error) {
            return res.status(400).json({ error: `Falha no envio de e-mails: ${resultado.error}` });
        }

        res.json({
            sucesso: true,
            mensagem: `Campanha de e-mail marketing disparada com sucesso para ${resultado.enviados} de ${destinatarios.length} destinatários.`,
            enviados: resultado.enviados,
            total: destinatarios.length
        });
    } catch (err) {
        console.error("[CRM Email Disparo ❌] Erro:", err);
        res.status(500).json({ error: "Erro ao disparar e-mails em massa." });
    }
};


