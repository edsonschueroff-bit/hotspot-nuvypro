const db = require("../../db");
const { sqlSessoesAtivas } = require("../services/sessionJanitorService");
const { sqlStatusPagos } = require("../utils/paymentStatus");

exports.getDashboard = async (req, res) => {
  try {
    const empresaId = req.empresa_id;

    // 1. Conectados Agora (Critério centralizado e verificado de atividade real)
    const [[{ conectados_agora }]] = await db.query(
      `SELECT COUNT(DISTINCT ra.username) as conectados_agora
       FROM radacct ra
       JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci
       WHERE ru.empresa_id = ? AND ${sqlSessoesAtivas('ra')}`,
      [empresaId]
    );

    let totalConectados = conectados_agora || 0;

    // 2. Leads (Hoje, Mês, Total - Timezone América/São Paulo UTC-3)
    const [[{ leads_hoje }]] = await db.query(
      `SELECT COUNT(*) as leads_hoje FROM leads 
       WHERE empresa_id = ? 
         AND DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))`,
      [empresaId]
    );

    const [[{ leads_mes }]] = await db.query(
      `SELECT COUNT(*) as leads_mes FROM leads 
       WHERE empresa_id = ? 
         AND MONTH(CONVERT_TZ(criado_em, '+00:00', '-03:00')) = MONTH(CONVERT_TZ(NOW(), '+00:00', '-03:00'))
         AND YEAR(CONVERT_TZ(criado_em, '+00:00', '-03:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '-03:00'))`,
      [empresaId]
    );

    const [[{ leads_total }]] = await db.query(
      "SELECT COUNT(*) as leads_total FROM leads WHERE empresa_id = ?",
      [empresaId]
    );

    // 3. Vendas de Acesso Wi-Fi / Faturamento PIX (Hoje e Mês - Status unificado e Timezone)
    const [[{ vendas_hoje }]] = await db.query(
      `SELECT COALESCE(SUM(valor), 0) as vendas_hoje FROM pagamentos 
       WHERE empresa_id = ? AND ${sqlStatusPagos()} 
         AND DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))`,
      [empresaId]
    );

    const [[{ vendas_mes }]] = await db.query(
      `SELECT COALESCE(SUM(valor), 0) as vendas_mes FROM pagamentos 
       WHERE empresa_id = ? AND ${sqlStatusPagos()} 
         AND MONTH(CONVERT_TZ(criado_em, '+00:00', '-03:00')) = MONTH(CONVERT_TZ(NOW(), '+00:00', '-03:00'))
         AND YEAR(CONVERT_TZ(criado_em, '+00:00', '-03:00')) = YEAR(CONVERT_TZ(NOW(), '+00:00', '-03:00'))`,
      [empresaId]
    );

    // 4. Mensagens Não Lidas do WhatsApp & Disparos (CRM)
    let disparos_whatsapp = 0;
    let mensagens_nao_lidas = 0;
    let ultima_mensagem_preview = null;

    try {
      const [[{ total_envios }]] = await db.query(
        "SELECT COUNT(*) as total_envios FROM crm_historico_envios WHERE empresa_id = ?",
        [empresaId]
      );
      disparos_whatsapp = total_envios || 0;
    } catch (e) {
      disparos_whatsapp = 0;
    }

    try {
      const [[{ nao_lidas }]] = await db.query(
        "SELECT COUNT(*) as nao_lidas FROM crm_chat_messages WHERE empresa_id = ? AND direcao IN ('recebida', 'entrada') AND (status != 'lida' OR status IS NULL)",
        [empresaId]
      );
      mensagens_nao_lidas = nao_lidas || 0;

      const [ultimasMsg] = await db.query(
        "SELECT cliente_nome, telefone, mensagem, criado_em FROM crm_chat_messages WHERE empresa_id = ? AND direcao IN ('recebida', 'entrada') ORDER BY id DESC LIMIT 1",
        [empresaId]
      );
      if (ultimasMsg.length > 0) {
        ultima_mensagem_preview = ultimasMsg[0];
      }
    } catch (e) {
      mensagens_nao_lidas = 0;
      ultima_mensagem_preview = null;
    }

    // 5. Horários de Pico de Conexão (distribuição por hora nas últimas 24h ou 7 dias)
    const [picoRows] = await db.query(
      `SELECT HOUR(criado_em) as hora, COUNT(*) as conexoes
       FROM leads
       WHERE empresa_id = ? AND criado_em >= NOW() - INTERVAL 7 DAY
       GROUP BY HOUR(criado_em)
       ORDER BY hora ASC`,
      [empresaId]
    );

    // Preenche 24 horas (00:00 - 23:00)
    const horarios_pico = Array.from({ length: 24 }, (_, i) => {
      const match = picoRows.find(r => r.hora === i);
      return {
        hora: `${String(i).padStart(2, '0')}:00`,
        conexoes: match ? Number(match.conexoes) : 0
      };
    });

    // 6. Canais de Captura (Consolidados e Agrupados por Categoria)
    const [canaisRows] = await db.query(
      `SELECT origem, COUNT(*) as total
       FROM leads
       WHERE empresa_id = ?
       GROUP BY origem`,
      [empresaId]
    );

    const mapCanais = {
      'Formulário Direto': { raw_origem: 'direto', total: 0 },
      'Google Sign-In': { raw_origem: 'social_google', total: 0 },
      'Facebook Login': { raw_origem: 'social_facebook', total: 0 },
      'Captura Passiva': { raw_origem: 'passivo', total: 0 }
    };

    let totalOrigens = 0;
    canaisRows.forEach(r => {
      const count = Number(r.total) || 0;
      totalOrigens += count;
      if (r.origem === 'social_google') {
        mapCanais['Google Sign-In'].total += count;
      } else if (r.origem === 'social_facebook') {
        mapCanais['Facebook Login'].total += count;
      } else if (r.origem === 'passivo') {
        mapCanais['Captura Passiva'].total += count;
      } else {
        mapCanais['Formulário Direto'].total += count;
      }
    });

    const canais_captura = Object.entries(mapCanais)
      .filter(([_, data]) => data.total > 0)
      .map(([nome, data]) => ({
        origem: nome,
        raw_origem: data.raw_origem,
        total: data.total,
        pct: totalOrigens > 0 ? Math.round((data.total / totalOrigens) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    // 7. Últimas Sessões de Conexão Reais (radacct + enriquecimento de dados sem duplicatas)
    const [ultimas_sessoes] = await db.query(
      `SELECT 
         ra.radacctid,
         ra.username,
         ra.callingstationid AS mac,
         ra.framedipaddress AS ip,
         ra.acctstarttime AS conectado_em,
         ra.acctstoptime AS desconectado_em,
         ra.acctsessiontime AS tempo_sessao,
         COALESCE(l.nome, v.codigo, ra.username) AS nome,
         l.telefone,
         l.email,
         CASE 
           WHEN ra.acctstoptime IS NULL THEN 'ativo'
           ELSE 'encerrado'
         END AS status_sessao
       FROM radacct ra
       JOIN radius_users ru ON ru.username COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci
       LEFT JOIN (
         SELECT mac, nome, telefone, email, empresa_id
         FROM (
           SELECT mac, nome, telefone, email, empresa_id,
                  ROW_NUMBER() OVER (PARTITION BY mac, empresa_id ORDER BY id DESC) as rn
           FROM leads
         ) l_sub
         WHERE rn = 1
       ) l ON l.mac COLLATE utf8mb4_unicode_ci = ra.callingstationid COLLATE utf8mb4_unicode_ci
         AND l.empresa_id = ru.empresa_id
       LEFT JOIN vouchers v ON v.codigo COLLATE utf8mb4_unicode_ci = ra.username COLLATE utf8mb4_unicode_ci
         AND v.empresa_id = ru.empresa_id
       WHERE ru.empresa_id = ?
       ORDER BY ra.acctstarttime DESC
       LIMIT 10`,
      [empresaId]
    );

    // 8. Cupons Mais Resgatados
    let cupons_populares = [];
    try {
      const [cuponsData] = await db.query(
        `SELECT c.titulo, COUNT(cr.id) as total_resgates
         FROM cupons c
         JOIN cupons_resgatados cr ON cr.cupom_id = c.id
         WHERE c.empresa_id = ?
         GROUP BY c.id
         ORDER BY total_resgates DESC
         LIMIT 5`,
        [empresaId]
      );
      cupons_populares = cuponsData;
    } catch (e) {
      cupons_populares = [];
    }

    // 9. Score NPS
    let nps_info = null;
    try {
      const [[npsData]] = await db.query(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN nota >= 9 THEN 1 ELSE 0 END) as promotores,
           SUM(CASE WHEN nota <= 6 THEN 1 ELSE 0 END) as detratores
         FROM nps_respostas 
         WHERE empresa_id = ?`,
        [empresaId]
      );
      if (npsData && Number(npsData.total) > 0) {
        const totalNps = Number(npsData.total);
        const promotores = Number(npsData.promotores) || 0;
        const detratores = Number(npsData.detratores) || 0;
        const score = Math.round(((promotores - detratores) / totalNps) * 100);
        let status = 'Zona de Aperfeiçoamento';
        if (score >= 75) status = 'Zona de Excelência';
        else if (score >= 50) status = 'Zona de Qualidade';
        nps_info = { score, total: totalNps, status };
      }
    } catch (e) { }

    res.json({
      kpis: {
        conectados_agora: Number(totalConectados),
        leads_hoje: Number(leads_hoje),
        leads_mes: Number(leads_mes),
        leads_total: Number(leads_total),
        vendas_hoje: Number(vendas_hoje),
        vendas_mes: Number(vendas_mes),
        disparos_whatsapp: Number(disparos_whatsapp),
        mensagens_nao_lidas: Number(mensagens_nao_lidas),
        ultima_mensagem_preview,
        nps_info
      },
      horarios_pico,
      canais_captura,
      ultimas_sessoes,
      cupons_populares
    });
  } catch (err) {
    console.error("Erro no dashboard:", err);
    res.status(500).json({ message: "Erro ao buscar dados do dashboard" });
  }
};
