import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
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

export default function Filiais() {
  const { user, switchEmpresa } = useAuth();
  const [filiais, setFiliais] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matrizId, setMatrizId] = useState(null);

  // Modal State
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [endereco, setEndereco] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [trocandoUnidadeId, setTrocandoUnidadeId] = useState(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");

      const [resFiliais, resMetricas] = await Promise.all([
        fetch("/api/filiais", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/filiais/metricas-consolidadas", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const dataFiliais = await resFiliais.json();
      const dataMetricas = await resMetricas.json();

      if (dataFiliais.success) {
        setFiliais(dataFiliais.data || []);
        setMatrizId(dataFiliais.matriz_id);
      }
      if (dataMetricas.success) {
        setMetricas(dataMetricas.data);
      }
    } catch (err) {
      console.error("Erro ao carregar filiais:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirModalNova = () => {
    setEditandoId(null);
    setNome("");
    setCidade("");
    setEstado("");
    setEndereco("");
    setResponsavelNome("");
    setTelefone("");
    setEmail("");
    setErroForm("");
    setModalAberto(true);
  };

  const abrirModalEditar = (f) => {
    setEditandoId(f.id);
    setNome(f.nome || "");
    setCidade(f.cidade || "");
    setEstado(f.estado || "");
    setEndereco(f.endereco || "");
    setResponsavelNome(f.responsavel_nome || "");
    setTelefone(f.telefone || "");
    setEmail(f.email || "");
    setErroForm("");
    setModalAberto(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setErroForm("");

    if (!nome.trim()) {
      setErroForm("O nome da filial é obrigatório.");
      return;
    }

    try {
      setSalvando(true);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const endpoint = editandoId ? `/api/filiais/${editandoId}` : "/api/filiais";
      const method = editandoId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nome,
          cidade,
          estado,
          endereco,
          responsavel_nome: responsavelNome,
          telefone,
          email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setModalAberto(false);
        carregarDados();
        // Atualiza a lista de empresas no cache se for nova filial
        if (!editandoId) {
          window.location.reload();
        }
      } else {
        setErroForm(data.message || "Erro ao salvar filial.");
      }
    } catch (err) {
      setErroForm("Erro de conexão ao salvar filial.");
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarUnidade = async (empresaTarget) => {
    if (empresaTarget.id === user?.empresa_id) return;
    setTrocandoUnidadeId(empresaTarget.id);

    try {
      const emp = await switchEmpresa(empresaTarget.id);
      window.location.href = `/admin/${emp.slug}/filiais`;
    } catch (err) {
      alert("Erro ao alternar para esta filial.");
      setTrocandoUnidadeId(null);
    }
  };

  const handleDesativar = async (f) => {
    if (!window.confirm(`Deseja realmente desativar a filial "${f.nome}"?`)) return;

    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch(`/api/filiais/${f.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        carregarDados();
      } else {
        alert(data.message || "Erro ao desativar filial.");
      }
    } catch (err) {
      alert("Erro de conexão ao desativar filial.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Rede & Gestão Multi-Filiais"
          subtitle="Gerencie todas as unidades da sua rede, acompanhe métricas consolidadas e alterne entre filiais em 1 clique"
          action={
            <PrimaryButton onClick={abrirModalNova}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                + Nova Filial / Unidade
              </span>
            </PrimaryButton>
          }
        />

        {/* 4 KPIs Consolidados da Rede */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total de Unidades</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{metricas?.total_unidades || filiais.length || 1}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Roteadores na Rede</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{metricas?.total_roteadores || 0}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Leads na Rede</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{metricas?.total_leads || 0}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Faturamento Rede (PIX)</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                R$ {Number(metricas?.faturamento_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Filiais */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-sm font-bold text-slate-800">Unidades e Filiais Cadastradas</h3>
              <span className="text-xs text-slate-500">{filiais.length} unidades encontradas</span>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Carregando estrutura de filiais...</div>
            ) : filiais.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-sm font-bold text-slate-700">Nenhuma filial cadastrada</p>
                <p className="text-xs text-slate-500">Cadastre suas unidades para gerenciar roteadores e visitantes de forma individual.</p>
                <PrimaryButton onClick={abrirModalNova}>+ Cadastrar Primeira Filial</PrimaryButton>
              </div>
            ) : (
              <div className="divide-y divide-[#f1f5f9]">
                {filiais.map((f) => {
                  const isMatriz = f.id === matrizId;
                  const isUnidadeAtiva = f.id === user?.empresa_id;

                  return (
                    <div
                      key={f.id}
                      className={`p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isUnidadeAtiva ? "bg-blue-50/40 border-l-4 border-l-blue-600" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{f.nome}</h4>
                          {isMatriz ? (
                            <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                              🏢 Matriz Principal
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                              🏪 Filial
                            </span>
                          )}

                          {isUnidadeAtiva && (
                            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              Unidade Ativa no Painel
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span>
                            📍 {f.cidade ? `${f.cidade}/${f.estado || ""}` : "Cidade não informada"}
                            {f.endereco ? ` • ${f.endereco}` : ""}
                          </span>
                          {f.responsavel_nome && <span>👤 Resp: {f.responsavel_nome}</span>}
                          {f.telefone && <span>📞 {f.telefone}</span>}
                        </div>

                        {/* Badges de Contadores da Filial */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            📡 {f.total_mikrotiks || 0} Roteadores
                          </span>
                          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            🖼️ {f.total_portais || 0} Portais
                          </span>
                          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                            👥 {f.total_leads || 0} Leads
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                        {!isUnidadeAtiva ? (
                          <button
                            onClick={() => handleAlternarUnidade(f)}
                            disabled={trocandoUnidadeId === f.id}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {trocandoUnidadeId === f.id ? "Alternando..." : "🔄 Gerenciar Unidade"}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                            ✓ Painel Aberto Aqui
                          </span>
                        )}

                        <button
                          onClick={() => abrirModalEditar(f)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-200"
                        >
                          Editar
                        </button>

                        {!isMatriz && (
                          <button
                            onClick={() => handleDesativar(f)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-red-200"
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal de Cadastro / Edição */}
      {modalAberto && (
        <Modal
          isOpen={modalAberto}
          title={editandoId ? "Editar Filial" : "Nova Filial / Unidade"}
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
                Nome da Filial / Unidade *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Restaurante Sabor - Unidade Jardins"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  UF (Estado)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs uppercase rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                placeholder="Av. Paulista, 1000 - Bela Vista"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Responsável / Gerente
                </label>
                <input
                  type="text"
                  placeholder="Nome do gerente local"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton onClick={() => setModalAberto(false)}>Cancelar</SecondaryButton>
              <PrimaryButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Atualizar Filial" : "Criar e Provisionar Filial"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
