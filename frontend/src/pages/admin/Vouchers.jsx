import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal, StatusBadge } from "@/components/ui";
import QRCode from "qrcode";
import { 
  Ticket, 
  Printer, 
  Plus, 
  Trash2, 
  Eye, 
  Wifi, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileText,
  AlertCircle
} from "lucide-react";

export default function Vouchers() {
  const { empresaSlug } = useParams();
  const [lotes, setLotes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo Lote
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formNovo, setFormNovo] = useState({
    nome_lote: "",
    plano_id: "",
    quantidade: 25,
    prefixo: "WIFI"
  });

  // Modal Visualização / Impressão Térmica
  const [loteDetalhe, setLoteDetalhe] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [formatoImpressao, setFormatoImpressao] = useState("80mm"); // "58mm" | "80mm"
  const [qrCodes, setQrCodes] = useState({});

  const token = localStorage.getItem("admin_token");
  const printRef = useRef(null);

  useEffect(() => {
    carregarLotes();
    carregarPlanos();
  }, []);

  const carregarLotes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vouchers/lotes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLotes(data);
      }
    } catch (err) {
      console.error("Erro ao carregar lotes de vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  const carregarPlanos = async () => {
    try {
      const res = await fetch("/api/planos", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlanos(data);
        if (data.length > 0) {
          setFormNovo(prev => ({ ...prev, plano_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error("Erro ao carregar planos:", err);
    }
  };

  const handleCriarLote = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch("/api/vouchers/gerar-lote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formNovo)
      });
      const data = await res.json();
      if (res.ok) {
        setShowNovoModal(false);
        setFormNovo({ nome_lote: "", plano_id: planos[0]?.id || "", quantidade: 25, prefixo: "WIFI" });
        carregarLotes();
        // Abrir diretamente a visualização do lote gerado
        if (data.lote?.id) {
          abrirDetalheLote(data.lote.id);
        }
      } else {
        alert(data.message || "Erro ao gerar lote");
      }
    } catch (err) {
      alert("Falha na conexão ao gerar lote.");
    } finally {
      setSalvando(false);
    }
  };

  const abrirDetalheLote = async (loteId) => {
    setLoadingDetalhe(true);
    try {
      const res = await fetch(`/api/vouchers/lotes/${loteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoteDetalhe(data);
        // Gerar QR codes para cada voucher
        const qrMap = {};
        for (const v of data.vouchers || []) {
          try {
            // URL ou string do voucher para auto-preenchimento
            const urlLogin = `https://${window.location.host}/login-hotspot?voucher=${encodeURIComponent(v.codigo)}`;
            qrMap[v.codigo] = await QRCode.toDataURL(urlLogin, { width: 120, margin: 1 });
          } catch (qErr) {
            console.error("Erro ao gerar QR code:", qErr);
          }
        }
        setQrCodes(qrMap);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do lote:", err);
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const handleDeletarLote = async (loteId) => {
    if (!window.confirm("Atenção: Todos os vouchers deste lote serão excluídos do sistema e revogados do RADIUS. Deseja continuar?")) {
      return;
    }
    try {
      const res = await fetch(`/api/vouchers/lotes/${loteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (loteDetalhe?.id === loteId) setLoteDetalhe(null);
        carregarLotes();
      } else {
        const data = await res.json();
        alert(data.message || "Erro ao deletar lote");
      }
    } catch (err) {
      alert("Erro de conexão.");
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  // KPIs
  const totalLotes = lotes.length;
  const totalVouchersGeral = lotes.reduce((acc, l) => acc + (parseInt(l.total_vouchers, 10) || 0), 0);
  const totalDisponiveisGeral = lotes.reduce((acc, l) => acc + (parseInt(l.total_disponiveis, 10) || 0), 0);
  const totalUtilizadosGeral = lotes.reduce((acc, l) => acc + (parseInt(l.total_utilizados, 10) || 0), 0);

  return (
    <AdminLayout>
      {/* Estilos dedicados para impressão térmica */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: ${formatoImpressao === "58mm" ? "58mm" : "80mm"};
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
          }
          .voucher-receipt {
            page-break-inside: avoid;
            page-break-after: always;
            border-bottom: 2px dashed #000;
            padding: 10px 4px;
            font-family: 'Courier New', Courier, monospace;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={<Ticket className="w-6 h-6 text-[#2563eb]" />}
          title="Vouchers em Lote & PDV Físico"
          subtitle="Gere pacotes de vouchers impressos para venda rápida no balcão ou recepção (Térmica 58mm/80mm)"
          actions={
            <PrimaryButton onClick={() => setShowNovoModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Lote de Vouchers
            </PrimaryButton>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Lotes Criados</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalLotes}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total de Vouchers</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalVouchersGeral}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Vouchers Disponíveis</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalDisponiveisGeral}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Vouchers Utilizados</p>
                <h3 className="text-2xl font-black text-slate-700 mt-1">{totalUtilizadosGeral}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Tabela de Lotes */}
        <Card>
          <CardBody className="p-0">
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Histórico de Lotes Gerados</h3>
              <span className="text-xs text-slate-500">Total: {lotes.length} lotes</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">⏳ Carregando lotes de vouchers...</div>
            ) : lotes.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-[10px] bg-blue-50 text-[#2563eb] mx-auto flex items-center justify-center mb-3">
                  <Ticket className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Nenhum lote gerado ainda</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Crie pacotes de vouchers para imprimir na mini-impressora térmica e vender acessos no balcão.
                </p>
                <PrimaryButton onClick={() => setShowNovoModal(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar Primeiro Lote
                </PrimaryButton>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Lote / Identificação</th>
                      <th className="py-3 px-4">Plano Vinculado</th>
                      <th className="py-3 px-4 text-center">Quantidade</th>
                      <th className="py-3 px-4 text-center">Disponíveis</th>
                      <th className="py-3 px-4 text-center">Utilizados</th>
                      <th className="py-3 px-4">Data de Criação</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {lotes.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-[#2563eb]" />
                          {l.nome_lote}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{l.plano_nome}</span>
                          <span className="text-[10px] text-slate-400 block">{l.duracao_minutos} minutos (R$ {Number(l.plano_valor).toFixed(2)})</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">{l.quantidade}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            {l.total_disponiveis} disp.
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                            {l.total_utilizados} usados
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(l.criado_em).toLocaleDateString("pt-BR")} às {new Date(l.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <SecondaryButton 
                            variant="subtle" 
                            className="px-2.5 py-1 text-xs text-[#2563eb] hover:bg-blue-50"
                            onClick={() => abrirDetalheLote(l.id)}
                            title="Visualizar e Imprimir"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Imprimir
                          </SecondaryButton>
                          <SecondaryButton 
                            variant="ghost" 
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletarLote(l.id)}
                            title="Excluir Lote"
                          >
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
      </div>

      {/* Modal Criar Novo Lote */}
      <Modal
        isOpen={showNovoModal}
        onClose={() => setShowNovoModal(false)}
        title="Gerar Lote de Vouchers para PDV"
        subtitle="Crie centenas de vouchers com códigos curtos e legíveis para impressão rápida"
      >
        <form onSubmit={handleCriarLote} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome de Identificação do Lote</label>
            <input
              type="text"
              required
              placeholder="Ex: Lote Balcão - Sexta Feira"
              value={formNovo.nome_lote}
              onChange={(e) => setFormNovo({ ...formNovo, nome_lote: e.target.value })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plano de Acesso</label>
              <select
                value={formNovo.plano_id}
                onChange={(e) => setFormNovo({ ...formNovo, plano_id: e.target.value })}
                required
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-medium"
              >
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} - {p.duracao_minutos} min (R$ {Number(p.valor).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade de Vouchers</label>
              <select
                value={formNovo.quantidade}
                onChange={(e) => setFormNovo({ ...formNovo, quantidade: Number(e.target.value) })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-medium"
              >
                <option value={10}>10 Vouchers</option>
                <option value={25}>25 Vouchers</option>
                <option value={50}>50 Vouchers</option>
                <option value={100}>100 Vouchers</option>
                <option value={200}>200 Vouchers</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Prefixo do Código (Máx. 8 letras)</label>
            <input
              type="text"
              maxLength={8}
              placeholder="Ex: WIFI, HOTEL, VIP"
              value={formNovo.prefixo}
              onChange={(e) => setFormNovo({ ...formNovo, prefixo: e.target.value.toUpperCase() })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono uppercase"
            />
            <p className="text-[10px] text-slate-400 mt-1">Exemplo de código gerado: <span className="font-bold font-mono text-slate-700">{formNovo.prefixo || "WIFI"}-8X92</span></p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
            <SecondaryButton onClick={() => setShowNovoModal(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" loading={salvando}>
              🚀 Gerar e Provisionar Vouchers
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Modal Visualização & Impressão Térmica */}
      <Modal
        isOpen={!!loteDetalhe}
        onClose={() => setLoteDetalhe(null)}
        title={`Visualizador de Impressão Térmica: ${loteDetalhe?.nome_lote || ""}`}
        subtitle="Pré-visualização dos cupons de acesso para impressoras de 58mm ou 80mm"
      >
        {loteDetalhe && (
          <div className="space-y-4">
            {/* Controles de Formato */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Largura do Papel:</span>
                <button
                  onClick={() => setFormatoImpressao("58mm")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${formatoImpressao === "58mm" ? "bg-[#2563eb] text-white shadow-sm" : "bg-white text-slate-700 border border-slate-300"}`}
                >
                  Rolo 58mm (Mini)
                </button>
                <button
                  onClick={() => setFormatoImpressao("80mm")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${formatoImpressao === "80mm" ? "bg-[#2563eb] text-white shadow-sm" : "bg-white text-slate-700 border border-slate-300"}`}
                >
                  Rolo 80mm (Padrão)
                </button>
              </div>

              <PrimaryButton onClick={handleImprimir}>
                <Printer className="w-4 h-4 mr-1.5" />
                🖨️ Imprimir Todos ({loteDetalhe.vouchers?.length})
              </PrimaryButton>
            </div>

            {/* Pré-visualização dos Cupons Térmicos */}
            <div className="max-h-[500px] overflow-y-auto p-4 bg-slate-100 rounded-xl border border-slate-200 flex justify-center">
              <div 
                id="print-area" 
                ref={printRef} 
                style={{ width: formatoImpressao === "58mm" ? "240px" : "320px" }}
                className="bg-white shadow-md p-2 space-y-4"
              >
                {loteDetalhe.vouchers?.map((v, idx) => (
                  <div key={v.id} className="voucher-receipt text-center border-b-2 border-dashed border-slate-400 pb-4 pt-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">{loteDetalhe.empresa_nome || "NUVYCORE WI-FI"}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">--- TICKET DE ACESSO WI-FI ---</p>
                    
                    <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded">
                      <p className="text-[10px] text-slate-600 font-bold uppercase">{loteDetalhe.plano_nome}</p>
                      <p className="text-[9px] text-slate-500 font-mono">Duração: {loteDetalhe.duracao_minutos} min | Vel: {loteDetalhe.velocidade_down || 5}M</p>
                      <p className="text-sm font-black tracking-widest text-[#2563eb] font-mono mt-1">{v.codigo}</p>
                    </div>

                    {qrCodes[v.codigo] && (
                      <div className="flex justify-center my-1">
                        <img src={qrCodes[v.codigo]} alt="QR Code" className="w-20 h-20" />
                      </div>
                    )}

                    <p className="text-[8px] text-slate-500 mt-1 leading-tight">
                      Conecte-se à rede Wi-Fi e aponte a câmera para o QR Code ou digite o código acima na tela de login.
                    </p>
                    <p className="text-[8px] text-slate-400 font-mono mt-1">Voucher #{idx + 1} de {loteDetalhe.vouchers.length}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
