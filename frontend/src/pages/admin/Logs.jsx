import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";

const LINE_OPTIONS = [100, 250, 500, 1000, 2000, 5000];

function fmtBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Logs() {
  const [tab, setTab] = useState("pm2");
  const [pm2Tipo, setPm2Tipo] = useState("out");
  const [linhas, setLinhas] = useState(500);
  const [filtro, setFiltro] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [conteudo, setConteudo] = useState("");
  const [meta, setMeta] = useState({ path: "", size: 0, exists: true });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [limpando, setLimpando] = useState(false);

  const preRef = useRef(null);
  const autoScrollRef = useRef(true);
  const token = localStorage.getItem("admin_token");

  const carregar = async () => {
    setLoading(true);
    setErro("");
    try {
      const url =
        tab === "pm2"
          ? `/api/logs/pm2?tipo=${pm2Tipo}&lines=${linhas}`
          : `/api/logs/radius?lines=${linhas}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setConteudo(data.content || "");
      setMeta({ path: data.path, size: data.size, exists: data.exists });
    } catch (e) {
      setErro(e.message || "Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const carregarStatus = async () => {
    try {
      const res = await fetch("/api/logs/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      // silencioso
    }
  };

  const limpar = async () => {
    const confirmMsg =
      tab === "pm2"
        ? "Tem certeza que deseja limpar os logs do PM2?"
        : "Tem certeza que deseja limpar o log do FreeRADIUS?";
    if (!window.confirm(confirmMsg)) return;
    setLimpando(true);
    try {
      const url =
        tab === "pm2" ? "/api/logs/pm2/clear" : "/api/logs/radius/clear";
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await carregar();
    } catch (e) {
      setErro(e.message || "Erro ao limpar");
    } finally {
      setLimpando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pm2Tipo, linhas]);

  useEffect(() => {
    carregarStatus();
    const id = setInterval(carregarStatus, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(carregar, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, tab, pm2Tipo, linhas]);

  useEffect(() => {
    const el = preRef.current;
    if (!el) return;
    if (autoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conteudo]);

  const onScroll = () => {
    const el = preRef.current;
    if (!el) return;
    autoScrollRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  const linhasVisiveis = (() => {
    if (!conteudo) return [];
    const arr = conteudo.split("\n");
    if (!filtro) return arr;
    const f = filtro.toLowerCase();
    return arr.filter((l) => l.toLowerCase().includes(f));
  })();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(linhasVisiveis.join("\n"));
      alert("Logs copiados para a área de transferência!");
    } catch (e) {
      setErro("Não foi possível copiar os logs.");
    }
  };

  const baixar = () => {
    const blob = new Blob([conteudo], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nome =
      tab === "pm2"
        ? `pm2-${pm2Tipo}-${new Date().toISOString().slice(0, 19)}.log`
        : `radius-${new Date().toISOString().slice(0, 19)}.log`;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  };

  const corLinha = (linha) => {
    const l = linha.toLowerCase();
    if (l.includes("error") || l.includes("err ") || l.includes("erro")) return "text-red-400 font-semibold";
    if (l.includes("warn") || l.includes("aviso")) return "text-amber-400";
    if (l.includes("auth:") || l.includes("login ok") || l.includes("approved") || l.includes("success")) return "text-emerald-400";
    if (l.includes("reject") || l.includes("negado") || l.includes("failed")) return "text-red-400";
    return "text-slate-200";
  };

  const totalLinhas = conteudo ? conteudo.split("\n").length : 0;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="Logs do Sistema"
          subtitle="Acompanhe em tempo real os logs do backend (PM2) e do servidor FreeRADIUS"
          actions={
            status && (
              <div className="flex items-center gap-3 text-xs bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.pm2?.ok && status.pm2.status === "online"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-slate-700 font-medium">
                    PM2: <strong className="text-slate-900">{status.pm2?.status || "?"}</strong>
                    {status.pm2?.restarts !== undefined &&
                      ` (${status.pm2.restarts} restarts)`}
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.radius?.status === "active"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-slate-700 font-medium">
                    FreeRADIUS: <strong className="text-slate-900">{status.radius?.status || "?"}</strong>
                  </span>
                </div>
              </div>
            )
          }
        />

        {/* Abas de Navegação em Cápsula */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-fit">
          <button
            onClick={() => setTab("pm2")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === "pm2"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 font-semibold"
            }`}
          >
            PM2 (Backend)
          </button>
          <button
            onClick={() => setTab("radius")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === "radius"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 font-semibold"
            }`}
          >
            FreeRADIUS
          </button>
        </div>

        {/* Barra de Ferramentas / Controles */}
        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm flex flex-wrap items-center gap-3">
          {tab === "pm2" && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setPm2Tipo("out")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pm2Tipo === "out"
                    ? "bg-white text-[#2563eb] shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                stdout
              </button>
              <button
                onClick={() => setPm2Tipo("error")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pm2Tipo === "error"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                stderr
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-600 text-slate-600 uppercase tracking-wide">Linhas:</label>
            <select
              value={linhas}
              onChange={(e) => setLinhas(parseInt(e.target.value, 10))}
              className="bg-[#f1f5f9] text-slate-900 text-xs font-semibold rounded-xl px-3 py-2 border border-slate-300 focus:ring-2 focus:ring-[#2563eb]"
            >
              {LINE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} linhas
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Filtrar ocorrências no log..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="bg-[#f1f5f9] text-slate-900 text-xs rounded-xl px-3.5 py-2 border border-slate-300 flex-1 min-w-[160px] focus:ring-2 focus:ring-[#2563eb]"
          />

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-[#2563eb] w-4 h-4 rounded cursor-pointer"
            />
            Auto-refresh (4s)
          </label>

          <div className="flex gap-2 ml-auto flex-wrap">
            <PrimaryButton
              onClick={carregar}
              loading={loading}
              size="sm"
            >
              Atualizar
            </PrimaryButton>
            <SecondaryButton
              onClick={copiar}
              size="sm"
              variant="outline"
            >
              Copiar
            </SecondaryButton>
            <SecondaryButton
              onClick={baixar}
              size="sm"
              variant="outline"
            >
              Baixar .log
            </SecondaryButton>
            <SecondaryButton
              onClick={limpar}
              disabled={limpando}
              size="sm"
              variant="danger"
            >
              {limpando ? "Limpando..." : "Limpar Logs"}
            </SecondaryButton>
          </div>
        </div>

        {/* Metadados */}
        <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap px-1">
          <span>
            Arquivo: <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono text-[11px]">{meta.path || "—"}</code>
          </span>
          <span>Tamanho: <strong className="text-slate-700">{fmtBytes(meta.size)}</strong></span>
          <span>
            Exibindo <strong className="text-slate-700">{linhasVisiveis.length}</strong> linhas
            {filtro ? ` (filtradas de ${totalLinhas})` : ""}
          </span>
          {!meta.exists && (
            <span className="text-amber-700 font-semibold">(arquivo não encontrado)</span>
          )}
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl p-3">
            {erro}
          </div>
        )}

        {/* Terminal Box */}
        <div
          ref={preRef}
          onScroll={onScroll}
          className="bg-slate-900 border border-slate-800 rounded-[10px] p-4 h-[60vh] overflow-auto font-mono text-xs leading-relaxed shadow-lg text-slate-200"
        >
          {linhasVisiveis.length === 0 && !loading && (
            <div className="text-slate-500 italic">Sem linhas para exibir.</div>
          )}
          {linhasVisiveis.map((l, i) => (
            <div key={i} className={`whitespace-pre-wrap ${corLinha(l)}`}>
              {l || " "}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
