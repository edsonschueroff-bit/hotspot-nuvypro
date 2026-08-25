import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal, StatusBadge } from "@/components/ui";
import {
  Trophy,
  Plus,
  Trash2,
  Edit3,
  Users,
  Gift,
  MessageSquare,
  Flame,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink
} from "lucide-react";

class FidelidadeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <AdminLayout>
          <div className="p-8 bg-red-50 border border-red-200 text-red-700 rounded-[10px] shadow-sm max-w-4xl mx-auto my-8">
            <h1 className="text-lg font-bold mb-2">Erro ao renderizar o Programa de Fidelidade</h1>
            <p className="text-xs font-mono mb-4 bg-white p-3 rounded-lg border border-red-100 whitespace-pre-wrap">
              {this.state.error.toString()}
            </p>
            <PrimaryButton onClick={() => window.location.reload()}>Recarregar Página</PrimaryButton>
          </div>
        </AdminLayout>
      );
    }
    return this.props.children;
  }
}

function FidelidadeContent() {
  const { empresaSlug } = useParams();
  const [aba, setAba] = useState("regras"); // "regras" | "ranking" | "historico"
  const [regras, setRegras] = useState([]);
  const [cupons, setCupons] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Regra
  const [showRegraModal, setShowRegraModal] = useState(false);
  const [editRegraId, setEditRegraId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [regraForm, setRegraForm] = useState({
    titulo: "",
    visitas_necessarias: 5,
    tipo_recompensa: "cupom_desconto",
    cupom_id: "",
    descricao_recompensa: "",
    mensagem_whatsapp: "Parabéns {nome}! 🏆 Você completou {visitas} visitas ao nosso estabelecimento e ganhou {recompensa}! Utilize o código: *{cupom}* no caixa.",
    ativo: true
  });

  const token = localStorage.getItem("admin_token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  useEffect(() => {
    carregarDados();
  }, [empresaSlug]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resRegras, resRanking, resCupons] = await Promise.all([
        fetch("/api/fidelidade/regras", { headers }),
        fetch("/api/fidelidade/ranking", { headers }),
        fetch("/api/cupons", { headers })
      ]);

      if (resRegras.ok) {
        const data = await resRegras.json();
        setRegras(Array.isArray(data) ? data : []);
      } else {
        setRegras([]);
      }

      if (resRanking.ok) {
        const rankData = await resRanking.json();
        setRanking(Array.isArray(rankData?.ranking) ? rankData.ranking : []);
        setHistorico(Array.isArray(rankData?.historico) ? rankData.historico : []);
      } else {
        setRanking([]);
        setHistorico([]);
      }

      if (resCupons.ok) {
        const cpData = await resCupons.json();
        setCupons(Array.isArray(cpData?.data) ? cpData.data : []);
      } else {
        setCupons([]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de fidelidade:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegraModal = (regra = null) => {
    if (regra) {
      setEditRegraId(regra.id);
      setRegraForm({
        titulo: regra.titulo || "",
        visitas_necessarias: regra.visitas_necessarias || 5,
        tipo_recompensa: regra.tipo_recompensa || "cupom_desconto",
        cupom_id: regra.cupom_id || "",
        descricao_recompensa: regra.descricao_recompensa || "",
        mensagem_whatsapp: regra.mensagem_whatsapp || "",
        ativo: !!regra.ativo
      });
    } else {
      setEditRegraId(null);
      setRegraForm({
        titulo: "",
        visitas_necessarias: 5,
        tipo_recompensa: "cupom_desconto",
        cupom_id: cupons[0]?.id || "",
        descricao_recompensa: "10% de Desconto no Próximo Pedido",
        mensagem_whatsapp: "Parabéns {nome}! 🏆 Você completou {visitas} visitas ao nosso estabelecimento e ganhou {recompensa}! Utilize o código: *{cupom}* no caixa.",
        ativo: true
      });
    }
    setShowRegraModal(true);
  };

  const handleSalvarRegra = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const url = editRegraId ? `/api/fidelidade/regras/${editRegraId}` : "/api/fidelidade/regras";
      const method = editRegraId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(regraForm) });
      if (res.ok) {
        setShowRegraModal(false);
        carregarDados();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "Erro ao salvar regra.");
      }
    } catch (err) {
      alert("Erro de conexão ao salvar regra.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletarRegra = async (id) => {
    if (!window.confirm("Deseja excluir esta regra de premiação?")) return;
    try {
      const res = await fetch(`/api/fidelidade/regras/${id}`, { method: "DELETE", headers });
      if (res.ok) carregarDados();
    } catch (err) {
      alert("Erro ao deletar regra.");
    }
  };

  const totalPremiosEntregues = (historico || []).length;
  const regrasAtivasCount = (regras || []).filter(r => r.ativo).length;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={<Trophy className="w-6 h-6 text-white" />}
          title="Programa de Fidelidade & Gamificação"
          subtitle="Recompense clientes frequentes de forma 100% automática com cupons e brindes via WhatsApp"
          actions={
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={carregarDados} className="px-3 py-2 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </SecondaryButton>
              <PrimaryButton onClick={() => handleOpenRegraModal()}>
                <Plus className="w-4 h-4 mr-1.5" />
                Nova Regra de Premiação
              </PrimaryButton>
            </div>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Regras de Premiação Ativas</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{regrasAtivasCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Prêmios Concedidos</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalPremiosEntregues}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Clientes no Ranking</p>
                <h3 className="text-2xl font-black text-slate-700 mt-1">{(ranking || []).length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Abas */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-fit">
          <button
            onClick={() => setAba("regras")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${aba === "regras" ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            ⚙️ Regras de Premiação ({(regras || []).length})
          </button>
          <button
            onClick={() => setAba("ranking")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${aba === "ranking" ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            👑 Top Visitantes Mais Fiéis ({(ranking || []).length})
          </button>
          <button
            onClick={() => setAba("historico")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${aba === "historico" ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            📋 Histórico de Recompensas ({(historico || []).length})
          </button>
        </div>

        {/* Aba REGRAS */}
        {aba === "regras" && (
          <Card>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" />
                  <span>Carregando regras...</span>
                </div>
              ) : (regras || []).length === 0 ? (
                <div className="p-12 text-center">
                  <Trophy className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Nenhuma regra de premiação configurada</h4>
                  <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                    Crie metas de frequência como: &quot;A cada 5 visitas, envie um cupom de 20% OFF no WhatsApp do visitante&quot;.
                  </p>
                  <PrimaryButton onClick={() => handleOpenRegraModal()}>Criar Primeira Regra</PrimaryButton>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Meta / Título</th>
                        <th className="py-3 px-4 text-center">Visitas Necessárias</th>
                        <th className="py-3 px-4">Recompensa Entregue</th>
                        <th className="py-3 px-4 text-center">Total Entregues</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {regras.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span>{r.titulo}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] font-bold text-xs border border-blue-200">
                              {r.visitas_necessarias} visitas
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {r.descricao_recompensa}
                            {r.cupom_prefixo && <span className="text-[10px] text-slate-400 block font-normal font-mono">Cupom: {r.cupom_prefixo}-XXXX</span>}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{r.total_recompensas_entregues || 0}</td>
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={r.ativo ? "ativo" : "inativo"} text={r.ativo ? "Ativa" : "Desativada"} />
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <SecondaryButton variant="subtle" className="px-2 py-1 text-xs" onClick={() => handleOpenRegraModal(r)}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </SecondaryButton>
                            <SecondaryButton variant="ghost" className="px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => handleDeletarRegra(r.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </SecondaryButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Aba RANKING */}
        {aba === "ranking" && (
          <Card>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" />
                  <span>Carregando ranking...</span>
                </div>
              ) : (ranking || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Nenhum dado de conexões frequentes registrado ainda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 text-center">Posição</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">WhatsApp / Celular</th>
                        <th className="py-3 px-4 text-center">Visitas Registradas</th>
                        <th className="py-3 px-4">Última Visita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {ranking.map((cli, idx) => (
                        <tr key={cli.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold">
                            {idx === 0 ? "🥇 1º" : idx === 1 ? "🥈 2º" : idx === 2 ? "🥉 3º" : `#${idx + 1}`}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{cli.nome || "Cliente Wi-Fi"}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {cli.telefone ? (
                              <a
                                href={`https://wa.me/55${cli.telefone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                              >
                                {cli.telefone}
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            ) : (
                              "Não informado"
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                              🔥 {cli.total_visitas} visitas
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {cli.ultima_visita ? new Date(cli.ultima_visita).toLocaleDateString("pt-BR") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Aba HISTÓRICO */}
        {aba === "historico" && (
          <Card>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" />
                  <span>Carregando histórico...</span>
                </div>
              ) : (historico || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Nenhuma recompensa concedida ainda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">WhatsApp</th>
                        <th className="py-3 px-4">Recompensa Entregue</th>
                        <th className="py-3 px-4 font-mono">Cupom Gerado</th>
                        <th className="py-3 px-4">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {historico.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{h.cliente_nome || "Cliente"}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{h.cliente_telefone}</td>
                          <td className="py-3.5 px-4 text-emerald-700 font-semibold">{h.recompensa_concedida}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{h.cupom_gerado_codigo || "-"}</td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(h.criado_em).toLocaleDateString("pt-BR")} às {new Date(h.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modal Criar / Editar Regra */}
      <Modal
        isOpen={showRegraModal}
        onClose={() => setShowRegraModal(false)}
        title={editRegraId ? "Editar Regra de Premiação" : "Nova Regra de Premiação por Visitas"}
      >
        <form onSubmit={handleSalvarRegra} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Título da Regra</label>
            <input
              type="text"
              required
              placeholder="Ex: 5ª Visita = Sobremesa Cortesia"
              value={regraForm.titulo}
              onChange={(e) => setRegraForm({ ...regraForm, titulo: e.target.value })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Visitas Necessárias</label>
              <input
                type="number"
                min={2}
                max={100}
                required
                value={regraForm.visitas_necessarias}
                onChange={(e) => setRegraForm({ ...regraForm, visitas_necessarias: Number(e.target.value) })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cupom de Desconto Vinculado</label>
              <select
                value={regraForm.cupom_id}
                onChange={(e) => setRegraForm({ ...regraForm, cupom_id: e.target.value })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-medium"
              >
                <option value="">Nenhum (Brinde Físico / Outro)</option>
                {cupons.map((c) => (
                  <option key={c.id} value={c.id}>{c.titulo} ({c.codigo_prefixo})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição Curta da Recompensa</label>
            <input
              type="text"
              required
              placeholder="Ex: 1 Café Expresso Grátis no Balcão"
              value={regraForm.descricao_recompensa}
              onChange={(e) => setRegraForm({ ...regraForm, descricao_recompensa: e.target.value })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mensagem de Parabéns no WhatsApp</label>
            <textarea
              rows={3}
              value={regraForm.mensagem_whatsapp}
              onChange={(e) => setRegraForm({ ...regraForm, mensagem_whatsapp: e.target.value })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono text-[11px]"
            />
            <p className="text-[10px] text-slate-400 mt-1">Tags disponíveis: <span className="font-bold">{`{nome}`}</span>, <span className="font-bold">{`{visitas}`}</span>, <span className="font-bold">{`{recompensa}`}</span>, <span className="font-bold">{`{cupom}`}</span></p>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={regraForm.ativo}
                onChange={(e) => setRegraForm({ ...regraForm, ativo: e.target.checked })}
                className="rounded text-blue-600"
              />
              Regra Ativa no Sistema
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
            <SecondaryButton onClick={() => setShowRegraModal(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" loading={salvando}>Salvar Regra de Fidelidade</PrimaryButton>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

export default function Fidelidade() {
  return (
    <FidelidadeErrorBoundary>
      <FidelidadeContent />
    </FidelidadeErrorBoundary>
  );
}
