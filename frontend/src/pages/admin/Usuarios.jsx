import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal } from "@/components/ui";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ email: "", senha: "" });
  const [editando, setEditando] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const token = localStorage.getItem("admin_token");

  const carregarUsuarios = async () => {
    try {
      const res = await fetch("/api/admins", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar admins:", err);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSalvando(true);
    try {
      const url = editando ? `/api/admins/${editando}` : "/api/admins";
      const method = editando ? "PUT" : "POST";

      const payload = { email: form.email };
      if (!editando || form.senha) payload.senha = form.senha;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar usuário");

      setShowModal(false);
      setEditando(null);
      setForm({ email: "", senha: "" });
      carregarUsuarios();
    } catch (err) {
      alert("Erro ao salvar usuário");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (admin) => {
    setEditando(admin.id);
    setForm({ email: admin.email, senha: "" });
    setShowModal(true);
  };

  const handleRemover = async (id) => {
    if (!confirm("Deseja remover este administrador?")) return;
    try {
      await fetch(`/api/admins/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      carregarUsuarios();
    } catch (err) {
      alert("Erro ao remover usuário");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          title="Administradores"
          subtitle="Gerencie os usuários com acesso ao painel de controle"
          actions={
            <PrimaryButton
              onClick={() => {
                setEditando(null);
                setForm({ email: "", senha: "" });
                setShowModal(true);
              }}
            >
              + Novo Admin
            </PrimaryButton>
          }
        />

        <Card>
          <CardBody noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Criado Em</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {usuarios.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-700 font-semibold">{a.id}</td>
                      <td className="px-6 py-3.5 text-slate-900 font-medium">{a.email}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">
                        {a.created_at ? new Date(a.created_at).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SecondaryButton
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditar(a)}
                          >
                            Editar
                          </SecondaryButton>
                          <SecondaryButton
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemover(a.id)}
                          >
                            Remover
                          </SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-400 text-sm">
                        Nenhum administrador cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editando ? "Editar Administrador" : "Novo Administrador"}
          description={editando ? "Altere os dados de acesso do administrador" : "Informe o email e senha para cadastrar um novo administrador"}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setShowModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={handleSubmit} loading={salvando}>
                {editando ? "Salvar Alterações" : "Criar Administrador"}
              </PrimaryButton>
            </div>
          }
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                Email de Acesso *
              </label>
              <input
                type="email"
                required
                className="ds-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="operador@empresa.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                Senha {editando && <span className="text-slate-400 normal-case font-normal">(deixe em branco para manter a atual)</span>}
              </label>
              <input
                type="password"
                required={!editando}
                className="ds-input"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder={editando ? "••••••••" : "Senha forte"}
              />
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
