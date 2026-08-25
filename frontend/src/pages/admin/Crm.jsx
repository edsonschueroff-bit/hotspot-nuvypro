import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

const API = "";

export default function Crm() {
    const [activeTab, setActiveTab] = useState("contatos"); // 'contatos' | 'chat' | 'automacoes' | 'templates' | 'historico'

    // State Contatos
    const [contatos, setContatos] = useState([]);
    const [loadingContatos, setLoadingContatos] = useState(true);
    const [search, setSearch] = useState("");
    const [origemFilter, setOrigemFilter] = useState("todos");
    const [periodoFilter, setPeriodoFilter] = useState("todos");
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

    // State Templates
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({ titulo: "", mensagem: "" });

    // State Envio de Mensagem (Modal)
    const [showSendModal, setShowSendModal] = useState(false);
    const [selectedContacto, setSelectedContacto] = useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [mensagemText, setMensagemText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);

    // State E-mail Marketing em Massa
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailAssunto, setEmailAssunto] = useState("");
    const [emailConteudo, setEmailConteudo] = useState("");
    const [disparandoEmail, setDisparandoEmail] = useState(false);

    // State Histórico
    const [historico, setHistorico] = useState([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    // State Automações (Nível 2)
    const [automacoes, setAutomacoes] = useState([]);
    const [loadingAutomacoes, setLoadingAutomacoes] = useState(false);

    // State Chat em Tempo Real (Nível 3)
    const [conversas, setConversas] = useState([]);
    const [loadingConversas, setLoadingConversas] = useState(false);
    const [activeChatPhone, setActiveChatPhone] = useState(null);
    const [activeChatName, setActiveChatName] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [loadingChatMessages, setLoadingChatMessages] = useState(false);
    const [inputChatMessage, setInputChatMessage] = useState("");
    const [chatSearch, setChatSearch] = useState("");
    const chatContainerRef = useRef(null);
    const prevChatPhoneRef = useRef(null);
    const prevMessagesCountRef = useRef(0);

    const token = localStorage.getItem("admin_token");

    // ── BUSCAR CONTATOS ──
    const fetchContatos = useCallback(async (page = 1) => {
        try {
            setLoadingContatos(true);
            const params = new URLSearchParams();
            params.append("page", page);
            params.append("limit", 50);
            if (search) params.append("q", search);
            if (origemFilter !== "todos") params.append("origem", origemFilter);
            if (periodoFilter !== "todos") params.append("periodo", periodoFilter);

            const res = await fetch(`${API}/api/crm/contatos?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            setContatos(data.data || []);
            if (data.pagination) {
                setPagination(data.pagination);
            }
        } catch (err) {
            console.error("Erro ao buscar contatos CRM:", err);
        } finally {
            setLoadingContatos(false);
        }
    }, [token, search, origemFilter, periodoFilter]);

    // ── BUSCAR TEMPLATES ──
    const fetchTemplates = useCallback(async () => {
        try {
            setLoadingTemplates(true);
            const res = await fetch(`${API}/api/crm/templates`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar templates CRM:", err);
        } finally {
            setLoadingTemplates(false);
        }
    }, [token]);

    // ── BUSCAR HISTÓRICO ──
    const fetchHistorico = useCallback(async () => {
        try {
            setLoadingHistorico(true);
            const res = await fetch(`${API}/api/crm/historico`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setHistorico(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar histórico CRM:", err);
        } finally {
            setLoadingHistorico(false);
        }
    }, [token]);

    // ── BUSCAR AUTOMAÇÕES ──
    const fetchAutomacoes = useCallback(async () => {
        try {
            setLoadingAutomacoes(true);
            const res = await fetch(`${API}/api/crm/automacoes`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setAutomacoes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar automações CRM:", err);
        } finally {
            setLoadingAutomacoes(false);
        }
    }, [token]);

    // ── BUSCAR CONVERSAS CHAT (NÍVEL 3) ──
    const fetchConversas = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/crm/chat/conversas`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setConversas(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar conversas chat:", err);
        }
    }, [token]);

    // ── BUSCAR MENSAGENS DE UM CHAT ──
    const fetchChatMessages = useCallback(async (phone) => {
        if (!phone) return;
        try {
            const res = await fetch(`${API}/api/crm/chat/mensagens/${phone}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setChatMessages(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar mensagens do chat:", err);
        }
    }, [token]);

    useEffect(() => {
        if (activeTab === "contatos") {
            fetchContatos(1);
        } else if (activeTab === "chat") {
            fetchConversas();
            fetchTemplates();
        } else if (activeTab === "templates") {
            fetchTemplates();
        } else if (activeTab === "historico") {
            fetchHistorico();
        } else if (activeTab === "automacoes") {
            fetchAutomacoes();
        }
    }, [activeTab, fetchContatos, fetchConversas, fetchTemplates, fetchHistorico, fetchAutomacoes]);

    // Auto-polling das conversas e mensagens do chat aberto a cada 3 segundos
    useEffect(() => {
        if (activeTab !== "chat") return;
        const interval = setInterval(() => {
            fetchConversas();
            if (activeChatPhone) {
                fetchChatMessages(activeChatPhone);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeTab, activeChatPhone, fetchConversas, fetchChatMessages]);

    // Auto-scroll inteligência para o Chat (sem puxar a tela/página inteira)
    useEffect(() => {
        if (activeTab !== "chat" || !chatContainerRef.current) return;

        const isNewPhone = prevChatPhoneRef.current !== activeChatPhone;
        const hasNewMessages = chatMessages.length > prevMessagesCountRef.current;

        const container = chatContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (isNewPhone || (hasNewMessages && isNearBottom)) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: isNewPhone ? "auto" : "smooth",
            });
        }

        prevChatPhoneRef.current = activeChatPhone;
        prevMessagesCountRef.current = chatMessages.length;
    }, [chatMessages, activeChatPhone, activeTab]);

    // Selecionar conversa na barra lateral do chat
    const handleSelectChat = (conv) => {
        setActiveChatPhone(conv.telefone);
        setActiveChatName(conv.cliente_nome || conv.telefone);
        fetchChatMessages(conv.telefone);
    };

    // Enviar mensagem no Chat ao Vivo
    const handleSendChatMessage = async (e) => {
        if (e) e.preventDefault();
        if (!activeChatPhone || !inputChatMessage.trim()) return;

        const msgToSend = inputChatMessage.trim();
        setInputChatMessage("");

        // Otimista
        setChatMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                telefone: activeChatPhone,
                cliente_nome: activeChatName,
                direcao: "enviada",
                mensagem: msgToSend,
                status: "enviado",
                criado_em: new Date().toISOString(),
            },
        ]);

        try {
            await fetch(`${API}/api/crm/chat/enviar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    telefone: activeChatPhone,
                    cliente_nome: activeChatName,
                    mensagem: msgToSend,
                }),
            });

            fetchChatMessages(activeChatPhone);
            fetchConversas();
        } catch (err) {
            console.error("Erro ao enviar mensagem no chat:", err);
        }
    };

    // Substituir tags
    const processarTags = (msg, contato) => {
        if (!msg || !contato) return msg || "";
        return msg
            .replace(/{nome}/g, contato.nome || "Cliente")
            .replace(/{telefone}/g, contato.telefone || "")
            .replace(/{email}/g, contato.email || "")
            .replace(/{cpf}/g, contato.cpf || "")
            .replace(/{mac}/g, contato.mac || "")
            .replace(/{origem}/g, contato.origens || "Hotspot");
    };

    // Modal Envio Rápido WhatsApp
    const handleOpenSendModal = async (contato) => {
        setSelectedContacto(contato);
        setSelectedTemplateId("");
        setMensagemText(`Olá ${contato.nome || "Cliente"}! Vi que você se conectou ao nosso Wi-Fi. Como podemos ajudar?`);

        if (templates.length === 0) {
            await fetchTemplates();
        }
        setShowSendModal(true);
    };

    const handleSelectTemplateInModal = (templateId) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;

        const tpl = templates.find((t) => String(t.id) === String(templateId));
        if (tpl && selectedContacto) {
            const msgProcessada = processarTags(tpl.mensagem, selectedContacto);
            setMensagemText(msgProcessada);
        }
    };

    const handleSendWhatsAppWeb = async () => {
        if (!selectedContacto || !mensagemText.trim()) return;

        const numLimpo = selectedContacto.telefone.replace(/\D/g, "");
        const numFormatado = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;

        try {
            await fetch(`${API}/api/crm/enviar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    cliente_nome: selectedContacto.nome,
                    telefone: selectedContacto.telefone,
                    mensagem: mensagemText,
                    tipo_envio: "manual",
                    status: "enviado",
                }),
            });
        } catch (e) {
            console.warn("Falha ao registrar histórico:", e);
        }

        const textEncoded = encodeURIComponent(mensagemText);
        window.open(`https://wa.me/${numFormatado}?text=${textEncoded}`, "_blank");
        setShowSendModal(false);
    };

    const handleSendViaApi = async () => {
        if (!selectedContacto || !mensagemText.trim()) return;
        setSendingMessage(true);

        try {
            const numLimpo = selectedContacto.telefone.replace(/\D/g, "");
            const numFormatado = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;

            const res = await fetch(`${API}/api/crm/chat/enviar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    telefone: numFormatado,
                    cliente_nome: selectedContacto.nome,
                    mensagem: mensagemText,
                }),
            });

            if (res.ok) {
                alert("Mensagem disparada com sucesso!");
                setShowSendModal(false);
            } else {
                alert("Erro ao disparar via API.");
            }
        } catch (err) {
            console.error("Erro ao enviar via API WhatsApp:", err);
        } finally {
            setSendingMessage(false);
        }
    };

    // Salvar Template
    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        if (!templateForm.titulo || !templateForm.mensagem) return;

        try {
            if (editingTemplate) {
                await fetch(`${API}/api/crm/templates/${editingTemplate.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(templateForm),
                });
            } else {
                await fetch(`${API}/api/crm/templates`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(templateForm),
                });
            }
            setShowTemplateModal(false);
            setEditingTemplate(null);
            setTemplateForm({ titulo: "", mensagem: "" });
            fetchTemplates();
        } catch (err) {
            console.error("Erro ao salvar template:", err);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este modelo de mensagem?")) return;
        try {
            await fetch(`${API}/api/crm/templates/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchTemplates();
        } catch (err) {
            console.error("Erro ao deletar template:", err);
        }
    };

    // Salvar Automação
    const handleSaveAutomacao = async (autoItem) => {
        try {
            const res = await fetch(`${API}/api/crm/automacoes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(autoItem),
            });

            if (res.ok) {
                alert(`Automação "${autoItem.titulo}" salva com sucesso!`);
                fetchAutomacoes();
            } else {
                alert("Erro ao salvar automação.");
            }
        } catch (err) {
            console.error("Erro ao salvar automação:", err);
        }
    };

    const handleToggleAutomacao = (index) => {
        const updated = [...automacoes];
        updated[index].ativo = !updated[index].ativo;
        setAutomacoes(updated);
        handleSaveAutomacao(updated[index]);
    };

    const handleFieldAutomacaoChange = (index, field, value) => {
        const updated = [...automacoes];
        updated[index][field] = value;
        setAutomacoes(updated);
    };

    const handleDispararEmailMassa = async (e) => {
        e.preventDefault();
        if (!emailAssunto || !emailConteudo) return alert("Assunto e conteúdo do e-mail são obrigatórios.");

        const emailsDestino = contatos.map(c => c.email).filter(Boolean);
        if (emailsDestino.length === 0) return alert("Nenhum e-mail válido encontrado na lista de contatos atual.");

        if (!confirm(`Deseja disparar este e-mail marketing para ${emailsDestino.length} contatos?`)) return;

        setDisparandoEmail(true);
        try {
            const res = await fetch(`${API}/api/crm/disparar-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    assunto: emailAssunto,
                    conteudoHtml: emailConteudo,
                    destinatarios: emailsDestino
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.mensagem || "E-mails disparados com sucesso!");
                setShowEmailModal(false);
                setEmailAssunto("");
                setEmailConteudo("");
            } else {
                alert(data.error || "Erro ao disparar e-mails.");
            }
        } catch (err) {
            alert("Erro de conexão ao disparar e-mails.");
        } finally {
            setDisparandoEmail(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return "-";
        return new Date(d).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const filteredConversas = conversas.filter((c) => {
        if (!chatSearch) return true;
        const term = chatSearch.toLowerCase();
        return (
            (c.cliente_nome && c.cliente_nome.toLowerCase().includes(term)) ||
            (c.telefone && c.telefone.includes(term)) ||
            (c.ult_mensagem && c.ult_mensagem.toLowerCase().includes(term))
        );
    });

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
                            <span>💬</span> CRM & Central de Atendimento WhatsApp
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Gerencie contatos do Hotspot, converse em tempo real via WhatsApp e automatize ações de marketing.
                        </p>
                    </div>
                    {activeTab === "contatos" && (
                        <button
                            onClick={() => setShowEmailModal(true)}
                            className="px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-xs cursor-pointer flex items-center gap-2 shadow-sm shadow-blue-500/20"
                        >
                            <span>✉️</span> Disparar E-mail Marketing
                        </button>
                    )}
                    {activeTab === "templates" && (
                        <button
                            onClick={() => {
                                setEditingTemplate(null);
                                setTemplateForm({ titulo: "", mensagem: "" });
                                setShowTemplateModal(true);
                            }}
                            className="px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm shadow-blue-500/20"
                        >
                            + Novo Template
                        </button>
                    )}
                </div>

                {/* ── Navigation Tabs (modernizados) ── */}
                <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-1 flex gap-1 overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    {[
                        { key: "contatos", icon: "👥", label: "Contatos", count: pagination.total || contatos.length },
                        { key: "chat", icon: "💬", label: "Chat Ao Vivo", count: conversas.length },
                        { key: "automacoes", icon: "⚡", label: "Automações", count: automacoes.filter(a => a.ativo).length },
                        { key: "templates", icon: "📝", label: "Templates", count: templates.length },
                        { key: "historico", icon: "📜", label: "Histórico" },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12px] font-600 whitespace-nowrap transition-all cursor-pointer ${activeTab === tab.key
                                ? "bg-[#2563eb] text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800 hover:bg-[#f8fafc]"
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-white/20 text-white" : "bg-[#f1f5f9] text-slate-500"}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── ABA 1: CONTATOS ── */}
                {activeTab === "contatos" && (
                    <div className="space-y-4">
                        {/* Filtros */}
                        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                            <div className="relative flex-1 max-w-md">
                                <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, WhatsApp, CPF, MAC..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full px-4 py-2 pl-10 bg-white border border-[#e2e8f0] rounded-[8px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] text-[13px]"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <select value={periodoFilter} onChange={(e) => setPeriodoFilter(e.target.value)} className="bg-white border border-[#e2e8f0] text-slate-700 text-[12px] rounded-[8px] px-3 py-2 focus:outline-none cursor-pointer">
                                    <option value="todos">📅 Todos os períodos</option>
                                    <option value="hoje">Hoje</option>
                                    <option value="7dias">Últimos 7 dias</option>
                                    <option value="30dias">Últimos 30 dias</option>
                                </select>
                                <select value={origemFilter} onChange={(e) => setOrigemFilter(e.target.value)} className="bg-white border border-[#e2e8f0] text-slate-700 text-[12px] rounded-[8px] px-3 py-2 focus:outline-none cursor-pointer">
                                    <option value="todos">🏷️ Todas as origens</option>
                                    <option value="lgpd">Cadastros LGPD</option>
                                    <option value="pagamento">Compradores (PIX/Cartão)</option>
                                    <option value="lead">Leads Marketing</option>
                                </select>
                            </div>
                        </div>

                        {/* Tabela de Contatos */}
                        <div className="bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                                            <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">Nome / Contato</th>
                                            <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">WhatsApp</th>
                                            <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider hidden md:table-cell">CPF</th>
                                            <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider hidden lg:table-cell">Origem</th>
                                            <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider hidden sm:table-cell">Última Conexão</th>
                                            <th className="text-center px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f1f5f9]">
                                        {loadingContatos ? (
                                            [1,2,3,4,5].map(i => (
                                                <tr key={i}>
                                                    <td colSpan="6" className="px-5 py-3">
                                                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : contatos.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-12 text-slate-400 text-[13px]">
                                                    Nenhum contato encontrado para estes filtros.
                                                </td>
                                            </tr>
                                        ) : (
                                            contatos.map((item, idx) => {
                                                const inicial = (item.nome || item.telefone || "C").charAt(0).toUpperCase();
                                                const cores = ["bg-[#eff6ff] text-[#2563eb]","bg-[#ecfdf5] text-[#10b981]","bg-[#fef3c7] text-amber-700","bg-[#fdf4ff] text-purple-700","bg-[#fff1f2] text-rose-700"];
                                                const cor = cores[idx % cores.length];
                                                const origemMap = {
                                                    lgpd: { label: "LGPD", cls: "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]" },
                                                    pagamento: { label: "Pagamento", cls: "bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]" },
                                                    lead: { label: "Lead", cls: "bg-[#fef3c7] text-amber-700 border-amber-200" },
                                                };
                                                const origemInfo = origemMap[item.origens?.toLowerCase()] || { label: item.origens || "Hotspot", cls: "bg-[#f8fafc] text-slate-500 border-[#e2e8f0]" };
                                                return (
                                                    <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-700 text-[13px] shrink-0 ${cor}`}>
                                                                    {inicial}
                                                                </div>
                                                                <div>
                                                                    <div className="font-600 text-slate-900 text-[13px]">{item.nome || "Cliente Hotspot"}</div>
                                                                    {item.email && <div className="text-[11px] text-slate-400">{item.email}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className="text-[#10b981] font-mono font-600 text-[12px]">{item.telefone || "—"}</span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell font-mono text-[11px]">{item.cpf || "—"}</td>
                                                        <td className="px-5 py-3.5 hidden lg:table-cell">
                                                            <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${origemInfo.cls}`}>
                                                                {origemInfo.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-slate-400 text-[11px] hidden sm:table-cell">{formatDate(item.ult_conexao)}</td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveTab("chat");
                                                                        setActiveChatPhone(item.telefone);
                                                                        setActiveChatName(item.nome || item.telefone);
                                                                        fetchChatMessages(item.telefone);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2.5 py-1 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] border border-[#bfdbfe] rounded-md text-[11px] font-600 cursor-pointer transition-colors"
                                                                >
                                                                    <span>💬</span> Chat
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenSendModal(item)}
                                                                    className="flex items-center gap-1 px-2.5 py-1 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#10b981] border border-[#a7f3d0] rounded-md text-[11px] font-600 cursor-pointer transition-colors"
                                                                >
                                                                    <span>📱</span> WhatsApp
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-[#f1f5f9] flex items-center justify-between text-[12px] text-slate-500">
                                    <span>Página {pagination.page} de {pagination.totalPages} · {pagination.total} contatos</span>
                                    <div className="flex gap-2">
                                        <button disabled={pagination.page <= 1} onClick={() => fetchContatos(pagination.page - 1)} className="px-3 py-1 bg-white border border-[#e2e8f0] rounded-md disabled:opacity-40 cursor-pointer hover:bg-[#f8fafc] transition-colors">← Anterior</button>
                                        <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchContatos(pagination.page + 1)} className="px-3 py-1 bg-white border border-[#e2e8f0] rounded-md disabled:opacity-40 cursor-pointer hover:bg-[#f8fafc] transition-colors">Próxima →</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── ABA 2: CHAT AO VIVO ── */}
                {activeTab === "chat" && (
                    <div className="bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] h-[700px] flex flex-col md:flex-row">
                        {/* Sidebar de Conversas */}
                        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#e2e8f0] flex flex-col bg-white">
                            <div className="p-3.5 border-b border-[#e2e8f0]">
                                <div className="relative">
                                    <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Buscar conversa..."
                                        value={chatSearch}
                                        onChange={(e) => setChatSearch(e.target.value)}
                                        className="w-full px-3 py-2 pl-9 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-slate-700 text-[12px] placeholder-slate-400 focus:outline-none focus:border-[#10b981]"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-[#f1f5f9]">
                                {filteredConversas.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 text-[12px] px-4">
                                        <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-2 text-lg">💬</div>
                                        Nenhuma conversa encontrada
                                    </div>
                                ) : (
                                    filteredConversas.map((conv) => {
                                        const isSelected = activeChatPhone === conv.telefone;
                                        const inicial = (conv.cliente_nome || conv.telefone || "C").charAt(0).toUpperCase();
                                        const hora = conv.ult_envio ? new Date(conv.ult_envio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
                                        return (
                                            <div
                                                key={conv.telefone}
                                                onClick={() => handleSelectChat(conv)}
                                                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? "bg-[#ecfdf5] border-l-[3px] border-l-[#10b981]" : "hover:bg-[#f8fafc]"}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-700 text-[14px] shrink-0 ${isSelected ? "bg-[#10b981] text-white" : "bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]"}`}>
                                                    {inicial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <h4 className="text-[13px] font-700 text-slate-900 truncate">{conv.cliente_nome || conv.telefone}</h4>
                                                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">{hora}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {conv.direcao === "enviada" ? <span className="text-[#10b981] font-600">Você: </span> : ""}{conv.ult_mensagem || "Iniciou contato"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Janela de Chat */}
                        <div className="flex-1 flex flex-col bg-[#f8fafc]">
                            {activeChatPhone ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="px-4 py-3 border-b border-[#e2e8f0] bg-white flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-[#10b981] text-white flex items-center justify-center font-700 text-[13px]">
                                                {activeChatName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-[14px] font-700 text-slate-900">{activeChatName}</h3>
                                                <p className="text-[11px] text-[#10b981] font-mono font-600">{activeChatPhone}</p>
                                            </div>
                                        </div>
                                        <a
                                            href={`https://wa.me/${activeChatPhone.replace(/\D/g, "")}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0] text-[#10b981] text-[11px] font-700 rounded-md transition-colors"
                                        >
                                            <span>📱</span> Abrir no App
                                        </a>
                                    </div>

                                    {/* Mensagens */}
                                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                                        {chatMessages.length === 0 ? (
                                            <div className="text-center py-10 text-slate-400 text-[12px]">
                                                <div className="w-12 h-12 rounded-full bg-[#ecfdf5] flex items-center justify-center mx-auto mb-3 text-2xl">💬</div>
                                                Nenhuma mensagem ainda. Digite abaixo para iniciar o atendimento!
                                            </div>
                                        ) : (
                                            chatMessages.map((msg, index) => {
                                                const isMe = msg.direcao === "enviada";
                                                const isErro = msg.status === "erro" || msg.status === "falha";
                                                return (
                                                    <div key={index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                        <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[12px] space-y-1 shadow-sm ${
                                                            isMe
                                                                ? isErro
                                                                    ? "bg-[#fef2f2] text-red-800 rounded-br-none border border-[#fecaca]"
                                                                    : "bg-[#10b981] text-white rounded-br-none"
                                                                : "bg-white text-slate-800 rounded-bl-none border border-[#e2e8f0]"
                                                        }`}>
                                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.mensagem}</p>
                                                            <div className={`text-[10px] text-right flex items-center justify-end gap-1 ${isMe ? (isErro ? "text-red-400" : "text-white/70") : "text-slate-400"}`}>
                                                                {isMe && isErro && <span className="text-[10px]">⚠️ Não entregue</span>}
                                                                <span>{formatDate(msg.criado_em)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Quick Templates */}
                                    {templates.length > 0 && (
                                        <div className="px-3 py-2 bg-white border-t border-[#e2e8f0] flex items-center gap-2 overflow-x-auto">
                                            <span className="text-[10px] font-700 text-slate-400 uppercase tracking-wider whitespace-nowrap">Modelos:</span>
                                            {templates.map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        const msg = processarTags(t.mensagem, { nome: activeChatName, telefone: activeChatPhone });
                                                        setInputChatMessage(msg);
                                                    }}
                                                    className="px-2.5 py-1 bg-[#f8fafc] hover:bg-[#eff6ff] text-[#2563eb] border border-[#e2e8f0] rounded-md text-[11px] font-600 whitespace-nowrap cursor-pointer transition-colors"
                                                >
                                                    {t.titulo}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Input */}
                                    <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-[#e2e8f0] flex gap-2 items-end">
                                        <input
                                            type="text"
                                            placeholder="Digite sua resposta... (Enter para enviar)"
                                            value={inputChatMessage}
                                            onChange={(e) => setInputChatMessage(e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] text-slate-800 text-[13px] focus:outline-none focus:border-[#10b981]"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputChatMessage.trim()}
                                            className="px-4 py-2.5 bg-[#10b981] hover:bg-emerald-600 text-white rounded-[10px] text-[12px] font-700 transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-sm"
                                        >
                                            Enviar
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-3xl">
                                        💬
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-700 text-slate-800">Central de Atendimento ao Vivo</h3>
                                        <p className="text-[12px] text-slate-400 max-w-sm mt-1">
                                            Selecione um contato na lista à esquerda para carregar as mensagens ou inicie uma conversa a partir da aba "Contatos Conectados".
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── ABA 3: AUTOMAÇÕES ── */}
                {activeTab === "automacoes" && (
                    <div className="space-y-5">
                        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[10px] p-4 flex items-start gap-3">
                            <span className="text-xl">⚡</span>
                            <div>
                                <h3 className="font-700 text-[#1d4ed8] text-[14px]">Disparos e Automações de Marketing</h3>
                                <p className="text-[#3b82f6] text-[12px] mt-0.5">Configure regras automáticas que o sistema monitora e envia mensagens via WhatsApp sem intervenção humana.</p>
                            </div>
                        </div>

                        {loadingAutomacoes ? (
                            <div className="text-center py-10 text-slate-400 text-[13px]">Carregando automações...</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {automacoes.map((item, idx) => (
                                    <div key={item.tipo} className={`bg-white border rounded-[12px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all ${item.ativo ? "border-[#a7f3d0]" : "border-[#e2e8f0]"}`}>
                                        {/* Card Header */}
                                        <div className={`px-5 py-3.5 flex items-start justify-between gap-3 border-b ${item.ativo ? "bg-[#ecfdf5] border-[#d1fae5]" : "bg-[#f8fafc] border-[#e2e8f0]"}`}>
                                            <div>
                                                <h4 className="font-700 text-slate-900 text-[14px]">{item.titulo}</h4>
                                                <span className="text-[11px] text-slate-500">
                                                    {item.tipo === "boas_vindas" && "Envio automático ao 1º acesso no Hotspot"}
                                                    {item.tipo === "expiracao_aviso" && "Mensagem antes do tempo de acesso vencer"}
                                                    {item.tipo === "pix_abandonado" && "Lembrete para PIX gerado mas não pago"}
                                                    {item.tipo === "retencao_ausente" && "Reengajamento de clientes sem conexão há X dias"}
                                                    {item.tipo === "retorno_cliente" && "Boas-vindas ao cliente que volta após X dias"}
                                                    {item.tipo === "aniversariantes" && "Parabéns automático no aniversário do cliente"}
                                                    {item.tipo === "pesquisa_nps" && "Pesquisa de satisfação após desconexão"}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAutomacao(idx)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${item.ativo ? "bg-[#10b981]" : "bg-slate-200"}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${item.ativo ? "translate-x-6" : "translate-x-1"}`} />
                                            </button>
                                        </div>

                                        <div className="p-5 space-y-3">
                                            {item.tipo === "expiracao_aviso" && (
                                                <div>
                                                    <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Disparar quantos minutos antes de vencer?</label>
                                                    <input type="number" min="1" max="60" value={item.tempo_minutos || 5} onChange={(e) => handleFieldAutomacaoChange(idx, "tempo_minutos", e.target.value)} className="w-32 px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-md text-slate-800 text-[12px] focus:outline-none focus:border-[#2563eb]" />
                                                </div>
                                            )}
                                            {item.tipo === "pix_abandonado" && (
                                                <div>
                                                    <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Disparar quantos minutos após gerar o PIX?</label>
                                                    <input type="number" min="1" max="60" value={item.tempo_minutos || 5} onChange={(e) => handleFieldAutomacaoChange(idx, "tempo_minutos", e.target.value)} className="w-32 px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-md text-slate-800 text-[12px] focus:outline-none focus:border-[#2563eb]" />
                                                </div>
                                            )}
                                            {(item.tipo === "retencao_ausente" || item.tipo === "retorno_cliente") && (
                                                <div>
                                                    <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">
                                                        {item.tipo === "retencao_ausente" ? "Considerar ausente após quantos dias?" : "Considerar retorno após quantos dias sem aparecer?"}
                                                    </label>
                                                    <input type="number" min="1" max="90" value={item.dias_ausente || (item.tipo === "retorno_cliente" ? 3 : 15)} onChange={(e) => handleFieldAutomacaoChange(idx, "dias_ausente", e.target.value)} className="w-32 px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-md text-slate-800 text-[12px] focus:outline-none focus:border-[#2563eb]" />
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Mensagem Automática</label>
                                                <textarea rows={3} value={item.mensagem} onChange={(e) => handleFieldAutomacaoChange(idx, "mensagem", e.target.value)} className="w-full px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-md text-slate-800 text-[12px] resize-none focus:outline-none focus:border-[#2563eb]" />
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9]">
                                                <span className={`text-[11px] font-600 flex items-center gap-1.5 ${item.ativo ? "text-[#10b981]" : "text-slate-400"}`}>
                                                    <span className={`w-2 h-2 rounded-full ${item.ativo ? "bg-[#10b981] animate-pulse" : "bg-slate-300"}`} />
                                                    {item.ativo ? "Ativa" : "Pausada"}
                                                </span>
                                                <button onClick={() => handleSaveAutomacao(item)} className="px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[11px] font-700 cursor-pointer transition-colors">
                                                    Salvar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ABA 4: TEMPLATES ── */}
                {activeTab === "templates" && (
                    <div className="space-y-4">
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-4">
                            <p className="font-700 text-slate-700 text-[13px] mb-2">💡 Tags dinâmicas disponíveis:</p>
                            <div className="flex flex-wrap gap-2">
                                {["{nome}", "{telefone}", "{email}", "{cpf}", "{origem}"].map(tag => (
                                    <span key={tag} className="bg-white text-[#2563eb] px-2.5 py-0.5 rounded-md border border-[#bfdbfe] font-mono text-[11px] font-600">{tag}</span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {loadingTemplates ? (
                                <div className="col-span-2 text-center py-8 text-slate-400 text-[13px]">Carregando modelos...</div>
                            ) : templates.length === 0 ? (
                                <div className="col-span-2 text-center py-12 bg-white border border-dashed border-[#cbd5e1] rounded-[12px]">
                                    <div className="text-3xl mb-3">📝</div>
                                    <p className="text-[14px] font-700 text-slate-700 mb-1">Nenhum modelo cadastrado</p>
                                    <p className="text-[12px] text-slate-400 mb-4">Crie templates para agilizar o atendimento e automações.</p>
                                    <button onClick={() => { setEditingTemplate(null); setTemplateForm({ titulo: "", mensagem: "" }); setShowTemplateModal(true); }} className="px-4 py-2 bg-[#2563eb] text-white text-[12px] font-700 rounded-md cursor-pointer hover:bg-[#1d4ed8]">
                                        + Criar Primeiro Template
                                    </button>
                                </div>
                            ) : (
                                templates.map((tpl) => (
                                    <div key={tpl.id} className="bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col">
                                        <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc]">
                                            <h3 className="font-700 text-slate-900 text-[14px]">{tpl.titulo}</h3>
                                            <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${tpl.ativo ? "bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]" : "bg-[#f8fafc] text-slate-400 border-[#e2e8f0]"}`}>
                                                {tpl.ativo ? "Ativo" : "Inativo"}
                                            </span>
                                        </div>
                                        <div className="p-5 flex-1">
                                            <p className="text-slate-600 text-[12px] bg-[#f8fafc] p-3 rounded-[8px] border border-[#f1f5f9] whitespace-pre-wrap leading-relaxed font-sans">
                                                {tpl.mensagem}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-2 text-right">{tpl.mensagem?.length || 0} caracteres</p>
                                        </div>
                                        <div className="px-5 py-3 border-t border-[#f1f5f9] flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => { setEditingTemplate(tpl); setTemplateForm({ titulo: tpl.titulo, mensagem: tpl.mensagem }); setShowTemplateModal(true); }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] text-[11px] font-700 rounded-md cursor-pointer hover:bg-[#dbeafe] transition-colors"
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(tpl.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[11px] font-700 rounded-md cursor-pointer hover:bg-[#fee2e2] transition-colors"
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── ABA 5: HISTÓRICO ── */}
                {activeTab === "historico" && (
                    <div className="bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                        <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center gap-2">
                            <span className="text-base">📜</span>
                            <h3 className="font-700 text-slate-800 text-[14px]">Histórico de Envios</h3>
                            <span className="text-[10px] font-600 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">{historico.length} registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                                        <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">Cliente</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">Telefone</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">Mensagem</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">Tipo</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-700 text-slate-400 uppercase tracking-wider">Data / Hora</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f1f5f9]">
                                    {loadingHistorico ? (
                                        <tr><td colSpan="5" className="text-center py-8 text-slate-400 text-[13px]">Carregando histórico...</td></tr>
                                    ) : historico.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-12 text-slate-400 text-[13px]">Nenhum envio registrado no histórico.</td></tr>
                                    ) : (
                                        historico.map((item) => (
                                            <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-[#eff6ff] text-[#2563eb] flex items-center justify-center text-[11px] font-700 shrink-0">
                                                            {(item.cliente_nome || "C").charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-600 text-slate-800 text-[13px]">{item.cliente_nome || "Cliente"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-[#10b981] font-mono font-600 text-[12px]">{item.telefone}</td>
                                                <td className="px-5 py-3.5 text-slate-600 text-[12px] max-w-xs truncate">{item.mensagem}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${item.tipo_envio === "api" ? "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]" : "bg-[#f8fafc] text-slate-600 border-[#e2e8f0]"}`}>
                                                        {item.tipo_envio === "api" ? "⚡ API" : "👤 Manual"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-400 text-[11px]">{formatDate(item.enviado_em)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODAL ENVIO DE MENSAGEM WHATSAPP ── */}
            {showSendModal && selectedContacto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-[#e2e8f0] rounded-[14px] w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
                            <div>
                                <h2 className="text-[16px] font-700 text-slate-900 flex items-center gap-2"><span>💬</span> Enviar via WhatsApp</h2>
                                <p className="text-[12px] text-slate-500 mt-0.5">Para: <strong className="text-slate-800">{selectedContacto.nome || "Cliente"}</strong> ({selectedContacto.telefone})</p>
                            </div>
                            <button onClick={() => setShowSendModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Modelo de Mensagem (Opcional)</label>
                                <select value={selectedTemplateId} onChange={(e) => handleSelectTemplateInModal(e.target.value)} className="w-full px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-slate-700 focus:outline-none text-[13px] cursor-pointer">
                                    <option value="">— Texto personalizado —</option>
                                    {templates.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Texto da Mensagem</label>
                                <textarea value={mensagemText} onChange={(e) => setMensagemText(e.target.value)} rows={5} className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-slate-800 focus:outline-none text-[13px] resize-none font-sans" />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button type="button" onClick={handleSendWhatsAppWeb} className="flex-1 px-4 py-2.5 bg-[#10b981] hover:bg-emerald-600 text-white rounded-md text-[12px] font-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors">
                                    <span>📱</span> Abrir no WhatsApp
                                </button>
                                <button type="button" disabled={sendingMessage} onClick={handleSendViaApi} className="flex-1 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[12px] font-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm transition-colors">
                                    <span>⚡</span> {sendingMessage ? "Disparando..." : "Disparar via API"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL CRIAR / EDITAR TEMPLATE ── */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-[#e2e8f0] rounded-[14px] w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
                            <h2 className="text-[16px] font-700 text-slate-900">{editingTemplate ? "Editar Modelo" : "Novo Modelo de Mensagem"}</h2>
                            <button onClick={() => setShowTemplateModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Título do Modelo</label>
                                <input type="text" placeholder="Ex: Oferta de Boas-Vindas" value={templateForm.titulo} onChange={(e) => setTemplateForm({ ...templateForm, titulo: e.target.value })} className="w-full px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-slate-800 focus:outline-none focus:border-[#2563eb] text-[13px]" required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Mensagem ({"{nome}"}, {"{telefone}"}, {"{email}"})</label>
                                <textarea placeholder={`Olá {nome}! Obrigado por se conectar ao nosso Wi-Fi...`} value={templateForm.mensagem} onChange={(e) => setTemplateForm({ ...templateForm, mensagem: e.target.value })} rows={5} className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-slate-800 focus:outline-none focus:border-[#2563eb] text-[13px] resize-none font-sans" required />
                                <p className="text-[10px] text-slate-400 text-right mt-1">{templateForm.mensagem?.length || 0} caracteres</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] text-slate-700 rounded-md text-[12px] font-600 cursor-pointer hover:bg-slate-100 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[12px] font-700 cursor-pointer transition-colors">Salvar Modelo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL E-MAIL MARKETING ── */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-[#e2e8f0] rounded-[14px] w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
                            <div>
                                <h2 className="text-[16px] font-700 text-slate-900 flex items-center gap-2"><span>✉️</span> Disparar E-mail Marketing</h2>
                                <p className="text-[12px] text-slate-500 mt-0.5">Enviar para <strong className="text-[#2563eb]">{contatos.filter(c => c.email).length} contatos</strong> com e-mail cadastrado</p>
                            </div>
                            <button onClick={() => setShowEmailModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleDispararEmailMassa} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Assunto da Campanha *</label>
                                <input type="text" placeholder="Ex: Novidades imperdíveis!" value={emailAssunto} onChange={(e) => setEmailAssunto(e.target.value)} className="w-full px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-slate-800 focus:outline-none focus:border-[#2563eb] text-[13px]" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wider mb-1.5">Conteúdo HTML / Texto *</label>
                                <textarea rows={5} value={emailConteudo} onChange={(e) => setEmailConteudo(e.target.value)} className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-slate-800 focus:outline-none text-[13px] resize-none font-sans" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowEmailModal(false)} className="flex-1 px-4 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] text-slate-700 rounded-md text-[12px] font-600 cursor-pointer hover:bg-slate-100 transition-colors">Cancelar</button>
                                <button type="submit" disabled={disparandoEmail} className="flex-1 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[12px] font-700 cursor-pointer disabled:opacity-50 transition-colors">
                                    {disparandoEmail ? "Disparando..." : "✉️ Disparar E-mails"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
