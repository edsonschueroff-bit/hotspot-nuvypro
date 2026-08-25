import React, { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import ConfiguracaoMercadoPago from "../../components/admin/ConfiguracaoMercadoPago";
import ConfiguracaoSocialAuth from "../../components/admin/ConfiguracaoSocialAuth";
import ConfiguracaoEfi from "../../components/admin/ConfiguracaoEfi";
import ConfiguracaoAlertasDono from "../../components/admin/ConfiguracaoAlertasDono";
import ConfiguracaoEmpresa from "../../components/admin/ConfiguracaoEmpresa";
import { PageHeader, Card, CardHeader, CardBody, PrimaryButton, SecondaryButton, Modal } from "@/components/ui";

const acoes = [
  { chave: "radius", titulo: "Limpar Usuários RADIUS", desc: "Remove todos os registros e senhas do FreeRADIUS local.", endpoint: "/api/limpeza/radius" },
  { chave: "pagamentos", titulo: "Limpar Histórico de Pagamentos", desc: "Exclui todas as transações e cobranças registradas no banco.", endpoint: "/api/limpeza/pagamentos" },
  { chave: "lgpd", titulo: "Limpar Logins e Cadastros LGPD", desc: "Remove todos os consentimentos e termos LGPD antigos.", endpoint: "/api/limpeza/lgpd" },
];

export default function Configuracoes() {
  const [aba, setAba] = useState("empresa");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("admin_token");

  const executarAcao = async (acao) => {
    setLoading(true);
    try {
      const res = await fetch(acao.endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        const erroTexto = contentType?.includes("application/json")
          ? (await res.json()).message
          : await res.text();
        throw new Error(erroTexto || "Erro desconhecido.");
      }

      const data = await res.json();
      alert(data.message || "Ação executada com sucesso!");
    } catch (err) {
      alert("Erro ao executar ação: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
      setModal(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title="Configurações do Sistema"
          subtitle="Gerencie integrações de pagamento, autenticação social e rotinas de manutenção"
        />

        {/* Abas */}
        <div className="bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0] flex gap-1 flex-wrap w-fit">
          <button
            onClick={() => setAba("empresa")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${aba === "empresa"
                ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            📄 Ficha Cadastral
          </button>
          <button
            onClick={() => setAba("limpeza")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${aba === "limpeza"
                ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            🧹 Limpeza
          </button>
          <button
            onClick={() => setAba("mercado")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${aba === "mercado"
                ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            💳 Mercado Pago
          </button>
          <button
            onClick={() => setAba("efi")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${aba === "efi"
                ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            🏦 Efí Bank PIX
          </button>
          <button
            onClick={() => setAba("social")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${aba === "social"
                ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            🌐 Login Social (OAuth)
          </button>
          <button
            onClick={() => setAba("alertas")}
            className={`px-3.5 py-1.5 text-[12px] font-600 rounded-md transition-all cursor-pointer ${aba === "alertas"
                ? "bg-white text-slate-900 shadow-2xs border border-[#e2e8f0]"
                : "text-slate-500 hover:text-slate-900"
              }`}
          >
            📲 Alertas do Proprietário
          </button>
        </div>

        {/* Conteúdo da Aba */}
        {aba === "limpeza" && (
          <div className="space-y-4">
            {acoes.map((acao) => (
              <Card key={acao.chave}>
                <CardBody className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{acao.titulo}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{acao.desc}</p>
                  </div>
                  <SecondaryButton
                    variant="danger"
                    size="sm"
                    onClick={() => setModal(acao)}
                  >
                    Executar Limpeza
                  </SecondaryButton>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {aba === "empresa" && <ConfiguracaoEmpresa />}
        {aba === "mercado" && <ConfiguracaoMercadoPago />}
        {aba === "efi" && <ConfiguracaoEfi />}
        {aba === "social" && <ConfiguracaoSocialAuth />}
        {aba === "alertas" && <ConfiguracaoAlertasDono />}

        <Modal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          title="Confirmar Ação de Limpeza"
          description="Atenção: esta ação é irreversível e removerá dados do banco de dados."
          maxWidth="sm"
          footer={
            <div className="flex justify-end gap-2.5">
              <SecondaryButton onClick={() => setModal(null)}>
                Cancelar
              </SecondaryButton>
              <SecondaryButton
                variant="danger"
                onClick={() => executarAcao(modal)}
                loading={loading}
              >
                Confirmar e Limpar
              </SecondaryButton>
            </div>
          }
        >
          <p className="text-sm text-slate-700">
            Tem certeza que deseja executar <strong>{modal?.titulo}</strong>?
          </p>
        </Modal>
      </div>
    </AdminLayout>
  );
}
