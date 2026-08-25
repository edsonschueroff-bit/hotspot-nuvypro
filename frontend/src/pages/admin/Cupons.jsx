import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";

export default function Cupons() {
  const { user } = useAuth();
  const token = localStorage.getItem("admin_token");

  const [aba, setAba] = useState("ofertas"); // 'ofertas', 'validador', 'historico'
  const [loading, setLoading] = useState(true);

  // Cupons & Métricas
  const [cupons, setCupons] = useState([]);
  const [metricas, setMetricas] = useState({
    total_cupons_criados: 0,
    total_cupons_ativos: 0,
    total_gerados: 0,
    total_utilizados: 0,
    taxa_conversao: 0
  });

  // Modal Criar/Editar
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    codigo_prefixo: "PROMO",
    tipo_desconto: "porcentagem",
    valor: 10,
    regras: "",
    validade_dias: 7,
    max_resgates_total: 0,
    ativo: 1
  });

  // Validador de Caixa
  const [codigoBusca, setCodigoBusca] = useState("");
  const [validando, setValidando] = useState(false);
  const [resultadoValidacao, setResultadoValidacao] = useState(null);

  // Histórico
  const [resgates, setResgates] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [totalResgates, setTotalResgates] = useState(0);

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line
  }, [user?.empresa_slug]);

  const carregarTudo = async () => {
    setLoading(true);
    await Promise.all([carregarCupons(), carregarMetricas(), carregarResgates()]);
    setLoading(false);
  };

  const carregarCupons = async () => {
    try {
      const res = await fetch("/api/cupons", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setCupons(json.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const carregarMetricas = async () => {
    try {
      const res = await fetch("/api/cupons/metricas", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setMetricas(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const carregarResgates = async () => {
    try {
      const url = `/api/cupons/resgates?status=${filtroStatus}&q=${encodeURIComponent(buscaTexto)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setResgates(json.data || []);
        setTotalResgates(json.total || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSalvarCupom = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return alert("Informe o título da promoção");

    setSalvando(true);
    try {
      const url = editandoId ? `/api/cupons/${editandoId}` : "/api/cupons";
      const method = editandoId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Erro ao salvar");

      setShowModal(false);
      setEditandoId(null);
      setForm({
        titulo: "",
        descricao: "",
        codigo_prefixo: "PROMO",
        tipo_desconto: "porcentagem",
        valor: 10,
        regras: "",
        validade_dias: 7,
        max_resgates_total: 0,
        ativo: 1
      });

      carregarCupons();
      carregarMetricas();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (c) => {
    setEditandoId(c.id);
    setForm({
      titulo: c.titulo,
      descricao: c.descricao || "",
      codigo_prefixo: c.codigo_prefixo || "PROMO",
      tipo_desconto: c.tipo_desconto,
      valor: c.valor,
      regras: c.regras || "",
      validade_dias: c.validade_dias,
      max_resgates_total: c.max_resgates_total,
      ativo: c.ativo
    });
    setShowModal(true);
  };

  const handleExcluir = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;
    try {
      const res = await fetch(`/api/cupons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        carregarCupons();
        carregarMetricas();
      }
    } catch (err) {
      alert("Erro ao excluir cupom");
    }
  };

  // Validador de Balcão
  const handleConsultarCodigo = async (e) => {
    if (e) e.preventDefault();
    if (!codigoBusca.trim()) return;

    setValidando(true);
    setResultadoValidacao(null);
    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codigo: codigoBusca, dar_baixa: false })
      });
      const json = await res.json();
      setResultadoValidacao(json);
    } catch (err) {
      setResultadoValidacao({ success: false, message: "Erro ao consultar cupom" });
    } finally {
      setValidando(false);
    }
  };

  const handleDarBaixa = async () => {
    if (!codigoBusca.trim()) return;
    setValidando(true);
    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codigo: codigoBusca, dar_baixa: true })
      });
      const json = await res.json();
      setResultadoValidacao(json);
      carregarMetricas();
      carregarResgates();
    } catch (err) {
      alert("Erro ao dar baixa");
    } finally {
      setValidando(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-600 text-slate-900 tracking-tight">Fidelização & Cupons de Desconto</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Crie ofertas exclusivas para os visitantes do Wi-Fi e valide no balcão</p>
          </div>
          <button
            onClick={() => {
              setEditandoId(null);
              setForm({
                titulo: "",
                descricao: "",
                codigo_prefixo: "PROMO",
                tipo_desconto: "porcentagem",
                valor: 10,
                regras: "",
                validade_dias: 7,
                max_resgates_total: 0,
                ativo: 1
              });
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-600 px-4 py-2 rounded-md text-[13px] shadow-sm transition-colors cursor-pointer"
          >
            <span>+ Nova Promoção</span>
          </button>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#10b981]" />
            <p className="text-[10px] font-600 text-slate-400 uppercase tracking-wider">Cupons Ativos</p>
            <p className="text-[28px] font-700 text-slate-900 leading-none mt-2">{metricas.total_cupons_ativos}</p>
            <p className="text-[12px] text-slate-500 mt-2">De {metricas.total_cupons_criados} criados</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#2563eb]" />
            <p className="text-[10px] font-600 text-slate-400 uppercase tracking-wider">Gerados no Wi-Fi</p>
            <p className="text-[28px] font-700 text-[#2563eb] leading-none mt-2">{metricas.total_gerados}</p>
            <p className="text-[12px] text-slate-500 mt-2">Entregues aos clientes</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#16a34a]" />
            <p className="text-[10px] font-600 text-slate-400 uppercase tracking-wider">Resgatados no Balcão</p>
            <p className="text-[28px] font-700 text-[#16a34a] leading-none mt-2">{metricas.total_utilizados}</p>
            <p className="text-[12px] text-slate-500 mt-2">Vendas convertidas</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-slate-300" />
            <p className="text-[10px] font-600 text-slate-400 uppercase tracking-wider">Taxa de Conversão</p>
            <p className="text-[28px] font-700 text-slate-800 leading-none mt-2">{metricas.taxa_conversao}%</p>
            <p className="text-[12px] text-slate-500 mt-2">Conversão de visitantes</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0] gap-1 w-fit">
          <button
            onClick={() => setAba("ofertas")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${
              aba === "ofertas" ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            🏷️ Ofertas & Promoções ({cupons.length})
          </button>
          <button
            onClick={() => setAba("validador")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${
              aba === "validador" ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            ⚡ Validador de Balcão (Caixa)
          </button>
          <button
            onClick={() => {
              setAba("historico");
              carregarResgates();
            }}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${
              aba === "historico" ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            📋 Histórico de Resgates ({totalResgates})
          </button>
        </div>

        {/* ── ABA 1: OFERTAS & PROMOÇÕES ── */}
        {aba === "ofertas" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : cupons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cupons.map((c) => (
                  <div
                    key={c.id}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                      c.ativo ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          c.tipo_desconto === "porcentagem"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.tipo_desconto === "valor_fixo"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-[#f8fafc] text-slate-700 border border-[#e2e8f0]"
                        }`}>
                          {c.tipo_desconto === "porcentagem" && `${c.valor}% OFF`}
                          {c.tipo_desconto === "valor_fixo" && `R$ ${parseFloat(c.valor).toFixed(2)} OFF`}
                          {c.tipo_desconto === "brinde" && "Cortesia / Brinde"}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          c.ativo ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{c.titulo}</h3>
                      {c.descricao && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.descricao}</p>}

                      <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Prefixo do Código:</span>
                          <span className="font-mono font-bold text-slate-800">{c.codigo_prefixo}-XXXX</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Validade do Voucher:</span>
                          <span className="font-semibold text-slate-800">{c.validade_dias} dias</span>
                        </div>
                        {c.regras && (
                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                            <strong>Regras:</strong> {c.regras}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 py-2 border-t border-[#e2e8f0]">
                        <span>{c.total_resgates || 0} gerados</span>
                        <span className="text-emerald-600">{c.total_utilizados || 0} utilizados</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleEditar(c)}
                          className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleExcluir(c.id)}
                          className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                <div className="text-4xl mb-3">🎁</div>
                <h3 className="text-base font-bold text-slate-800">Nenhum cupom cadastrado</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Crie sua primeira oferta para engajar os clientes do seu Wi-Fi com descontos ou brindes.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#2563eb] text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  + Criar Promoção
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ABA 2: VALIDADOR DE BALCÃO ── */}
        {aba === "validador" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Validação Rápida no Caixa</h2>
              <p className="text-xs text-slate-500 mb-5">Digite o código do voucher apresentado pelo cliente para checar ou dar baixa</p>

              <form onSubmit={handleConsultarCodigo} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Ex: PROMO-9A4B ou CAFE-8X92"
                  value={codigoBusca}
                  onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 font-mono text-base uppercase font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={validando || !codigoBusca.trim()}
                  className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-md transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 text-sm"
                >
                  {validando ? "Consultando..." : "Consultar"}
                </button>
              </form>
            </div>

            {resultadoValidacao && (
              <div className="bg-white border border-slate-200 rounded-[10px] p-6 shadow-md animate-fade-in">
                {resultadoValidacao.status === "valido" && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <h4 className="text-base font-bold text-emerald-900">Cupom Válido!</h4>
                          <p className="text-xs text-emerald-700">Pronto para ser resgatado</p>
                        </div>
                      </div>
                      <span className="font-mono text-lg font-black text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-300">
                        {resultadoValidacao.dados.codigo_unico}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs text-slate-400 block uppercase">Oferta</span>
                        <strong className="text-slate-900">{resultadoValidacao.dados.titulo}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block uppercase">Desconto</span>
                        <strong className="text-blue-600">
                          {resultadoValidacao.dados.tipo_desconto === "porcentagem" && `${resultadoValidacao.dados.valor}% OFF`}
                          {resultadoValidacao.dados.tipo_desconto === "valor_fixo" && `R$ ${parseFloat(resultadoValidacao.dados.valor).toFixed(2)} OFF`}
                          {resultadoValidacao.dados.tipo_desconto === "brinde" && "Brinde / Cortesia"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block uppercase">Cliente</span>
                        <span className="text-slate-800">{resultadoValidacao.dados.cliente_nome || "Visitante Wi-Fi"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block uppercase">Validade até</span>
                        <span className="text-slate-800">
                          {new Date(resultadoValidacao.dados.expira_em).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {resultadoValidacao.dados.regras && (
                      <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <strong>Atenção às regras:</strong> {resultadoValidacao.dados.regras}
                      </p>
                    )}

                    <button
                      onClick={handleDarBaixa}
                      disabled={validando}
                      className="w-full py-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg transition-all active:scale-[0.99]"
                    >
                      {validando ? "Registrando Baixa..." : "✓ Confirmar Utilização e Aplicar Desconto"}
                    </button>
                  </div>
                )}

                {resultadoValidacao.status === "utilizado_com_sucesso" && (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
                      🎉
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Cupom Utilizado com Sucesso!</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      O desconto de <strong>{resultadoValidacao.dados.titulo}</strong> foi registrado e baixado do sistema.
                    </p>
                    <button
                      onClick={() => {
                        setCodigoBusca("");
                        setResultadoValidacao(null);
                      }}
                      className="mt-4 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Validar Outro Cupom
                    </button>
                  </div>
                )}

                {(resultadoValidacao.status === "ja_utilizado" || resultadoValidacao.status === "expirado" || resultadoValidacao.status === "invalido") && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="text-sm font-bold">Cupom Inválido</h4>
                      <p className="text-xs mt-0.5">{resultadoValidacao.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ABA 3: HISTÓRICO DE RESGATES ── */}
        {aba === "historico" && (
          <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="text"
                placeholder="Buscar por código, cliente ou telefone..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && carregarResgates()}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 w-full sm:w-72"
              />
              <select
                value={filtroStatus}
                onChange={(e) => {
                  setFiltroStatus(e.target.value);
                  setTimeout(carregarResgates, 50);
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50"
              >
                <option value="todos">Todos os Status</option>
                <option value="disponivel">Disponíveis</option>
                <option value="utilizado">Utilizados no Caixa</option>
                <option value="expirado">Expirados</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-400 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Data Geração</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Oferta / Desconto</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data Utilização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {resgates.length > 0 ? (
                    resgates.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(r.resgatado_em).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {r.codigo_unico}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{r.cupom_titulo}</span>
                          <span className="ml-1.5 text-blue-600 font-bold">
                            ({r.tipo_desconto === "porcentagem" ? `${r.cupom_valor}%` : `R$ ${r.cupom_valor}`})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.cliente_nome || "Visitante Wi-Fi"}
                          {r.cliente_telefone && <span className="block text-[10px] text-slate-400">{r.cliente_telefone}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            r.status === "utilizado" ? "bg-emerald-100 text-emerald-800" :
                            r.status === "disponivel" ? "bg-blue-100 text-blue-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {r.status === "utilizado" ? "✓ Utilizado" : r.status === "disponivel" ? "Disponível" : "Expirado"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                          {r.utilizado_em ? new Date(r.utilizado_em).toLocaleString('pt-BR') : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MODAL CRIAR / EDITAR CUPOM ── */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[10px] border border-slate-200 p-6 max-w-lg w-full shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0]">
                <h3 className="text-lg font-bold text-slate-900">
                  {editandoId ? "Editar Promoção" : "Nova Oferta de Fidelização"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSalvarCupom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título da Oferta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 10% de Desconto no Almoço"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Desconto</label>
                    <select
                      value={form.tipo_desconto}
                      onChange={(e) => setForm({ ...form, tipo_desconto: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 bg-white"
                    >
                      <option value="porcentagem">Porcentagem (%)</option>
                      <option value="valor_fixo">Valor Fixo (R$)</option>
                      <option value="brinde">Brinde / Cortesia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      {form.tipo_desconto === "porcentagem" ? "Valor (%)" : form.tipo_desconto === "valor_fixo" ? "Valor (R$)" : "Valor Simbólico"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.valor}
                      onChange={(e) => setForm({ ...form, valor: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prefixo do Código</label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="Ex: CAFE ou PROMO"
                      value={form.codigo_prefixo}
                      onChange={(e) => setForm({ ...form, codigo_prefixo: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Validade do Voucher</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={form.validade_dias}
                      onChange={(e) => setForm({ ...form, validade_dias: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800"
                      placeholder="Dias (ex: 7)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Regras / Condições de Uso</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Válido de segunda a sexta para consumo no local."
                    value={form.regras}
                    onChange={(e) => setForm({ ...form, regras: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.ativo === 1}
                      onChange={(e) => setForm({ ...form, ativo: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Promoção Ativa</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvando}
                      className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-md shadow-sm"
                    >
                      {salvando ? "Salvando..." : "Salvar Promoção"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
