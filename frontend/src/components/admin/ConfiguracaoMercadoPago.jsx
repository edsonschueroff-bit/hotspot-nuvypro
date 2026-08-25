import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardHeader, CardBody, CardFooter, PrimaryButton, SecondaryButton } from "@/components/ui";

export default function ConfiguracaoMercadoPago() {
  const [form, setForm] = useState({
    public_key: "",
    access_token: "",
    client_id: "",
    client_secret: "",
    email_pagador: "",
    webhook_secret: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get("/api/empresa-config/mercadopago", { headers })
      .then(res => {
        setForm({
          public_key: res.data?.public_key || "",
          access_token: res.data?.access_token || "",
          client_id: res.data?.client_id || "",
          client_secret: res.data?.client_secret || "",
          email_pagador: res.data?.email_pagador || "",
          webhook_secret: res.data?.webhook_secret || "",
        });
      })
      .catch(err => console.error("Erro ao carregar config:", err));
  }, []);

  const salvar = () => {
    setSalvando(true);
    axios.post("/api/empresa-config/mercadopago", form, { headers })
      .then(() => alert("Configurações salvas com sucesso!"))
      .catch(() => alert("Erro ao salvar configurações."))
      .finally(() => setSalvando(false));
  };

  const testarConexao = () => {
    setTestando(true);
    axios.post("/api/empresa-config/mercadopago/testar", {}, { headers })
      .then(res => {
        alert("✅ Comunicação OK com Mercado Pago!\nUsuário: " + res.data.usuario.nickname);
      })
      .catch(err => {
        console.error(err);
        alert("❌ Falha na comunicação com Mercado Pago.");
      })
      .finally(() => setTestando(false));
  };

  return (
    <Card>
      <CardHeader
        title="Credenciais Mercado Pago"
        subtitle="Configure as chaves da sua conta para receber pagamentos via PIX e Cartão"
      />
      <CardBody className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Public Key
          </label>
          <input
            type="text"
            value={form.public_key}
            onChange={(e) => setForm({ ...form, public_key: e.target.value })}
            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] font-mono"
            placeholder="APP_USR-..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Access Token *
          </label>
          <input
            type="password"
            value={form.access_token}
            onChange={(e) => setForm({ ...form, access_token: e.target.value })}
            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] font-mono"
            placeholder="APP_USR-..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Client ID
            </label>
            <input
              type="text"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Client Secret
            </label>
            <input
              type="password"
              value={form.client_secret}
              onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
              className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Email do Pagador (Fallback)
          </label>
          <input
            type="email"
            value={form.email_pagador}
            onChange={(e) => setForm({ ...form, email_pagador: e.target.value })}
            placeholder="email@empresa.com"
            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
          />
          <p className="text-xs text-slate-500 mt-1">Usado quando o visitante não preencher o campo de e-mail no captive portal.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Webhook URL (IPN)
            </label>
            <input
              type="text"
              value={`${window.location.origin}/api/pagamentos/notificacao`}
              readOnly
              className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-3.5 py-2.5 text-xs font-mono select-all cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Cadastre esta URL no painel do Mercado Pago Developers.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Webhook Secret (Opcional)
            </label>
            <input
              type="password"
              className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
              value={form.webhook_secret}
              onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
            />
          </div>
        </div>
      </CardBody>

      <CardFooter className="flex justify-end gap-2.5">
        <SecondaryButton
          onClick={testarConexao}
          loading={testando}
          variant="outline"
          size="md"
        >
          🔍 Testar Conexão
        </SecondaryButton>
        <PrimaryButton
          onClick={salvar}
          loading={salvando}
          size="md"
        >
          Salvar Configurações
        </PrimaryButton>
      </CardFooter>
    </Card>
  );
}
