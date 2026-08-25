import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

export default function RedefinirSenha() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [novaSenha, setNovaSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')
    const [loading, setLoading] = useState(false)
    const [mensagem, setMensagem] = useState(null)
    const [erro, setErro] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErro(null)
        setMensagem(null)

        if (!token) {
            setErro('Token de redefinição ausente. Utilize o link enviado por e-mail.')
            return
        }

        if (novaSenha.length < 6) {
            setErro('A senha deve conter no mínimo 6 caracteres.')
            return
        }

        if (novaSenha !== confirmarSenha) {
            setErro('As senhas não coincidem.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/redefinir-senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: novaSenha })
            })

            const data = await res.json()
            if (res.ok) {
                setMensagem(data.message || 'Senha redefinida com sucesso!')
                setTimeout(() => navigate('/admin/login'), 3000)
            } else {
                setErro(data.error || 'Erro ao redefinir senha.')
            }
        } catch (err) {
            setErro('Erro de conexão com o servidor.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#f1f5f9] p-4">
            <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xl w-full max-w-sm">
                <div className="mb-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md text-white font-bold text-xl">
                        🔑
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Nova Senha</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Crie sua nova senha de acesso ao sistema</p>
                </div>

                {erro && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-xl mb-4">
                        {erro}
                    </div>
                )}

                {mensagem && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3.5 py-2.5 rounded-xl mb-4 font-semibold">
                        {mensagem}
                        <p className="text-[11px] text-emerald-600 mt-1">Redirecionando para a tela de login...</p>
                    </div>
                )}

                {!mensagem && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-slate-700 font-bold mb-1 text-xs uppercase">Nova Senha</label>
                            <input
                                type="password"
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                                placeholder="Mínimo 6 caracteres"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-slate-700 font-bold mb-1 text-xs uppercase">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                                placeholder="Repita a nova senha"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-md shadow-md transition-all active:scale-[0.99] cursor-pointer"
                        >
                            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                    </form>
                )}

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <Link to="/admin/login" className="text-xs text-slate-500 hover:text-slate-800 font-semibold">
                        ← Voltar para o Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
