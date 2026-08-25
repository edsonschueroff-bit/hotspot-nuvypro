// frontend/src/pages/admin/Sessoes.jsx
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton } from "@/components/ui";

export default function Sessoes() {
  const [sessoes, setSessoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarSessoes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/radius/sessoes", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar sessões");
      setSessoes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar sessões:", err);
      setSessoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarSessoes();
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          }
          title="Sessões RADIUS Ativas"
          subtitle="Acompanhe os clientes autenticados e navegando na rede em tempo real"
          actions={
            <PrimaryButton onClick={carregarSessoes} loading={loading} size="md">
              🔄 Atualizar Sessões
            </PrimaryButton>
          }
        />

        <Card>
          <CardBody noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-left">
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">MAC Address</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Endereço IP</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">NAS (MikroTik)</th>
                    <th className="px-6 py-3.5 text-[10px] font-600 text-slate-400 uppercase tracking-wider">Início da Sessão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {sessoes.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-900 font-semibold">{s.username}</td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">{s.cpf || "—"}</td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">{s.mac || "—"}</td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">{s.ip || "—"}</td>
                      <td className="px-6 py-3.5 text-slate-700 text-xs font-medium">{s.gateway || "—"}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">
                        {s.acctstarttime ? new Date(s.acctstarttime).toLocaleString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                  {sessoes.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                        Nenhuma sessão ativa no momento na rede.
                      </td>
                    </tr>
                  )}
                  {loading && sessoes.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">
                        Carregando sessões ativas do FreeRADIUS...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}
