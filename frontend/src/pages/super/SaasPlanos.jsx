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
    Modal,
    StatusBadge
} from "../../components/ui";

export default function SaasPlanos() {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [planos, setPlanos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);

    const [form, setForm] = useState({
        nome: "",
        descricao: "",
        tipo_cobranca: "fixo",
        valor_mensal: "97.00",
        comissao_porcentagem: "0.00",
        limite_mikrotiks: 1,
        limite_portais: 1,
        destaque: 0,
        recursos: "",
        ativo: 1,
        exibir_no_site: 1,
        mod_vpn: 1,
        mod_hotspot: 1,
        permite_portal_vendas: 0,
        permite_automacao_whatsapp: 0,
        permite_multiplos_pix: 0
    });

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

    const handleOpenModal = (plano = null) => {
        if (plano) {
            setEditId(plano.id);
            let recursosTexto = "";
            if (plano.recursos) {
                try {
                    const parsed = typeof plano.recursos === "string" ? JSON.parse(plano.recursos) : plano.recursos;
                    recursosTexto = Array.isArray(parsed) ? parsed.join("\n") : String(plano.recursos);
                } catch {
                    recursosTexto = plano.recursos;
                }
            }

            setForm({
                nome: plano.nome,
                descricao: plano.descricao || "",
                tipo_cobranca: plano.tipo_cobranca || "fixo",
                valor_mensal: plano.valor_mensal || "0.00",
                comissao_porcentagem: plano.comissao_porcentagem || "0.00",
                limite_mikrotiks: plano.limite_mikrotiks !== undefined ? plano.limite_mikrotiks : 1,
                limite_portais: plano.limite_portais !== undefined ? plano.limite_portais : 1,
                destaque: plano.destaque ? 1 : 0,
                recursos: recursosTexto,
                ativo: plano.ativo !== undefined ? plano.ativo : 1,
                exibir_no_site: plano.exibir_no_site !== undefined ? plano.exibir_no_site : 1,
                mod_vpn: plano.mod_vpn !== undefined ? plano.mod_vpn : 1,
                mod_hotspot: plano.mod_hotspot !== undefined ? plano.mod_hotspot : 1,
                permite_portal_vendas: plano.permite_portal_vendas !== undefined ? plano.permite_portal_vendas : 0,
                permite_automacao_whatsapp: plano.permite_automacao_whatsapp !== undefined ? plano.permite_automacao_whatsapp : 0,
                permite_multiplos_pix: plano.permite_multiplos_pix !== undefined ? plano.permite_multiplos_pix : 0
            });
        } else {
            setEditId(null);
            setForm({
                nome: "",
                descricao: "",
                tipo_cobranca: "fixo",
                valor_mensal: "97.00",
                comissao_porcentagem: "0.00",
                limite_mikrotiks: 1,
                limite_portais: 1,
                destaque: 0,
                recursos: "1 Roteador MikroTik\n1 Portal Captivo\nCaptura de Leads & LGPD\nSuporte via WhatsApp",
                ativo: 1,
                exibir_no_site: 1,
                mod_vpn: 1,
                mod_hotspot: 1,
                permite_portal_vendas: 0,
                permite_automacao_whatsapp: 0,
                permite_multiplos_pix: 0
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const recursosArray = form.recursos
                ? form.recursos.split("\n").map(r => r.trim()).filter(Boolean)
                : [];

            const payload = {
                ...form,
                recursos: recursosArray
            };

            const url = editId ? `/api/saas-planos/${editId}` : "/api/saas-planos";
            const method = editId ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (res.ok) {
                setShowModal(false);
                fetchPlanos();
            }
        } catch (err) {
            console.error("Erro ao salvar plano SaaS:", err);
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

    return (
        <AdminLayout>
            <div className="min-h-screen bg-[#f1f5f9] text-slate-700 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header Padronizado */}
                    <PageHeader
                        title="Planos & Preços de Assinatura"
                        subtitle="Defina os pacotes de assinatura, valores mensais, taxas de comissão e cotas de roteadores/portais."
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        actions={
                            <div className="flex items-center gap-3">
                                <PrimaryButton onClick={() => handleOpenModal()}>
                                    <span>+ Novo Plano</span>
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
                                <p className="text-slate-400 text-xs mt-1">Clique no botão "+ Novo Plano" para criar o primeiro pacote.</p>
                            </CardBody>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {planos.map((p) => {
                                const recursosLista = parseRecursos(p.recursos);
                                const isDestaque = Boolean(p.destaque);

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
                                            <p className="text-xs text-slate-500 min-h-[48px] leading-relaxed mb-4">{p.descricao || "Sem descrição cadastrada."}</p>

                                            {/* Bloco de Preço */}
                                            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 mb-5">
                                                {p.tipo_cobranca !== "porcentagem" ? (
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-xs font-semibold text-slate-400">R$</span>
                                                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                                                            {parseFloat(p.valor_mensal).toFixed(2).replace(".", ",")}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-medium">/ mês</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-lg font-extrabold text-slate-800">
                                                        Sem Custo Fixo
                                                    </div>
                                                )}

                                                {parseFloat(p.comissao_porcentagem) > 0 && (
                                                    <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                                                        <span>📈</span> {p.comissao_porcentagem}% sobre vendas Wi-Fi
                                                    </div>
                                                )}
                                            </div>

                                            {/* Limites de Hardware */}
                                            <div className="space-y-2 text-xs border-b border-[#e2e8f0] pb-4 mb-4">
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
                                            </div>

                                            {/* Lista de Recursos / Checklist */}
                                            {recursosLista.length > 0 && (
                                                <div className="space-y-2 mb-6">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Incluso no plano:</p>
                                                    <ul className="space-y-1.5">
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
                                                onClick={() => handleOpenModal(p)}
                                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                                            >
                                                Editar
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

                    {/* Modal de Criação / Edição de Plano */}
                    {showModal && (
                        <Modal
                            isOpen={showModal}
                            onClose={() => setShowModal(false)}
                            title={editId ? "Editar Plano de Assinatura" : "Novo Plano de Assinatura"}
                            size="md"
                            footer={
                                <div className="flex gap-3 w-full">
                                    <SecondaryButton
                                        variant="subtle"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </SecondaryButton>
                                    <PrimaryButton
                                        onClick={handleSubmit}
                                        className="flex-1"
                                    >
                                        {editId ? "Salvar Alterações" : "Criar Plano"}
                                    </PrimaryButton>
                                </div>
                            }
                        >
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                        Nome do Plano *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Plano Pro (Mais Popular)"
                                        value={form.nome}
                                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                        className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                        Descrição Comercial
                                    </label>
                                    <textarea
                                        rows="2"
                                        placeholder="Resumo dos benefícios e público-alvo deste plano..."
                                        value={form.descricao}
                                        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                        className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                            Tipo de Cobrança
                                        </label>
                                        <select
                                            value={form.tipo_cobranca}
                                            onChange={(e) => setForm({ ...form, tipo_cobranca: e.target.value })}
                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                        >
                                            <option value="fixo">Mensalidade Fixa</option>
                                            <option value="porcentagem">Revenue Share (%)</option>
                                            <option value="hibrido">Híbrido (Mensal + %)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={form.ativo}
                                            onChange={(e) => setForm({ ...form, ativo: parseInt(e.target.value, 10) })}
                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                        >
                                            <option value={1}>Ativo (Disponível)</option>
                                            <option value={0}>Inativo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                            Valor Mensal (R$)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.valor_mensal}
                                            onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                            Comissão sobre Vendas (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={form.comissao_porcentagem}
                                            onChange={(e) => setForm({ ...form, comissao_porcentagem: e.target.value })}
                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                            Limite de MikroTiks (0=Ilimitado)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.limite_mikrotiks}
                                            onChange={(e) => setForm({ ...form, limite_mikrotiks: e.target.value })}
                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                            Limite de Portais (0=Ilimitado)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.limite_portais}
                                            onChange={(e) => setForm({ ...form, limite_portais: e.target.value })}
                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                        />
                                    </div>
                                </div>

                                {/* Recursos / Itens Inclusos (1 por linha) */}
                                <div>
                                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                                        Benefícios & Recursos Inclusos (1 item por linha)
                                    </label>
                                    <textarea
                                        rows="4"
                                        placeholder="1 Roteador MikroTik&#10;Captura de Leads & LGPD&#10;Login Social Google/Facebook&#10;Suporte WhatsApp"
                                        value={form.recursos}
                                        onChange={(e) => setForm({ ...form, recursos: e.target.value })}
                                        className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm font-mono text-xs focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                    />
                                </div>

                                {/* Controle de Módulos (Ligado/Desligado) */}
                                <div className="space-y-3 pt-2 border-t border-[#e2e8f0]">
                                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-2 text-indigo-700">⚙️ Arquitetura Modular (Quais seções o cliente terá acesso?)</label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                            <input
                                                type="checkbox"
                                                id="modVpnCheck"
                                                checked={Boolean(form.mod_vpn)}
                                                onChange={(e) => setForm({ ...form, mod_vpn: e.target.checked ? 1 : 0 })}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                                            />
                                            <label htmlFor="modVpnCheck" className="text-xs font-bold text-slate-700 cursor-pointer">📡 Acesso Remoto e VPNs</label>
                                        </div>
                                        <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                            <input
                                                type="checkbox"
                                                id="modHotspotCheck"
                                                checked={Boolean(form.mod_hotspot)}
                                                onChange={(e) => setForm({ ...form, mod_hotspot: e.target.checked ? 1 : 0 })}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                                            />
                                            <label htmlFor="modHotspotCheck" className="text-xs font-bold text-slate-700 cursor-pointer">🌐 Portais Captivos (Hotspot)</label>
                                        </div>
                                        <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                            <input
                                                type="checkbox"
                                                id="modCrmCheck"
                                                checked={Boolean(form.permite_automacao_whatsapp)}
                                                onChange={(e) => setForm({ ...form, permite_automacao_whatsapp: e.target.checked ? 1 : 0 })}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                                            />
                                            <label htmlFor="modCrmCheck" className="text-xs font-bold text-slate-700 cursor-pointer">💬 Automações CRM (WhatsApp)</label>
                                        </div>
                                        <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                            <input
                                                type="checkbox"
                                                id="modVendasCheck"
                                                checked={Boolean(form.permite_portal_vendas)}
                                                onChange={(e) => setForm({ ...form, permite_portal_vendas: e.target.checked ? 1 : 0 })}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                                            />
                                            <label htmlFor="modVendasCheck" className="text-xs font-bold text-slate-700 cursor-pointer">💲 Módulo de Vendas (PIX)</label>
                                        </div>
                                        <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                            <input
                                                type="checkbox"
                                                id="modMultiPixCheck"
                                                checked={Boolean(form.permite_multiplos_pix)}
                                                onChange={(e) => setForm({ ...form, permite_multiplos_pix: e.target.checked ? 1 : 0 })}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                                            />
                                            <label htmlFor="modMultiPixCheck" className="text-xs font-bold text-slate-700 cursor-pointer">💸 Saques Bifurcados (Split PIX)</label>
                                        </div>
                                    </div>
                                </div>

                                {/* Checkboxes Visuais (Site) */}
                                <div className="space-y-3 pt-4 border-t border-[#e2e8f0]">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="exibirSiteCheck"
                                            checked={Boolean(form.exibir_no_site)}
                                            onChange={(e) => setForm({ ...form, exibir_no_site: e.target.checked ? 1 : 0 })}
                                            className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb]"
                                        />
                                        <label htmlFor="exibirSiteCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                                            👁️ Exibir este plano abertamente no Site Público (Landing Page)
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="destaqueCheck"
                                            checked={Boolean(form.destaque)}
                                            onChange={(e) => setForm({ ...form, destaque: e.target.checked ? 1 : 0 })}
                                            className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb]"
                                        />
                                        <label htmlFor="destaqueCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                                            ⭐ Marcar este plano como "Mais Popular" (Destaque principal)
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </Modal>
                    )}
                </div>
            </div>

        </AdminLayout>
    );
}