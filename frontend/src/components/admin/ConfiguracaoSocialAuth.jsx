import React, { useEffect, useState } from "react";

export default function ConfiguracaoSocialAuth() {
  const [form, setForm] = useState({
    google_enabled: true,
    google_client_id: "",
    google_client_secret: "",
    facebook_enabled: true,
    facebook_app_id: "",
    facebook_app_secret: "",
    ativo: true
  });

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/empresa-config/oauth", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setForm(prev => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);

    try {
      const res = await fetch("/api/empresa-config/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setMsg({ tipo: "sucesso", texto: "Configurações salvas com sucesso!" });
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Erro ao salvar");
      }
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  const scriptWalledGarden = `/ip hotspot walled-garden
add dst-host=*google.com
add dst-host=*googleapis.com
add dst-host=*gstatic.com
add dst-host=*facebook.com
add dst-host=*fbcdn.net
add dst-host=*connect.facebook.net`;

  const copiarScript = () => {
    navigator.clipboard.writeText(scriptWalledGarden);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Autenticação Social (Google & Facebook)</h2>
            <p className="text-xs text-slate-500 mt-1">Configure o login em 1 clique para os seus portais de acesso Wi-Fi</p>
          </div>
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            OAuth 2.0
          </span>
        </div>

        {msg && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${msg.tipo === "sucesso" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
            {msg.tipo === "sucesso" ? "✅" : "⚠️"} {msg.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção Google */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Google Sign-In / One Tap</h3>
                  <p className="text-xs text-slate-500">Permite login com contas @gmail.com ou Google Workspace</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.google_enabled}
                  onChange={(e) => setForm({ ...form, google_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-checked:bg-blue-600 rounded-full peer transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>

            {form.google_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Google Client ID</label>
                  <input
                    type="text"
                    placeholder="Ex: 123456789-abc.apps.googleusercontent.com"
                    value={form.google_client_id}
                    onChange={(e) => setForm({ ...form, google_client_id: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 bg-white ${form.google_client_id.includes("@") ? "border-amber-500 ring-1 ring-amber-500" : "border-slate-300"
                      }`}
                  />
                  {form.google_client_id.includes("@") ? (
                    <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                      ⚠️ Você inseriu um e-mail. O Client ID deve ser a chave gerada no Google Cloud no formato <i>...apps.googleusercontent.com</i>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Obtenha essa chave no Google Cloud Console (APIs & Credentials)</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Google Client Secret (Opcional)</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={form.google_client_secret}
                    onChange={(e) => setForm({ ...form, google_client_secret: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Seção Facebook */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1877F2] text-white shadow-sm flex items-center justify-center">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Facebook Login</h3>
                  <p className="text-xs text-slate-500">Permite login via aplicativo e contas Meta</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.facebook_enabled}
                  onChange={(e) => setForm({ ...form, facebook_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-checked:bg-blue-600 rounded-full peer transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>

            {form.facebook_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Facebook App ID</label>
                  <input
                    type="text"
                    placeholder="Ex: 987654321012345"
                    value={form.facebook_app_id}
                    onChange={(e) => setForm({ ...form, facebook_app_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Facebook App Secret</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={form.facebook_app_secret}
                    onChange={(e) => setForm({ ...form, facebook_app_secret: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-md shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 text-sm"
            >
              {salvando ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>
      </div>

      {/* Card Instruções Walled Garden MikroTik */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📡</span> Walled Garden MikroTik (Liberar Redes Sociais no RouterOS)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cole este comando no <strong>Terminal do MikroTik</strong> para que os clientes consigam abrir as telas de login do Google e Facebook antes de estarem autenticados:
            </p>
          </div>
          <button
            type="button"
            onClick={copiarScript}
            className="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            {copiado ? "Copiado! ✓" : "Copiar Script"}
          </button>
        </div>

        <pre className="p-4 rounded-lg bg-black/50 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
          {scriptWalledGarden}
        </pre>
      </div>
    </div>
  );
}
