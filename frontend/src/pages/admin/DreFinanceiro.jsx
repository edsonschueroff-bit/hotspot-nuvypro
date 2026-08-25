import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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

export default function DreFinanceiro() {
  const { empresaSlug } = useParams();
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [dreData, setDreData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [form, setForm] = useState({
    descricao: "",
    categoria: "conectividade",
    tipo: "fixa",
    valor: "",
    data_competencia: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    data_vencimento: "",
    recorrente: 1,
    status: "pago",
    observacoes: ""
  });

  const meses = [
    { num: 1, nome: "Janeiro", sigla: "Jan" },
    { num: 2, nome: "Fevereiro", sigla: "Fev" },
    { num: 3, nome: "Março", sigla: "Mar" },
    { num: 4, nome: "Abril", sigla: "Abr" },
    { num: 5, nome: "Maio", sigla: "Mai" },
    { num: 6, nome: "Junho", sigla: "Jun" },
    { num: 7, nome: "Julho", sigla: "Jul" },
    { num: 8, nome: "Agosto", sigla: "Ago" },
    { num: 9, nome: "Setembro", sigla: "Set" },
    { num: 10, nome: "Outubro", sigla: "Out" },
    { num: 11, nome: "Novembro", sigla: "Nov" },
    { num: 12, nome: "Dezembro", sigla: "Dez" },
  ];

  const categorias = [
    { id: "conectividade", label: "Conectividade & Link Fibra", icon: "🌐", color: "#2563eb", bg: "#eff6ff" },
    { id: "infraestrutura", label: "Servidores & VPS", icon: "🖥️", color: "#7c3aed", bg: "#f5f3ff" },
    { id: "whatsapp", label: "Chips & Instâncias WhatsApp", icon: "📱", color: "#10b981", bg: "#ecfdf5" },
    { id: "equipamentos", label: "Roteadores & Equipamentos", icon: "📡", color: "#f59e0b", bg: "#fffbeb" },
    { id: "licencas", label: "Licenças de Software", icon: "🔑", color: "#06b6d4", bg: "#ecfeff" },
    { id: "outros", label: "Outros Custos Operacionais", icon: "📦", color: "#64748b", bg: "#f8fafc" },
  ];

  const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetchDre();
  }, [mes, ano, empresaSlug]);

  const fetchDre = async () => {
    setLoading(true);
    setErro(null);
    try {
      const slugQuery = empresaSlug ? `&empresa_slug=${empresaSlug}` : "";
      const res = await fetch(`/api/financeiro/dre?mes=${mes}&ano=${ano}${slugQuery}`, { headers });
      if (!res.ok) throw new Error("Erro ao carregar DRE");
      const data = await res.json();
      setDreData(data);
    } catch (err) {
      console.error(err);
      setErro("Falha ao carregar os dados financeiros do período.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const handleNextMonth = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const handleCurrentMonth = () => {
    setMes(now.getMonth() + 1);
    setAno(now.getFullYear());
  };

  const handleCreateDespesa = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch("/api/financeiro/despesas", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, empresa_slug: empresaSlug })
      });
      if (!res.ok) throw new Error("Erro ao salvar despesa");
      setShowModal(false);
      setForm({
        descricao: "",
        categoria: "conectividade",
        tipo: "fixa",
        valor: "",
        data_competencia: `${ano}-${String(mes).padStart(2, "0")}-01`,
        data_vencimento: "",
        recorrente: 1,
        status: "pago",
        observacoes: ""
      });
      fetchDre();
    } catch (err) {
      alert("Erro ao lançar despesa: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleDeleteDespesa = async (id) => {
    try {
      const res = await fetch(`/api/financeiro/despesas/${id}`, {
        method: "DELETE",
        headers
      });
      if (!res.ok) throw new Error("Erro ao excluir despesa");
      setDeleteConfirmId(null);
      fetchDre();
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handlePrint = () => {
    window.print();
  };

  const isCurrentMonth = mes === (now.getMonth() + 1) && ano === now.getFullYear();
  const currentMesObj = meses.find((m) => m.num === mes) || meses[0];

  const totalCustos = dreData?.totalDespesas || 0;
  const custosPorCat = dreData?.custosPorCategoria || {};

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto print:p-0">
        
        {/* Cabeçalho */}
        <PageHeader
          title="DRE & Inteligência Financeira"
          subtitle="Demonstração do Resultado do Exercício, Margens e Gestão de Custos Operacionais do Hotspot"
          icon="📊"
          actions={
            <div className="flex items-center gap-2 flex-wrap print:hidden">
              <SecondaryButton onClick={handlePrint} className="flex items-center gap-1.5 text-[12px] py-2">
                <span>🖨️</span> Imprimir DRE
              </SecondaryButton>

              <PrimaryButton onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-[12px] py-2">
                <span className="font-bold text-base leading-none">+</span> Lançar Custo / Despesa
              </PrimaryButton>
            </div>
          }
        />

        {/* Barra de Período Executiva */}
        <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer text-xs"
              title="Mês anterior"
            >
              ◀
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-[#eff6ff] border border-[#bfdbfe] rounded-[8px]">
              <span className="text-[14px] font-700 text-[#1d4ed8]">
                {currentMesObj.nome} de {ano}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer text-xs"
              title="Próximo mês"
            >
              ▶
            </button>

            {!isCurrentMonth && (
              <button
                onClick={handleCurrentMonth}
                className="px-2.5 py-1 text-[11px] font-600 text-[#2563eb] hover:bg-[#eff6ff] border border-transparent hover:border-[#bfdbfe] rounded-[6px] transition-all cursor-pointer ml-1"
              >
                Mês Atual
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] p-1">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="bg-transparent text-slate-700 text-[12px] font-600 px-2 py-1 focus:outline-none cursor-pointer"
              >
                {meses.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.nome}
                  </option>
                ))}
              </select>
              <span className="text-slate-300">/</span>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="bg-transparent text-slate-700 text-[12px] font-600 px-2 py-1 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] font-600 text-slate-500 bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1.5 rounded-[8px]">
              {user?.empresa_nome || "Filial Principal"}
            </span>
          </div>
        </div>

        {erro && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-[10px] text-[13px] flex items-center gap-2">
            <span>⚠️</span> {erro}
          </div>
        )}

        {/* 4 Cards Principais de KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Receita Bruta */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#2563eb]" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 text-slate-400 uppercase tracking-wider">Receita Bruta Wi-Fi</span>
                <span className="text-[10px] font-700 text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full border border-[#bfdbfe]">
                  Entradas
                </span>
              </div>
              <p className="text-[26px] font-800 text-slate-900 mt-2 font-mono">
                {loading ? "..." : formatBRL(dreData?.receitaBruta)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#f1f5f9] text-[11px]">
              {dreData?.crescimentoReceita >= 0 ? (
                <span className="text-[#10b981] font-700 flex items-center gap-0.5">
                  ▲ +{dreData?.crescimentoReceita || 0}%
                </span>
              ) : (
                <span className="text-red-500 font-700 flex items-center gap-0.5">
                  ▼ {dreData?.crescimentoReceita || 0}%
                </span>
              )}
              <span className="text-slate-400">vs mês anterior</span>
            </div>
          </div>

          {/* Card 2: Deduções / Taxas */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#f59e0b]" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 text-slate-400 uppercase tracking-wider">Taxas de Gateways</span>
                <span className="text-[10px] font-700 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  PIX / Cartão
                </span>
              </div>
              <p className="text-[26px] font-800 text-slate-900 mt-2 font-mono">
                {loading ? "..." : formatBRL(dreData?.deducoesTaxas)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f1f5f9] text-[11px] text-slate-500">
              <span className="text-slate-400">Impacto na Receita</span>
              <span className="font-700 text-amber-700">
                {dreData?.receitaBruta > 0 ? ((dreData?.deducoesTaxas / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Card 3: Custos Operacionais */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#ef4444]" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 text-slate-400 uppercase tracking-wider">Custos Operacionais</span>
                <span className="text-[10px] font-700 text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  {dreData?.despesas?.length || 0} lançamentos
                </span>
              </div>
              <p className="text-[26px] font-800 text-slate-900 mt-2 font-mono">
                {loading ? "..." : formatBRL(dreData?.totalDespesas)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f1f5f9] text-[11px] text-slate-500">
              <span className="text-slate-400">Links, VPS, Chips</span>
              <span className="font-700 text-red-600">
                {dreData?.receitaBruta > 0 ? ((dreData?.totalDespesas / dreData?.receitaBruta) * 100).toFixed(1) : 0}% rec.
              </span>
            </div>
          </div>

          {/* Card 4: Lucro Líquido Real */}
          <div className={`border rounded-[12px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between ${
            dreData?.lucroLiquido >= 0 ? "bg-[#f0fdf4] border-[#bbf7d0]" : "bg-[#fef2f2] border-[#fecaca]"
          }`}>
            <div className={`absolute top-0 left-0 w-[4px] h-full ${dreData?.lucroLiquido >= 0 ? "bg-[#10b981]" : "bg-red-500"}`} />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-700 uppercase tracking-wider text-slate-500">Lucro Líquido Real</span>
                <span className={`text-[10px] font-800 px-2 py-0.5 rounded-full border ${
                  dreData?.lucroLiquido >= 0 ? 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]' : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  Margem: {dreData?.margemLucro || 0}%
                </span>
              </div>
              <p className={`text-[26px] font-800 mt-2 font-mono ${dreData?.lucroLiquido >= 0 ? 'text-[#10b981]' : 'text-red-600'}`}>
                {loading ? "..." : formatBRL(dreData?.lucroLiquido)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 text-[11px]">
              <span className="text-slate-500">Resultado do Exercício</span>
              <span className={`font-700 ${dreData?.lucroLiquido >= 0 ? "text-[#10b981]" : "text-red-600"}`}>
                {dreData?.lucroLiquido >= 0 ? "✓ Superávit" : "⚠ Déficit"}
              </span>
            </div>
          </div>

        </div>

        {/* Mini Distribuição de Custos por Categoria (Gráfico Visual) */}
        {totalCustos > 0 && (
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-[13px] font-700 text-slate-800">Distribuição dos Custos Operacionais</h4>
                <p className="text-[11px] text-slate-400">Divisão percentual dos custos no período de {currentMesObj.nome}</p>
              </div>
              <span className="text-[12px] font-700 text-slate-700 font-mono">
                Total: {formatBRL(totalCustos)}
              </span>
            </div>

            {/* Barra Segmentada Multi-cor */}
            <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 mb-4">
              {Object.entries(custosPorCat).map(([catKey, valor]) => {
                const catObj = categorias.find((c) => c.id === catKey) || { color: "#64748b" };
                const pct = totalCustos > 0 ? (valor / totalCustos) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={catKey}
                    style={{ width: `${pct}%`, backgroundColor: catObj.color }}
                    title={`${catObj.label || catKey}: ${formatBRL(valor)} (${pct.toFixed(1)}%)`}
                    className="h-full transition-all hover:opacity-80"
                  />
                );
              })}
            </div>

            {/* Legenda dos Segmentos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {categorias.map((cat) => {
                const valor = custosPorCat[cat.id] || 0;
                const pct = totalCustos > 0 ? (valor / totalCustos) * 100 : 0;
                return (
                  <div key={cat.id} className="p-2.5 rounded-[8px] bg-[#f8fafc] border border-[#f1f5f9] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-[11px] font-600 text-slate-700 truncate">{cat.label.split("&")[0]}</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-[11px] font-700 text-slate-900 font-mono">{formatBRL(valor)}</span>
                      <span className="text-[10px] text-slate-400 font-600">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabela Estruturada do DRE */}
        <Card>
          <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-700 text-slate-900 flex items-center gap-2">
                <span>📑</span> DRE Gerencial — {currentMesObj.nome} de {ano}
              </h3>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Demonstração contábil detalhada das receitas, deduções e despesas operacionais da sua rede
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="text-[11px] font-600 text-slate-500 hover:text-slate-800 bg-[#f8fafc] hover:bg-slate-100 border border-[#e2e8f0] px-3 py-1.5 rounded-[8px] transition-colors cursor-pointer print:hidden flex items-center gap-1"
            >
              <span>🖨️</span> PDF / Imprimir
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-slate-400 text-[10px] uppercase tracking-wider font-700">
                  <th className="text-left py-3 px-5">Estrutura Contábil / Descrição</th>
                  <th className="text-left py-3 px-5">Classificação</th>
                  <th className="text-right py-3 px-5">Impacto (%)</th>
                  <th className="text-right py-3 px-5">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                
                {/* 1. Receita Bruta */}
                <tr className="bg-white font-600 text-slate-900 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shrink-0" />
                    <span className="font-700 text-slate-900">(+) 1. RECEITA OPERACIONAL BRUTA</span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500 text-[12px]">Vendas Hotspot PIX & Planos</td>
                  <td className="text-right py-3.5 px-5 text-slate-500 font-mono">100,0%</td>
                  <td className="text-right py-3.5 px-5 text-[#2563eb] font-800 font-mono text-[14px]">
                    {formatBRL(dreData?.receitaBruta)}
                  </td>
                </tr>

                {/* 2. Deduções */}
                <tr className="bg-white text-slate-700 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-5 pl-10 text-[12px] flex items-center gap-2">
                    <span className="text-amber-500 font-bold">↳</span>
                    <span className="text-slate-700">(-) 2. DEDUÇÕES E TAXAS DE INTERMEDIAÇÃO</span>
                  </td>
                  <td className="py-3 px-5 text-slate-500 text-[12px]">Taxas Gateway (Mercado Pago / Efí)</td>
                  <td className="text-right py-3 px-5 text-slate-500 text-[12px] font-mono">
                    {dreData?.receitaBruta > 0 ? ((dreData?.deducoesTaxas / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="text-right py-3 px-5 text-amber-700 font-700 font-mono">
                    -{formatBRL(dreData?.deducoesTaxas)}
                  </td>
                </tr>

                {/* 3. Receita Líquida */}
                <tr className="bg-[#f8fafc] font-700 text-slate-900 border-t border-b border-[#e2e8f0]">
                  <td className="py-3.5 px-5 flex items-center gap-2">
                    <span className="text-[#2563eb] font-bold">●</span>
                    <span className="font-700 text-slate-900">(=) 3. RECEITA OPERACIONAL LÍQUIDA</span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500 text-[12px]">Entradas Líquidas Disponíveis</td>
                  <td className="text-right py-3.5 px-5 text-slate-600 font-mono">
                    {dreData?.receitaBruta > 0 ? ((dreData?.receitaLiquida / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="text-right py-3.5 px-5 text-[#2563eb] font-800 font-mono text-[14px]">
                    {formatBRL(dreData?.receitaLiquida)}
                  </td>
                </tr>

                {/* 4. Custos Operacionais Sub-linhas */}
                <tr className="bg-white font-600 text-slate-900">
                  <td className="py-3.5 px-5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <span className="font-700 text-slate-900">(-) 4. CUSTOS E DESPESAS OPERACIONAIS</span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-500 text-[12px]">Total de Despesas Operacionais</td>
                  <td className="text-right py-3.5 px-5 text-slate-500 font-mono">
                    {dreData?.receitaBruta > 0 ? ((dreData?.totalDespesas / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="text-right py-3.5 px-5 text-red-600 font-800 font-mono text-[14px]">
                    -{formatBRL(dreData?.totalDespesas)}
                  </td>
                </tr>

                {/* Categorias de Despesas */}
                {Object.entries(custosPorCat).map(([catKey, valor]) => {
                  const catObj = categorias.find((c) => c.id === catKey);
                  return (
                    <tr key={catKey} className="bg-white text-slate-600 text-[12px] hover:bg-slate-50/60">
                      <td className="py-2.5 px-5 pl-10 flex items-center gap-2">
                        <span className="text-slate-300">↳</span>
                        <span>{catObj?.icon} {catObj?.label || catKey}</span>
                      </td>
                      <td className="py-2.5 px-5 text-slate-400 capitalize">{catKey}</td>
                      <td className="text-right py-2.5 px-5 text-slate-400 font-mono">
                        {dreData?.receitaBruta > 0 ? ((valor / dreData?.receitaBruta) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="text-right py-2.5 px-5 text-slate-700 font-600 font-mono">
                        -{formatBRL(valor)}
                      </td>
                    </tr>
                  );
                })}

                {/* 5. Lucro Líquido Final */}
                <tr className={`${
                  dreData?.lucroLiquido >= 0 ? "bg-[#ecfdf5] border-t-2 border-[#a7f3d0]" : "bg-[#fef2f2] border-t-2 border-[#fecaca]"
                }`}>
                  <td className="py-4 px-5 text-[14px] flex items-center gap-2">
                    <span className="text-lg">{dreData?.lucroLiquido >= 0 ? "🏆" : "⚠️"}</span>
                    <span className="font-800 text-slate-900">(=) 5. RESULTADO LÍQUIDO DO EXERCÍCIO (LUCRO REAL)</span>
                  </td>
                  <td className={`py-4 px-5 text-[12px] font-700 ${dreData?.lucroLiquido >= 0 ? "text-[#10b981]" : "text-red-600"}`}>
                    {dreData?.lucroLiquido >= 0 ? "Lucro Operacional Líquido" : "Prejuízo Operacional"}
                  </td>
                  <td className={`text-right py-4 px-5 font-800 text-[14px] font-mono ${dreData?.lucroLiquido >= 0 ? "text-[#10b981]" : "text-red-600"}`}>
                    {dreData?.margemLucro}% margem
                  </td>
                  <td className={`text-right py-4 px-5 text-[18px] font-900 font-mono ${dreData?.lucroLiquido >= 0 ? 'text-[#10b981]' : 'text-red-600'}`}>
                    {formatBRL(dreData?.lucroLiquido)}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </Card>

        {/* Gestão de Despesas Lançadas */}
        <Card className="print:hidden">
          <div className="p-5 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-700 text-slate-900">Despesas e Custos Lançados no Período</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Gerencie os custos fixos e variáveis que abatem do lucro do seu Hotspot</p>
            </div>
            <PrimaryButton onClick={() => setShowModal(true)} className="text-[12px] py-1.5 self-start sm:self-auto">
              + Adicionar Despesa
            </PrimaryButton>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-slate-400 text-[10px] uppercase tracking-wider font-700">
                  <th className="text-left py-3.5 px-5">Descrição</th>
                  <th className="text-left py-3.5 px-5">Categoria</th>
                  <th className="text-left py-3.5 px-5">Tipo</th>
                  <th className="text-left py-3.5 px-5">Competência</th>
                  <th className="text-left py-3.5 px-5">Status</th>
                  <th className="text-right py-3.5 px-5">Valor</th>
                  <th className="text-center py-3.5 px-5">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {dreData?.despesas?.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-10 text-center text-slate-400 text-[13px]">
                      <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-2 text-lg">📦</div>
                      Nenhuma despesa operacional lançada para este mês.
                    </td>
                  </tr>
                ) : (
                  dreData?.despesas?.map((d) => {
                    const catObj = categorias.find((c) => c.id === d.categoria) || { label: d.categoria, icon: "📦", color: "#64748b", bg: "#f8fafc" };
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-600 text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{d.descricao}</span>
                            {d.recorrente === 1 && (
                              <span className="text-[10px] font-700 text-[#2563eb] bg-[#eff6ff] px-1.5 py-0.5 rounded border border-[#bfdbfe]">
                                Recorrente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-600 border"
                            style={{ backgroundColor: catObj.bg, color: catObj.color, borderColor: `${catObj.color}30` }}
                          >
                            <span>{catObj.icon}</span>
                            <span>{catObj.label.split("&")[0]}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`text-[11px] font-600 px-2 py-0.5 rounded-full ${d.tipo === 'fixa' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {d.tipo === 'fixa' ? 'Fixa' : 'Variável'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 text-[12px]">
                          {new Date(d.data_competencia).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3.5 px-5">
                          <StatusBadge status={d.status === 'pago' ? 'ativo' : 'inativo'}>
                            {d.status === 'pago' ? 'Pago' : 'Pendente'}
                          </StatusBadge>
                        </td>
                        <td className="py-3.5 px-5 text-right font-700 text-slate-900 font-mono">
                          {formatBRL(d.valor)}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {deleteConfirmId === d.id ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleDeleteDespesa(d.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-700 hover:bg-red-700 cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] font-600 hover:bg-slate-300 cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(d.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remover Despesa"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal para Lançar Despesa */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Lançar Custo / Despesa Operacional"
        >
          <form onSubmit={handleCreateDespesa} className="space-y-4">
            <div>
              <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-1">
                Descrição do Custo / Despesa *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Link Dedicado Fibra 600MB - Vivo Fibra"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="ds-input"
              />
            </div>

            {/* Seleção visual de Categoria */}
            <div>
              <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-2">
                Categoria *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categorias.map((c) => {
                  const isSelected = form.categoria === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, categoria: c.id })}
                      className={`p-2.5 rounded-[8px] text-left border transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? "border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8] shadow-2xs"
                          : "border-[#e2e8f0] bg-white text-slate-700 hover:bg-[#f8fafc]"
                      }`}
                    >
                      <span className="text-base">{c.icon}</span>
                      <span className="text-[11px] font-600 leading-tight">{c.label.split("&")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Despesa *
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="ds-input bg-white"
                >
                  <option value="fixa">Despesa Fixa (Mensal)</option>
                  <option value="variavel">Despesa Variável / Avulsa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-1">
                  Status *
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="ds-input bg-white"
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente de Pagamento</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="ds-input font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-700 text-slate-500 uppercase tracking-wider mb-1">
                  Mês de Competência *
                </label>
                <input
                  type="date"
                  required
                  value={form.data_competencia}
                  onChange={(e) => setForm({ ...form, data_competencia: e.target.value })}
                  className="ds-input"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-[13px] text-slate-700 font-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.recorrente === 1}
                  onChange={(e) => setForm({ ...form, recorrente: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded border-[#e2e8f0] text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
                />
                <span>Custo Recorrente (Repetir automaticamente nos próximos meses)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e2e8f0]">
              <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                Cancelar
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar no DRE"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>

      </div>
    </AdminLayout>
  );
}
