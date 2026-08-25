import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldCheck,
  RefreshCw,
  X,
  Lock,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Wifi,
  ArrowRight,
  Clock
} from "lucide-react";

export default function MinhasFaturas() {
  const [loading, setLoading] = useState(true);
  const [faturas, setFaturas] = useState([]);
  const [statusFinanceiro, setStatusFinanceiro] = useState("adimplente");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [empresaInfo, setEmpresaInfo] = useState(null);

  // Vitrine de Planos SaaS
  const [planos, setPlanos] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(false);
  const [mostrarVitrinePlanos, setMostrarVitrinePlanos] = useState(true);
  const [assinandoPlanoId, setAssinandoPlanoId] = useState(null);

  // Estado do Cartão de Crédito
  const [cartaoInfo, setCartaoInfo] = useState(null);
  const [loadingCartao, setLoadingCartao] = useState(false);
  const [modalCartaoAberto, setModalCartaoAberto] = useState(false);
  const [salvandoCartao, setSalvandoCartao] = useState(false);
  const [pagandoCartaoId, setPagandoCartaoId] = useState(null);

  // Form do Cartão
  const [formCartao, setFormCartao] = useState({
    cardNumber: "",
    cardholderName: "",
    cardExpirationMonth: "",
    cardExpirationYear: "",
    securityCode: "",
    docNumber: "",
    debitoAutomatico: true
  });

  // Modal de pagamento PIX
  const [modalPix, setModalPix] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [erroMsg, setErroMsg] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");

  const carregarFaturas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/saas-faturas/minhas-faturas", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFaturas(data.faturas || []);
        setStatusFinanceiro(data.status_financeiro || "adimplente");
        setEmpresaInfo(data.empresa || data);

        // Se o cliente não tem faturas ou está suspenso/trial, garante que a vitrine de planos fique aberta
        if (
          (data.faturas || []).length === 0 ||
          data.status_financeiro === "suspenso" ||
          data.status_financeiro === "trial" ||
          data.status_financeiro === "inadimplente"
        ) {
          setMostrarVitrinePlanos(true);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar minhas faturas:", err);
    } finally {
      setLoading(false);
    }
  };

  const carregarPlanos = async () => {
    try {
      setLoadingPlanos(true);
      const res = await fetch("/api/public/saas-planos");
      if (res.ok) {
        const data = await res.json();
        setPlanos(data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar planos SaaS:", err);
    } finally {
      setLoadingPlanos(false);
    }
  };

  const carregarMeuCartao = async () => {
    try {
      setLoadingCartao(true);
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/saas-cartao/meu-cartao", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCartaoInfo(data.cartao);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do cartão:", err);
    } finally {
      setLoadingCartao(false);
    }
  };

  useEffect(() => {
    carregarFaturas();
    carregarPlanos();
    carregarMeuCartao();
  }, []);

  // Polling automático enquanto o modal do PIX estiver aberto para detectar confirmação imediata
  useEffect(() => {
    if (!modalPix?.fatura?.id) return;

    const faturaId = modalPix.fatura.id;
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch("/api/saas-faturas/minhas-faturas", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const faturaAtualizada = (data.faturas || []).find((f) => f.id === faturaId);
          if (faturaAtualizada && faturaAtualizada.status === "pago") {
            setFaturas(data.faturas || []);
            setStatusFinanceiro(data.status_financeiro || "adimplente");
            setEmpresaInfo(data.empresa || data);
            setModalPix(null);
            setSucessoMsg("🎉 Pagamento confirmado com sucesso! Seu acesso ao sistema e Wi-Fi foi liberado imediatamente.");
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.warn("[Polling PIX]", e.message);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [modalPix]);

  const handleAssinarPlano = async (plano) => {
    setAssinandoPlanoId(plano.id);
    setErroMsg("");
    setSucessoMsg("");

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/saas-faturas/assinar-plano", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plano_id: plano.id })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Erro ao processar assinatura");
      }

      setSucessoMsg(data.message || `Plano ${plano.nome} selecionado com sucesso!`);

      // Se gerou cobrança PIX com QR Code, abre o modal de pagamento imediatamente
      if (data.pix_copia_cola && data.pix_qr_code) {
        setModalPix({
          fatura: {
            id: data.fatura_id,
            descricao: `Assinatura ${plano.nome} - Nuvy Pro`,
            valor: data.valor || plano.valor_mensal
          },
          pix_copia_cola: data.pix_copia_cola,
          pix_qr_code: data.pix_qr_code,
          carregando: false
        });
      }

      await carregarFaturas();
    } catch (err) {
      console.error("Erro ao assinar plano:", err);
      setErroMsg(err.message || "Falha ao contratar o plano selecionado.");
    } finally {
      setAssinandoPlanoId(null);
    }
  };

  const handleGerarPix = async (fatura) => {
    try {
      setModalPix({ fatura, pix_copia_cola: "", pix_qr_code: "", carregando: true });
      setErroMsg("");
      setCopiado(false);

      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/saas-faturas/${fatura.id}/gerar-pix`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erro ao gerar chave PIX");
      }

      setModalPix({
        fatura,
        pix_copia_cola: data.pix_copia_cola,
        pix_qr_code: data.pix_qr_code,
        carregando: false
      });
    } catch (err) {
      console.error("Erro ao gerar PIX:", err);
      setErroMsg(err.message || "Falha ao comunicar com o Gateway PIX");
      setModalPix((prev) => (prev ? { ...prev, carregando: false } : null));
    }
  };

  const handleCopiarPix = () => {
    if (modalPix?.pix_copia_cola) {
      navigator.clipboard.writeText(modalPix.pix_copia_cola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const handleSalvarCartao = async (e) => {
    e.preventDefault();
    setSalvandoCartao(true);
    setErroMsg("");
    setSucessoMsg("");

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/saas-cartao/salvar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formCartao)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao salvar cartão");

      setSucessoMsg("Cartão cadastrado com sucesso!");
      setCartaoInfo(data.cartao);
      setModalCartaoAberto(false);
      setFormCartao({
        cardNumber: "",
        cardholderName: "",
        cardExpirationMonth: "",
        cardExpirationYear: "",
        securityCode: "",
        docNumber: "",
        debitoAutomatico: true
      });
      setTimeout(() => setSucessoMsg(""), 4000);
    } catch (err) {
      setErroMsg(err.message || "Erro ao tokenizar cartão");
    } finally {
      setSalvandoCartao(false);
    }
  };

  const handleRemoverCartao = async () => {
    if (!window.confirm("Deseja realmente remover este cartão? As faturas voltarão a ser pagas via PIX.")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/saas-cartao/remover", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCartaoInfo(null);
        setSucessoMsg("Cartão removido com sucesso!");
        setTimeout(() => setSucessoMsg(""), 3000);
      }
    } catch (err) {
      alert("Erro ao remover cartão.");
    }
  };

  const handleToggleDebito = async () => {
    try {
      const novoStatus = !cartaoInfo.debitoAutomatico;
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/saas-cartao/toggle-debito", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: novoStatus })
      });
      if (res.ok) {
        setCartaoInfo({ ...cartaoInfo, debitoAutomatico: novoStatus });
      }
    } catch (err) {
      alert("Erro ao alterar débito automático.");
    }
  };

  const handlePagarComCartao = async (fatura) => {
    if (!cartaoInfo) {
      setModalCartaoAberto(true);
      return;
    }

    if (!window.confirm(`Confirmar o pagamento de ${formatarMoeda(fatura.valor)} no cartão final ${cartaoInfo.last4}?`)) {
      return;
    }

    setPagandoCartaoId(fatura.id);
    setErroMsg("");
    setSucessoMsg("");

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/saas-cartao/pagar-fatura/${fatura.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao processar cartão");

      setSucessoMsg(`Fatura #${fatura.id} paga com sucesso no cartão!`);
      carregarFaturas();
      setTimeout(() => setSucessoMsg(""), 5000);
    } catch (err) {
      setErroMsg(err.message || "Recusa no pagamento do cartão.");
    } finally {
      setPagandoCartaoId(null);
    }
  };

  const faturasFiltradas = faturas.filter((f) => {
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "pendente") return f.status === "pendente" || f.status === "vencido";
    if (filtroStatus === "pago") return f.status === "pago";
    return true;
  });

  const totalPendente = faturas
    .filter((f) => f.status === "pendente" || f.status === "vencido")
    .reduce((acc, f) => acc + parseFloat(f.valor), 0);

  const totalPago = faturas
    .filter((f) => f.status === "pago")
    .reduce((acc, f) => acc + parseFloat(f.valor), 0);

  const formatarData = (dataStr) => {
    if (!dataStr) return "-";
    const d = new Date(dataStr);
    return isNaN(d) ? dataStr : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  const formatarMoeda = (val) => {
    return parseFloat(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const parseRecursos = (recursos) => {
    if (!recursos) return [];
    if (Array.isArray(recursos)) return recursos;
    try {
      const parsed = JSON.parse(recursos);
      return Array.isArray(parsed) ? parsed : [recursos];
    } catch {
      return [recursos];
    }
  };

  const isTrial = statusFinanceiro === "trial" || (empresaInfo?.dias_trial_restantes !== null && empresaInfo?.dias_trial_restantes >= 0 && statusFinanceiro !== "suspenso");
  const isSuspenso = statusFinanceiro === "suspenso";

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto font-sans pb-10">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center flex-wrap gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Minhas Faturas & Assinatura</h1>

              {statusFinanceiro === "adimplente" && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Adimplente
                </span>
              )}

              {isTrial && (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Período de Teste ({empresaInfo?.dias_trial_restantes !== null ? `${Math.max(0, empresaInfo?.dias_trial_restantes)} dias restantes` : "7 dias"})
                </span>
              )}

              {statusFinanceiro === "inadimplente" && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Inadimplente
                </span>
              )}

              {isSuspenso && (
                <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  Acesso Pausado / Teste Finalizado
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Escolha seu plano de assinatura, ative o débito no cartão ou efetue pagamentos via PIX instantâneo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarVitrinePlanos(!mostrarVitrinePlanos)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#2563eb] rounded-md text-xs font-semibold border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{mostrarVitrinePlanos ? "Ocultar Planos" : "Ver Planos de Assinatura"}</span>
              {mostrarVitrinePlanos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                carregarFaturas();
                carregarPlanos();
                carregarMeuCartao();
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2563eb]" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Alertas Globais */}
        {sucessoMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {erroMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs font-medium flex items-center gap-2.5 animate-fade-in shadow-2xs">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{erroMsg}</span>
          </div>
        )}

        {/* BANNER / VITRINE DE PLANOS DE ASSINATURA */}
        {mostrarVitrinePlanos && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden space-y-6">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2563eb] via-blue-400 to-emerald-500"></div>

            {/* Cabeçalho da Vitrine */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-blue-50 text-[#2563eb] border border-blue-200 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {isSuspenso
                      ? "Seu Período de Teste Finalizou — Escolha seu Plano Oficial"
                      : isTrial
                      ? "Escolha seu Plano Definitivo"
                      : "Planos de Assinatura Disponíveis"}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
                  {isSuspenso
                    ? "Seus portais, leads e configurações continuam salvos com segurança. Contrate um dos planos abaixo via PIX ou Cartão para reativar seu sistema instantaneamente."
                    : "Escolha o plano ideal para a sua estrutura. A ativação é automática logo após a confirmação do pagamento via PIX ou cartão."}
                </p>
              </div>

              {empresaInfo?.plano_atual_nome && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-right self-start md:self-auto">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Plano Atual Vinculado</span>
                  <span className="text-xs font-bold text-slate-800">{empresaInfo.plano_atual_nome}</span>
                </div>
              )}
            </div>

            {/* Grid dos Planos */}
            {loadingPlanos ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Carregando planos oficiais...
              </div>
            ) : planos.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum plano disponível no momento. Fale com nosso suporte.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {planos.map((plano) => {
                  const isDestaque = plano.destaque === 1 || plano.nome.toLowerCase().includes("pro");
                  const isPlanoAtual = empresaInfo?.saas_plano_id === plano.id;
                  const recursosList = parseRecursos(plano.recursos);
                  const isProcessando = assinandoPlanoId === plano.id;
                  const valorNum = parseFloat(plano.valor_mensal || 0);

                  return (
                    <div
                      key={plano.id}
                      className={`relative bg-white rounded-xl border flex flex-col justify-between transition-all duration-200 ${
                        isDestaque
                          ? "border-blue-500 shadow-md ring-2 ring-blue-500/15"
                          : "border-slate-200 shadow-xs hover:border-slate-300"
                      }`}
                    >
                      {/* Badge Destaque */}
                      {isDestaque && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563eb] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Mais Popular</span>
                        </div>
                      )}

                      <div className="p-5 space-y-4">
                        {/* Header do Card */}
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-slate-900">{plano.nome}</h3>
                          {plano.descricao && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">{plano.descricao}</p>
                          )}
                        </div>

                        {/* Bloco de Preço */}
                        <div className="py-3 px-3.5 bg-slate-50 border border-slate-100 rounded-md">
                          {valorNum === 0 && plano.tipo_cobranca === "porcentagem" ? (
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-slate-900">R$ 0,00</span>
                                <span className="text-[11px] text-slate-500 font-medium">/ fixo</span>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 mt-0.5 block">
                                + {plano.comissao_porcentagem || 10}% s/ vendas Wi-Fi
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-slate-900">{formatarMoeda(valorNum)}</span>
                              <span className="text-[11px] text-slate-500 font-medium">/ mês</span>
                            </div>
                          )}
                        </div>

                        {/* Badges de Limites */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#2563eb] text-[10px] font-semibold rounded-md border border-blue-100 flex items-center gap-1">
                            <Wifi className="w-2.5 h-2.5" />
                            {plano.limite_mikrotiks > 0 ? `${plano.limite_mikrotiks} Roteador(es)` : "Roteadores Ilimitados"}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200 flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            {plano.limite_portais > 0 ? `${plano.limite_portais} Portais` : "Portais Ilimitados"}
                          </span>
                        </div>

                        {/* Lista de Recursos */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Recursos inclusos:
                          </span>
                          <ul className="space-y-1.5 text-xs text-slate-600">
                            {recursosList.map((rec, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-tight font-medium text-slate-700">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Botão de Ação */}
                      <div className="p-5 pt-0">
                        {isPlanoAtual && statusFinanceiro === "adimplente" ? (
                          <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Seu Plano Atual</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAssinarPlano(plano)}
                            disabled={isProcessando}
                            className={`w-full py-2.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                              isDestaque
                                ? "bg-[#2563eb] hover:bg-blue-700 text-white shadow-sm"
                                : "bg-slate-900 hover:bg-black text-white"
                            } disabled:opacity-50`}
                          >
                            {isProcessando ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {isProcessando
                                ? "Gerando Fatura..."
                                : isPlanoAtual
                                ? "Pagar Mensalidade ⚡"
                                : "Contratar Este Plano ⚡"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Resumo em Cards + Widget Cartão */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Total Aberto */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total em Aberto</span>
              <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-xs">
                R$
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatarMoeda(totalPendente)}</p>
            <p className="text-[11px] text-slate-400">Mensalidades pendentes de liquidação</p>
          </div>

          {/* Card 2: Histórico Pago */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Histórico Pago</span>
              <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatarMoeda(totalPago)}</p>
            <p className="text-[11px] text-slate-400">Soma de mensalidades quitadas</p>
          </div>

          {/* Card 3: Widget Cartão de Crédito Recorrente */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Débito Automático</span>
              <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 text-[#2563eb] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            {cartaoInfo ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                      {cartaoInfo.brand}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-700">•••• {cartaoInfo.last4}</span>
                  </div>
                  <button
                    onClick={handleRemoverCartao}
                    title="Remover Cartão"
                    className="text-red-500 hover:text-red-700 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Exp: {cartaoInfo.expMonth}/{cartaoInfo.expYear}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cartaoInfo.debitoAutomatico}
                      onChange={handleToggleDebito}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Auto</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Nenhum cartão cadastrado.</p>
                <button
                  onClick={() => setModalCartaoAberto(true)}
                  className="w-full py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Cadastrar Cartão
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Faturas */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Header da Tabela / Filtros */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">Histórico de Mensalidades</h2>
            <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setFiltroStatus("todos")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filtroStatus === "todos"
                    ? "bg-white text-[#2563eb] shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Todas ({faturas.length})
              </button>
              <button
                onClick={() => setFiltroStatus("pendente")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filtroStatus === "pendente"
                    ? "bg-white text-amber-600 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Pendentes ({faturas.filter((f) => f.status === "pendente" || f.status === "vencido").length})
              </button>
              <button
                onClick={() => setFiltroStatus("pago")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  filtroStatus === "pago"
                    ? "bg-white text-emerald-600 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Pagas ({faturas.filter((f) => f.status === "pago").length})
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Fatura</th>
                  <th className="px-6 py-3.5">Vencimento</th>
                  <th className="px-6 py-3.5">Valor</th>
                  <th className="px-6 py-3.5">Status / Forma</th>
                  <th className="px-6 py-3.5 text-right">Ação de Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">
                      Carregando faturas...
                    </td>
                  </tr>
                ) : faturasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200 flex items-center justify-center mx-auto text-xl">
                          🧾
                        </div>
                        <p className="text-sm font-bold text-slate-800">Nenhuma fatura pendente encontrada</p>
                        <p className="text-xs text-slate-500">
                          {isTrial
                            ? "Você está utilizando o período de testes grátis. Escolha seu plano no painel acima quando desejar efetivar a assinatura."
                            : "Todas as suas faturas estão em dia ou ainda não foram geradas."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  faturasFiltradas.map((fatura) => (
                    <tr key={fatura.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{fatura.descricao}</p>
                        <p className="text-[11px] text-slate-400">
                          {fatura.plano_nome ? `Plano: ${fatura.plano_nome}` : `Fatura #${fatura.id}`}
                        </p>
                        {fatura.cartao_mensagem_erro && (
                          <p className="text-[10px] text-red-600 mt-1 font-medium bg-red-50 p-1 rounded inline-block">
                            ⚠️ Última tentativa recusada: {fatura.cartao_mensagem_erro}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                        {formatarData(fatura.data_vencimento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 text-sm">
                        {formatarMoeda(fatura.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {fatura.status === "pago" && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-md inline-flex items-center gap-1">
                            ✓ Pago ({fatura.forma_pagamento === "credit_card" ? "💳 Cartão" : "⚡ PIX"})
                          </span>
                        )}
                        {fatura.status === "pendente" && (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded-md">
                            Aguardando Pagamento
                          </span>
                        )}
                        {fatura.status === "vencido" && (
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold rounded-md animate-pulse">
                            Vencido
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {fatura.status === "pendente" || fatura.status === "vencido" ? (
                          <div className="flex items-center justify-end gap-2">
                            {/* Botão Cartão */}
                            <button
                              onClick={() => handlePagarComCartao(fatura)}
                              disabled={pagandoCartaoId === fatura.id}
                              className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{pagandoCartaoId === fatura.id ? "Processando..." : "Pagar Cartão"}</span>
                            </button>

                            {/* Botão PIX */}
                            <button
                              onClick={() => handleGerarPix(fatura)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>PIX</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Liquidado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE CADASTRO DE CARTÃO DE CRÉDITO */}
        {modalCartaoAberto && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 space-y-5 border border-slate-200 shadow-2xl relative">
              <button
                onClick={() => setModalCartaoAberto(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-[#2563eb] rounded-md flex items-center justify-center border border-blue-200">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cadastrar Cartão de Crédito</h3>
                  <p className="text-xs text-slate-500">Tokenização segura com padrão PCI-DSS</p>
                </div>
              </div>

              <form onSubmit={handleSalvarCartao} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={formCartao.cardNumber}
                    onChange={(e) => setFormCartao({ ...formCartao, cardNumber: e.target.value })}
                    className="w-full text-sm rounded-md p-2.5 bg-slate-50 border border-slate-300 font-mono text-slate-900 font-bold tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Impresso no Cartão</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: JOAO M SILVA"
                    value={formCartao.cardholderName}
                    onChange={(e) => setFormCartao({ ...formCartao, cardholderName: e.target.value.toUpperCase() })}
                    className="w-full text-sm rounded-md p-2.5 bg-slate-50 border border-slate-300 text-slate-900 uppercase font-medium"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mês (MM)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      required
                      placeholder="12"
                      value={formCartao.cardExpirationMonth}
                      onChange={(e) => setFormCartao({ ...formCartao, cardExpirationMonth: e.target.value })}
                      className="w-full text-sm rounded-md p-2.5 bg-slate-50 border border-slate-300 font-mono text-center text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ano (AA)</label>
                    <input
                      type="number"
                      min={24}
                      max={45}
                      required
                      placeholder="28"
                      value={formCartao.cardExpirationYear}
                      onChange={(e) => setFormCartao({ ...formCartao, cardExpirationYear: e.target.value })}
                      className="w-full text-sm rounded-md p-2.5 bg-slate-50 border border-slate-300 font-mono text-center text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="123"
                      value={formCartao.securityCode}
                      onChange={(e) => setFormCartao({ ...formCartao, securityCode: e.target.value })}
                      className="w-full text-sm rounded-md p-2.5 bg-slate-50 border border-slate-300 font-mono text-center text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF ou CNPJ do Titular</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={formCartao.docNumber}
                    onChange={(e) => setFormCartao({ ...formCartao, docNumber: e.target.value })}
                    className="w-full text-sm rounded-md p-2.5 bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">Débito Automático Mensal</p>
                    <p className="text-[10px] text-slate-500">Cobrar automaticamente no vencimento</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formCartao.debitoAutomatico}
                    onChange={(e) => setFormCartao({ ...formCartao, debitoAutomatico: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={salvandoCartao}
                  className="w-full py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {salvandoCartao ? "Tokenizando Cartão..." : "Salvar Cartão com Segurança"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE PAGAMENTO PIX */}
        {modalPix && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 space-y-4 border border-slate-200 shadow-2xl relative text-center">
              <button
                onClick={() => setModalPix(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center mx-auto border border-emerald-200">
                <Zap className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900">Pagamento via PIX Instantâneo</h3>
              <p className="text-xs text-slate-500">
                {modalPix.fatura?.descricao ? `${modalPix.fatura.descricao} — ` : ""}
                <span className="font-bold text-slate-900">{formatarMoeda(modalPix.fatura?.valor)}</span>
              </p>

              {modalPix.carregando ? (
                <div className="py-10 text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Gerando QR Code PIX...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {modalPix.pix_qr_code && (
                    <img
                      src={modalPix.pix_qr_code.startsWith("data:") ? modalPix.pix_qr_code : `data:image/png;base64,${modalPix.pix_qr_code}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto rounded-md border border-slate-200 p-2 shadow-2xs bg-white"
                    />
                  )}

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-left space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">PIX Copia e Cola:</p>
                    <p className="text-xs font-mono text-slate-700 break-all select-all">
                      {modalPix.pix_copia_cola || "Código não disponível"}
                    </p>
                  </div>

                  <button
                    onClick={handleCopiarPix}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiado ? "✓ Código Copiado!" : "Copiar Chave PIX"}
                  </button>

                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-md text-left space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#2563eb] text-xs font-bold">
                      <ShieldCheck className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
                      <span>Liberação Automática pelo Sistema</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Seu acesso, roteadores e portais Wi-Fi serão <strong>desbloqueados automaticamente em poucos segundos</strong> assim que a transferência for confirmada pelo seu banco. Não é necessário enviar comprovante manual.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Aguardando confirmação bancária em tempo real...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
