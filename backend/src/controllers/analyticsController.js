const db = require("../../db");

exports.getAnalyticsVisitantes = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const periodo = Math.min(90, Math.max(7, parseInt(req.query.periodo) || 30)); // 7, 30 ou 90 dias

    // 1. KPIs Gerais e Tráfego de Dados
    const queryKpis = `
      SELECT 
        COUNT(id) AS total_conexoes,
        COUNT(DISTINCT mac) AS total_visitantes_unicos,
        COALESCE(AVG(NULLIF(duracao_segundos, 0)), 0) AS tempo_medio_segundos,
        COALESCE(SUM(bytes_entrada), 0) AS total_bytes_download,
        COALESCE(SUM(bytes_saida), 0) AS total_bytes_upload
      FROM connection_logs
      WHERE empresa_id = ? 
        AND inicio_conexao >= NOW() - INTERVAL ? DAY
    `;

    // 2. Novos vs Recorrentes
    const queryTiposVisitante = `
      SELECT 
        SUM(CASE WHEN primeiro_acesso >= NOW() - INTERVAL ? DAY THEN 1 ELSE 0 END) AS visitantes_novos,
        SUM(CASE WHEN primeiro_acesso < NOW() - INTERVAL ? DAY THEN 1 ELSE 0 END) AS visitantes_recorrentes
      FROM (
        SELECT mac, MIN(inicio_conexao) as primeiro_acesso
        FROM connection_logs
        WHERE empresa_id = ?
        GROUP BY mac
      ) AS visitantes
      WHERE mac IN (
        SELECT DISTINCT mac 
        FROM connection_logs 
        WHERE empresa_id = ? AND inicio_conexao >= NOW() - INTERVAL ? DAY
      )
    `;

    // 3. Heatmap de Horários e Dias de Pico
    const queryHeatmap = `
      SELECT 
        DAYOFWEEK(inicio_conexao) AS dia_semana,
        HOUR(inicio_conexao) AS hora_dia,
        COUNT(id) AS total_conexoes
      FROM connection_logs
      WHERE empresa_id = ? 
        AND inicio_conexao >= NOW() - INTERVAL ? DAY
      GROUP BY dia_semana, hora_dia
      ORDER BY dia_semana, hora_dia
    `;

    // 4. Tráfego Diário Bruto
    const queryDiario = `
      SELECT 
        DATE(inicio_conexao) AS data,
        COUNT(DISTINCT mac) AS visitantes_unicos,
        COUNT(id) AS total_conexoes
      FROM connection_logs
      WHERE empresa_id = ? 
        AND inicio_conexao >= NOW() - INTERVAL ? DAY
      GROUP BY DATE(inicio_conexao)
      ORDER BY data ASC
    `;

    // 5. Top 5 Visitantes Mais Frequentes do Período (com cast seguro de collation)
    const queryTopVisitantes = `
      SELECT 
        c.mac,
        COALESCE(MAX(CONVERT(l.nome USING utf8mb4) COLLATE utf8mb4_unicode_ci), MAX(CONVERT(c.username USING utf8mb4) COLLATE utf8mb4_unicode_ci), 'Visitante') AS nome,
        MAX(CONVERT(l.telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci) AS telefone,
        COUNT(c.id) AS total_visitas,
        COALESCE(SUM(c.duracao_segundos), 0) AS tempo_total_segundos,
        MAX(c.inicio_conexao) AS ult_visita
      FROM connection_logs c
      LEFT JOIN leads l ON l.empresa_id = c.empresa_id AND (
        CONVERT(l.mac USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(c.mac USING utf8mb4) COLLATE utf8mb4_unicode_ci 
        OR (l.telefone IS NOT NULL AND CONVERT(c.username USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(l.telefone USING utf8mb4) COLLATE utf8mb4_unicode_ci)
      )
      WHERE c.empresa_id = ? AND c.inicio_conexao >= NOW() - INTERVAL ? DAY
      GROUP BY c.mac
      ORDER BY total_visitas DESC, tempo_total_segundos DESC
      LIMIT 5
    `;

    const [[kpis]] = await db.query(queryKpis, [empresaId, periodo]);
    const [[tipos]] = await db.query(queryTiposVisitante, [periodo, periodo, empresaId, empresaId, periodo]);
    const [heatmap] = await db.query(queryHeatmap, [empresaId, periodo]);
    const [diarioRaw] = await db.query(queryDiario, [empresaId, periodo]);
    const [topVisitantes] = await db.query(queryTopVisitantes, [empresaId, periodo]);

    // Preencher dias contínuos no gráfico diário para curva suave
    const grafico_diario = [];
    const hoje = new Date();
    for (let i = periodo - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = diarioRaw.find(r => {
        const rDate = r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data).split('T')[0];
        return rDate === dateStr;
      });
      grafico_diario.push({
        data: dateStr,
        visitantes_unicos: match ? parseInt(match.visitantes_unicos) || 0 : 0,
        total_conexoes: match ? parseInt(match.total_conexoes) || 0 : 0
      });
    }

    // Calcular Insight do Horário de Ouro (Pico)
    const nomesDias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    let picoInsight = null;
    if (heatmap && heatmap.length > 0) {
      const maxItem = heatmap.reduce((prev, curr) => (curr.total_conexoes > prev.total_conexoes ? curr : prev), heatmap[0]);
      if (maxItem && maxItem.total_conexoes > 0) {
        picoInsight = {
          dia_nome: nomesDias[maxItem.dia_semana - 1] || "Dia de semana",
          hora: `${String(maxItem.hora_dia).padStart(2, '0')}:00`,
          total: maxItem.total_conexoes
        };
      }
    }

    const totalConexoes = parseInt(kpis?.total_conexoes) || 0;
    const visitantesUnicos = parseInt(kpis?.total_visitantes_unicos) || 0;
    const visitantesNovos = parseInt(tipos?.visitantes_novos) || 0;
    const visitantesRecorrentes = parseInt(tipos?.visitantes_recorrentes) || 0;
    const taxaRetencao = visitantesUnicos > 0 ? Math.round((visitantesRecorrentes / visitantesUnicos) * 100) : 0;
    const bytesDownload = parseFloat(kpis?.total_bytes_download) || 0;
    const bytesUpload = parseFloat(kpis?.total_bytes_upload) || 0;
    const totalBytes = bytesDownload + bytesUpload;

    res.json({
      success: true,
      data: {
        kpis: {
          total_conexoes: totalConexoes,
          visitantes_unicos: visitantesUnicos,
          tempo_medio_segundos: Math.round(parseFloat(kpis?.tempo_medio_segundos) || 0),
          visitantes_novos: visitantesNovos,
          visitantes_recorrentes: visitantesRecorrentes,
          taxa_retencao_pct: taxaRetencao,
          total_bytes_download: bytesDownload,
          total_bytes_upload: bytesUpload,
          total_bytes: totalBytes
        },
        pico_insight: picoInsight,
        grafico_diario,
        heatmap_horarios: heatmap,
        top_visitantes: topVisitantes
      }
    });

  } catch (error) {
    console.error("Erro em getAnalyticsVisitantes:", error);
    res.status(500).json({ success: false, message: "Erro ao buscar analytics." });
  }
};
