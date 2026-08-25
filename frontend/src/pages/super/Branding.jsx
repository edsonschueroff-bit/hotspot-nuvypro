import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useBranding } from "../../contexts/BrandingContext";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardHeader, CardBody, PrimaryButton, SecondaryButton, Modal, StatusBadge } from "../../components/ui";

export default function Branding() {
  const { token: contextToken } = useAuth();
  const token = contextToken || localStorage.getItem('admin_token');
  const { refreshBranding } = useBranding();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [modalResetAberto, setModalResetAberto] = useState(false);

  const [feedback, setFeedback] = useState({ tipo: "", mensagem: "" });

  const [formData, setFormData] = useState({
    nome_sistema: "SpotNuvy Pro",
    slogan: "Gestão Inteligente de Hotspot & Wi-Fi",
    texto_rodape: "Tecnologia Hotspot por NuvyCore",
    cor_primaria: "#2563eb",
    logo_url: "/nuvycore.svg",
    favicon_url: ""
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branding", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          nome_sistema: data.nome_sistema || "SpotNuvy Pro",
          slogan: data.slogan || "Gestão Inteligente de Hotspot & Wi-Fi",
          texto_rodape: data.texto_rodape || "Tecnologia Hotspot por NuvyCore",
          cor_primaria: data.cor_primaria || "#2563eb",
          logo_url: data.logo_url || "/nuvycore.svg",
          favicon_url: data.favicon_url || ""
        });
      }
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: "Erro ao carregar dados de branding." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [token]);

  const handleSalvarTextos = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setFeedback({ tipo: "", mensagem: "" });

    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nome_sistema: formData.nome_sistema,
          slogan: formData.slogan,
          texto_rodape: formData.texto_rodape,
          cor_primaria: formData.cor_primaria
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ tipo: "sucesso", mensagem: data.message || "Identidade visual salva com sucesso!" });
        await refreshBranding();
      } else {
        setFeedback({ tipo: "erro", mensagem: data.error || "Erro ao salvar alterações." });
      }
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: "Erro de conexão ao salvar." });
    } finally {
      setSalvando(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    setFeedback({ tipo: "", mensagem: "" });

    const form = new FormData();
    form.append("logo", logoFile);

    try {
      const res = await fetch("/api/branding/upload-logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, logo_url: data.logo_url }));
        setLogoFile(null);
        setLogoPreview(null);
        setFeedback({ tipo: "sucesso", mensagem: "Logo principal atualizada em todo o sistema!" });
        await refreshBranding();
      } else {
        setFeedback({ tipo: "erro", mensagem: data.error || "Erro no upload da logo." });
      }
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: "Erro de rede no upload da logo." });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadFavicon = async () => {
    if (!faviconFile) return;
    setUploadingFavicon(true);
    setFeedback({ tipo: "", mensagem: "" });

    const form = new FormData();
    form.append("favicon", faviconFile);

    try {
      const res = await fetch("/api/branding/upload-favicon", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, favicon_url: data.favicon_url }));
        setFaviconFile(null);
        setFaviconPreview(null);
        setFeedback({ tipo: "sucesso", mensagem: "Favicon / Ícone atualizado com sucesso!" });
        await refreshBranding();
      } else {
        setFeedback({ tipo: "erro", mensagem: data.error || "Erro no upload do favicon." });
      }
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: "Erro de rede no upload do favicon." });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleRestaurarPadrao = async () => {
    setRestaurando(true);
    setFeedback({ tipo: "", mensagem: "" });

    try {
      const res = await fetch("/api/branding/restaurar-padrao", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setFormData({
          nome_sistema: "SpotNuvy Pro",
          slogan: "Gestão Inteligente de Hotspot & Wi-Fi",
          texto_rodape: "Tecnologia Hotspot por NuvyCore",
          cor_primaria: "#2563eb",
          logo_url: "/nuvycore.svg",
          favicon_url: ""
        });
        setLogoFile(null);
        setLogoPreview(null);
        setFaviconFile(null);
        setFaviconPreview(null);
        setModalResetAberto(false);
        setFeedback({ tipo: "sucesso", mensagem: "Identidade visual padrão da NuvyCore restaurada com sucesso!" });
        await refreshBranding();
      } else {
        setFeedback({ tipo: "erro", mensagem: data.error || "Erro ao restaurar padrões." });
      }
    } catch (err) {
      setFeedback({ tipo: "erro", mensagem: "Erro ao restaurar padrões." });
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Identidade Visual & Marca do Sistema"
          subtitle="Gerencie a logo oficial, favicon, nome da plataforma e textos exibidos em todo o ecossistema Nuvy Pro."
          badge={<StatusBadge status="info" label="Super Admin" />}
          actions={
            <SecondaryButton onClick={() => setModalResetAberto(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              🔄 Restaurar Padrão Nuvy Pro
            </SecondaryButton>
          }
        />

        {feedback.mensagem && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${feedback.tipo === "sucesso"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
              }`}
          >
            <div className="flex items-center gap-2">
              <span>{feedback.tipo === "sucesso" ? "✅" : "⚠️"}</span>
              <span>{feedback.mensagem}</span>
            </div>
            <button onClick={() => setFeedback({ tipo: "", mensagem: "" })} className="text-xs opacity-60 hover:opacity-100">
              ✕ Fechar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Upload da Logo Principal e Favicon */}
            <div className="lg:col-span-6 space-y-6">
              {/* Card da Logo Principal */}
              <Card>
                <CardHeader title="1. Logo Principal da Plataforma" subtitle="Exibida na tela de login, cadastro, topo do painel e páginas públicas." />
                <CardBody className="space-y-5">
                  {/* Pré-visualização Dual (Claro & Escuro) */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-600 text-slate-600 uppercase tracking-wider">
                      Pré-visualização em Tempo Real:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Fundo Claro */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[110px] text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fundo Claro (Login / Topo)</span>
                        <img
                          src={logoPreview || formData.logo_url}
                          alt="Logo Preview Claro"
                          className="max-h-12 max-w-full object-contain"
                          onError={(e) => { e.currentTarget.src = "/nuvycore.svg"; }}
                        />
                      </div>
                      {/* Fundo Escuro (Sidebar) */}
                      <div className="bg-[#1e293b] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[110px] text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fundo Escuro (Sidebar)</span>
                        <img
                          src={logoPreview || formData.logo_url}
                          alt="Logo Preview Escuro"
                          className="max-h-12 max-w-full object-contain"
                          onError={(e) => { e.currentTarget.src = "/nuvycore.svg"; }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Input de Arquivo */}
                  <div className="space-y-3 pt-2 border-t border-[#e2e8f0]">
                    <label className="text-xs font-semibold text-slate-700">
                      Selecionar Novo Arquivo de Logo (PNG, SVG, JPG, WEBP):
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-lg"
                      />
                      <PrimaryButton
                        onClick={handleUploadLogo}
                        disabled={!logoFile || uploadingLogo}
                        className="whitespace-nowrap flex items-center justify-center gap-2 flex-shrink-0"
                      >
                        {uploadingLogo ? (
                          <>
                            <span className="animate-spin text-xs">⏳</span>
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <span>📤</span>
                            <span>Aplicar Logo</span>
                          </>
                        )}
                      </PrimaryButton>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      💡 <strong>Dica:</strong> Para melhor resultado na Sidebar e no Login, utilize uma imagem em formato horizontal com fundo transparente (ex: 240x60px em SVG ou PNG).
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Card Favicon / Ícone */}
              <Card>
                <CardHeader title="2. Favicon & Ícone do Sistema" subtitle="Ícone exibido na aba do navegador e no ícone de instalação do PWA." />
                <CardBody className="space-y-5">
                  <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-2 flex-shrink-0">
                      <img
                        src={faviconPreview || formData.favicon_url || formData.logo_url || "/nuvycore.svg"}
                        alt="Favicon Preview"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { e.currentTarget.src = "/nuvycore.svg"; }}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Simulação de Ícone de Aba / App</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Formato ideal: Quadrado (ex: 64x64px ou 192x192px) em PNG, ICO ou SVG.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#e2e8f0]">
                    <label className="text-xs font-semibold text-slate-700">
                      Selecionar Novo Favicon / Ícone Quadrado:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="file"
                        accept="image/png,image/x-icon,image/svg+xml,image/jpeg,image/webp,.ico"
                        onChange={handleFaviconChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-lg"
                      />
                      <PrimaryButton
                        onClick={handleUploadFavicon}
                        disabled={!faviconFile || uploadingFavicon}
                        className="whitespace-nowrap flex items-center justify-center gap-2 flex-shrink-0"
                      >
                        {uploadingFavicon ? (
                          <>
                            <span className="animate-spin text-xs">⏳</span>
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <span>📤</span>
                            <span>Aplicar Ícone</span>
                          </>
                        )}
                      </PrimaryButton>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Coluna Direita: Textos da Marca e Personalização */}
            <div className="lg:col-span-6 space-y-6">
              <Card>
                <CardHeader title="3. Nomes & Textos da Marca" subtitle="Personalize o nome da plataforma e os créditos de rodapé do sistema." />
                <CardBody>
                  <form onSubmit={handleSalvarTextos} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                        Nome Oficial da Plataforma *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome_sistema}
                        onChange={(e) => setFormData({ ...formData, nome_sistema: e.target.value })}
                        placeholder="Ex: SpotNuvy Pro ou NuvyCore Hotspot"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Exibido nos cabeçalhos, títulos de páginas e login.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                        Slogan / Subtítulo de Login
                      </label>
                      <input
                        type="text"
                        value={formData.slogan}
                        onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                        placeholder="Ex: Gestão Inteligente de Hotspot & Wi-Fi"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Exibido logo abaixo do nome na tela de login administrativo.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                        Texto de Rodapé dos Portais ('Powered By')
                      </label>
                      <input
                        type="text"
                        value={formData.texto_rodape}
                        onChange={(e) => setFormData({ ...formData, texto_rodape: e.target.value })}
                        placeholder="Ex: Tecnologia Hotspot por NuvyCore"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Texto exibido na base dos portais captivos de visitantes e termos LGPD.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-600 text-slate-600 uppercase tracking-wide mb-1">
                        Cor de Destaque da Marca (Hexadecimal)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.cor_primaria}
                          onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                          className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={formData.cor_primaria}
                          onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                          placeholder="#2563eb"
                          className="flex-1 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e2e8f0] flex justify-end">
                      <PrimaryButton type="submit" disabled={salvando} className="w-full sm:w-auto">
                        {salvando ? "Salvando Alterações..." : "💾 Salvar Configurações de Marca"}
                      </PrimaryButton>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* Informações de Propagação */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <span>⚡</span> Propagação Instantânea
                </h4>
                <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
                  <li>As alterações de Logo e Nome são refletidas em tempo real para todos os usuários.</li>
                  <li>O navegador salva a identidade em cache para carregamento ultrarrápido.</li>
                  <li>Caso alguma empresa cliente tenha enviado sua própria logo no cadastro dela, a logo da empresa prevalecerá no painel dela, mantendo a logo global como fallback.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Restauração */}
        <Modal
          isOpen={modalResetAberto}
          onClose={() => setModalResetAberto(false)}
          title="Restaurar Identidade Padrão NuvyCore?"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja restaurar a logo oficial nativa (<code>/nuvycore.svg</code>) e os textos originais da plataforma?
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton onClick={() => setModalResetAberto(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                onClick={handleRestaurarPadrao}
                disabled={restaurando}
                className="bg-red-600 hover:bg-red-700"
              >
                {restaurando ? "Restaurando..." : "Confirmar e Restaurar"}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
