const db = require('../../db');
const isSuper = (req) => req.user?.role === 'super_admin' || req.user?.is_super_admin === true || req.user?.is_super_admin === 1;

/**
 * Controller Financeiro & DRE Gerencial
 */
const financeiroController = {

  /**
   * Obter DRE da Empresa ou Super Admin
   */
  getDre: async (req, res) => {
    try {
      const now = new Date();
      const mes = parseInt(req.query.mes) || (now.getMonth() + 1);
      const ano = parseInt(req.query.ano) || now.getFullYear();

      // Determinar empresa
      let empresaId = req.user.empresa_id;

      if (req.query.empresa_slug) {
        const [[emp]] = await db.query('SELECT id FROM empresas WHERE slug = ?', [req.query.empresa_slug]);
        if (emp) empresaId = emp.id;
      } else if (req.query.empresa_id) {
        empresaId = parseInt(req.query.empresa_id);
      }

      const isSuperVisaoGeral = isSuper(req) && (req.query.visao === 'global' || !req.query.empresa_id);

      if (!empresaId && !isSuperVisaoGeral) {
        const [[firstEmp]] = await db.query('SELECT id FROM empresas ORDER BY id ASC LIMIT 1');
        if (firstEmp) empresaId = firstEmp.id;
      }

      // 1. Calcular Período Atual e Mês Anterior
      const mesAnterior = mes === 1 ? 12 : mes - 1;
      const anoAnterior = mes === 1 ? ano - 1 : ano;

      let receitaBruta = 0;
      let receitaBrutaAnterior = 0;
      let taxaGatewayEstimada = 0.0199; // 1.99% taxa média PIX/Cartão

      if (isSuperVisaoGeral) {
        // Super Admin Global: Mensalidades SaaS Pagas + Comissões PIX
        const [[faturasAtual]] = await db.query(
          `SELECT COALESCE(SUM(valor), 0) as total FROM saas_faturas 
           WHERE status IN ('pago', 'paga') 
           AND MONTH(COALESCE(pago_em, criado_em)) = ? AND YEAR(COALESCE(pago_em, criado_em)) = ?`,
          [mes, ano]
        );
        const [[faturasAnt]] = await db.query(
          `SELECT COALESCE(SUM(valor), 0) as total FROM saas_faturas 
           WHERE status IN ('pago', 'paga') 
           AND MONTH(COALESCE(pago_em, criado_em)) = ? AND YEAR(COALESCE(pago_em, criado_em)) = ?`,
          [mesAnterior, anoAnterior]
        );
        receitaBruta = parseFloat(faturasAtual?.total || 0);
        receitaBrutaAnterior = parseFloat(faturasAnt?.total || 0);
      } else {
        // Empresa / Filial: Vendas de Planos no Hotspot via PIX
        const [[vendasAtual]] = await db.query(
          `SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos 
           WHERE empresa_id = ? AND status IN ('pago', 'aprovado', 'approved', 'CONFIRMED') 
           AND MONTH(criado_em) = ? AND YEAR(criado_em) = ?`,
          [empresaId, mes, ano]
        );
        const [[vendasAnt]] = await db.query(
          `SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos 
           WHERE empresa_id = ? AND status IN ('pago', 'aprovado', 'approved', 'CONFIRMED') 
           AND MONTH(criado_em) = ? AND YEAR(criado_em) = ?`,
          [empresaId, mesAnterior, anoAnterior]
        );
        receitaBruta = parseFloat(vendasAtual?.total || 0);
        receitaBrutaAnterior = parseFloat(vendasAnt?.total || 0);
      }

      // 2. Deduções de Taxas de Intermediação
      const deducoesTaxas = +(receitaBruta * taxaGatewayEstimada).toFixed(2);
      const receitaLiquida = +(receitaBruta - deducoesTaxas).toFixed(2);

      // 3. Custos & Despesas Operacionais do Mês
      let despesasQuery = `SELECT * FROM despesas_operacionais WHERE MONTH(data_competencia) = ? AND YEAR(data_competencia) = ?`;
      let despesasParams = [mes, ano];

      if (isSuperVisaoGeral) {
        despesasQuery += ` AND empresa_id IS NULL`;
      } else {
        despesasQuery += ` AND empresa_id = ?`;
        despesasParams.push(empresaId);
      }

      const [despesas] = await db.query(despesasQuery, despesasParams);

      // Agrupar despesas por categoria
      let totalDespesas = 0;
      let custosPorCategoria = {
        conectividade: 0,
        infraestrutura: 0,
        whatsapp: 0,
        equipamentos: 0,
        licencas: 0,
        outros: 0
      };

      despesas.forEach(d => {
        const val = parseFloat(d.valor || 0);
        totalDespesas += val;
        const cat = d.categoria?.toLowerCase() || 'outros';
        if (custosPorCategoria[cat] !== undefined) {
          custosPorCategoria[cat] += val;
        } else {
          custosPorCategoria.outros += val;
        }
      });

      totalDespesas = +totalDespesas.toFixed(2);

      // 4. Lucro Líquido Operacional
      const lucroLiquido = +(receitaLiquida - totalDespesas).toFixed(2);
      const margemLucro = receitaBruta > 0 ? +((lucroLiquido / receitaBruta) * 100).toFixed(1) : 0;

      // 5. Comparativo com Mês Anterior
      let crescimentoReceita = 0;
      if (receitaBrutaAnterior > 0) {
        crescimentoReceita = +(((receitaBruta - receitaBrutaAnterior) / receitaBrutaAnterior) * 100).toFixed(1);
      }

      // 6. Evolução Histórica (Últimos 6 meses)
      const historico6Meses = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ano, mes - 1 - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const nomeMes = d.toLocaleString('pt-BR', { month: 'short' });

        let rec = 0;
        if (isSuperVisaoGeral) {
          const [[r]] = await db.query(
            `SELECT COALESCE(SUM(valor), 0) as total FROM saas_faturas 
             WHERE status IN ('pago', 'paga') 
             AND MONTH(COALESCE(pago_em, criado_em)) = ? AND YEAR(COALESCE(pago_em, criado_em)) = ?`,
            [m, y]
          );
          rec = parseFloat(r?.total || 0);
        } else {
          const [[r]] = await db.query(
            `SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos 
             WHERE empresa_id = ? AND status IN ('pago', 'aprovado', 'approved', 'CONFIRMED') 
             AND MONTH(criado_em) = ? AND YEAR(criado_em) = ?`,
            [empresaId, m, y]
          );
          rec = parseFloat(r?.total || 0);
        }

        let despQuery = `SELECT COALESCE(SUM(valor), 0) as total FROM despesas_operacionais WHERE MONTH(data_competencia) = ? AND YEAR(data_competencia) = ?`;
        let despParams = [m, y];
        if (isSuperVisaoGeral) {
          despQuery += ` AND empresa_id IS NULL`;
        } else {
          despQuery += ` AND empresa_id = ?`;
          despParams.push(empresaId);
        }
        const [[desp]] = await db.query(despQuery, despParams);
        const despTotal = parseFloat(desp?.total || 0);

        historico6Meses.push({
          mes: m,
          ano: y,
          rotulo: `${nomeMes}/${String(y).slice(-2)}`,
          receita: rec,
          despesas: despTotal,
          lucro: +(rec - (rec * taxaGatewayEstimada) - despTotal).toFixed(2)
        });
      }

      res.json({
        periodo: { mes, ano, mesAnterior, anoAnterior },
        receitaBruta,
        receitaBrutaAnterior,
        crescimentoReceita,
        deducoesTaxas,
        receitaLiquida,
        totalDespesas,
        custosPorCategoria,
        lucroLiquido,
        margemLucro,
        despesas,
        historico6Meses
      });

    } catch (err) {
      console.error("Erro ao gerar DRE:", err);
      res.status(500).json({ error: "Erro ao gerar DRE financeiro." });
    }
  },

  /**
   * Listar Despesas Operacionais
   */
  getDespesas: async (req, res) => {
    try {
      const now = new Date();
      const mes = req.query.mes ? parseInt(req.query.mes) : null;
      const ano = req.query.ano ? parseInt(req.query.ano) : null;

      let empresaId = req.user.empresa_id;

      if (req.query.empresa_slug) {
        const [[emp]] = await db.query('SELECT id FROM empresas WHERE slug = ?', [req.query.empresa_slug]);
        if (emp) empresaId = emp.id;
      } else if (req.query.empresa_id) {
        empresaId = parseInt(req.query.empresa_id);
      }

      const isSuperVisaoGeral = isSuper(req) && (req.query.visao === 'global' || !req.query.empresa_id);

      if (!empresaId && !isSuperVisaoGeral) {
        const [[firstEmp]] = await db.query('SELECT id FROM empresas ORDER BY id ASC LIMIT 1');
        if (firstEmp) empresaId = firstEmp.id;
      }

      let sql = `SELECT * FROM despesas_operacionais WHERE 1=1`;
      let params = [];

      if (isSuperVisaoGeral) {
        sql += ` AND empresa_id IS NULL`;
      } else {
        sql += ` AND empresa_id = ?`;
        params.push(empresaId);
      }

      if (mes && ano) {
        sql += ` AND MONTH(data_competencia) = ? AND YEAR(data_competencia) = ?`;
        params.push(mes, ano);
      }

      sql += ` ORDER BY data_competencia DESC, id DESC`;

      const [despesas] = await db.query(sql, params);
      res.json(despesas);
    } catch (err) {
      console.error("Erro ao listar despesas:", err);
      res.status(500).json({ error: "Erro ao buscar despesas." });
    }
  },

  /**
   * Criar Despesa
   */
  createDespesa: async (req, res) => {
    try {
      const {
        descricao,
        categoria,
        tipo,
        valor,
        data_competencia,
        data_vencimento,
        recorrente,
        status,
        observacoes,
        empresa_slug
      } = req.body;

      if (!descricao || !valor || !data_competencia) {
        return res.status(400).json({ error: "Descrição, valor e data de competência são obrigatórios." });
      }

      let empresaId = req.user.empresa_id;

      if (empresa_slug) {
        const [[emp]] = await db.query('SELECT id FROM empresas WHERE slug = ?', [empresa_slug]);
        if (emp) empresaId = emp.id;
      } else if (isSuper(req) && req.body.empresa_id !== undefined) {
        empresaId = req.body.empresa_id === 'global' || req.body.empresa_id === null ? null : parseInt(req.body.empresa_id);
      }

      if (!empresaId && req.body.empresa_id !== 'global' && req.body.empresa_id !== null) {
        const [[firstEmp]] = await db.query('SELECT id FROM empresas ORDER BY id ASC LIMIT 1');
        if (firstEmp) empresaId = firstEmp.id;
      }

      const [result] = await db.query(
        `INSERT INTO despesas_operacionais 
         (empresa_id, descricao, categoria, tipo, valor, data_competencia, data_vencimento, recorrente, status, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          empresaId,
          descricao,
          categoria || 'outros',
          tipo || 'fixa',
          parseFloat(valor),
          data_competencia,
          data_vencimento || data_competencia,
          recorrente ? 1 : 0,
          status || 'pago',
          observacoes || null
        ]
      );

      res.status(201).json({ id: result.insertId, message: "Despesa registrada com sucesso." });
    } catch (err) {
      console.error("Erro ao criar despesa:", err);
      res.status(500).json({ error: "Erro ao criar despesa." });
    }
  },

  /**
   * Atualizar Despesa
   */
  updateDespesa: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        descricao,
        categoria,
        tipo,
        valor,
        data_competencia,
        data_vencimento,
        recorrente,
        status,
        observacoes
      } = req.body;

      let empresaId = req.user.empresa_id;

      // Verificar permissão
      const [[existente]] = await db.query(`SELECT * FROM despesas_operacionais WHERE id = ?`, [id]);
      if (!existente) {
        return res.status(404).json({ error: "Despesa não encontrada." });
      }

      if (!isSuper(req) && existente.empresa_id !== empresaId) {
        return res.status(403).json({ error: "Sem permissão para alterar esta despesa." });
      }

      await db.query(
        `UPDATE despesas_operacionais SET
         descricao = ?, categoria = ?, tipo = ?, valor = ?, data_competencia = ?,
         data_vencimento = ?, recorrente = ?, status = ?, observacoes = ?
         WHERE id = ?`,
        [
          descricao || existente.descricao,
          categoria || existente.categoria,
          tipo || existente.tipo,
          valor !== undefined ? parseFloat(valor) : existente.valor,
          data_competencia || existente.data_competencia,
          data_vencimento || existente.data_vencimento,
          recorrente !== undefined ? (recorrente ? 1 : 0) : existente.recorrente,
          status || existente.status,
          observacoes !== undefined ? observacoes : existente.observacoes,
          id
        ]
      );

      res.json({ message: "Despesa atualizada com sucesso." });
    } catch (err) {
      console.error("Erro ao atualizar despesa:", err);
      res.status(500).json({ error: "Erro ao atualizar despesa." });
    }
  },

  /**
   * Excluir Despesa
   */
  deleteDespesa: async (req, res) => {
    try {
      const { id } = req.params;
      let empresaId = req.user.empresa_id;

      const [[existente]] = await db.query(`SELECT * FROM despesas_operacionais WHERE id = ?`, [id]);
      if (!existente) {
        return res.status(404).json({ error: "Despesa não encontrada." });
      }

      if (!isSuper(req) && existente.empresa_id !== empresaId) {
        return res.status(403).json({ error: "Sem permissão para excluir esta despesa." });
      }

      await db.query(`DELETE FROM despesas_operacionais WHERE id = ?`, [id]);
      res.json({ message: "Despesa removida com sucesso." });
    } catch (err) {
      console.error("Erro ao excluir despesa:", err);
      res.status(500).json({ error: "Erro ao excluir despesa." });
    }
  }

};

module.exports = financeiroController;
