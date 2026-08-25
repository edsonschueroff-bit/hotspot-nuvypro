import React, { useEffect, useState } from "react";
import { redirecionarHotspot } from "../../utils/hotspotRedirect";
import LanguageSelector from "../../components/ui/LanguageSelector";
import { translations, getInitialLanguage } from "../../utils/i18n";
import { Ticket, KeyRound, Wifi, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginHotspot() {
  const [tipoLogin, setTipoLogin] = useState("voucher"); // "voucher" | "usuario"
  const [voucherCodigo, setVoucherCodigo] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    mac: "",
    ip: "",
  });

  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mikrotikId, setMikrotikId] = useState("");
  const [cfg, setCfg] = useState({});
  const [lang, setLang] = useState(getInitialLanguage());
  const t = translations[lang] || translations.pt;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mac = params.get("mac") || "";
    const ip = params.get("ip") || "";
    const mtkId = params.get("mikrotik_id") || "";
    const voucherParam = params.get("voucher") || params.get("code") || "";
    
    setForm((prev) => ({ ...prev, mac, ip }));
    setMikrotikId(mtkId);

    if (voucherParam) {
      setVoucherCodigo(voucherParam.toUpperCase());
      setTipoLogin("voucher");
    }
    
    const empId = params.get("empresa_id");
    if (empId) {
      fetch(`/api/portal-config/login?empresa_id=${empId}`)
        .then(r => r.json()).then(setCfg).catch(() => {});
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleLoginVoucher = async (e) => {
    e.preventDefault();
    setMensagem(null);
    setErro(null);

    const codigo = voucherCodigo.trim().toUpperCase();
    if (!codigo) {
      setErro("Por favor, digite o código do seu voucher.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/login-portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: codigo,
          password: codigo,
          mac: form.mac,
          ip: form.ip,
          mikrotik_id: mikrotikId || 1
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Voucher inválido ou expirado");

      setMensagem("Voucher validado! Conectando à internet...");

      if (data.gateway && data.username) {
        redirecionarHotspot(data.gateway, data.username, codigo, 1500);
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleLoginUsuario = async (e) => {
    e.preventDefault();
    setMensagem(null);
    setErro(null);

    if (!form.username || !form.password) { 
      setErro("Informe usuário e senha"); 
      return; 
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/login-portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mikrotik_id: mikrotikId || 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Usuário ou senha incorretos");

      setMensagem("Autenticado com sucesso! Liberando acesso...");

      if (data.gateway && data.username) {
        redirecionarHotspot(data.gateway, data.username, form.password, 1500);
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const bgStyle = cfg.cor_fundo_1 ? { background: `linear-gradient(135deg, ${cfg.cor_fundo_1}, ${cfg.cor_fundo_2 || cfg.cor_fundo_1})` } : undefined;
  const btnStyle = cfg.cor_botao ? { backgroundColor: cfg.cor_botao } : undefined;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center text-white px-4 py-8 ${!bgStyle ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900' : ''}`} style={bgStyle}>
      <div className="w-full max-w-md space-y-4">
        {/* Seletor de Idiomas */}
        <div className="flex justify-center">
          <LanguageSelector currentLang={lang} onLangChange={setLang} />
        </div>

        {/* Header */}
        <div className="text-center animate-fade-in space-y-2">
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt="Logo" className="max-h-16 mx-auto mb-2" />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl mb-1 border border-white/20 shadow-lg text-white">
              <Wifi className="w-7 h-7" />
            </div>
          )}
          <h1 className="text-2xl font-black tracking-tight">{cfg.titulo || t.welcome}</h1>
          <p className="text-blue-200/80 text-xs max-w-xs mx-auto">{cfg.subtitulo || "Digite seu voucher de acesso ou credenciais para navegar"}</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white text-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-md animate-fade-in space-y-5">
          {/* Abas de Seleção: Voucher vs Usuário */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setTipoLogin("voucher"); setErro(null); }}
              className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${tipoLogin === "voucher" ? "bg-white text-[#2563eb] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Ticket className="w-4 h-4" />
              <span>Voucher / Cupom</span>
            </button>
            <button
              type="button"
              onClick={() => { setTipoLogin("usuario"); setErro(null); }}
              className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${tipoLogin === "usuario" ? "bg-white text-[#2563eb] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Usuário e Senha</span>
            </button>
          </div>

          {/* Alertas */}
          {mensagem && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>{mensagem}</span>
            </div>
          )}

          {erro && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{erro}</span>
            </div>
          )}

          {/* FORMULÁRIO 1: VOUCHER ÚNICO (Opção B) */}
          {tipoLogin === "voucher" ? (
            <form onSubmit={handleLoginVoucher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Código do Voucher (Cupom)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={voucherCodigo}
                    onChange={(e) => setVoucherCodigo(e.target.value.toUpperCase())}
                    placeholder="Ex: WIFI-8X92"
                    className="w-full text-center text-lg tracking-[0.2em] font-mono font-black border-2 border-blue-100 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 rounded-2xl py-3.5 bg-slate-50 text-slate-900 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Código impresso na sua filipeta ou adquirido no balcão
                </p>
              </div>

              <button
                type="submit"
                disabled={enviando || !voucherCodigo.trim()}
                className="w-full py-3.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                style={btnStyle}
              >
                {enviando ? "Conectando..." : "Liberar Acesso com Voucher"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* FORMULÁRIO 2: USUÁRIO E SENHA */
            <form onSubmit={handleLoginUsuario} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Usuário</label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Seu usuário"
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Senha</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Sua senha"
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-3.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                style={btnStyle}
              >
                {enviando ? "Autenticando..." : (cfg.texto_botao || "Entrar no Wi-Fi")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Links e Rodapé */}
          {cfg.link_portal_url && cfg.link_texto_link && (
            <div className="text-center pt-2">
              <a
                href="#"
                className="text-xs text-[#2563eb] font-bold hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  const params = new URLSearchParams(window.location.search);
                  if (cfg.link_portal_id) params.set("portal_id", cfg.link_portal_id);
                  window.location.href = cfg.link_portal_url + "?" + params.toString();
                }}
              >
                {cfg.link_texto_link}
              </a>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              🔒 {cfg.texto_rodape || "Conexão criptografada e protegida por NuvyCore Hotspot"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
