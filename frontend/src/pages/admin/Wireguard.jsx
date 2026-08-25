import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, SecondaryButton, PrimaryButton } from "@/components/ui";
import {
  Shield, Plus, Settings, Key, Trash2, Code, X, RefreshCw,
  Globe, ExternalLink, Activity, Copy, Check, Terminal, Wifi,
  Lock, Unlock, Power, ChevronDown, ChevronUp, Filter
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "—";
  const diff = (new Date() - new Date(dateStr)) / 1000;
  if (diff < 60) return "há alguns segundos";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)} dia${Math.floor(diff / 86400) > 1 ? "s" : ""}`;
};

const isOnlinePeer = (client) =>
  client.latestHandshakeAt && (new Date() - new Date(client.latestHandshakeAt)) < 180000;

const getWinboxPort = (address) => {
  if (!address) return 20002;
  const match = address.match(/10\.8\.0\.(\d+)/);
  return match ? 20000 + parseInt(match[1]) : 20002;
};

// ── Copy Hook ──────────────────────────────────────────────────────────────
function useCopy() {
  const [copiedField, setCopiedField] = useState(null);
  const copy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  return { copiedField, copy };
}

// ── CopyField Component ────────────────────────────────────────────────────
function CopyField({ label, value, fieldKey, copiedField, onCopy, mono = true }) {
  return (
    <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
      <span className="block text-[10px] font-600 text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[12px] font-700 text-slate-800 truncate ${mono ? "font-mono" : ""}`}>{value}</span>
        <button
          onClick={() => onCopy(value, fieldKey)}
          className="p-1 text-slate-400 hover:text-[#2563eb] hover:bg-white rounded transition-colors cursor-pointer shrink-0"
        >
          {copiedField === fieldKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Traffic Bar ────────────────────────────────────────────────────────────
function TrafficBar({ rx, tx }) {
  const total = (rx || 0) + (tx || 0);
  const rxPct = total > 0 ? Math.round(((rx || 0) / total) * 100) : 50;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#10b981] font-600 flex items-center gap-1">↓ {formatBytes(rx)}</span>
        <span className="text-[#2563eb] font-600 flex items-center gap-1">↑ {formatBytes(tx)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden flex">
        <div className="bg-[#10b981] transition-all" style={{ width: `${rxPct}%` }} />
        <div className="bg-[#2563eb] transition-all flex-1" />
      </div>
    </div>
  );
}

// ── Peer Card ──────────────────────────────────────────────────────────────
function PeerCard({ client, onScript, onDelete, onRemoteAccess }) {
  const online = isOnlinePeer(client);
  return (
    <div className={`bg-white rounded-[12px] border shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] transition-all flex flex-col ${online ? "border-[#a7f3d0]" : "border-[#fecaca]"}`}>
      {/* Header */}
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${online ? "bg-[#ecfdf5] border-[#a7f3d0]" : "bg-[#fef2f2] border-[#fecaca]"}`}>
            <Shield className={`w-5 h-5 ${online ? "text-[#10b981]" : "text-[#dc2626]"}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-700 text-slate-900 truncate">{client.name}</h3>
            <code className="text-[11px] font-600 text-slate-500 bg-[#f8fafc] border border-[#e2e8f0] px-1.5 py-0.5 rounded">{client.address}</code>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-700 border shrink-0 ${online ? "bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]" : "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-[#10b981] animate-ping" : "bg-[#dc2626]"}`} />
          {online ? "Online" : "Offline"}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 pb-4 flex flex-col gap-3 flex-1">
        {/* Handshake */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-500">Último handshake</span>
          <span className={`text-[11px] font-600 ${online ? "text-[#10b981]" : "text-slate-400"}`}>
            {timeAgo(client.latestHandshakeAt)}
          </span>
        </div>

        {/* Tipo */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-500">Tipo</span>
          <span className="text-[10px] font-700 text-[#2563eb] bg-[#eff6ff] border border-[#bfdbfe] px-2 py-0.5 rounded-full">MikroTik</span>
        </div>

        {/* Tráfego */}
        <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-md p-2.5">
          <span className="text-[10px] font-600 uppercase tracking-wider text-slate-400 mb-1.5 block">Tráfego (RX / TX)</span>
          <TrafficBar rx={client.transferRx} tx={client.transferTx} />
        </div>
      </div>

      <div className="border-t border-[#f1f5f9]" />

      {/* Actions */}
      <div className="p-3.5 flex items-center gap-1.5">
        {online && (
          <button
            onClick={() => onRemoteAccess(client)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-700 bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-colors cursor-pointer"
          >
            <Globe className="w-3 h-3" />
            Acesso Remoto
          </button>
        )}
        <button
          onClick={() => onScript(client.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-600 text-slate-600 bg-[#f8fafc] border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
        >
          <Code className="w-3 h-3" />
          Script
        </button>
        <button
          onClick={() => onDelete(client.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-600 text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] hover:bg-[#fee2e2] transition-colors cursor-pointer ml-auto"
        >
          <Trash2 className="w-3 h-3" />
          Excluir
        </button>
      </div>
    </div>
  );
}

// ── Skeleton Card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-[12px] border border-[#e2e8f0] animate-pulse p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 bg-slate-100 rounded w-3/4" />
          <div className="h-2.5 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
        <div className="h-8 bg-slate-100 rounded" />
      </div>
      <div className="border-t border-[#f1f5f9] pt-3 flex gap-1.5">
        <div className="h-7 bg-slate-100 rounded-md w-24" />
        <div className="h-7 bg-slate-100 rounded-md w-16" />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Wireguard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPeerName, setNewPeerName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptData, setScriptData] = useState("");
  const [serverSettings, setServerSettings] = useState({ wgPort: "51820", wgHost: "" });
  const [editSettings, setEditSettings] = useState({ wgPort: "", wgHost: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // all | online | offline
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Remote access modal
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [webfigUrl, setWebfigUrl] = useState("");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [winboxTunnelStatus, setWinboxTunnelStatus] = useState({ active: false, activeConnections: 0, port: null });
  const [togglingTunnel, setTogglingTunnel] = useState(false);

  const { copiedField, copy } = useCopy();
  const getToken = () => localStorage.getItem("admin_token") || localStorage.getItem("token");

  // ── Heartbeat ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showRemoteModal || !selectedPeer?.address) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/wireguard/winbox-tunnel/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ vpnIp: selectedPeer.address })
        });
        const data = await res.json();
        if (data.success) setWinboxTunnelStatus({ active: data.active !== false, activeConnections: data.activeConnections || 0, port: data.port });
      } catch (e) { console.error(e); }
    }, 10000);
    return () => clearInterval(interval);
  }, [showRemoteModal, selectedPeer]);

  // ── Remote Access ──────────────────────────────────────────────────────
  const openRemoteAccess = async (peer) => {
    setSelectedPeer(peer);
    setShowRemoteModal(true);
    setDiagnostics(null);
    setWebfigUrl("");
    setLoadingDiag(true);
    setGeneratingToken(true);
    setWinboxTunnelStatus({ active: true, activeConnections: 0, port: getWinboxPort(peer.address) });

    fetch("/api/wireguard/winbox-tunnel/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ clientId: peer.id, vpnIp: peer.address })
    }).then(r => r.json()).then(data => {
      if (data.success) setWinboxTunnelStatus({ active: true, activeConnections: data.activeConnections || 0, port: data.port });
    }).catch(console.error);

    fetch("/api/wireguard/webfig-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ clientId: peer.id, vpnIp: peer.address, clientName: peer.name })
    }).then(r => r.json()).then(data => { if (data.url) setWebfigUrl(data.url); })
      .catch(console.error).finally(() => setGeneratingToken(false));

    try {
      const res = await fetch(`/api/wireguard/peer-diagnostics/${peer.id}?ip=${peer.address}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setDiagnostics(await res.json());
    } catch (err) { console.error(err); } finally { setLoadingDiag(false); }
  };

  const handleToggleWinboxTunnel = async (enable) => {
    if (!selectedPeer?.address) return;
    setTogglingTunnel(true);
    try {
      const endpoint = enable ? "/api/wireguard/winbox-tunnel/enable" : "/api/wireguard/winbox-tunnel/disable";
      const body = enable
        ? { clientId: selectedPeer.id, vpnIp: selectedPeer.address }
        : { vpnIp: selectedPeer.address };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) setWinboxTunnelStatus({ active: enable, activeConnections: enable ? 0 : 0, port: data.port || null });
    } catch (e) { console.error(e); } finally { setTogglingTunnel(false); }
  };

  // ── Load ───────────────────────────────────────────────────────────────
  const loadServerSettings = async () => {
    try {
      const res = await fetch("/api/wireguard/settings", { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data) { setServerSettings(data); setEditSettings({ wgPort: data.wgPort || "51820", wgHost: data.wgHost || "" }); }
    } catch (err) { console.error(err); }
  };

  const loadStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/wireguard/status", { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data) setStatus(data);
    } catch (err) { console.error(err); } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStatus(); loadServerSettings(); }, []);

  // ── Peer Actions ───────────────────────────────────────────────────────
  const handleAddPeer = async (e) => {
    e.preventDefault();
    if (!newPeerName.trim()) return;
    try {
      const res = await fetch("/api/wireguard/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newPeerName.trim() })
      });
      const data = await res.json();
      if (res.ok && (data.id || data.success)) {
        setNewPeerName(""); setShowAddModal(false);
        loadStatus();
        if (data.id) showScript(data.id);
      } else { alert("Erro: " + (data.message || data.error || "Falha ao criar peer")); }
    } catch { alert("Erro ao conectar com o servidor."); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/wireguard/clients/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) { setConfirmDelete(null); loadStatus(); }
      else { const d = await res.json(); alert("Erro: " + (d.message || "Falha ao excluir")); }
    } catch { alert("Erro ao excluir peer"); }
  };

  const showScript = async (id) => {
    try {
      const res = await fetch(`/api/wireguard/clients/${id}/config`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.routerOsScript) { setScriptData(data.routerOsScript); setShowScriptModal(true); }
      else { alert("Erro: " + (data.message || "Falha ao obter script")); }
    } catch { alert("Erro ao buscar script"); }
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const clients = status?.clients || [];
  const totalOnline = clients.filter(isOnlinePeer).length;
  const totalOffline = clients.length - totalOnline;
  const filteredClients = clients.filter(c => {
    if (filterStatus === "online") return isOnlinePeer(c);
    if (filterStatus === "offline") return !isOnlinePeer(c);
    return true;
  });

  const publicKey = status?.server?.publicKey || "";
  const endpoint = status?.server?.endpoint || (serverSettings?.wgHost ? `${serverSettings.wgHost}:${serverSettings.wgPort || 51820}` : "");

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <PageHeader
          icon={
            <div className="w-9 h-9 rounded-lg bg-[#2563eb] flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
          }
          title="VPN WireGuard"
          subtitle="Túneis seguros e comunicação direta com os roteadores MikroTik"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(s => !s)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-600 border transition-colors cursor-pointer ${showSettings ? "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]" : "bg-white text-slate-600 border-[#e2e8f0] hover:bg-slate-50"}`}
              >
                <Settings className="w-4 h-4" />
                Configurações
                {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-700 rounded-md transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar Peer
              </button>
            </div>
          }
        />

        {/* ── Painel de Configurações ──────────────────────────────────── */}
        {showSettings && (
          <div className="bg-white rounded-[12px] p-6 border border-[#e2e8f0] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#e2e8f0]">
              <div className="p-1.5 bg-[#2563eb] rounded-md text-white"><Settings className="w-4 h-4" /></div>
              <h3 className="text-[15px] font-700 text-slate-900">Configurações do Servidor VPN</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-1.5">IP Público / Domínio</label>
                <input className="ds-input bg-white" value={editSettings.wgHost} onChange={e => setEditSettings({ ...editSettings, wgHost: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-600 text-slate-500 uppercase tracking-wide mb-1.5">Porta UDP WireGuard</label>
                <input type="number" className="ds-input bg-white" value={editSettings.wgPort} onChange={e => setEditSettings({ ...editSettings, wgPort: e.target.value })} min="1024" max="65535" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[12px] text-amber-700 flex items-center gap-1.5 font-500 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                ⚠️ Alterar a porta irá desconectar todos os peers temporariamente.
              </p>
              <button
                disabled={savingSettings}
                onClick={async () => {
                  setSavingSettings(true);
                  try {
                    const res = await fetch("/api/wireguard/settings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                      body: JSON.stringify(editSettings)
                    });
                    const data = await res.json();
                    if (res.ok) { setServerSettings(data); alert("Configurações salvas! VPN reiniciada."); loadStatus(); }
                    else { alert("Erro: " + (data.message || "Falha ao salvar")); }
                  } catch { alert("Erro ao salvar configurações"); } finally { setSavingSettings(false); }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-700 rounded-md transition-colors cursor-pointer disabled:opacity-60 shrink-0"
              >
                {savingSettings ? <><RefreshCw className="w-4 h-4 animate-spin" /> Reiniciando...</> : "Salvar e Reiniciar VPN"}
              </button>
            </div>
          </div>
        )}

        {/* ── KPI Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sub-rede */}
          <div className="bg-white rounded-[12px] p-5 border border-[#e2e8f0] border-l-4 border-l-[#06b6d4] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider">Sub-rede VPN</p>
              <div className="bg-cyan-50 text-cyan-600 p-2 rounded-md border border-cyan-200">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[22px] font-800 text-slate-900 font-mono">{status?.server?.subNet || "10.8.0.0/24"}</p>
            <p className="text-[11px] font-500 text-cyan-600 mt-1.5">Rede interna da VPN</p>
          </div>

          {/* Endpoint */}
          <div className="bg-white rounded-[12px] p-5 border border-[#e2e8f0] border-l-4 border-l-[#2563eb] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider">Endpoint Público</p>
              <button
                onClick={() => copy(endpoint, "endpoint")}
                title="Copiar endpoint"
                className="bg-blue-50 text-[#2563eb] p-2 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                {copiedField === "endpoint" ? <Check className="w-4 h-4 text-emerald-500" /> : <Key className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[15px] font-800 text-[#2563eb] font-mono truncate">{endpoint || "Não configurado"}</p>
            <p className="text-[11px] font-500 text-[#2563eb] mt-1.5">Porta UDP {serverSettings?.wgPort || "51820"}</p>
          </div>

          {/* Peers Online */}
          <div className="bg-white rounded-[12px] p-5 border border-[#e2e8f0] border-l-4 border-l-[#10b981] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider">Peers Conectados</p>
              <div className="bg-emerald-50 text-[#10b981] p-2 rounded-md border border-emerald-200">
                <span className="w-4 h-4 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping block" />
                </span>
              </div>
            </div>
            <p className="text-[22px] font-800 text-slate-900">
              {loading ? "—" : totalOnline}
              <span className="text-[14px] font-500 text-slate-400 ml-2">de {clients.length}</span>
            </p>
            {/* Barra de progresso */}
            {!loading && clients.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                  <div
                    className="h-full bg-[#10b981] rounded-full transition-all"
                    style={{ width: `${Math.round((totalOnline / clients.length) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] font-500 text-[#10b981] mt-1.5">{Math.round((totalOnline / clients.length) * 100)}% ativos</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Server Public Key ─────────────────────────────────────────── */}
        <div className="bg-white rounded-[12px] p-4 border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-500 rounded-md shrink-0"><Key className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-700 text-slate-400 uppercase tracking-wider">Server Public Key</h3>
            <p className="text-[12px] font-mono text-slate-800 break-all select-all font-600 mt-0.5 pr-2">
              {publicKey || "Carregando..."}
            </p>
          </div>
          {publicKey && (
            <button
              onClick={() => copy(publicKey, "pubkey")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-600 rounded-md border border-slate-200 transition-colors cursor-pointer shrink-0"
            >
              {copiedField === "pubkey" ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Chave</>}
            </button>
          )}
        </div>

        {/* ── Grid de Peers ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Header da seção */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#2563eb] rounded-md text-white"><Shield className="w-4 h-4" /></div>
              <h2 className="text-[16px] font-700 text-slate-900">Peers e Túneis</h2>
              <span className="text-[11px] font-600 text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{clients.length} total</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtros */}
              <div className="flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-0.5">
                {[
                  { key: "all", label: "Todos" },
                  { key: "online", label: `Online (${totalOnline})` },
                  { key: "offline", label: `Offline (${totalOffline})` }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    className={`px-3 py-1 rounded text-[11px] font-600 transition-colors cursor-pointer ${filterStatus === f.key ? "bg-white text-slate-800 shadow-sm border border-[#e2e8f0]" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={() => loadStatus(true)}
                disabled={refreshing}
                title="Atualizar status dos peers"
                className="p-2 bg-white border border-[#e2e8f0] rounded-md text-slate-500 hover:text-[#2563eb] hover:border-[#bfdbfe] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#2563eb]" : ""}`} />
              </button>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClients.map(client => (
                <PeerCard
                  key={client.id}
                  client={client}
                  onScript={showScript}
                  onDelete={id => setConfirmDelete(id)}
                  onRemoteAccess={openRemoteAccess}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-[#cbd5e1] rounded-[12px] py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-[#2563eb]" />
              </div>
              {filterStatus !== "all" ? (
                <>
                  <h3 className="text-[14px] font-700 text-slate-800 mb-1">Nenhum peer {filterStatus === "online" ? "online" : "offline"}</h3>
                  <button onClick={() => setFilterStatus("all")} className="text-[12px] text-[#2563eb] hover:underline mt-1 cursor-pointer">Ver todos os peers</button>
                </>
              ) : (
                <>
                  <h3 className="text-[14px] font-700 text-slate-800 mb-1">Nenhum peer cadastrado</h3>
                  <p className="text-[12px] text-slate-400 max-w-xs mx-auto mb-5">Adicione um novo peer para conectar um roteador MikroTik via VPN segura.</p>
                  <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-700 rounded-md transition-colors cursor-pointer">
                    + Adicionar Peer
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Confirmar Exclusão ──────────────────────────────────── */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-[#dc2626]" />
                </div>
                <h3 className="text-[16px] font-700 text-slate-900 text-center mb-2">Excluir Peer VPN?</h3>
                <p className="text-[13px] text-slate-500 text-center">
                  <strong className="text-slate-700">{clients.find(c => c.id === confirmDelete)?.name}</strong> perderá o acesso VPN imediatamente. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-2.5 p-4 border-t border-[#f1f5f9]">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 bg-[#f8fafc] border border-[#e2e8f0] text-slate-700 text-[13px] font-600 rounded-md hover:bg-slate-100 cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 bg-[#dc2626] hover:bg-red-700 text-white text-[13px] font-700 rounded-md cursor-pointer transition-colors">
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Acesso Remoto ───────────────────────────────────────── */}
        {showRemoteModal && selectedPeer && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#e2e8f0] bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2563eb] rounded-md text-white"><Globe className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-[15px] font-700 text-slate-900">Acesso Remoto — {selectedPeer.name}</h3>
                    <p className="text-[12px] text-slate-400">Conexão direta via VPN WireGuard</p>
                  </div>
                </div>
                <button onClick={() => setShowRemoteModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* WebFig */}
                <div className="p-5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px]">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#2563eb] text-white rounded-md"><ExternalLink className="w-4 h-4" /></div>
                      <div>
                        <h4 className="text-[13px] font-700 text-slate-900">WebFig no Navegador</h4>
                        <p className="text-[11px] text-slate-500">Acesse o painel RouterOS de qualquer lugar</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] text-[10px] font-700 rounded-full">HTTPS Seguro</span>
                  </div>
                  <button
                    onClick={() => webfigUrl && window.open(webfigUrl, "_blank", "noopener,noreferrer")}
                    disabled={!webfigUrl || generatingToken}
                    className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-700 text-[13px] rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mb-3"
                  >
                    {generatingToken ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gerando Link...</> : <><Globe className="w-3.5 h-3.5" /> Abrir WebFig em Nova Aba</>}
                  </button>
                  {webfigUrl && (
                    <div className="p-2.5 bg-white border border-[#e2e8f0] rounded-md flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-700 truncate select-all">{webfigUrl}</span>
                      <button onClick={() => copy(webfigUrl, "webfigUrl")} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#2563eb] text-[11px] font-600 rounded-md border border-blue-200 flex items-center gap-1 shrink-0 cursor-pointer">
                        {copiedField === "webfigUrl" ? <><Check className="w-3 h-3 text-emerald-500" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Winbox */}
                <div className="p-5 bg-white border border-[#e2e8f0] rounded-[10px] space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#e2e8f0] gap-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#2563eb]" />
                      <h4 className="text-[11px] font-700 text-slate-700 uppercase tracking-wider">Winbox (Desktop)</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {winboxTunnelStatus.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] text-[11px] font-600 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                          Porta {winboxTunnelStatus.port || getWinboxPort(selectedPeer.address)} Aberta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-600 rounded-full">
                          <Lock className="w-3 h-3" /> Porta Fechada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#f8fafc] p-2.5 rounded-md border border-[#e2e8f0]">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Wifi className={`w-3.5 h-3.5 ${winboxTunnelStatus.activeConnections > 0 ? "text-[#10b981]" : "text-slate-400"}`} />
                      Sessões ativas: <strong className="text-slate-900">{winboxTunnelStatus.activeConnections}</strong>
                    </div>
                    {winboxTunnelStatus.active ? (
                      <button onClick={() => handleToggleWinboxTunnel(false)} disabled={togglingTunnel} className="px-2.5 py-1 bg-[#fef2f2] hover:bg-[#fee2e2] text-red-700 border border-[#fecaca] text-[11px] font-600 rounded-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                        <Power className="w-3 h-3" /> {togglingTunnel ? "Encerrando..." : "Encerrar Acesso"}
                      </button>
                    ) : (
                      <button onClick={() => handleToggleWinboxTunnel(true)} disabled={togglingTunnel} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#2563eb] border border-blue-200 text-[11px] font-600 rounded-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                        <Unlock className="w-3 h-3" /> {togglingTunnel ? "Abrindo..." : "Reabrir Porta"}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CopyField label="Endereço Winbox (Domínio)" value={`hotspot.nuvycore.online:${getWinboxPort(selectedPeer.address)}`} fieldKey="winboxDomain" copiedField={copiedField} onCopy={copy} />
                    <CopyField label="Endereço Winbox (IP Público)" value={`179.198.123.89:${getWinboxPort(selectedPeer.address)}`} fieldKey="winboxIp" copiedField={copiedField} onCopy={copy} />
                  </div>
                  <CopyField label="IP VPN Interno (Porta 8291)" value={`${selectedPeer.address}`} fieldKey="vpnIp" copiedField={copiedField} onCopy={copy} />
                </div>

                {/* Diagnóstico de Portas */}
                <div className="p-5 bg-white border border-[#e2e8f0] rounded-[10px] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#2563eb]" />
                      <h4 className="text-[11px] font-700 text-slate-700 uppercase tracking-wider">Status das Portas</h4>
                    </div>
                    <button onClick={() => openRemoteAccess(selectedPeer)} disabled={loadingDiag} className="text-[11px] text-[#2563eb] hover:underline font-600 flex items-center gap-1 cursor-pointer disabled:opacity-50">
                      <RefreshCw className={`w-3 h-3 ${loadingDiag ? "animate-spin" : ""}`} /> Re-testar
                    </button>
                  </div>
                  {loadingDiag ? (
                    <div className="py-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" /> Testando portas e latência...
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {[
                          { label: "WebFig (80)", key: "webfig" },
                          { label: "Winbox (8291)", key: "winbox" },
                          { label: "API (8728)", key: "api" },
                          { label: "SSH (22)", key: "ssh" }
                        ].map(port => (
                          <div key={port.key} className={`p-2.5 rounded-md border text-xs font-600 ${diagnostics?.ports?.[port.key] ? "bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]" : "bg-[#f8fafc] text-slate-400 border-[#e2e8f0]"}`}>
                            <span className="block text-[10px] text-slate-500 mb-0.5">{port.label}</span>
                            {diagnostics?.ports?.[port.key] ? "● Ativo" : "○ Fechado"}
                          </div>
                        ))}
                      </div>
                      {diagnostics?.latency_ms && (
                        <div className="flex items-center justify-between text-xs text-slate-600 bg-[#f8fafc] px-3 py-2 rounded-md border border-[#e2e8f0]">
                          <span className="font-500">Latência (Ping):</span>
                          <span className="font-mono font-700 text-[#10b981]">⚡ {diagnostics.latency_ms} ms</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end">
                <button onClick={() => setShowRemoteModal(false)} className="px-4 py-2 bg-white border border-[#e2e8f0] text-slate-700 text-[12px] font-600 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Add Peer ────────────────────────────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#e2e8f0] bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#2563eb] rounded-md text-white"><Plus className="w-4 h-4" /></div>
                  <h3 className="text-[15px] font-700 text-slate-900">Novo Peer WireGuard</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddPeer} className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Identificação do MikroTik</label>
                  <input type="text" placeholder="Ex: RB750Gr3-Filial-01" value={newPeerName} onChange={e => setNewPeerName(e.target.value)} className="ds-input bg-white" required />
                  <p className="text-[11px] text-slate-400 mt-1.5">Um script de configuração será gerado automaticamente após a criação.</p>
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e2e8f0]">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-white border border-[#e2e8f0] text-slate-700 text-[12px] font-600 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-700 rounded-md cursor-pointer transition-colors">
                    Criar e Gerar Script
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal Script RouterOS ─────────────────────────────────────── */}
        {showScriptModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#e2e8f0] bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#2563eb] rounded-md text-white"><Code className="w-4 h-4" /></div>
                  <h3 className="text-[15px] font-700 text-slate-900">Script de Configuração RouterOS</h3>
                </div>
                <button onClick={() => setShowScriptModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-[12px] text-slate-500 mb-3">
                  Cole este comando diretamente no <strong className="text-slate-700">Terminal do MikroTik (RouterOS v7+)</strong>:
                </p>
                <div className="bg-slate-950 text-slate-100 rounded-[10px] p-4 font-mono text-xs overflow-x-auto border border-slate-800 mb-4 max-h-72 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{scriptData}</pre>
                </div>
                <div className="flex items-center justify-end gap-2.5">
                  <button onClick={() => setShowScriptModal(false)} className="px-4 py-2 bg-white border border-[#e2e8f0] text-slate-700 text-[12px] font-600 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                    Fechar
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(scriptData); copy(scriptData, "script"); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-700 rounded-md cursor-pointer transition-colors">
                    {copiedField === "script" ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Script MikroTik</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
