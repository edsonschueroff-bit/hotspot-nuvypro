import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useBranding } from "../../contexts/BrandingContext";

export default function Registro() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { branding } = useBranding();
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",
  });
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [novoUser, setNovoUser] = useState(null);

  const formatarTelefone = (valor) => {
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length <= 10) {
      return limpo.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
    }
    return limpo.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
  };

  const formatarCNPJ = (valor) => {
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length <= 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4").trim();
    }
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5").trim();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "telefone") {
      setForm({ ...form, telefone: formatarTelefone(value) });
    } else if (name === "cnpj") {
      setForm({ ...form, cnpj: formatarCNPJ(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);

    if (form.senha !== form.confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    if (form.senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          cnpj: form.cnpj,
          email: form.email,
          telefone: form.telefone,
          senha: form.senha,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setNovoUser(data.user);
        setSucesso(true);
        login(data.token, data.user, data.empresas);
        setTimeout(() => {
          navigate(`/admin/${data.user.empresa_slug}`);
        }, 2500);
      } else {
        setErro(data.message || "Erro ao registrar empresa");
      }
    } catch (err) {
      setErro("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Coluna Esquerda: Benefícios SaaS (Desktop) */}
        <div className="lg:col-span-5 space-y-6 hidden lg:block pr-4">
          <div className="flex items-center gap-3">
            <img
              src={branding?.logo_url || '/nuvycore.svg'}
              alt="Logo"
              className="max-h-10 max-w-[180px] object-contain"
              onError={(e) => { e.currentTarget.src = '/nuvycore.svg'; }}
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] text-[11px] font-600 uppercase tracking-wider">
            <span>⚡ Teste Grátis de 7 Dias</span>
          </div>

          <h1 className="text-[28px] font-700 text-slate-900 tracking-tight leading-snug">
            Transforme seu Wi-Fi em uma Máquina de Vendas e Fidelização.
          </h1>
          <p className="text-slate-500 text-[13px] leading-relaxed">
            Plataforma completa de Captive Portal com MikroTik, WhatsApp automatizado, Login Social e Billing PIX.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "Portais Captive modernos prontos para uso",
              "Login Social oficial (Google e Facebook)",
              "CRM e Automações nativas de WhatsApp",
              "Analytics de Recorrência e Pesquisa NPS",
              "Validador de Cupons e Descontos no Balcão"
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-[13px] text-slate-700 font-500">
                <span className="w-4.5 h-4.5 rounded-full bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] flex items-center justify-center text-[11px] font-700 flex-shrink-0">
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-[10px] bg-white border border-[#e2e8f0] shadow-2xs text-[12px] text-slate-500">
            <span className="text-slate-900 font-600 block mb-0.5">🔒 Sem Cartão de Crédito</span>
            Crie sua conta agora e comece a testar imediatamente por 7 dias.
          </div>
        </div>

        {/* Coluna Direita: Formulário de Cadastro */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[14px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative">
          
          {sucesso ? (
            <div className="text-center py-10 space-y-4 animate-fade-slide-up">
              <div className="w-14 h-14 bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] rounded-full flex items-center justify-center text-2xl mx-auto">
                🎉
              </div>
              <h2 className="text-[22px] font-700 text-slate-900">Conta Criada com Sucesso!</h2>
              <p className="text-[13px] text-slate-600 max-w-sm mx-auto">
                Sua empresa foi provisionada com <strong>7 dias de teste grátis</strong>.
                {form.telefone && " Enviamos seus dados de acesso também no seu WhatsApp!"}
              </p>
              <div className="p-3.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[12px] text-slate-600 font-mono">
                Redirecionando para seu painel administrativo em instantes...
              </div>
              <div className="w-6 h-6 border-[3px] border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mt-4"></div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-600 text-[#2563eb] uppercase tracking-wide">Cadastro de Empresa</span>
                  <span className="text-[10px] font-600 text-[#10b981] bg-[#ecfdf5] px-2.5 py-0.5 rounded-full border border-[#a7f3d0]">
                    7 Dias Grátis
                  </span>
                </div>
                <h2 className="text-[20px] font-700 text-slate-900 mt-1">Crie sua Conta SaaS</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">Preencha os dados abaixo para iniciar sua demonstração</p>
              </div>

              {erro && (
                <div className="bg-[#fef2f2] border border-[#fecaca] text-red-700 text-[12px] px-3.5 py-2.5 rounded-md mb-5 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{erro}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-slate-600 font-600 mb-1 text-[11px] uppercase tracking-wide">
                    Nome da Empresa / Estabelecimento *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    className="ds-input"
                    placeholder="Ex: Café & Bistrô Central"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 font-600 mb-1 text-[11px] uppercase tracking-wide">
                      WhatsApp / Celular *
                    </label>
                    <input
                      type="text"
                      name="telefone"
                      value={form.telefone}
                      onChange={handleChange}
                      className="ds-input"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-600 mb-1 text-[11px] uppercase tracking-wide">
                      CNPJ ou CPF (Opcional)
                    </label>
                    <input
                      type="text"
                      name="cnpj"
                      value={form.cnpj}
                      onChange={handleChange}
                      className="ds-input"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-600 mb-1 text-[11px] uppercase tracking-wide">
                    E-mail do Administrador *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="ds-input"
                    placeholder="admin@empresa.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 font-600 mb-1 text-[11px] uppercase tracking-wide">
                      Senha *
                    </label>
                    <input
                      type="password"
                      name="senha"
                      value={form.senha}
                      onChange={handleChange}
                      className="ds-input"
                      placeholder="Mínimo 6 dígitos"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-600 mb-1 text-[11px] uppercase tracking-wide">
                      Confirmar Senha *
                    </label>
                    <input
                      type="password"
                      name="confirmarSenha"
                      value={form.confirmarSenha}
                      onChange={handleChange}
                      className="ds-input"
                      placeholder="Repita a senha"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-2.5 rounded-md transition-colors cursor-pointer font-600 text-[14px] shadow-sm active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Provisionando sua conta...</span>
                    </>
                  ) : (
                    <span>Começar Meus 7 Dias Grátis 🚀</span>
                  )}
                </button>

                <p className="text-center text-slate-500 text-[12px] mt-4">
                  Já possui uma conta?{" "}
                  <Link to="/" className="text-[#2563eb] hover:underline font-600">
                    Fazer login
                  </Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
