import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  PrimaryButton,
  SecondaryButton
} from "../ui";

const PRESETS = [
  {
    nome: "Hostinger",
    icone: "🟣",
    smtp_host: "smtp.hostinger.com",
    smtp_port: 465,
    smtp_secure: true,
    dica: "Utilize seu e-mail e senha criados no painel Hostinger (hPanel)."
  },
  {
    nome: "Gmail / Workspace",
    icone: "🔴",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_secure: false,
    dica: "Requer 'Senha de Aplicativo' de 16 letras gerada na Conta Google > Segurança."
  },
  {
    nome: "Outlook / Office 365",
    icone: "🔵",
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_secure: false,
    dica: "Requer autenticação SMTP habilitada no centro de administração Microsoft 365."
  },
  {
    nome: "SendGrid",
    icone: "🔷",
    smtp_host: "smtp.sendgrid.net",
    smtp_port: 587,
    smtp_secure: false,
    usuario_padrao: "apikey",
    dica: "O usuário é sempre 'apikey' e a senha é a sua Chave API gerada no SendGrid."
  },
  {
    nome: "Amazon SES",
    icone: "🟠",
    smtp_host: "email-smtp.us-east-1.amazonaws.com",
    smtp_port: 587,
    smtp_secure: false,
    dica: "Utilize as credenciais de usuário SMTP geradas no console Amazon SES."
  }
];

export default function ConfiguracaoSmtp() {
  const [config, setConfig] = useState({
    ativo: false,
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
    smtp_pass: "",
    remetente_nome: "",
    remetente_email: "",
    email_resposta: ""
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailTeste, setEmailTeste] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  useEffect(() => {
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    try {
      setCarregando(true);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/empresa-config/smtp", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        setConfig((prev) => ({
          ...prev,
          ativo: data.ativo !== undefined ? Boolean(data.ativo) : false,
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port ? parseInt(data.smtp_port) : 587,
          smtp_secure: Boolean(data.smtp_secure),
          smtp_user: data.smtp_user || "",
          smtp_pass: data.smtp_pass || "",
          remetente_nome: data.remetente_nome || "",
          remetente_email: data.remetente_email || "",
          email_resposta: data.email_resposta || ""
        }));
      }
    } catch (err) {
      console.error("Erro ao carregar configurações de SMTP:", err);
    } finally {
      setCarregando(false);
    }
  };

  const aplicarPreset = (preset) => {
    setConfig((prev) => ({
      ...prev,
      smtp_host: preset.smtp_host,
      smtp_port: preset.smtp_port,
      smtp_secure: preset.smtp_secure,
      smtp_user: preset.usuario_padrao ? preset.usuario_padrao : prev.smtp_user
    }));
    setStatusFeedback({
      tipo: "info",
      texto: `Preset '${preset.nome}' aplicado! ${preset.dica}`
    });
  };

  const handleSalvar = async (e) => {
    if (e) e.preventDefault();
    try {
      setSalvando(true);
      setStatusFeedback(null);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/empresa-config/smtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok) {
        setStatusFeedback({
          tipo: "sucesso",
          texto: "Configurações do servidor SMTP salvas com sucesso!"
        });
      } else {
        setStatusFeedback({
          tipo: "erro",
          texto: data.message || "Erro ao salvar configurações de SMTP."
        });
      }
    } catch (err) {
      setStatusFeedback({
        tipo: "erro",
        texto: "Erro de conexão ao salvar configurações."
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarConexao = async () => {
    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
      setStatusFeedback({
        tipo: "erro",
        texto: "Preencha o Servidor SMTP, Usuário e Senha antes de executar o teste."
      });
      return;
    }

    try {
      setTestando(true);
      setStatusFeedback(null);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/empresa-config/smtp/testar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...config,
          email_destino: emailTeste.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusFeedback({
          tipo: "sucesso",
          texto: data.message || "Conexão SMTP e autenticação validadas com sucesso!"
        });
      } else {
        setStatusFeedback({
          tipo: "erro",
          texto: data.message || "Falha na conexão SMTP. Verifique o host, porta, usuário e senha."
        });
      }
    } catch (err) {
      setStatusFeedback({
        tipo: "erro",
        texto: "Erro ao testar comunicação com o servidor SMTP."
      });
    } finally {
      setTestando(false);
    }
  };

  if (carregando) {
    return <div className="p-8 text-center text-slate-400 text-xs">Carregando configurações de SMTP...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>📧</span>
                Servidor SMTP & E-mail Próprio da Empresa
              </h3>
              <p className="text-xs text-slate-500">
                Envie e-mails de boas-vindas do Wi-Fi e campanhas de marketing do CRM com o seu próprio domínio e remetente.
              </p>
            </div>
            {config.ativo && config.smtp_host ? (
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 w-fit">
                🟢 SMTP Próprio Ativo
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 w-fit">
                🌐 Usando SMTP Padrão Global (Fallback)
              </span>
            )}
          </div>
        </CardHeader>

        <CardBody className="p-6 space-y-6">
          {statusFeedback && (
            <div
              className={`p-3.5 text-xs font-semibold rounded-md border flex items-start justify-between gap-2 ${
                statusFeedback.tipo === "sucesso"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : statusFeedback.tipo === "info"
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>
                  {statusFeedback.tipo === "sucesso" ? "✅" : statusFeedback.tipo === "info" ? "ℹ️" : "⚠️"}
                </span>
                <span>{statusFeedback.texto}</span>
              </div>
              <button
                onClick={() => setStatusFeedback(null)}
                className="text-xs font-bold underline ml-2 cursor-pointer text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. Toggle de Ativação */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-md p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Habilitar Servidor SMTP Exclusivo Desta Empresa
              </h4>
              <p className="text-xs text-slate-500">
                Quando desativado, o sistema utiliza automaticamente o servidor SMTP padrão da plataforma para garantir a entrega.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.ativo}
                onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 2. Presets Rápidos */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              ⚡ Preenchimento Rápido (Presets de Provedores)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.nome}
                  type="button"
                  onClick={() => aplicarPreset(preset)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-md text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer text-center"
                >
                  <span>{preset.icone}</span>
                  <span className="truncate">{preset.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Formulário de Credenciais SMTP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Servidor SMTP (Host) *
              </label>
              <input
                type="text"
                placeholder="Ex: smtp.seudominio.com.br"
                value={config.smtp_host}
                onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Porta SMTP *
                </label>
                <input
                  type="number"
                  placeholder="587 ou 465"
                  value={config.smtp_port}
                  onChange={(e) => {
                    const port = parseInt(e.target.value) || 587;
                    setConfig({
                      ...config,
                      smtp_port: port,
                      smtp_secure: port === 465
                    });
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Segurança / SSL
                </label>
                <select
                  value={config.smtp_secure ? "true" : "false"}
                  onChange={(e) => setConfig({ ...config, smtp_secure: e.target.value === "true" })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600"
                >
                  <option value="false">STARTTLS (Porta 587)</option>
                  <option value="true">SSL/TLS (Porta 465)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Usuário / E-mail de Autenticação *
              </label>
              <input
                type="text"
                placeholder="Ex: contato@suaempresa.com.br"
                value={config.smtp_user}
                onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Senha / App Password *
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={config.smtp_pass}
                  onChange={(e) => setConfig({ ...config, smtp_pass: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 pr-10 focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  title={mostrarSenha ? "Ocultar senha" : "Exibir senha"}
                >
                  {mostrarSenha ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          {/* 4. Identidade Visual do Remetente */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>🏷️</span>
              Identidade Visual & Cabeçalhos de Envio
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nome do Remetente (From Name)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Restaurante Sabor & Arte Wi-Fi"
                  value={config.remetente_nome}
                  onChange={(e) => setConfig({ ...config, remetente_nome: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Nome que aparece na caixa de entrada do cliente.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  E-mail do Remetente (From Email)
                </label>
                <input
                  type="email"
                  placeholder="Ex: wifi@suaempresa.com.br"
                  value={config.remetente_email}
                  onChange={(e) => setConfig({ ...config, remetente_email: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Deixe vazio para usar o e-mail de autenticação.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  E-mail para Resposta (Reply-To)
                </label>
                <input
                  type="email"
                  placeholder="Ex: suporte@suaempresa.com.br"
                  value={config.email_resposta}
                  onChange={(e) => setConfig({ ...config, email_resposta: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Para onde vão as respostas caso o visitante responda.
                </span>
              </div>
            </div>
          </div>

          {/* 5. Seção de Teste de Diagnóstico em Tempo Real */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-md p-5 space-y-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>🧪</span>
                Diagnóstico & Teste de Disparo em Tempo Real
              </h4>
              <p className="text-xs text-slate-500">
                Valide a comunicação com o servidor SMTP e envie uma mensagem de teste imediata para verificar a entrega na caixa de entrada.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 max-w-xl">
              <input
                type="email"
                placeholder="Informe seu e-mail para receber o teste (ex: meuemail@gmail.com)"
                value={emailTeste}
                onChange={(e) => setEmailTeste(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-md p-2.5 focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleTestarConexao}
                disabled={testando || !config.smtp_host || !config.smtp_user || !config.smtp_pass}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
              >
                <span>{testando ? "⏳" : "🚀"}</span>
                {testando ? "Testando Conexão..." : "Testar e Enviar"}
              </button>
            </div>
          </div>

          {/* 6. Botão de Salvar */}
          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            <PrimaryButton onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando..." : "💾 Salvar Configurações SMTP"}
            </PrimaryButton>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
