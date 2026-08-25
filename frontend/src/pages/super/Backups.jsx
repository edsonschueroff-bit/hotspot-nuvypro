import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";

export default function Backups() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

  const [emailConfig, setEmailConfig] = useState({
    ativo: false,
    email_destino: "contato@nuvycore.online",
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_pass: "",
    smtp_secure: false
  });
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate(`/admin/${user?.empresa_slug || "default"}`);
      return;
    }
    fetchBackups();
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-backup/email-config", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailConfig(data);
      }
    } catch (err) {
      console.error("Erro ao carregar configuração de e-mail:", err);
    }
  };

  const handleSaveEmailConfig = async (e) => {
    e.preventDefault();
    setSavingEmailConfig(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-backup/email-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(emailConfig)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "✅ Configurações de e-mail de backup salvas com sucesso!" });
      } else {
        setMessage({ type: "error", text: data.message || "Erro ao salvar e-mail de backup." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao salvar e-mail: " + err.message });
    } finally {
      setSavingEmailConfig(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-backup/test-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "📧 " + data.message });
      } else {
        setMessage({ type: "error", text: "❌ " + (data.message || "Erro ao testar envio de e-mail.") });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao testar e-mail: " + err.message });
    } finally {
      setTestingEmail(false);
    }
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-backup", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data) ? data : data.backups || []);
      } else {
        setMessage({ type: "error", text: "Erro ao carregar backups." });
      }
    } catch (err) {
      console.error("Erro ao buscar backups:", err);
      setMessage({ type: "error", text: "Erro de conexão ao buscar backups." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-backup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Backup criado com sucesso!" });
        fetchBackups();
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao criar backup." });
      }
    } catch (err) {
      console.error("Erro ao criar backup:", err);
      setMessage({ type: "error", text: "Erro de conexão ao criar backup." });
    } finally {
      setActionLoading(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".tar.gz")) {
      alert("Por favor, selecione um arquivo válido no formato .tar.gz");
      return;
    }

    const formData = new FormData();
    formData.append("backup_file", file);

    setUploading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-backup/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `✅ Arquivo "${data.filename}" enviado com sucesso (${data.tamanho_mb} MB)! Você já pode utilizá-lo para restaurar o sistema.`,
        });
        fetchBackups();
      } else {
        setMessage({ type: "error", text: data.message || "Erro ao enviar o arquivo de backup." });
      }
    } catch (err) {
      console.error("Erro ao enviar arquivo:", err);
      setMessage({ type: "error", text: "Erro ao enviar arquivo: " + err.message });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleRestore = async (backup) => {
    const filename = backup.filename || backup.id;
    const confirmed = confirm(
      `⚠️ ATENÇÃO CRÍTICA - RESTAURAÇÃO DO SISTEMA!\n\nTem certeza que deseja restaurar a plataforma utilizando o arquivo:\n"${filename}"?\n\n• O banco de dados MySQL atual será SOBRESCRITO pelos dados do backup.\n• As configurações de uploads e n8n serão restauradas.\n• O servidor reiniciará automaticamente após a conclusão.\n\nDeseja prosseguir?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/system-backup/restore/${filename}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: "🔄 Restauração realizada com sucesso! O servidor está aplicando as alterações e reiniciando. A página será atualizada em 8 segundos...",
        });
        setTimeout(() => {
          window.location.reload();
        }, 8000);
      } else {
        setMessage({ type: "error", text: data.message || data.error || "Erro ao restaurar backup." });
      }
    } catch (err) {
      console.error("Erro ao restaurar backup:", err);
      setMessage({ type: "error", text: "Erro de conexão durante a restauração: " + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (backup) => {
    const filename = backup.filename || backup.id;
    const confirmed = confirm(
      `Tem certeza que deseja remover o backup "${filename}"?\n\nEsta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/system-backup/${filename}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Backup removido com sucesso!" });
        fetchBackups();
      } else {
        setMessage({ type: "error", text: data.message || data.error || "Erro ao remover backup." });
      }
    } catch (err) {
      console.error("Erro ao remover backup:", err);
      setMessage({ type: "error", text: "Erro de conexão ao remover backup." });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handleDownload = (backup) => {
    const filename = backup.filename || backup.id;
    if (!filename) return;
    const token = localStorage.getItem("admin_token");
    window.open(`/api/system-backup/download/${filename}?token=${token}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f8fafc] text-slate-700 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>💾</span> Backups & Segurança do Sistema
              </h1>
              <p className="text-slate-500 mt-1">Gerencie os backups automatizados, faça upload de arquivos externos e restaure o sistema em 1-clique</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateBackup}
                disabled={actionLoading || uploading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <span>{actionLoading ? "⏳" : "⚡"}</span>
                <span>{actionLoading ? "Gerando Backup..." : "Gerar Backup Agora"}</span>
              </button>
            </div>
          </div>

          {/* Bloco de Upload do Computador */}
          <div className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-[10px] p-6 mb-8 transition-all shadow-sm text-center">
            <div className="max-w-xl mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto text-xl font-bold">
                📤
              </div>
              <h3 className="text-base font-bold text-slate-900">Restaurar de um Backup Externo (Do seu PC)</h3>
              <p className="text-xs text-slate-500">
                Caso possua um arquivo de backup baixado previamente em seu computador (formato <code className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">.tar.gz</code>), faça o envio abaixo para importá-lo ao servidor e restaurar o sistema.
              </p>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all">
                  <span>{uploading ? "⏳ Enviando Arquivo..." : "📁 Selecionar Arquivo de Backup (.tar.gz)"}</span>
                  <input
                    type="file"
                    accept=".tar.gz,.gz"
                    disabled={uploading || actionLoading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Cards Informativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rotina Automática</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-green-100 text-green-700 font-bold">ATIVA</span>
              </div>
              <p className="text-xl font-bold text-slate-800 mt-2">Todos os dias às 03:00</p>
              <p className="text-xs text-slate-500 mt-1">Notificação enviada direto no WhatsApp NuvyCore</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Política de Retenção</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-700 font-bold">15 DIAS</span>
              </div>
              <p className="text-xl font-bold text-slate-800 mt-2">Exclusão Automática</p>
              <p className="text-xs text-slate-500 mt-1">Mantém os backups dos últimos 15 dias salvos</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-[10px] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Arquivos</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] font-bold">{backups.length} DISPONÍVEIS</span>
              </div>
              <p className="text-xl font-bold text-slate-800 mt-2">
                {backups.reduce((acc, b) => acc + (parseFloat(b.tamanho_mb) || 0), 0).toFixed(2)} MB
              </p>
              <p className="text-xs text-slate-500 mt-1">Comprimidos com MySQL + n8n + Uploads</p>
            </div>
          </div>

          {/* Card de Configuração de E-mail de Backup */}
          <div className="bg-white border border-slate-200 rounded-[10px] p-6 mb-8 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>✉️</span> Envio Automático por E-mail (Notificação & Cópia)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Receba uma cópia de segurança no seu e-mail a cada backup executado</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailConfig.ativo}
                    onChange={(e) => setEmailConfig({ ...emailConfig, ativo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-xs font-bold text-slate-700">
                    {emailConfig.ativo ? "ENVIO POR E-MAIL ATIVO" : "DESATIVADO"}
                  </span>
                </label>
              </div>
            </div>

            <form onSubmit={handleSaveEmailConfig} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail de Destino (Para onde enviar o backup)</label>
                  <input
                    type="email"
                    required
                    value={emailConfig.email_destino}
                    onChange={(e) => setEmailConfig({ ...emailConfig, email_destino: e.target.value })}
                    placeholder="contato@nuvycore.online"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Servidor SMTP (Host)</label>
                  <input
                    type="text"
                    value={emailConfig.smtp_host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                    placeholder="ex: smtp.gmail.com ou mail.nuvycore.online"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Usuário SMTP (E-mail de Envio)</label>
                  <input
                    type="text"
                    value={emailConfig.smtp_user}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                    placeholder="ex: notificacoes@nuvycore.online"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Senha SMTP</label>
                  <input
                    type="password"
                    value={emailConfig.smtp_pass}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Porta SMTP</label>
                  <input
                    type="number"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                    placeholder="587 ou 465"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailConfig.smtp_secure}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_secure: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Usar SSL/TLS Seguro (Porta 465)</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e2e8f0] pt-4">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail || savingEmailConfig}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{testingEmail ? "⏳ Enviando..." : "🧪 Enviar E-mail de Teste"}</span>
                </button>
                <button
                  type="submit"
                  disabled={savingEmailConfig || testingEmail}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>💾 Salvar Configurações de E-mail</span>
                </button>
              </div>
            </form>
          </div>

          {/* Status message */}
          {message && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg border text-sm font-medium ${message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
                }`}
            >
              {message.text}
            </div>
          )}

          {/* Backup list */}
          {loading ? (
            <p className="text-slate-400">Carregando backups...</p>
          ) : backups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
              <p className="text-slate-400 text-lg">Nenhum backup gerado ou enviado ainda.</p>
              <p className="text-slate-600 text-sm mt-2">
                Clique em "Gerar Backup Agora" ou faça o upload de um arquivo `.tar.gz`.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-slate-500 uppercase text-[11px] font-bold">
                    <th className="text-left p-4">Arquivo</th>
                    <th className="text-left p-4">Data / Hora</th>
                    <th className="text-center p-4">Tamanho</th>
                    <th className="text-center p-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {backups.map((backup, idx) => {
                    return (
                      <tr
                        key={backup.filename || backup.id || idx}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="p-4 font-mono text-slate-800 text-xs font-semibold">
                          📦 {backup.filename || `backup_hotspot_${backup.id}.tar.gz`}
                        </td>
                        <td className="p-4 text-slate-600">
                          {formatDate(backup.criado_em || backup.created_at || backup.date)}
                        </td>
                        <td className="p-4 text-center text-slate-700 font-semibold">
                          {backup.tamanho_mb ? `${backup.tamanho_mb} MB` : "—"}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDownload(backup)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>📥</span> Download
                            </button>
                            <button
                              onClick={() => handleRestore(backup)}
                              disabled={actionLoading || uploading}
                              className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 rounded font-semibold text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                              <span>🔄</span> Restaurar
                            </button>
                            <button
                              onClick={() => handleDelete(backup)}
                              disabled={actionLoading || uploading}
                              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded font-semibold text-xs transition cursor-pointer disabled:opacity-40"
                            >
                              <span>🗑️</span> Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Emergency info */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
            <p className="text-amber-800 font-bold text-sm mb-1 flex items-center gap-1.5">
              <span>🚨</span> Acesso de Emergência
            </p>
            <p className="text-amber-700 text-xs">
              Se o frontend estiver inacessível após qualquer evento no servidor, utilize o portal de emergência direto na porta 3001:
            </p>
            <code className="block mt-2 bg-white border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded font-mono font-bold">
              http://{window.location.hostname}:3001/emergency
            </code>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}