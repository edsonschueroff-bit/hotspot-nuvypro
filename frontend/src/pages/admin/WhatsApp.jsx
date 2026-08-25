import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import IaConfigTab from "../../components/admin/IaConfigTab";
import ConfiguracaoAlertasDono from "../../components/admin/ConfiguracaoAlertasDono";
import { PageHeader, Card, PrimaryButton, SecondaryButton } from "../../components/ui";

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("instancia"); // "instancia" | "ia" | "alertas"
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState({ api_url: "", api_key: "", instance_name: "" });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [mensagemTeste, setMensagemTeste] = useState({ telefone: "", mensagem: "" });
  const [envioResult, setEnvioResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(null);

  // Historico de envios (logs)
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsFilter, setLogsFilter] = useState({ status: "", telefone: "" });
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupDate, setCleanupDate] = useState("");

  const pollingRef = useRef(null);

  const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchConfig();
    fetchStatus(true); // autoQr: carrega QR Code automaticamente se desconectado
    fetchLogs();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [logsPage, logsFilter.status]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config", { headers });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Erro ao buscar config:", err);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaved(null);
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setConfigSaved({ ok: true, msg: "Configuração salva com sucesso!" });
        fetchStatus();
      } else {
        setConfigSaved({ ok: false, msg: "Erro ao salvar configuração." });
      }
    } catch (err) {
      setConfigSaved({ ok: false, msg: "Erro de conexão com o servidor." });
    }
  };

  const fetchStatus = async (autoQr = false) => {
    try {
      const res = await fetch("/api/whatsapp/instance/status", { headers });
      const data = await res.json();
      setStatus(data);
      if (data.state === "open") {
        setQrCode(null);
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      } else if (autoQr && data.exists && data.state !== "open") {
        // Carrega QR Code automaticamente ao abrir a tela
        try {
          const qrRes = await fetch("/api/whatsapp/instance/qrcode", { headers });
          const qrData = await qrRes.json();
          if (qrData.base64) {
            setQrCode(qrData.base64);
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = setInterval(() => fetchStatus(), 5000);
          }
        } catch (qrErr) {
          console.error("Erro ao obter QR automático:", qrErr);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/whatsapp/instance/create", { method: "POST", headers });
      await res.json();
      await fetchStatus();
      handleConnect();
    } catch (err) {
      console.error("Erro ao criar instância:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/whatsapp/instance/qrcode", { headers });
      const data = await res.json();
      if (data.base64) {
        setQrCode(data.base64);
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(fetchStatus, 5000);
      } else if (data.instance?.state === "open") {
        setQrCode(null);
        await fetchStatus();
      }
    } catch (err) {
      console.error("Erro ao obter QR:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      await fetch("/api/whatsapp/instance/restart", { method: "POST", headers });
      setTimeout(fetchStatus, 3000);
    } catch (err) {
      console.error("Erro ao reiniciar:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp desta instância?")) return;
    setActionLoading(true);
    try {
      await fetch("/api/whatsapp/instance/logout", { method: "POST", headers });
      setQrCode(null);
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      console.error("Erro ao desconectar:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Deseja realmente remover a instância do Evolution API?")) return;
    setActionLoading(true);
    try {
      await fetch("/api/whatsapp/instance/delete", { method: "POST", headers });
      setStatus(null);
      setQrCode(null);
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      console.error("Erro ao deletar:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnviarTeste = async (e) => {
    e.preventDefault();
    setEnvioResult(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(mensagemTeste),
      });
      const data = await res.json();
      if (res.ok) {
        setEnvioResult({ ok: true, msg: "Mensagem enviada com sucesso!" });
        setMensagemTeste({ telefone: "", mensagem: "" });
        fetchLogs();
      } else {
        setEnvioResult({ ok: false, msg: data.error || "Falha ao enviar mensagem." });
      }
    } catch (err) {
      setEnvioResult({ ok: false, msg: "Erro de conexão ao enviar." });
    }
  };

  const PER_PAGE = 20;

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: logsPage,
        limit: PER_PAGE,
        ...(logsFilter.status && { status: logsFilter.status }),
        ...(logsFilter.telefone && { telefone: logsFilter.telefone }),
      });
      const res = await fetch(`/api/whatsapp/logs?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    }
  };

  const handleLimparLogs = async () => {
    if (!cleanupDate) {
      alert("Selecione uma data limite para limpeza.");
      return;
    }
    if (!confirm(`Remover todos os logs anteriores a ${cleanupDate}?`)) return;
    try {
      const res = await fetch("/api/whatsapp/logs/cleanup", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ antes_de: cleanupDate }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.removidos || 0} logs removidos.`);
        setShowCleanup(false);
        setCleanupDate("");
        fetchLogs();
      }
    } catch (err) {
      console.error("Erro ao limpar logs:", err);
    }
  };

  const stateLabel = (st) => {
    switch (st) {
      case "open":
        return { text: "Conectado", color: "bg-emerald-500", badge: "bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]" };
      case "connecting":
        return { text: "Conectando...", color: "bg-amber-500", badge: "bg-[#fffbeb] text-amber-700 border-[#fde68a]" };
      case "close":
        return { text: "Desconectado", color: "bg-red-500", badge: "bg-[#fef2f2] text-red-700 border-[#fecaca]" };
      default:
        return { text: st || "Desconhecido", color: "bg-slate-400", badge: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const statusBadge = (st) => {
    switch (st) {
      case "ok":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-600 uppercase bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]">OK</span>;
      case "erro":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-600 uppercase bg-[#fef2f2] text-red-700 border border-[#fecaca]">Erro</span>;
      case "skipped":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-600 uppercase bg-[#fffbeb] text-amber-700 border border-[#fde68a]">Pulado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-600 uppercase bg-slate-100 text-slate-600 border border-slate-200">{st}</span>;
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 border-[3px] border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[12px] text-slate-400 font-500">Carregando WhatsApp...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header com Abas Integradas */}
        <PageHeader
          title="WhatsApp & Automações IA"
          subtitle="Gerencie a conexão da Evolution API e configure o Assistente Virtual de Atendimento com IA."
          icon="📱"
          actions={
            <div className="flex items-center bg-[#f1f5f9] p-1 rounded-md border border-[#e2e8f0] shrink-0 self-start sm:self-auto gap-1">
              <button
                onClick={() => setActiveTab("instancia")}
                className={`px-3 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${activeTab === "instancia"
                  ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                📱 Conexão WhatsApp
              </button>
              <button
                onClick={() => setActiveTab("ia")}
                className={`px-3 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "ia"
                  ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                🤖 IA Assistente (GPT-4o)
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
              <button
                onClick={() => setActiveTab("alertas")}
                className={`px-3 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "alertas"
                  ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                📲 Alertas do Proprietário
              </button>
            </div>
          }
        />

        {activeTab === "ia" ? (
          <IaConfigTab token={token} />
        ) : activeTab === "alertas" ? (
          <ConfiguracaoAlertasDono />
        ) : (
          <>
            {/* Status Card */}
            <div className="bg-white rounded-[10px] border border-[#e2e8f0] shadow-2xs p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2e8f0]">
                <h2 className="text-[15px] font-600 text-slate-900">Status da Instância</h2>
                <button
                  onClick={fetchStatus}
                  className="px-2.5 py-1 text-[12px] font-600 text-[#2563eb] bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  🔄 Atualizar
                </button>
              </div>

              {!status?.exists ? (
                /* Instância não existe */
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 opacity-30">
                    <svg className="w-16 h-16 mx-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 mb-4 text-[13px]">Nenhuma instância WhatsApp configurada.</p>
                  <button
                    onClick={handleCreate}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[13px] font-600 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Criando..." : "Criar Instância"}
                  </button>
                </div>
              ) : (
                /* Instância existe */
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Estado */}
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4">
                      <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${stateLabel(status.state).color}`}></span>
                        <span className="font-600 text-[13px] text-slate-900">{stateLabel(status.state).text}</span>
                      </div>
                    </div>

                    {/* Número */}
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4">
                      <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mb-1">Número</p>
                      <p className="font-600 text-[13px] text-slate-900 font-mono">{status.number || status.owner_jid?.split("@")[0] || "-"}</p>
                    </div>

                    {/* Nome */}
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4">
                      <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mb-1">Nome do Perfil</p>
                      <p className="font-600 text-[13px] text-slate-900">{status.profile_name || "-"}</p>
                    </div>

                    {/* Instância */}
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4">
                      <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mb-1">Instância</p>
                      <p className="font-600 text-[13px] text-slate-900 font-mono">{status.instance_name}</p>
                    </div>
                  </div>

                  {/* Estatísticas */}
                  {status.state === "open" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4 text-center">
                        <p className="text-2xl font-700 text-[#2563eb]">{status.messages_count}</p>
                        <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mt-0.5">Mensagens</p>
                      </div>
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4 text-center">
                        <p className="text-2xl font-700 text-[#10b981]">{status.contacts_count}</p>
                        <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mt-0.5">Contatos</p>
                      </div>
                      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4 text-center">
                        <p className="text-2xl font-700 text-slate-700">{status.chats_count}</p>
                        <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mt-0.5">Conversas</p>
                      </div>
                    </div>
                  )}

                  {/* QR Code */}
                  {qrCode && status.state !== "open" && (
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-6 mb-6 text-center">
                      <p className="text-[13px] text-slate-700 font-500 mb-4">Escaneie o QR Code com seu WhatsApp:</p>
                      <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto w-64 h-64 rounded-md bg-white p-2 border border-[#e2e8f0]" />
                      <p className="text-[11px] text-slate-400 mt-3">Abra o WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho</p>
                    </div>
                  )}

                  {/* Ações Padronizadas */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    {status.state !== "open" && (
                      <button
                        onClick={handleConnect}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-md text-[13px] font-600 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        📲 {actionLoading ? "Obtendo..." : "Conectar (QR Code)"}
                      </button>
                    )}
                    <button
                      onClick={handleRestart}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[13px] font-600 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      🔄 Reiniciar
                    </button>
                    {status.state === "open" && (
                      <button
                        onClick={handleLogout}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-[#fffbeb] hover:bg-[#fef3c7] text-amber-800 border border-[#fde68a] rounded-md text-[13px] font-600 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        🔌 Desconectar
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#fef2f2] hover:bg-[#fee2e2] text-red-700 border border-[#fecaca] rounded-md text-[13px] font-600 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      🗑️ Remover Instância
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Configuração Evolution API */}
            <div className="bg-white rounded-[10px] border border-[#e2e8f0] shadow-2xs p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2e8f0]">
                <h2 className="text-[15px] font-600 text-slate-900">Configuração da API</h2>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="px-2.5 py-1 text-[12px] font-600 text-slate-700 bg-white hover:bg-[#f8fafc] border border-[#e2e8f0] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  ✏️ {showConfig ? "Ocultar" : "Editar"}
                </button>
              </div>

              {!showConfig ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3.5">
                    <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mb-0.5">URL da API</p>
                    <p className="text-[13px] font-mono text-slate-800 truncate">{config.api_url || "-"}</p>
                  </div>
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3.5">
                    <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mb-0.5">API Key</p>
                    <p className="text-[13px] font-mono text-slate-800 truncate">{config.api_key ? "••••••••" + config.api_key.slice(-8) : "-"}</p>
                  </div>
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3.5">
                    <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider mb-0.5">Nome da Instância</p>
                    <p className="text-[13px] font-mono text-slate-800">{config.instance_name || "-"}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">URL da Evolution API</label>
                    <input
                      type="text"
                      placeholder="http://localhost:8080"
                      value={config.api_url}
                      onChange={(e) => setConfig(prev => ({ ...prev, api_url: e.target.value }))}
                      className="ds-input bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">API Key</label>
                    <input
                      type="text"
                      placeholder="Chave da API"
                      value={config.api_key}
                      onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                      className="ds-input bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Nome da Instância</label>
                    <input
                      type="text"
                      placeholder="empresa_1"
                      value={config.instance_name}
                      onChange={(e) => setConfig(prev => ({ ...prev, instance_name: e.target.value }))}
                      className="ds-input bg-white"
                    />
                  </div>
                  {configSaved && (
                    <div className={`p-3 rounded-md text-[12px] font-500 ${configSaved.ok ? "bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]" : "bg-[#fef2f2] text-red-700 border border-[#fecaca]"}`}>
                      {configSaved.msg}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[13px] font-600 shadow-2xs transition-colors cursor-pointer"
                  >
                    Salvar Configuração
                  </button>
                </form>
              )}
            </div>

            {/* Enviar Mensagem de Teste */}
            {status?.exists && status?.state === "open" && (
              <div className="bg-white rounded-[10px] border border-[#e2e8f0] shadow-2xs p-6">
                <div className="border-b border-[#e2e8f0] pb-3 mb-4">
                  <h2 className="text-[15px] font-600 text-slate-900">Enviar Mensagem de Teste</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">Envie uma mensagem direta para validar a entrega no WhatsApp</p>
                </div>

                <form onSubmit={handleEnviarTeste} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Telefone (DDD + Número)</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-[#e2e8f0] text-slate-600 rounded-l-md text-[13px] font-600">+55</span>
                      <input
                        type="text"
                        placeholder="41999999999"
                        value={mensagemTeste.telefone}
                        onChange={(e) => setMensagemTeste(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, "") }))}
                        required
                        className="ds-input rounded-l-none bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Mensagem</label>
                    <textarea
                      placeholder="Digite sua mensagem..."
                      value={mensagemTeste.mensagem}
                      onChange={(e) => setMensagemTeste(prev => ({ ...prev, mensagem: e.target.value }))}
                      required
                      rows={3}
                      className="w-full bg-white border border-[#e2e8f0] text-slate-900 rounded-md p-3 text-[13px] focus:outline-none focus:border-[#2563eb] resize-none"
                    />
                  </div>

                  {envioResult && (
                    <div className={`p-3 rounded-md text-[12px] font-500 ${envioResult.ok ? "bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]" : "bg-[#fef2f2] text-red-700 border border-[#fecaca]"}`}>
                      {envioResult.msg}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[13px] font-600 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    ✈️ Enviar Mensagem
                  </button>
                </form>
              </div>
            )}

            {/* Histórico de Envios */}
            <div className="bg-white rounded-[10px] border border-[#e2e8f0] shadow-2xs p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2e8f0] flex-wrap gap-3">
                <div>
                  <h2 className="text-[15px] font-600 text-slate-900">Histórico de Envios</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">Mensagens disparadas automaticamente pelos portais e campanhas</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={logsFilter.status}
                    onChange={(e) => { setLogsFilter({ ...logsFilter, status: e.target.value }); setLogsPage(1); }}
                    className="ds-input bg-white text-[12px] py-1.5"
                  >
                    <option value="">Todos os Status</option>
                    <option value="ok">OK</option>
                    <option value="erro">Erro</option>
                    <option value="skipped">Pulado</option>
                  </select>
                  <input
                    type="text"
                    value={logsFilter.telefone}
                    onChange={(e) => setLogsFilter({ ...logsFilter, telefone: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { setLogsPage(1); fetchLogs(); } }}
                    placeholder="Buscar telefone..."
                    className="ds-input bg-white text-[12px] py-1.5 w-40"
                  />
                  <button
                    onClick={() => { setLogsPage(1); fetchLogs(); }}
                    className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-600 rounded-md shadow-2xs cursor-pointer"
                  >
                    Filtrar
                  </button>
                  <button
                    onClick={() => setShowCleanup(!showCleanup)}
                    className="px-3 py-1.5 bg-[#fef2f2] hover:bg-[#fee2e2] text-red-700 border border-[#fecaca] text-[12px] font-600 rounded-md cursor-pointer flex items-center gap-1"
                  >
                    🗑️ Limpar
                  </button>
                </div>
              </div>

              {showCleanup && (
                <div className="mb-4 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-md flex items-center gap-3 flex-wrap">
                  <span className="text-[12px] font-600 text-red-800">Remover logs anteriores a:</span>
                  <input
                    type="date"
                    value={cleanupDate}
                    onChange={(e) => setCleanupDate(e.target.value)}
                    className="ds-input bg-white text-[12px] py-1"
                  />
                  <button
                    onClick={handleLimparLogs}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12px] font-600 rounded-md cursor-pointer"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowCleanup(false)}
                    className="px-3 py-1.5 bg-white border border-[#e2e8f0] text-slate-600 hover:bg-slate-50 text-[12px] font-600 rounded-md cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] uppercase text-slate-500 font-600 tracking-wider">
                      <th className="text-left px-4 py-3">Data</th>
                      <th className="text-left px-4 py-3">Telefone</th>
                      <th className="text-left px-4 py-3">Portal</th>
                      <th className="text-left px-4 py-3">Contexto</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {logs.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-8 text-slate-400 text-[13px]">Nenhum log encontrado</td></tr>
                    ) : logs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDate(log.criado_em)}</td>
                          <td className="px-4 py-3 text-slate-700 font-mono text-[12px]">{log.telefone || "-"}</td>
                          <td className="px-4 py-3 text-slate-500 text-[12px]">{log.portal_nome || "-"}</td>
                          <td className="px-4 py-3 text-slate-500 text-[12px]">{log.contexto_tipo || "-"}</td>
                          <td className="px-4 py-3">
                            {statusBadge(log.status)}
                            {log.skip_motivo && <span className="ml-2 text-[11px] text-slate-400">({log.skip_motivo})</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(log.mensagem || log.erro_msg) && (
                              <button
                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                className="text-[12px] font-600 text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
                              >
                                {expandedLogId === log.id ? "Ocultar" : "Ver"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedLogId === log.id && (
                          <tr className="bg-[#f8fafc]">
                            <td colSpan="6" className="px-4 py-3">
                              {log.erro_msg && (
                                <div className="mb-2">
                                  <div className="text-[11px] text-red-700 font-600 mb-1">Erro:</div>
                                  <div className="text-[12px] text-red-700 font-mono">{log.erro_msg}</div>
                                </div>
                              )}
                              {log.mensagem && (
                                <div>
                                  <div className="text-[11px] text-slate-500 font-600 mb-1">Mensagem enviada:</div>
                                  <div className="text-[12px] text-slate-700 whitespace-pre-wrap font-mono bg-white p-2.5 rounded border border-[#e2e8f0]">{log.mensagem}</div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {logsTotal > PER_PAGE && (
                <div className="flex items-center justify-between mt-4 text-[12px] pt-3 border-t border-[#e2e8f0]">
                  <span className="text-slate-500">
                    {((logsPage - 1) * PER_PAGE) + 1}-{Math.min(logsPage * PER_PAGE, logsTotal)} de {logsTotal}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                      className="px-3 py-1.5 bg-white border border-[#e2e8f0] text-slate-700 rounded-md disabled:opacity-50 cursor-pointer hover:bg-slate-50"
                    >
                      ← Anterior
                    </button>
                    <span className="text-slate-500">Página {logsPage} de {Math.ceil(logsTotal / PER_PAGE)}</span>
                    <button
                      onClick={() => setLogsPage((p) => p + 1)}
                      disabled={logsPage * PER_PAGE >= logsTotal}
                      className="px-3 py-1.5 bg-white border border-[#e2e8f0] text-slate-700 rounded-md disabled:opacity-50 cursor-pointer hover:bg-slate-50"
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
