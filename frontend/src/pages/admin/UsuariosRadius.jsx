// frontend/src/pages/admin/UsuariosRadius.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminLayout from "@/components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal } from "@/components/ui";

const UsuariosRadius = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [planos, setPlanos] = useState([]);
  const [planoSelecionado, setPlanoSelecionado] = useState("");
  const [status, setStatus] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const token = localStorage.getItem("admin_token");

  const carregarUsuarios = async () => {
    try {
      const res = await axios.get("/api/radius/usuarios", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch {
      setStatus("Erro ao carregar usuários.");
    }
  };

  useEffect(() => {
    axios.get("/api/planos", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setPlanos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setStatus("Erro ao carregar planos."));

    carregarUsuarios();
  }, [token]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      return alert("Informe usuário e senha");
    }
    setSalvando(true);
    try {
      await axios.post("/api/radius/criar-usuario", { username, password }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (planoSelecionado) {
        await axios.post("/api/radius/vincular-plano", {
          username,
          planoId: planoSelecionado
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setStatus("Usuário criado e plano vinculado com sucesso!");
      setUsername("");
      setPassword("");
      setPlanoSelecionado("");
      setMostrarModal(false);
      carregarUsuarios();
    } catch (err) {
      setStatus("Erro ao criar usuário ou vincular plano.");
      alert("Erro ao criar usuário no RADIUS.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (userToDelete) => {
    if (window.confirm(`Tem certeza que deseja remover o usuário ${userToDelete}?`)) {
      try {
        await axios.delete(`/api/radius/usuarios/${userToDelete}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        carregarUsuarios();
      } catch {
        alert("Erro ao deletar usuário");
      }
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          title="Usuários RADIUS"
          subtitle="Gerencie credenciais e vinculação de planos de acesso direto ao FreeRADIUS"
          actions={
            <PrimaryButton
              onClick={() => {
                setUsername("");
                setPassword("");
                setPlanoSelecionado("");
                setMostrarModal(true);
              }}
            >
              + Novo Usuário
            </PrimaryButton>
          }
        />

        <Card>
          <CardBody noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Senha</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Plano</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">NAS (MikroTik)</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {usuarios.map((u, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-900 font-semibold">{u.username}</td>
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{u.value}</td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">
                        {u.plano ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#2563eb] text-xs font-bold border border-blue-200/60">
                            {u.plano}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 text-xs">{u.nas || "—"}</td>
                      <td className="px-6 py-3.5 text-right">
                        <SecondaryButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeletar(u.username)}
                        >
                          Excluir
                        </SecondaryButton>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-sm">
                        Nenhum usuário RADIUS cadastrado no momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Modal
          isOpen={mostrarModal}
          onClose={() => setMostrarModal(false)}
          title="Novo Usuário RADIUS"
          description="Cadastre as credenciais e selecione o plano de acesso"
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setMostrarModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton onClick={handleSubmit} loading={salvando}>
                Salvar Usuário
              </PrimaryButton>
            </div>
          }
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                Nome de Usuário *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: cliente01 ou CPF"
                className="ds-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                Senha de Acesso *
              </label>
              <input
                type="password"
                required
                placeholder="Senha de conexão Wi-Fi"
                className="ds-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">
                Vincular a um Plano (Velocidade & Limite)
              </label>
              <select
                className="ds-input"
                value={planoSelecionado}
                onChange={e => setPlanoSelecionado(e.target.value)}
              >
                <option value="">-- Selecione um Plano (Opcional) --</option>
                {planos.map(plano => (
                  <option key={plano.id} value={plano.id}>{plano.nome}</option>
                ))}
              </select>
            </div>

            {status && (
              <p className="text-xs text-slate-500 mt-2">{status}</p>
            )}
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default UsuariosRadius;
