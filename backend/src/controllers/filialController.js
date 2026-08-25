const db = require("../../db");

/**
 * Retorna a ID da Matriz para a empresa atual no contexto.
 * Se a empresa atual já for uma filial, retorna seu matriz_id.
 * Se for matriz ou independente, retorna ela própria.
 */
async function obterMatrizId(empresaId) {
    const [[empresa]] = await db.query(
        "SELECT id, matriz_id, tipo_unidade FROM empresas WHERE id = ?",
        [empresaId]
    );

    if (!empresa) return empresaId;
    return empresa.matriz_id || empresa.id;
}

// ── LISTAR FILIAIS DA REDE ──
exports.listarFiliais = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const matrizId = await obterMatrizId(empresaId);

        // Busca todas as empresas que pertencem à mesma rede (matriz + todas as filiais)
        const [filiais] = await db.query(
            `SELECT 
                e.id,
                e.nome,
                e.slug,
                e.cnpj,
                e.email,
                e.telefone,
                e.cidade,
                e.estado,
                e.endereco,
                e.responsavel_nome,
                e.matriz_id,
                e.tipo_unidade,
                e.ativo,
                e.criado_em,
                (SELECT COUNT(*) FROM mikrotiks WHERE empresa_id = e.id) AS total_mikrotiks,
                (SELECT COUNT(*) FROM portais WHERE empresa_id = e.id) AS total_portais,
                (SELECT COUNT(*) FROM leads WHERE empresa_id = e.id) AS total_leads,
                (SELECT COALESCE(SUM(valor), 0) FROM pagamentos WHERE empresa_id = e.id AND status = 'approved') AS total_vendas
             FROM empresas e
             WHERE (e.id = ? OR e.matriz_id = ?) AND e.ativo = 1
             ORDER BY (e.id = ?) DESC, e.nome ASC`,
            [matrizId, matrizId, matrizId]
        );

        res.json({
            success: true,
            matriz_id: matrizId,
            empresa_atual_id: empresaId,
            data: filiais
        });
    } catch (err) {
        console.error("Erro ao listar filiais:", err);
        res.status(500).json({ success: false, message: "Erro ao listar filiais da rede" });
    }
};

// ── MÉTRICAS CONSOLIDADAS DA REDE ──
exports.obterMetricasConsolidadas = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const matrizId = await obterMatrizId(empresaId);

        const [rows] = await db.query(
            `SELECT 
                COUNT(DISTINCT e.id) AS total_unidades,
                COUNT(DISTINCT m.id) AS total_roteadores,
                COUNT(DISTINCT p.id) AS total_portais,
                COUNT(DISTINCT l.id) AS total_leads,
                COALESCE(SUM(pag.valor), 0) AS faturamento_total
             FROM empresas e
             LEFT JOIN mikrotiks m ON m.empresa_id = e.id
             LEFT JOIN portais p ON p.empresa_id = e.id
             LEFT JOIN leads l ON l.empresa_id = e.id
             LEFT JOIN pagamentos pag ON pag.empresa_id = e.id AND pag.status = 'approved'
             WHERE (e.id = ? OR e.matriz_id = ?) AND e.ativo = 1`,
            [matrizId, matrizId]
        );

        const metricas = rows[0] || {
            total_unidades: 1,
            total_roteadores: 0,
            total_portais: 0,
            total_leads: 0,
            faturamento_total: 0
        };

        res.json({
            success: true,
            matriz_id: matrizId,
            data: metricas
        });
    } catch (err) {
        console.error("Erro ao obter métricas consolidadas da rede:", err);
        res.status(500).json({ success: false, message: "Erro ao calcular métricas da rede" });
    }
};

// ── CRIAR NOVA FILIAL ──
exports.criarFilial = async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const empresaId = req.empresa_id;
        const adminId = req.user.id;
        const { nome, cidade, estado, endereco, responsavel_nome, telefone, email } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ success: false, message: "O nome da filial é obrigatório." });
        }

        // 1. Obter dados da matriz
        const [[empresaAtual]] = await conn.query(
            "SELECT id, nome, slug, matriz_id, saas_plano_id, tipo_unidade FROM empresas WHERE id = ?",
            [empresaId]
        );

        if (empresaAtual && empresaAtual.matriz_id) {
            return res.status(403).json({ success: false, message: "Acesso negado. Apenas a Matriz pode cadastrar novas filiais na rede." });
        }

        const matrizId = empresaAtual.matriz_id || empresaAtual.id;

        // Se a empresa atual era independente, transforma ela em matriz oficial
        if (empresaAtual.tipo_unidade !== "matriz" && !empresaAtual.matriz_id) {
            await conn.execute(
                "UPDATE empresas SET tipo_unidade = 'matriz' WHERE id = ?",
                [matrizId]
            );
        }

        // 2. Gerar slug único para a filial
        const baseSlug = nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        let slugFinal = `${empresaAtual.slug}-${baseSlug}`;
        const [[slugExistente]] = await conn.query("SELECT id FROM empresas WHERE slug = ?", [slugFinal]);
        if (slugExistente) {
            slugFinal = `${slugFinal}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // 3. Inserir a nova empresa filial
        const [resultEmpresa] = await conn.execute(
            `INSERT INTO empresas (
                nome, slug, email, telefone, cidade, estado, endereco, 
                responsavel_nome, matriz_id, tipo_unidade, saas_plano_id, status_financeiro, ativo
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'filial', ?, 'adimplente', 1)`,
            [
                nome.trim(),
                slugFinal,
                email && email.trim() ? email.trim() : (empresaAtual.email || `${slugFinal}@nuvycore.online`),
                telefone ? telefone.trim() : null,
                cidade ? cidade.trim() : null,
                estado ? estado.trim().toUpperCase() : null,
                endereco ? endereco.trim() : null,
                responsavel_nome ? responsavel_nome.trim() : null,
                matrizId,
                empresaAtual.saas_plano_id || null
            ]
        );

        const novaFilialId = resultEmpresa.insertId;

        // 4. Auto-vincular o admin logado à nova filial para que apareça no seletor dele
        await conn.execute(
            `INSERT INTO admin_empresas (admin_id, empresa_id, role) 
             VALUES (?, ?, 'owner')
             ON DUPLICATE KEY UPDATE role = 'owner'`,
            [adminId, novaFilialId]
        );

        // 5. Criar portal captivo padrão para a filial
        await conn.execute(
            `INSERT INTO portais (
                empresa_id, nome, slug, tipo, cor_primaria, cor_fundo, ativo, configuracoes
             ) VALUES (
                ?, ?, ?, 'formulario', '#2563eb', '#f8fafc', 1, ?
             )`,
            [
                novaFilialId,
                `Portal Padrão - ${nome.trim()}`,
                `padrao-${slugFinal}`,
                JSON.stringify({
                    titulo: `Wi-Fi Grátis • ${nome.trim()}`,
                    subtitulo: 'Conecte-se para navegar na internet com ultra-velocidade',
                    texto_botao: 'Conectar ao Wi-Fi'
                })
            ]
        );

        await conn.commit();

        res.status(201).json({
            success: true,
            id: novaFilialId,
            slug: slugFinal,
            message: "Filial cadastrada e provisionada com sucesso!"
        });
    } catch (err) {
        await conn.rollback();
        console.error("Erro ao criar filial:", err);
        res.status(500).json({ success: false, message: "Erro interno ao cadastrar filial" });
    } finally {
        conn.release();
    }
};

// ── ATUALIZAR FILIAL ──
exports.atualizarFilial = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { id } = req.params;
        const { nome, cidade, estado, endereco, responsavel_nome, telefone, email } = req.body;

        // Bloqueia Escalada Horizontal: Se quem chamou é uma filial, aborta.
        const [[empresaAtual]] = await db.query("SELECT id, matriz_id FROM empresas WHERE id = ?", [empresaId]);
        if (empresaAtual && empresaAtual.matriz_id) {
            return res.status(403).json({ success: false, message: "Acesso negado. Apenas a Matriz pode alterar dados de filiais." });
        }

        const matrizId = await obterMatrizId(empresaId);

        // Valida que a filial pertence à mesma rede
        const [[filial]] = await db.query(
            "SELECT id FROM empresas WHERE id = ? AND (id = ? OR matriz_id = ?)",
            [id, matrizId, matrizId]
        );

        if (!filial) {
            return res.status(404).json({ success: false, message: "Filial não encontrada nesta rede." });
        }

        await db.execute(
            `UPDATE empresas 
             SET nome = ?, cidade = ?, estado = ?, endereco = ?, responsavel_nome = ?, telefone = ?, email = ?
             WHERE id = ?`,
            [
                nome ? nome.trim() : "Filial",
                cidade ? cidade.trim() : null,
                estado ? estado.trim().toUpperCase() : null,
                endereco ? endereco.trim() : null,
                responsavel_nome ? responsavel_nome.trim() : null,
                telefone ? telefone.trim() : null,
                email ? email.trim() : null,
                id
            ]
        );

        res.json({ success: true, message: "Dados da filial atualizados com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar filial:", err);
        res.status(500).json({ success: false, message: "Erro ao atualizar filial" });
    }
};

// ── DESATIVAR FILIAL ──
exports.desativarFilial = async (req, res) => {
    try {
        const empresaId = req.empresa_id;
        const { id } = req.params;

        // Bloqueia Escalada Horizontal: Se quem chamou é uma filial, aborta.
        const [[empresaAtual]] = await db.query("SELECT id, matriz_id FROM empresas WHERE id = ?", [empresaId]);
        if (empresaAtual && empresaAtual.matriz_id) {
            return res.status(403).json({ success: false, message: "Acesso negado. Apenas a Matriz pode desativar filiais." });
        }

        const matrizId = await obterMatrizId(empresaId);

        if (parseInt(id, 10) === parseInt(matrizId, 10)) {
            return res.status(400).json({ success: false, message: "Não é permitido desativar a Matriz principal da rede." });
        }

        await db.execute(
            "UPDATE empresas SET ativo = 0 WHERE id = ? AND matriz_id = ?",
            [id, matrizId]
        );

        res.json({ success: true, message: "Filial desativada com sucesso!" });
    } catch (err) {
        console.error("Erro ao desativar filial:", err);
        res.status(500).json({ success: false, message: "Erro ao desativar filial" });
    }
};
