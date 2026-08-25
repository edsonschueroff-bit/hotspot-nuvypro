const db = require("../../db");

exports.getNpsData = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { periodo = '30' } = req.query; // 7, 30, 90
    const dias = Math.min(90, Math.max(7, parseInt(periodo, 10) || 30));

    const dateWhere = `AND n.criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)`;

    // 1. Buscar todas as respostas no período com dados do cliente
    const [respostas] = await db.query(
      `SELECT 
         n.id,
         n.empresa_id,
         n.telefone,
         n.nota,
         n.comentario,
         n.criado_em,
         COALESCE(MAX(CONVERT(l.nome USING utf8mb4) COLLATE utf8mb4_unicode_ci), 'Visitante') AS cliente_nome
       FROM nps_respostas n
       LEFT JOIN leads l ON (
         l.empresa_id = n.empresa_id AND (
           CONVERT(l.telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(n.telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci
           OR RIGHT(REGEXP_REPLACE(CONVERT(l.telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci, '[^0-9]', ''), 8) = RIGHT(CONVERT(n.telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci, 8)
         )
       )
       WHERE n.empresa_id = ? ${dateWhere}
       GROUP BY n.id, n.empresa_id, n.telefone, n.nota, n.comentario, n.criado_em
       ORDER BY n.criado_em DESC`,
      [empresaId, dias]
    );

    let promotores = 0;
    let neutros = 0;
    let detratores = 0;
    let somaNotas = 0;

    respostas.forEach(r => {
      const nota = Number(r.nota) || 0;
      somaNotas += nota;
      if (nota >= 9) promotores++;
      else if (nota >= 7) neutros++;
      else detratores++;
    });

    const total = respostas.length;
    let npsScore = 0;
    let mediaNota = 0;
    let statusZona = "Sem avaliações";

    if (total > 0) {
      const percPromotores = (promotores / total) * 100;
      const percDetratores = (detratores / total) * 100;
      npsScore = Math.round(percPromotores - percDetratores);
      mediaNota = parseFloat((somaNotas / total).toFixed(1));

      if (npsScore >= 75) statusZona = "Zona de Excelência";
      else if (npsScore >= 50) statusZona = "Zona de Qualidade";
      else if (npsScore >= 0) statusZona = "Zona de Aperfeiçoamento";
      else statusZona = "Zona Crítica";
    }

    // 2. Evolução Diária das Notas (preenchimento contínuo para o gráfico)
    const [historicoRaw] = await db.query(
      `SELECT 
         DATE(criado_em) AS data,
         COUNT(id) AS total_respostas,
         AVG(nota) AS media_nota,
         SUM(CASE WHEN nota >= 9 THEN 1 ELSE 0 END) AS promotores,
         SUM(CASE WHEN nota <= 6 THEN 1 ELSE 0 END) AS detratores
       FROM nps_respostas
       WHERE empresa_id = ? AND criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(criado_em)
       ORDER BY data ASC`,
      [empresaId, dias]
    );

    const historico_diario = [];
    const hoje = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = historicoRaw.find(r => {
        const rDate = r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data).split('T')[0];
        return rDate === dateStr;
      });

      historico_diario.push({
        data: dateStr,
        total: match ? parseInt(match.total_respostas) || 0 : 0,
        media_nota: match ? parseFloat(Number(match.media_nota).toFixed(1)) : null,
        promotores: match ? parseInt(match.promotores) || 0 : 0,
        detratores: match ? parseInt(match.detratores) || 0 : 0
      });
    }

    res.json({
      success: true,
      data: {
        score: npsScore,
        total,
        media_nota: mediaNota,
        status_zona: statusZona,
        distribuicao: {
          promotores,
          promotores_pct: total > 0 ? Math.round((promotores / total) * 100) : 0,
          neutros,
          neutros_pct: total > 0 ? Math.round((neutros / total) * 100) : 0,
          detratores,
          detratores_pct: total > 0 ? Math.round((detratores / total) * 100) : 0
        },
        historico_diario,
        recentes: respostas.slice(0, 50)
      }
    });
  } catch (err) {
    console.error("Erro ao buscar NPS:", err);
    res.status(500).json({ success: false, message: "Erro interno ao buscar NPS" });
  }
};
