import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowLeft,
  KeyRound,
  Eye
} from "lucide-react";

export default function PortalTitularLgpd() {
  const { empresaSlug } = useParams();
  const [etapa, setEtapa] = useState("solicitar"); // "solicitar" | "otp" | "dados" | "concluido"

  const [identificador, setIdentificador] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [codigoOtp, setCodigoOtp] = useState("");
  const [simuladoOtp, setSimuladoOtp] = useState(null);

  const [dadosTitular, setDadosTitular] = useState(null);
  const [loading, setLoading] = useState(false);
  const [certificado, setCertificado] = useState(null);
  const [motivoExclusao, setMotivoExclusao] = useState("");

  const handleSolicitarOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/lgpd-titular/solicitar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaSlug: empresaSlug || "default",
          telefone: identificador.includes("@") ? null : identificador,
          cpf: identificador.replace(/\D/g, "").length === 11 ? identificador : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProtocolo(data.protocolo);
        setSimuladoOtp(data.simuladoOtp);
        setEtapa("otp");
      } else {
        alert(data.message || "Erro ao solicitar código");
      }
    } catch (err) {
      alert("Falha na conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/lgpd-titular/consultar-dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolo, codigoOtp })
      });
      const data = await res.json();
      if (res.ok) {
        setDadosTitular(data);
        setEtapa("dados");
      } else {
        alert(data.message || "Código incorreto");
      }
    } catch (err) {
      alert("Falha na validação.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnonimizar = async () => {
    if (!window.confirm("Atenção: Esta ação é definitiva e removerá/anonimizará seus dados cadastrais deste estabelecimento em conformidade com o Art. 18 da LGPD. Deseja prosseguir?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/lgpd-titular/anonimizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolo, codigoOtp, motivo: motivoExclusao })
      });
      const data = await res.json();
      if (res.ok) {
        setCertificado(data);
        setEtapa("concluido");
      } else {
        alert(data.message || "Erro ao anonimizar dados");
      }
    } catch (err) {
      alert("Erro na conexão ao anonimizar.");
    } finally {
      setLoading(false);
    }
  };

  const handleBaixarRelatorio = () => {
    const jsonStr = JSON.stringify(dadosTitular, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-lgpd-${protocolo}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-xl mx-auto w-full space-y-6 pt-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-50 text-[#2563eb] rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-blue-200">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal de Privacidade do Titular</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Consulte seus dados cadastrais, baixe relatórios ou exerça seu Direito ao Esquecimento (Lei 13.709/2018 - LGPD).
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
          {/* ETAPA 1: SOLICITAR OTP */}
          {etapa === "solicitar" && (
            <form onSubmit={handleSolicitarOtp} className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#2563eb] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-950 leading-relaxed">
                  Para proteger sua privacidade, enviaremos um código de verificação via WhatsApp para validar sua titularidade antes de exibir os dados.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Celular ou CPF</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: (67) 99255-3089 ou CPF"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="w-full text-sm rounded-xl p-3 bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {loading ? "Enviando Código..." : "Receber Código de Verificação"}
              </button>
            </form>
          )}

          {/* ETAPA 2: DIGITAR OTP */}
          {etapa === "otp" && (
            <form onSubmit={handleVerificarOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500 font-mono">Protocolo: <span className="font-bold text-slate-800">{protocolo}</span></p>
                <h3 className="text-sm font-bold text-slate-900">Digite o código de 6 dígitos recebido</h3>
                {simuladoOtp && (
                  <p className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                    Código de teste: <strong>{simuladoOtp}</strong>
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={codigoOtp}
                  onChange={(e) => setCodigoOtp(e.target.value)}
                  className="w-full text-2xl tracking-[0.5em] text-center font-mono font-black rounded-xl p-3 bg-slate-50 border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEtapa("solicitar")}
                  className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading || codigoOtp.length < 6}
                  className="w-2/3 py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {loading ? "Validando..." : "Acessar Meus Dados"}
                </button>
              </div>
            </form>
          )}

          {/* ETAPA 3: VISUALIZAR DADOS & ESQUECIMENTO */}
          {etapa === "dados" && dadosTitular && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono text-slate-400">PROTOCOLO OFICIAL</span>
                  <p className="text-xs font-bold text-slate-900 font-mono">{protocolo}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                  ✓ Titular Autenticado
                </span>
              </div>

              {/* Resumo de Cadastros */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Dados Cadastrais Encontrados</h3>
                {dadosTitular.registros?.total_encontrados === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum dado pessoal retido nesta empresa.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {dadosTitular.registros.cadastros_lead?.map((l) => (
                      <div key={l.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-slate-900">{l.nome || "Não informado"}</p>
                        <p className="text-slate-600 font-mono text-[11px]">{l.telefone || l.email}</p>
                        <p className="text-[10px] text-slate-400">Cadastrado em: {new Date(l.criado_em).toLocaleDateString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button
                  onClick={handleBaixarRelatorio}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Extrato Completo de Dados (JSON)
                </button>

                <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Direito ao Esquecimento (Art. 18 LGPD)
                  </div>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    Ao confirmar, todos os seus dados pessoais (nome, telefone, e-mail e logins) serão imediatamente e definitivamente anonimizados deste estabelecimento.
                  </p>
                  <input
                    type="text"
                    placeholder="Motivo (opcional): Ex: Não frequento mais"
                    value={motivoExclusao}
                    onChange={(e) => setMotivoExclusao(e.target.value)}
                    className="w-full text-xs rounded-xl p-2 bg-white border border-red-200 text-slate-900"
                  />
                  <button
                    onClick={handleAnonimizar}
                    disabled={loading}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {loading ? "Anonimizando..." : "Confirmar e Excluir Meus Dados"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: CERTIFICADO DE ANONIMIZAÇÃO */}
          {etapa === "concluido" && certificado && (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-base font-black text-slate-900">Solicitação Concluída com Sucesso!</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seus dados foram anonimizados com sucesso. O comprovante digital de conformidade com a LGPD foi gerado abaixo.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left font-mono text-xs space-y-1.5">
                <p><strong className="text-slate-700">Protocolo:</strong> {certificado.protocolo}</p>
                <p><strong className="text-slate-700">Data/Hora:</strong> {new Date(certificado.data_conclusao).toLocaleString("pt-BR")}</p>
                <p className="break-all"><strong className="text-slate-700">Hash de Auditoria:</strong> <span className="text-[10px] text-slate-500">{certificado.hash_auditoria}</span></p>
                <p><strong className="text-slate-700">Status Jurídico:</strong> <span className="text-emerald-700 font-bold">100% Anonimizado</span></p>
              </div>

              <button
                onClick={() => {
                  setEtapa("solicitar");
                  setIdentificador("");
                  setCodigoOtp("");
                  setCertificado(null);
                }}
                className="w-full py-2.5 bg-[#2563eb] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
              >
                Voltar ao Início
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 font-mono">
          NuvyCore Hotspot • Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018)
        </p>
      </div>
    </div>
  );
}
