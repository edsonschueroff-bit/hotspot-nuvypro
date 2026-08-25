import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DEFAULT_BRANDING = {
  nome_sistema: 'Nuvy Pro',
  slogan: 'Gestão Inteligente de Wi-Fi, Marketing & Fidelização de Clientes',
  logo_url: '/nuvycore.svg',
  favicon_url: null,
  texto_rodape: 'Tecnologia Nuvy Pro',
  cor_primaria: '#2563eb'
};

const BrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  loading: true,
  refreshBranding: async () => {}
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(() => {
    try {
      const saved = localStorage.getItem('nuvycore_branding');
      return saved ? JSON.parse(saved) : DEFAULT_BRANDING;
    } catch {
      return DEFAULT_BRANDING;
    }
  });
  const [loading, setLoading] = useState(true);

  const applyFavicon = (url) => {
    if (!url) return;
    try {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = url;
    } catch (e) {
      console.warn('Erro ao atualizar favicon:', e);
    }
  };

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/public/branding');
      if (res.ok) {
        const data = await res.json();
        const merged = { ...DEFAULT_BRANDING, ...data };
        setBranding(merged);
        localStorage.setItem('nuvycore_branding', JSON.stringify(merged));
        if (merged.favicon_url) {
          applyFavicon(merged.favicon_url);
        }
      }
    } catch (err) {
      console.warn('Não foi possível carregar branding público:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
