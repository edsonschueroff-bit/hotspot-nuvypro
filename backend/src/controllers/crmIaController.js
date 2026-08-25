const db = require("../../db");

// ── GET CONFIGURAÇÕES DA IA ASSISTENTE (ADMIN PANEL) ──
exports.getIaConfig = async (req, res) => {
    try {
        const empresaId = req.empresa_id;

        const [[row]] = await db.query(
            `SELECT config_json, ativo FROM empresa_configs WHERE empresa_id = ? AND config_type = 'ia_atendimento' LIMIT 1`,
            [empresaId]
        );

        let config = {
            ativo: false,
            modo_resposta: "sempre", // "sempre", "fora_horario", "delay"
            delay_minutos: 5,
            modelo_ia: "gpt-4o-mini",
            instrucoes_sistema: "Você é o assistente virtual amigável do estabelecimento. Seja cordial, tire dúvidas dos clientes de forma clara e objetiva e ofereça nossas promoções e informações sobre o Wi-Fi.",
            faqs: [
                { pergunta: "Qual a senha do Wi-Fi?", resposta: "O acesso Wi-Fi é gratuito e liberado pelo nosso portal de login." },
                { pergunta: "Quais os horários de funcionamento?", resposta: "Atendemos de Segunda a Sábado das 08h às 18h." }
            ],
            wifi_informacoes: "Conecte-se na nossa rede Wi-Fi e faça login em 1 clique com o Google ou Facebook.",
            transbordo_whatsapp: "",
            mensagem_transbordo: "Entendido! Estou transferindo seu atendimento para nossa equipe. Um instante que um atendente irá falar com você!"
        };

        if (row && row.config_json) {
            try {
                const parsed = typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json;
                config = { ...config, ...parsed, ativo: !!row.ativo };
            } catch (e) {
                console.warn("Erro ao fazer parse de config_json da IA:", e.message);
            }
        }

        res.json(config);
    } catch (err) {
        console.error("Erro ao buscar configurações da IA:", err);
        res.status(500).json({ message: "Erro ao buscar configurações da IA" });
    }
};

// ── SALVAR CONFIGURAÇÕES DA IA ASSISTENTE (ADMIN PANEL) ──
exports.saveIaConfig = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const {
            ativo = false,
            modo_resposta = "sempre",
            delay_minutos = 5,
            modelo_ia = "gpt-4o-mini",
            instrucoes_sistema = "",
            faqs = [],
            wifi_informacoes = "",
            transbordo_whatsapp = "",
            mensagem_transbordo = ""
        } = req.body || {};

        const configData = {
            modo_resposta,
            delay_minutos: parseInt(delay_minutos, 10) || 5,
            modelo_ia,
            instrucoes_sistema: String(instrucoes_sistema).trim(),
            faqs: Array.isArray(faqs) ? faqs : [],
            wifi_informacoes: String(wifi_informacoes).trim(),
            transbordo_whatsapp: String(transbordo_whatsapp).replace(/\D/g, ""),
            mensagem_transbordo: String(mensagem_transbordo).trim()
        };

        const configJsonStr = JSON.stringify(configData);

        await db.execute(
            `INSERT INTO empresa_configs (empresa_id, config_type, config_json, ativo, atualizado_em)
       VALUES (?, 'ia_atendimento', ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         config_json = VALUES(config_json),
         ativo = VALUES(ativo),
         atualizado_em = NOW()`,
            [empresaId, configJsonStr, ativo ? 1 : 0]
        );

        res.json({ message: "Configurações da IA Assistente salvas com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar configurações da IA:", err);
        res.status(500).json({ message: "Erro ao salvar configurações da IA" });
    }
};

// ── HELPER DE COMPILAÇÃO DO SYSTEM PROMPT COM DADOS REAIS DO SISTEMA ──
async function gerarPromptDoSistema(empresaId, config, cuponsAtivos = [], leadInfo = null) {
    const [[empresaRow]] = await db.query(`SELECT nome FROM empresas WHERE id = ? LIMIT 1`, [empresaId]);
    let empresaNome = empresaRow ? empresaRow.nome : "Nuvy Pro";

    // Domínio oficial
    let dominioOficial = process.env.SYSTEM_DOMAIN || "hotspot.nuvycore.online";
    try {
        const [[brandingRow]] = await db.query(
            `SELECT config_json FROM empresa_configs WHERE empresa_id = ? AND config_type = 'branding' LIMIT 1`,
            [empresaId]
        );
        if (brandingRow && brandingRow.config_json) {
            const b = typeof brandingRow.config_json === 'string' ? JSON.parse(brandingRow.config_json) : brandingRow.config_json;
            if (b.dominio_customizado) dominioOficial = b.dominio_customizado;
            if (b.nome_sistema) empresaNome = b.nome_sistema;
        }
    } catch (e) { }

    const protocol = dominioOficial.includes('localhost') || dominioOficial.includes('127.0.0.1') ? 'http' : 'https';
    const siteUrl = `${protocol}://${dominioOficial}`;

    let prompt = `Você é o assistente virtual oficial de atendimento via WhatsApp da empresa "${empresaNome}".\n\n`;
    prompt += `## INSTRUÇÕES DE COMPORTAMENTO:\n${config.instrucoes_sistema || 'Seja prestativo, educado e responda com precisão às dúvidas do cliente.'}\n\n`;

    prompt += `## INFORMAÇÕES INSTITUCIONAIS & LINKS OFICIAIS:\n`;
    prompt += `- Nome da Plataforma/Empresa: ${empresaNome}\n`;
    prompt += `- Site Oficial para Acesso e Informações: ${siteUrl}\n`;
    prompt += `- Link direto de Cadastro / Teste Grátis de 7 Dias: ${siteUrl}/cadastro\n\n`;

    if (config.wifi_informacoes) {
        prompt += `## INFORMAÇÕES DO WI-FI / ACESSO:\n${config.wifi_informacoes}\n\n`;
    }

    // Se for a Empresa 1 (Super Admin / Nuvy Pro), busca planos de assinatura SaaS
    if (empresaId === 1) {
        try {
            const [planosSaas] = await db.query(
                `SELECT nome, valor_mensal, tipo_cobranca, comissao_porcentagem, limite_mikrotiks, limite_portais, recursos
                 FROM saas_planos WHERE ativo = 1 ORDER BY valor_mensal ASC`
            );
            if (planosSaas && planosSaas.length > 0) {
                prompt += `## PLANOS E VALORES OFICIAIS DE ASSINATURA SAAS (DADOS REAIS DO SISTEMA - NUNCA ALTERE ESTES VALORES):\n`;
                prompt += `- Teste Grátis: 7 dias grátis com acesso total liberado sem precisar de cartão de crédito no cadastro!\n`;
                planosSaas.forEach(p => {
                    const valor = parseFloat(p.valor_mensal || 0);
                    let recList = [];
                    if (p.recursos) {
                        try { recList = typeof p.recursos === 'string' ? JSON.parse(p.recursos) : p.recursos; } catch(e) {}
                    }
                    const recStr = Array.isArray(recList) && recList.length > 0 ? ` (${recList.join(', ')})` : '';
                    if (p.tipo_cobranca === 'porcentagem' || valor === 0) {
                        prompt += `• ${p.nome}: R$ 0,00 fixo + ${p.comissao_porcentagem}% de comissão sobre vendas Wi-Fi${recStr}\n`;
                    } else {
                        prompt += `• ${p.nome}: R$ ${valor.toFixed(2).replace('.', ',')}/mês${recStr}\n`;
                    }
                });
                prompt += `\n`;
            }
        } catch (e) {
            console.warn("Erro ao carregar saas_planos para o prompt:", e.message);
        }
    } else {
        // Se for uma empresa/filial comum, busca planos de venda de Wi-Fi para clientes/visitantes
        try {
            const [planosWifi] = await db.query(
                `SELECT nome, valor, duracao_minutos, velocidade_down, velocidade_up, descricao 
                 FROM planos WHERE empresa_id = ? AND ativo = 1 ORDER BY valor ASC`,
                [empresaId]
            );
            if (planosWifi && planosWifi.length > 0) {
                prompt += `## PLANOS DE ACESSO WI-FI DO ESTABELECIMENTO (DADOS REAIS DO SISTEMA):\n`;
                planosWifi.forEach(p => {
                    const v = parseFloat(p.valor || 0);
                    const dur = p.duracao_minutos >= 1440 ? `${Math.round(p.duracao_minutos/1440)} dia(s)` : (p.duracao_minutos >= 60 ? `${Math.round(p.duracao_minutos/60)} hora(s)` : `${p.duracao_minutos} min`);
                    prompt += `• ${p.nome}: R$ ${v.toFixed(2).replace('.', ',')} (Duração: ${dur}) - Download: ${p.velocidade_down || 'Livre'}\n`;
                });
                prompt += `\n`;
            }
        } catch (e) {
            console.warn("Erro ao carregar planos Wi-Fi para o prompt:", e.message);
        }
    }

    if (config.faqs && config.faqs.length > 0) {
        prompt += `## PERGUNTAS FREQUENTES & RESPOSTAS OFICIAIS:\n`;
        config.faqs.forEach(f => {
            if (f.pergunta && f.resposta) {
                prompt += `- P: ${f.pergunta}\n  R: ${f.resposta}\n`;
            }
        });
        prompt += `\n`;
    }

    if (cuponsAtivos.length > 0) {
        prompt += `## PROMOÇÕES & CUPONS ATIVOS QUE VOCÊ PODE OFERECER:\n`;
        cuponsAtivos.forEach(c => {
            prompt += `- ${c.titulo}: Código "${c.codigo}" ${c.descricao ? `(${c.descricao})` : ''}\n`;
        });
        prompt += `\n`;
    }

    if (leadInfo) {
        prompt += `## DADOS DO CLIENTE QUE ESTÁ CONVERSANDO COM VOCÊ:\n`;
        prompt += `- Nome do cliente: ${leadInfo.nome || 'Visitante'}\n`;
        if (leadInfo.email) prompt += `- E-mail: ${leadInfo.email}\n`;
        prompt += `\n`;
    }

    prompt += `## REGRAS RÍGIDAS DE COMPORTAMENTO, MEMÓRIA E ANTI-ALUCINAÇÃO:\n`;
    prompt += `1. Seja cordial, direto e use emojis moderados.\n`;
    prompt += `2. NUNCA invente preços, planos ou links fora do que está explicitamente informado acima. Use SEMPRE os valores exatos em R$ e o site oficial fornecidos.\n`;
    prompt += `3. Se o cliente pedir para falar com um ATENDENTE HUMANO ou demonstrar insatisfação grave, responda exatamente com a mensagem de transbordo e não tente inventar.\n`;
    prompt += `4. REGRA DE OURO DAS SAUDAÇÕES: Se o histórico de conversas já possuir mensagens anteriores, É ESTRITAMENTE PROIBIDO dizer "Olá!", "Como posso ajudar você hoje?" ou saudações repetidas! Responda DIRETO ao ponto da dúvida ou afirmação do cliente mantendo o fluxo natural da conversa.\n`;

    return { systemPrompt: prompt, empresaNome, siteUrl };
}

// ── GET CONTEXTO COMPILADO PARA O N8N (ENDPOINT N8N) ──
exports.getN8nIaContexto = async (req, res) => {
    try {
        const { empresa_id, telefone } = req.query;
        const empresaId = parseInt(empresa_id, 10) || 1;

        // VALIDAÇÃO DE SEGURANÇA: Token Secreto para N8N
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Acesso negado." });
        }
        const reqToken = authHeader.split(' ')[1];

        // Busca o token configurado no banco para esta empresa
        const [[tokenConfig]] = await db.query(
            `SELECT config_json FROM empresa_configs WHERE empresa_id = ? AND config_type = 'n8n_webhook_token' LIMIT 1`,
            [empresaId]
        );
        let secretToken = "";
        if (tokenConfig && tokenConfig.config_json) {
            try {
                const parsed = typeof tokenConfig.config_json === 'string' ? JSON.parse(tokenConfig.config_json) : tokenConfig.config_json;
                secretToken = parsed.token || "";
            } catch (e) { }
        }

        if (!secretToken || reqToken.length !== secretToken.length) {
            return res.status(401).json({ message: "Acesso negado." });
        }

        const crypto = require("crypto");
        if (!crypto.timingSafeEqual(Buffer.from(reqToken), Buffer.from(secretToken))) {
            return res.status(401).json({ message: "Acesso negado." });
        }

        // 2. Busca configuração da IA da empresa
        const [[configRow]] = await db.query(
            `SELECT config_json, ativo FROM empresa_configs WHERE empresa_id = ? AND config_type = 'ia_atendimento' LIMIT 1`,
            [empresaId]
        );

        let config = {
            ativo: false,
            modo_resposta: "sempre",
            delay_minutos: 5,
            modelo_ia: "gpt-4o-mini",
            instrucoes_sistema: "Você é o assistente virtual amigável do estabelecimento.",
            faqs: [],
            wifi_informacoes: "",
            transbordo_whatsapp: "",
            mensagem_transbordo: "Estou transferindo seu atendimento para nossa equipe."
        };

        if (configRow && configRow.config_json) {
            try {
                const parsed = typeof configRow.config_json === 'string' ? JSON.parse(configRow.config_json) : configRow.config_json;
                config = { ...config, ...parsed, ativo: !!configRow.ativo };
            } catch (e) { }
        }

        // 3. Busca Cupons / Promoções Ativas no Hotspot
        let cuponsAtivos = [];
        try {
            const [cupons] = await db.query(
                `SELECT titulo, descricao, codigo, validade
                 FROM cupons
                 WHERE empresa_id = ? AND ativo = 1 AND (validade IS NULL OR validade >= CURDATE())
                 ORDER BY id DESC LIMIT 5`,
                [empresaId]
            );
            cuponsAtivos = cupons;
        } catch (e) { }

        // 4. Busca histórico recente de conversas do CRM Chat para dar memória à IA
        let historicoChat = [];
        let leadInfo = null;

        if (telefone) {
            const telDigits = String(telefone).replace(/\D/g, "");
            if (telDigits.length >= 8) {
                const last8 = telDigits.slice(-8);

                // Buscar Lead se existir
                const [[lead]] = await db.query(
                    `SELECT nome, email, criado_em FROM leads WHERE empresa_id = ? AND RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ? LIMIT 1`,
                    [empresaId, last8]
                );
                if (lead) leadInfo = lead;

                // Buscar últimas 8 mensagens no histórico do chat
                const [msgs] = await db.query(
                    `SELECT direcao, mensagem FROM crm_chat_messages 
                     WHERE empresa_id = ? AND RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ? 
                     ORDER BY id DESC LIMIT 8`,
                    [empresaId, last8]
                );

                if (msgs && msgs.length > 0) {
                    historicoChat = msgs.reverse().map(m => ({
                        role: (m.direcao === 'recebida' || m.direcao === 'entrada') ? 'user' : 'assistant',
                        content: m.mensagem
                    }));
                }
            }
        }

        // 5. Compilação do Prompt do Sistema (System Prompt) dinâmico
        const { systemPrompt, empresaNome, siteUrl } = await gerarPromptDoSistema(empresaId, config, cuponsAtivos, leadInfo);

        // Montar array completo de mensagens para a OpenAI (System + Histórico)
        const openAiMessages = [
            { role: "system", content: systemPrompt },
            ...historicoChat
        ];

        res.json({
            empresa_id: empresaId,
            empresa_nome: empresaNome,
            site_url: siteUrl,
            ia_ativa: config.ativo,
            modo_resposta: config.modo_resposta,
            delay_minutos: config.delay_minutos,
            modelo_ia: config.modelo_ia,
            transbordo_whatsapp: config.transbordo_whatsapp,
            mensagem_transbordo: config.mensagem_transbordo,
            system_prompt: systemPrompt,
            historico_chat: historicoChat,
            openai_messages: openAiMessages
        });

    } catch (err) {
        console.error("Erro ao gerar contexto da IA para n8n:", err);
        res.status(500).json({ message: "Erro ao gerar contexto para o n8n" });
    }
};

// ── PROCESSADOR DIRETO DE IA COM MEMÓRIA & AUTOSAVE CRM (BACKEND FAILSAFE) ──
exports.processarIaComMemoria = async ({ empresaId = 1, telefone, mensagemText, clienteNome = "Cliente" }) => {
    if (!telefone || !mensagemText || !mensagemText.trim()) return null;

    try {
        const { formatarNumeroComNonoDigito } = require("./whatsappController");
        const telDigits = String(telefone).replace(/\D/g, "");
        const telFormatado = formatarNumeroComNonoDigito(telefone) || (telDigits.startsWith("55") ? telDigits : `55${telDigits}`);
        const last8 = telDigits.slice(-8);

        // 1. Verificar se IA está ativa para esta empresa
        const [[configRow]] = await db.query(
            `SELECT config_json, ativo FROM empresa_configs WHERE empresa_id = ? AND config_type = 'ia_atendimento' LIMIT 1`,
            [empresaId]
        );

        if (!configRow || !configRow.ativo || !configRow.config_json) {
            console.log(`[IA Motor 🤖] IA desativada para empresa_id=${empresaId}`);
            return null;
        }

        let config = {};
        try {
            config = typeof configRow.config_json === 'string' ? JSON.parse(configRow.config_json) : configRow.config_json;
        } catch (e) { }

        // 2. Checar pedido de Transbordo Humano
        const textoLower = mensagemText.toLowerCase().trim();
        const ehTransbordo = /(atendente|humano|falar com pessoa|atendimento humano|suporte humano|gerente)/i.test(textoLower);

        if (ehTransbordo) {
            const msgTransbordo = config.mensagem_transbordo || "Entendido! Estou transferindo seu atendimento para nossa equipe humana.";
            console.log(`[IA Motor 🚨] Transbordo humano acionado para ${telFormatado}`);

            const { enviarMensagemDireta } = require("./whatsappController");
            await enviarMensagemDireta(telFormatado, msgTransbordo, empresaId).catch(() => { });

            await db.execute(
                `INSERT INTO crm_chat_messages (empresa_id, telefone, cliente_nome, direcao, mensagem, status)
                 VALUES (?, ?, ?, 'enviada', ?, 'enviado')`,
                [empresaId, telFormatado, 'Assistente IA', msgTransbordo]
            );

            if (config.transbordo_whatsapp) {
                const msgNotificacao = `🚨 *ALERTA DE TRANSBORDO HUMANO!*\n\nO cliente *${clienteNome}* (${telFormatado}) solicitou atendimento humano no WhatsApp.\n\n💬 *Última Mensagem:* "${mensagemText.trim()}"`;
                enviarMensagemDireta(config.transbordo_whatsapp, msgNotificacao, empresaId).catch(() => { });
            }

            return { status: "transbordo", resposta: msgTransbordo };
        }

        // 3. Buscar Cupons e Lead para o Prompt
        let cuponsAtivos = [];
        try {
            const [cupons] = await db.query(
                `SELECT titulo, descricao, codigo, validade
                 FROM cupons
                 WHERE empresa_id = ? AND ativo = 1 AND (validade IS NULL OR validade >= CURDATE())
                 ORDER BY id DESC LIMIT 5`,
                [empresaId]
            );
            cuponsAtivos = cupons;
        } catch (e) { }

        let leadInfo = null;
        try {
            const [[lead]] = await db.query(
                `SELECT nome, email FROM leads WHERE empresa_id = ? AND RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ? LIMIT 1`,
                [empresaId, last8]
            );
            if (lead) leadInfo = lead;
        } catch (e) { }

        // 4. Buscar histórico do CRM Chat para memória
        const [msgsHist] = await db.query(
            `SELECT direcao, mensagem FROM crm_chat_messages 
             WHERE empresa_id = ? AND RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ? 
             ORDER BY id DESC LIMIT 10`,
            [empresaId, last8]
        );

        const messagesForOpenAi = [];

        // Construir System Prompt dinâmico enriquecido com planos reais e links reais
        const { systemPrompt } = await gerarPromptDoSistema(empresaId, config, cuponsAtivos, leadInfo);
        messagesForOpenAi.push({ role: "system", content: systemPrompt });

        // Adicionar histórico ordenado (mais antigo -> mais recente)
        if (msgsHist && msgsHist.length > 0) {
            const histOrdenado = msgsHist.reverse();
            histOrdenado.forEach(m => {
                // Evitar duplicações caso a mensagem atual já tenha sido inserida
                if (m.mensagem !== mensagemText.trim()) {
                    messagesForOpenAi.push({
                        role: (m.direcao === 'recebida' || m.direcao === 'entrada') ? 'user' : 'assistant',
                        content: m.mensagem
                    });
                }
            });
        }

        // Adicionar mensagem atual
        messagesForOpenAi.push({ role: "user", content: mensagemText.trim() });

        // 4. Chamar a API da OpenAI
        const axios = require("axios");
        const apiKey = process.env.OPENAI_API_KEY || "";

        const openAiRes = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: config.modelo_ia || "gpt-4o-mini",
                messages: messagesForOpenAi,
                temperature: 0.6
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 15000
            }
        );

        const respostaIa = openAiRes.data?.choices?.[0]?.message?.content;

        if (respostaIa && respostaIa.trim()) {
            console.log(`[IA Motor 🤖] Resposta gerada para ${telFormatado}:\n"${respostaIa.trim()}"`);

            // 5. Enviar no WhatsApp com número formatado
            const { enviarMensagemDireta } = require("./whatsappController");
            const resEvo = await enviarMensagemDireta(telFormatado, respostaIa.trim(), empresaId).catch(() => null);
            const statusEnvio = resEvo ? "enviado" : "erro";

            // 6. Gravar no CRM Chat
            await db.execute(
                `INSERT INTO crm_chat_messages (empresa_id, telefone, cliente_nome, direcao, mensagem, status)
                 VALUES (?, ?, 'Assistente IA', 'enviada', ?, ?)`,
                [empresaId, telFormatado, respostaIa.trim(), statusEnvio]
            );

            return { status: statusEnvio === "enviado" ? "sucesso" : "erro", resposta: respostaIa.trim() };
        }

    } catch (err) {
        console.error("[IA Motor ❌] Erro ao processar IA com memória:", err.message);
    }
    return null;
};

