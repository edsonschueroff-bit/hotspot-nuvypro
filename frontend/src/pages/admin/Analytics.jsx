import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { PageHeader } from "@/components/ui";
import AdminLayout from "../../components/admin/AdminLayout";

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [periodo, setPeriodo] = useState("30");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line
  }, [periodo, user?.empresa_slug]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/analytics?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0 min";
    const hours = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = seconds % 60;
    if (hours > 0) return `${hours}h ${min}m`;
    if (min === 0) return `${sec}s`;
    return `${min}m ${sec}s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 MB";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i <= 0) return `${bytes} B`;
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Helper Heatmap
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const getHeatmapColor = (count, max) => {
    if (count === 0) return "bg-[#f8fafc] border border-[#f1f5f9]";
    const ratio = count / (max || 1);
    if (ratio < 0.25) return "bg-[#dbeafe] border border-[#bfdbfe]";
    if (ratio < 0.5) return "bg-[#93c5fd] border border-[#60a5fa]";
    if (ratio < 0.75) return "bg-[#3b82f6] border border-[#2563eb] text-white";
    return "bg-[#1d4ed8] border border-[#1e40af] text-white font-700 shadow-xs";
  };

  const maxHeatmap = data?.heatmap_horarios?.length
    ? Math.max(...data.heatmap_horarios.map(h => h.total_conexoes), 1)
    : 1;

  const heatmapGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
  if (data?.heatmap_horarios) {
    data.heatmap_horarios.forEach(h => {
      if (h.dia_semana >= 1 && h.dia_semana <= 7 && h.hora_dia >= 0 && h.hora_dia <= 23) {
        heatmapGrid[h.dia_semana - 1][h.hora_dia] = h.total_conexoes;
      }
    });
  }

  // Exportar CSV
  const exportarCsv = () => {
    if (!data?.grafico_diario) return;
    let csv = "Data,Visitantes Unicos,Total de Conexoes\n";
    data.grafico_diario.forEach(d => {
      csv += `${d.data},${d.visitantes_unicos},${d.total_conexoes}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-visitantes-${periodo}d.csv`;
    a.click();
  };

  // Cálculo do Gráfico SVG de Área
  const dailyData = data?.grafico_diario || [];
  const maxVal = Math.max(...dailyData.map(d => d.visitantes_unicos), 5);
  const chartWidth = 700;
  const chartHeight = 180;
  const paddingX = 20;
  const paddingY = 20;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = dailyData.map((d, index) => {
    const x = paddingX + (index / Math.max(dailyData.length - 1, 1)) * usableWidth;
    const y = chartHeight - paddingY - (d.visitantes_unicos / maxVal) * usableHeight;
    return { x, y, ...d };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "")
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : "";

  const kpis = data?.kpis || {};
  const pico = data?.pico_insight;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header da Página */}
        <PageHeader
          icon={
            <svg className="w-6 h-6 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="Analytics de Visitantes"
          subtitle="Inteligência de tráfego, recorrência, dwell time e horários de pico na rede Wi-Fi"
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
                className="px-3.5 py-1.5 bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] rounded-md text-[12px] font-600 text-slate-700 hover:bg-[#f8fafc] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
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
            <p className="text-[12px] text-slate-400 font-500">Compilando estatísticas de conexões...</p>
          </div>
        ) : data ? (
          <>
            {/* ================================================================
                TOP 4 CARDS KPIS — Precision Light
                ================================================================ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Visitantes Únicos */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-[#2563eb]" />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-md bg-[#eff6ff] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-600 text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full border border-[#bfdbfe]">
                    {kpis.total_conexoes} conexões
                  </span>
                </div>
                <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Visitantes Únicos</p>
                <p className="text-[32px] font-700 text-slate-900 leading-none">{kpis.visitantes_unicos}</p>
                <p className="text-[12px] text-slate-500 mt-2">Dispositivos diferentes no Wi-Fi</p>
              </div>

              {/* Card 2: Novos vs Recorrentes */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-[#10b981]" />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-md bg-[#ecfdf5] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-600 text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
                    {kpis.visitantes_unicos > 0 ? Math.round((kpis.visitantes_novos / kpis.visitantes_unicos) * 100) : 0}% Novos
                  </span>
                </div>
                <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Novos Cadastros</p>
                <p className="text-[32px] font-700 text-slate-900 leading-none">{kpis.visitantes_novos}</p>
                <p className="text-[12px] text-slate-500 mt-2">
                  <strong className="font-600 text-slate-700">{kpis.visitantes_recorrentes}</strong> clientes recorrentes
                </p>
              </div>

              {/* Card 3: Tempo Médio de Permanência */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-[#6366f1]" />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-md bg-[#eef2ff] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-600 text-[#6366f1] bg-[#eef2ff] px-2 py-0.5 rounded-full border border-[#c7d2fe]">
                    Dwell Time
                  </span>
                </div>
                <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Tempo Médio Conectado</p>
                <p className="text-[28px] font-700 text-slate-900 leading-none">{formatTime(kpis.tempo_medio_segundos)}</p>
                <p className="text-[12px] text-slate-500 mt-2">Média de permanência por sessão</p>
              </div>

              {/* Card 4: Tráfego de Dados */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-[#0284c7]" />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-md bg-[#f0f9ff] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0284c7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-600 text-[#0284c7] bg-[#f0f9ff] px-2 py-0.5 rounded-full border border-[#bae6fd]">
                    Consumo Wi-Fi
                  </span>
                </div>
                <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Tráfego de Dados</p>
                <p className="text-[28px] font-700 text-slate-900 leading-none">{formatBytes(kpis.total_bytes)}</p>
                <p className="text-[12px] text-slate-500 mt-2">
                  ↓ {formatBytes(kpis.total_bytes_download)} • ↑ {formatBytes(kpis.total_bytes_upload)}
                </p>
              </div>

            </div>

            {/* ================================================================
                MAIN CHARTS GRID — 2 Columns
                ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Left Column (2/3): Gráfico Diário de Área Suave */}
              <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[15px] font-600 text-slate-900">Evolução de Visitantes no Período</h2>
                      <p className="text-[12px] text-slate-500 mt-0.5">Dispositivos únicos conectados dia a dia</p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                        Visitantes Únicos
                      </span>
                    </div>
                  </div>

                  {/* SVG Area Chart */}
                  <div className="relative w-full overflow-hidden">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-48 overflow-visible"
                    >
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Horizontal Lines */}
                      {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = chartHeight - paddingY - ratio * usableHeight;
                        return (
                          <g key={idx}>
                            <line
                              x1={paddingX}
                              y1={y}
                              x2={chartWidth - paddingX}
                              y2={y}
                              stroke="#f1f5f9"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={paddingX}
                              y={y - 3}
                              fill="#94a3b8"
                              fontSize="9"
                              fontFamily="inherit"
                            >
                              {Math.round(ratio * maxVal)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      {areaD && <path d={areaD} fill="url(#areaGradient)" />}

                      {/* Line Stroke */}
                      {pathD && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Interactive Points */}
                      {points.map((p, idx) => (
                        <g key={idx} className="cursor-pointer">
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={hoveredPoint?.data === p.data ? 5.5 : p.visitantes_unicos > 0 ? 3.5 : 2}
                            className={`transition-all ${p.visitantes_unicos > 0 ? 'fill-[#2563eb] stroke-white stroke-2' : 'fill-slate-300'}`}
                            onMouseEnter={() => setHoveredPoint(p)}
                          />
                        </g>
                      ))}
                    </svg>

                    {/* Tooltip Flutuante */}
                    {hoveredPoint && (
                      <div
                        className="absolute top-2 right-2 bg-slate-900 text-white text-[11px] py-1.5 px-3 rounded-md shadow-lg pointer-events-none flex items-center gap-2 z-10"
                      >
                        <span className="font-600 text-blue-300">{new Date(hoveredPoint.data).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span><strong className="text-white">{hoveredPoint.visitantes_unicos}</strong> únicos</span>
                        <span>({hoveredPoint.total_conexoes} conexões)</span>
                      </div>
                    )}
                  </div>
                </div>

                  {/* Dates footer */}
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

              {/* Right Column (1/3): Retenção & Fidelidade */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between">
                <div>
                  <div className="pb-4 border-b border-[#e2e8f0] mb-4">
                    <h2 className="text-[15px] font-600 text-slate-900">Retenção & Fidelização</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">Comportamento de retorno no Wi-Fi</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[12px] font-600 text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                          Novos Visitantes (1ª Conexão)
                        </span>
                        <span className="text-slate-900">{kpis.visitantes_novos} ({kpis.visitantes_unicos > 0 ? Math.round((kpis.visitantes_novos / kpis.visitantes_unicos) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${kpis.visitantes_unicos > 0 ? (kpis.visitantes_novos / kpis.visitantes_unicos) * 100 : 0}%` }}
                          className="h-full bg-[#10b981] rounded-full"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[12px] font-600 text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                          Visitantes Recorrentes (Fidelizados)
                        </span>
                        <span className="text-slate-900">{kpis.visitantes_recorrentes} ({kpis.visitantes_unicos > 0 ? Math.round((kpis.visitantes_recorrentes / kpis.visitantes_unicos) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${kpis.visitantes_unicos > 0 ? (kpis.visitantes_recorrentes / kpis.visitantes_unicos) * 100 : 0}%` }}
                          className="h-full bg-[#f59e0b] rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-md mt-4 text-[12px] text-slate-600 flex items-center justify-between">
                  <div>
                    <p className="font-600 text-slate-800">Taxa de Retorno</p>
                    <p className="text-[11px] text-slate-400">Clientes que voltaram ao local</p>
                  </div>
                  <span className="text-[18px] font-800 text-[#2563eb]">
                    {kpis.taxa_retencao_pct}%
                  </span>
                </div>
              </div>

            </div>

            {/* ================================================================
                BOTTOM SECTION: Heatmap & Top Visitantes
                ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Left Column (2/3): Mapa de Calor com Insight Inteligente */}
              <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[15px] font-600 text-slate-900">Mapa de Calor: Horários de Pico</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">Densidade de conexões por dia da semana e horário</p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-500 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-slate-500">
                    24 Horas
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="min-w-[620px]">
                    <div className="grid grid-cols-[36px_1fr] gap-2">
                      {/* Dias da semana */}
                      <div className="flex flex-col justify-between text-[11px] font-600 text-slate-400 pt-5 pb-1">
                        {diasSemana.map(d => (
                          <div key={d} className="h-6 flex items-center">{d}</div>
                        ))}
                      </div>

                      {/* Grade */}
                      <div>
                        {/* Horas */}
                        <div className="flex mb-1.5">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="flex-1 text-center text-[9px] text-slate-400 font-500">
                              {i % 2 === 0 ? `${i}h` : ''}
                            </div>
                          ))}
                        </div>

                        {/* Células */}
                        <div className="flex flex-col gap-1">
                          {heatmapGrid.map((row, dayIdx) => (
                            <div key={dayIdx} className="flex gap-1 h-6">
                              {row.map((count, hourIdx) => (
                                <div
                                  key={hourIdx}
                                  title={`${diasSemana[dayIdx]} às ${hourIdx}:00 — ${count} conexões`}
                                  className={`flex-1 rounded-[4px] ${getHeatmapColor(count, maxHeatmap)} transition-all hover:scale-115 hover:z-10 cursor-pointer flex items-center justify-center text-[9px]`}
                                >
                                  {count > 0 && maxHeatmap > 3 && count >= maxHeatmap * 0.7 ? count : ''}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Legenda & Insight */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f1f5f9] text-[11px]">
                      {pico ? (
                        <div className="flex items-center gap-2 text-slate-700">
                          <span className="text-amber-500">💡</span>
                          <span><strong>Pico Principal:</strong> {pico.dia_nome} às {pico.hora} ({pico.total} conexões)</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Distribuição uniforme de tráfego</span>
                      )}

                      <div className="flex items-center gap-2 text-slate-400">
                        <span>Menos tráfego</span>
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-[3px] bg-[#f8fafc] border border-[#f1f5f9]"></div>
                          <div className="w-3 h-3 rounded-[3px] bg-[#dbeafe]"></div>
                          <div className="w-3 h-3 rounded-[3px] bg-[#93c5fd]"></div>
                          <div className="w-3 h-3 rounded-[3px] bg-[#3b82f6]"></div>
                          <div className="w-3 h-3 rounded-[3px] bg-[#1d4ed8]"></div>
                        </div>
                        <span>Mais tráfego</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (1/3): Top Clientes Mais Frequentes */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between">
                <div>
                  <div className="pb-4 border-b border-[#e2e8f0] mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-600 text-slate-900">Top Clientes Assíduos</h2>
                      <p className="text-[12px] text-slate-500 mt-0.5">Mais conexões no período</p>
                    </div>
                    <span className="text-[10px] font-700 text-[#2563eb] bg-[#eff6ff] border border-[#bfdbfe] px-2 py-0.5 rounded-full">
                      Ranking
                    </span>
                  </div>

                  <div className="space-y-3">
                    {data?.top_visitantes?.length > 0 ? (
                      data.top_visitantes.map((v, idx) => (
                        <div key={idx} className="p-3 bg-[#f8fafc] rounded-md border border-[#e2e8f0] flex items-center justify-between hover:bg-[#f1f5f9] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#eff6ff] text-[#2563eb] font-700 text-[10px] flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </div>
                            <div>
                              <p className="text-[12px] font-600 text-slate-800 truncate max-w-[120px]">
                                {v.nome !== 'Visitante' ? v.nome : (v.telefone || v.mac.slice(-5))}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatTime(v.tempo_total_segundos)} total
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 text-[11px] font-700 rounded-md bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]">
                            {v.total_visitas} {v.total_visitas === 1 ? 'visita' : 'visitas'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] text-slate-400 text-center py-6">Nenhum visitante registrado no período.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#f1f5f9] text-center">
                  <span className="text-[11px] text-slate-400">Dados calculados por endereço MAC e identificação de login</span>
                </div>
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