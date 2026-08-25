import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Modal } from "@/components/ui";

export default function Portais() {
  const [portais, setPortais] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: "", slug: "", descricao: "", html_content: "", url_redirect: "", tipo: "custom" });

  const { empresaSlug } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("admin_token");

  const carregarPlanos = async () => {
    try {
      const res = await fetch("/api/planos", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPlanos(await res.json());
    } catch (err) { /* silencioso */ }
  };

  const carregarPortais = async () => {
    try {
      const res = await fetch("/api/portais", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPortais(data);
    } catch (err) {
      console.error("Erro ao carregar portais:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarPortais(); carregarPlanos(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editando ? `/api/portais/${editando}` : "/api/portais";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Erro ao salvar");
        return;
      }
      setShowModal(false);
      setEditando(null);
      setForm({ nome: "", slug: "", descricao: "", html_content: "", url_redirect: "", tipo: "custom" });
      carregarPortais();
    } catch (err) {
      alert("Erro ao salvar portal");
    }
  };

  const handleEditar = (p) => {
    setForm({
      nome: p.nome,
      slug: p.slug,
      descricao: p.descricao || "",
      html_content: p.html_content || "",
      url_redirect: p.url_redirect || "",
      tipo: p.tipo || "custom",
    });
    setEditando(p.id);
    setShowModal(true);
  };

  const handleRemover = async (id) => {
    if (!confirm("Deseja remover este portal?")) return;
    try {
      const res = await fetch(`/api/portais/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); return; }
      carregarPortais();
    } catch (err) {
      alert("Erro ao remover portal");
    }
  };

  const tipoBadge = (tipo) => {
    const map = {
      lgpd: { label: "LGPD", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      planos: { label: "Planos", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      lead: { label: "Lead", cls: "bg-amber-50 text-amber-700 border-amber-200" },
      lead_passivo: { label: "Lead (Sem Internet)", cls: "bg-orange-50 text-orange-700 border-orange-200" },
      social: { label: "Login Social", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      custom: { label: "Custom", cls: "bg-slate-100 text-slate-700 border-slate-200" },
    };
    const t = map[tipo] || map.custom;
    return <span className={`px-2 py-0.5 text-[11px] font-600 rounded-full border ${t.cls}`}>{t.label}</span>;
  };

  const tipoIcon = (tipo) => {
    if (tipo === "lgpd") return (
      <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
    );
    if (tipo === "planos") return (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    );
    if (tipo === "lead" || tipo === "lead_passivo") return (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
    );
    if (tipo === "social") return (
      <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
    );
    return (
      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-5 h-5 text-[#2563eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
            </svg>
          }
          title="Portais Captive"
          subtitle="Crie e personalize a experiência de conexão Wi-Fi dos seus visitantes"
          actions={
            <button
              onClick={() => {
                setEditando(null);
                setForm({ nome: "", slug: "", descricao: "", html_content: "", url_redirect: "", tipo: "custom" });
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-600 rounded-md shadow-sm transition-colors cursor-pointer"
            >
              + Novo Portal
            </button>
          }
        />

        {!loading && !planos.some(p => p.nome === 'LGPD') && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-[10px] flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <p className="text-amber-900 font-600 text-[13px]">Plano LGPD não encontrado</p>
              <p className="text-amber-700 text-[12px] mt-0.5">O portal LGPD não funcionará sem um plano com nome <strong>"LGPD"</strong>. Vá em <strong>Planos</strong> e crie um plano gratuito com esse nome.</p>
            </div>
          </div>
        )}

        {!loading && !planos.some(p => p.nome.toLowerCase() === 'lead') && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-[10px] flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <p className="text-amber-900 font-600 text-[13px]">Plano Lead não encontrado</p>
              <p className="text-amber-700 text-[12px] mt-0.5">O portal de Leads não funcionará sem um plano com nome <strong>"Lead"</strong>. Vá em <strong>Planos</strong> e crie um plano gratuito com esse nome.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <div className="w-8 h-8 border-[3px] border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[13px] text-slate-400">Carregando portais...</p>
          </div>
        ) : portais.length === 0 ? (
          <div className="bg-white rounded-[10px] border border-[#e2e8f0] p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-[14px] font-600 text-slate-700">Nenhum portal cadastrado</p>
            <p className="text-[12px] text-slate-400 mt-1">Clique no botão "+ Novo Portal" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portais.map((p) => (
              <div key={p.id} className="bg-white rounded-[10px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#f8fafc] border border-[#e2e8f0] rounded-md flex items-center justify-center flex-shrink-0">
                        {tipoIcon(p.tipo)}
                      </div>
                      <div>
                        <h3 className="text-slate-900 font-600 text-[14px]">{p.nome}</h3>
                        <p className="text-[11px] font-mono text-slate-400">/{p.slug}</p>
                      </div>
                    </div>
                    {tipoBadge(p.tipo)}
                  </div>

                  {p.descricao && <p className="text-[12px] text-slate-500 mb-3 line-clamp-2">{p.descricao}</p>}

                  {/* Template & Branding */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {p.template_nome && (
                      <span className="px-2 py-0.5 text-[11px] font-500 rounded-md border bg-[#f8fafc] text-slate-700 border-[#e2e8f0]">
                        {p.template_nome}
                      </span>
                    )}
                    {p.cor_primaria && (
                      <div className="flex items-center gap-1" title={`Primária: ${p.cor_primaria}`}>
                        <div className="w-3.5 h-3.5 rounded-full border border-[#e2e8f0] shadow-2xs" style={{ backgroundColor: p.cor_primaria }} />
                      </div>
                    )}
                    {p.cor_fundo && p.cor_fundo !== '#0f111a' && (
                      <div className="flex items-center gap-1" title={`Fundo: ${p.cor_fundo}`}>
                        <div className="w-3.5 h-3.5 rounded-full border border-[#e2e8f0] shadow-2xs" style={{ backgroundColor: p.cor_fundo }} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[12px] text-slate-400 mb-4">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"></path></svg>
                    <span>{p.mikrotiks_vinculados || 0} Mikrotik{p.mikrotiks_vinculados !== 1 ? "s" : ""} vinculado{p.mikrotiks_vinculados !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-[#e2e8f0]">
                  <button
                    onClick={() => window.open(`/api/portais/${p.id}/preview?token=${encodeURIComponent(token)}`, "_blank")}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-500 text-[#2563eb] border border-[#bfdbfe] bg-[#eff6ff] rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    Preview
                  </button>
                  <button
                    onClick={() => navigate(`/admin/${empresaSlug}/portais/${p.id}/editor`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-500 text-slate-700 border border-[#e2e8f0] bg-[#f8fafc] rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Editor Visual
                  </button>
                  <div className="flex-1"></div>
                  <button
                    onClick={() => handleEditar(p)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-[#f8fafc] rounded-md transition-colors cursor-pointer"
                    title="Editar Configurações"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </button>
                  <button
                    onClick={() => handleRemover(p.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Remover Portal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Editar / Criar */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editando ? "Editar Portal" : "Novo Portal Captive"}
          description="Configure os dados principais e tipo de funcionamento do portal"
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-[#e2e8f0] text-slate-600 text-[13px] font-500 rounded-md hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[13px] font-600 rounded-md shadow-sm transition-colors cursor-pointer"
              >
                Salvar Portal
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Nome do Portal *</label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="ds-input"
                placeholder="Ex: Wi-Fi Unidade Centro"
              />
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Slug (URL amigável)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="ds-input"
                placeholder="ex: wifi-centro"
              />
              <p className="text-[11px] text-slate-400 mt-1">Deixe em branco para auto-gerar baseado no nome.</p>
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Breve Descrição</label>
              <textarea
                maxLength={255}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="ds-input"
                placeholder="Descreva o propósito deste portal"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1.5">Tipo Operacional *</label>
              <select
                value={form.tipo || 'custom'}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="ds-input"
              >
                <option value="custom">Portal Básico (Conexão 1-Clique)</option>
                <option value="social">OAuth / Login Social (Google/Facebook)</option>
                <option value="lgpd">Cadastro Completo LGPD + Termos</option>
                <option value="planos">Painel Pix Mercado Pago</option>
                <option value="lead">Painel de Leads (Prospecção)</option>
              </select>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
