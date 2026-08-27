import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";
import {
    PageHeader,
    Card,
    CardBody,
    PrimaryButton,
    SecondaryButton,
    StatusBadge
} from "../../components/ui";

export default function SaasPlanos() {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [planos, setPlanos] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("admin_token");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate("/admin");
            return;
        }
        fetchPlanos();
    }, []);

    const fetchPlanos = async () => {
        try {
            const res = await fetch("/api/saas-planos", { headers });
            if (res.ok) setPlanos(await res.json());
        } catch (err) {
            console.error("Erro ao carregar planos SaaS:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Deseja realmente desativar este plano SaaS?")) return;
        try {
            await fetch(`/api/saas-planos/${id}`, { method: "DELETE", headers });
            fetchPlanos();
        } catch (err) {
            console.error(err);
        }
    };

    const parseRecursos = (recursos) => {
        if (!recursos) return [];
        try {
            const parsed = typeof recursos === "string" ? JSON.parse(recursos) : recursos;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return typeof recursos === "string" ? recursos.split("\n").filter(Boolean) : [];
        }
    };

    const parseModulosCount = (modulos) => {
        if (!modulos) return 0;
        try {
            const parsed = typeof modulos === "string" ? JSON.parse(modulos) : modulos;
            return Object.values(parsed).filter(Boolean).length;
        } catch {
            return 0;
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-[#f1f5f9] text-slate-700 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header Padronizado */}
                    <PageHeader
                        title="Planos & Preços de Assinatura"
                        subtitle="Gerencie pacotes modulares ('À La Carte'), mensalidades, descontos anuais, trial e cotas de uso de cada cliente."
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        actions={
                            <div className="flex items-center gap-3">
                                <PrimaryButton onClick={() => navigate("/super/saas-planos/novo")}>
                                    <span>+ Novo Plano Modular</span>
                                </PrimaryButton>
                            </div>
                        }
                    />

                    {/* Grid de Planos */}
                    {loading ? (
                        <div className="text-center py-16 text-slate-400 font-medium">Carregando planos comerciais...</div>
                    ) : planos.length === 0 ? (
                        <Card>
                            <CardBody className="text-center py-16">
                                <p className="text-slate-500 text-base font-semibold">Nenhum plano comercial cadastrado.</p>
                                <p className="text-slate-400 text-xs mt-1">Clique no botão "+ Novo Plano Modular" para criar o primeiro pacote em página dedicada.</p>
                            </CardBody>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {planos.map((p) => {
                                const recursosLista = parseRecursos(p.recursos);
                                const isDestaque = Boolean(p.destaque);
                                const totalModulosAtivos = parseModulosCount(p.modulos_liberados);

                                return (
                                    <div
                                        key={p.id}
                                        className={`bg-white border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative transition-all duration-200 hover:shadow-md ${isDestaque
                                            ? "border-[#2563eb] ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/20 to-white"
                                            : p.ativo
                                                ? "border-slate-200"
                                                : "border-slate-200 opacity-60 bg-slate-50"
                                            }`}
                                    >
                                        {/* Tag de Destaque */}
                                        {isDestaque && (
                                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#2563eb] text-white text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                                                ⭐ Mais Popular
                                            </div>
                                        )}

                                        {/* Cabeçalho do Card */}
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${p.tipo_cobranca === "fixo"
                                                    ? "bg-blue-50 text-[#2563eb] border border-blue-200"
                                                    : p.tipo_cobranca === "porcentagem"
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : "bg-[#f8fafc] text-slate-700 border border-[#e2e8f0]"
                                                    }`}>
                                                    {p.tipo_cobranca === "fixo" ? "Mensalidade Fixa" : p.tipo_cobranca === "porcentagem" ? "Revenue Share" : "Híbrido"}
                                                </span>

                                                <div className="flex gap-2">
                                                    <StatusBadge
                                                        variant={p.ativo ? "success" : "danger"}
                                                        label={p.ativo ? "Ativo" : "Inativo"}
                                                    />
                                                    <StatusBadge
                                                        variant={p.exibir_no_site ? "success" : "secondary"}
                                                        label={p.exibir_no_site ? "👁️ Público" : "🔒 Privado"}
                                                    />
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-slate-900 mb-1.5">{p.nome}</h3>
                                            <p className="text-xs text-slate-500 min-h-[42px] leading-relaxed mb-4">{p.descricao || "Sem descrição cadastrada."}</p>

                                            {/* Bloco de Preço */}
                                            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 mb-4">
                                                {p.tipo_cobranca !== "porcentagem" ? (
                                                    <div>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xs font-semibold text-slate-400">R$</span>
                                                            <span className="text-3xl font-black text-slate-900 tracking-tight">
                                                                {parseFloat(p.valor_mensal).toFixed(2).replace(".", ",")}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-medium">/ mês</span>
                                                        </div>

                                                        {p.valor_anual && parseFloat(p.valor_anual) > 0 && (
                                                            <div className="text-[11px] font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                                                                <span>💳</span> R$ {parseFloat(p.valor_anual).toFixed(2).replace(".", ",")} / ano
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-lg font-extrabold text-slate-800">
                                                        Sem Custo Fixo
                                                    </div>
                                                )}

                                                {parseFloat(p.comissao_porcentagem) > 0 && (
                                                    <div className="text-xs font-bold text-emerald-700 mt-1.5 flex items-center gap-1">
                                                        <span>📈</span> {p.comissao_porcentagem}% sobre vendas Wi-Fi
                                                    </div>
                                                )}

                                                {p.dias_trial > 0 && (
                                                    <div className="text-[11px] font-bold text-indigo-700 mt-1.5 flex items-center gap-1">
                                                        <span>🎁</span> {p.dias_trial} dias de teste grátis (Trial)
                                                    </div>
                                                )}
                                            </div>

                                            {/* Limites e Módulos */}
                                            <div className="space-y-2 text-xs border-b border-[#e2e8f0] pb-3 mb-3">
                                                <div className="flex items-center justify-between text-slate-600">
                                                    <span className="flex items-center gap-1.5">
                                                        <span>📡</span> Roteadores (MikroTik):
                                                    </span>
                                                    <span className="font-bold text-slate-800">
                                                        {p.limite_mikrotiks === 0 ? "Ilimitado" : `${p.limite_mikrotiks} un.`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-slate-600">
                                                    <span className="flex items-center gap-1.5">
                                                        <span>🌐</span> Portais Captivos:
                                                    </span>
                                                    <span className="font-bold text-slate-800">
                                                        {p.limite_portais === 0 ? "Ilimitado" : `${p.limite_portais} un.`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-slate-600">
                                                    <span className="flex items-center gap-1.5">
                                                        <span>🧩</span> Módulos Liberados:
                                                    </span>
                                                    <span className="font-bold px-2 py-0.5 bg-blue-50 text-[#2563eb] rounded-md text-[11px]">
                                                        {totalModulosAtivos > 0 ? `${totalModulosAtivos} / 13 Módulos` : "Personalizado"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Lista de Recursos */}
                                            {recursosLista.length > 0 && (
                                                <div className="space-y-1.5 mb-4">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Incluso no plano:</p>
                                                    <ul className="space-y-1">
                                                        {recursosLista.map((rec, idx) => (
                                                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 leading-tight">
                                                                <span className="text-blue-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                                                                <span>{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ações */}
                                        <div className="flex items-center gap-2 pt-4 border-t border-[#e2e8f0]">
                                            <button
                                                onClick={() => navigate(`/super/saas-planos/editar/${p.id}`)}
                                                className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                                            >
                                                <span>✏️</span> Editar Plano
                                            </button>
                                            {p.ativo ? (
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                                                >
                                                    Desativar
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}