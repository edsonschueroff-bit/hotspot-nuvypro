import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  Modal,
  StatusBadge
} from "../../components/ui";

export default function SuperDre() {
  const { isSuperAdmin } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [dreData, setDreData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    descricao: "",
    categoria: "infraestrutura",
    tipo: "fixa",
    valor: "",
    data_competencia: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    empresa_id: "global",
    recorrente: 1,
    status: "pago",
    observacoes: ""
  });

  const meses = [
    { num: 1, nome: "Janeiro" },
    { num: 2, nome: "Fevereiro" },
    { num: 3, nome: "Março" },
    { num: 4, nome: "Abril" },
    { num: 5, nome: "Maio" },
    { num: 6, nome: "Junho" },
    { num: 7, nome: "Julho" },
    { num: 8, nome: "Agosto" },
    { num: 9, nome: "Setembro" },
    { num: 10, nome: "Outubro" },
    { num: 11, nome: "Novembro" },
    { num: 12, nome: "Dezembro" },
  ];

  const categorias = [
    { id: "infraestrutura", label: "🖥️ Servidores VPS & Cloud", icon: "🖥️" },
    { id: "whatsapp", label: "📱 Evolution API / WhatsApp", icon: "📱" },
    { id: "licencas", label: "🔑 Licenças & APIs Externas", icon: "🔑" },
    { id: "conectividade", label: "🌐 Conectividade & IP Fixo", icon: "🌐" },
    { id: "outros", label: "📦 Custos Administrativos", icon: "📦" },
  ];

  const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetchDre();
  }, [mes, ano]);

  const fetchDre = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/dre?mes=${mes}&ano=${ano}&visao=global`, { headers });
      if (!res.ok) throw new Error("Erro ao carregar DRE");
      const data = await res.json();
      setDreData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDespesa = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch("/api/financeiro/despesas", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, empresa_id: null })
      });
      if (!res.ok) throw new Error("Erro ao salvar despesa");
      setShowModal(false);
      fetchDre();
    } catch (err) {
      alert("Erro: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleDeleteDespesa = async (id) => {
    if (!confirm("Deseja realmente remover esta despesa global?")) return;
    try {
      const res = await fetch(`/api/financeiro/despesas/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Erro ao excluir despesa");
      fetchDre();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto print:p-0">
        
        <PageHeader
          title="DRE da Plataforma — Master"
          subtitle="Consolidado financeiro da plataforma: Mensalidades, Comissões e Custos de Infraestrutura Cloud"
          icon="🌐"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap print:hidden">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="ds-input py-1.5 text-[13px] font-600 bg-white"
              >
                {meses.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.nome}
                  </option>
                ))}
              </select>

              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="ds-input py-1.5 text-[13px] font-600 bg-white"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>

              <SecondaryButton onClick={() => window.print()} className="flex items-center gap-1.5">
                <span>🖨️</span> Imprimir
              </SecondaryButton>

              <PrimaryButton onClick={() => setShowModal(true)} className="flex items-center gap-1.5">
                <span>+</span> Lançar Custo Cloud
              </PrimaryButton>
            </div>
          }
        />

        {/* 4 Cards de KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#2563eb]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-600 text-slate-400 uppercase tracking-wider">Faturamento Total (MRR)</span>
              <span className="text-[10px] font-600 text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full border border-[#bfdbfe]">
                Mensalidades
              </span>
            </div>
            <p className="text-[26px] font-700 text-slate-900 mt-2">
              {loading ? "..." : formatBRL(dreData?.receitaBruta)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
              {dreData?.crescimentoReceita >= 0 ? (
                <span className="text-[#10b981] font-600">▲ +{dreData?.crescimentoReceita}%</span>
              ) : (
                <span className="text-red-500 font-600">▼ {dreData?.crescimentoReceita}%</span>
              )}
              <span>vs mês anterior</span>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#f59e0b]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-600 text-slate-400 uppercase tracking-wider">Taxas de Cartão/PIX</span>
              <span className="text-[10px] font-600 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Gateways
              </span>
            </div>
            <p className="text-[26px] font-700 text-slate-900 mt-2">
              {loading ? "..." : formatBRL(dreData?.deducoesTaxas)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Custos bancários da plataforma</p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-red-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-600 text-slate-400 uppercase tracking-wider">Infraestrutura & VPS</span>
              <span className="text-[10px] font-600 text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                Servidores
              </span>
            </div>
            <p className="text-[26px] font-700 text-slate-900 mt-2">
              {loading ? "..." : formatBRL(dreData?.totalDespesas)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Custos globais da plataforma</p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-[10px] p-5 shadow-2xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[#10b981]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-600 text-slate-400 uppercase tracking-wider">Lucro Líquido Global</span>
              <span className="text-[10px] font-600 text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
                Margem: {dreData?.margemLucro || 0}%
              </span>
            </div>
            <p className="text-[26px] font-700 text-[#10b981] mt-2">
              {loading ? "..." : formatBRL(dreData?.lucroLiquido)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Resultado Líquido Consolidado</p>
          </div>

        </div>

        {/* DRE Consolidado */}
        <Card>
          <div className="p-5 border-b border-[#e2e8f0]">
            <h3 className="text-[15px] font-700 text-slate-900">
              DRE Consolidado — {meses.find((m) => m.num === mes)?.nome} de {ano}
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">Visão mestre da receita recorrente de assinaturas de todas as empresas clientes</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-slate-500 text-[11px] uppercase tracking-wider font-600">
                  <th className="text-left py-3 px-5">Estrutura Contábil / Descrição</th>
                  <th className="text-left py-3 px-5">Classificação</th>
                  <th className="text-right py-3 px-5">Impacto (%)</th>
                  <th className="text-right py-3 px-5">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                <tr className="bg-white font-600 text-slate-900">
                  <td className="py-3.5 px-5 flex items-center gap-2">
                    <span className="text-[#2563eb]">●</span>
                    <span>(+) 1. RECEITA OPERACIONAL BRUTA (ASSINATURAS SAAS)</span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500 text-[12px]">Faturas Pagas das Empresas</td>
                  <td className="text-right py-3.5 px-5 text-slate-500">100,0%</td>
                  <td className="text-right py-3.5 px-5 text-slate-900 font-700">{formatBRL(dreData?.receitaBruta)}</td>
                </tr>

                <tr className="bg-white text-slate-700">
                  <td className="py-3 px-5 pl-10 text-[12px] flex items-center gap-2">
                    <span className="text-amber-500">↳</span>
                    <span>(-) 2. DEDUÇÕES DE GATEWAYS DE PAGAMENTO</span>
                  </td>
                  <td className="py-3 px-5 text-slate-500 text-[12px]">Taxas Cartão / PIX</td>
                  <td className="text-right py-3 px-5 text-slate-500 text-[12px]">
                    {dreData?.receitaBruta > 0 ? ((dreData?.deducoesTaxas / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="text-right py-3 px-5 text-red-600 font-600">-{formatBRL(dreData?.deducoesTaxas)}</td>
                </tr>

                <tr className="bg-[#f8fafc] font-700 text-slate-900 border-t border-b border-[#e2e8f0]">
                  <td className="py-3 px-5">(=) 3. RECEITA OPERACIONAL LÍQUIDA SAAS</td>
                  <td className="py-3 px-5 text-slate-500 text-[12px]">Receita Líquida</td>
                  <td className="text-right py-3 px-5 text-slate-500">
                    {dreData?.receitaBruta > 0 ? ((dreData?.receitaLiquida / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="text-right py-3 px-5 text-[#2563eb]">{formatBRL(dreData?.receitaLiquida)}</td>
                </tr>

                <tr className="bg-white font-600 text-slate-900">
                  <td className="py-3.5 px-5 flex items-center gap-2">
                    <span className="text-red-500">●</span>
                    <span>(-) 4. CUSTOS DE INFRAESTRUTURA & NUVEM</span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500 text-[12px]">Despesas Globais</td>
                  <td className="text-right py-3.5 px-5 text-slate-500">
                    {dreData?.receitaBruta > 0 ? ((dreData?.totalDespesas / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="text-right py-3.5 px-5 text-red-600 font-700">-{formatBRL(dreData?.totalDespesas)}</td>
                </tr>

                {/* Categorias Globais */}
                {Object.entries(dreData?.custosPorCategoria || {}).map(([catKey, valor]) => {
                  const catObj = categorias.find((c) => c.id === catKey);
                  return (
                    <tr key={catKey} className="bg-white text-slate-600 text-[12px] hover:bg-slate-50/60">
                      <td className="py-2.5 px-5 pl-10 flex items-center gap-2">
                        <span className="text-slate-300">↳</span>
                        <span>{catObj?.label || catKey}</span>
                      </td>
                      <td className="py-2.5 px-5 text-slate-400 capitalize">{catKey}</td>
                      <td className="text-right py-2.5 px-5 text-slate-400">
                        {dreData?.receitaBruta > 0 ? ((valor / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="text-right py-2.5 px-5 text-slate-700 font-500">-{formatBRL(valor)}</td>
                    </tr>
                  );
                })}

                <tr className="bg-[#eff6ff] font-800 text-slate-900 border-t-2 border-[#bfdbfe]">
                  <td className="py-4 px-5 text-[14px] flex items-center gap-2">
                    <span className="text-[#10b981]">🏆</span>
                    <span>(=) 5. RESULTADO LÍQUIDO CONSOLIDADO SAAS</span>
                  </td>
                  <td className="py-4 px-5 text-[#2563eb] text-[12px] font-600">Lucro Líquido Real</td>
                  <td className="text-right py-4 px-5 text-[#2563eb] font-700 text-[14px]">{dreData?.margemLucro}%</td>
                  <td className="text-right py-4 px-5 text-[16px] font-800 text-[#10b981]">{formatBRL(dreData?.lucroLiquido)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal de Despesa Global */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Lançar Custo Global da Nuvem / Servidores"
        >
          <form onSubmit={handleCreateDespesa} className="space-y-4">
            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">
                Descrição da Despesa Global *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Servidor VPS Hetzner / AWS"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="ds-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">
                  Categoria *
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="ds-input bg-white"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="ds-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">
                Data de Competência *
              </label>
              <input
                type="date"
                required
                value={form.data_competencia}
                onChange={(e) => setForm({ ...form, data_competencia: e.target.value })}
                className="ds-input"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar no DRE Global"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>

      </div>
    </AdminLayout>
  );
}
