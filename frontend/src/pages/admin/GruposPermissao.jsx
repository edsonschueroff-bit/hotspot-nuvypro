import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal } from "@/components/ui";

const API = import.meta.env.VITE_API_URL || "";

const MODULOS_LABELS = {
  dashboard: "Dashboard",
  mikrotiks: "Mikrotiks",
  vpn: "VPN WireGuard",
  portais: "Portais",
  planos: "Planos",
  clientes: "Clientes (LGPD)",
  leads: "Leads",
  radius: "Usuários RADIUS",
  pagamentos: "Pagamentos",
  sessoes: "Sessões Ativas",
  sessoeslog: "Log Radius",
  compliance: "Marco Civil",
  configuracoes: "Configurações",
  usuarios: "Usuários",
};

const ACOES = ["ver", "criar", "editar", "excluir"];
const ACOES_LABELS = { ver: "Ver", criar: "Criar", editar: "Editar", excluir: "Excluir" };

function emptyPermissoes() {
  return Object.keys(MODULOS_LABELS).map((m) => ({
    modulo: m,
    ver: false,
    criar: false,
    editar: false,
    excluir: false,
  }));
}

export default function GruposPermissao() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: "", descricao: "", permissoes: emptyPermissoes() });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Admins modal
  const [showAdminsModal, setShowAdminsModal] = useState(null);
  const [adminsGrupo, setAdminsGrupo] = useState([]);
  const [todosAdmins, setTodosAdmins] = useState([]);
  const [adminSelecionado, setAdminSelecionado] = useState("");

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchGrupos = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/grupos-permissao`, { headers });
      if (res.ok) setGrupos(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrupos(); }, [fetchGrupos]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const url = editId ? `${API}/api/grupos-permissao/${editId}` : `${API}/api/grupos-permissao`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (res.ok) {
        setShowModal(false);
        setEditId(null);
        setForm({ nome: "", descricao: "", permissoes: emptyPermissoes() });
        fetchGrupos();
      } else {
        const data = await res.json();
        setErro(data.message || "Erro ao salvar grupo de permissão");
      }
    } catch (err) {
      setErro("Erro de conexão com o servidor");
    } finally {
      setSalvando(false);
    }
  };

  const handleEdit = async (grupo) => {
    try {
      const res = await fetch(`${API}/api/grupos-permissao/${grupo.id}`, { headers });
      const data = await res.json();
      const perms = emptyPermissoes().map((p) => {
        const found = data.permissoes?.find((dp) => dp.modulo === p.modulo);
        return found ? { ...p, ver: !!found.ver, criar: !!found.criar, editar: !!found.editar, excluir: !!found.excluir } : p;
      });
      setEditId(grupo.id);
      setForm({ nome: data.nome, descricao: data.descricao || "", permissoes: perms });
      setShowModal(true);
    } catch (err) {
      alert("Erro ao carregar grupo");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente deletar este grupo de permissão?")) return;
    await fetch(`${API}/api/grupos-permissao/${id}`, { method: "DELETE", headers });
    fetchGrupos();
  };

  const togglePerm = (modulo, acao) => {
    setForm((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) =>
        p.modulo === modulo ? { ...p, [acao]: !p[acao] } : p
      ),
    }));
  };

  const toggleAllModulo = (modulo) => {
    const perm = form.permissoes.find((p) => p.modulo === modulo);
    const allChecked = ACOES.every((a) => perm[a]);
    setForm((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) =>
        p.modulo === modulo ? { ...p, ver: !allChecked, criar: !allChecked, editar: !allChecked, excluir: !allChecked } : p
      ),
    }));
  };

  const toggleAllAcao = (acao) => {
    const allChecked = form.permissoes.every((p) => p[acao]);
    setForm((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) => ({ ...p, [acao]: !allChecked })),
    }));
  };

  // Admins
  const openAdminsModal = async (grupoId) => {
    setShowAdminsModal(grupoId);
    const [admRes, todosRes] = await Promise.all([
      fetch(`${API}/api/grupos-permissao/${grupoId}/admins`, { headers }),
      fetch(`${API}/api/grupos-permissao/admins/todos`, { headers }),
    ]);
    setAdminsGrupo(await admRes.json());
    setTodosAdmins(await todosRes.json());
  };

  const vincularAdmin = async () => {
    if (!adminSelecionado) return;
    await fetch(`${API}/api/grupos-permissao/${showAdminsModal}/vincular-admin`, {
      method: "POST", headers, body: JSON.stringify({ admin_id: adminSelecionado })
    });
    setAdminSelecionado("");
    openAdminsModal(showAdminsModal);
  };

  const desvincularAdmin = async (adminId) => {
    if (!confirm("Remover este admin do grupo?")) return;
    await fetch(`${API}/api/grupos-permissao/${showAdminsModal}/desvincular-admin/${adminId}`, { method: "DELETE", headers });
    openAdminsModal(showAdminsModal);
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
          title="Grupos de Permissão"
          subtitle={`${grupos.length} grupo(s) de acesso configurado(s)`}
          actions={
            <PrimaryButton
              onClick={() => {
                setEditId(null);
                setForm({ nome: "", descricao: "", permissoes: emptyPermissoes() });
                setErro(null);
                setShowModal(true);
              }}
            >
              + Novo Grupo
            </PrimaryButton>
          }
        />

        <Card>
          <CardBody noPadding>
            {loading ? (
              <p className="text-slate-400 text-center py-10 text-sm">Carregando grupos...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Nome do Grupo</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-center">Admins Vinculados</th>
                      <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {grupos.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          {g.nome}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs">{g.descricao || "—"}</td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md text-xs font-bold">
                            {g.total_admins || 0} admins
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <SecondaryButton
                              size="sm"
                              variant="subtle"
                              onClick={() => openAdminsModal(g.id)}
                            >
                              👥 Admins
                            </SecondaryButton>
                            <SecondaryButton
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(g)}
                            >
                              Editar
                            </SecondaryButton>
                            <SecondaryButton
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(g.id)}
                            >
                              Excluir
                            </SecondaryButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {grupos.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-slate-400 text-sm">
                          Nenhum grupo de permissão cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Modal Criar/Editar Grupo */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editId ? "Editar Grupo de Permissão" : "Novo Grupo de Permissão"}
          description="Defina o nome e as permissões de acesso aos módulos do sistema"
          maxWidth="2xl"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setShowModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={handleSubmit} loading={salvando}>
                {editId ? "Salvar Alterações" : "Criar Grupo"}
              </PrimaryButton>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="text-red-700 text-xs font-medium bg-red-50 border border-red-200 p-3 rounded-xl">
                {erro}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Nome do Grupo *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="ds-input"
                  placeholder="Ex: Suporte Técnico"
                />
              </div>
              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="ds-input"
                  placeholder="Descrição das responsabilidades do grupo"
                />
              </div>
            </div>

            {/* Grid de Permissões */}
            <div className="pt-2">
              <h4 className="text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-2">Permissões por Módulo</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 bg-white">
                      <th className="text-left px-4 py-2.5 font-bold uppercase tracking-wide">Módulo</th>
                      {ACOES.map((a) => (
                        <th key={a} className="text-center px-2 py-2.5 font-bold uppercase tracking-wide cursor-pointer hover:text-[#2563eb]" onClick={() => toggleAllAcao(a)}>
                          {ACOES_LABELS[a]}
                        </th>
                      ))}
                      <th className="text-center px-2 py-2.5 font-bold uppercase tracking-wide text-slate-400">Todos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {form.permissoes.map((p) => (
                      <tr key={p.modulo} className="hover:bg-slate-100/50 transition-colors">
                        <td className="px-4 py-2 text-slate-900 font-semibold">{MODULOS_LABELS[p.modulo] || p.modulo}</td>
                        {ACOES.map((a) => (
                          <td key={a} className="text-center px-2 py-2">
                            <input
                              type="checkbox"
                              checked={p[a]}
                              onChange={() => togglePerm(p.modulo, a)}
                              className="w-4 h-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
                            />
                          </td>
                        ))}
                        <td className="text-center px-2 py-2">
                          <button
                            type="button"
                            onClick={() => toggleAllModulo(p.modulo)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                              ACOES.every((a) => p[a])
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            }`}
                          >
                            {ACOES.every((a) => p[a]) ? "✓" : "—"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </Modal>

        {/* Modal Admins do Grupo */}
        <Modal
          isOpen={!!showAdminsModal}
          onClose={() => setShowAdminsModal(null)}
          title="Admins Vinculados ao Grupo"
          description="Adicione ou remova administradores deste grupo de permissão"
          maxWidth="lg"
          footer={
            <div className="flex justify-end">
              <SecondaryButton onClick={() => setShowAdminsModal(null)}>
                Fechar
              </SecondaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {adminsGrupo.length === 0 && <p className="text-slate-400 text-xs py-2">Nenhum administrador vinculado a este grupo.</p>}
              {adminsGrupo.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-slate-900 text-xs font-bold">{a.nome || a.email}</p>
                    <p className="text-slate-500 text-[11px]">{a.email} · <span className="text-[#2563eb] font-semibold">{a.role}</span></p>
                  </div>
                  <SecondaryButton
                    size="sm"
                    variant="danger"
                    onClick={() => desvincularAdmin(a.id)}
                  >
                    Remover
                  </SecondaryButton>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-2">Vincular Novo Administrador</h4>
              <div className="flex gap-2">
                <select
                  value={adminSelecionado}
                  onChange={(e) => setAdminSelecionado(e.target.value)}
                  className="flex-1 bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#2563eb]"
                >
                  <option value="">Selecione um administrador...</option>
                  {todosAdmins.filter((a) => !adminsGrupo.find((ag) => ag.id === a.id)).map((a) => (
                    <option key={a.id} value={a.id}>{a.nome || a.email} ({a.role})</option>
                  ))}
                </select>
                <PrimaryButton size="sm" onClick={vincularAdmin}>
                  + Vincular
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
