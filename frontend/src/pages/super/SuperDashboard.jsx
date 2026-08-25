import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";

export default function SuperDashboard() {
  const { user, isSuperAdmin, switchEmpresa } = useAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos"); // 'todos' | 'trial' | 'adimplente' | 'inadimplente'

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate(`/admin/${user?.empresa_slug || 'default'}`);
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [resEmp, resStats] = await Promise.all([
        fetch("/api/empresas", { headers }),
        fetch("/api/saas-faturas/stats", { headers })
      ]);

      if (resEmp.ok) setEmpresas(await resEmp.json());
      if (resStats.ok) setStats(await resStats.json());
    } catch (err) {
      console.error("Erro ao buscar dados do SuperDashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos consolidados
  const totalMikrotiks = empresas.reduce((acc, e) => acc + (e.total_mikrotiks || 0), 0);
  const totalAdmins = empresas.reduce((acc, e) => acc + (e.total_admins || 0), 0);

  const empresasTrial = stats?.empresas_trial || empresas.filter(e => e.status_financeiro === 'trial');
  const totalTrial = empresasTrial.length;
  const totalAdimplentes = empresas.filter(e => e.status_financeiro === 'adimplente' || (e.ativo && e.status_financeiro !== 'suspenso' && e.status_financeiro !== 'inadimplente' && e.status_financeiro !== 'trial')).length;
  const totalSuspensos = empresas.filter(e => e.status_financeiro === 'suspenso' || e.status_financeiro === 'inadimplente').length;

  const empresasFiltradas = empresas.filter(e => {
    if (filtroStatus === 'trial') return e.status_financeiro === 'trial';
    if (filtroStatus === 'adimplente') return e.status_financeiro === 'adimplente' || (!e.status_financeiro && e.ativo);
    if (filtroStatus === 'inadimplente') return e.status_financeiro === 'suspenso' || e.status_financeiro === 'inadimplente';
    return true;
  });

  const avatarColors = [
    "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]",
    "bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]",
    "bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]",
    "bg-[#fffbeb] text-[#d97706] border-[#fde68a]",
    "bg-[#fdf2f8] text-[#db2777] border-[#fbcfe8]"
  ];

  return (
    <AdminLayout>
      <div className="space-y-7 text-slate-900 pb-10">
        
        {/* Header Executivo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[10px] font-800 uppercase tracking-wider rounded-full bg-[#2563eb] text-white shadow-2xs">
                🛡️ Super Admin Control Center
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-700 rounded-full bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                Operacional (Visão Global 360°)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-900 text-slate-900 tracking-tight mt-2">
              Visão Geral da Plataforma & Infraestrutura
            </h1>
            <p className="text-xs md:text-[13px] text-slate-500 mt-0.5">
              Monitoramento comercial de empresas clientes, períodos de teste, receita recorrente e equipamentos de rede.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/super/relatorios"
              className="px-3.5 py-2 bg-white hover:bg-[#f8fafc] text-slate-700 border border-[#e2e8f0] rounded-[8px] text-[12px] font-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>📊</span> Relatórios & BI
            </Link>
            <Link
              to="/super/saas-faturas"
              className="px-3.5 py-2 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#10b981] border border-[#a7f3d0] rounded-[8px] text-[12px] font-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>🧾</span> Faturas & Mensalidades
            </Link>
            <Link
              to="/super/empresas"
              className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-[8px] text-[12px] font-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>🏢</span> + Nova Empresa
            </Link>
          </div>
        </div>

        {/* Grid de KPIs Principais (4 Cards Executivos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: MRR & Receita */}
          <div className="bg-white border border-[#e2e8f0] p-5 rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#2563eb]"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-400">MRR (Receita Recorrente)</span>
                <span className="w-8 h-8 rounded-full bg-[#eff6ff] text-[#2563eb] flex items-center justify-center font-bold text-sm">
                  💰
                </span>
              </div>
              <p className="text-[26px] font-900 text-slate-900 mt-2 font-mono">
                {stats?.mrr ? stats.mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-slate-500">
              <span className="text-slate-400">Recebido este mês:</span>
              <span className="font-800 text-[#10b981] font-mono">
                {stats?.total_recebido_mes ? stats.total_recebido_mes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
              </span>
            </div>
          </div>

          {/* Card 2: Empresas Clientes & Status */}
          <div className="bg-white border border-[#e2e8f0] p-5 rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#10b981]"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-400">Empresas Cadastradas</span>
                <span className="w-8 h-8 rounded-full bg-[#ecfdf5] text-[#10b981] flex items-center justify-center font-bold text-sm">
                  🏢
                </span>
              </div>
              <p className="text-[26px] font-900 text-slate-900 mt-2 font-mono">{empresas.length}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] flex items-center gap-1.5 text-[10px] font-700 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]">
                {totalAdimplentes} Ativas
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#fffbeb] text-amber-700 border border-amber-200">
                ⚡ {totalTrial} Teste
              </span>
              {totalSuspensos > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#fef2f2] text-red-700 border border-red-200">
                  {totalSuspensos} Suspensas
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Infraestrutura Global (NOC Multi-Vendor) */}
          <div className="bg-white border border-[#e2e8f0] p-5 rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#6366f1]"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-400">Equipamentos & NOC</span>
                <span className="w-8 h-8 rounded-full bg-[#eef2ff] text-[#6366f1] flex items-center justify-center font-bold text-sm">
                  📶
                </span>
              </div>
              <p className="text-[26px] font-900 text-slate-900 mt-2 font-mono">
                {stats?.gateways?.total_gateways || totalMikrotiks}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] font-600 text-slate-600">
              <span title="MikroTik RouterOS" className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> MK: <strong className="font-mono">{stats?.gateways?.total_mikrotik || totalMikrotiks}</strong>
              </span>
              <span title="TP-Link Omada" className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Omada: <strong className="font-mono">{stats?.gateways?.total_omada || 0}</strong>
              </span>
              <span title="Ubiquiti UniFi" className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> UniFi: <strong className="font-mono">{stats?.gateways?.total_unifi || 0}</strong>
              </span>
            </div>
          </div>

          {/* Card 4: Conexões Globais & Leads */}
          <div className="bg-white border border-[#e2e8f0] p-5 rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#f59e0b]"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-400">Conexões & Leads</span>
                <span className="w-8 h-8 rounded-full bg-[#fffbeb] text-amber-600 flex items-center justify-center font-bold text-sm">
                  ⚡
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-[26px] font-900 text-slate-900 font-mono">{stats?.conexoes_globais_agora || 0}</p>
                <span className="text-[11px] font-700 text-[#10b981] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span> Online agora
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-slate-500">
              <span className="text-slate-400">Leads capturados (30d):</span>
              <span className="font-800 text-[#2563eb] font-mono">{stats?.leads_globais_mes || 0} contatos</span>
            </div>
          </div>

        </div>

        {/* Seção 1: Painel de Empresas em Período de Teste (Trial Tracker) */}
        <div className="bg-white border border-[#fde68a] rounded-[12px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-800 uppercase rounded-full bg-[#fffbeb] text-amber-800 border border-amber-300">
                  ⚡ TRIAL TRACKER
                </span>
                <h2 className="text-[16px] font-800 text-slate-900">Empresas em Período de Teste Grátis</h2>
              </div>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Acompanhe os clientes que estão testando o sistema e converta em assinantes pagantes
              </p>
            </div>
            <span className="px-3 py-1 bg-[#fffbeb] text-amber-800 border border-amber-300 rounded-full text-[11px] font-800 self-start sm:self-auto">
              {totalTrial} {totalTrial === 1 ? 'Empresa em Teste' : 'Empresas em Teste'}
            </span>
          </div>

          {empresasTrial.length === 0 ? (
            <div className="py-10 text-center bg-[#f8fafc] rounded-[10px] border border-dashed border-[#cbd5e1]">
              <span className="text-3xl mb-1 block">🎉</span>
              <p className="text-[13px] font-700 text-slate-700">Nenhuma empresa em período de teste no momento.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Todas as empresas parceiras estão com planos ativos ou faturas adimplentes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empresasTrial.map((emp, idx) => {
                const dias = emp.dias_restantes !== undefined ? emp.dias_restantes : 14;
                const isUrgente = dias <= 3;
                const avatarColor = avatarColors[idx % avatarColors.length];
                const inicial = (emp.nome || "E").charAt(0).toUpperCase();

                return (
                  <div
                    key={emp.id}
                    className={`p-4 rounded-[10px] border transition-all flex flex-col justify-between ${
                      isUrgente
                        ? 'bg-[#fffbeb]/40 border-amber-300 shadow-2xs'
                        : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-800 text-[13px] shrink-0 border ${avatarColor}`}>
                            {inicial}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-800 text-[13px] text-slate-900 truncate">{emp.nome}</h3>
                            <p className="text-[11px] font-mono text-slate-400">/admin/{emp.slug}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-800 uppercase tracking-wide border shrink-0 ${
                            dias <= 0
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : isUrgente
                                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                : 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                          }`}
                        >
                          {dias <= 0 ? '⚠️ Expira Hoje' : `${dias}d restantes`}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-600 mb-3 bg-white p-2.5 rounded-[8px] border border-[#e2e8f0]">
                        {emp.email && <div className="truncate">✉️ {emp.email}</div>}
                        {emp.telefone && (
                          <div className="flex items-center justify-between">
                            <span className="font-mono">📱 {emp.telefone}</span>
                            <a
                              href={`https://wa.me/${emp.telefone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-700 text-[#10b981] hover:underline"
                            >
                              WhatsApp ↗
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Barra de Progresso do Teste */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[10px] font-700 text-slate-500">
                          <span>Progresso do Teste</span>
                          <span className="font-mono">{Math.max(0, 14 - dias)} / 14 Dias</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(5, ((14 - dias) / 14) * 100))}%` }}
                            className={`h-full rounded-full transition-all ${isUrgente ? 'bg-amber-500' : 'bg-[#2563eb]'}`}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#e2e8f0]">
                      <Link
                        to="/super/empresas"
                        className="text-[11px] font-700 text-[#2563eb] hover:underline"
                      >
                        Alterar Plano
                      </Link>
                      <button
                        onClick={async () => {
                          try {
                            await switchEmpresa(emp.id);
                            window.location.href = `/admin/${emp.slug}`;
                          } catch (err) {
                            window.location.href = `/admin/${emp.slug}`;
                          }
                        }}
                        className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-[6px] text-[11px] font-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        Acessar Painel ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Seção 2: Gestão Rápida & Atalhos */}
        <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <h2 className="text-[14px] font-800 text-slate-900 flex items-center gap-2 border-b border-[#f1f5f9] pb-3">
            <span>⚙️</span> Atalhos de Administração Global
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Link
              to="/super/relatorios"
              className="p-3 bg-[#f8fafc] hover:bg-[#eff6ff] hover:border-[#bfdbfe] text-[#2563eb] border border-[#e2e8f0] rounded-[8px] text-[12px] font-700 transition-all flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs"
            >
              <span className="text-xl">📊</span>
              <span>Relatórios & BI</span>
            </Link>
            <Link
              to="/super/saas-planos"
              className="p-3 bg-[#f8fafc] hover:bg-[#f5f3ff] hover:border-[#ddd6fe] text-[#7c3aed] border border-[#e2e8f0] rounded-[8px] text-[12px] font-700 transition-all flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs"
            >
              <span className="text-xl">💎</span>
              <span>Planos de Cobrança</span>
            </Link>
            <Link
              to="/super/saas-faturas"
              className="p-3 bg-[#f8fafc] hover:bg-[#ecfdf5] hover:border-[#a7f3d0] text-[#10b981] border border-[#e2e8f0] rounded-[8px] text-[12px] font-700 transition-all flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs"
            >
              <span className="text-xl">🧾</span>
              <span>Faturas & Cobranças</span>
            </Link>
            <Link
              to="/super/backups"
              className="p-3 bg-[#f8fafc] hover:bg-slate-100 text-slate-700 border border-[#e2e8f0] rounded-[8px] text-[12px] font-700 transition-all flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs"
            >
              <span className="text-xl">💾</span>
              <span>Backups & SMTP</span>
            </Link>
            <Link
              to="/super/atualizar"
              className="p-3 bg-[#f8fafc] hover:bg-[#ecfeff] hover:border-[#a5f3fc] text-[#0891b2] border border-[#e2e8f0] rounded-[8px] text-[12px] font-700 transition-all flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs"
            >
              <span className="text-xl">🔄</span>
              <span>Atualizar Sistema</span>
            </Link>
          </div>
        </div>

        {/* Seção 3: Tabela Principal de Empresas Clientes (Com Filtros em Abas) */}
        <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-4">
            <div>
              <h2 className="text-[16px] font-800 text-slate-900">Empresas Clientes da Plataforma</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">Gerenciamento completo das contas parceiras e acesso direto</p>
            </div>
            <Link
              to="/super/empresas"
              className="px-3.5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-[8px] text-[12px] font-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              + Cadastrar Nova Empresa
            </Link>
          </div>

          {/* Abas de Filtro */}
          <div className="flex gap-1.5 border-b border-[#e2e8f0] pb-3 overflow-x-auto">
            {[
              { id: 'todos', label: 'Todas', count: empresas.length },
              { id: 'trial', label: 'Em Teste', count: totalTrial, icon: '⚡' },
              { id: 'adimplente', label: 'Adimplentes', count: totalAdimplentes, icon: '🟢' },
              { id: 'inadimplente', label: 'Suspensas', count: totalSuspensos, icon: '🔴' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFiltroStatus(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-700 transition-all cursor-pointer whitespace-nowrap ${
                  filtroStatus === tab.id
                    ? 'bg-[#2563eb] text-white shadow-2xs'
                    : 'bg-[#f8fafc] text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.icon && <span>{tab.icon}</span>}
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filtroStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-[12px]">Carregando lista de empresas...</p>
            </div>
          ) : empresasFiltradas.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-[13px]">Nenhuma empresa encontrada com este filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-slate-400 font-700 text-[10px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Empresa</th>
                    <th className="py-3.5 px-4">Slug / Subdomínio</th>
                    <th className="py-3.5 px-4 text-center">MikroTiks</th>
                    <th className="py-3.5 px-4 text-center">Planos</th>
                    <th className="py-3.5 px-4 text-center">Admins</th>
                    <th className="py-3.5 px-4 text-center">Cobrança</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {empresasFiltradas.map((e, idx) => {
                    const avatarColor = avatarColors[idx % avatarColors.length];
                    const inicial = (e.nome || "E").charAt(0).toUpperCase();

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-800 text-[12px] shrink-0 border ${avatarColor}`}>
                              {inicial}
                            </div>
                            <div>
                              <p className="font-800 text-slate-900 text-[13px]">{e.nome}</p>
                              {e.cnpj && <p className="text-[10px] text-slate-400 font-mono">CNPJ: {e.cnpj}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          /admin/{e.slug}
                        </td>
                        <td className="py-3.5 px-4 text-center font-800 text-slate-800 font-mono">
                          {e.total_mikrotiks || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-800 text-slate-800 font-mono">
                          {e.total_planos || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-800 text-slate-800 font-mono">
                          {e.total_admins || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-700 uppercase tracking-wider ${
                            e.tipo_cobranca === 'porcentagem'
                              ? 'bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]'
                              : e.tipo_cobranca === 'hibrido'
                                ? 'bg-[#fffbeb] text-amber-700 border border-amber-200'
                                : 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                          }`}>
                            {e.tipo_cobranca || 'fixo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-800 uppercase tracking-wider border ${
                            e.status_financeiro === 'trial'
                              ? 'bg-[#fffbeb] text-amber-800 border-amber-300'
                              : e.status_financeiro === 'suspenso'
                                ? 'bg-[#fef2f2] text-red-700 border-red-200'
                                : e.status_financeiro === 'inadimplente'
                                  ? 'bg-orange-100 text-orange-700 border-orange-200'
                                  : 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]'
                          }`}>
                            {e.status_financeiro === 'trial' ? '⚡ Em Teste' : e.status_financeiro || (e.ativo ? 'Adimplente' : 'Inativo')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={async () => {
                              try {
                                await switchEmpresa(e.id);
                                window.location.href = `/admin/${e.slug}`;
                              } catch (err) {
                                window.location.href = `/admin/${e.slug}`;
                              }
                            }}
                            className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-[6px] text-[11px] font-700 transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1"
                          >
                            <span>Acessar Painel</span>
                            <span>➔</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}