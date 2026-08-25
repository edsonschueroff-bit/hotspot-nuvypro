import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal, StatusBadge } from "@/components/ui";

export default function Campanhas() {
  const { empresaSlug } = useParams();
  const [campanhas, setCampanhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "" });
  const [salvando, setSalvando] = useState(false);
  const token = localStorage.getItem("admin_token");

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campanhas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar campanhas");
      setCampanhas(data.data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCriar = async (e) => {
    if (e) e.preventDefault();
    if (!form.nome.trim()) return alert("Informe o nome da campanha.");
    setSalvando(true);
    try {
      const res = await fetch("/api/campanhas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: form.nome, descricao: form.descricao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar campanha");
      setShowModal(false);
      setForm({ nome: "", descricao: "" });
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtivo = async (c) => {
    try {
      const res = await fetch(`/api/campanhas/${c.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !c.ativo }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar campanha");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm("Deseja realmente excluir esta campanha?")) return;
    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao excluir campanha");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
          title="Campanhas de Mídia"
          subtitle="Configure vídeos e banners publicitários exibidos antes da liberação do Wi-Fi"
          actions={
            <PrimaryButton
              onClick={() => {
                setForm({ nome: "", descricao: "" });
                setShowModal(true);
              }}
            >
              + Nova Campanha
            </PrimaryButton>
          }
        />

        <Card>
          <CardBody noPadding>
            {loading ? (
              <p className="text-slate-500 text-center py-8 text-sm">Carregando campanhas...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Nome da Campanha</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-center">Itens</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-center">Visualizações</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {campanhas.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{c.nome}</td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs max-w-xs truncate">{c.descricao || "—"}</td>
                        <td className="px-6 py-3.5 text-slate-700 text-center font-semibold">{c.total_itens ?? 0}</td>
                        <td className="px-6 py-3.5 text-slate-700 text-center font-semibold">{c.views ?? 0}</td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => handleToggleAtivo(c)}
                            className="cursor-pointer"
                            title="Clique para alternar status"
                          >
                            <StatusBadge variant={c.ativo ? "success" : "neutral"} dot>
                              {c.ativo ? "Ativo" : "Inativo"}
                            </StatusBadge>
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/admin/${empresaSlug}/campanhas/${c.id}`}
                              className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md text-xs font-semibold shadow-sm transition-colors"
                            >
                              Editar Itens
                            </Link>
                            <SecondaryButton
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeletar(c.id)}
                            >
                              Excluir
                            </SecondaryButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {campanhas.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                          Nenhuma campanha cadastrada no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Modal Nova Campanha */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Nova Campanha de Mídia"
          description="Informe os dados iniciais da campanha antes de carregar fotos ou vídeos"
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setShowModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={handleCriar} loading={salvando}>
                Criar Campanha
              </PrimaryButton>
            </div>
          }
        >
          <form className="space-y-4" onSubmit={handleCriar}>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                Nome da Campanha *
              </label>
              <input
                type="text"
                className="ds-input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Promoção de Verão 2026"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                Descrição (Opcional)
              </label>
              <textarea
                className="ds-input"
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes ou objetivo da campanha"
              />
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
