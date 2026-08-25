import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState([]);
  const [permissoes, setPermissoes] = useState({});

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        const decoded = parseJwt(token);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setUser({
            id: decoded.id,
            email: decoded.email,
            empresa_id: decoded.empresa_id,
            empresa_slug: decoded.empresa_slug || 'default',
            empresa_nome: decoded.empresa_nome,
            role: decoded.role || 'operator',
            nome: localStorage.getItem('user_nome') || null,
          });

          // Restaurar permissões do cache
          const cachedPerms = localStorage.getItem('user_permissoes');
          if (cachedPerms) {
            try { setPermissoes(JSON.parse(cachedPerms)); } catch { }
          }

          let loadedEmpresas = null;
          // Carregar empresas do usuário do cache
          const savedEmpresas = localStorage.getItem('user_empresas');
          if (savedEmpresas && savedEmpresas !== 'undefined') {
            try { loadedEmpresas = JSON.parse(savedEmpresas); } catch { }
          }

          // Se não tem no cache, busca na API (usuários antigos na transição)
          if (!loadedEmpresas || loadedEmpresas.length === 0) {
            try {
              const res = await fetch('/api/auth/me/empresas', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                loadedEmpresas = await res.json();
                localStorage.setItem('user_empresas', JSON.stringify(loadedEmpresas));
              }
            } catch (e) { console.error('Erro ao buscar empresas:', e); }
          }

          if (loadedEmpresas) {
            setEmpresas(loadedEmpresas);
          }
        } else {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('user_empresas');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = (token, userData, empresasList, permissoesData) => {
    localStorage.setItem('admin_token', token);
    const decoded = parseJwt(token);
    setUser({
      id: decoded.id,
      email: decoded.email,
      empresa_id: decoded.empresa_id,
      empresa_slug: decoded.empresa_slug || 'default',
      role: decoded.role || 'operator',
      nome: userData?.nome,
      empresa_nome: userData?.empresa_nome,
    });
    if (userData?.nome) localStorage.setItem('user_nome', userData.nome);
    if (empresasList) {
      setEmpresas(empresasList);
      localStorage.setItem('user_empresas', JSON.stringify(empresasList));
    }
    if (permissoesData) {
      setPermissoes(permissoesData);
      localStorage.setItem('user_permissoes', JSON.stringify(permissoesData));
    }
  };

  const switchEmpresa = async (empresaId) => {
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/auth/switch-empresa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ empresa_id: empresaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao trocar empresa');

      localStorage.setItem('admin_token', data.token);
      const decoded = parseJwt(data.token);
      setUser(prev => ({
        ...prev,
        empresa_id: decoded.empresa_id,
        empresa_slug: decoded.empresa_slug,
        empresa_nome: data.empresa.nome,
      }));
      if (data.empresas) {
        setEmpresas(data.empresas);
        localStorage.setItem('user_empresas', JSON.stringify(data.empresas));
      }
      return data.empresa;
    } catch (err) {
      console.error('Erro switchEmpresa:', err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user_empresas');
    localStorage.removeItem('user_permissoes');
    localStorage.removeItem('user_nome');
    setUser(null);
    setEmpresas([]);
    setPermissoes({});
  };

  const isSuperAdmin = user?.role === 'super_admin';

  const hasPermission = (modulo, acao = 'ver') => {
    if (isSuperAdmin) return true;

    // SaaS Plan Modules Firewall - Blocking access to modules not subscribed by the tenant
    const activeEmpresa = empresas.find(e => e.id === user?.empresa_id);
    if (activeEmpresa) {
      // Hotspot / Captive Portal ecosystem
      const hotspotModules = ['portais', 'campanhas', 'clientes', 'leads', 'radius', 'sessoes', 'sessoeslog', 'compliance', 'plaquinhas', 'configuracoes'];
      if (hotspotModules.includes(modulo) && activeEmpresa.mod_hotspot === 0) return false;

      // VPN / Remote Access ecosystem
      const vpnModules = ['mikrotiks', 'vpn'];
      if (vpnModules.includes(modulo) && activeEmpresa.mod_vpn === 0) return false;

      // CRM / AI WhatsApp ecosystem
      if ((modulo === 'crm' || modulo === 'whatsapp') && activeEmpresa.permite_automacao_whatsapp === 0) return false;

      // Vendas / PIX ecosystem
      if (modulo === 'pagamentos' && activeEmpresa.permite_portal_vendas === 0) return false;

      // Cupons require Vendas or Hotspot
      if (modulo === 'cupons' && activeEmpresa.mod_hotspot === 0 && activeEmpresa.permite_portal_vendas === 0) return false;
    }

    // Sem grupo vinculado = acesso total (backward compatible) -> Now bounded by the SaaS Firewall above
    if (Object.keys(permissoes).length === 0) return true;
    return !!permissoes[modulo]?.[acao];
  };

  return (
    <AuthContext.Provider value={{ user, token: localStorage.getItem('admin_token'), login, logout, loading, isSuperAdmin, empresas, switchEmpresa, permissoes, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
