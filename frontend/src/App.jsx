import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Mikrotiks from "./pages/admin/Mikrotiks";
import Planos from "./pages/admin/Planos";
import Configuracoes from "./pages/admin/Configuracoes";
import Pagamentos from "./pages/admin/Pagamentos";
import UsuariosRadius from "./pages/admin/UsuariosRadius";
import LgpdCadastros from "./pages/admin/LgpdCadastros";
import Sessoes from "./pages/admin/Sessoes";
import SessoesLog from "./pages/admin/SessoesLog";
import Logs from "./pages/admin/Logs";
import Usuarios from "./pages/admin/Usuarios";
import Wireguard from "./pages/admin/Wireguard";
import Portais from "./pages/admin/Portais";
import PortalEditor from "./pages/admin/PortalEditor";
import Leads from "./pages/admin/Leads";
import Crm from "./pages/admin/Crm";
import Compliance from "./pages/admin/Compliance";
import EmpresasAdmin from "./pages/admin/EmpresasAdmin";
import GruposPermissao from "./pages/admin/GruposPermissao";
import WhatsApp from "./pages/admin/WhatsApp";
import Campanhas from "./pages/admin/Campanhas";
import CampanhaEditor from "./pages/admin/CampanhaEditor";
import MinhasFaturas from "./pages/admin/MinhasFaturas";
import Analytics from "./pages/admin/Analytics";
import NpsDashboard from "./pages/admin/NpsDashboard";
import Cupons from "./pages/admin/Cupons";
import Webhooks from "./pages/admin/Webhooks";
import Filiais from "./pages/admin/Filiais";
import GeradorPlaquinhas from "./pages/admin/GeradorPlaquinhas";
import Vouchers from "./pages/admin/Vouchers";
import CardapioAdmin from "./pages/admin/CardapioAdmin";
import Fidelidade from "./pages/admin/Fidelidade";
import Empresas from "./pages/super/Empresas";
import SuperDashboard from "./pages/super/SuperDashboard";
import Backups from "./pages/super/Backups";
import AtualizarSistema from "./pages/super/AtualizarSistema";
import PublicarAtualizacao from "./pages/super/PublicarAtualizacao";
import SaasPlanos from "./pages/super/SaasPlanos";
import SaasPlanoEditor from "./pages/super/SaasPlanoEditor";
import SaasFaturas from "./pages/super/SaasFaturas";
import RelatoriosSaas from "./pages/super/RelatoriosSaas";
import Branding from "./pages/super/Branding";
import SuperDre from "./pages/super/SuperDre";
import DreFinanceiro from "./pages/admin/DreFinanceiro";

import PlanosCliente from "./pages/public/PlanosCliente";
import Pagamento from "./pages/public/Pagamento";
import LgpdAuto from "./pages/public/LgpdAuto";
import CadastroLGPD from "./pages/public/CadastroLGPD";
import CadastroLead from "./pages/public/CadastroLead";
import CadastroLeadPassivo from "./pages/public/CadastroLeadPassivo";
import CadastroCliente from "./pages/public/CadastroCliente";
import Registro from "./pages/public/Registro";
import CampanhaPlayer from "./pages/public/CampanhaPlayer";
import LoginHotspot from "./pages/public/LoginHotspot";
import LoginSocial from "./pages/public/LoginSocial";
import CardapioPublico from "./pages/public/CardapioPublico";
import PortalTitularLgpd from "./pages/public/PortalTitularLgpd";
import RedefinirSenha from "./pages/auth/RedefinirSenha";

// Componente de proteção
const RotaPrivada = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  return children;
};

// Redireciona /admin para /admin/:slug
const AdminRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  return <Navigate to={`/admin/${user.empresa_slug}`} replace />;
};

function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/cadastro-cliente" element={<CadastroCliente />} />
      <Route path="/planos-cliente" element={<PlanosCliente />} />
      <Route path="/pagamento/:id" element={<Pagamento />} />
      <Route path="/lgpd" element={<LgpdAuto />} />
      <Route path="/cadastro" element={<CadastroLGPD />} />
      <Route path="/lead" element={<CadastroLead />} />
      <Route path="/lead-passivo" element={<CadastroLeadPassivo />} />
      <Route path="/login-hotspot" element={<LoginHotspot />} />
      <Route path="/social" element={<LoginSocial />} />
      <Route path="/login-social" element={<LoginSocial />} />
      <Route path="/portal/social" element={<LoginSocial />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/campanha/:portalId" element={<CampanhaPlayer />} />
      <Route path="/cardapio/:empresaSlug" element={<CardapioPublico />} />
      <Route path="/privacidade/:empresaSlug" element={<PortalTitularLgpd />} />
      <Route path="/privacidade" element={<PortalTitularLgpd />} />

      {/* Redirect /admin -> /admin/:slug */}
      <Route path="/admin" element={<AdminRedirect />} />

      {/* Admin (protegidas com empresa slug) */}
      <Route path="/admin/:empresaSlug" element={<RotaPrivada><Dashboard /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/analytics" element={<RotaPrivada><Analytics /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/nps" element={<RotaPrivada><NpsDashboard /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/cupons" element={<RotaPrivada><Cupons /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/empresas" element={<RotaPrivada><EmpresasAdmin /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/mikrotiks" element={<RotaPrivada><Mikrotiks /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/vpn" element={<RotaPrivada><Wireguard /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/portais" element={<RotaPrivada><Portais /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/portais/:portalId/editor" element={<RotaPrivada><PortalEditor /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/planos" element={<RotaPrivada><Planos /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/configuracoes" element={<RotaPrivada><Configuracoes /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/pagamentos" element={<RotaPrivada><Pagamentos /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/dre" element={<RotaPrivada><DreFinanceiro /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/minhas-faturas" element={<RotaPrivada><MinhasFaturas /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/radius" element={<RotaPrivada><UsuariosRadius /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/lgpd" element={<RotaPrivada><LgpdCadastros /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/sessoes" element={<RotaPrivada><Sessoes /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/sessoeslog" element={<RotaPrivada><SessoesLog /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/logs" element={<RotaPrivada><Logs /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/leads" element={<RotaPrivada><Leads /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/crm" element={<RotaPrivada><Crm /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/compliance" element={<RotaPrivada><Compliance /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/usuarios" element={<RotaPrivada><Usuarios /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/grupos-permissao" element={<RotaPrivada><GruposPermissao /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/whatsapp" element={<RotaPrivada><WhatsApp /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/campanhas" element={<RotaPrivada><Campanhas /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/campanhas/:id" element={<RotaPrivada><CampanhaEditor /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/webhooks" element={<RotaPrivada><Webhooks /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/filiais" element={<RotaPrivada><Filiais /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/plaquinhas" element={<RotaPrivada><GeradorPlaquinhas /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/vouchers" element={<RotaPrivada><Vouchers /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/cardapio" element={<RotaPrivada><CardapioAdmin /></RotaPrivada>} />
      <Route path="/admin/:empresaSlug/fidelidade" element={<RotaPrivada><Fidelidade /></RotaPrivada>} />

      {/* Super Admin */}
      <Route path="/super" element={<RotaPrivada><SuperDashboard /></RotaPrivada>} />
      <Route path="/super/empresas" element={<RotaPrivada><Empresas /></RotaPrivada>} />
      <Route path="/super/saas-planos" element={<RotaPrivada><SaasPlanos /></RotaPrivada>} />
      <Route path="/super/saas-planos/novo" element={<RotaPrivada><SaasPlanoEditor /></RotaPrivada>} />
      <Route path="/super/saas-planos/editar/:id" element={<RotaPrivada><SaasPlanoEditor /></RotaPrivada>} />
      <Route path="/super/saas-faturas" element={<RotaPrivada><SaasFaturas /></RotaPrivada>} />
      <Route path="/super/dre" element={<RotaPrivada><SuperDre /></RotaPrivada>} />
      <Route path="/super/relatorios" element={<RotaPrivada><RelatoriosSaas /></RotaPrivada>} />
      <Route path="/super/atualizar" element={<RotaPrivada><AtualizarSistema /></RotaPrivada>} />
      <Route path="/super/backups" element={<RotaPrivada><Backups /></RotaPrivada>} />
      <Route path="/super/branding" element={<RotaPrivada><Branding /></RotaPrivada>} />
      <Route path="/super/publicar-atualizacao" element={<Navigate to="/super/atualizar" replace />} />
    </Routes>
  );
}

export default App;
