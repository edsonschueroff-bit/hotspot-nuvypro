import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  Modal,
  StatusBadge
} from "../../components/ui";

export default function SaasFaturas() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [faturas, setFaturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showComissaoModal, setShowComissaoModal] = useState(false);
  const [showConfiancaModal, setShowConfiancaModal] = useState(false);
  const [notifModal, setNotifModal] = useState({ show: false, texto: "", link: "" });

  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [dataVencimentoGerar, setDataVencimentoGerar] = useState(new Date().toISOString().split('T')[0]);

  const [confiancaForm, setConfiancaForm] = useState({
    empresa_id: "",
    dias: 3,
    motivo: "Concedido pelo Super Admin"
  });

  const [form, setForm] = useState({
    empresa_id: "",
    descricao: "",
    valor: "",
    data_vencimento: new Date().toISOString().split('T')[0],
    forma_pagamento: "pix"
  });

  const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/admin");
      return;
    }
    fetchEmpresas();
    fetchFaturas();
  }, [statusFiltro, empresaFiltro]);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch("/api/empresas", { headers });
      if (res.ok) {
        const data = await res.json();
        setEmpresas(data);
        if (data.length > 0 && !form.empresa_id) {
          setForm(prev => ({ ...prev, empresa_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFaturas = async () => {
    setLoading(true);
    try {
      let url = "/api/saas-faturas?";
      if (statusFiltro) url += `status=${statusFiltro}&`;
      if (empresaFiltro) url += `empresa_id=${empresaFiltro}&`;

      const res = await fetch(url, { headers });
      if (res.ok) setFaturas(await res.json());
    } catch (err) {
      console.error("Erro ao carregar faturas:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewComissao = async (empId) => {
    if (!empId) return;
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/saas-faturas/preview-comissao?empresa_id=${empId}`, { headers });
      if (res.ok) {
        setPreviewData(await res.json());
      }
    } catch (err) {
      console.error("Erro ao carregar prévia:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAbrirComissaoModal = () => {
    setShowComissaoModal(true);
    const empId = empresas[0]?.id || "";
    setSelectedEmpresaId(empId);
    if (empId) fetchPreviewComissao(empId);
  };

  const handleChangeEmpresaPreview = (empId) => {
    setSelectedEmpresaId(empId);
    fetchPreviewComissao(empId);
  };

  const handleGerarMensalidadeComissao = async () => {
    if (!selectedEmpresaId) return;
    try {
      const res = await fetch("/api/saas-faturas/gerar-mensalidade", {
        method: "POST",
        headers,
        body: JSON.stringify({
          empresa_id: selectedEmpresaId,
          data_vencimento: dataVencimentoGerar
        })
      });
      if (res.ok) {
        setShowComissaoModal(false);
        fetchFaturas();
      } else {
        const errData = await res.json();
        alert(errData.message || "Erro ao gerar fatura");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitCriar = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/saas-faturas", { method: "POST", headers, body: JSON.stringify(form) });
      if (res.ok) {
        setShowModal(false);
        setForm({
          empresa_id: empresas[0]?.id || "",
          descricao: "",
          valor: "",
          data_vencimento: new Date().toISOString().split('T')[0],
          forma_pagamento: "pix"
        });
        fetchFaturas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDarBaixa = async (id) => {
    if (!confirm("Confirmar o recebimento desta fatura e dar baixa?")) return;
    try {
      const res = await fetch(`/api/saas-faturas/${id}/baixa`, { method: "PUT", headers });
      if (res.ok) {
        fetchFaturas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm("Deseja realmente cancelar esta fatura?")) return;
    try {
      const res = await fetch(`/api/saas-faturas/${id}`, { method: "DELETE", headers });
      if (res.ok) fetchFaturas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificar = async (id) => {
    try {
      const res = await fetch(`/api/saas-faturas/${id}/notificar`, { method: "POST", headers });
      if (res.ok) {
        const data = await res.json();
        setNotifModal({
          show: true,
          texto: data.mensagem_texto,
          link: data.whatsapp_link
        });
        fetchFaturas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAbrirConfiancaModal = (empresaId = "") => {
    setConfiancaForm({
      empresa_id: empresaId || empresas[0]?.id || "",
      dias: 3,
      motivo: "Concedido pelo Super Admin"
    });
    setShowConfiancaModal(true);
  };

  const handleLiberarConfiancaAdmin = async (e) => {
    e?.preventDefault();
    if (!confiancaForm.empresa_id) return;
    try {
      const res = await fetch("/api/saas-faturas/liberacao-confianca-admin", {
        method: "POST",
        headers,
        body: JSON.stringify(confiancaForm)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Erro ao conceder liberação");
        return;
      }
      alert("✅ " + data.message);
      setShowConfiancaModal(false);
      fetchFaturas();
      fetchEmpresas();
    } catch (err) {
      alert("Erro ao conectar com servidor");
    }
  };

  const handleExecutarDisparosManuais = async () => {
    try {
      const res = await fetch("/api/saas-faturas/disparos-whatsapp", { method: "POST", headers });
      if (res.ok) {
        const data = await res.json();
        alert(`Varredura concluída com sucesso!\n\nDisparos (3 Dias Antes): ${data.detalhes?.disparos3d || 0}\nDisparos (Hoje Vencimento): ${data.detalhes?.disparosHoje || 0}`);
        fetchFaturas();
      }
    } catch (err) {
      console.error("Erro ao executar disparos:", err);
    }
  };

  const totalRecebido = faturas.filter(f => f.status === 'pago').reduce((acc, f) => acc + parseFloat(f.valor), 0);
  const totalAReceber = faturas.filter(f => f.status === 'pendente' || f.status === 'vencido').reduce((acc, f) => acc + parseFloat(f.valor), 0);
  const totalComissoesAcumuladas = faturas.reduce((acc, f) => acc + parseFloat(f.valor_comissao || 0), 0);

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header Padrão Precision Light */}
        <PageHeader
          title="Faturas & Cobranças da Plataforma"
          subtitle="Gerencie a cobrança das mensalidades, comissões de Revenue Share e lembretes automáticos via WhatsApp"
          icon="💳"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link to="/super/relatorios">
                <SecondaryButton className="flex items-center gap-1.5">
                  <span>📊</span> Relatórios & BI
                </SecondaryButton>
              </Link>
              <SecondaryButton onClick={handleExecutarDisparosManuais} className="flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                <span>📲</span> Lembretes WhatsApp
              </SecondaryButton>
              <SecondaryButton onClick={() => handleAbrirConfiancaModal()} className="flex items-center gap-1.5 text-amber-700 hover:bg-amber-50 border-amber-200">
                <span>🔓</span> Liberação de Confiança
              </SecondaryButton>
              <SecondaryButton onClick={handleAbrirComissaoModal} className="flex items-center gap-1.5 text-[#2563eb] hover:bg-blue-50 border-blue-200">
                <span>⚡</span> Gerar com Comissão
              </SecondaryButton>
              <PrimaryButton onClick={() => setShowModal(true)} className="flex items-center gap-1.5">
                <span>+</span> Nova Fatura
              </PrimaryButton>
            </div>
          }
        />

        {/* Resumo Financeiro - 4 KPIs com Borda Lateral */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#2563eb]"></div>
            <p className="text-[11px] font-600 text-slate-400 uppercase tracking-wider">Total de Faturas</p>
            <p className="text-[26px] font-700 text-slate-900 mt-1">{faturas.length}</p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#f59e0b]"></div>
            <p className="text-[11px] font-600 text-amber-700 uppercase tracking-wider">A Receber</p>
            <p className="text-[26px] font-700 text-amber-700 mt-1">{formatBRL(totalAReceber)}</p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#10b981]"></div>
            <p className="text-[11px] font-600 text-emerald-700 uppercase tracking-wider">Total Recebido</p>
            <p className="text-[26px] font-700 text-emerald-700 mt-1">{formatBRL(totalRecebido)}</p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-slate-500"></div>
            <p className="text-[11px] font-600 text-slate-600 uppercase tracking-wider">Comissões (RevShare)</p>
            <p className="text-[26px] font-700 text-slate-800 mt-1">{formatBRL(totalComissoesAcumuladas)}</p>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {['', 'pendente', 'vencido', 'pago', 'cancelado'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFiltro(st)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-500 transition-colors cursor-pointer ${
                  statusFiltro === st
                    ? 'bg-[#2563eb] text-white font-600 shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e2e8f0] hover:bg-slate-50'
                }`}
              >
                {st === '' ? 'Todas' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="ds-input bg-white text-[12px] py-1.5"
            >
              <option value="">Todas as Empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Faturas */}
        <Card>
          {loading ? (
            <p className="text-slate-400 text-center py-10 text-[13px]">Carregando faturas...</p>
          ) : faturas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[13px]">
              Nenhuma fatura encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-slate-500 text-[11px] uppercase tracking-wider font-600">
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-5 py-3">Descrição & Desmembramento</th>
                    <th className="px-5 py-3 text-right">Valor Total</th>
                    <th className="px-5 py-3">Vencimento</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {faturas.map((f) => {
                    const vencido = f.status === 'vencido' || (f.status === 'pendente' && new Date(f.data_vencimento) < new Date());
                    const temComissao = parseFloat(f.valor_comissao || 0) > 0 || parseFloat(f.total_vendas || 0) > 0;
                    const tipoCobranca = f.empresa_tipo_cobranca || 'fixo';

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-600 text-slate-900">{f.empresa_nome}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-600 uppercase border ${
                              tipoCobranca === 'porcentagem' ? 'bg-blue-50 text-[#2563eb] border-[#bfdbfe]' :
                              tipoCobranca === 'hibrido' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {tipoCobranca === 'porcentagem' ? '% RevShare' : tipoCobranca === 'hibrido' ? 'Híbrido' : 'Fixo'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{f.empresa_email} | {f.empresa_telefone || 'Sem WhatsApp'}</p>
                        </td>

                        <td className="px-5 py-3.5">
                          <p className="text-slate-800 font-500">{f.descricao}</p>
                          {temComissao && (
                            <div className="mt-1 inline-flex flex-wrap items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-2 py-0.5 text-[11px] text-slate-500">
                              <span>Fixo: <strong className="text-slate-900">{formatBRL(f.valor_base)}</strong></span>
                              <span>•</span>
                              <span>Vendas: <strong className="text-slate-900">{formatBRL(f.total_vendas)}</strong></span>
                              <span>•</span>
                              <span>Comissão ({f.comissao_porcentagem}%): <strong className="text-[#2563eb]">{formatBRL(f.valor_comissao)}</strong></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {f.notificado_3d_em && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-500">
                                📲 Notificado 3d
                              </span>
                            )}
                            {f.notificado_vencimento_em && (
                              <span className="text-[10px] bg-blue-50 text-[#2563eb] border border-blue-200 px-1.5 py-0.2 rounded font-500">
                                📲 Notificado Vencimento
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right font-700 text-slate-900 text-[14px]">
                          {formatBRL(f.valor)}
                        </td>

                        <td className="px-5 py-3.5 text-[12px] text-slate-600">
                          {new Date(f.data_vencimento).toLocaleDateString('pt-BR')}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-600 uppercase border ${
                            f.status === 'pago' ? 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]' :
                            vencido ? 'bg-[#fef2f2] text-red-700 border-[#fecaca]' :
                            'bg-[#fffbeb] text-amber-700 border-[#fde68a]'
                          }`}>
                            {f.status === 'pago' ? 'Pago' : vencido ? 'Vencido' : 'Pendente'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {f.status !== 'pago' && (
                              <button
                                onClick={() => handleAbrirConfiancaModal(f.empresa_id)}
                                className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-md text-[11px] font-600 transition-colors cursor-pointer"
                                title="Conceder Liberação de Confiança"
                              >
                                🔓 Liberar
                              </button>
                            )}
                            {f.status !== 'pago' && (
                              <button
                                onClick={() => handleDarBaixa(f.id)}
                                className="px-2.5 py-1 bg-[#ecfdf5] text-[#10b981] hover:bg-[#d1fae5] border border-[#a7f3d0] rounded-md text-[11px] font-600 transition-colors cursor-pointer"
                              >
                                Baixa
                              </button>
                            )}
                            <button
                              onClick={() => handleNotificar(f.id)}
                              className="px-2.5 py-1 bg-[#2563eb] text-white hover:bg-[#1d4ed8] rounded-md text-[11px] font-600 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>WhatsApp</span>
                            </button>
                            {f.status !== 'cancelado' && (
                              <button
                                onClick={() => handleCancelar(f.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 text-[11px] cursor-pointer"
                                title="Cancelar Fatura"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal Gerar Mensalidade com Comissão */}
        <Modal
          isOpen={showComissaoModal}
          onClose={() => setShowComissaoModal(false)}
          title="Gerar Mensalidade com Comissão"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Selecione a Empresa</label>
              <select
                value={selectedEmpresaId}
                onChange={(e) => handleChangeEmpresaPreview(e.target.value)}
                className="ds-input bg-white"
              >
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Data de Vencimento</label>
              <input
                type="date"
                value={dataVencimentoGerar}
                onChange={(e) => setDataVencimentoGerar(e.target.value)}
                className="ds-input"
              />
            </div>

            {loadingPreview ? (
              <div className="py-6 text-center text-slate-400 text-[12px]">
                Carregando prévia de vendas e comissões...
              </div>
            ) : previewData ? (
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
                  <span className="text-[12px] text-slate-500">Modalidade de Cobrança:</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-[#2563eb] border border-blue-200 rounded-full text-[10px] font-600 uppercase">
                    {previewData.tipo_cobranca === 'porcentagem' ? '100% RevShare' : previewData.tipo_cobranca === 'hibrido' ? 'Híbrido (Fixo + %)' : 'Fixo'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="bg-white p-3 rounded-md border border-[#e2e8f0]">
                    <p className="text-slate-500">Vendas (30d):</p>
                    <p className="text-[16px] font-700 text-slate-900 mt-0.5">{formatBRL(previewData.total_vendas)}</p>
                    <p className="text-[10px] text-slate-400">{previewData.quantidade_vendas} vendas</p>
                  </div>

                  <div className="bg-white p-3 rounded-md border border-[#e2e8f0]">
                    <p className="text-slate-500">Alíquota Comissão:</p>
                    <p className="text-[16px] font-700 text-[#2563eb] mt-0.5">{previewData.comissao_porcentagem}%</p>
                    <p className="text-[10px] text-slate-500">Devido: {formatBRL(previewData.valor_comissao)}</p>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-[#e2e8f0] text-[12px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Mensalidade Fixa:</span>
                    <span className="font-600 text-slate-900">{formatBRL(previewData.valor_base)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Comissão ({previewData.comissao_porcentagem}%):</span>
                    <span className="font-600 text-[#2563eb]">{formatBRL(previewData.valor_comissao)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-700 text-slate-900 pt-2 border-t border-[#e2e8f0]">
                    <span>Total Final da Fatura:</span>
                    <span className="text-[#10b981] font-800">{formatBRL(previewData.valor_total)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton onClick={() => setShowComissaoModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                onClick={handleGerarMensalidadeComissao}
                disabled={!previewData || previewData.valor_total <= 0}
              >
                Gerar Fatura
              </PrimaryButton>
            </div>
          </div>
        </Modal>

        {/* Modal Gerar Fatura Avulsa */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Gerar Fatura Avulsa"
        >
          <form onSubmit={handleSubmitCriar} className="space-y-4">
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Empresa *</label>
              <select
                required
                value={form.empresa_id}
                onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                className="ds-input bg-white"
              >
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Descrição *</label>
              <input
                type="text"
                required
                placeholder="Ex: Mensalidade Licença Nuvy Pro - Agosto"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="ds-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="99.00"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Vencimento *</label>
                <input
                  type="date"
                  required
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                  className="ds-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton type="submit">
                Gerar Fatura
              </PrimaryButton>
            </div>
          </form>
        </Modal>

        {/* Modal de Envio de WhatsApp */}
        <Modal
          isOpen={notifModal.show}
          onClose={() => setNotifModal({ show: false, texto: "", link: "" })}
          title="Cobrança via WhatsApp"
        >
          <div className="space-y-4">
            <p className="text-[12px] text-slate-500">Mensagem gerada para envio ao cliente:</p>
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3.5 font-mono text-[12px] text-slate-800 whitespace-pre-wrap">
              {notifModal.texto}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              {notifModal.link ? (
                <a
                  href={notifModal.link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-600 rounded-md shadow-sm transition-colors"
                >
                  Abrir no WhatsApp Web
                </a>
              ) : (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(notifModal.texto);
                    alert("Texto copiado para a área de transferência!");
                  }}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-600 rounded-md shadow-sm transition-colors"
                >
                  Copiar Texto
                </button>
              )}
              <SecondaryButton onClick={() => setNotifModal({ show: false, texto: "", link: "" })}>
                Fechar
              </SecondaryButton>
            </div>
          </div>
        </Modal>

        {/* Modal Liberação de Confiança */}
        <Modal
          isOpen={showConfiancaModal}
          onClose={() => setShowConfiancaModal(false)}
          title="Conceder Liberação de Confiança (Promessa de Pagamento)"
        >
          <form onSubmit={handleLiberarConfiancaAdmin} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[12px] text-amber-900 flex items-start gap-2">
              <span className="text-base">🔓</span>
              <p>
                A <strong>Liberação de Confiança</strong> reativa temporariamente o acesso do cliente ao painel e ao Wi-Fi comercial enquanto ele organiza o pagamento.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Empresa Cliente</label>
              <select
                value={confiancaForm.empresa_id}
                onChange={(e) => setConfiancaForm({ ...confiancaForm, empresa_id: e.target.value })}
                className="ds-input bg-white"
                required
              >
                <option value="">Selecione uma empresa...</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nome} (Status: {e.status_financeiro || 'trial'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Dias de Tolerância / Liberação</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[3, 5, 7, 15].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setConfiancaForm({ ...confiancaForm, dias: d })}
                    className={`py-1.5 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                      confiancaForm.dias === d
                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    +{d} Dias
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="90"
                value={confiancaForm.dias}
                onChange={(e) => setConfiancaForm({ ...confiancaForm, dias: parseInt(e.target.value, 10) || 1 })}
                className="ds-input"
                placeholder="Ou digite o número de dias..."
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Motivo / Observação</label>
              <input
                type="text"
                value={confiancaForm.motivo}
                onChange={(e) => setConfiancaForm({ ...confiancaForm, motivo: e.target.value })}
                placeholder="Ex: Cliente pediu prazo até sexta-feira via WhatsApp"
                className="ds-input"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton type="button" onClick={() => setShowConfiancaModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton type="submit" className="bg-amber-600 hover:bg-amber-700 border-amber-600">
                <span>🔓</span> Conceder Liberação
              </PrimaryButton>
            </div>
          </form>
        </Modal>

      </div>
    </AdminLayout>
  );
}