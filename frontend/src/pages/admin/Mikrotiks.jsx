import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import GatewayWizard from "../../components/admin/GatewayWizard";
import { PageHeader, Modal, SecondaryButton, PrimaryButton } from "@/components/ui";

// ── Ícone de fabricante ────────────────────────────────────────────────────
function FabricanteIcon({ tipo }) {
  if (tipo === "omada") {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center flex-shrink-0 border border-[#bfdbfe]">
        <svg className="w-5 h-5 text-[#2563eb]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 9l2 2c2.88-2.88 6.79-4.08 10.53-3.62l1.19-2.38A14.93 14.93 0 001 9zm11 11l3-3c-.73-.73-1.73-1.13-2.76-1.13l-2.76 2.76L12 20zm-5.5-5.5l2 2c1.02-1.02 2.44-1.58 3.87-1.56l1.41-1.41A7.506 7.506 0 006.5 14.5zm11-2.5l-2-2a5.025 5.025 0 00-2.87.9l1.45 1.45A2.99 2.99 0 0117.5 12zm1.85-4.5l-2-2c-1.37.69-2.55 1.65-3.5 2.79l1.41 1.41A7.5 7.5 0 0119.35 7.5z" />
        </svg>
      </div>
    );
  }
  if (tipo === "unifi") {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#f0f9ff] flex items-center justify-center flex-shrink-0 border border-[#bae6fd]">
        <svg className="w-5 h-5 text-[#0284c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 6v2M12 16v2M6 12H4M20 12h-2" />
        </svg>
      </div>
    );
  }
  // MikroTik default
  return (
    <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center flex-shrink-0 border border-[#fecaca]">
      <svg className="w-5 h-5 text-[#dc2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    </div>
  );
}

// ── Badge de Fabricante ────────────────────────────────────────────────────
function FabricanteBadge({ tipo }) {
  if (tipo === "omada") {
    return <span className="text-[10px] font-700 text-[#2563eb] bg-[#eff6ff] border border-[#bfdbfe] px-2 py-0.5 rounded-full">TP-Link Omada</span>;
  }
  if (tipo === "unifi") {
    return <span className="text-[10px] font-700 text-[#0284c7] bg-[#f0f9ff] border border-[#bae6fd] px-2 py-0.5 rounded-full">Ubiquiti UniFi</span>;
  }
  return <span className="text-[10px] font-700 text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] px-2 py-0.5 rounded-full">MikroTik RouterOS</span>;
}

// ── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-600 text-slate-400">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        Verificando...
      </span>
    );
  }
  if (status === "online") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-700 text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping"></span>
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-700 text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] px-2.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]"></span>
      Offline
    </span>
  );
}

// ── Card de Equipamento ─────────────────────────────────────────────────────
function EquipamentoCard({
  m, onHotspot, onLogin, onTestar, onEditar, onRemover,
  enviandoHotspot, enviandoLogin
}) {
  const tipo = (m.tipo || "mikrotik").toLowerCase();
  const enderecoAcesso = m.controller_url || m.ip;

  return (
    <div className={`bg-white rounded-[12px] border shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] transition-all flex flex-col group ${m.status === "offline" ? "border-[#fecaca]" : m.status === "online" ? "border-[#a7f3d0]" : "border-[#e2e8f0]"}`}>
      
      {/* Header do Card */}
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <FabricanteIcon tipo={tipo} />
          <div className="min-w-0">
            <h3 className="text-[15px] font-700 text-slate-900 truncate">{m.nome}</h3>
            <FabricanteBadge tipo={tipo} />
          </div>
        </div>
        <StatusBadge status={m.status} />
      </div>

      {/* Corpo com Infos */}
      <div className="px-5 pb-4 flex flex-col gap-2.5 flex-1">
        {/* IP / URL */}
        <div className="flex items-center justify-between bg-[#f8fafc] rounded-md px-3 py-2 border border-[#f1f5f9]">
          <span className="text-[10px] font-600 uppercase tracking-wider text-slate-400">IP / URL</span>
          <div className="flex items-center gap-1.5">
            <code className="text-[12px] font-700 text-slate-700">{enderecoAcesso || "—"}</code>
            {enderecoAcesso && (
              <a
                href={`http://${enderecoAcesso}`}
                target="_blank"
                rel="noreferrer"
                title="Abrir painel do roteador"
                className="text-slate-400 hover:text-[#2563eb] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Portal Vinculado */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-500">Portal Captive</span>
          {m.portal_nome ? (
            <span className="text-[11px] font-600 text-[#2563eb] bg-[#eff6ff] border border-[#bfdbfe] px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {m.portal_nome}
            </span>
          ) : (
            <span className="text-[11px] text-slate-300 italic">Sem portal vinculado</span>
          )}
        </div>
      </div>

      {/* Divisor */}
      <div className="border-t border-[#f1f5f9]" />

      {/* Ações */}
      <div className="p-3.5 flex flex-wrap items-center gap-1.5">
        {tipo === "mikrotik" && (
          <>
            <button
              onClick={() => onHotspot(m.id)}
              disabled={enviandoHotspot === m.id}
              title="Enviar configuração de Hotspot para o roteador"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-700 transition-colors cursor-pointer ${enviandoHotspot === m.id ? "bg-amber-500 text-white animate-pulse" : "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] hover:bg-[#dbeafe]"}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              {enviandoHotspot === m.id ? "Enviando..." : "Hotspot"}
            </button>
            <button
              onClick={() => onLogin(m.id)}
              disabled={enviandoLogin === m.id}
              title="Enviar página de login.html para o roteador"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-700 transition-colors cursor-pointer ${enviandoLogin === m.id ? "bg-amber-500 text-white animate-pulse" : "bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] hover:bg-[#d1fae5]"}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {enviandoLogin === m.id ? "Enviando..." : "Login"}
            </button>
          </>
        )}

        <button
          onClick={() => onTestar(m.id)}
          title="Testar conectividade com o equipamento"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-600 text-slate-600 bg-[#f8fafc] border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Testar
        </button>

        <button
          onClick={() => onEditar(m)}
          title="Editar dados do equipamento"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-600 text-slate-600 bg-[#f8fafc] border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>

        <button
          onClick={() => onRemover(m.id)}
          title="Remover equipamento"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-600 text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] hover:bg-[#fee2e2] transition-colors cursor-pointer ml-auto"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Excluir
        </button>
      </div>
    </div>
  );
}

// ── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_4px_rgba(0,0,0,0.06)] animate-pulse p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-slate-100 rounded w-3/4"></div>
          <div className="h-2.5 bg-slate-100 rounded w-1/2"></div>
        </div>
      </div>
      <div className="h-8 bg-slate-100 rounded-md"></div>
      <div className="h-4 bg-slate-100 rounded w-2/3"></div>
      <div className="border-t border-[#f1f5f9] pt-3 flex gap-1.5">
        <div className="h-7 bg-slate-100 rounded-md w-16"></div>
        <div className="h-7 bg-slate-100 rounded-md w-14"></div>
        <div className="h-7 bg-slate-100 rounded-md w-12"></div>
      </div>
    </div>
  );
}

// ── Página Principal ─────────────────────────────────────────────────────────
export default function Mikrotiks() {
  const [mikrotiks, setMikrotiks] = useState([]);
  const [portais, setPortais] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGatewayWizard, setShowGatewayWizard] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [hotspotLog, setHotspotLog] = useState([]);

  const [enviandoHotspot, setEnviandoHotspot] = useState(null);
  const [enviandoLogin, setEnviandoLogin] = useState(null);
  const [form, setForm] = useState({ nome: "", ip: "", usuario: "", senha: "", porta: 8728, end_hotspot: "", portal_id: "" });
  const [erro, setErro] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [showConfirmExcluir, setShowConfirmExcluir] = useState(null); // id do mikrotik a excluir

  const token = localStorage.getItem("admin_token");

  // Wizard de hotspot inline
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMikrotikId, setWizardMikrotikId] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [wizardConfig, setWizardConfig] = useState({
    interface: "", localAddress: "10.5.50.1/24", poolName: "hs-pool", poolRange: "10.5.50.2-10.5.50.254", dnsName: ""
  });

  const carregarPortais = async () => {
    try {
      const res = await fetch("/api/portais", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPortais(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const abrirWizard = async (id) => {
    setWizardMikrotikId(id);
    setScanning(true);
    setScanData(null);
    setShowWizard(true);
    setWizardStep(0);
    setWizardConfig({ interface: "", localAddress: "10.5.50.1/24", poolName: "hs-pool", poolRange: "10.5.50.2-10.5.50.254", dnsName: "" });

    try {
      const res = await fetch(`/api/mikrotiks/${id}/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); setShowWizard(false); return; }
      setScanData(data);
      if (data.interfaces?.length > 0) {
        setWizardConfig(c => ({ ...c, interface: data.interfaces[0]?.name || "ether2" }));
      }
      if (data.pools?.length > 0) {
        setWizardConfig(c => ({ ...c, poolName: data.pools[0].name, poolRange: data.pools[0].ranges }));
      }
    } catch (err) {
      alert("Erro ao escanear Mikrotik");
      setShowWizard(false);
    } finally {
      setScanning(false);
    }
  };

  const executarWizard = async () => {
    setEnviandoHotspot(wizardMikrotikId);
    setShowWizard(false);
    setHotspotLog([]);
    setShowLogModal(true);

    try {
      const res = await fetch(`/api/mikrotiks/${wizardMikrotikId}/enviar-hotspot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(wizardConfig),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "step") {
              setHotspotLog(prev => [...prev, `[${event.status}] ${event.message}`]);
            } else if (event.type === "error") {
              setHotspotLog(prev => [...prev, `[erro] ${event.message}`]);
            } else if (event.type === "done") {
              if (event.success) {
                setHotspotLog(prev => [...prev, "--- Configuração finalizada com sucesso! ---"]);
              }
              carregarMikrotiks();
            }
          } catch (e) { /* ignora */ }
        }
      }
    } catch (err) {
      setHotspotLog(prev => [...prev, `[erro] Falha de conexão: ${err.message}`]);
    } finally {
      setEnviandoHotspot(null);
    }
  };

  const carregarMikrotiks = async () => {
    try {
      const res = await fetch("/api/mikrotiks", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data.map(m => ({ ...m, status: "loading" })) : [];
      setMikrotiks(list);
      setInitialLoading(false);

      // Ping paralelo de status
      for (const m of list) {
        fetch(`/api/mikrotiks/${m.id}/testar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => {
            setMikrotiks(prev => prev.map(item =>
              item.id === m.id ? { ...item, status: r.ok ? "online" : "offline" } : item
            ));
          })
          .catch(() => {
            setMikrotiks(prev => prev.map(item =>
              item.id === m.id ? { ...item, status: "offline" } : item
            ));
          });
      }
    } catch (err) {
      setErro("Erro ao buscar equipamentos");
      setInitialLoading(false);
    }
  };

  const salvarMikrotik = async (e) => {
    e.preventDefault();
    setErro("");
    const method = editandoId ? "PUT" : "POST";
    const url = editandoId ? `/api/mikrotiks/${editandoId}` : "/api/mikrotiks";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.message || "Erro ao salvar");
      } else {
        setShowModal(false);
        setForm({ nome: "", ip: "", usuario: "", senha: "", porta: 8728, end_hotspot: "", portal_id: "" });
        setEditandoId(null);
        carregarMikrotiks();
      }
    } catch {
      setErro("Erro de conexão");
    }
  };

  const editar = (mikrotik) => {
    setForm({ ...mikrotik, end_hotspot: mikrotik.end_hotspot || "", portal_id: mikrotik.portal_id || "" });
    setEditandoId(mikrotik.id);
    setShowModal(true);
  };

  const remover = async (id) => {
    try {
      await fetch(`/api/mikrotiks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowConfirmExcluir(null);
      carregarMikrotiks();
    } catch {
      alert("Erro ao deletar equipamento");
    }
  };

  const testarConexao = async (id) => {
    // Seta loading só para aquele card
    setMikrotiks(prev => prev.map(item => item.id === id ? { ...item, status: "loading" } : item));
    try {
      const res = await fetch(`/api/mikrotiks/${id}/testar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setMikrotiks(prev => prev.map(item =>
        item.id === id ? { ...item, status: res.ok ? "online" : "offline" } : item
      ));
    } catch {
      setMikrotiks(prev => prev.map(item => item.id === id ? { ...item, status: "offline" } : item));
    }
  };

  const enviarLogin = async (id) => {
    setEnviandoLogin(id);
    try {
      const res = await fetch(`/api/mikrotiks/${id}/enviar-login`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(data.message);
    } catch {
      alert("Erro de conexão ao enviar login.html");
    } finally {
      setEnviandoLogin(null);
    }
  };

  const salvarGatewayWizard = async (dadosForm) => {
    try {
      const res = await fetch("/api/mikrotiks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(dadosForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao salvar equipamento");
      setShowGatewayWizard(false);
      carregarMikrotiks();
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    carregarMikrotiks();
    carregarPortais();
  }, []);

  // KPIs de status
  const total = mikrotiks.length;
  const online = mikrotiks.filter(m => m.status === "online").length;
  const offline = mikrotiks.filter(m => m.status === "offline").length;
  const loading = mikrotiks.filter(m => m.status === "loading").length;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <PageHeader
          icon={
            <svg className="w-6 h-6 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          }
          title="Equipamentos & Gateways"
          subtitle="Gerenciamento de MikroTik RouterOS, TP-Link Omada e Ubiquiti UniFi"
          actions={
            <button
              onClick={() => setShowGatewayWizard(true)}
              className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-700 rounded-md transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>⚡</span>
              + Adicionar Equipamento
            </button>
          }
        />

        {/* ── KPI Bar ──────────────────────────────────────────────────── */}
        {!initialLoading && total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#e2e8f0] rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <div>
                <p className="text-[20px] font-800 text-slate-900 leading-none">{total}</p>
                <p className="text-[11px] text-slate-500 font-500 mt-0.5">Equipamentos</p>
              </div>
            </div>

            <div className="bg-white border border-[#a7f3d0] rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping block"></span>
              </div>
              <div>
                <p className="text-[20px] font-800 text-[#10b981] leading-none">{online}</p>
                <p className="text-[11px] text-slate-500 font-500 mt-0.5">Online</p>
              </div>
            </div>

            <div className="bg-white border border-[#fecaca] rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] block"></span>
              </div>
              <div>
                <p className="text-[20px] font-800 text-[#dc2626] leading-none">{offline}</p>
                <p className="text-[11px] text-slate-500 font-500 mt-0.5">Offline</p>
              </div>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#f8fafc] flex items-center justify-center flex-shrink-0">
                <svg className={`w-4 h-4 text-slate-400 ${loading > 0 ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </div>
              <div>
                <p className="text-[20px] font-800 text-slate-500 leading-none">{loading}</p>
                <p className="text-[11px] text-slate-500 font-500 mt-0.5">Verificando</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Grid de Cards ──────────────────────────────────────────────── */}
        {initialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : mikrotiks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mikrotiks.map(m => (
              <EquipamentoCard
                key={m.id}
                m={m}
                onHotspot={abrirWizard}
                onLogin={enviarLogin}
                onTestar={testarConexao}
                onEditar={editar}
                onRemover={(id) => setShowConfirmExcluir(id)}
                enviandoHotspot={enviandoHotspot}
                enviandoLogin={enviandoLogin}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-[#cbd5e1] rounded-[12px] py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="w-14 h-14 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <h3 className="text-[15px] font-700 text-slate-800 mb-1.5">Nenhum equipamento cadastrado</h3>
            <p className="text-[13px] text-slate-400 max-w-xs mx-auto mb-5">
              Adicione seu primeiro roteador MikroTik, TP-Link Omada ou Ubiquiti UniFi para gerenciar a rede Wi-Fi.
            </p>
            <button
              onClick={() => setShowGatewayWizard(true)}
              className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-700 rounded-md transition-colors cursor-pointer"
            >
              ⚡ Adicionar primeiro equipamento
            </button>
          </div>
        )}

        {/* ── Gateway Wizard (novo equipamento) ─────────────────────────── */}
        {showGatewayWizard && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GatewayWizard
              portais={portais}
              onSave={salvarGatewayWizard}
              onCancel={() => setShowGatewayWizard(false)}
            />
          </div>
        )}

        {/* ── Wizard de Hotspot (scan + configurar) ─────────────────────── */}
        {showWizard && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6 border-b border-[#e2e8f0]">
                <h2 className="text-[17px] font-700 text-slate-900">Configurar Hotspot</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Configuração automática via API RouterOS</p>
              </div>
              <div className="p-6 space-y-4">
                {scanning ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-8 h-8 border-[3px] border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[13px] text-slate-500">Escaneando interfaces do MikroTik...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-1.5">Interface de Rede</label>
                      <select className="ds-input" value={wizardConfig.interface} onChange={e => setWizardConfig(c => ({ ...c, interface: e.target.value }))}>
                        {scanData?.interfaces?.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-1.5">Endereço Local</label>
                      <input className="ds-input font-mono" value={wizardConfig.localAddress} onChange={e => setWizardConfig(c => ({ ...c, localAddress: e.target.value }))} />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-1.5">Pool (Nome)</label>
                        <input className="ds-input" value={wizardConfig.poolName} onChange={e => setWizardConfig(c => ({ ...c, poolName: e.target.value }))} />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-1.5">Pool (Range IP)</label>
                        <input className="ds-input font-mono" value={wizardConfig.poolRange} onChange={e => setWizardConfig(c => ({ ...c, poolRange: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-1.5">DNS Name (opcional)</label>
                      <input className="ds-input" placeholder="hotspot.meuestablecimento.com.br" value={wizardConfig.dnsName} onChange={e => setWizardConfig(c => ({ ...c, dnsName: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
              <div className="p-5 border-t border-[#e2e8f0] flex justify-end gap-2.5">
                <SecondaryButton onClick={() => setShowWizard(false)}>Cancelar</SecondaryButton>
                <PrimaryButton onClick={executarWizard} disabled={scanning}>Aplicar Configuração</PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Editar Equipamento ───────────────────────────────────── */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editandoId ? "Editar Equipamento" : "Adicionar Equipamento"}
          description="Informe os dados de conexão de API com o seu roteador"
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setShowModal(false)}>Cancelar</SecondaryButton>
              <PrimaryButton onClick={salvarMikrotik}>{editandoId ? "Salvar Alterações" : "Adicionar"}</PrimaryButton>
            </div>
          }
        >
          <form onSubmit={salvarMikrotik} className="space-y-4">
            {erro && <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[12px] rounded-md">{erro}</div>}
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Nome de Identificação *</label>
              <input placeholder="Ex: MikroTik Entrada Principal" className="ds-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Endereço IP / Host *</label>
              <input placeholder="192.168.88.1" className="ds-input font-mono" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} required />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Usuário API *</label>
                <input className="ds-input" value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} required />
              </div>
              <div className="w-28">
                <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Porta API</label>
                <input type="number" className="ds-input" value={form.porta} onChange={e => setForm({ ...form, porta: parseInt(e.target.value) })} required />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Senha API</label>
              <input type="password" className="ds-input" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Portal Captive Vinculado</label>
              <select className="ds-input" value={form.portal_id} onChange={e => setForm({ ...form, portal_id: e.target.value })}>
                <option value="">Nenhum (Padrão)</option>
                {portais.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
              </select>
            </div>
          </form>
        </Modal>

        {/* ── Modal de Confirmação de Exclusão ──────────────────────────── */}
        <Modal
          isOpen={!!showConfirmExcluir}
          onClose={() => setShowConfirmExcluir(null)}
          title="Confirmar Exclusão"
          description="Essa ação não pode ser desfeita"
          maxWidth="sm"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setShowConfirmExcluir(null)}>Cancelar</SecondaryButton>
              <button
                onClick={() => remover(showConfirmExcluir)}
                className="px-4 py-2 bg-[#dc2626] hover:bg-red-700 text-white text-[12px] font-700 rounded-md transition-colors cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          }
        >
          <p className="text-[13px] text-slate-600">
            Tem certeza que deseja remover o equipamento <strong className="font-700 text-slate-900">{mikrotiks.find(m => m.id === showConfirmExcluir)?.nome}</strong>?
            As configurações do roteador não serão afetadas.
          </p>
        </Modal>

        {/* ── Log de Configuração Automática ─────────────────────────────── */}
        <Modal
          isOpen={showLogModal}
          onClose={() => { if (!enviandoHotspot) setShowLogModal(false); }}
          title="Log de Configuração Automática"
          description="Instruções executadas no RouterOS via API Mikrotik"
          maxWidth="lg"
          footer={
            <div className="flex justify-end">
              <SecondaryButton onClick={() => setShowLogModal(false)} disabled={!!enviandoHotspot}>
                {enviandoHotspot ? "Configurando..." : "Fechar"}
              </SecondaryButton>
            </div>
          }
        >
          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-1 shadow-inner">
            {hotspotLog.length === 0 && enviandoHotspot && (
              <div className="text-slate-400 animate-pulse flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Conectando ao MikroTik RouterOS...
              </div>
            )}
            {hotspotLog.map((line, i) => (
              <div key={i} className={`flex items-start gap-2 ${line.includes("[erro]") ? "text-red-400 font-bold" : line.includes("[aviso]") ? "text-amber-400" : line.startsWith("---") ? "text-blue-400 font-semibold mt-2" : "text-emerald-400"}`}>
                <span className="text-slate-600 select-none shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </Modal>

      </div>
    </AdminLayout>
  );
}
