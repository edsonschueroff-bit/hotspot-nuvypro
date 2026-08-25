import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardBody, PrimaryButton, SecondaryButton } from "@/components/ui";

export default function ConfiguracaoEmpresa() {
    const { empresaSlug } = useParams();
    const { isSuperAdmin } = useAuth();
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Formulário Local
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchEmpresa();
    }, []);

    const fetchEmpresa = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const url = `/api/empresas/minha-empresa${empresaSlug ? `?slug=${empresaSlug}` : ''}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmpresa(data);
                setFormData({
                    razao_social: data.razao_social || "",
                    cnpj: data.cnpj || "",
                    inscricao_estadual: data.inscricao_estadual || "",
                    inscricao_municipal: data.inscricao_municipal || "",
                    responsavel_nome: data.responsavel_nome || "",
                    responsavel_cargo: data.responsavel_cargo || "",
                    email: data.email || "",
                    telefone: data.telefone || "",
                    cep: data.cep || "",
                    logradouro: data.logradouro || "",
                    numero: data.numero || "",
                    complemento: data.complemento || "",
                    bairro: data.bairro || "",
                    cidade: data.cidade || "",
                    uf: data.uf || "",
                    pix_chave: data.pix_chave || ""
                });
            }
        } catch (err) {
            console.error("Erro ao carregar dados da empresa", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!isSuperAdmin) return;

        setSaving(true);
        setMessage(null);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/empresas/${empresa.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                // Envia os campos atualizados preservando os demais do objeto empresa original
                body: JSON.stringify({ ...empresa, ...formData })
            });

            if (res.ok) {
                setMessage({ type: "success", text: "✅ Dados da empresa atualizados com sucesso!" });
            } else {
                const data = await res.json();
                setMessage({ type: "error", text: data.message || "Erro ao salvar dados." });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Falha na conexão ao tentar salvar." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-sm text-slate-500 py-10 text-center">⏳ Carregando ficha cadastral...</div>;
    }

    if (!empresa) {
        return <div className="text-sm text-red-500 py-10 text-center">Empresa não encontrada.</div>;
    }

    return (
        <Card>
            <CardBody>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">📄 Ficha Cadastral da Empresa</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Visualize os dados fiscais e operacionais. {isSuperAdmin ? "Você tem permissão para editá-los." : "Para alterar dados sensíveis, solicite ao Suporte Técnico."}
                        </p>
                    </div>
                    {isSuperAdmin && (
                        <div className="mt-3 md:mt-0">
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded uppercase tracking-wider">
                                Modo Edição Super Admin
                            </span>
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`mb-6 px-4 py-3 rounded-lg border text-sm font-medium ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Seção 1: Dados Fiscais */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-[#2563eb] mb-4">I. Dados Fiscais & Institucionais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Razão Social</label>
                                <input
                                    type="text"
                                    name="razao_social"
                                    value={formData.razao_social}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ</label>
                                <input
                                    type="text"
                                    name="cnpj"
                                    value={formData.cnpj}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Inscrição Estadual (IE)</label>
                                <input
                                    type="text"
                                    name="inscricao_estadual"
                                    value={formData.inscricao_estadual}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Inscrição Municipal (IM)</label>
                                <input
                                    type="text"
                                    name="inscricao_municipal"
                                    value={formData.inscricao_municipal}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-[#2563eb] mb-4">II. Endereço Completo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">CEP</label>
                                <input
                                    type="text"
                                    name="cep"
                                    value={formData.cep}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Logradouro / Rua</label>
                                <input
                                    type="text"
                                    name="logradouro"
                                    value={formData.logradouro}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Número</label>
                                <input
                                    type="text"
                                    name="numero"
                                    value={formData.numero}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                                <input
                                    type="text"
                                    name="bairro"
                                    value={formData.bairro}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div className="col-span-1 grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                                    <input
                                        type="text"
                                        name="cidade"
                                        value={formData.cidade}
                                        onChange={handleChange}
                                        readOnly={!isSuperAdmin}
                                        className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">UF</label>
                                    <input
                                        type="text"
                                        name="uf"
                                        value={formData.uf}
                                        onChange={handleChange}
                                        readOnly={!isSuperAdmin}
                                        className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 uppercase font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest text-[#2563eb] mb-4">III. Contato & Repasses Financeiros</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Proprietário/Contato</label>
                                <input
                                    type="text"
                                    name="responsavel_nome"
                                    value={formData.responsavel_nome}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
                                <input
                                    type="text"
                                    name="responsavel_cargo"
                                    value={formData.responsavel_cargo}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    placeholder="Ex: Diretor, Gerente"
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Chave PIX (Para Repasses Revenue Share)</label>
                                <input
                                    type="text"
                                    name="pix_chave"
                                    value={formData.pix_chave}
                                    onChange={handleChange}
                                    readOnly={!isSuperAdmin}
                                    placeholder="CNPJ, E-mail, Celular ou Aleatória"
                                    className={`w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-mono ${isSuperAdmin ? 'focus:ring-1 focus:ring-blue-600 focus:border-blue-600' : 'opacity-70 cursor-not-allowed'}`}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Caso possua modelo de negócios com Comissão (Revenue Share), esta será a chave PIX utilizada para depósito dos resgates financeiros.</p>
                            </div>
                        </div>
                    </div>

                    {isSuperAdmin && (
                        <div className="flex justify-end pt-6 border-t border-slate-100">
                            <PrimaryButton type="submit" loading={saving}>
                                💾 Salvar Ficha Cadastral
                            </PrimaryButton>
                        </div>
                    )}
                </form>
            </CardBody>
        </Card>
    );
}
