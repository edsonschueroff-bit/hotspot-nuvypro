import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardHeader, CardBody, CardFooter, PrimaryButton } from "@/components/ui";

export default function ConfiguracaoEfi() {
  const [form, setForm] = useState({
    client_id: "",
    client_secret: "",
    chave_pix: "",
    ambiente: "sandbox",
    certificado_nome: "",
  });
  const [salvando, setSalvando] = useState(false);

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get("/api/empresa-config/efi", { headers })
      .then(res => {
        setForm({
          client_id: res.data?.client_id || "",
          client_secret: res.data?.client_secret || "",
          chave_pix: res.data?.chave_pix || "",
          ambiente: res.data?.ambiente || "sandbox",
          certificado_nome: res.data?.certificado_nome || "",
        });
      })
      .catch(err => console.error("Erro ao carregar config EFI:", err));
  }, []);

  const salvar = () => {
    setSalvando(true);
    axios.post("/api/empresa-config/efi", form, { headers })
      .then(() => alert("Configurações EFI salvas com sucesso!"))
      .catch(() => alert("Erro ao salvar configurações EFI."))
      .finally(() => setSalvando(false));
  };

  return (
    <Card>
      <CardHeader
        title="Credenciais Efí Bank (Gerencianet)"
        subtitle="Configure as chaves e certificado para emissão direta de PIX"
      />
      <CardBody className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Client ID *
          </label>
          <input
            type="text"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] font-mono"
            placeholder="Client_Id_..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Client Secret *
          </label>
          <input
            type="password"
            value={form.client_secret}
            onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] font-mono"
            placeholder="Client_Secret_..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Chave PIX
            </label>
            <input
              type="text"
              value={form.chave_pix}
              onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
              className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
              placeholder="CNPJ, CPF, E-mail ou Chave Aleatória"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Ambiente de Execução
            </label>
            <select
              value={form.ambiente}
              onChange={(e) => setForm({ ...form, ambiente: e.target.value })}
              className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
            >
              <option value="sandbox">Sandbox (Ambiente de Testes)</option>
              <option value="producao">Produção</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Nome do Arquivo de Certificado (.p12 / .pem)
          </label>
          <input
            type="text"
            value={form.certificado_nome}
            onChange={(e) => setForm({ ...form, certificado_nome: e.target.value })}
            className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] font-mono"
            placeholder="certificado_producao.p12"
          />
          <p className="text-xs text-slate-500 mt-1">O arquivo deve estar gravado na pasta <code>/backend/certificados/</code> do servidor.</p>
        </div>
      </CardBody>

      <CardFooter className="flex justify-end">
        <PrimaryButton
          onClick={salvar}
          loading={salvando}
          size="md"
        >
          Salvar Configurações Efí
        </PrimaryButton>
      </CardFooter>
    </Card>
  );
}
