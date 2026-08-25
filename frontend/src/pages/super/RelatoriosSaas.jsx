import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import AdminLayout from "../../components/admin/AdminLayout";

export default function RelatoriosSaas() {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const token = localStorage.getItem("admin_token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate("/admin");
            return;
        }
        fetchRelatorio();
    }, []);

    const fetchRelatorio = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/saas-faturas/relatorio-avancado", { headers });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error("Erro ao buscar relatório SaaS:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCSV = () => {
        window.open("/api/saas-faturas/exportar-csv", "_blank");
    };

    const handleImprimir = () => {
        window.print();
    };

    const formatarMoeda = (val) => {
        return parseFloat(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };

    const kpis = data?.kpis || {};
    const historicoMeses = data?.historico_meses || [];
    const distribuicaoPlanos = data?.distribuicao_planos || [];
    const rankingEmpresas = data?.ranking_empresas || [];

    // Maior valor faturado no histórico para proporção dos gráficos de barras
    const maxFaturamento = Math.max(...historicoMeses.map(m => parseFloat(m.total_faturado || 0)), 100);

    return (
        <AdminLayout>
            <div className="min-h-screen bg-[#f1f5f9] text-slate-700 p-6 md:p-8 print:bg-white print:text-black">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header (Escondido na Impressão) */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden bg-white p-6 rounded-[10px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                <span>📊 Inteligência Financeira & BI Global</span>
                            </h1>
                            <p className="text-xs text-slate-500 mt-1">
                                Acompanhamento de receita recorrente (MRR/ARR), churn rate, evolução de comissões e métricas gerenciais.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                            <Link
                                to="/super/saas-faturas"
                                className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-200 text-xs font-bold transition-colors"
                            >
                                📋 Ver Faturas
                            </Link>
                            <SecondaryButton
                                onClick={handleDownloadCSV}
                                size="sm"
                                variant="outline"
                            >
                                📥 Exportar CSV
                            </SecondaryButton>
                            <PrimaryButton
                                onClick={handleImprimir}
                                size="sm"
                            >
                                🖨️ Imprimir / PDF
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Header para Impressão */}
                    <div className="hidden print:block mb-6 border-b pb-4">
                        <h1 className="text-2xl font-bold text-black">Relatório Gerencial Financeiro - Plataforma Nuvy Pro</h1>
                        <p className="text-xs text-slate-600">Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-slate-400 space-y-3">
                            <div className="w-10 h-10 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-xs">Carregando métricas e relatórios gerenciais...</p>
                        </div>
                    ) : (
                        <>
                            {/* Cards de KPIs SaaS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {/* MRR */}
                                <div className="bg-white border border-slate-200 p-6 rounded-[10px] shadow-sm relative overflow-hidden print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">MRR (Receita Recorrente)</span>
                                        <span className="text-xl">💰</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 mt-2 print:text-black">{formatarMoeda(kpis.mrr)}</p>
                                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                                        <span>Fixo: <strong className="text-slate-900 print:text-black">{formatarMoeda(kpis.mrr_fixo)}</strong></span>
                                        <span>Comissões: <strong className="text-[#2563eb] print:text-black">{formatarMoeda(kpis.mrr_comissao)}</strong></span>
                                    </div>
                                </div>

                                {/* ARR */}
                                <div className="bg-white border border-slate-200 p-6 rounded-[10px] shadow-sm relative overflow-hidden print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">ARR (Projeção Anual)</span>
                                        <span className="text-xl">📈</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 mt-2 print:text-black">{formatarMoeda(kpis.arr)}</p>
                                    <p className="text-[11px] text-slate-400 mt-3">Projeção anual de receita (MRR x 12)</p>
                                </div>

                                {/* ARPU */}
                                <div className="bg-white border border-slate-200 p-6 rounded-[10px] shadow-sm relative overflow-hidden print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">ARPU (Ticket Médio)</span>
                                        <span className="text-xl">📊</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 mt-2 print:text-black">{formatarMoeda(kpis.arpu)}</p>
                                    <p className="text-[11px] text-slate-400 mt-3">Receita média por empresa ativa ({kpis.empresas_ativas} ativas)</p>
                                </div>

                                {/* Churn Rate */}
                                <div className="bg-white border border-slate-200 p-6 rounded-[10px] shadow-sm relative overflow-hidden print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Inadimplência / Churn</span>
                                        <span className="text-xl">⚠️</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 mt-2 print:text-black">{kpis.churn_rate}%</p>
                                    <p className="text-[11px] text-slate-400 mt-3">{kpis.empresas_inadimplentes} inativas/suspensas de {kpis.total_empresas} empresas</p>
                                </div>
                            </div>

                            {/* Cards Auxiliares de Faturamento Mês/Ano */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-[10px] shadow-sm flex items-center justify-between print:border-gray-300 print:bg-gray-50">
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Faturamento do Mês Corrente</p>
                                        <p className="text-2xl font-black text-slate-900 mt-1 print:text-black">{formatarMoeda(kpis.faturado_mes)}</p>
                                    </div>
                                    <div className="text-3xl">💵</div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 p-5 rounded-[10px] shadow-sm flex items-center justify-between print:border-gray-300 print:bg-gray-50">
                                    <div>
                                        <p className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">Faturamento Acumulado no Ano</p>
                                        <p className="text-2xl font-black text-slate-900 mt-1 print:text-black">{formatarMoeda(kpis.faturado_ano)}</p>
                                    </div>
                                    <div className="text-3xl">🗓️</div>
                                </div>
                            </div>

                            {/* Gráfico de Evolução de Faturamento Mensal (Últimos 12 Meses) */}
                            <div className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm space-y-6 print:border-gray-300 print:bg-white">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e2e8f0] pb-4 print:border-gray-300">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 print:text-black">Evolução do Faturamento Mensal</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Histórico comparativo dos últimos 12 meses (Mensalidade Fixo vs Comissões de Revenue Share)</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                            <span className="w-3 h-3 rounded-sm bg-[#2563eb] inline-block"></span> Fixo
                                        </span>
                                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                            <span className="w-3 h-3 rounded-sm bg-sky-400 inline-block"></span> Comissão (RevShare)
                                        </span>
                                    </div>
                                </div>

                                {historicoMeses.length === 0 ? (
                                    <p className="text-center text-slate-400 py-12 text-xs">Nenhum histórico financeiro registrado nos últimos 12 meses.</p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-56 pt-6 px-2 border-b border-[#e2e8f0] print:border-gray-300">
                                            {historicoMeses.map((m, idx) => {
                                                const altBase = (parseFloat(m.total_base || 0) / maxFaturamento) * 100;
                                                const altComissao = (parseFloat(m.total_comissao || 0) / maxFaturamento) * 100;
                                                const altTotal = Math.max(altBase + altComissao, 5);

                                                return (
                                                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group relative">
                                                        {/* Tooltip Hover */}
                                                        <div className="absolute -top-14 bg-slate-900 text-white text-[10px] p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-lg">
                                                            <p className="font-bold">{m.label_mes}</p>
                                                            <p className="text-blue-300">Fixo: R$ {parseFloat(m.total_base || 0).toFixed(2)}</p>
                                                            <p className="text-sky-300">Comissão: R$ {parseFloat(m.total_comissao || 0).toFixed(2)}</p>
                                                            <p className="text-emerald-300 font-bold border-t border-slate-700 mt-1 pt-1">Total: R$ {parseFloat(m.total_faturado || 0).toFixed(2)}</p>
                                                        </div>

                                                        {/* Bar Stack */}
                                                        <div className="w-full max-w-[28px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end transition-all hover:brightness-110" style={{ height: `${altTotal}%` }}>
                                                            <div className="w-full bg-sky-400" style={{ height: `${(altComissao / Math.max(altBase + altComissao, 1)) * 100}%` }}></div>
                                                            <div className="w-full bg-[#2563eb]" style={{ height: `${(altBase / Math.max(altBase + altComissao, 1)) * 100}%` }}></div>
                                                        </div>

                                                        <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center print:text-black">
                                                            {m.label_mes}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Seção Dupla: Distribuição de Planos & Ranking de Empresas */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Distribuição de Planos */}
                                <div className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm space-y-4 print:border-gray-300 print:bg-white">
                                    <h3 className="text-sm font-bold text-slate-900 print:text-black border-b border-[#e2e8f0] pb-3 print:border-gray-300">
                                        Modalidade de Planos de Assinatura
                                    </h3>
                                    <div className="space-y-4 pt-2">
                                        {['fixo', 'porcentagem', 'hibrido'].map((tipo) => {
                                            const found = distribuicaoPlanos.find(p => p.tipo_cobranca === tipo);
                                            const count = parseInt(found?.total || 0, 10);
                                            const totalAll = Math.max(distribuicaoPlanos.reduce((a, b) => a + parseInt(b.total || 0, 10), 0), 1);
                                            const pct = ((count / totalAll) * 100).toFixed(0);

                                            const labels = {
                                                fixo: 'Mensalidade Fixa',
                                                porcentagem: '100% Revenue Share',
                                                hibrido: 'Híbrido (Fixo + Comissão)'
                                            };
                                            const colors = {
                                                fixo: 'bg-[#2563eb]',
                                                porcentagem: 'bg-sky-500',
                                                hibrido: 'bg-amber-500'
                                            };

                                            return (
                                                <div key={tipo} className="space-y-1.5">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-medium text-slate-700 print:text-black">{labels[tipo]}</span>
                                                        <span className="font-bold text-slate-900 print:text-black">{count} empresa(s) ({pct}%)</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${colors[tipo]}`} style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Ranking de Empresas Clientes */}
                                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm space-y-4 print:border-gray-300 print:bg-white">
                                    <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3 print:border-gray-300">
                                        <h3 className="text-sm font-bold text-slate-900 print:text-black">
                                            Top 10 Empresas Clientes (Maior Faturamento)
                                        </h3>
                                        <span className="text-xs text-slate-400">Histórico acumulado</span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 uppercase font-bold tracking-wider print:border-gray-300">
                                                    <th className="py-2.5 px-3">Empresa</th>
                                                    <th className="py-2.5 px-3">Plano</th>
                                                    <th className="py-2.5 px-3 text-center">Faturas Pagas</th>
                                                    <th className="py-2.5 px-3 text-right">Comissões Geradas</th>
                                                    <th className="py-2.5 px-3 text-right">Total Pago</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#f1f5f9] print:divide-gray-300">
                                                {rankingEmpresas.map((emp, idx) => (
                                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 px-3 font-semibold text-slate-900 print:text-black">
                                                            #{idx + 1} {emp.nome}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${emp.tipo_cobranca === 'porcentagem' ? 'bg-sky-50 text-sky-700 border border-sky-200/60' : emp.tipo_cobranca === 'hibrido' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-blue-50 text-[#2563eb] border border-blue-200/60'}`}>
                                                                {emp.tipo_cobranca}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-3 text-center text-slate-700 font-semibold print:text-black">
                                                            {emp.total_faturas}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-semibold text-slate-700 print:text-black">
                                                            {formatarMoeda(emp.total_comissao_historico)}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-bold text-emerald-700 print:text-black">
                                                            {formatarMoeda(emp.total_pago_historico)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

        </AdminLayout>
    );
}