import React, { useEffect, useState } from "react";
import { redirecionarHotspot } from "../../utils/hotspotRedirect";

export default function LoginSocial() {
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [mikrotikId, setMikrotikId] = useState("");
  const [empresaId, setEmpresaId] = useState("");

  const [cfg, setCfg] = useState({});
  const [oauthCfg, setOauthCfg] = useState({
    google_enabled: true,
    google_client_id: "",
    facebook_enabled: true,
    facebook_app_id: ""
  });

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ nome: "", emailOuTel: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mac") || "";
    const i = params.get("ip") || "";
    const mtk = params.get("mikrotik_id") || "";
    const emp = params.get("empresa_id") || "";

    setMac(m);
    setIp(i);
    setMikrotikId(mtk);
    setEmpresaId(emp);

    // Carregar configurações visuais do portal
    if (emp) {
      fetch(`/api/portal-config/social?empresa_id=${emp}`)
        .then(r => r.json())
        .then(data => {
          if (data && Object.keys(data).length > 0) setCfg(data);
          else {
            fetch(`/api/portal-config/lgpd?empresa_id=${emp}`)
              .then(r2 => r2.json())
              .then(setCfg)
              .catch(() => { });
          }
        })
        .catch(() => { });
    }

    // Carregar configurações de OAuth (Google/Facebook Client IDs)
    fetch(`/api/auth/social/config?empresa_id=${emp}&mikrotik_id=${mtk}`)
      .then(r => r.json())
      .then(data => {
        if (data) setOauthCfg(data);
      })
      .catch(() => { });

    // ── VERIFICAR RETORNO DE REDIRECIONAMENTO OAUTH (#access_token=...) ──
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const hashParams = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = hashParams.get("access_token");
      const provider = sessionStorage.getItem("social_provider") || "google";

      if (accessToken) {
        setLoading(true);
        setMensagem(`Validando conta no ${provider === "google" ? "Google" : "Facebook"} e capturando dados...`);

        if (provider === "google") {
          processarLoginGoogle(null, accessToken, null, m, i, mtk);
        } else {
          processarLoginFacebook(accessToken, null, m, i, mtk);
        }
      }
    }
  }, []);

  // ── PROCESSAR LOGIN GOOGLE NO BACKEND ──
  const processarLoginGoogle = async (credential, accessToken, userInfo, m = mac, i = ip, mtk = mikrotikId) => {
    try {
      setLoading(true);
      setMensagem("Capturando dados do Google e liberando o Wi-Fi...");

      const res = await fetch("/api/auth/social/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          accessToken,
          userInfo,
          mac: m || mac,
          ip: i || ip,
          mikrotik_id: mtk || mikrotikId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Falha ao validar conta Google");
      }

      setMensagem("Conta Google validada com sucesso! Conectando...");
      if (data.gateway && data.username) {
        redirecionarHotspot(data.gateway, data.username, data.password, 1500);
      }
    } catch (err) {
      setErro(err.message);
      setLoading(false);
      setMensagem(null);
    }
  };

  // ── PROCESSAR LOGIN FACEBOOK NO BACKEND ──
  const processarLoginFacebook = async (accessToken, userInfo, m = mac, i = ip, mtk = mikrotikId) => {
    try {
      setLoading(true);
      setMensagem("Capturando dados do Facebook e liberando o Wi-Fi...");

      const res = await fetch("/api/auth/social/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          userInfo,
          mac: m || mac,
          ip: i || ip,
          mikrotik_id: mtk || mikrotikId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Falha ao validar conta Facebook");
      }

      setMensagem("Conta Facebook validada com sucesso! Conectando...");
      if (data.gateway && data.username) {
        redirecionarHotspot(data.gateway, data.username, data.password, 1500);
      }
    } catch (err) {
      setErro(err.message);
      setLoading(false);
      setMensagem(null);
    }
  };

  // ── BOTÃO 1-CLIQUE GOOGLE ──
  const handleGoogleLogin = () => {
    setErro(null);

    const clientId = oauthCfg.google_client_id;
    if (!clientId) {
      setErro("O Google Client ID ainda não foi configurado pelo administrador no painel.");
      return;
    }

    if (clientId.includes("@")) {
      setErro("O Google Client ID cadastrado no painel é um e-mail. É necessário cadastrar a chave API gerada no Google Cloud (no formato: 12345...apps.googleusercontent.com).");
      return;
    }

    setLoading(true);
    setMensagem("Redirecionando para o Google...");
    sessionStorage.setItem("social_provider", "google");

    const redirectUri = window.location.origin + window.location.pathname + window.location.search;
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent("openid profile email")}`;

    window.location.href = googleUrl;
  };

  // ── BOTÃO 1-CLIQUE FACEBOOK ──
  const handleFacebookLogin = () => {
    setErro(null);

    const appId = oauthCfg.facebook_app_id;
    if (!appId) {
      setErro("O Facebook App ID ainda não foi configurado pelo administrador no painel.");
      return;
    }

    setLoading(true);
    setMensagem("Redirecionando para o Facebook...");
    sessionStorage.setItem("social_provider", "facebook");

    const redirectUri = window.location.origin + window.location.pathname + window.location.search;
    const fbUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email,public_profile`;

    window.location.href = fbUrl;
  };

  // ── ENTRADA MANUAL (OPCIONAL/FALLBACK) ──
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.nome.trim()) {
      setErro("Por favor, informe seu nome.");
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem("Conectando como visitante...");

    try {
      const isEmail = manualForm.emailOuTel.includes("@");
      const userInfo = {
        name: manualForm.nome.trim(),
        email: isEmail ? manualForm.emailOuTel.trim() : null,
        telefone: !isEmail ? manualForm.emailOuTel.trim() : null
      };

      await processarLoginGoogle(null, null, userInfo);
    } catch (err) {
      setErro(err.message);
      setLoading(false);
      setMensagem(null);
    }
  };

  const bgStyle = cfg.cor_fundo_1
    ? { background: `linear-gradient(135deg, ${cfg.cor_fundo_1}, ${cfg.cor_fundo_2 || cfg.cor_fundo_1})` }
    : undefined;

  return (
    <div
      className={`min-h-screen flex items-center justify-center text-white px-4 py-8 ${!bgStyle ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900' : ''}`}
      style={bgStyle}
    >
      <div className="w-full max-w-md">
        {/* Header com Logo e Títulos */}
        <div className="text-center mb-8 animate-fade-in">
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt="Logo" className="max-h-20 mx-auto mb-6 object-contain drop-shadow-md" />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20 shadow-lg">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white drop-shadow-sm">
            {cfg.titulo || "Wi-Fi de Alta Velocidade"}
          </h1>
          <p className="text-slate-300 text-sm max-w-xs mx-auto">
            {cfg.subtitulo || "Conecte-se instantaneamente usando sua conta ou rede social preferida"}
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white/95 backdrop-blur-md text-slate-800 p-7 md:p-8 rounded-2xl shadow-2xl border border-white/40 animate-fade-in">

          {/* Mensagens de Sucesso ou Erro */}
          {mensagem && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{mensagem}</span>
            </div>
          )}

          {erro && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{erro}</span>
            </div>
          )}

          {/* Botões de Login Social (1-Clique OAuth) */}
          {!showManual ? (
            <div className="space-y-4">
              {oauthCfg.google_enabled && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border border-slate-300 rounded-md font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continuar com Google</span>
                </button>
              )}

              {oauthCfg.facebook_enabled && (
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-md font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continuar com Facebook</span>
                </button>
              )}

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ou</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="w-full text-center py-2.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
              >
                Conectar com e-mail ou telefone sem rede social
              </button>
            </div>
          ) : (
            /* Formulário Manual (Apenas para quem optar por não usar rede social) */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Seu Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={manualForm.nome}
                  onChange={(e) => setManualForm({ ...manualForm, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">E-mail ou WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="email@exemplo.com ou (11) 99999-9999"
                  value={manualForm.emailOuTel}
                  onChange={(e) => setManualForm({ ...manualForm, emailOuTel: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3.5 rounded-md shadow-md transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Liberando Acesso..." : "Conectar Agora"}
              </button>

              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="w-full text-center py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                ← Voltar para redes sociais
              </button>
            </form>
          )}

          {/* Footer LGPD */}
          <p className="text-[11px] text-center text-slate-400 mt-6 leading-relaxed">
            {cfg.texto_rodape || "Ao conectar, você autoriza o acesso ao Wi-Fi em conformidade com a LGPD e o Marco Civil da Internet."}
          </p>
        </div>

        {/* Rodapé institucional */}
        <div className="text-center mt-6 text-xs text-white/60">
          Powered by <span className="font-semibold text-white/80">Hotspot Wi-Fi</span>
        </div>
      </div>
    </div>
  );
}
