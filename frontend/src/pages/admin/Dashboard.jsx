import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";

export default function Dashboard() {
  const { isSuperAdmin, switchEmpresa } = useAuth();
  const [dados, setDados] = useState(null);
  const [saasStats, setSaasStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [ultimAtualizacao, setUltimaAtualizacao] = useState("");
  const token = localStorage.getItem("admin_token");
  const { empresaSlug } = useParams();
  const navigate = useNavigate();

  // Dicas persistentes
  const [dicasConcluidas, setDicasConcluidas] = useState(() => {
    try {
      const saved = localStorage.getItem("dicas_dashboard_concluidas");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [indexDica, setIndexDica] = useState(0);

  const listaDicas = [
    {
      id: "novidade_social_auth",
      tipo: "novidade",
      badge: "✨ NOVIDADE",
      icon: "⚡",
      titulo: "Login Social 1-Clique OAuth (Google e Facebook)",
      descricao: "Seus clientes se conectam no Wi-Fi em 1 toque! O sistema captura Nome e E-mail reais para seu CRM.",
      botaoTexto: "Configurar OAuth →",
      link: empresaSlug ? `/admin/${empresaSlug}/configuracoes` : "/admin"
    },
    {
      id: "conectar_whatsapp",
      tipo: "dica",
      badge: "💡 PASSO 1",
      icon: "📱",
      titulo: "Conecte seu WhatsApp para Automações",
      descricao: "Envie mensagens automáticas de boas-vindas, cupons e pesquisas aos clientes assim que entrarem no Wi-Fi.",
      botaoTexto: "Conectar WhatsApp →",
      link: empresaSlug ? `/admin/${empresaSlug}/whatsapp` : "/admin"
    },
    {
      id: "personalizar_portal",
      tipo: "dica",
      badge: "💡 PASSO 2",
      icon: "🎨",
      titulo: "Personalize seu Portal de Login Wi-Fi",
      descricao: "Coloque sua marca, logo e cores no portal captive para criar uma experiência profissional.",
      botaoTexto: "Personalizar Portal →",
      link: empresaSlug ? `/admin/${empresaSlug}/portais` : "/admin"
    },
    {
      id: "criar_cupom",
      tipo: "dica",
      badge: "💡 PASSO 3",
      icon: "🏷️",
      titulo: "Crie sua Primeira Promoção / Cupom",
      descricao: "Ofereça um café grátis ou desconto exclusivo para quem se conectar no seu Wi-Fi.",
      botaoTexto: "Criar Cupom →",
      link: empresaSlug ? `/admin/${empresaSlug}/cupons` : "/admin"
    }
  ];

  const dicasAtivas = listaDicas.filter(d => !dicasConcluidas.includes(d.id));
  const indexDicaValido = indexDica % (dicasAtivas.length || 1);
  const dicaAtual = dicasAtivas[indexDicaValido] || dicasAtivas[0];

  const concluirDica = (id) => {
    const novoArray = [...dicasConcluidas, id];
    setDicasConcluidas(novoArray);
    try { localStorage.setItem("dicas_dashboard_concluidas", JSON.stringify(novoArray)); } catch (e) { }
  };

  const resetarDicas = () => {
    setDicasConcluidas([]);
    try { localStorage.removeItem("dicas_dashboard_concluidas"); } catch (e) { }
  };

  const carregarDados = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const promises = [fetch("/api/dashboard", { headers })];
      if (isSuperAdmin) {
        promises.push(fetch("/api/saas-faturas/stats", { headers }));
      }
      const [res, resSaas] = await Promise.all(promises);
      if (res && res.ok) {
        const json = await res.json();
        setDados(json);
        setUltimaAtualizacao(new Date().toLocaleTimeString("pt-BR"));
      } else if (!silencioso) {
        setErro("Erro ao carregar dados da Dashboard.");
      }
      if (resSaas && resSaas.ok) {
        setSaasStats(await resSaas.json());
      }
    } catch (err) {
      if (!silencioso) setErro("Erro de conexão ao carregar Dashboard");
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(false);
    const interval = setInterval(() => { carregarDados(true); }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const kpis = dados?.kpis || {};
  const maxConexoesHora = dados?.horarios_pico
    ? Math.max(...dados.horarios_pico.map(h => h.conexoes), 1)
    : 1;

  return (
    <AdminLayout>
      {/* ================================================================
          SUPER ADMIN — Painel SaaS Global
          ================================================================ */}
      {isSuperAdmin && (
        <div className="mb-7 bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Accent top bar */}
          <div className="h-[3px] bg-gradient-to-r from-[#2563eb] via-[#10b981] to-[#f97316]" />
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[6px] bg-[#eff6ff] text-[#2563eb] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-600 text-slate-900">Painel Super Admin — Gestão da Plataforma</h2>
                    <span className="px-2 py-0.5 text-[9px] font-700 uppercase tracking-wide rounded-full bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                      Acesso Global
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Acompanhe clientes em teste e a receita do sistema.
                  </p>
                </div>
              </div>
              <Link
                to="/super"
                className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[12px] font-600 transition-colors self-start sm:self-auto flex items-center gap-1.5"
              >
                Acessar Painel Global →
              </Link>
            </div>

            {/* SaaS KPI Mini Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-md bg-[#fffbeb] border border-[#fde68a]">
                <p className="text-[9px] uppercase tracking-wider font-700 text-amber-700">Em Trial</p>
                <p className="text-2xl font-700 text-amber-600 mt-1">{saasStats?.empresas_trial?.length || 0}</p>
                <p className="text-[10px] text-amber-600/80">empresas testando</p>
              </div>
              <div className="p-3.5 rounded-md bg-[#ecfdf5] border border-[#a7f3d0]">
                <p className="text-[9px] uppercase tracking-wider font-700 text-emerald-700">MRR</p>
                <p className="text-lg font-700 text-emerald-600 mt-1 leading-tight">
                  {saasStats?.mrr ? saasStats.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0'}
                </p>
                <p className="text-[10px] text-emerald-600/80">recorrência mensal</p>
              </div>
              <div className="p-3.5 rounded-md bg-[#eff6ff] border border-[#bfdbfe]">
                <p className="text-[9px] uppercase tracking-wider font-700 text-blue-700">Recebido</p>
                <p className="text-lg font-700 text-blue-600 mt-1 leading-tight">
                  {saasStats?.total_recebido_mes ? saasStats.total_recebido_mes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0'}
                </p>
                <p className="text-[10px] text-blue-600/80">este mês</p>
              </div>
              <div className="p-3.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="text-[9px] uppercase tracking-wider font-700 text-slate-500">Gateways</p>
                <p className="text-2xl font-700 text-slate-700 mt-1">{saasStats?.gateways?.total_gateways || 0}</p>
                <p className="text-[10px] text-slate-500">roteadores ativos</p>
              </div>
            </div>

            {/* Trial list */}
            {saasStats?.empresas_trial?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                <p className="text-[11px] font-600 text-amber-700 mb-2">⚡ Clientes em Período de Teste:</p>
                <div className="flex flex-wrap gap-2">
                  {saasStats.empresas_trial.map((t) => (
                    <div key={t.id} className="px-3 py-1.5 rounded-md bg-[#fffbeb] border border-[#fde68a] text-[11px] flex items-center gap-2">
                      <span className="font-600 text-amber-900">{t.nome}</span>
                      <span className="text-[10px] text-amber-600">({t.dias_restantes}d)</span>
                      <button
                        onClick={async () => {
                          try {
                            await switchEmpresa(t.id);
                            window.location.href = `/admin/${t.slug}`;
                          } catch (e) { }
                        }}
                        className="text-[10px] bg-[#f97316] hover:bg-[#ea6c0a] text-white px-2 py-0.5 rounded cursor-pointer transition-colors font-600"
                      >
                        Entrar →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          PAGE HEADER
          ================================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-1 text-[11px] font-600 rounded-full bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
              Painel de Desempenho
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-500 rounded-full bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-dot"></span>
              Tempo Real {ultimAtualizacao ? `· ${ultimAtualizacao}` : ""}
            </span>
          </div>
          <h1 className="text-[22px] font-700 text-slate-900 tracking-tight leading-snug">
            Visão Geral do Estabelecimento
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Movimento de clientes, captação de leads e vendas em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to={empresaSlug ? `/admin/${empresaSlug}/cupons` : "/admin"}
            className="px-3 py-1.5 bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] rounded-md text-[12px] font-600 text-slate-700 hover:bg-[#f8fafc] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span className="text-[#10b981]">🎟️</span>
            Validar Cupom
          </Link>
          <Link
            to={empresaSlug ? `/admin/${empresaSlug}/lgpd` : "/admin"}
            className="px-3 py-1.5 bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] rounded-md text-[12px] font-600 text-slate-700 hover:bg-[#f8fafc] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Ver Leads
          </Link>
          <Link
            to={empresaSlug ? `/admin/${empresaSlug}/cupons` : "/admin"}
            className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[12px] font-600 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Criar Cupom
          </Link>
        </div>
      </div>

      {erro && (
        <div className="mb-5 p-4 rounded-md bg-[#fef2f2] border border-[#fecaca] text-red-700 text-[13px] font-500">
          ⚠️ {erro}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 border-[3px] border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[12px] text-slate-400 font-500">Carregando métricas...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ================================================================
              KPI CARDS — Assimetric Layout
              ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Card 1: Conectados Agora — DESTAQUE */}
            <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden group hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-[#10b981]" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-md bg-[#ecfdf5] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-600 text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping"></span>
                  Ao vivo
                </span>
              </div>
              <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Conectados Agora</p>
              <p className="text-[36px] font-700 text-slate-900 leading-none">{kpis.conectados_agora || 0}</p>
              <p className="text-[12px] text-slate-500 mt-2">dispositivos no Wi-Fi</p>
            </div>

            {/* Card 2: Leads do Mês */}
            <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-[#2563eb]" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-md bg-[#eff6ff] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-[10px] font-600 text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full">
                  +{kpis.leads_hoje || 0} hoje
                </span>
              </div>
              <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Leads (Mês)</p>
              <p className="text-[36px] font-700 text-slate-900 leading-none">{kpis.leads_mes || 0}</p>
              <p className="text-[12px] text-slate-500 mt-2">Total na base: <strong className="font-600">{kpis.leads_total || 0}</strong></p>
            </div>

            {/* Card 3: Vendas do Mês */}
            <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow">
              <div className="absolute top-0 left-0 w-[3px] h-full bg-[#16a34a]" />
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-md bg-[#ecfdf5] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">Vendas (Mês)</p>
              <p className="text-[28px] font-700 text-slate-900 leading-none">
                R$ {(kpis.vendas_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[12px] text-slate-500 mt-2">
                R$ {(kpis.vendas_hoje || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} hoje
              </p>
            </div>

            {/* Card 4: WhatsApp CRM */}
            <Link
              to={empresaSlug ? `/admin/${empresaSlug}/crm` : "/admin"}
              className={`bg-white border rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all block group ${kpis.mensagens_nao_lidas > 0 ? 'border-[#a7f3d0]' : 'border-[#e2e8f0]'}`}
            >
              <div className={`absolute top-0 left-0 w-[3px] h-full ${kpis.mensagens_nao_lidas > 0 ? 'bg-[#10b981]' : 'bg-slate-200'}`} />
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${kpis.mensagens_nao_lidas > 0 ? 'bg-[#10b981]' : 'bg-[#ecfdf5]'}`}>
                  <svg className={`w-5 h-5 ${kpis.mensagens_nao_lidas > 0 ? 'text-white' : 'text-[#10b981]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                {kpis.mensagens_nao_lidas > 0 && (
                  <span className="text-[10px] font-700 text-white bg-[#10b981] px-2 py-0.5 rounded-full animate-pulse">
                    NÃO LIDAS
                  </span>
                )}
              </div>
              <p className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1">WhatsApp CRM</p>
              <p className="text-[36px] font-700 text-slate-900 leading-none">{kpis.mensagens_nao_lidas || 0}</p>
              {kpis.mensagens_nao_lidas > 0 ? (
                <p className="text-[11px] font-600 text-[#10b981] mt-2 truncate flex items-center gap-1">
                  <span>💬</span>
                  {kpis.ultima_mensagem_preview?.cliente_nome 
                    ? `De ${kpis.ultima_mensagem_preview.cliente_nome}` 
                    : "Novas mensagens recebidas"}
                </p>
              ) : (
                <p className="text-[12px] text-slate-500 mt-2">{kpis.disparos_whatsapp || 0} automações ativas</p>
              )}
            </Link>
          </div>

          {/* ================================================================
              MAIN GRID — 2/3 + 1/3
              ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ---- Left Column (2/3) ---- */}
            <div className="lg:col-span-2 space-y-5">

              {/* Gráfico de Horários de Pico */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-[15px] font-600 text-slate-900">Horários de Maior Movimento</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">Conexões Wi-Fi por hora do dia (últimos 7 dias)</p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-500 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-slate-500">
                    7 dias
                  </span>
                </div>

                <div className="h-40 flex items-end justify-between gap-1 border-b border-[#f1f5f9] pb-2">
                  {dados?.horarios_pico?.map((h, i) => {
                    const pct = Math.round((h.conexoes / maxConexoesHora) * 100);
                    const isPeak = pct > 70;
                    const isMedium = pct > 35 && !isPeak;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-600 px-2 py-1 rounded-md shadow pointer-events-none whitespace-nowrap z-10">
                          {h.hora}: {h.conexoes}
                        </div>
                        {/* Bar */}
                        <div className="w-full bg-[#f1f5f9] rounded-t h-full flex items-end overflow-hidden">
                          <div
                            style={{ height: `${Math.max(pct, 5)}%` }}
                            className={`w-full rounded-t transition-all duration-500 ${isPeak ? 'bg-[#2563eb] group-hover:bg-[#1d4ed8]' : isMedium ? 'bg-[#93c5fd] group-hover:bg-[#60a5fa]' : 'bg-[#e2e8f0] group-hover:bg-[#cbd5e1]'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-500 uppercase mt-2 tracking-wide">
                  <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>
              </div>

              {/* Tabela Últimos Leads */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-600 text-slate-900">Últimos Visitantes Conectados</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">Visitantes que realizaram login no Wi-Fi</p>
                  </div>
                  <Link
                    to={empresaSlug ? `/admin/${empresaSlug}/lgpd` : "/admin"}
                    className="text-[12px] font-600 text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                  >
                    Ver Todos →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                        <th className="px-5 py-3 text-left text-[10px] font-600 text-slate-400 uppercase tracking-wider">Cliente</th>
                        <th className="px-5 py-3 text-left text-[10px] font-600 text-slate-400 uppercase tracking-wider">Contato</th>
                        <th className="px-5 py-3 text-left text-[10px] font-600 text-slate-400 uppercase tracking-wider">Origem</th>
                        <th className="px-5 py-3 text-right text-[10px] font-600 text-slate-400 uppercase tracking-wider">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados?.ultimos_leads?.length > 0 ? (
                        dados.ultimos_leads.map((lead) => (
                          <tr key={lead.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#2563eb] font-700 text-[11px] flex items-center justify-center flex-shrink-0">
                                  {lead.nome ? lead.nome.substring(0, 2).toUpperCase() : "VI"}
                                </div>
                                <div>
                                  <span className="block text-[13px] font-600 text-slate-800">{lead.nome || "Visitante Wi-Fi"}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{lead.mac || "—"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-[12px]">
                              {lead.telefone ? (
                                <span className="font-500 text-[#10b981]">📱 {lead.telefone}</span>
                              ) : lead.email ? (
                                <span className="font-500 text-slate-600">✉️ {lead.email}</span>
                              ) : (
                                <span className="text-slate-400 italic">Não informado</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {lead.origem === "social_google" ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-600 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">Google</span>
                              ) : lead.origem === "social_facebook" ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-600 bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe]">Facebook</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-600 bg-[#f8fafc] text-slate-600 border border-[#e2e8f0]">Formulário</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right text-[11px] text-slate-400">
                              {lead.criado_em ? new Date(lead.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-5 py-10 text-center text-[12px] text-slate-400">
                            Nenhum lead capturado ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ---- Right Column (1/3) ---- */}
            <div className="space-y-5">

              {/* Canais de Captura */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <div className="pb-4 border-b border-[#e2e8f0] mb-4">
                  <h2 className="text-[15px] font-600 text-slate-900">Canais de Captura</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">Origem dos logins no portal</p>
                </div>
                <div className="space-y-3">
                  {dados?.canais_captura?.length > 0 ? (
                    dados.canais_captura.map((c, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[12px] font-600 text-slate-700">
                          <span>{c.origem}</span>
                          <span className="text-slate-500">{c.total} <span className="text-slate-400 font-400">({c.pct}%)</span></span>
                        </div>
                        <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${c.pct}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${c.raw_origem === "social_google" ? "bg-[#2563eb]" : c.raw_origem === "social_facebook" ? "bg-[#4f46e5]" : "bg-[#10b981]"}`}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-slate-400 text-center py-4">Nenhum canal registrado ainda.</p>
                  )}
                </div>
              </div>

              {/* Satisfação NPS (se houver avaliações) */}
              {kpis.nps_info && kpis.nps_info.total > 0 && (
                <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-md bg-[#ecfdf5] text-[#10b981] flex items-center justify-center text-sm font-700">
                        ⭐
                      </span>
                      <div>
                        <h2 className="text-[14px] font-600 text-slate-900">Satisfação NPS</h2>
                        <p className="text-[11px] text-slate-400">{kpis.nps_info.total} avaliações</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-700 text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full">
                      {kpis.nps_info.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[32px] font-800 leading-none ${kpis.nps_info.score >= 50 ? 'text-[#10b981]' : kpis.nps_info.score >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {kpis.nps_info.score > 0 ? `+${kpis.nps_info.score}` : kpis.nps_info.score}
                    </span>
                    <span className="text-[12px] text-slate-500 font-500">Score de -100 a +100</span>
                  </div>
                </div>
              )}

              {/* Cupons Populares */}
              <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <div className="pb-4 border-b border-[#e2e8f0] mb-4 flex items-center justify-between">
                  <h2 className="text-[15px] font-600 text-slate-900">Cupons & Promoções</h2>
                  <span className="text-[10px] font-600 text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded-full">Ativos</span>
                </div>
                <div className="space-y-2">
                  {dados?.cupons_populares?.length > 0 ? (
                    dados.cupons_populares.map((cupom, idx) => (
                      <div key={idx} className="p-3 bg-[#f8fafc] rounded-md border border-[#e2e8f0] flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-600 text-slate-800">{cupom.titulo}</p>
                          <p className="text-[10px] text-slate-400">cupons gerados</p>
                        </div>
                        <span className="px-2.5 py-1 text-[11px] font-700 rounded-md bg-[#eff6ff] text-[#2563eb]">
                          {cupom.total_resgates} resgates
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-[12px] text-slate-400">Nenhum cupom criado ainda.</p>
                      <Link
                        to={empresaSlug ? `/admin/${empresaSlug}/cupons` : "/admin"}
                        className="inline-block mt-2 text-[12px] font-600 text-[#2563eb] hover:underline"
                      >
                        + Criar primeira promoção
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Banner de Dicas */}
              {dicasAtivas.length > 0 ? (
                <div className="bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 text-[9px] font-700 uppercase tracking-wider rounded-md border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]">
                      {dicaAtual?.badge}
                    </span>
                    <button
                      onClick={() => concluirDica(dicaAtual.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      ✓ Entendi ✕
                    </button>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{dicaAtual?.icon}</span>
                      <h3 className="text-[13px] font-600 text-slate-900">{dicaAtual?.titulo}</h3>
                    </div>
                    <p className="text-[12px] text-slate-500 leading-relaxed">{dicaAtual?.descricao}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#e2e8f0]">
                    <Link
                      to={dicaAtual?.link}
                      className="text-[12px] font-600 text-white bg-[#2563eb] hover:bg-[#1d4ed8] px-3 py-1.5 rounded-md transition-colors"
                    >
                      {dicaAtual?.botaoTexto}
                    </Link>
                    {dicasAtivas.length > 1 && (
                      <div className="flex items-center gap-1">
                        {dicasAtivas.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setIndexDica(idx)}
                            className={`rounded-full transition-all cursor-pointer ${idx === indexDicaValido ? "bg-[#2563eb] w-4 h-1.5" : "bg-[#e2e8f0] hover:bg-slate-300 w-1.5 h-1.5"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-[10px] p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>🎉</span>
                      <h3 className="text-[14px] font-600 text-emerald-900">Tudo Pronto!</h3>
                    </div>
                    <button onClick={resetarDicas} className="text-[11px] text-emerald-600 hover:underline cursor-pointer">
                      Rever dicas
                    </button>
                  </div>
                  <p className="text-[12px] text-emerald-700 leading-relaxed">
                    Você concluiu as principais dicas! Seu sistema está pronto para capturar contatos.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
