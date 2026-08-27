const db = require("../../db");

// ── GET PLANOS SAAS ──
exports.getPlanos = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM saas_planos ORDER BY ativo DESC, CASE WHEN valor_mensal > 0 THEN valor_mensal ELSE 99999 END ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar planos SaaS:", err);
        res.status(500).json({ message: "Erro ao carregar planos SaaS" });
    }
};

// ── GET PLANOS EXIBIDOS NO SITE PÚBLICO ──
exports.getPlanosPublicos = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, nome, descricao, valor_mensal, limite_mikrotiks, limite_portais, destaque, recursos, tipo_cobranca, comissao_porcentagem FROM saas_planos WHERE ativo = 1 AND exibir_no_site = 1 ORDER BY CASE WHEN valor_mensal > 0 THEN valor_mensal ELSE 99999 END ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar planos públicos:", err);
        res.status(500).json({ message: "Erro ao carregar planos" });
    }
};

// ── GET PLANO BY ID ──
exports.getPlanoById = async (req, res) => {
    try {
        const { id } = req.params;
        const [[plano]] = await db.query("SELECT * FROM saas_planos WHERE id = ?", [id]);
        if (!plano) {
            return res.status(404).json({ message: "Plano não encontrado" });
        }
        res.json(plano);
    } catch (err) {
        console.error("Erro ao buscar plano SaaS:", err);
        res.status(500).json({ message: "Erro ao buscar plano SaaS" });
    }
};

// ── CRIAR PLANO SAAS ──
exports.criarPlano = async (req, res) => {
    try {
        const {
            nome,
            descricao,
            tipo_cobranca,
            valor_mensal,
            valor_anual,
            dias_trial,
            comissao_porcentagem,
            limite_mikrotiks,
            limite_portais,
            limite_leads,
            limite_whatsapp,
            limite_filiais,
            limite_usuarios,
            destaque,
            recursos,
            ativo,
            exibir_no_site,
            permite_portal_vendas,
            permite_automacao_whatsapp,
            permite_multiplos_pix,
            mod_vpn,
            mod_hotspot,
            modulos_liberados
        } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ message: "Nome do plano é obrigatório" });
        }

        const recursosStr = typeof recursos === 'object' ? JSON.stringify(recursos) : (recursos || null);
        const modulosStr = typeof modulos_liberados === 'object' ? JSON.stringify(modulos_liberados) : (modulos_liberados || null);

        const [result] = await db.execute(
            `INSERT INTO saas_planos (
                nome, descricao, tipo_cobranca, valor_mensal, valor_anual, dias_trial,
                comissao_porcentagem, limite_mikrotiks, limite_portais, limite_leads,
                limite_whatsapp, limite_filiais, limite_usuarios, destaque, recursos,
                ativo, exibir_no_site, permite_portal_vendas, permite_automacao_whatsapp,
                permite_multiplos_pix, mod_vpn, mod_hotspot, modulos_liberados
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome.trim(),
                descricao || null,
                tipo_cobranca || 'fixo',
                parseFloat(valor_mensal) || 0.00,
                valor_anual ? parseFloat(valor_anual) : null,
                parseInt(dias_trial, 10) || 0,
                parseFloat(comissao_porcentagem) || 0.00,
                parseInt(limite_mikrotiks, 10) || 0,
                parseInt(limite_portais, 10) || 0,
                parseInt(limite_leads, 10) || 0,
                parseInt(limite_whatsapp, 10) || 0,
                parseInt(limite_filiais, 10) || 1,
                parseInt(limite_usuarios, 10) || 2,
                destaque ? 1 : 0,
                recursosStr,
                ativo !== undefined ? (ativo ? 1 : 0) : 1,
                exibir_no_site !== undefined ? (exibir_no_site ? 1 : 0) : 1,
                permite_portal_vendas ? 1 : 0,
                permite_automacao_whatsapp ? 1 : 0,
                permite_multiplos_pix ? 1 : 0,
                mod_vpn !== undefined ? (mod_vpn ? 1 : 0) : 1,
                mod_hotspot !== undefined ? (mod_hotspot ? 1 : 0) : 1,
                modulosStr
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: "Plano SaaS criado com sucesso!"
        });
    } catch (err) {
        console.error("Erro ao criar plano SaaS:", err);
        res.status(500).json({ message: "Erro ao criar plano SaaS" });
    }
};

// ── ATUALIZAR PLANO SAAS ──
exports.atualizarPlano = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            descricao,
            tipo_cobranca,
            valor_mensal,
            valor_anual,
            dias_trial,
            comissao_porcentagem,
            limite_mikrotiks,
            limite_portais,
            limite_leads,
            limite_whatsapp,
            limite_filiais,
            limite_usuarios,
            destaque,
            recursos,
            ativo,
            exibir_no_site,
            permite_portal_vendas,
            permite_automacao_whatsapp,
            permite_multiplos_pix,
            mod_vpn,
            mod_hotspot,
            modulos_liberados
        } = req.body;

        const [[plano]] = await db.query("SELECT id FROM saas_planos WHERE id = ?", [id]);
        if (!plano) {
            return res.status(404).json({ message: "Plano não encontrado" });
        }

        const recursosStr = typeof recursos === 'object' ? JSON.stringify(recursos) : (recursos || null);
        const modulosStr = typeof modulos_liberados === 'object' ? JSON.stringify(modulos_liberados) : (modulos_liberados || null);

        await db.execute(
            `UPDATE saas_planos 
       SET nome = ?, descricao = ?, tipo_cobranca = ?, valor_mensal = ?, valor_anual = ?, dias_trial = ?,
           comissao_porcentagem = ?, limite_mikrotiks = ?, limite_portais = ?, limite_leads = ?,
           limite_whatsapp = ?, limite_filiais = ?, limite_usuarios = ?, destaque = ?, recursos = ?,
           ativo = ?, exibir_no_site = ?, permite_portal_vendas = ?, permite_automacao_whatsapp = ?,
           permite_multiplos_pix = ?, mod_vpn = ?, mod_hotspot = ?, modulos_liberados = ?
       WHERE id = ?`,
            [
                nome ? nome.trim() : 'Plano',
                descricao || null,
                tipo_cobranca || 'fixo',
                parseFloat(valor_mensal) || 0.00,
                valor_anual ? parseFloat(valor_anual) : null,
                parseInt(dias_trial, 10) || 0,
                parseFloat(comissao_porcentagem) || 0.00,
                parseInt(limite_mikrotiks, 10) || 0,
                parseInt(limite_portais, 10) || 0,
                parseInt(limite_leads, 10) || 0,
                parseInt(limite_whatsapp, 10) || 0,
                parseInt(limite_filiais, 10) || 1,
                parseInt(limite_usuarios, 10) || 2,
                destaque !== undefined ? (destaque ? 1 : 0) : 0,
                recursosStr,
                ativo !== undefined ? (ativo ? 1 : 0) : 1,
                exibir_no_site !== undefined ? (exibir_no_site ? 1 : 0) : 1,
                permite_portal_vendas ? 1 : 0,
                permite_automacao_whatsapp ? 1 : 0,
                permite_multiplos_pix ? 1 : 0,
                mod_vpn !== undefined ? (mod_vpn ? 1 : 0) : 1,
                mod_hotspot !== undefined ? (mod_hotspot ? 1 : 0) : 1,
                modulosStr,
                id
            ]
        );

        res.json({ message: "Plano SaaS atualizado com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar plano SaaS:", err);
        res.status(500).json({ message: "Erro ao atualizar plano SaaS" });
    }
};

// ── DESATIVAR / EXCLUIR PLANO SAAS ──
exports.deletarPlano = async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica se há empresas vinculadas
        const [[empresa]] = await db.query(
            "SELECT id FROM empresas WHERE saas_plano_id = ? LIMIT 1",
            [id]
        );

        if (empresa) {
            // Soft delete - apenas desativa
            await db.execute("UPDATE saas_planos SET ativo = 0 WHERE id = ?", [id]);
            return res.json({
                message: "Plano desativado com sucesso (há empresas vinculadas a este plano)."
            });
        }

        // Hard delete se não há empresas usando
        await db.execute("DELETE FROM saas_planos WHERE id = ?", [id]);
        res.json({ message: "Plano SaaS excluído com sucesso!" });
    } catch (err) {
        console.error("Erro ao excluir plano SaaS:", err);
        res.status(500).json({ message: "Erro ao excluir plano SaaS" });
    }
};
