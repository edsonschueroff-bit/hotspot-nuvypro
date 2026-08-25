import React, { useState, useEffect } from "react";
import { useBranding } from "../../contexts/BrandingContext";

export default function PwaInstallPrompt() {
  const { branding } = useBranding();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    // 1. Checa se já está rodando como app standalone (PWA instalado)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setInstalado(true);
      return;
    }

    // 2. Checa se usuário dispensou recentemente (7 dias)
    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedAt) {
      const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        return;
      }
    }

    // 3. Detectar iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. Capturar evento nativo do Chrome / Android
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisivel(true);
    };

    const handleAppInstalled = () => {
      setInstalado(true);
      setVisivel(false);
      setDeferredPrompt(null);
    };

    const handleOpenCustom = () => {
      setVisivel(true);
      if (isIosDevice) {
        setShowIosGuide(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("spotnuvy:open-pwa-install", handleOpenCustom);

    // Se for iOS e estiver em mobile browser, exibe o prompt após 3 segundos
    if (isIosDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setVisivel(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("spotnuvy:open-pwa-install", handleOpenCustom);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisivel(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
    setVisivel(false);
  };

  if (instalado || !visivel) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900/95 text-white border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md p-1">
            <img
              src={branding?.favicon_url || branding?.logo_url || '/nuvycore.svg'}
              alt={branding?.nome_sistema || "SpotNuvy"}
              className="w-8 h-8 rounded-lg object-contain"
              onError={(e) => { e.currentTarget.src = '/nuvycore.svg'; }}
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                Instalar {branding?.nome_sistema || "SpotNuvy"} App
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
                title="Fechar"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Instale no seu celular para acesso em tela cheia ao Validador de Cupons no Balcão e Alertas.
            </p>
          </div>
        </div>

        {showIosGuide ? (
          <div className="mt-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-2 text-slate-300">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>🍏</span> Como instalar no iPhone (Safari):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com a seta para cima ⬆️ no rodapé do Safari).</li>
              <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> (➕).</li>
              <li>Toque em <strong>Adicionar</strong> no topo direito. Pronto!</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full text-center text-xs font-bold text-blue-400 hover:underline pt-1"
            >
              Fechar Guia
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Agora não
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📲</span>
              <span>Instalar Aplicativo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
