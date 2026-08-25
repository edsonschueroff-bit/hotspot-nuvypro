import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  PrimaryButton,
  SecondaryButton,
  Modal,
  StatusBadge
} from "../../components/ui";

const EVENTOS_DISPONIVEIS = [
  {
    id: "lead.connected",
    nome: "Visitante Conectou (lead.connected)",
    desc: "Disparado toda vez que um visitante autentica e navega no Wi-Fi",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    id: "lead.created",
    nome: "Novo Cadastro de Lead (lead.created)",
    desc: "Disparado quando um novo visitante preenche o formulário do portal",
    badge: "bg-blue-50 text-blue-700 border-blue-200"
  },
  {
    id: "cupom.redeemed",
    nome: "Cupom Resgatado no Caixa (cupom.redeemed)",
    desc: "Disparado quando o lojista valida e dá baixa em um cupom no balcão",
    badge: "bg-amber-50 text-amber-700 border-amber-200"
  },
  {
    id: "payment.approved",
    nome: "Pagamento de Ficha PIX (payment.approved)",
    desc: "Disparado quando a compra de um pacote/voucher Wi-Fi é confirmada",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200"
  }
];

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // Form State
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [eventos, setEventos] = useState(["lead.connected", "lead.created"]);
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  // Teste de Ping
  const [testandoId, setTestandoId] = useState(null);
  const [resultadoTeste, setResultadoTeste] = useState(null);

  // Modal Logs
  const [logsModalAberto, setLogsModalAberto] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);
  const [webhookSelecionado, setWebhookSelecionado] = useState(null);
  const [logExpandido, setLogExpandido] = useState(null);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/webhooks-outbound", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar webhooks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const abrirModalNovo = () => {
    setEditandoId(null);
    setNome("");
    setUrl("");
    setSecret("");
    setEventos(["lead.connected", "lead.created"]);
    setAtivo(true);
    setErroForm("");
    setResultadoTeste(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (wh) => {
    setEditandoId(wh.id);
    setNome(wh.nome);
    setUrl(wh.url);
    setSecret(wh.secret || "");
    try {
      const evs = typeof wh.eventos === "string" ? JSON.parse(wh.eventos) : wh.eventos;
      setEventos(Array.isArray(evs) ? evs : []);
    } catch (e) {
      setEventos([]);
    }
    setAtivo(!!wh.ativo);
    setErroForm("");
    setResultadoTeste(null);
    setModalAberto(true);
  };

  const toggleEvento = (evId) => {
    if (eventos.includes(evId)) {
      setEventos(eventos.filter((e) => e !== evId));
    } else {
      setEventos([...eventos, evId]);
    }
  };

  const gerarSecretAleatorio = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setSecret(`whsec_${randomHex}`);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setErroForm("");

    if (!nome.trim()) {
      setErroForm("O nome da integração é obrigatório.");
      return;
    }

    if (!url.trim() || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      setErroForm("Informe uma URL válida iniciando com http:// ou https://");
      return;
    }

    if (eventos.length === 0) {
      setErroForm("Selecione ao menos um evento para o webhook.");
      return;
    }

    try {
      setSalvando(true);
      const endpoint = editandoId
        ? `/api/webhooks-outbound/${editandoId}`
        : "/api/webhooks-outbound";
      const method = editandoId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          nome,
          url,
          secret,
          eventos,
          ativo
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setModalAberto(false);
        fetchWebhooks();
      } else {
        setErroForm(data.message || "Erro ao salvar webhook.");
      }
    } catch (err) {
      setErroForm("Erro de conexão ao salvar webhook.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id, nomeWh) => {
    if (!window.confirm(`Deseja realmente remover o webhook "${nomeWh}"?`)) return;

    try {
      const res = await fetch(`/api/webhooks-outbound/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchWebhooks();
      } else {
        alert(data.message || "Erro ao excluir webhook.");
      }
    } catch (err) {
      alert("Erro ao excluir webhook.");
    }
  };

  const handleTestarPing = async (wh) => {
    try {
      setTestandoId(wh.id);
      const res = await fetch(`/api/webhooks-outbound/${wh.id}/testar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      setResultadoTeste({
        webhookId: wh.id,
        sucesso: data.success && data.resultado?.sucesso === 1,
        statusCode: data.resultado?.statusCode,
        mensagem: data.message
      });
      fetchWebhooks();
    } catch (err) {
      setResultadoTeste({
        webhookId: wh.id,
        sucesso: false,
        statusCode: 500,
        mensagem: "Erro ao testar envio: conexão falhou."
      });
    } finally {
      setTestandoId(null);
    }
  };

  const abrirLogs = async (wh) => {
    setWebhookSelecionado(wh);
    setLogsModalAberto(true);
    setCarregandoLogs(true);
    setLogExpandido(null);

    try {
      const res = await fetch(`/api/webhooks-outbound/${wh.id}/logs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setWebhookLogs(data.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar logs:", err);
    } finally {
      setCarregandoLogs(false);
    }
  };

  // Métricas Totais
  const totalWebhooks = webhooks.length;
  const totalDisparos = webhooks.reduce((acc, wh) => acc + parseInt(wh.total_disparos || 0, 10), 0);
  const totalSucessos = webhooks.reduce((acc, wh) => acc + parseInt(wh.total_sucesso || 0, 10), 0);
  const taxaSucesso = totalDisparos > 0 ? Math.round((totalSucessos / totalDisparos) * 100) : 100;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Webhooks & Integrações Outbound"
          subtitle="Envie leads conectados e eventos em tempo real para ActiveCampaign, RD Station, Zapier, Make ou n8n"
          action={
            <PrimaryButton onClick={abrirModalNovo}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                + Novo Webhook
              </span>
            </PrimaryButton>
          }
        />

        {/* KPIs de Desempenho */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Endpoints Ativos</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalWebhooks}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total de Disparos</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalDisparos}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Taxa de Sucesso</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{taxaSucesso}%</p>
            </div>
          </div>
        </div>

        {/* Feedback de Teste Rápido */}
        {resultadoTeste && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium ${
              resultadoTeste.sucesso
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{resultadoTeste.sucesso ? "✅" : "⚠️"}</span>
              <span>{resultadoTeste.mensagem}</span>
            </div>
            <button
              onClick={() => setResultadoTeste(null)}
              className="text-xs font-bold px-2 py-1 bg-white/60 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Lista de Webhooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-sm font-bold text-slate-800">Endpoints de Webhook Cadastrados</h3>
              <span className="text-xs text-slate-500">{webhooks.length} cadastrados</span>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Carregando integrações...</div>
            ) : webhooks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-slate-700">Nenhum webhook cadastrado ainda</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Cadastre uma URL de destino para enviar automaticamente os dados dos leads para seu CRM ou sistema de automação.
                </p>
                <div className="pt-2">
                  <PrimaryButton onClick={abrirModalNovo}>+ Cadastrar Primeiro Webhook</PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#f1f5f9]">
                {webhooks.map((wh) => {
                  let evs = [];
                  try {
                    evs = typeof wh.eventos === "string" ? JSON.parse(wh.eventos) : wh.eventos;
                  } catch (e) {
                    evs = [];
                  }

                  return (
                    <div key={wh.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{wh.nome}</h4>
                          <StatusBadge status={wh.ativo ? "ativo" : "inativo"} />
                          {wh.secret && (
                            <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              🔒 HMAC SHA-256
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/80 max-w-2xl break-all">
                          <span className="font-bold text-blue-600">POST</span>
                          <span className="truncate">{wh.url}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {Array.isArray(evs) &&
                            evs.map((evKey) => {
                              const meta = EVENTOS_DISPONIVEIS.find((e) => e.id === evKey);
                              return (
                                <span
                                  key={evKey}
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                    meta?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {evKey}
                                </span>
                              );
                            })}
                        </div>
                      </div>

                      {/* Métricas e Botões de Ação */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                        <div className="text-right mr-3 hidden lg:block">
                          <p className="text-xs font-bold text-slate-700">{wh.total_disparos || 0} disparos</p>
                          <p className="text-[11px] text-slate-400">
                            {wh.ultimo_disparo
                              ? `Último: ${new Date(wh.ultimo_disparo).toLocaleDateString("pt-BR")}`
                              : "Nunca disparado"}
                          </p>
                        </div>

                        <button
                          onClick={() => handleTestarPing(wh)}
                          disabled={testandoId === wh.id}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border border-slate-200"
                          title="Enviar disparo simulado de teste"
                        >
                          {testandoId === wh.id ? "Testando..." : "🧪 Testar"}
                        </button>

                        <button
                          onClick={() => abrirLogs(wh)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
                          title="Ver histórico de disparos"
                        >
                          📜 Logs
                        </button>

                        <button
                          onClick={() => abrirModalEditar(wh)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-blue-200"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => handleExcluir(wh.id, wh.nome)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-red-200"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Informações Técnicas e Exemplo de Payload */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-sm border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span>Estrutura do Envelope JSON Enviado</span>
          </div>
          <p className="text-xs text-slate-400">
            Todas as requisições HTTP POST são disparadas com cabeçalho <code>Content-Type: application/json</code> e <code>X-Webhook-Event</code>. Se informado o Secret, o cabeçalho <code>X-Webhook-Signature</code> conterá a assinatura HMAC-SHA256 do corpo.
          </p>
          <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
{`{
  "event": "lead.connected",
  "timestamp": "2026-08-17T17:45:00.000Z",
  "empresa_id": 1,
  "data": {
    "nome": "João Silva",
    "telefone": "5511999998888",
    "email": "joao@email.com",
    "cpf": "123.456.789-00",
    "mac": "AA:BB:CC:11:22:33",
    "origem": "portal_lead",
    "conectado_em": "2026-08-17T17:45:00.000Z"
  }
}`}
          </pre>
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      {modalAberto && (
        <Modal
          isOpen={modalAberto}
          title={editandoId ? "Editar Webhook" : "Novo Webhook Outbound"}
          onClose={() => setModalAberto(false)}
        >
          <form onSubmit={handleSalvar} className="space-y-4">
            {erroForm && (
              <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-lg border border-red-200">
                {erroForm}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nome da Integração *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: RD Station Marketing, ActiveCampaign, n8n Hub"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                URL de Destino (Endpoint HTTP POST) *
              </label>
              <input
                type="url"
                required
                placeholder="https://sua-empresa.webhook.office.com/v1/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Chave Secreta HMAC (Opcional)
                </label>
                <button
                  type="button"
                  onClick={gerarSecretAleatorio}
                  className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  ⚡ Gerar Chave Aleatória
                </button>
              </div>
              <input
                type="text"
                placeholder="whsec_xxxxxxxxxxxxxxxxxxxx"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Utilizada para assinar o cabeçalho <code>X-Webhook-Signature</code> e garantir a autenticidade do disparo.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Eventos para Disparar *
              </label>
              <div className="space-y-2">
                {EVENTOS_DISPONIVEIS.map((ev) => {
                  const selecionado = eventos.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => toggleEvento(ev.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        selecionado
                          ? "bg-blue-50/70 border-blue-300 text-blue-900"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <p className="font-bold">{ev.nome}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{ev.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="webhook_ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="webhook_ativo" className="text-xs font-bold text-slate-700 cursor-pointer">
                Webhook Ativo (Pronto para receber disparos)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton onClick={() => setModalAberto(false)}>Cancelar</SecondaryButton>
              <PrimaryButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Atualizar Webhook" : "Criar Webhook"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Logs de Disparo */}
      {logsModalAberto && (
        <Modal
          isOpen={logsModalAberto}
          title={`Histórico de Disparos: ${webhookSelecionado?.nome || "Webhook"}`}
          onClose={() => setLogsModalAberto(false)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {carregandoLogs ? (
              <div className="p-8 text-center text-slate-400 text-xs">Carregando histórico de envios...</div>
            ) : webhookLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhum disparo registrado ainda para este endpoint.
              </div>
            ) : (
              <div className="space-y-2">
                {webhookLogs.map((log) => {
                  const expandido = logExpandido === log.id;
                  let parsedPayload = null;
                  try {
                    parsedPayload = typeof log.payload === "string" ? JSON.parse(log.payload) : log.payload;
                  } catch (e) {
                    parsedPayload = log.payload;
                  }

                  return (
                    <div
                      key={log.id}
                      className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-[#f8fafc]"
                    >
                      <div
                        onClick={() => setLogExpandido(expandido ? null : log.id)}
                        className="p-3 bg-white flex items-center justify-between cursor-pointer hover:bg-[#f8fafc] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.sucesso
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            HTTP {log.status_code || "ERR"}
                          </span>
                          <span className="font-bold text-slate-800">{log.evento}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span>{new Date(log.criado_em).toLocaleString("pt-BR")}</span>
                          <span>{expandido ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {expandido && (
                        <div className="p-4 space-y-3 bg-slate-900 text-slate-100 font-mono text-[11px]">
                          <div>
                            <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Payload Enviado:</p>
                            <pre className="bg-slate-950 p-2.5 rounded text-emerald-400 overflow-x-auto">
                              {JSON.stringify(parsedPayload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Resposta do Servidor:</p>
                            <pre className="bg-slate-950 p-2.5 rounded text-slate-300 overflow-x-auto">
                              {log.resposta_body || "(Resposta vazia)"}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#e2e8f0]">
              <SecondaryButton onClick={() => setLogsModalAberto(false)}>Fechar</SecondaryButton>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
