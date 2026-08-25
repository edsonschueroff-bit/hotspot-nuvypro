import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal } from "@/components/ui";

const API = "";

const statusColors = {
  novo: "bg-blue-50 text-[#2563eb] border-blue-200/60",
  contactado: "bg-amber-50 text-amber-700 border-amber-200/60",
  convertido: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  descartado: "bg-red-50 text-red-700 border-red-200/60",
};

const statusLabels = {
  novo: "Novo",
  contactado: "Contactado",
  convertido: "Convertido",
  descartado: "Descartado",
};

const tabs = [
  { key: "todos", label: "Todos" },
  { key: "novo", label: "Novos" },
  { key: "contactado", label: "Contactados" },
  { key: "convertido", label: "Convertidos" },
  { key: "descartado", label: "Descartados" },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cpf: "", observacoes: "" });
  const [salvando, setSalvando] = useState(false);

  const token = localStorage.getItem("admin_token");

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "todos") params.append("status", statusFilter);
      if (search) params.append("q", search);

      const res = await fetch(`${API}/api/leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar leads:", err);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await fetch(`${API}/api/leads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchLeads();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    try {
      await fetch(`${API}/api/leads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLeads();
    } catch (err) {
      console.error("Erro ao deletar lead:", err);
    }
  };

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    setSalvando(true);
    try {
      await fetch(`${API}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, origem: "manual" }),
      });
      setShowModal(false);
      setForm({ nome: "", email: "", telefone: "", cpf: "", observacoes: "" });
      fetchLeads();
    } catch (err) {
      console.error("Erro ao criar lead:", err);
    } finally {
      setSalvando(false);
    }
  };

  const handleExport = () => {
    window.open(`${API}/api/leads/export?token=${token}`, "_blank");
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          title="Gestão de Leads"
          subtitle="Acompanhe prospects e cadastros captados pelos formulários do captive portal"
          actions={
            <div className="flex items-center gap-2.5">
              <SecondaryButton
                onClick={handleExport}
                size="md"
                variant="outline"
              >
                📥 Exportar CSV
              </SecondaryButton>
              <PrimaryButton
                onClick={() => setShowModal(true)}
                size="md"
              >
                + Novo Lead
              </PrimaryButton>
            </div>
          }
        />

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs em Cápsula */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 flex-wrap w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por nome, email ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 pl-9 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#2563eb] text-xs shadow-sm"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Tabela de Leads */}
        <Card>
          <CardBody noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider hidden md:table-cell">Telefone</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider hidden lg:table-cell">CPF</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider hidden md:table-cell">Origem</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider hidden lg:table-cell">Data</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-400 text-xs">
                        Carregando leads...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-400 text-sm">
                        Nenhum lead encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{lead.nome || "—"}</td>
                        <td className="px-6 py-3.5 text-slate-600 text-xs">{lead.email || "—"}</td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs hidden md:table-cell">{lead.telefone || "—"}</td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs hidden lg:table-cell">{lead.cpf || "—"}</td>
                        <td className="px-6 py-3.5">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${statusColors[lead.status] || "bg-slate-100 text-slate-700"}`}
                          >
                            {Object.entries(statusLabels).map(([val, label]) => (
                              <option key={val} value={val} className="bg-white text-slate-900">
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs hidden md:table-cell capitalize font-medium">{lead.origem}</td>
                        <td className="px-6 py-3.5 text-slate-400 text-xs hidden lg:table-cell">{formatDate(lead.criado_em)}</td>
                        <td className="px-6 py-3.5 text-right">
                          <SecondaryButton
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(lead.id)}
                          >
                            Excluir
                          </SecondaryButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Modal Novo Lead */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Novo Lead"
          description="Cadastre um novo contato manualmente no banco de leads"
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setShowModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={handleCreate} loading={salvando}>
                Salvar Lead
              </PrimaryButton>
            </div>
          }
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Nome Completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#f1f5f9] border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563eb] text-sm"
                placeholder="Ex: João da Silva"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#f1f5f9] border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563eb] text-sm"
                placeholder="joao@empresa.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f1f5f9] border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563eb] text-sm"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f1f5f9] border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563eb] text-sm"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-[#f1f5f9] border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563eb] text-sm resize-none"
                placeholder="Anotações comerciais sobre o lead"
              />
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
