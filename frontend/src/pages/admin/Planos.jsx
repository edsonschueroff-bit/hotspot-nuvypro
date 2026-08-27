import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader } from "@/components/ui";
import { Plus, Edit2, Trash2, Copy, AlertTriangle, X, Check } from "lucide-react";

export default function Planos() {
  const [planos, setPlanos] = useState([]);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    duracao: 1,
    tipo_validade: "corrido",
    valor: "0,00",
    velocidade_download: 0,
    velocidade_upload: 0,
    mikrotik_id: "",
    address_pool: "default-dhcp",
    shared_users: 10,
    ativo: true,
  });
  const token = localStorage.getItem("admin_token");

  const carregarPlanos = async () => {
    try {
      const res = await fetch("/api/planos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Erro ao carregar planos");
      setPlanos(data);
    } catch (err) {
      alert("Erro ao carregar planos.");
    } finally {
      setLoading(false);
    }
  };

  const carregarMikrotiks = async () => {
    try {
      const res = await fetch("/api/mikrotiks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMikrotiks(data);
    } catch (err) {
      alert("Erro ao carregar Mikrotiks");
    }
  };

  useEffect(() => {
    carregarPlanos();
    carregarMikrotiks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editando ? `/api/planos/${editando}` : "/api/planos";
      const method = editando ? "PUT" : "POST";
      const valorEmCentavos = Math.round(
        parseFloat(form.valor.replace(",", ".") || "0") * 100
      );

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: form.nome,
          descricao: form.descricao,
          valor: valorEmCentavos,
          duracao_minutos: parseInt(form.duracao),
          tipo_validade: form.tipo_validade || "corrido",
          velocidade_down: parseInt(form.velocidade_download),
          velocidade_up: parseInt(form.velocidade_upload),
          mikrotik_id: parseInt(form.mikrotik_id),
          address_pool: form.address_pool,
          shared_users: parseInt(form.shared_users),
          ativo: form.ativo,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar plano");
      setShowModal(false);
      setEditando(null);
      carregarPlanos();
    } catch (err) {
      alert("Erro ao salvar plano.");
    }
  };

  const handleEditar = (plano) => {
    setForm({
      nome: plano.nome,
      descricao: plano.descricao,
      valor: (plano.valor / 100).toFixed(2).replace(".", ","),
      duracao: plano.duracao_minutos,
      tipo_validade: plano.tipo_validade || "corrido",
      velocidade_download: plano.velocidade_down,
      velocidade_upload: plano.velocidade_up,
      mikrotik_id: plano.mikrotik_id,
      address_pool: plano.address_pool || "default-dhcp",
      shared_users: plano.shared_users || 10,
      ativo: plano.ativo,
    });
    setEditando(plano.id);
    setShowModal(true);
  };

  const handleRemover = async (id) => {
    if (!confirm("Deseja remover este plano?")) return;
    try {
      await fetch(`/api/planos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      carregarPlanos();
    } catch (err) {
      alert("Erro ao remover plano.");
    }
  };

  const handleCopiar = (plano) => {
    setForm({
      nome: plano.nome + " (cópia)",
      descricao: plano.descricao,
      valor: (plano.valor / 100).toFixed(2).replace(".", ","),
      duracao: plano.duracao_minutos,
      tipo_validade: plano.tipo_validade || "corrido",
      velocidade_download: plano.velocidade_down,
      velocidade_upload: plano.velocidade_up,
      mikrotik_id: plano.mikrotik_id,
      address_pool: plano.address_pool || "default-dhcp",
      shared_users: plano.shared_users || 10,
      ativo: plano.ativo,
    });
    setEditando(null);
    setShowModal(true);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
          title="Planos de Acesso"
          subtitle="Gerencie pacotes de internet, limites de banda e preços"
          actions={
            <button
              onClick={() => {
                setForm({
                  nome: "",
                  descricao: "",
                  duracao: 1,
                  valor: "0,00",
                  velocidade_download: 0,
                  velocidade_upload: 0,
                  mikrotik_id: "",
                  address_pool: "default-dhcp",
                  shared_users: 10,
                  ativo: true,
                });
                setEditando(null);
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-600 rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Plano</span>
            </button>
          }
        />

        {/* Alertas informativos */}
        {!loading && !planos.some(p => p.nome === 'LGPD') && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-[10px] flex items-start gap-3 text-amber-800">
            <svg className="w-5 h-5 min-w-[20px] max-w-[20px] min-h-[20px] max-h-[20px] text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-600 text-[13px] text-amber-900">Plano LGPD não encontrado</p>
              <p className="text-[12px] text-amber-700 mt-0.5">O portal LGPD precisa de um plano com o nome exato <strong>"LGPD"</strong> para funcionar. Crie um plano gratuito com esse nome e vincule a um Mikrotik.</p>
            </div>
          </div>
        )}
        {!loading && !planos.some(p => p.nome.toLowerCase() === 'lead') && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-[10px] flex items-start gap-3 text-amber-800">
            <svg className="w-5 h-5 min-w-[20px] max-w-[20px] min-h-[20px] max-h-[20px] text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-600 text-[13px] text-amber-900">Plano Lead não encontrado</p>
              <p className="text-[12px] text-amber-700 mt-0.5">O portal de Leads precisa de um plano com o nome exato <strong>"Lead"</strong> para funcionar. Crie um plano gratuito com esse nome e vincule a um Mikrotik.</p>
            </div>
          </div>
        )}

        {/* Tabela de Planos */}
        <div className="bg-white rounded-[10px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#eff6ff] text-[#2563eb] rounded-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-[14px] font-600 text-slate-900">Planos Cadastrados</h2>
            </div>
            <span className="text-[11px] font-600 text-slate-500 bg-[#f1f5f9] px-2.5 py-1 rounded-full border border-[#e2e8f0]">
              Total: {planos.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <div className="w-8 h-8 border-[3px] border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[13px] text-slate-400">Carregando planos...</p>
            </div>
          ) : planos.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-[14px] font-600 text-slate-700">Nenhum plano cadastrado</p>
              <p className="text-[12px] text-slate-400 mt-1">Clique no botão acima para criar o primeiro plano</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Nome / Descrição</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Duração & Tipo</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Velocidade</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Preço</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-right text-[10px] font-600 text-slate-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {planos.map((p) => (
                    <tr key={p.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-600 text-slate-900 text-[13px]">{p.nome}</div>
                        {p.descricao && <div className="text-[12px] text-slate-500 mt-0.5">{p.descricao}</div>}
                      </td>
                      <td className="px-6 py-4 font-500 text-slate-700">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-0.5 rounded-md text-slate-700 text-[12px] font-500 w-fit">
                            ⏱ {p.duracao_minutos} min
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600 border w-fit ${
                            p.tipo_validade === 'acumulado'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {p.tipo_validade === 'acumulado' ? '⏳ Banco de Horas' : '⏱️ Tempo Corrido'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-500 text-slate-700">
                        <div className="flex flex-col gap-0.5 text-[12px] font-500">
                          <span className="text-emerald-700 flex items-center gap-1">⬇ {p.velocidade_down} Mbps</span>
                          <span className="text-blue-700 flex items-center gap-1">⬆ {p.velocidade_up} Mbps</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-700 text-slate-900 text-[13px]">
                        {p.valor === 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-[11px] font-600">Grátis</span>
                        ) : (
                          `R$ ${(p.valor / 100).toFixed(2).replace('.', ',')}`
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-600 rounded-full border ${
                          p.ativo 
                            ? "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {p.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditar(p)}
                            className="p-1.5 bg-white hover:bg-blue-50 text-slate-500 hover:text-[#2563eb] rounded-md border border-[#e2e8f0] transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopiar(p)}
                            className="p-1.5 bg-white hover:bg-[#f8fafc] text-slate-500 hover:text-slate-900 rounded-md border border-[#e2e8f0] transition-colors cursor-pointer"
                            title="Duplicar Plano"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemover(p.id)}
                            className="p-1.5 bg-white hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-md border border-[#e2e8f0] transition-colors cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Novo / Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-[0_10px_25px_rgba(0,0,0,0.10)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#eff6ff] text-[#2563eb] rounded-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-[15px] font-600 text-slate-900">{editando ? "Editar Plano" : "Novo Plano de Acesso"}</h3>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form className="p-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Nome do Plano</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    placeholder="Ex: 2 Horas Alta Velocidade"
                    value={form.nome} 
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} 
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Descrição</label>
                  <textarea 
                    rows={2}
                    className="ds-input" 
                    placeholder="Detalhes para exibição no portal de login"
                    value={form.descricao} 
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Duração (minutos)</label> 
                    <input 
                      type="number" 
                      className="ds-input" 
                      value={form.duracao} 
                      onChange={(e) => setForm({ ...form, duracao: e.target.value })} 
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Valor (R$)</label>
                    <input 
                      type="text" 
                      className="ds-input" 
                      placeholder="0,00"
                      value={form.valor} 
                      onChange={(e) => setForm({ ...form, valor: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Modo de Contagem de Tempo */}
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                    Modo de Contagem de Tempo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                        form.tipo_validade === "corrido"
                          ? "border-[#2563eb] bg-[#eff6ff] text-slate-900 shadow-2xs"
                          : "border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo_validade"
                        value="corrido"
                        checked={form.tipo_validade === "corrido"}
                        onChange={(e) => setForm({ ...form, tipo_validade: e.target.value })}
                        className="mt-0.5 text-[#2563eb] focus:ring-[#2563eb]"
                      />
                      <div>
                        <span className="text-[12px] font-700 text-slate-900 flex items-center gap-1">
                          ⏱️ Tempo Corrido
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Expira {form.duracao || 0} min após ativação (mesmo desconectado).
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                        form.tipo_validade === "acumulado"
                          ? "border-[#2563eb] bg-[#eff6ff] text-slate-900 shadow-2xs"
                          : "border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo_validade"
                        value="acumulado"
                        checked={form.tipo_validade === "acumulado"}
                        onChange={(e) => setForm({ ...form, tipo_validade: e.target.value })}
                        className="mt-0.5 text-[#2563eb] focus:ring-[#2563eb]"
                      />
                      <div>
                        <span className="text-[12px] font-700 text-slate-900 flex items-center gap-1">
                          ⏳ Banco de Horas
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Desconta apenas os minutos em que o cliente estiver online.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Download (Mbps)</label>
                    <input 
                      type="number" 
                      className="ds-input" 
                      value={form.velocidade_download} 
                      onChange={(e) => setForm({ ...form, velocidade_download: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Upload (Mbps)</label>
                    <input 
                      type="number" 
                      className="ds-input" 
                      value={form.velocidade_upload} 
                      onChange={(e) => setForm({ ...form, velocidade_upload: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Roteador Mikrotik</label>
                  <select 
                    className="ds-input" 
                    value={form.mikrotik_id} 
                    onChange={(e) => setForm({ ...form, mikrotik_id: e.target.value })}
                  >
                    <option value="">Todos os Mikrotiks / Padrão</option>
                    {mikrotiks.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md cursor-pointer hover:bg-slate-100/80 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] border-slate-300"
                      checked={form.ativo} 
                      onChange={(e) => setForm({ ...form, ativo: e.target.checked })} 
                    />
                    <div>
                      <span className="text-[13px] font-600 text-slate-900">Plano Ativo</span>
                      <p className="text-[11px] text-slate-500">Permitir que usuários visualizem e comprem este plano</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e2e8f0]">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 border border-[#e2e8f0] text-slate-600 font-500 text-[13px] rounded-md hover:bg-[#f8fafc] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-600 text-[13px] rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    {editando ? "Salvar Alterações" : "Criar Plano"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
