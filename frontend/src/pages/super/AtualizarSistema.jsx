import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";

export default function AtualizarSistema() {
  const { user, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // email | checking | updates | applying | done | error
  const [email, setEmail] = useState("");
  const [updates, setUpdates] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });
  const [lastAppliedId, setLastAppliedId] = useState(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const reloadTimerRef = useRef(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate(`/admin/${user?.empresa_slug || "default"}`);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep("checking");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-update/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorized) {
        setErrorMsg(data.message || "Assinatura nao autorizada ou email invalido.");
        setStep("error");
        return;
      }
      if (!data.updates || data.updates.length === 0) {
        setDoneMsg("Seu sistema ja esta na versao mais recente. Nenhuma atualizacao disponivel.");
        setStep("done");
        return;
      }
      setUpdates(data.updates);
      setStep("updates");
    } catch (err) {
      setErrorMsg("Erro ao verificar atualizacoes. Verifique sua conexao e tente novamente.");
      setStep("error");
    }
  };

  const fetchLogs = async (updateId) => {
    setLogsLoading(true);
    setLogsData([]);
    setLogsOpen(true);
    try {
      const token = localStorage.getItem("admin_token");
      const url = updateId
        ? `/api/system-update/logs?update_id=${encodeURIComponent(updateId)}`
        : "/api/system-update/logs";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogsData(Array.isArray(data.logs) ? data.logs : []);
      } else {
        setLogsData([
          {
            id: 0,
            step: "error",
            status: "erro",
            message: data.message || "Falha ao carregar logs",
            criado_em: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setLogsData([
        {
          id: 0,
          step: "error",
          status: "erro",
          message: "Erro de conexao ao carregar logs",
          criado_em: new Date().toISOString(),
        },
      ]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleApply = async () => {
    setStep("applying");
    const total = updates.length;
    setApplyProgress({ current: 0, total });

    const token = localStorage.getItem("admin_token");

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      setApplyProgress({ current: i + 1, total });
      setLastAppliedId(update.id);
      const isLast = i === updates.length - 1;

      try {
        const res = await fetch("/api/system-update/apply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: email.trim(), update_id: update.id }),
        });

        let data = null;
        try {
          data = await res.json();
        } catch {
          // Conexao perdida ao ler resposta - se for a ultima, PM2 reiniciou
          if (isLast) {
            setDoneMsg(
              "Atualizacao aplicada com sucesso! O servidor foi reiniciado. A pagina sera recarregada automaticamente."
            );
            setStep("done");
            reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
            return;
          }
          setErrorMsg(
            `Conexao perdida ao aplicar a atualizacao ${update.id}. Recomendamos verificar o estado do sistema e restaurar um backup se necessario.`
          );
          setStep("error");
          return;
        }

        if (!res.ok || !data.success) {
          // Se for a ultima e o backend respondeu antes de reiniciar, pode ser falso negativo
          if (isLast && data?.applied) {
            setDoneMsg(
              data.message || "Atualizacoes aplicadas com sucesso! A pagina sera recarregada em 8 segundos."
            );
            setStep("done");
            reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
            return;
          }
          setErrorMsg(
            (data?.message || `Falha ao aplicar atualizacao "${update.descricao}".`) +
            (isLast ? "" : " Recomendamos restaurar o backup automatico criado antes desta operacao.")
          );
          setStep("error");
          return;
        }

        // Sucesso explícito
        if (isLast) {
          setDoneMsg(
            data.message || "Todas as atualizacoes foram aplicadas com sucesso! A pagina sera recarregada em 8 segundos."
          );
          setStep("done");
          reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
          return;
        }
      } catch (err) {
        // Erro de rede (fetch falhou completamente)
        if (isLast) {
          setDoneMsg(
            "Atualizacao aplicada com sucesso! O servidor foi reiniciado. A pagina sera recarregada automaticamente."
          );
          setStep("done");
          reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
          return;
        }
        setErrorMsg(
          `Erro de conexao ao aplicar a atualizacao "${update.descricao}". Recomendamos restaurar o backup automatico criado antes desta operacao.`
        );
        setStep("error");
        return;
      }
    }
  };

  const handleReset = () => {
    setStep("email");
    setErrorMsg("");
    setDoneMsg("");
    setUpdates([]);
    setApplyProgress({ current: 0, total: 0 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const progressPercent =
    applyProgress.total > 0
      ? Math.round((applyProgress.current / applyProgress.total) * 100)
      : 0;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f1f5f9] text-slate-700 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Atualizar Sistema</h1>
              <p className="text-slate-500 text-sm mt-1">Verifique e aplique atualizações da plataforma</p>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Sair
              </button>
            </div>
          </div>

          {/* Step: email */}
          {step === "email" && (
            <div className="bg-white border border-slate-200 rounded-[10px] p-8 shadow-sm">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Verificar Atualizações</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Informe o email cadastrado no Hotmart para validar sua assinatura e verificar se há atualizações disponíveis.
                </p>
              </div>

              <form onSubmit={handleCheck} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                    Email Hotmart *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-[#f1f5f9] border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] text-sm transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-colors text-sm shadow-sm cursor-pointer"
                >
                  Verificar Atualizações
                </button>
              </form>
            </div>
          )}

          {/* Step: checking */}
          {step === "checking" && (
            <div className="bg-white border border-slate-200 rounded-[10px] p-12 flex flex-col items-center gap-6 shadow-sm">
              <div className="relative">
                <div className="w-14 h-14 border-4 border-slate-200 border-t-[#2563eb] rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-slate-900 text-lg font-bold">Verificando atualizações...</p>
                <p className="text-slate-500 text-xs mt-1">Validando assinatura e consultando repositório</p>
              </div>
            </div>
          )}

          {/* Step: updates */}
          {step === "updates" && (
            <div className="space-y-4">
              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4 flex gap-3 text-blue-900">
                <svg className="w-5 h-5 text-[#2563eb] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Um backup automático do banco e arquivos será criado antes de aplicar as atualizações. Você pode restaurá-lo na página de Backups caso necessário.
                </p>
              </div>

              {/* Updates list */}
              <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e2e8f0] bg-slate-50">
                  <h2 className="text-slate-900 font-bold text-sm">
                    {updates.length} {updates.length === 1 ? "atualização disponível" : "atualizações disponíveis"}
                  </h2>
                </div>
                <div className="divide-y divide-[#f1f5f9]">
                  {updates.map((update, idx) => (
                    <div key={update.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563eb] text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold border border-blue-200/60">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-slate-900 font-bold text-sm">{update.descricao}</p>
                            {update.changelog && (
                              <p className="text-slate-500 text-xs mt-1 leading-relaxed">{update.changelog}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md">{update.id}</span>
                          {update.date && (
                            <p className="text-xs text-slate-400 mt-1">{formatDate(update.date)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-md transition-colors text-xs border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-md transition-colors text-xs shadow-sm cursor-pointer"
                >
                  Aplicar Todas as Atualizações
                </button>
              </div>
            </div>
          )}

          {/* Step: applying */}
          {step === "applying" && (
            <div className="bg-white border border-slate-200 rounded-[10px] p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin flex-shrink-0" style={{ borderWidth: "3px" }}></div>
                <div>
                  <p className="text-slate-900 font-bold">Aplicando atualizações...</p>
                  <p className="text-slate-500 text-xs">
                    {applyProgress.current > 0
                      ? `Atualização ${applyProgress.current} de ${applyProgress.total}`
                      : "Iniciando processo..."}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 font-semibold mb-2">
                  <span>{applyProgress.current} de {applyProgress.total} aplicadas</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-4 flex gap-3 text-amber-900">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  Não feche esta página. O processo pode reiniciar o serviço do servidor automaticamente após a compilação.
                </p>
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && (
            <div className="bg-white border border-slate-200 rounded-[10px] p-8 space-y-6 shadow-sm">
              <div className="bg-emerald-50 border border-emerald-200 rounded-[10px] p-6 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-emerald-950 font-bold text-lg">Atualização Concluída!</p>
                  <p className="text-emerald-800 text-xs mt-1">{doneMsg}</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-500 text-xs">A página será recarregada automaticamente em 8 segundos.</p>
                <div className="mt-4 flex gap-2.5 justify-center flex-wrap">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Recarregar Agora
                  </button>
                  <button
                    onClick={() => fetchLogs(lastAppliedId)}
                    className="px-5 py-2.5 bg-blue-50 text-[#2563eb] hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ver Logs
                  </button>
                  <Link
                    to="/super"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md text-xs font-bold transition-colors"
                  >
                    Ir para o Painel
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Step: error */}
          {step === "error" && (
            <div className="bg-white border border-slate-200 rounded-[10px] p-8 space-y-6 shadow-sm">
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-6 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-950 font-bold text-lg">Erro na Atualização</p>
                  <p className="text-red-800 text-xs mt-1">{errorMsg}</p>
                </div>
              </div>

              <div className="flex gap-2.5 flex-wrap">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2.5 rounded-md transition-colors text-xs cursor-pointer shadow-sm"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => fetchLogs(lastAppliedId)}
                  className="flex-1 bg-blue-50 text-[#2563eb] hover:bg-blue-100 border border-blue-200 font-bold py-2.5 rounded-xl transition-colors text-xs cursor-pointer"
                >
                  Ver Logs
                </button>
                <Link
                  to="/super/backups"
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-md transition-colors text-xs text-center flex items-center justify-center"
                >
                  Ir para Backups
                </Link>
              </div>
            </div>
          )}

          {/* Logs Modal */}
          {logsOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
              onClick={() => setLogsOpen(false)}
            >
              <div
                className="bg-white border border-slate-200 rounded-[10px] p-6 max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-900 text-base font-bold">
                    Logs da Atualização
                    {lastAppliedId && (
                      <span className="ml-2 text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                        #{lastAppliedId}
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => setLogsOpen(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs shadow-inner">
                  {logsLoading ? (
                    <p className="text-slate-400">Carregando logs...</p>
                  ) : logsData.length === 0 ? (
                    <p className="text-slate-400">
                      Nenhum log encontrado para esta atualização.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {logsData.map((l) => {
                        const color =
                          l.status === "erro"
                            ? "text-red-400 font-bold"
                            : l.status === "ok"
                              ? "text-emerald-400"
                              : "text-blue-400";
                        const ts = new Date(l.criado_em).toLocaleTimeString(
                          "pt-BR"
                        );
                        return (
                          <div key={l.id} className="flex gap-2">
                            <span className="text-slate-500 shrink-0">{ts}</span>
                            <span className={`shrink-0 w-14 ${color}`}>
                              [{l.status}]
                            </span>
                            <span className="shrink-0 w-24 text-slate-400">
                              {l.step}
                            </span>
                            <span className="text-slate-200 break-all">
                              {l.message}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2.5">
                  <button
                    onClick={() => fetchLogs(lastAppliedId)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#2563eb] border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Recarregar
                  </button>
                  <button
                    onClick={() => setLogsOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </AdminLayout>
  );
}