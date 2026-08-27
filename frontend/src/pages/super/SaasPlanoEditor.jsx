import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";
import {
    PageHeader,
    Card,
    CardBody,
    CardHeader,
    PrimaryButton,
    SecondaryButton,
    StatusBadge
} from "../../components/ui";

const DEFAULT_MODULOS = {
    mod_vpn: true,
    mod_hotspot: true,
    mod_leads: true,
    mod_whatsapp: true,
    mod_ia: true,
    mod_vendas: true,
    mod_cupons: true,
    mod_cardapio: true,
    mod_analytics: true,
    mod_vouchers: true,
    mod_filiais: false,
    mod_smtp: true,
    mod_webhooks: true
};

const MODULOS_DEFINITIONS = [
    {
        key: "mod_vpn",
        label: "Acesso Remoto VPN & Winbox",
        icon: "📡",
        categoria: "Infraestrutura",
        desc: "WireGuard VPN, WebFig seguro em 1-clique e mapeamento de portas Winbox"
    },
    {
        key: "mod_hotspot",
        label: "Portais Captivos & Hotspot",
        icon: "🌐",
        categoria: "Rede & Wi-Fi",
        desc: "Criação de portais Wi-Fi, personalização de telas e múltiplos roteadores"
    },
    {
        key: "mod_leads",
        label: "Captura de Leads & LGPD",
        icon: "👥",
        categoria: "Marketing",
        desc: "Base de visitantes, termos de consentimento LGPD e exportação de contatos"
    },
    {
        key: "mod_whatsapp",
        label: "CRM & WhatsApp Oficial",
        icon: "💬",
        categoria: "Marketing",
        desc: "Instância WhatsApp conectada, automações de mensagens e disparos em massa"
    },
    {
        key: "mod_ia",
        label: "Atendimento com IA (Chatbot)",
        icon: "🤖",
        categoria: "Inteligência Artificial",
        desc: "Chatbot de suporte com IA (ChatGPT / n8n) integrado ao WhatsApp"
    },
    {
        key: "mod_vendas",
        label: "Venda de Wi-Fi Pago (PIX)",
        icon: "💲",
        categoria: "Monetização",
        desc: "Planos de tempo/velocidade, PIX Mercado Pago e venda de fichas online"
    },
    {
        key: "mod_cupons",
        label: "Cupons & Fidelidade",
        icon: "🏷️",
        categoria: "Fidelização",
        desc: "Cupons de desconto pós-conexão e validador de caixa para o comerciante"
    },
    {
        key: "mod_cardapio",
        label: "Cardápio Digital QR Code",
        icon: "🍽️",
        categoria: "Vendas",
        desc: "Cardápio digital mobile interativo para mesas, balcão e delivery"
    },
    {
        key: "mod_analytics",
        label: "Analytics & Horários de Pico",
        icon: "📊",
        categoria: "Métricas",
        desc: "Métricas de recorrência, fluxo de pico e pesquisas de satisfação NPS"
    },
    {
        key: "mod_vouchers",
        label: "Gerador de Vouchers",
        icon: "🎟️",
        categoria: "Acesso",
        desc: "Lotes de senhas temporárias e impressão de cartões de acesso em PDF"
    },
    {
        key: "mod_filiais",
        label: "Multi-Filiais & Franquias",
        icon: "🏢",
        categoria: "Corporativo",
        desc: "Gestão centralizada de múltiplas unidades, lojas e redes"
    },
    {
        key: "mod_smtp",
        label: "Servidor SMTP Próprio",
        icon: "📧",
        categoria: "Comunicação",
        desc: "Configuração de servidor de e-mail próprio do estabelecimento"
    },
    {
        key: "mod_webhooks",
        label: "Webhooks Outbound (n8n)",
        icon: "🔗",
        categoria: "Integrações",
        desc: "Disparos de eventos em tempo real para n8n, Zapier e CRMs externos"
    }
];

export default function SaasPlanoEditor() {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("comercial"); // 'comercial' | 'limites' | 'modulos'

    const [form, setForm] = useState({
        nome: "",
        descricao: "",
        tipo_cobranca: "fixo",
        valor_mensal: "97.00",
        valor_anual: "",
        dias_trial: 7,
        comissao_porcentagem: "0.00",
        limite_mikrotiks: 1,
        limite_portais: 1,
        limite_leads: 0,
        limite_whatsapp: 0,
        limite_filiais: 1,
        limite_usuarios: 2,
        destaque: 0,
        recursos: "1 Roteador MikroTik\n1 Portal Captivo\nCaptura de Leads & LGPD\nSuporte via WhatsApp",
        ativo: 1,
        exibir_no_site: 1,
        permite_portal_vendas: 0,
        permite_automacao_whatsapp: 0,
        permite_multiplos_pix: 0,
        mod_vpn: 1,
        mod_hotspot: 1,
        modulos_liberados: { ...DEFAULT_MODULOS }
    });

    const token = localStorage.getItem("admin_token");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate("/admin");
            return;
        }
        if (isEdit) {
            fetchPlano();
        }
    }, [id]);

    const fetchPlano = async () => {
        try {
            const res = await fetch(`/api/saas-planos/${id}`, { headers });
            if (res.ok) {
                const plano = await res.json();
                let recursosTexto = "";
                if (plano.recursos) {
                    try {
                        const parsed = typeof plano.recursos === "string" ? JSON.parse(plano.recursos) : plano.recursos;
                        recursosTexto = Array.isArray(parsed) ? parsed.join("\n") : String(plano.recursos);
                    } catch {
                        recursosTexto = plano.recursos;
                    }
                }

                let modulos = { ...DEFAULT_MODULOS };
                if (plano.modulos_liberados) {
                    try {
                        const parsedMods = typeof plano.modulos_liberados === "string"
                            ? JSON.parse(plano.modulos_liberados)
                            : plano.modulos_liberados;
                        modulos = { ...DEFAULT_MODULOS, ...parsedMods };
                    } catch {
                        modulos = { ...DEFAULT_MODULOS };
                    }
                } else {
                    modulos.mod_vpn = Boolean(plano.mod_vpn ?? 1);
                    modulos.mod_hotspot = Boolean(plano.mod_hotspot ?? 1);
                    modulos.mod_vendas = Boolean(plano.permite_portal_vendas);
                    modulos.mod_whatsapp = Boolean(plano.permite_automacao_whatsapp);
                }

                setForm({
                    nome: plano.nome,
                    descricao: plano.descricao || "",
                    tipo_cobranca: plano.tipo_cobranca || "fixo",
                    valor_mensal: plano.valor_mensal || "0.00",
                    valor_anual: plano.valor_anual ? String(plano.valor_anual) : "",
                    dias_trial: plano.dias_trial !== undefined ? plano.dias_trial : 7,
                    comissao_porcentagem: plano.comissao_porcentagem || "0.00",
                    limite_mikrotiks: plano.limite_mikrotiks !== undefined ? plano.limite_mikrotiks : 1,
                    limite_portais: plano.limite_portais !== undefined ? plano.limite_portais : 1,
                    limite_leads: plano.limite_leads !== undefined ? plano.limite_leads : 0,
                    limite_whatsapp: plano.limite_whatsapp !== undefined ? plano.limite_whatsapp : 0,
                    limite_filiais: plano.limite_filiais !== undefined ? plano.limite_filiais : 1,
                    limite_usuarios: plano.limite_usuarios !== undefined ? plano.limite_usuarios : 2,
                    destaque: plano.destaque ? 1 : 0,
                    recursos: recursosTexto,
                    ativo: plano.ativo !== undefined ? plano.ativo : 1,
                    exibir_no_site: plano.exibir_no_site !== undefined ? plano.exibir_no_site : 1,
                    permite_portal_vendas: plano.permite_portal_vendas ? 1 : 0,
                    permite_automacao_whatsapp: plano.permite_automacao_whatsapp ? 1 : 0,
                    permite_multiplos_pix: plano.permite_multiplos_pix ? 1 : 0,
                    mod_vpn: plano.mod_vpn !== undefined ? plano.mod_vpn : 1,
                    mod_hotspot: plano.mod_hotspot !== undefined ? plano.mod_hotspot : 1,
                    modulos_liberados: modulos
                });
            } else {
                alert("Plano não encontrado.");
                navigate("/super/saas-planos");
            }
        } catch (err) {
            console.error("Erro ao buscar plano SaaS:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleModulo = (key) => {
        setForm(prev => {
            const updated = {
                ...prev.modulos_liberados,
                [key]: !prev.modulos_liberados[key]
            };
            return {
                ...prev,
                modulos_liberados: updated,
                mod_vpn: updated.mod_vpn ? 1 : 0,
                mod_hotspot: updated.mod_hotspot ? 1 : 0,
                permite_portal_vendas: updated.mod_vendas ? 1 : 0,
                permite_automacao_whatsapp: updated.mod_whatsapp ? 1 : 0
            };
        });
    };

    const applyTemplate = (type) => {
        if (type === "vpn_only") {
            const mods = {
                mod_vpn: true,
                mod_hotspot: false,
                mod_leads: false,
                mod_whatsapp: false,
                mod_ia: false,
                mod_vendas: false,
                mod_cupons: false,
                mod_cardapio: false,
                mod_analytics: false,
                mod_vouchers: false,
                mod_filiais: false,
                mod_smtp: false,
                mod_webhooks: false
            };
            setForm(prev => ({
                ...prev,
                nome: prev.nome || "Plano VPN & Winbox Remoto",
                descricao: "Acesso remoto dedicado para MikroTik com VPN WireGuard, WebFig e Túneis Winbox.",
                valor_mensal: "29.90",
                valor_anual: "299.00",
                limite_mikrotiks: 3,
                limite_portais: 0,
                modulos_liberados: mods,
                mod_vpn: 1,
                mod_hotspot: 0,
                permite_portal_vendas: 0,
                permite_automacao_whatsapp: 0,
                recursos: "Acesso Remoto VPN WireGuard\nWebFig Seguro em 1-Clique\nPortas Públicas Winbox Dedicadas\nMonitoramento de Status e Latência\nSem Limite de Tráfego"
            }));
        } else if (type === "crm_only") {
            const mods = {
                mod_vpn: false,
                mod_hotspot: false,
                mod_leads: true,
                mod_whatsapp: true,
                mod_ia: true,
                mod_vendas: false,
                mod_cupons: true,
                mod_cardapio: false,
                mod_analytics: true,
                mod_vouchers: false,
                mod_filiais: false,
                mod_smtp: true,
                mod_webhooks: true
            };
            setForm(prev => ({
                ...prev,
                nome: prev.nome || "Plano CRM & Robô WhatsApp",
                descricao: "CRM completo com automações de WhatsApp e inteligência artificial para atendimento.",
                valor_mensal: "69.90",
                valor_anual: "690.00",
                limite_mikrotiks: 0,
                limite_portais: 0,
                limite_whatsapp: 1000,
                modulos_liberados: mods,
                mod_vpn: 0,
                mod_hotspot: 0,
                permite_portal_vendas: 0,
                permite_automacao_whatsapp: 1,
                recursos: "Instância Oficial WhatsApp Conectada\nAutomações de Mensagens e Aniversário\nAtendimento Inteligente com IA\nGestão e Segmentação de Contatos\nDisparos em Massa"
            }));
        } else if (type === "hotspot_padrao") {
            const mods = {
                mod_vpn: true,
                mod_hotspot: true,
                mod_leads: true,
                mod_whatsapp: false,
                mod_ia: false,
                mod_vendas: false,
                mod_cupons: true,
                mod_cardapio: true,
                mod_analytics: true,
                mod_vouchers: true,
                mod_filiais: false,
                mod_smtp: true,
                mod_webhooks: false
            };
            setForm(prev => ({
                ...prev,
                nome: prev.nome || "Plano Hotspot & Leads",
                descricao: "Captura de leads, conformidade LGPD e marketing para comércios e eventos.",
                valor_mensal: "97.00",
                valor_anual: "970.00",
                limite_mikrotiks: 1,
                limite_portais: 2,
                modulos_liberados: mods,
                mod_vpn: 1,
                mod_hotspot: 1,
                permite_portal_vendas: 0,
                permite_automacao_whatsapp: 0,
                recursos: "1 Roteador MikroTik\n2 Portais Captivos Personalizados\nCaptura de Leads & LGPD Ilimitada\nLogin Social (Google / Facebook)\nCupons Promocionais & Cardápio QR"
            }));
        } else if (type === "full") {
            const mods = {
                mod_vpn: true,
                mod_hotspot: true,
                mod_leads: true,
                mod_whatsapp: true,
                mod_ia: true,
                mod_vendas: true,
                mod_cupons: true,
                mod_cardapio: true,
                mod_analytics: true,
                mod_vouchers: true,
                mod_filiais: true,
                mod_smtp: true,
                mod_webhooks: true
            };
            setForm(prev => ({
                ...prev,
                modulos_liberados: mods,
                mod_vpn: 1,
                mod_hotspot: 1,
                permite_portal_vendas: 1,
                permite_automacao_whatsapp: 1
            }));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);

        try {
            const recursosArray = form.recursos
                ? form.recursos.split("\n").map(r => r.trim()).filter(Boolean)
                : [];

            const payload = {
                ...form,
                recursos: recursosArray
            };

            const url = isEdit ? `/api/saas-planos/${id}` : "/api/saas-planos";
            const method = isEdit ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });

            if (res.ok) {
                navigate("/super/saas-planos");
            } else {
                const data = await res.json();
                alert(data.message || "Erro ao salvar plano.");
            }
        } catch (err) {
            console.error("Erro ao salvar plano SaaS:", err);
            alert("Erro de conexão ao salvar plano.");
        } finally {
            setSaving(false);
        }
    };

    const recursosArray = form.recursos
        ? form.recursos.split("\n").map(r => r.trim()).filter(Boolean)
        : [];

    const totalModulosAtivos = Object.values(form.modulos_liberados || {}).filter(Boolean).length;

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-screen bg-[#f1f5f9] p-8 text-center text-slate-400 font-medium">
                    Carregando dados do plano...
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-[#f1f5f9] text-slate-700 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header com Navegação e Ações */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Link
                                    to="/super/saas-planos"
                                    className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                >
                                    <span>←</span> Voltar aos Planos
                                </Link>
                                <span className="text-slate-300">/</span>
                                <span className="text-xs font-semibold text-slate-400">
                                    {isEdit ? "Edição" : "Novo Cadastro"}
                                </span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                                <span>{isEdit ? "✏️ Editar Plano de Assinatura" : "✨ Novo Plano Modular"}</span>
                                {form.nome && (
                                    <span className="text-lg font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                                        {form.nome}
                                    </span>
                                )}
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Configure preços, cotas operacionais e libere ferramentas individuais para o cliente.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <SecondaryButton
                                onClick={() => navigate("/super/saas-planos")}
                            >
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton
                                onClick={handleSubmit}
                                disabled={saving}
                            >
                                {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Publicar Plano"}
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Presets Rápidos de 1-Clique */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⚡</span>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800">Modelos Prontos de Pacotes (1-Clique)</h4>
                                <p className="text-[11px] text-slate-400">Preenche automaticamente os módulos e textos recomendados</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => applyTemplate("vpn_only")}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <span>📡</span> VPN Winbox Exclusivo
                            </button>
                            <button
                                type="button"
                                onClick={() => applyTemplate("crm_only")}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <span>💬</span> CRM WhatsApp Exclusivo
                            </button>
                            <button
                                type="button"
                                onClick={() => applyTemplate("hotspot_padrao")}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <span>🌐</span> Hotspot Wi-Fi & Leads
                            </button>
                            <button
                                type="button"
                                onClick={() => applyTemplate("full")}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <span>👑</span> Full Enterprise (Tudo)
                            </button>
                        </div>
                    </div>

                    {/* Layout Principal: Formulário (Esquerda) + Live Preview (Direita) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Coluna Esquerda: Formulário e Abas (8 colunas) */}
                        <div className="lg:col-span-8 space-y-6">
                            <Card>
                                {/* Barra de Abas */}
                                <div className="flex border-b border-slate-200 px-6 pt-4 gap-4 bg-slate-50/50 rounded-t-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("comercial")}
                                        className={`pb-3 px-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${activeTab === "comercial"
                                            ? "border-[#2563eb] text-[#2563eb]"
                                            : "border-transparent text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        <span>🏷️</span> Comercial & Preços
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("limites")}
                                        className={`pb-3 px-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${activeTab === "limites"
                                            ? "border-[#2563eb] text-[#2563eb]"
                                            : "border-transparent text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        <span>⚙️</span> Limites & Cotas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("modulos")}
                                        className={`pb-3 px-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${activeTab === "modulos"
                                            ? "border-[#2563eb] text-[#2563eb]"
                                            : "border-transparent text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        <span>🧩</span> Módulos Liberados ("À La Carte")
                                        <span className="px-2 py-0.5 bg-blue-100 text-[#2563eb] rounded-full text-[10px]">
                                            {totalModulosAtivos}/13
                                        </span>
                                    </button>
                                </div>

                                <CardBody className="p-6">
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* ABA 1: COMERCIAL & PREÇOS */}
                                        {activeTab === "comercial" && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                        Nome do Plano *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Ex: Plano Pro (Mais Popular)"
                                                        value={form.nome}
                                                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                                        className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                        Descrição Comercial (Aparece no topo do Card)
                                                    </label>
                                                    <textarea
                                                        rows="2"
                                                        placeholder="Resumo dos benefícios e público-alvo deste plano..."
                                                        value={form.descricao}
                                                        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                                        className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                            Tipo de Cobrança
                                                        </label>
                                                        <select
                                                            value={form.tipo_cobranca}
                                                            onChange={(e) => setForm({ ...form, tipo_cobranca: e.target.value })}
                                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        >
                                                            <option value="fixo">Mensalidade Fixa</option>
                                                            <option value="porcentagem">Revenue Share (%)</option>
                                                            <option value="hibrido">Híbrido (Mensal + %)</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                            Status do Plano
                                                        </label>
                                                        <select
                                                            value={form.ativo}
                                                            onChange={(e) => setForm({ ...form, ativo: parseInt(e.target.value, 10) })}
                                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        >
                                                            <option value={1}>Ativo (Disponível para Venda)</option>
                                                            <option value={0}>Inativo</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                            Valor Mensal (R$)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={form.valor_mensal}
                                                            onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                            Valor Anual com Desconto (R$)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="Ex: 970.00"
                                                            value={form.valor_anual}
                                                            onChange={(e) => setForm({ ...form, valor_anual: e.target.value })}
                                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                            Dias de Teste Grátis (Trial)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={form.dias_trial}
                                                            onChange={(e) => setForm({ ...form, dias_trial: e.target.value })}
                                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                    </div>
                                                </div>

                                                {form.tipo_cobranca !== "fixo" && (
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                            Comissão sobre Vendas Wi-Fi (%)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={form.comissao_porcentagem}
                                                            onChange={(e) => setForm({ ...form, comissao_porcentagem: e.target.value })}
                                                            className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                    </div>
                                                )}

                                                {/* Opções de Visibilidade */}
                                                <div className="space-y-3 pt-4 border-t border-slate-200">
                                                    <div className="flex items-center gap-2.5">
                                                        <input
                                                            type="checkbox"
                                                            id="exibirSiteCheck"
                                                            checked={Boolean(form.exibir_no_site)}
                                                            onChange={(e) => setForm({ ...form, exibir_no_site: e.target.checked ? 1 : 0 })}
                                                            className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb]"
                                                        />
                                                        <label htmlFor="exibirSiteCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                                                            👁️ Exibir este plano abertamente no Site Público (Landing Page & Checkout)
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <input
                                                            type="checkbox"
                                                            id="destaqueCheck"
                                                            checked={Boolean(form.destaque)}
                                                            onChange={(e) => setForm({ ...form, destaque: e.target.checked ? 1 : 0 })}
                                                            className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb]"
                                                        />
                                                        <label htmlFor="destaqueCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                                                            ⭐ Marcar este plano como "Mais Popular" (Destaque visual azul no site)
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ABA 2: LIMITES & COTAS */}
                                        {activeTab === "limites" && (
                                            <div className="space-y-4">
                                                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 flex items-center gap-2">
                                                    <span>💡</span>
                                                    <span>
                                                        Defina os tetos operacionais deste plano. Informe <strong>0</strong> em qualquer campo para liberar de forma <strong>ilimitada</strong>.
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                            <span>📡</span> Limite de MikroTiks (Roteadores)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={form.limite_mikrotiks}
                                                            onChange={(e) => setForm({ ...form, limite_mikrotiks: e.target.value })}
                                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                        <span className="text-[10px] text-slate-400 mt-1 block">0 = Roteadores Ilimitados</span>
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                            <span>🌐</span> Limite de Portais Captivos
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={form.limite_portais}
                                                            onChange={(e) => setForm({ ...form, limite_portais: e.target.value })}
                                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                        <span className="text-[10px] text-slate-400 mt-1 block">0 = Portais Ilimitados</span>
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                            <span>👥</span> Limite de Leads / Cadastros (mês)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={form.limite_leads}
                                                            onChange={(e) => setForm({ ...form, limite_leads: e.target.value })}
                                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                        <span className="text-[10px] text-slate-400 mt-1 block">0 = Leads Ilimitados</span>
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                            <span>💬</span> Limite de Disparos WhatsApp (mês)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={form.limite_whatsapp}
                                                            onChange={(e) => setForm({ ...form, limite_whatsapp: e.target.value })}
                                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                        <span className="text-[10px] text-slate-400 mt-1 block">0 = Disparos Ilimitados</span>
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                            <span>🏢</span> Limite de Filiais / Lojas
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={form.limite_filiais}
                                                            onChange={(e) => setForm({ ...form, limite_filiais: e.target.value })}
                                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                        <span className="text-[10px] text-slate-400 mt-1 block">0 = Filiais Ilimitadas</span>
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                            <span>👤</span> Limite de Usuários / Atendentes
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={form.limite_usuarios}
                                                            onChange={(e) => setForm({ ...form, limite_usuarios: e.target.value })}
                                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                                                        />
                                                        <span className="text-[10px] text-slate-400 mt-1 block">0 = Operadores Ilimitados</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ABA 3: MÓDULOS LIBERADOS */}
                                        {activeTab === "modulos" && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-800">Controle de Módulos ("À La Carte")</h4>
                                                        <p className="text-[11px] text-slate-500">
                                                            Ligue ou desligue as ferramentas que o cliente poderá acessar no painel dele.
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => applyTemplate("full")}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-300 text-blue-600 rounded-lg text-xs font-bold cursor-pointer transition-all"
                                                        >
                                                            Marcar Todos
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {MODULOS_DEFINITIONS.map((mod) => {
                                                        const isChecked = Boolean(form.modulos_liberados?.[mod.key]);
                                                        return (
                                                            <div
                                                                key={mod.key}
                                                                onClick={() => handleToggleModulo(mod.key)}
                                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${isChecked
                                                                    ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-500/20 shadow-sm"
                                                                    : "bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100"
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => { }}
                                                                    className="w-4 h-4 text-[#2563eb] rounded border-slate-300 focus:ring-[#2563eb] mt-0.5 pointer-events-none"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                                        <span>{mod.icon}</span>
                                                                        <span className={`text-xs font-bold ${isChecked ? "text-slate-900" : "text-slate-600"}`}>
                                                                            {mod.label}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 leading-tight">
                                                                        {mod.desc}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Benefícios Inclusos */}
                                                <div className="pt-4 border-t border-slate-200">
                                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                                                        Benefícios & Recursos Exibidos no Card (1 por linha)
                                                    </label>
                                                    <textarea
                                                        rows="4"
                                                        placeholder="1 Roteador MikroTik&#10;Captura de Leads & LGPD&#10;Login Social Google/Facebook&#10;Suporte WhatsApp"
                                                        value={form.recursos}
                                                        onChange={(e) => setForm({ ...form, recursos: e.target.value })}
                                                        className="w-full bg-[#f8fafc] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-[#2563eb]"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </form>
                                </CardBody>
                            </Card>
                        </div>

                        {/* Coluna Direita: Live Preview Card (4 colunas) */}
                        <div className="lg:col-span-4 sticky top-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <span>👁️</span> Pré-Visualização em Tempo Real
                                </h3>
                                <span className="text-[10px] text-slate-400">Como o cliente vê</span>
                            </div>

                            {/* Card Visual de Preview */}
                            <div
                                className={`bg-white border rounded-2xl p-6 shadow-sm relative transition-all duration-200 ${form.destaque
                                    ? "border-[#2563eb] ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/20 to-white"
                                    : "border-slate-200"
                                    }`}
                            >
                                {Boolean(form.destaque) && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#2563eb] text-white text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                                        ⭐ Mais Popular
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#2563eb] border border-blue-200">
                                        {form.tipo_cobranca === "fixo" ? "Mensalidade Fixa" : form.tipo_cobranca === "porcentagem" ? "Revenue Share" : "Híbrido"}
                                    </span>

                                    <StatusBadge
                                        variant={form.ativo ? "success" : "danger"}
                                        label={form.ativo ? "Ativo" : "Inativo"}
                                    />
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-1">
                                    {form.nome || "Nome do Plano"}
                                </h3>
                                <p className="text-xs text-slate-500 min-h-[36px] leading-relaxed mb-4">
                                    {form.descricao || "Descrição breve do plano aparecerá aqui..."}
                                </p>

                                {/* Preço Preview */}
                                <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 mb-4">
                                    {form.tipo_cobranca !== "porcentagem" ? (
                                        <div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-semibold text-slate-400">R$</span>
                                                <span className="text-3xl font-black text-slate-900 tracking-tight">
                                                    {parseFloat(form.valor_mensal || 0).toFixed(2).replace(".", ",")}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">/ mês</span>
                                            </div>

                                            {form.valor_anual && parseFloat(form.valor_anual) > 0 && (
                                                <div className="text-[11px] font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                                                    <span>💳</span> R$ {parseFloat(form.valor_anual).toFixed(2).replace(".", ",")} / ano
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-lg font-extrabold text-slate-800">
                                            Sem Custo Fixo
                                        </div>
                                    )}

                                    {parseFloat(form.comissao_porcentagem) > 0 && (
                                        <div className="text-xs font-bold text-emerald-700 mt-1.5 flex items-center gap-1">
                                            <span>📈</span> {form.comissao_porcentagem}% sobre vendas Wi-Fi
                                        </div>
                                    )}

                                    {parseInt(form.dias_trial) > 0 && (
                                        <div className="text-[11px] font-bold text-indigo-700 mt-1.5 flex items-center gap-1">
                                            <span>🎁</span> {form.dias_trial} dias de teste grátis (Trial)
                                        </div>
                                    )}
                                </div>

                                {/* Cotas & Módulos */}
                                <div className="space-y-2 text-xs border-b border-slate-100 pb-3 mb-3">
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span>📡 Roteadores:</span>
                                        <span className="font-bold text-slate-800">
                                            {parseInt(form.limite_mikrotiks) === 0 ? "Ilimitado" : `${form.limite_mikrotiks} un.`}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span>🌐 Portais Captivos:</span>
                                        <span className="font-bold text-slate-800">
                                            {parseInt(form.limite_portais) === 0 ? "Ilimitado" : `${form.limite_portais} un.`}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600">
                                        <span>🧩 Módulos Inclusos:</span>
                                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                                            {totalModulosAtivos} / 13 Módulos
                                        </span>
                                    </div>
                                </div>

                                {/* Lista de Recursos */}
                                {recursosArray.length > 0 && (
                                    <div className="space-y-1.5 mb-5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Incluso no pacote:</p>
                                        <ul className="space-y-1">
                                            {recursosArray.map((rec, idx) => (
                                                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 leading-tight">
                                                    <span className="text-blue-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                                                    <span>{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="w-full py-2.5 bg-[#2563eb] text-white rounded-xl text-xs font-bold shadow-sm opacity-90 cursor-default text-center"
                                >
                                    Assinar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
