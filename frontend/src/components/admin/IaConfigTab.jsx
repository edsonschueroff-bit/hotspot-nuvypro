import React, { useState, useEffect } from "react";

export default function IaConfigTab({ token }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState(null);

    const [iaConfig, setIaConfig] = useState({
        ativo: false,
        modo_resposta: "sempre",
        delay_minutos: 5,
        modelo_ia: "gpt-4o-mini",
        instrucoes_sistema: "Você é o assistente virtual amigável do estabelecimento. Seja cordial, tire dúvidas dos clientes de forma clara e objetiva e ofereça nossas promoções e informações sobre o Wi-Fi.",
        faqs: [
            { pergunta: "Qual a senha do Wi-Fi?", resposta: "O acesso Wi-Fi é gratuito e liberado pelo nosso portal de login." },
            { pergunta: "Quais os horários de funcionamento?", resposta: "Atendemos de Segunda a Sábado das 08h às 18h." }
        ],
        wifi_informacoes: "Conecte-se na nossa rede Wi-Fi e faça login em 1 clique com o Google ou Facebook.",
        transbordo_whatsapp: "",
        mensagem_transbordo: "Entendido! Estou transferindo seu atendimento para nossa equipe. Um instante que um atendente irá falar com você!"
    });

    const [novaPergunta, setNovaPergunta] = useState("");
    const [novaResposta, setNovaResposta] = useState("");

    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    useEffect(() => {
        fetchIaConfig();
    }, []);

    const fetchIaConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/crm/ia-config", { headers });
            if (res.ok) {
                const data = await res.json();
                setIaConfig(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error("Erro ao carregar IA Config:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setSavedMsg(null);
        try {
            const res = await fetch("/api/crm/ia-config", {
                method: "POST",
                headers,
                body: JSON.stringify(iaConfig)
            });
            const data = await res.json();
            if (res.ok) {
                setSavedMsg({ ok: true, msg: "Configurações da IA salvas com sucesso!" });
            } else {
                setSavedMsg({ ok: false, msg: data.message || "Erro ao salvar." });
            }
        } catch (err) {
            setSavedMsg({ ok: false, msg: "Erro de conexão com o servidor." });
        } finally {
            setSaving(false);
        }
    };

    const handleAddFaq = () => {
        if (!novaPergunta.trim() || !novaResposta.trim()) return;
        setIaConfig(prev => ({
            ...prev,
            faqs: [...prev.faqs, { pergunta: novaPergunta.trim(), resposta: novaResposta.trim() }]
        }));
        setNovaPergunta("");
        setNovaResposta("");
    };

    const handleRemoveFaq = (index) => {
        setIaConfig(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Card: Toggle Principal & Status */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${iaConfig.ativo ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-800">IA Assistente no WhatsApp</h2>
                                <span className={`px-2.5 py-0.5 text-xs rounded-full font-semibold ${iaConfig.ativo ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                                    {iaConfig.ativo ? "🟢 Ativa (Respondedor Ligado)" : "⚪ Desativada"}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Responda dúvidas de clientes, ofereça promoções ativas do Hotspot e ajude visitantes 24 horas por dia no WhatsApp.
                            </p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer self-start md:self-center">
                        <input
                            type="checkbox"
                            checked={iaConfig.ativo}
                            onChange={(e) => setIaConfig(prev => ({ ...prev, ativo: e.target.checked }))}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>
            </div>

            {/* Card 2: Modo de Funcionamento da IA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Modo de Funcionamento</h3>
                <p className="text-xs text-slate-500 mb-4">Escolha quando a Inteligência Artificial deve intervir nas conversas do WhatsApp.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Modo 1: Sempre */}
                    <div
                        onClick={() => setIaConfig(prev => ({ ...prev, modo_resposta: "sempre" }))}
                        className={`cursor-pointer rounded-xl p-4 border transition-all ${iaConfig.modo_resposta === "sempre"
                                ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🟢</span>
                            <input
                                type="radio"
                                name="modo_resposta"
                                checked={iaConfig.modo_resposta === "sempre"}
                                onChange={() => setIaConfig(prev => ({ ...prev, modo_resposta: "sempre" }))}
                                className="text-blue-600"
                            />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">Sempre Ativa</h4>
                        <p className="text-xs text-slate-500 mt-1">Responde instantaneamente a qualquer pergunta que chegar no WhatsApp 24/7.</p>
                    </div>

                    {/* Modo 2: Fora do Horario */}
                    <div
                        onClick={() => setIaConfig(prev => ({ ...prev, modo_resposta: "fora_horario" }))}
                        className={`cursor-pointer rounded-xl p-4 border transition-all ${iaConfig.modo_resposta === "fora_horario"
                                ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🌙</span>
                            <input
                                type="radio"
                                name="modo_resposta"
                                checked={iaConfig.modo_resposta === "fora_horario"}
                                onChange={() => setIaConfig(prev => ({ ...prev, modo_resposta: "fora_horario" }))}
                                className="text-blue-600"
                            />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">Fora do Horário</h4>
                        <p className="text-xs text-slate-500 mt-1">Ativa automaticamente apenas quando a empresa estiver fechada.</p>
                    </div>

                    {/* Modo 3: Hibrido / Delay */}
                    <div
                        onClick={() => setIaConfig(prev => ({ ...prev, modo_resposta: "delay" }))}
                        className={`cursor-pointer rounded-xl p-4 border transition-all ${iaConfig.modo_resposta === "delay"
                                ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">⏱️</span>
                            <input
                                type="radio"
                                name="modo_resposta"
                                checked={iaConfig.modo_resposta === "delay"}
                                onChange={() => setIaConfig(prev => ({ ...prev, modo_resposta: "delay" }))}
                                className="text-blue-600"
                            />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">Modo Híbrido (Espera)</h4>
                        <p className="text-xs text-slate-500 mt-1">A IA responde apenas se o operador humano não responder em X minutos.</p>
                    </div>
                </div>

                {iaConfig.modo_resposta === "delay" && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-700">Tempo de espera antes da IA responder:</span>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={iaConfig.delay_minutos}
                            onChange={(e) => setIaConfig(prev => ({ ...prev, delay_minutos: e.target.value }))}
                            className="w-20 bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1 text-sm font-bold text-center"
                        />
                        <span className="text-xs text-slate-500">minuto(s)</span>
                    </div>
                )}
            </div>

            {/* Card 3: Configuração de Transbordo Humano & Alertas */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">👤</span>
                    <h3 className="text-lg font-bold text-slate-800">Transbordo para Atendimento Humano</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    Quando o cliente disser <i>"Quero falar com um atendente"</i>, a IA interrompe o auto-atendimento e notifica sua equipe.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                            WhatsApp do Atendente / Gerente para Alertas
                        </label>
                        <div className="flex">
                            <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 text-slate-500 rounded-l-lg text-sm font-mono">+55</span>
                            <input
                                type="text"
                                placeholder="67992553089"
                                value={iaConfig.transbordo_whatsapp}
                                onChange={(e) => setIaConfig(prev => ({ ...prev, transbordo_whatsapp: e.target.value.replace(/\D/g, "") }))}
                                className="flex-1 bg-[#f1f5f9] border border-slate-300 text-slate-800 rounded-r-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Este número receberá o aviso do n8n quando um cliente solicitar atendente humano.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                            Mensagem de Transferência enviada ao Cliente
                        </label>
                        <input
                            type="text"
                            value={iaConfig.mensagem_transbordo}
                            onChange={(e) => setIaConfig(prev => ({ ...prev, mensagem_transbordo: e.target.value }))}
                            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Card 4: Instruções de Atendimento (System Prompt) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Instruções de Atendimento (Comportamento da IA)</h3>
                <p className="text-xs text-slate-500 mb-3">Defina o tom de voz e como a IA deve se comportar ao falar com os clientes.</p>

                <textarea
                    rows={4}
                    value={iaConfig.instrucoes_sistema}
                    onChange={(e) => setIaConfig(prev => ({ ...prev, instrucoes_sistema: e.target.value }))}
                    className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                    placeholder="Ex: Seja empático, amigável e ofereça os pratos do dia..."
                />
            </div>

            {/* Card 5: FAQs (Perguntas & Respostas Frequentes) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Perguntas Frequentes do Estabelecimento (FAQs)</h3>
                        <p className="text-xs text-slate-500">Cadastre respostas oficiais para que a IA nunca erre as informações do seu local.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                        {iaConfig.faqs.length} FAQs Cadastradas
                    </span>
                </div>

                {/* Lista de FAQs */}
                <div className="space-y-3 mb-6 mt-4">
                    {iaConfig.faqs.map((faq, index) => (
                        <div key={index} className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-800">❓ P: {faq.pergunta}</p>
                                <p className="text-xs text-slate-600">💬 R: {faq.resposta}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveFaq(index)}
                                className="text-xs text-red-600 hover:text-red-700 font-bold p-1 bg-red-50 border border-red-200 rounded-lg cursor-pointer shrink-0"
                            >
                                Remover 🗑
                            </button>
                        </div>
                    ))}
                </div>

                {/* Adicionar Nova FAQ */}
                <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Pergunta do Cliente</label>
                        <input
                            type="text"
                            placeholder="Ex: Aceita cartão de refeição Sodexo?"
                            value={novaPergunta}
                            onChange={(e) => setNovaPergunta(e.target.value)}
                            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Resposta Oficial da IA</label>
                        <input
                            type="text"
                            placeholder="Ex: Sim! Aceitamos Sodexo, VR, Alelo e Ticket."
                            value={novaResposta}
                            onChange={(e) => setNovaResposta(e.target.value)}
                            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleAddFaq}
                    className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-bold cursor-pointer"
                >
                    + Adicionar Pergunta & Resposta
                </button>
            </div>

            {/* Card 6: Informações do Wi-Fi */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Informações & Instruções sobre o Wi-Fi</h3>
                <p className="text-xs text-slate-500 mb-3">Orientações que a IA usará para ajudar clientes que tiverem dúvidas sobre a conexão no local.</p>

                <textarea
                    rows={2}
                    value={iaConfig.wifi_informacoes}
                    onChange={(e) => setIaConfig(prev => ({ ...prev, wifi_informacoes: e.target.value }))}
                    className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                    placeholder="Ex: A rede Wi-Fi é Hotspot Nuvy. Conecte-se e digite seu e-mail ou WhatsApp no portal..."
                />
            </div>

            {/* Salvar Feedback & Botão */}
            {savedMsg && (
                <div className={`p-4 rounded-xl text-sm font-semibold ${savedMsg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {savedMsg.msg}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-md transition-all disabled:opacity-50 text-sm cursor-pointer"
                >
                    {saving ? "Salvando..." : "💾 Salvar Configurações da IA"}
                </button>
            </div>
        </div>
    );
}
