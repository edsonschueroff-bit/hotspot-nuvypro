import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { PageHeader } from "@/components/ui";
import AdminLayout from "../../components/admin/AdminLayout";

export default function NpsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [periodo, setPeriodo] = useState("30");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    fetchNps();
    // eslint-disable-next-line
  }, [periodo, user?.empresa_slug]);

  const fetchNps = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/nps?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar NPS:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreTheme = (score, total) => {
    if (!total || total === 0) {
      return {
        bg: "bg-slate-50",
        border: "border-[#e2e8f0]",
        text: "text-slate-700",
        accent: "bg-slate-400",
        badgeBg: "bg-slate-100",
        badgeText: "text-slate-600",
        badgeBorder: "border-slate-200",
        title: "Aguardando Avaliações",
        desc: "Envie pesquisas para começar a medir a satisfação"
      };
    }
    if (score >= 75) {
      return {
        bg: "bg-[#ecfdf5]",
        border: "border-[#a7f3d0]",
        text: "text-[#065f46]",
        accent: "bg-[#10b981]",
        badgeBg: "bg-[#d1fae5]",
        badgeText: "text-[#047857]",
        badgeBorder: "border-[#6ee7b7]",
        title: "Zona de Excelência",
        desc: "Clientes altamente satisfeitos e promotores da sua marca"
      };
    }
    if (score >= 50) {
      return {
        bg: "bg-[#eff6ff]",
        border: "border-[#bfdbfe]",
        text: "text-[#1e40af]",
        accent: "bg-[#2563eb]",
        badgeBg: "bg-[#dbeafe]",
        badgeText: "text-[#1d4ed8]",
        badgeBorder: "border-[#93c5fd]",
        title: "Zona de Qualidade",
        desc: "Boa percepção geral com oportunidades pontuais"
      };
    }
    if (score >= 0) {
      return {
        bg: "bg-[#fffbeb]",
        border: "border-[#fde68a]",
        text: "text-[#92400e]",
        accent: "bg-[#f59e0b]",
        badgeBg: "bg-[#fef3c7]",
        badgeText: "text-[#b45309]",
        badgeBorder: "border-[#fcd34d]",
        title: "Zona de Aperfeiçoamento",
        desc: "Atenção necessária para converter neutros em promotores"
      };
    }
    return {
      bg: "bg-[#fef2f2]",
      border: "border-[#fecaca]",
      text: "text-[#991b1b]",
      accent: "bg-[#ef4444]",
      badgeBg: "bg-[#fee2e2]",
      badgeText: "text-[#b91c1c]",
      badgeBorder: "border-[#fca5a5]",
      title: "Zona Crítica",
      desc: "Urgente: Alto índice de insatisfação exigindo ação corretiva"
    };
  };

  // Exportar CSV
  const exportarCsv = () => {
    if (!data?.recentes || data.recentes.length === 0) return;
    let csv = "Data,Cliente,Telefone,Nota,Classificacao,Comentario\n";
    data.recentes.forEach(r => {
      const classif = r.nota >= 9 ? "Promotor" : r.nota >= 7 ? "Neutro" : "Detrator";
      csv += `"${new Date(r.criado_em).toLocaleString('pt-BR')}","${r.cliente_nome || 'Visitante'}","${r.telefone || ''}",${r.nota},"${classif}","${(r.comentario || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nps-avaliacoes-${periodo}d.csv`;
    a.click();
  };

  const abrirWhatsApp = (telefone, nome, nota) => {
    if (!telefone) return;
    const numLimpo = telefone.replace(/\D/g, "");
    const telFormatado = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;
    let msg = "";
    if (nota >= 9) {
      msg = `Olá ${nome || ''}! Ficamos muito felizes com a sua nota ${nota} e avaliação positiva sobre nosso atendimento e Wi-Fi! Muito obrigado pelo carinho! 😊`;
    } else if (nota <= 6) {
      msg = `Olá ${nome || ''}! Vimos que você nos avaliou com nota ${nota}. Gostaríamos muito de entender o que aconteceu e como podemos melhorar sua experiência!`;
    } else {
      msg = `Olá ${nome || ''}! Obrigado pelo seu feedback (nota ${nota}). Estamos sempre trabalhando para melhorar nossos serviços!`;
    }
    window.open(`https://wa.me/${telFormatado}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const total = data?.total || 0;
  const score = data?.score || 0;
  const dist = data?.distribuicao || { promotores: 0, neutros: 0, detratores: 0, promotores_pct: 0, neutros_pct: 0, detratores_pct: 0 };
  const theme = getScoreTheme(score, total);

  // SVG Chart Calculation
  const historyData = data?.historico_diario || [];
  const maxHistory = Math.max(...historyData.map(d => d.total), 4);
  const chartWidth = 650;
  const chartHeight = 160;
  const paddingX = 20;
  const paddingY = 20;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = historyData.map((d, index) => {
    const x = paddingX + (index / Math.max(historyData.length - 1, 1)) * usableWidth;
    const y = chartHeight - paddingY - (d.total / maxHistory) * usableHeight;
    return { x, y, ...d };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "")
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : "";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <PageHeader
          icon={
            <svg className="w-6 h-6 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="NPS - Satisfação dos Clientes"
          subtitle="Acompanhe a métrica Net Promoter Score, distribuição de promotores e feedback pós-conexão"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-white border border-[#e2e8f0] text-slate-700 text-[12px] font-600 rounded-md px-3.5 py-1.5 shadow-2xs focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] cursor-pointer"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
              <button
                onClick={exportarCsv}
                disabled={!data?.recentes?.length}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-600 transition-colors flex items-center gap-1.5 shadow-2xs ${data?.recentes?.length ? 'bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] text-slate-700 hover:bg-[#f8fafc] cursor-pointer' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
              >
                <svg className="w-3.5 h-3.5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar CSV
              </button>
            </div>
          }
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[10px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] gap-3">
            <div className="w-8 h-8 border-[3px] border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[12px] text-slate-400 font-500">Calculando índice de satisfação...</p>
          </div>
        ) : data ? (
          <>
            {/* ================================================================
                TOP METRICS: GAUGE SCORE + 3 DISTRIBUTION CARDS
                ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              
              {/* Score Global Card */}
              <div className={`bg-white border ${theme.border} rounded-[10px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden flex flex-col justify-between`}>
                <div className={`absolute top-0 left-0 w-[4px] h-full ${theme.accent}`} />
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-700 uppercase tracking-wider text-slate-400">Score Global</span>
                    <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                      {theme.title}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 my-2">
                    <span className={`text-[44px] font-800 tracking-tight leading-none ${theme.text}`}>
                      {total > 0 ? (score > 0 ? `+${score}` : score) : "--"}
                    </span>
                    <span className="text-[12px] text-slate-400 font-500">de -100 a +100</span>
                  </div>

                  {/* NPS Gauge Bar */}
                  <div className="mt-4 mb-2">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-red-400 w-1/4" title="Crítica: -100 a -1"></div>
                      <div className="h-full bg-amber-400 w-1/4" title="Aperfeiçoamento: 0 a 49"></div>
                      <div className="h-full bg-blue-400 w-1/4" title="Qualidade: 50 a 74"></div>
                      <div className="h-full bg-emerald-500 w-1/4" title="Excelência: 75 a 100"></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-500 mt-1">
                      <span>-100</span>
                      <span>0</span>
                      <span>50</span>
                      <span>75</span>
                      <span>+100</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-slate-500">
                  <span>Nota Média: <strong className="text-slate-800">{data.media_nota > 0 ? `${data.media_nota} / 10` : "--"}</strong></span>
                  <span>Total: <strong className="text-slate-800">{total}</strong></span>
                </div>
              </div>

              {/* Card 2: Promotores (9-10) */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-[#10b981]" />
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-md bg-[#ecfdf5] flex items-center justify-center text-base">
                      🟢
                    </div>
                    <span className="text-[10px] font-700 text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full">
                      {dist.promotores_pct}% da base
                    </span>
                  </div>
                  <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Promotores (Notas 9-10)</p>
                  <p className="text-[32px] font-700 text-slate-900 leading-none">{dist.promotores}</p>
                  <p className="text-[12px] text-slate-500 mt-2">Clientes leais que recomendam</p>
                </div>

                <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mt-3">
                  <div style={{ width: `${dist.promotores_pct}%` }} className="h-full bg-[#10b981] rounded-full" />
                </div>
              </div>

              {/* Card 3: Neutros (7-8) */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-[#f59e0b]" />
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-md bg-[#fffbeb] flex items-center justify-center text-base">
                      🟡
                    </div>
                    <span className="text-[10px] font-700 text-[#d97706] bg-[#fffbeb] border border-[#fde68a] px-2 py-0.5 rounded-full">
                      {dist.neutros_pct}% da base
                    </span>
                  </div>
                  <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Neutros (Notas 7-8)</p>
                  <p className="text-[32px] font-700 text-slate-900 leading-none">{dist.neutros}</p>
                  <p className="text-[12px] text-slate-500 mt-2">Satisfeitos, porém vulneráveis</p>
                </div>

                <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mt-3">
                  <div style={{ width: `${dist.neutros_pct}%` }} className="h-full bg-[#f59e0b] rounded-full" />
                </div>
              </div>

              {/* Card 4: Detratores (0-6) */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-[#ef4444]" />
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-md bg-[#fef2f2] flex items-center justify-center text-base">
                      🔴
                    </div>
                    <span className="text-[10px] font-700 text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] px-2 py-0.5 rounded-full">
                      {dist.detratores_pct}% da base
                    </span>
                  </div>
                  <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Detratores (Notas 0-6)</p>
                  <p className="text-[32px] font-700 text-slate-900 leading-none">{dist.detratores}</p>
                  <p className="text-[12px] text-slate-500 mt-2">Insatisfeitos com risco de perda</p>
                </div>

                <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mt-3">
                  <div style={{ width: `${dist.detratores_pct}%` }} className="h-full bg-[#ef4444] rounded-full" />
                </div>
              </div>

            </div>

            {/* ================================================================
                MIDDLE SECTION: TENDÊNCIA TEMPORAL & GUIA METODOLÓGICO
                ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Left (2/3): Evolução Temporal */}
              <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[15px] font-600 text-slate-900">Volume de Avaliações no Período</h2>
                      <p className="text-[12px] text-slate-500 mt-0.5">Respostas recebidas dia a dia</p>
                    </div>
                    <span className="text-[11px] font-500 text-slate-500 bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 rounded-md">
                      {total} respostas coletadas
                    </span>
                  </div>

                  {/* SVG Chart */}
                  <div className="relative w-full overflow-hidden">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
                      <defs>
                        <linearGradient id="npsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[0.33, 0.66, 1].map((ratio, idx) => {
                        const y = chartHeight - paddingY - ratio * usableHeight;
                        return (
                          <g key={idx}>
                            <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                            <text x={paddingX} y={y - 3} fill="#94a3b8" fontSize="9" fontFamily="inherit">
                              {Math.round(ratio * maxHistory)}
                            </text>
                          </g>
                        );
                      })}

                      {areaD && <path d={areaD} fill="url(#npsGradient)" />}
                      {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                      {points.map((p, idx) => (
                        <g key={idx} className="cursor-pointer">
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={hoveredPoint?.data === p.data ? 5.5 : p.total > 0 ? 3.5 : 2}
                            className={`transition-all ${p.total > 0 ? 'fill-[#10b981] stroke-white stroke-2' : 'fill-slate-300'}`}
                            onMouseEnter={() => setHoveredPoint(p)}
                          />
                        </g>
                      ))}
                    </svg>

                    {hoveredPoint && (
                      <div className="absolute top-2 right-2 bg-slate-900 text-white text-[11px] py-1.5 px-3 rounded-md shadow-lg pointer-events-none flex items-center gap-2 z-10">
                        <span className="font-600 text-emerald-300">{new Date(hoveredPoint.data).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span><strong className="text-white">{hoveredPoint.total}</strong> avaliações</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-500 border-t border-[#f1f5f9] pt-2 mt-2">
                  {points.length > 0 && (
                    <>
                      <span>{new Date(points[0].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                      {points.length > 10 && (
                        <span>{new Date(points[Math.floor(points.length / 2)].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                      )}
                      <span>{new Date(points[points.length - 1].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right (1/3): Como Funciona o NPS */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between">
                <div>
                  <div className="pb-4 border-b border-[#e2e8f0] mb-3">
                    <h2 className="text-[15px] font-600 text-slate-900">Como funciona o NPS?</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">Metodologia padrão mundial</p>
                  </div>

                  <div className="space-y-2.5 text-[12px]">
                    <div className="p-2.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-md text-[#065f46]">
                      <strong className="font-700">75 a 100 • Excelência:</strong> Encantamento total e retenção orgânica de clientes.
                    </div>
                    <div className="p-2.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-md text-[#1e40af]">
                      <strong className="font-700">50 a 74 • Qualidade:</strong> Boa experiência com espaço para surpreender o cliente.
                    </div>
                    <div className="p-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-md text-[#92400e]">
                      <strong className="font-700">0 a 49 • Aperfeiçoamento:</strong> Requer análise de pontos de atrito no atendimento.
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-[#f1f5f9]">
                  Fórmula: <code>% Promotores - % Detratores</code>
                </p>
              </div>

            </div>

            {/* ================================================================
                BOTTOM SECTION: TABELA DE FEEDBACKS COM AÇÃO WHATSAPP
                ================================================================ */}
            <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-600 text-slate-900">Feedbacks & Avaliações Recebidas ({total})</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">Respostas individuais coletadas pós-conexão no captive portal</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#f8fafc] text-[11px] uppercase text-slate-500 font-700 border-b border-[#e2e8f0]">
                    <tr>
                      <th className="px-5 py-3">Data / Hora</th>
                      <th className="px-5 py-3">Cliente / Telefone</th>
                      <th className="px-5 py-3 text-center">Nota</th>
                      <th className="px-5 py-3">Classificação</th>
                      <th className="px-5 py-3">Comentário</th>
                      <th className="px-5 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {data.recentes?.length > 0 ? (
                      data.recentes.map((item) => (
                        <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 text-[12px]">
                            {new Date(item.criado_em).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-600 text-slate-900 text-[13px]">{item.cliente_nome || "Visitante"}</span>
                            {item.telefone && (
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.telefone}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-800 text-[13px] ${item.nota >= 9 ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' : item.nota >= 7 ? 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]' : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'}`}>
                              {item.nota}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {item.nota >= 9 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-700 bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                                🟢 Promotor
                              </span>
                            ) : item.nota >= 7 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-700 bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
                                🟡 Neutro
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-700 bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
                                🔴 Detrator
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-slate-600 max-w-xs truncate">
                            {item.comentario ? `"${item.comentario}"` : <span className="text-slate-300 italic">Sem comentário adicional</span>}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            {item.telefone ? (
                              <button
                                onClick={() => abrirWhatsApp(item.telefone, item.cliente_nome, item.nota)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-600 transition-colors flex items-center gap-1 ml-auto cursor-pointer ${item.nota <= 6 ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] hover:bg-[#fee2e2]' : 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] hover:bg-[#d1fae5]'}`}
                                title="Responder ou agradecer no WhatsApp"
                              >
                                <span>💬</span>
                                {item.nota <= 6 ? 'Recuperar' : 'Agradecer'}
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[11px]">Sem telefone</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-5 py-12 text-center text-slate-400 text-[13px]">
                          <div className="max-w-md mx-auto space-y-2">
                            <span className="text-3xl">⭐</span>
                            <p className="font-600 text-slate-700">Nenhuma avaliação recebida neste período</p>
                            <p className="text-[12px] text-slate-400">
                              As pesquisas de satisfação enviadas após o login no Wi-Fi aparecerão aqui automaticamente com as notas e comentários dos clientes.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#e2e8f0] rounded-[10px] text-slate-500 shadow-sm">
            <p className="text-[13px]">Nenhum dado encontrado para o período selecionado.</p>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}