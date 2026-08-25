import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import AdminLayout from "../../components/admin/AdminLayout";

export default function Empresas() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [saasPlanos, setSaasPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Modal Central da Empresa (Ficha Concentrada)
  const [centralEmpresa, setCentralEmpresa] = useState(null);
  const [centralAba, setCentralAba] = useState("cadastral"); // "cadastral" | "financeiro" | "infraestrutura"
  const [faturasEmpresa, setFaturasEmpresa] = useState([]);
  const [loadingFaturas, setLoadingFaturas] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    razao_social: "",
    cnpj: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    email: "",
    telefone: "",
    responsavel_nome: "",
    responsavel_cargo: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    pix_chave: "",
    saas_plano_id: "",
    tipo_cobranca: "fixo",
    valor_mensal: "0.00",
    comissao_porcentagem: "0.00",
    dia_vencimento: 10,
    status_financeiro: "trial"
  });

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/admin");
      return;
    }
    fetchEmpresas();
    fetchSaasPlanos();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch("/api/empresas", { headers });
      if (res.ok) setEmpresas(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaasPlanos = async () => {
    try {
      const res = await fetch("/api/saas-planos", { headers });
      if (res.ok) setSaasPlanos(await res.json());
    } catch (err) {
      console.error("Erro ao carregar planos SaaS:", err);
    }
  };

  // Busca automática de endereço por CEP (ViaCEP)
  const handleBuscarCep = async (cepInput) => {
    const cleanCep = cepInput.replace(/\D/g, "");
    setForm(prev => ({ ...prev, cep: cepInput }));

    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const handleOpenModal = (empresa = null) => {
    if (empresa) {
      setEditId(empresa.id);
      setForm({
        nome: empresa.nome || "",
        razao_social: empresa.razao_social || "",
        cnpj: empresa.cnpj || "",
        inscricao_estadual: empresa.inscricao_estadual || "",
        inscricao_municipal: empresa.inscricao_municipal || "",
        email: empresa.email || "",
        telefone: empresa.telefone || "",
        responsavel_nome: empresa.responsavel_nome || "",
        responsavel_cargo: empresa.responsavel_cargo || "",
        cep: empresa.cep || "",
        logradouro: empresa.logradouro || "",
        numero: empresa.numero || "",
        complemento: empresa.complemento || "",
        bairro: empresa.bairro || "",
        cidade: empresa.cidade || "",
        uf: empresa.uf || "",
        pix_chave: empresa.pix_chave || "",
        saas_plano_id: empresa.saas_plano_id || "",
        tipo_cobranca: empresa.tipo_cobranca || "fixo",
        valor_mensal: empresa.valor_mensal || "0.00",
        comissao_porcentagem: empresa.comissao_porcentagem || "0.00",
        dia_vencimento: empresa.dia_vencimento || 10,
        status_financeiro: empresa.status_financeiro || "trial"
      });
    } else {
      setEditId(null);
      setForm({
        nome: "",
        razao_social: "",
        cnpj: "",
        inscricao_estadual: "",
        inscricao_municipal: "",
        email: "",
        telefone: "",
        responsavel_nome: "",
        responsavel_cargo: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        pix_chave: "",
        saas_plano_id: saasPlanos[0]?.id || "",
        tipo_cobranca: saasPlanos[0]?.tipo_cobranca || "fixo",
        valor_mensal: saasPlanos[0]?.valor_mensal || "0.00",
        comissao_porcentagem: saasPlanos[0]?.comissao_porcentagem || "0.00",
        dia_vencimento: 10,
        status_financeiro: "trial"
      });
    }
    setShowModal(true);
  };

  const handleSelectPlano = (planoId) => {
    const plano = saasPlanos.find(p => String(p.id) === String(planoId));
    if (plano) {
      setForm(prev => ({
        ...prev,
        saas_plano_id: plano.id,
        tipo_cobranca: plano.tipo_cobranca,
        valor_mensal: plano.valor_mensal,
        comissao_porcentagem: plano.comissao_porcentagem
      }));
    } else {
      setForm(prev => ({ ...prev, saas_plano_id: planoId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editId ? `/api/empresas/${editId}` : "/api/empresas";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (res.ok) {
        setShowModal(false);
        setEditId(null);
        fetchEmpresas();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente deletar esta empresa?")) return;
    try {
      await fetch(`/api/empresas/${id}`, { method: "DELETE", headers });
      fetchEmpresas();
    } catch (err) {
      console.error(err);
    }
  };

  // Abrir Central da Empresa
  const handleOpenCentral = async (empresa) => {
    setCentralEmpresa(empresa);
    setCentralAba("cadastral");
    setLoadingFaturas(true);
    try {
      const res = await fetch(`/api/saas-faturas?empresa_id=${empresa.id}`, { headers });
      if (res.ok) {
        setFaturasEmpresa(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFaturas(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f1f5f9] text-slate-700 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar / Header */}
          <PageHeader
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title="Gerenciar Empresas (Tenants)"
            subtitle="Ficha cadastral completa, regras fiscais e faturamento"
            actions={
              <div className="flex items-center gap-2.5">
                <Link
                  to="/super/saas-planos"
                  className="px-4 py-2.5 bg-blue-50 text-[#2563eb] border border-blue-200 rounded-md hover:bg-blue-100 text-xs font-bold transition-colors"
                >
                  Planos de Assinatura
                </Link>
                <PrimaryButton
                  onClick={() => handleOpenModal()}
                  size="md"
                >
                  + Nova Empresa
                </PrimaryButton>
              </div>
            }
          />

          {/* Lista de Empresas */}
          {loading ? (
            <p className="text-slate-400 text-center py-12 text-sm">Carregando empresas...</p>
          ) : (
            <div className="space-y-4">
              {empresas.map((e) => (
                <div key={e.id} className="bg-white border border-slate-200 rounded-[10px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm hover:border-slate-300 transition-all">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-bold text-lg text-slate-900">{e.nome}</p>
                      {e.razao_social && <span className="text-xs text-slate-500 font-normal">({e.razao_social})</span>}

                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${e.status_financeiro === 'adimplente' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                        e.status_financeiro === 'inadimplente' ? 'bg-red-50 text-red-700 border border-red-200/60' :
                          e.status_financeiro === 'trial' ? 'bg-blue-50 text-[#2563eb] border border-blue-200/60' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                        {e.status_financeiro || 'trial'}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-lg text-xs bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                        {e.saas_plano_nome || 'Personalizado'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Email: <span className="text-slate-800 font-medium">{e.email}</span> | Slug: <span className="text-slate-800 font-medium">{e.slug}</span> {e.cnpj && `| CNPJ: ${e.cnpj}`} {e.responsavel_nome && `| Resp: ${e.responsavel_nome}`}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                      <span>💳 Cobrança: <strong className="text-slate-700 uppercase">{e.tipo_cobranca}</strong></span>
                      <span>💵 Mensalidade: <strong className="text-slate-700">R$ {parseFloat(e.valor_mensal || 0).toFixed(2).replace('.', ',')}</strong></span>
                      <span>📊 Comissão: <strong className="text-emerald-700">{parseFloat(e.comissao_porcentagem || 0)}%</strong></span>
                      <span>📅 Vencimento: <strong className="text-slate-700">Dia {e.dia_vencimento || 10}</strong></span>
                      <span>📡 {e.total_mikrotiks || 0} MikroTiks</span>
                      <span>📍 {e.cidade ? `${e.cidade}/${e.uf}` : 'Sem endereço'}</span>
                    </div>
                  </div>

                  {/* Botões de Ação Concentrados */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 flex-wrap">
                    <button
                      onClick={() => handleOpenCentral(e)}
                      className="px-3.5 py-2 bg-blue-50 text-[#2563eb] border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>👁️ Central & Ficha</span>
                    </button>

                    <Link
                      to="/super/saas-faturas"
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      💳 Faturas
                    </Link>

                    <button
                      onClick={() => handleOpenModal(e)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Editar
                    </button>

                    <Link
                      to={`/admin/${e.slug}`}
                      className="px-3.5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm"
                    >
                      Acessar
                    </Link>

                    {e.slug !== 'default' && (
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal CENTRAL DA EMPRESA (Hub Concentrado) */}
          {centralEmpresa && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-[10px] w-full max-w-3xl shadow-2xl overflow-hidden my-8">
                {/* Header Central */}
                <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{centralEmpresa.nome}</h2>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs bg-blue-50 text-[#2563eb] border border-blue-200 font-semibold">
                        {centralEmpresa.saas_plano_nome || 'Plano Personalizado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Slug: <strong className="text-slate-800">{centralEmpresa.slug}</strong> | Cadastrada em: {new Date(centralEmpresa.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => setCentralEmpresa(null)}
                    className="text-slate-500 hover:text-slate-900 text-xl font-bold px-3 py-1 bg-slate-100 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Navegação por Abas */}
                <div className="flex border-b border-slate-200 bg-[#f1f5f9] px-6 pt-2">
                  <button
                    onClick={() => setCentralAba("cadastral")}
                    className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${centralAba === "cadastral" ? "border-purple-500 text-slate-700" : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    📋 Ficha Cadastral & Fisco
                  </button>
                  <button
                    onClick={() => setCentralAba("financeiro")}
                    className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${centralAba === "financeiro" ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    💳 Financeiro & Faturas
                  </button>
                  <button
                    onClick={() => setCentralAba("infraestrutura")}
                    className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${centralAba === "infraestrutura" ? "border-blue-500 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    📡 Infraestrutura & Recursos
                  </button>
                </div>

                {/* Conteúdo da Aba */}
                <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
                  {/* ABA 1: FICHA CADASTRAL */}
                  {centralAba === "cadastral" && (
                    <div className="space-y-6 text-xs">
                      {/* Bloco Dados Fiscais */}
                      <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identificação Corporativa & Fiscal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-slate-400">Nome Fantasia:</p>
                            <p className="font-semibold text-slate-900">{centralEmpresa.nome}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Razão Social:</p>
                            <p className="font-semibold text-slate-900">{centralEmpresa.razao_social || 'Não cadastrada'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">CNPJ:</p>
                            <p className="font-semibold text-slate-800">{centralEmpresa.cnpj || 'Não informado'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Inscrição Estadual (IE):</p>
                            <p className="font-semibold text-slate-800">{centralEmpresa.inscricao_estadual || 'Isento / Não informado'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bloco Responsável & Contato */}
                      <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Contato & Responsável Técnico</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-slate-400">Responsável:</p>
                            <p className="font-semibold text-slate-900">{centralEmpresa.responsavel_nome || 'Não informado'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Cargo:</p>
                            <p className="font-semibold text-slate-800">{centralEmpresa.responsavel_cargo || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Email Principal:</p>
                            <p className="font-semibold text-emerald-700">{centralEmpresa.email}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Telefone / WhatsApp:</p>
                            <p className="font-semibold text-slate-800">{centralEmpresa.telefone || 'Não informado'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Chave PIX para Repasses:</p>
                            <p className="font-semibold text-emerald-700">{centralEmpresa.pix_chave || 'Não cadastrada'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bloco Endereço */}
                      <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Endereço Comercial</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-slate-400">CEP:</p>
                            <p className="font-semibold text-slate-900">{centralEmpresa.cep || 'Não informado'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-slate-400">Logradouro:</p>
                            <p className="font-semibold text-slate-900">{centralEmpresa.logradouro || '-'}, Nº {centralEmpresa.numero || 'S/N'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Bairro:</p>
                            <p className="font-semibold text-slate-800">{centralEmpresa.bairro || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Cidade / UF:</p>
                            <p className="font-semibold text-slate-800">{centralEmpresa.cidade ? `${centralEmpresa.cidade}/${centralEmpresa.uf}` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Complemento:</p>
                            <p className="font-semibold text-slate-800">{centralEmpresa.complemento || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA 2: FINANCEIRO & FATURAS */}
                  {centralAba === "financeiro" && (
                    <div className="space-y-6 text-xs">
                      {/* Regras do Contrato */}
                      <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-slate-400">Status Financeiro:</p>
                          <p className="font-bold text-emerald-700 uppercase">{centralEmpresa.status_financeiro}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Tipo Cobrança:</p>
                          <p className="font-bold text-slate-900 uppercase">{centralEmpresa.tipo_cobranca}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Valor Mensalidade:</p>
                          <p className="font-bold text-slate-900">R$ {parseFloat(centralEmpresa.valor_mensal || 0).toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Dia de Vencimento:</p>
                          <p className="font-bold text-amber-700">Dia {centralEmpresa.dia_vencimento || 10}</p>
                        </div>
                      </div>

                      {/* Histórico de Faturas */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Faturas Geradas para esta Empresa</h3>
                        {loadingFaturas ? (
                          <p className="text-slate-400 py-4 text-center">Carregando faturas...</p>
                        ) : faturasEmpresa.length === 0 ? (
                          <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-6 text-center text-slate-400">
                            Nenhuma fatura gerada para esta empresa até o momento.
                          </div>
                        ) : (
                          <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 bg-white">
                                  <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Descrição</th>
                                  <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Valor</th>
                                  <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Vencimento</th>
                                  <th className="p-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#f1f5f9]">
                                {faturasEmpresa.map(f => (
                                  <tr key={f.id} className="hover:bg-white">
                                    <td className="p-3 font-medium text-slate-900">{f.descricao}</td>
                                    <td className="p-3 font-bold text-slate-900">R$ {parseFloat(f.valor).toFixed(2).replace('.', ',')}</td>
                                    <td className="p-3 text-slate-700">{new Date(f.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-3 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${f.status === 'pago' ? 'bg-emerald-900/40 text-emerald-700' :
                                        f.status === 'vencido' ? 'bg-red-900/40 text-red-700' : 'bg-amber-900/40 text-amber-700'
                                        }`}>
                                        {f.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ABA 3: INFRAESTRUTURA & RECURSOS */}
                  {centralAba === "infraestrutura" && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4">
                          <p className="text-slate-400 uppercase font-semibold">MikroTiks Conectados</p>
                          <p className="text-3xl font-extrabold text-slate-900 mt-1">{centralEmpresa.total_mikrotiks || 0}</p>
                        </div>
                        <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4">
                          <p className="text-slate-400 uppercase font-semibold">Portais de Captura</p>
                          <p className="text-3xl font-extrabold text-slate-700 mt-1">{centralEmpresa.total_planos || 0}</p>
                        </div>
                        <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4">
                          <p className="text-slate-400 uppercase font-semibold">Administradores</p>
                          <p className="text-3xl font-extrabold text-blue-700 mt-1">{centralEmpresa.total_admins || 0}</p>
                        </div>
                      </div>

                      <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-slate-500 mb-3">Deseja gerenciar os equipamentos e portais desta empresa?</p>
                        <Link
                          to={`/admin/${centralEmpresa.slug}`}
                          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-950/40"
                        >
                          Acessar Painel do Tenant ({centralEmpresa.nome}) &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Central */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center">
                  <button
                    onClick={() => {
                      const emp = centralEmpresa;
                      setCentralEmpresa(null);
                      handleOpenModal(emp);
                    }}
                    className="px-4 py-2 bg-yellow-600/20 text-yellow-700 hover:bg-yellow-600/30 rounded-xl text-xs font-semibold"
                  >
                    ✏️ Editar Cadastro Completo
                  </button>
                  <button
                    onClick={() => setCentralEmpresa(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-200"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal EDITAR / CADASTRAR EMPRESA (Formulário Completo em Seções) */}
          {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-[10px] p-6 w-full max-w-2xl shadow-2xl space-y-6 my-8 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {editId ? "Editar Ficha Completa da Empresa" : "Cadastrar Nova Empresa (Tenant)"}
                  </h2>
                  <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-900">✕</button>
                </div>

                {/* SEÇÃO 1: Identificação Corporativa & Fiscal */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Dados Fiscais & Identificação</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nome Fantasia / Principal *</label>
                      <input
                        type="text" required
                        value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Ex: Nuvy Core Hotspot"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Razão Social</label>
                      <input
                        type="text"
                        value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Ex: Nuvy Core Tecnologia LTDA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Inscrição Estadual (IE)</label>
                      <input
                        type="text"
                        value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Isento ou Nº IE"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Inscrição Municipal (IM)</label>
                      <input
                        type="text"
                        value={form.inscricao_municipal} onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: Contato & Responsável */}
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">2. Responsável Técnico & Financeiro</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email de Notificação / Login *</label>
                      <input
                        type="email" required
                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nome do Responsável</label>
                      <input
                        type="text"
                        value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cargo / Função</label>
                      <input
                        type="text"
                        value={form.responsavel_cargo} onChange={(e) => setForm({ ...form, responsavel_cargo: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Ex: Gerente de TI"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Chave PIX (Repasses)</label>
                      <input
                        type="text"
                        value={form.pix_chave} onChange={(e) => setForm({ ...form, pix_chave: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="CPF / CNPJ / Chave"
                      />
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 3: Endereço Comercial (com ViaCEP) */}
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">3. Endereço Comercial</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">CEP (Busca Automática)</label>
                      <input
                        type="text"
                        value={form.cep} onChange={(e) => handleBuscarCep(e.target.value)}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="00000-000"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Logradouro (Rua / Av)</label>
                      <input
                        type="text"
                        value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Número</label>
                      <input
                        type="text"
                        value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Cidade</label>
                        <input
                          type="text"
                          value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                          className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="w-16">
                        <label className="block text-xs font-medium text-slate-500 mb-1">UF</label>
                        <input
                          type="text" maxLength={2}
                          value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                          className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-2 py-2 text-sm text-center uppercase focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 4: Contrato & Regras da Assinatura */}
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">4. Contrato & Plano de Assinatura</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Plano de Assinatura Vinculado</label>
                      <select
                        value={form.saas_plano_id}
                        onChange={(e) => handleSelectPlano(e.target.value)}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Personalizado / Nenhum</option>
                        {saasPlanos.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Status Financeiro</label>
                      <select
                        value={form.status_financeiro}
                        onChange={(e) => setForm({ ...form, status_financeiro: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="trial">Degustação (Trial)</option>
                        <option value="adimplente">Adimplente (Em Dia)</option>
                        <option value="inadimplente">Inadimplente (Em Atraso)</option>
                        <option value="suspenso">Suspenso</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tipo Cobrança</label>
                      <select
                        value={form.tipo_cobranca}
                        onChange={(e) => setForm({ ...form, tipo_cobranca: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="fixo">Mensalidade Fixa</option>
                        <option value="porcentagem">Revenue Share</option>
                        <option value="hibrido">Híbrido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Valor Mensal (R$)</label>
                      <input
                        type="number" step="0.01"
                        value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Comissão (%)</label>
                      <input
                        type="number" step="0.1"
                        value={form.comissao_porcentagem} onChange={(e) => setForm({ ...form, comissao_porcentagem: e.target.value })}
                        className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Dia do Vencimento da Fatura</label>
                    <input
                      type="number" min="1" max="31"
                      value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                      className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-500 text-sm font-semibold transition-colors">
                    {editId ? "Salvar Ficha Completa" : "Cadastrar Empresa"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

    </AdminLayout>
  );
}