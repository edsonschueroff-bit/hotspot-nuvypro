import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useBranding } from '../../contexts/BrandingContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { branding } = useBranding()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [loading, setLoading] = useState(false)

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState(null)
  const [resetErro, setResetErro] = useState(null)
  const [sendingReset, setSendingReset] = useState(false)

  const handleSolicitarReset = async (e) => {
    e.preventDefault()
    setResetErro(null)
    setResetMsg(null)
    setSendingReset(true)
    try {
      const res = await fetch('/api/auth/solicitar-reset-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      })
      const data = await res.json()
      if (res.ok) {
        setResetMsg(data.message)
      } else {
        setResetErro(data.error || 'Erro ao solicitar redefinição.')
      }
    } catch (err) {
      setResetErro('Erro de conexão com o servidor.')
    } finally {
      setSendingReset(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })
      const data = await res.json()
      if (res.ok) {
        login(data.token, data.user, data.empresas, data.permissoes)
        const slug = data.user?.empresa_slug || 'default'
        navigate(`/admin/${slug}`)
      } else {
        setErro(data.message || 'Erro ao fazer login')
      }
    } catch (err) {
      setErro('Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      {/* Login Card */}
      <div className="w-full max-w-sm animate-fade-slide-up">

        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <img
              src={branding?.logo_url || '/nuvycore.svg'}
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.src = '/nuvycore.svg'; }}
            />
          </div>
          <h1 className="text-[24px] font-700 text-slate-900 tracking-tight">
            {branding?.nome_sistema || 'Nuvy Pro'}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            {branding?.slogan || 'Gestão Inteligente de Wi-Fi, Marketing & Fidelização de Clientes'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-7">
          {erro && (
            <div className="bg-[#fef2f2] border border-[#fecaca] text-red-700 text-[13px] px-4 py-2.5 rounded-md mb-5">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-600 text-slate-600 mb-1.5 uppercase tracking-wide">
                E-mail
              </label>
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ds-input"
                placeholder="admin@empresa.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-600 text-slate-600 uppercase tracking-wide">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] font-600 text-[#2563eb] hover:text-[#1d4ed8] transition-colors cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input
                type="password"
                id="login-senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="ds-input"
                placeholder="Sua senha"
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[14px] font-600 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.10)] transition-all active:scale-[0.99] cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Entrando...
                </>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#e2e8f0] text-center">
            <p className="text-[12px] text-slate-500 mb-3">Ainda não possui uma conta?</p>
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#10b981] border border-[#a7f3d0] rounded-md text-[13px] font-600 transition-colors"
            >
              ⚡ Criar Conta • 7 Dias Grátis
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-5">
          {branding?.nome_sistema || 'SpotNuvy'} · {branding?.texto_rodape || 'Tecnologia Hotspot por NuvyCore'}
        </p>
      </div>

      {/* Modal Recuperar Senha */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[14px] p-6 w-full max-w-sm shadow-[0_10px_25px_rgba(0,0,0,0.10)] border border-[#e2e8f0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-[15px] font-600 text-slate-900 flex items-center gap-2">
                🔑 Recuperar Senha
              </h3>
              <button
                type="button"
                onClick={() => { setShowResetModal(false); setResetMsg(null); setResetErro(null); }}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[12px] text-slate-500 leading-relaxed">
              Digite seu e-mail cadastrado. Enviaremos um link de redefinição com validade de 30 minutos.
            </p>

            {resetErro && (
              <div className="bg-[#fef2f2] text-red-700 text-[12px] p-2.5 rounded-md border border-[#fecaca]">
                {resetErro}
              </div>
            )}

            {resetMsg ? (
              <div className="bg-[#ecfdf5] text-emerald-800 text-[12px] p-3 rounded-md border border-[#a7f3d0] space-y-2">
                <p>✅ {resetMsg}</p>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-md font-600 text-[12px] cursor-pointer transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSolicitarReset} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="seuemail@empresa.com"
                  className="ds-input"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-slate-600 text-[12px] font-600 rounded-md cursor-pointer transition-colors border border-[#e2e8f0]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-600 rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {sendingReset ? "Enviando..." : "Enviar Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
