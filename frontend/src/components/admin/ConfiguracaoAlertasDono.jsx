import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  PrimaryButton,
  SecondaryButton
} from "../ui";

export default function ConfiguracaoAlertasDono() {
  const [config, setConfig] = useState({
    notif_vendas_ativo: true,
    notif_vendas_telefone: "",
    notif_offline_ativo: true,
    notif_offline_telefone: "",
    notif_resumo_diario_ativo: false,
    telegram_ativo: false,
    telegram_bot_token: "",
    telegram_chat_id: ""
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState(null);

  useEffect(() => {
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    try {
      setCarregando(true);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/empresa-config/alertas_dono", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        setConfig((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Erro ao carregar configurações de alertas:", err);
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvar = async (e) => {
    if (e) e.preventDefault();
    try {
      setSalvando(true);
      setMensagemStatus(null);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/empresa-config/alertas_dono", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok) {
        setMensagemStatus({ tipo: "sucesso", texto: "Preferências de alertas salvas com sucesso!" });
      } else {
        setMensagemStatus({ tipo: "erro", texto: data.message || "Erro ao salvar configurações." });
      }
    } catch (err) {
      setMensagemStatus({ tipo: "erro", texto: "Erro de conexão ao salvar configurações." });
    } finally {
      setSalvando(false);
    }
  };

  const handleTestar = async () => {
    try {
      setTestando(true);
      setMensagemStatus(null);
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      const res = await fetch("/api/empresa-config/alertas-dono/testar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          telefone: config.notif_vendas_telefone || config.notif_offline_telefone,
          telegram_bot_token: config.telegram_ativo ? config.telegram_bot_token : "",
          telegram_chat_id: config.telegram_ativo ? config.telegram_chat_id : ""
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMensagemStatus({
          tipo: "sucesso",
          texto: "Mensagem de teste disparada! Verifique o WhatsApp/Telegram cadastrado."
        });
      } else {
        setMensagemStatus({
          tipo: "erro",
          texto: data.message || "Falha ao enviar mensagem de teste. Verifique o número informado."
        });
      }
    } catch (err) {
      setMensagemStatus({ tipo: "erro", texto: "Erro ao testar envio de notificação." });
    } finally {
      setTestando(false);
    }
  };

  if (carregando) {
    return <div className="p-8 text-center text-slate-400 text-xs">Carregando configurações de notificações...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>📲</span>
                Notificações & Alertas em Tempo Real para o Dono
              </h3>
              <p className="text-xs text-slate-500">
                Receba mensagens instantâneas no seu celular sempre que uma venda for concluída ou houver queda de roteador.
              </p>
            </div>
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              WhatsApp & Telegram
            </span>
          </div>
        </CardHeader>

        <CardBody className="p-6 space-y-6">
          {mensagemStatus && (
            <div
              className={`p-3 text-xs font-semibold rounded-xl border flex items-center justify-between ${
                mensagemStatus.tipo === "sucesso"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              <span>{mensagemStatus.texto}</span>
              <button
                onClick={() => setMensagemStatus(null)}
                className="text-xs font-bold underline ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. Alerta de Vendas Wi-Fi */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">💰</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Notificação de Vendas de Pacotes / Fichas Wi-Fi
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Dispara uma mensagem formatada com valor, plano e dados do cliente a cada PIX aprovado.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notif_vendas_ativo}
                  onChange={(e) => setConfig({ ...config, notif_vendas_ativo: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {config.notif_vendas_ativo && (
              <div className="pt-2 border-t border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  WhatsApp do Dono / Gerente para Receber Vendas *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5511999998888 (com DDD)"
                  value={config.notif_vendas_telefone}
                  onChange={(e) => setConfig({ ...config, notif_vendas_telefone: e.target.value })}
                  className="w-full max-w-md bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Informe o número com DDD (ex: 5511988887777 ou 11988887777).
                </span>
              </div>
            )}
          </div>

          {/* 2. Alerta de Infraestrutura (Roteador Offline) */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Alertas de Infraestrutura (Equipamento / Roteador Offline)
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Notifica imediatamente no WhatsApp se um MikroTik ou controladora ficar sem comunicação.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notif_offline_ativo}
                  onChange={(e) => setConfig({ ...config, notif_offline_ativo: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {config.notif_offline_ativo && (
              <div className="pt-2 border-t border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  WhatsApp para Alertas Técnicos de Queda *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5511999998888 (deixe em branco para usar o mesmo de vendas)"
                  value={config.notif_offline_telefone}
                  onChange={(e) => setConfig({ ...config, notif_offline_telefone: e.target.value })}
                  className="w-full max-w-md bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>
            )}
          </div>

          {/* 3. Integração Telegram (Opcional) */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">✈️</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Notificações Adicionais via Telegram Bot (Opcional)
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Espelhe as notificações de vendas e alertas técnicos diretamente em um grupo ou canal do Telegram.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.telegram_ativo}
                  onChange={(e) => setConfig({ ...config, telegram_ativo: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {config.telegram_ativo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    value={config.telegram_bot_token}
                    onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: -1001234567890 ou @meucanal"
                    value={config.telegram_chat_id}
                    onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestar}
              disabled={testando || (!config.notif_vendas_telefone && !config.notif_offline_telefone)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 border border-slate-200"
            >
              <span>🧪</span>
              {testando ? "Disparando Teste..." : "Testar Alerta no Meu Celular"}
            </button>

            <div className="flex items-center gap-2">
              <PrimaryButton onClick={handleSalvar} disabled={salvando}>
                {salvando ? "Salvando..." : "💾 Salvar Preferências de Notificação"}
              </PrimaryButton>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
