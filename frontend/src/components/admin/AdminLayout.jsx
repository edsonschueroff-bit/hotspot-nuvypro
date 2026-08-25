import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useBranding } from "../../contexts/BrandingContext";
import PwaInstallPrompt from "./PwaInstallPrompt";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { empresaSlug } = useParams();
  const { user, logout, isSuperAdmin, empresas, switchEmpresa, hasPermission } = useAuth();
  const { branding } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [switchingEmpresa, setSwitchingEmpresa] = useState(false);
  const [empresaLogo, setEmpresaLogo] = useState(null);
  const [openMenus, setOpenMenus] = useState({});
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [whatsappAvisoFechado, setWhatsappAvisoFechado] = useState(false);

  const toggleMenu = (key) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    menuSections.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          const isChildActive = item.children.some(child => location.pathname.startsWith(child.path));
          if (isChildActive) {
            setOpenMenus(prev => ({ ...prev, [item.key]: true }));
          }
        }
      });
    });
  }, [location.pathname]);

  const slug = empresaSlug || user?.empresa_slug || 'default';
  const basePath = `/admin/${slug}`;

  const [empresaStatusFinanceiro, setEmpresaStatusFinanceiro] = useState(null);
  const [empresaTrialAte, setEmpresaTrialAte] = useState(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`/api/empresas/by-slug/${slug}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEmpresaLogo(data.logo_url);
          setEmpresaStatusFinanceiro(data.status_financeiro);
          setEmpresaTrialAte(data.trial_ate);
        }
      } catch (e) { /* silencioso */ }
    };
    if (slug) fetchLogo();
  }, [slug]);

  useEffect(() => {
    const fetchWhatsappStatus = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/whatsapp/instance/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWhatsappStatus(data);
        }
      } catch (e) { /* silencioso */ }
    };
    setWhatsappAvisoFechado(sessionStorage.getItem(`wa_aviso_fechado_${slug}`) === '1');
    if (slug) fetchWhatsappStatus();
  }, [slug]);

  const fecharAvisoWhatsapp = () => {
    setWhatsappAvisoFechado(true);
    sessionStorage.setItem(`wa_aviso_fechado_${slug}`, '1');
  };

  const whatsappDesconectado = whatsappStatus && (!whatsappStatus.exists || whatsappStatus.state !== 'open');
  const mostrarAvisoWhatsapp = whatsappDesconectado && !whatsappAvisoFechado && !location.pathname.includes('/whatsapp');

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Category icon colors per section (DESIGN.md tokens)
  const CAT = {
    dashboard: '#2563eb',
    marketing: '#f97316',
    network: '#10b981',
    compliance: '#475569',
    finance: '#16a34a',
    settings: '#64748b',
    super: '#7c3aed',
  };

  const menuSections = [
    // 1. DASHBOARDS & MÉTRICAS
    {
      title: "DASHBOARDS & MÉTRICAS",
      cat: 'dashboard',
      items: [
        {
          key: "dashboard",
          title: "Dashboard Geral",
          path: basePath,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          )
        },
        {
          key: "analytics",
          title: "Analytics & Desempenho",
          path: `${basePath}/analytics`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )
        },
        {
          key: "nps",
          title: "Satisfação (NPS)",
          path: `${basePath}/nps`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      ]
    },

    // 2. REDE & INFRAESTRUTURA
    {
      title: "REDE & INFRAESTRUTURA",
      cat: 'network',
      items: [
        {
          key: "mikrotik_group",
          title: "Equipamentos & VPN",
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          ),
          children: [
            { key: "mikrotiks", title: "Equipamentos & Gateways", path: `${basePath}/mikrotiks` },
            { key: "vpn", title: "Túneis VPN WireGuard", path: `${basePath}/vpn` },
          ]
        },
        {
          key: "radius_group",
          title: "RADIUS & Marco Civil",
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
          children: [
            { key: "radius", title: "Usuários RADIUS", path: `${basePath}/radius` },
            { key: "sessoes", title: "Sessões Ativas", path: `${basePath}/sessoes` },
            { key: "sessoeslog", title: "Histórico de Logs", path: `${basePath}/sessoeslog` },
            { key: "compliance", title: "Auditoria Marco Civil", path: `${basePath}/compliance` },
          ]
        }
      ]
    },

    // 3. PORTAIS & MARKETING
    {
      title: "PORTAIS & MARKETING",
      cat: 'marketing',
      items: [
        {
          key: "portais",
          title: "Portais de Captura",
          path: `${basePath}/portais`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          )
        },
        {
          key: "campanhas",
          title: "Campanhas Wi-Fi",
          path: `${basePath}/campanhas`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          )
        },
        {
          key: "plaquinhas",
          title: "Plaquinhas QR Code",
          path: `${basePath}/plaquinhas`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          )
        },
        {
          key: "whatsapp",
          title: "WhatsApp API",
          path: `${basePath}/whatsapp`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 20l1.3-3.9A9 9 0 113.9 18.7L3 20zm9-14a7 7 0 00-5.9 10.7l.3.5-.8 2.3 2.4-.8.5.3A7 7 0 1012 6z" />
            </svg>
          )
        },
        {
          key: "crm",
          title: "CRM & Disparador",
          path: `${basePath}/crm`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          )
        }
      ]
    },

    // 4. VENDAS & FIDELIZAÇÃO
    {
      title: "VENDAS & FIDELIZAÇÃO",
      cat: 'finance',
      items: [
        {
          key: "vouchers",
          title: "Vouchers em Lote (PDV)",
          path: `${basePath}/vouchers`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          )
        },
        {
          key: "cardapio",
          title: "Cardápio & Vitrine Wi-Fi",
          path: `${basePath}/cardapio`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        },
        {
          key: "planos",
          title: "Planos de Acesso Wi-Fi",
          path: `${basePath}/planos`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          )
        },
        {
          key: "pagamentos",
          title: "Vendas & Relatório",
          path: `${basePath}/pagamentos`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h2m3 0h2m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )
        },
        {
          key: "dre",
          title: "DRE & Finanças",
          path: `${basePath}/dre`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )
        },
        {
          key: "fidelidade",
          title: "Programa de Fidelidade",
          path: `${basePath}/fidelidade`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          )
        },
        {
          key: "cupons",
          title: "Cupons de Desconto",
          path: `${basePath}/cupons`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          )
        }
      ]
    },

    // 5. CLIENTES & PRIVACIDADE
    {
      title: "CLIENTES & PRIVACIDADE",
      cat: 'compliance',
      items: [
        {
          key: "leads",
          title: "Leads Capturados",
          path: `${basePath}/leads`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          key: "clientes",
          title: "Cadastros LGPD",
          path: `${basePath}/lgpd`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )
        },
        {
          key: "filiais",
          title: "Rede & Multi-Filiais",
          path: `${basePath}/filiais`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )
        },
        {
          key: "webhooks",
          title: "Webhooks & Outbound",
          path: `${basePath}/webhooks`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )
        }
      ]
    },

    // 6. MINHA CONTA & SISTEMA
    {
      title: "MINHA CONTA & SISTEMA",
      cat: 'settings',
      items: [
        {
          key: "minhas-faturas",
          title: "Minhas Faturas & Cartão",
          path: `${basePath}/minhas-faturas`,
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        ...(isSuperAdmin ? [{
          key: "saas_financeiro_group",
          title: "Gestão da Plataforma",
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          children: [
            { key: "saas-relatorios", title: "Relatórios & BI", path: "/super/relatorios" },
            { key: "saas-dre", title: "DRE da Plataforma", path: "/super/dre" },
            { key: "saas-faturas", title: "Faturas dos Clientes", path: "/super/saas-faturas" },
            { key: "saas-planos", title: "Planos de Assinatura", path: "/super/saas-planos" },
            { key: "empresas", title: "Empresas Clientes", path: `${basePath}/empresas` },
          ]
        }] : []),
        {
          key: "configuracoes_group",
          title: "Configurações",
          icon: (
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          children: [
            { key: "configuracoes", title: "Geral", path: `${basePath}/configuracoes` },
            { key: "usuarios", title: "Usuários do Painel", path: `${basePath}/usuarios` },
            ...(isSuperAdmin ? [{ key: "saas-branding", title: "Identidade Visual", path: "/super/branding" }] : []),
            ...(isSuperAdmin ? [{ key: "grupos-permissao", title: "Perfis de Acesso", path: `${basePath}/grupos-permissao` }] : []),
            ...(isSuperAdmin ? [{ key: "saas-backups", title: "Backups & Segurança", path: "/super/backups" }] : []),
            ...(isSuperAdmin ? [{ key: "logs", title: "Logs do Servidor", path: `${basePath}/logs` }] : []),
          ]
        }
      ]
    }
  ];

  const isActive = (path) => {
    if (path === basePath) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(path);
  };

  // Icon wrapper with category color
  const IconWrapper = ({ icon, color, active }) => (
    <span
      className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center"
      style={{ color: active ? color : '#94a3b8' }}
    >
      {icon}
    </span>
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900 antialiased">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================================================================
          SIDEBAR — Precision Light Theme
          ================================================================ */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-[64px]' : 'lg:w-[256px]'}
          transition-all duration-200 ease-in-out
          w-[256px] bg-white border-r border-[#e2e8f0] flex flex-col select-none
          shadow-sm lg:shadow-none
        `}
      >
        {/* ---- Logo Header ---- */}
        <div className={`flex items-center justify-between border-b border-[#e2e8f0] ${sidebarCollapsed ? 'p-3' : 'px-4 py-3.5'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center flex-shrink-0 shadow-sm">
              <img
                src={empresaLogo || branding?.logo_url || '/nuvycore.svg'}
                alt="Logo"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => { e.currentTarget.src = '/nuvycore.svg'; }}
              />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <h1 className="text-[13px] font-700 text-slate-800 tracking-tight truncate leading-tight">
                  {branding?.nome_sistema || 'Nuvy Pro'}
                </h1>
                <p className="text-[11px] text-slate-400 truncate leading-tight">
                  {user?.empresa_nome || branding?.nome_sistema || 'Nuvy Pro'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ---- User Status Bar ---- */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-[12px] font-500 text-slate-700 truncate">{user?.nome || user?.email}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot"></span>
              {isSuperAdmin && (
                <span className="px-1.5 py-0.5 bg-[#fff7ed] border border-[#fed7aa] text-[#ea6c0a] text-[9px] font-700 uppercase rounded">
                  Super
                </span>
              )}
            </div>
          </div>
        )}

        {/* ---- Navigation ---- */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {/* Super Admin Quick Link */}
          {isSuperAdmin && (
            <Link
              to="/super"
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-600 
                text-[#f97316] bg-[#fff7ed] border border-[#fed7aa] 
                hover:bg-[#ffedd5] transition-colors duration-150 cursor-pointer
                ${sidebarCollapsed ? 'justify-center px-2' : ''}
              `}
              title="Painel Super Admin"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {!sidebarCollapsed && <span>Painel Super Admin</span>}
            </Link>
          )}

          {menuSections.map((section, idx) => {
            const sectionColor = CAT[section.cat] || CAT.settings;

            return (
              <div key={idx} className="space-y-0.5">
                {/* Section Label */}
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 px-3 mb-1.5">
                    <span className="text-[9px] font-700 uppercase tracking-[0.08em] text-slate-400">
                      {section.title}
                    </span>
                  </div>
                )}

                {section.items.map((item) => {
                  // Permission logic (unchanged from original)
                  const keyToModulo = {
                    'mikrotik_group': null,
                    'clientes_group': null,
                    'radius_group': null,
                    'configuracoes_group': null,
                    'analytics': 'dashboard',
                    'nps': 'dashboard',
                    'vouchers': null,
                    'cardapio': null,
                    'fidelidade': null,
                    'plaquinhas': null,
                    'webhooks': null,
                    'filiais': null,
                    'whatsapp': null,
                    'campanhas': null,
                    'crm': null,
                    'cupons': null,
                    'dre': null
                  };

                  const childKeyToModulo = {
                    'mikrotiks': 'mikrotiks',
                    'vpn': 'vpn',
                    'clientes': 'clientes',
                    'leads': 'leads',
                    'radius': 'radius',
                    'sessoes': 'sessoes',
                    'sessoeslog': 'sessoeslog',
                    'compliance': 'compliance',
                    'configuracoes': 'configuracoes',
                    'usuarios': 'usuarios',
                    'saas-dre': null
                  };

                  if (item.key === 'dashboard' || item.key === 'minhas-faturas' || item.key === 'dre') {
                    // sempre renderizar
                  } else if (isSuperAdmin || item.key === 'saas_financeiro_group') {
                    // sempre renderizar para super admin
                  } else if (item.children) {
                    if (Object.prototype.hasOwnProperty.call(keyToModulo, item.key) && keyToModulo[item.key] === null && !item.children) {
                      // sem módulo dedicado — sempre mostrar
                    } else if (item.children) {
                      const algumFilhoPermitido = item.children.some(child => {
                        const modulo = childKeyToModulo[child.key] || child.key;
                        return hasPermission(modulo, 'ver');
                      });
                      if (!algumFilhoPermitido) return null;
                    }
                  } else {
                    const modulo = keyToModulo[item.key] !== undefined ? keyToModulo[item.key] : item.key;
                    if (modulo !== null && !hasPermission(modulo, 'ver')) {
                      return null;
                    }
                  }

                  // ---- Group item with children ----
                  if (item.children) {
                    const isOpen = openMenus[item.key] || false;
                    const isChildActive = item.children.some(child => isActive(child.path));

                    return (
                      <div key={item.key}>
                        <button
                          onClick={() => toggleMenu(item.key)}
                          className={`
                            w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-500 
                            transition-colors duration-150 cursor-pointer group
                            ${isChildActive
                              ? 'text-[#2563eb] bg-[#eff6ff]'
                              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                            }
                            ${sidebarCollapsed ? 'justify-center px-2' : ''}
                          `}
                          title={sidebarCollapsed ? item.title : undefined}
                        >
                          <div className="flex items-center gap-2.5">
                            <span style={{ color: isChildActive ? sectionColor : '#94a3b8' }} className="flex-shrink-0">
                              {item.icon}
                            </span>
                            {!sidebarCollapsed && <span>{item.title}</span>}
                          </div>
                          {!sidebarCollapsed && (
                            <svg
                              className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isChildActive ? 'text-[#2563eb]' : 'text-slate-400'}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>

                        {isOpen && !sidebarCollapsed && (
                          <div className="mt-0.5 ml-7 pl-3 border-l-2 border-[#e2e8f0] space-y-0.5 pb-1">
                            {item.children.map(child => {
                              const childModulo = childKeyToModulo[child.key] || child.key;
                              if (!isSuperAdmin && childKeyToModulo[child.key] && !hasPermission(childModulo, 'ver')) return null;
                              const childActive = isActive(child.path);
                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  className={`
                                    block px-3 py-1.5 rounded-md text-[12px] font-500 transition-colors duration-150 cursor-pointer
                                    ${childActive
                                      ? 'text-[#2563eb] bg-[#eff6ff] font-600'
                                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                    }
                                  `}
                                  onClick={() => setSidebarOpen(false)}
                                >
                                  {child.title}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ---- Regular Link ----
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-500 
                        transition-colors duration-150 cursor-pointer
                        ${active
                          ? 'text-[#2563eb] bg-[#eff6ff] font-600'
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                        }
                        ${sidebarCollapsed ? 'justify-center px-2' : ''}
                      `}
                      title={sidebarCollapsed ? item.title : undefined}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span style={{ color: active ? sectionColor : '#94a3b8' }} className="flex-shrink-0">
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && <span>{item.title}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Install PWA */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('spotnuvy:open-pwa-install'))}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-500 
              text-[#2563eb] bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe]
              transition-colors duration-150 cursor-pointer mt-2
              ${sidebarCollapsed ? 'justify-center px-2' : ''}
            `}
            title="Instalar Aplicativo"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {!sidebarCollapsed && <span>Instalar App</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-500 
              text-slate-500 hover:text-red-600 hover:bg-red-50
              transition-colors duration-150 cursor-pointer
              ${sidebarCollapsed ? 'justify-center px-2' : ''}
            `}
            title="Sair do Sistema"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>Sair da Conta</span>}
          </button>
        </nav>

        {/* ---- Sidebar Footer ---- */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-[10px] text-slate-400 text-center">
              {branding?.nome_sistema || 'Nuvy Pro'} © 2026
            </p>
          </div>
        )}
      </aside>

      {/* ================================================================
          MAIN CONTENT AREA
          ================================================================ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#f8fafc]">

        {/* ---- Top Header Bar ---- */}
        <header className="bg-white border-b border-[#e2e8f0] px-5 py-3 sticky top-0 z-20 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Company selector */}
              <div className="hidden sm:flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1.5 rounded-md text-xs">
                <span className="text-slate-400 text-[11px]">Unidade:</span>
                {empresas.length > 1 ? (
                  <select
                    value={user?.empresa_id || ''}
                    disabled={switchingEmpresa}
                    onChange={async (e) => {
                      const newId = parseInt(e.target.value);
                      if (newId === user?.empresa_id) return;
                      setSwitchingEmpresa(true);
                      try {
                        const emp = await switchEmpresa(newId);
                        window.location.href = `/admin/${emp.slug}`;
                      } catch (err) {
                        alert('Erro ao trocar empresa');
                      } finally {
                        setSwitchingEmpresa(false);
                      }
                    }}
                    className="bg-white border border-[#e2e8f0] text-slate-700 text-[12px] font-500 rounded-md px-2 py-1 focus:ring-2 focus:ring-[#2563eb] cursor-pointer outline-none"
                  >
                    {empresas.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.matriz_id ? `🏪 ${e.nome}` : `🏢 ${e.nome}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-600 text-slate-700 text-[12px]">
                    {user?.empresa_nome || 'Default'}
                  </span>
                )}
                <Link
                  to={`${basePath}/filiais`}
                  className="text-[11px] font-600 text-[#2563eb] hover:underline"
                  title="Ver rede e filiais"
                >
                  Rede →
                </Link>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <Link
                  to="/super/relatorios"
                  className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[12px] font-600 flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Painel BI
                </Link>
              )}

              <div className="flex items-center gap-2.5 pl-3 border-l border-[#e2e8f0]">
                <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white font-700 flex items-center justify-center text-[13px] shadow-sm">
                  {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[12px] font-600 text-slate-800 leading-tight truncate max-w-[120px]">{user?.nome || 'Admin'}</p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ---- Page Content ---- */}
        <main className="flex-1 p-5 md:p-7 relative">
          {/* Modal de Bloqueio por Suspensão / Fim de Trial */}
          {empresaStatusFinanceiro === 'suspenso' && !isSuperAdmin && !location.pathname.includes('/minhas-faturas') && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 sm:p-8 max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-slate-900 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2563eb] via-amber-500 to-[#10b981]"></div>
                
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                    {empresaTrialAte ? "⏳" : "🚨"}
                  </div>

                  <div>
                    <span className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-800 uppercase tracking-wider mb-2 border ${
                      empresaTrialAte
                        ? "bg-[#fffbeb] text-amber-800 border-amber-300"
                        : "bg-[#fef2f2] text-red-700 border-red-200"
                    }`}>
                      {empresaTrialAte ? "⚡ Período de Teste Finalizado" : "⚠️ Acesso Temporariamente Suspenso"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-900 text-slate-900 tracking-tight">
                      {empresaTrialAte ? "Seu Teste Grátis Chegou ao Fim" : "Regularize sua Assinatura"}
                    </h2>
                  </div>

                  <p className="text-[13px] text-slate-500 leading-relaxed max-w-md mx-auto">
                    {empresaTrialAte
                      ? "Esperamos que você tenha aproveitado todos os recursos do Nuvy Pro! Para continuar gerenciando seus portais Wi-Fi, gerando leads e mantendo seus clientes conectados, escolha seu plano definitivo."
                      : "Identificamos pendências financeiras em aberto no seu plano. Efetue o pagamento via PIX para restabelecer o acesso imediatamente."}
                  </p>
                </div>

                {/* Benefícios Inclusos */}
                <div className="my-5 p-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-[12px] space-y-2 text-left">
                  <span className="text-[11px] font-800 text-slate-400 uppercase tracking-wider block mb-1">
                    Recursos disponíveis no seu plano:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] font-600 text-slate-700">
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <span className="text-emerald-500 font-bold">✓</span> Portais & Login Social
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <span className="text-emerald-500 font-bold">✓</span> WhatsApp & CRM Inteligente
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <span className="text-emerald-500 font-bold">✓</span> MikroTik, Omada & UniFi
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <span className="text-emerald-500 font-bold">✓</span> VPN WireGuard & Acesso Remoto
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Link
                    to={`${basePath}/minhas-faturas`}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-[10px] text-[13px] font-800 transition-colors shadow-md shadow-blue-500/20"
                  >
                    <span>⚡</span> Escolher Plano & Desbloquear Imediatamente
                  </Link>
                  <a
                    href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20ativar%20minha%20assinatura%20do%20Nuvy%20Pro"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f8fafc] hover:bg-slate-100 text-slate-700 font-700 rounded-[10px] text-[12px] transition-colors border border-[#e2e8f0]"
                  >
                    <span>💬</span> Falar com Especialista no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Banner Trial */}
          {empresaStatusFinanceiro === 'trial' && !isSuperAdmin && (
            <div className="mb-5 bg-[#eff6ff] border border-[#bfdbfe] text-blue-900 rounded-[10px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-[#dbeafe] text-[#2563eb] flex items-center justify-center font-700 text-sm flex-shrink-0">⚡</div>
                <p className="text-[12px] text-blue-800">
                  <strong className="font-700 text-blue-950">Modo Degustação Gratuito:</strong>{' '}
                  Você está no período de 7 dias de teste com acesso a todos os recursos.
                </p>
              </div>
              <Link
                to={`${basePath}/minhas-faturas`}
                className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[12px] font-600 whitespace-nowrap transition-colors text-center"
              >
                Ver Planos & Assinar
              </Link>
            </div>
          )}

          {/* Banner Inadimplente */}
          {empresaStatusFinanceiro === 'inadimplente' && !isSuperAdmin && (
            <div className="mb-5 bg-[#fef2f2] border border-[#fecaca] text-red-900 rounded-[10px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">⚠️</span>
                <p className="text-[12px] text-red-800">
                  <strong className="font-700 text-red-950">Atenção Financeira:</strong>{' '}
                  Sua empresa possui faturas em atraso. Efetue o pagamento para evitar a suspensão automática.
                </p>
              </div>
              <Link
                to={`${basePath}/minhas-faturas`}
                className="px-3 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-md text-[12px] font-600 whitespace-nowrap transition-colors text-center"
              >
                Pagar com PIX
              </Link>
            </div>
          )}

          {/* Banner WhatsApp Desconectado */}
          {mostrarAvisoWhatsapp && (
            <div className="mb-5 bg-[#fffbeb] border border-[#fde68a] text-amber-900 rounded-[10px] px-4 py-3 flex items-start gap-3">
              <svg className="w-5 h-5 min-w-[20px] max-w-[20px] min-h-[20px] max-h-[20px] flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 text-[12px] text-amber-800">
                <strong className="font-700 text-amber-950">WhatsApp desconectado:</strong>{' '}
                {whatsappStatus?.exists
                  ? "A instância não está conectada. Mensagens automáticas não serão enviadas."
                  : "Nenhuma instância configurada para esta empresa."}{' '}
                <Link to={`${basePath}/whatsapp`} className="underline font-700 text-amber-900 hover:text-amber-950">
                  Configurar agora
                </Link>
              </div>
              <button
                onClick={fecharAvisoWhatsapp}
                className="text-amber-400 hover:text-amber-700 flex-shrink-0 cursor-pointer"
                aria-label="Fechar aviso"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {children}
          <PwaInstallPrompt />
        </main>
      </div>
    </div>
  );
}
