import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  PrimaryButton
} from "../../components/ui";

export default function GeradorPlaquinhas() {
  const { user } = useAuth();

  // Estados de Personalização
  const [objetivo, setObjetivo] = useState("wifi"); // "wifi" | "voucher" | "cardapio" | "avaliacao"
  const [ssid, setSsid] = useState("");
  const [senha, setSenha] = useState("");
  const [seguranca, setSeguranca] = useState("WPA"); // "WPA" | "nopass"
  const [urlDestino, setUrlDestino] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [identificacaoMesa, setIdentificacaoMesa] = useState("Mesa 01");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [titulo, setTitulo] = useState("Wi-Fi de Alta Velocidade");
  const [subtitulo, setSubtitulo] = useState("Aponte a câmera do seu celular para conectar");
  const [rodape, setRodape] = useState("Conecte-se e aproveite sua experiência");
  const [template, setTemplate] = useState("clean"); // "clean" | "dark" | "gold"
  const [formato, setFormato] = useState("a5"); // "a4" | "a5" | "totem" | "mini"
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const printAreaRef = useRef(null);

  // Inicializar dados padrão a partir da empresa
  useEffect(() => {
    if (user) {
      const empNome = user.empresa_nome || "Meu Estabelecimento";
      const empSlug = user.empresa_slug || "default";
      const host = window.location.host;
      setNomeEmpresa(empNome);
      setSsid(`Wi-Fi • ${empNome}`);
      setUrlDestino(`https://${host}/portal/${empSlug}`);
      setRodape(`${empNome} • Wi-Fi Seguro`);
    }
  }, [user]);

  // Ao trocar de objetivo, pré-preencher textos e payloads recomendados
  const handleTrocaObjetivo = (novoObj) => {
    setObjetivo(novoObj);
    const empNome = user?.empresa_nome || "Nosso Espaço";
    const empSlug = user?.empresa_slug || "default";
    const host = window.location.host;

    if (novoObj === "wifi") {
      setTitulo("Wi-Fi de Alta Velocidade");
      setSubtitulo("Aponte a câmera do seu celular para conectar instantaneamente");
      setTemplate("clean");
    } else if (novoObj === "voucher") {
      setTitulo("Acesso Wi-Fi Exclusivo");
      setSubtitulo("Escaneie o QR Code para conectar com seu Voucher de Acesso");
      setUrlDestino(`https://${host}/login-hotspot?voucher=${voucherCode || "WIFI-DEMO"}`);
      setTemplate("dark");
    } else if (novoObj === "cardapio") {
      setTitulo("Cardápio Digital & Pedidos");
      setSubtitulo("Aponte a câmera para ver nosso cardápio completo e pedir na mesa");
      setUrlDestino(`https://${host}/cardapio/${empSlug}`);
      setTemplate("gold");
    } else if (novoObj === "avaliacao") {
      setTitulo("Avalie Nossa Experiência");
      setSubtitulo("Deixe sua avaliação 5 estrelas ⭐⭐⭐⭐⭐ no Google ou siga nosso Instagram");
      setUrlDestino(`https://www.google.com/search?q=${encodeURIComponent(empNome)}`);
      setTemplate("clean");
    }
  };

  // Gerar QR Code sempre que os parâmetros mudarem
  useEffect(() => {
    let payload = "";
    const empSlug = user?.empresa_slug || "default";
    const host = window.location.host;

    if (objetivo === "wifi") {
      if (seguranca === "nopass" || !senha.trim()) {
        payload = `WIFI:S:${ssid.trim()};T:nopass;;`;
      } else {
        payload = `WIFI:S:${ssid.trim()};T:WPA;P:${senha.trim()};;`;
      }
    } else if (objetivo === "voucher") {
      const code = voucherCode.trim() ? encodeURIComponent(voucherCode.trim().toUpperCase()) : "";
      payload = code 
        ? `https://${host}/login-hotspot?voucher=${code}&auto=true`
        : `https://${host}/login-hotspot`;
    } else if (objetivo === "cardapio") {
      payload = `https://${host}/cardapio/${empSlug}`;
    } else {
      payload = urlDestino.trim() || `https://${host}/portal/${empSlug}`;
    }

    if (!payload) return;

    QRCode.toDataURL(payload, {
      width: 600,
      margin: 1,
      color: {
        dark: template === "dark" ? "#0f172a" : template === "gold" ? "#1c1917" : "#1e293b",
        light: "#ffffff"
      },
      errorCorrectionLevel: "H"
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Erro ao gerar QR Code:", err));
  }, [objetivo, ssid, senha, seguranca, urlDestino, voucherCode, template, user]);

  const handlePrint = () => {
    window.print();
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AdminLayout>
      {/* Estilos específicos de Impressão Vetorial 300 DPI - 1 Única Página A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden;
          }
          #print-sheet-wrapper, #print-sheet-wrapper * {
            visibility: visible;
          }
          #print-sheet-wrapper {
            position: fixed;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff !important;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            z-index: 999999;
            page-break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
          }
          .plaque-print-card {
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          .print-crop-guide {
            display: flex !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        <PageHeader
          title="Gerador de Plaquinhas de Mesa & Totens Multi-Nicho"
          subtitle="Crie displays profissionais para qualquer tipo de negócio: Restaurantes, Clínicas, Hotéis, Barbearias e Escritórios"
          action={
            <PrimaryButton onClick={handlePrint}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                🖨️ Imprimir / Salvar em PDF
              </span>
            </PrimaryButton>
          }
        />

        {/* 1. SELEÇÃO DO OBJETIVO DO ESTABELECIMENTO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => handleTrocaObjetivo("wifi")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              objetivo === "wifi"
                ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">📶</span>
              <h4 className="text-xs font-bold text-slate-900">Wi-Fi Geral</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">Para Clínicas, Academias, Lojas e Escritórios.</p>
          </button>

          <button
            type="button"
            onClick={() => handleTrocaObjetivo("voucher")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              objetivo === "voucher"
                ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">🎫</span>
              <h4 className="text-xs font-bold text-slate-900">Voucher / Quarto</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">Para Hotéis, Pousadas, Coworkings e Eventos.</p>
          </button>

          <button
            type="button"
            onClick={() => handleTrocaObjetivo("cardapio")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              objetivo === "cardapio"
                ? "border-amber-600 bg-amber-50/70 ring-2 ring-amber-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">🍽️</span>
              <h4 className="text-xs font-bold text-slate-900">Cardápio na Mesa</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">Para Bares, Restaurantes, Cafés e Lanchonetes.</p>
          </button>

          <button
            type="button"
            onClick={() => handleTrocaObjetivo("avaliacao")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              objetivo === "avaliacao"
                ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">⭐</span>
              <h4 className="text-xs font-bold text-slate-900">Avaliações & Redes</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">Para Barbearias, Salões, Estética e Lojas.</p>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna 1: Painel de Customização (5 colunas) */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>🎨</span>
                  Design & Formato
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Seleção de Template */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Estilo Visual
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplate("clean")}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        template === "clean"
                          ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 mx-auto mb-1.5 flex items-center justify-center text-xs">
                        ☀️
                      </div>
                      <p className="text-xs font-bold text-slate-800">Clean</p>
                      <p className="text-[10px] text-slate-500">Clássico</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplate("dark")}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        template === "dark"
                          ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white mx-auto mb-1.5 flex items-center justify-center text-xs">
                        🌙
                      </div>
                      <p className="text-xs font-bold text-slate-800">Dark Tech</p>
                      <p className="text-[10px] text-slate-500">Moderno</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplate("gold")}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        template === "gold"
                          ? "border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-950 text-amber-300 mx-auto mb-1.5 flex items-center justify-center text-xs">
                        🏆
                      </div>
                      <p className="text-xs font-bold text-slate-800">Gold VIP</p>
                      <p className="text-[10px] text-slate-500">Premium</p>
                    </button>
                  </div>
                </div>

                {/* Seleção de Formato */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Tamanho do Display / Plaquinha
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormato("a5")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formato === "a5"
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 font-bold"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                      }`}
                    >
                      <span className="block text-xs font-bold">📋 A5 Display de Mesa</span>
                      <span className="text-[10px] text-slate-500 font-normal">140 x 195 mm (Padrão)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormato("totem")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formato === "totem"
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 font-bold"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                      }`}
                    >
                      <span className="block text-xs font-bold">🪧 Totem Acrílico 10x15</span>
                      <span className="text-[10px] text-slate-500 font-normal">100 x 150 mm (Porta-Retrato)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormato("a4")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formato === "a4"
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 font-bold"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                      }`}
                    >
                      <span className="block text-xs font-bold">📄 A4 Cartaz de Balcão</span>
                      <span className="text-[10px] text-slate-500 font-normal">185 x 265 mm (Folha A4)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormato("mini")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formato === "mini"
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 font-bold"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                      }`}
                    >
                      <span className="block text-xs font-bold">🏷️ Adesivo Quadrado</span>
                      <span className="text-[10px] text-slate-500 font-normal">70 x 70 mm (Canto de mesa)</span>
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>⚙️</span>
                  Textos e Identificação
                </h3>
              </CardHeader>
              <CardBody className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nome do Estabelecimento
                  </label>
                  <input
                    type="text"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Restaurante Sabor Real"
                  />
                </div>

                {objetivo === "voucher" && (
                  <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 uppercase mb-1">
                        Código do Voucher
                      </label>
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-blue-300 bg-white"
                        placeholder="Ex: WIFI-4LC8"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 uppercase mb-1">
                        Mesa / Quarto
                      </label>
                      <input
                        type="text"
                        value={identificacaoMesa}
                        onChange={(e) => setIdentificacaoMesa(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-blue-300 bg-white"
                        placeholder="Ex: Quarto 102"
                      />
                    </div>
                  </div>
                )}

                {objetivo === "wifi" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Nome do Wi-Fi (SSID)
                      </label>
                      <input
                        type="text"
                        value={ssid}
                        onChange={(e) => setSsid(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Senha (ou Sem Senha)
                      </label>
                      <input
                        type="text"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Deixe vazio se for aberto"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {objetivo === "avaliacao" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Link do Google Meu Negócio / Instagram
                    </label>
                    <input
                      type="url"
                      value={urlDestino}
                      onChange={(e) => setUrlDestino(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                      placeholder="https://g.page/r/sua-empresa/review"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Título Principal
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Frase de Instrução
                  </label>
                  <textarea
                    rows={2}
                    value={subtitulo}
                    onChange={(e) => setSubtitulo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Logotipo Personalizado (Opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Coluna 2: Live Preview & Container de Impressão (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-start">
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Pré-Visualização Real da Plaquinha
              </span>
              <button
                onClick={handlePrint}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>🖨️ Abrir Diálogo de Impressão</span>
              </button>
            </div>

            {/* Container da Folha e Plaquinha */}
            <div className="w-full bg-slate-200/70 p-6 md:p-8 rounded-[10px] border border-slate-300 flex items-center justify-center overflow-hidden shadow-inner">
              <div id="print-sheet-wrapper" ref={printAreaRef}>
                {/* Linha de corte externa pontilhada */}
                <div
                  className={`
                    relative transition-all duration-200 p-0 flex flex-col items-center justify-center
                    ${
                      formato === "a5"
                        ? "w-[360px] print:w-[140mm] print:h-[195mm]"
                        : formato === "totem"
                        ? "w-[300px] print:w-[100mm] print:h-[150mm]"
                        : formato === "a4"
                        ? "w-[440px] print:w-[185mm] print:h-[265mm]"
                        : "w-[280px] print:w-[70mm] print:h-[70mm]"
                    }
                  `}
                >
                  {/* Guia de corte visual na folha A4 */}
                  {formato !== "a4" && (
                    <div className="hidden print-crop-guide absolute -top-5 left-0 right-0 text-center text-[8pt] text-slate-400 font-mono">
                      ✂️ Linha de corte para Display de Mesa ({formato === "totem" ? "10x15 cm" : formato === "a5" ? "A5" : "7x7 cm"})
                    </div>
                  )}

                  {/* Cartão da Plaquinha */}
                  <div
                    className={`
                      plaque-print-card w-full h-full shadow-2xl relative flex flex-col items-center justify-between text-center overflow-hidden
                      ${
                        formato === "a5"
                          ? "p-6 rounded-3xl print:p-[6mm] print:rounded-[6mm]"
                          : formato === "totem"
                          ? "p-5 rounded-2xl print:p-[5mm] print:rounded-[5mm]"
                          : formato === "a4"
                          ? "p-8 rounded-3xl print:p-[10mm] print:rounded-[8mm]"
                          : "p-4 rounded-xl print:p-[3mm] print:rounded-[3mm]"
                      }
                      ${
                        template === "clean"
                          ? "bg-white text-slate-900 border-2 border-slate-200 print:border-slate-300"
                          : template === "dark"
                          ? "bg-slate-900 text-white border-2 border-slate-700"
                          : "bg-stone-950 text-amber-50 border-2 border-amber-800/80"
                      }
                    `}
                  >
                    {/* Topo / Logo e Estabelecimento */}
                    <div className="space-y-1.5 w-full flex flex-col items-center pt-1">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-9 max-w-[130px] object-contain rounded-md shadow-xs print:h-[10mm]" />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md print:w-[9mm] print:h-[9mm] ${
                            template === "clean"
                              ? "bg-blue-600 text-white"
                              : template === "dark"
                              ? "bg-blue-600 text-white"
                              : "bg-amber-600 text-stone-950"
                          }`}
                        >
                          {objetivo === "cardapio" ? (
                            <span className="text-base print:text-[12pt]">🍽️</span>
                          ) : objetivo === "voucher" ? (
                            <span className="text-base print:text-[12pt]">🎫</span>
                          ) : objetivo === "avaliacao" ? (
                            <span className="text-base print:text-[12pt]">⭐</span>
                          ) : (
                            <svg className="w-5 h-5 print:w-[5mm] print:h-[5mm]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                          )}
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <p
                          className={`text-[10px] print:text-[8pt] font-bold tracking-widest uppercase ${
                            template === "clean"
                              ? "text-blue-600"
                              : template === "dark"
                              ? "text-blue-400"
                              : "text-amber-400"
                          }`}
                        >
                          {nomeEmpresa}
                        </p>
                        <h2 className="text-lg md:text-xl print:text-[15pt] font-black tracking-tight leading-tight">
                          {titulo}
                        </h2>
                      </div>
                    </div>

                    {/* QR Code Central Compacto */}
                    <div className="my-3 print:my-[3mm] flex flex-col items-center">
                      <div
                        className={`p-2.5 rounded-2xl shadow-md transition-transform ${
                          template === "clean"
                            ? "bg-white border-2 border-slate-200"
                            : template === "dark"
                            ? "bg-white border-4 border-blue-500/30"
                            : "bg-white border-4 border-amber-500/30"
                        }`}
                      >
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="QR Code"
                            className={`object-contain rounded-lg ${
                              formato === "a4"
                                ? "w-44 h-44 print:w-[50mm] print:h-[50mm]"
                                : formato === "mini"
                                ? "w-28 h-28 print:w-[28mm] print:h-[28mm]"
                                : "w-36 h-36 print:w-[40mm] print:h-[40mm]"
                            }`}
                          />
                        ) : (
                          <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-lg"></div>
                        )}
                      </div>

                      <p
                        className={`text-[11px] print:text-[8pt] font-medium max-w-[240px] mt-2 print:mt-[2mm] leading-tight ${
                          template === "clean"
                            ? "text-slate-600"
                            : template === "dark"
                            ? "text-slate-300"
                            : "text-stone-300"
                        }`}
                      >
                        {subtitulo}
                      </p>
                    </div>

                    {/* Bloco de Dados e Rodapé */}
                    <div className="w-full space-y-1.5 pb-1">
                      {objetivo === "wifi" && (
                        <div
                          className={`py-1.5 px-3 rounded-xl text-[10px] print:text-[7.5pt] font-semibold border flex items-center justify-between gap-1 ${
                            template === "clean"
                              ? "bg-slate-50 border-slate-200 text-slate-700"
                              : template === "dark"
                              ? "bg-slate-800 border-slate-700 text-slate-200"
                              : "bg-stone-900 border-stone-800 text-amber-200"
                          }`}
                        >
                          <span className="truncate">📶 Rede: <strong className="font-bold">{ssid}</strong></span>
                          {seguranca === "WPA" && senha ? (
                            <span className="shrink-0">🔑 Senha: <strong className="font-mono">{senha}</strong></span>
                          ) : (
                            <span className="shrink-0 text-emerald-500 font-bold">✓ Sem Senha</span>
                          )}
                        </div>
                      )}

                      {objetivo === "voucher" && voucherCode && (
                        <div
                          className={`py-1.5 px-3 rounded-xl text-[10px] print:text-[7.5pt] font-semibold border flex items-center justify-between gap-1 ${
                            template === "clean"
                              ? "bg-blue-50 border-blue-200 text-blue-900"
                              : template === "dark"
                              ? "bg-slate-800 border-slate-700 text-blue-300"
                              : "bg-stone-900 border-stone-800 text-amber-300"
                          }`}
                        >
                          <span>{identificacaoMesa || "Voucher Individual"}</span>
                          <span className="font-mono font-bold">{voucherCode}</span>
                        </div>
                      )}

                      {objetivo === "avaliacao" && (
                        <div className="flex justify-center text-amber-400 text-xs gap-0.5 my-1">
                          ★★★★★
                        </div>
                      )}

                      <p
                        className={`text-[9px] print:text-[6.5pt] tracking-wide ${
                          template === "clean"
                            ? "text-slate-400"
                            : template === "dark"
                            ? "text-slate-500"
                            : "text-stone-500"
                        }`}
                      >
                        {rodape}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dica de Acabamento */}
            <div className="w-full mt-4 bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
              <span className="text-base flex-shrink-0">💡</span>
              <div className="space-y-1">
                <p className="font-bold">Como obter o melhor resultado impresso:</p>
                <p className="text-slate-600 leading-relaxed">
                  Ao clicar em <strong>Imprimir / Salvar em PDF</strong>, selecione <strong>Páginas: 1</strong> e marque a opção <strong>Gráficos de segundo plano</strong> para que as cores, molduras e QR Code saiam com qualidade máxima para seus displays.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
