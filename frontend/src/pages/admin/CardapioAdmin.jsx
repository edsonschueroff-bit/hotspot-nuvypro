import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardBody, PrimaryButton, SecondaryButton, Modal, StatusBadge } from "@/components/ui";
import { 
  Utensils, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Star, 
  Layers, 
  ShoppingBag,
  Copy,
  Check
} from "lucide-react";

export default function CardapioAdmin() {
  const { empresaSlug } = useParams();
  const [aba, setAba] = useState("produtos"); // "produtos" | "categorias"
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  // Modal Categoria
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCatId, setEditCatId] = useState(null);
  const [catForm, setCatForm] = useState({ nome: "", icone: "Utensils", ordem: 0, ativo: true });

  // Modal Produto
  const [showProdModal, setShowProdModal] = useState(false);
  const [editProdId, setEditProdId] = useState(null);
  const [prodForm, setProdForm] = useState({
    categoria_id: "",
    nome: "",
    descricao: "",
    preco: "",
    preco_promocional: "",
    imagem_url: "",
    destaque: false,
    disponivel: true,
    ordem: 0
  });

  const token = localStorage.getItem("admin_token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const publicUrl = `${window.location.origin}/cardapio/${empresaSlug || "default"}`;

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resCats, resProds] = await Promise.all([
        fetch("/api/cardapio/categorias", { headers }),
        fetch("/api/cardapio/produtos", { headers })
      ]);
      if (resCats.ok) setCategorias(await resCats.json());
      if (resProds.ok) setProdutos(await resProds.json());
    } catch (err) {
      console.error("Erro ao carregar cardápio:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // --- CATEGORIAS ---
  const handleOpenCatModal = (cat = null) => {
    if (cat) {
      setEditCatId(cat.id);
      setCatForm({ nome: cat.nome, icone: cat.icone || "Utensils", ordem: cat.ordem || 0, ativo: !!cat.ativo });
    } else {
      setEditCatId(null);
      setCatForm({ nome: "", icone: "Utensils", ordem: categorias.length + 1, ativo: true });
    }
    setShowCatModal(true);
  };

  const handleSalvarCategoria = async (e) => {
    e.preventDefault();
    try {
      const url = editCatId ? `/api/cardapio/categorias/${editCatId}` : "/api/cardapio/categorias";
      const method = editCatId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(catForm) });
      if (res.ok) {
        setShowCatModal(false);
        carregarDados();
      }
    } catch (err) {
      alert("Erro ao salvar categoria.");
    }
  };

  const handleDeletarCategoria = async (id) => {
    if (!window.confirm("Excluir esta categoria? Os produtos continuarão salvos.")) return;
    try {
      const res = await fetch(`/api/cardapio/categorias/${id}`, { method: "DELETE", headers });
      if (res.ok) carregarDados();
    } catch (err) {
      alert("Erro ao deletar categoria.");
    }
  };

  // --- PRODUTOS ---
  const handleOpenProdModal = (prod = null) => {
    if (prod) {
      setEditProdId(prod.id);
      setProdForm({
        categoria_id: prod.categoria_id || "",
        nome: prod.nome,
        descricao: prod.descricao || "",
        preco: prod.preco,
        preco_promocional: prod.preco_promocional || "",
        imagem_url: prod.imagem_url || "",
        destaque: !!prod.destaque,
        disponivel: !!prod.disponivel,
        ordem: prod.ordem || 0
      });
    } else {
      setEditProdId(null);
      setProdForm({
        categoria_id: categorias[0]?.id || "",
        nome: "",
        descricao: "",
        preco: "",
        preco_promocional: "",
        imagem_url: "",
        destaque: false,
        disponivel: true,
        ordem: produtos.length + 1
      });
    }
    setShowProdModal(true);
  };

  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    try {
      const url = editProdId ? `/api/cardapio/produtos/${editProdId}` : "/api/cardapio/produtos";
      const method = editProdId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(prodForm) });
      if (res.ok) {
        setShowProdModal(false);
        carregarDados();
      }
    } catch (err) {
      alert("Erro ao salvar produto.");
    }
  };

  const handleDeletarProduto = async (id) => {
    if (!window.confirm("Excluir este produto do cardápio?")) return;
    try {
      const res = await fetch(`/api/cardapio/produtos/${id}`, { method: "DELETE", headers });
      if (res.ok) carregarDados();
    } catch (err) {
      alert("Erro ao deletar produto.");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={<Utensils className="w-6 h-6 text-[#2563eb]" />}
          title="Wi-Fi Commerce & Cardápio Digital"
          subtitle="Crie a vitrine interativa de produtos que é exibida aos clientes logo após se conectarem ao Wi-Fi"
          actions={
            <div className="flex gap-2">
              <SecondaryButton onClick={handleCopiarLink}>
                {copiado ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copiado ? "Link Copiado!" : "Copiar Link Público"}
              </SecondaryButton>
              <PrimaryButton onClick={() => aba === "produtos" ? handleOpenProdModal() : handleOpenCatModal()}>
                <Plus className="w-4 h-4 mr-1.5" />
                {aba === "produtos" ? "Novo Produto" : "Nova Categoria"}
              </PrimaryButton>
            </div>
          }
        />

        {/* Link do Cardápio Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-[10px] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              Pós-Conexão Automático
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Link Direto da Vitrine / Cardápio Digital</h4>
            <p className="text-xs text-slate-600 font-mono mt-0.5">{publicUrl}</p>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs font-bold text-[#2563eb] hover:underline"
          >
            Abrir Vitrine em Nova Aba <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>

        {/* Abas */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-fit">
          <button
            onClick={() => setAba("produtos")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${aba === "produtos" ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            🍔 Produtos & Destaques ({produtos.length})
          </button>
          <button
            onClick={() => setAba("categorias")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${aba === "categorias" ? "bg-white text-[#2563eb] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            🏷️ Categorias ({categorias.length})
          </button>
        </div>

        {/* Conteúdo Aba PRODUTOS */}
        {aba === "produtos" && (
          <Card>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">⏳ Carregando produtos...</div>
              ) : produtos.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Nenhum produto cadastrado</h4>
                  <p className="text-xs text-slate-500 mb-4">Adicione pratos, bebidas ou serviços para exibir aos clientes conectados.</p>
                  <PrimaryButton onClick={() => handleOpenProdModal()}>Cadastrar Primeiro Produto</PrimaryButton>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Produto</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4">Preço</th>
                        <th className="py-3 px-4 text-center">Destaque ⭐</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {produtos.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {p.imagem_url ? (
                                <img src={p.imagem_url} alt={p.nome} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Utensils className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-900 block">{p.nome}</span>
                                <span className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{p.descricao || "Sem descrição"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-600">
                            {p.categoria_nome || "Sem categoria"}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {p.preco_promocional ? (
                              <div>
                                <span className="text-emerald-600">R$ {Number(p.preco_promocional).toFixed(2)}</span>
                                <span className="text-[10px] text-slate-400 line-through block font-normal">R$ {Number(p.preco).toFixed(2)}</span>
                              </div>
                            ) : (
                              <span>R$ {Number(p.preco).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {p.destaque ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                                ⭐ Destaque
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={p.disponivel ? "ativo" : "inativo"} text={p.disponivel ? "Disponível" : "Indisponível"} />
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <SecondaryButton variant="subtle" className="px-2 py-1 text-xs" onClick={() => handleOpenProdModal(p)}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </SecondaryButton>
                            <SecondaryButton variant="ghost" className="px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => handleDeletarProduto(p.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </SecondaryButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Conteúdo Aba CATEGORIAS */}
        {aba === "categorias" && (
          <Card>
            <CardBody className="p-0">
              {categorias.length === 0 ? (
                <div className="p-12 text-center">
                  <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">Nenhuma categoria cadastrada</h4>
                  <p className="text-xs text-slate-500 mb-4">Crie categorias (ex: Bebidas, Sobremesas, Lanches) para organizar sua vitrine.</p>
                  <PrimaryButton onClick={() => handleOpenCatModal()}>Criar Categoria</PrimaryButton>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Nome da Categoria</th>
                        <th className="py-3 px-4 text-center">Ordem</th>
                        <th className="py-3 px-4 text-center">Produtos Vinculados</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {categorias.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#2563eb]" />
                            {c.nome}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">{c.ordem}</td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{c.total_produtos || 0} produtos</td>
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge status={c.ativo ? "ativo" : "inativo"} text={c.ativo ? "Ativa" : "Oculta"} />
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <SecondaryButton variant="subtle" className="px-2 py-1 text-xs" onClick={() => handleOpenCatModal(c)}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </SecondaryButton>
                            <SecondaryButton variant="ghost" className="px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => handleDeletarCategoria(c.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </SecondaryButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modal Categoria */}
      <Modal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        title={editCatId ? "Editar Categoria" : "Nova Categoria"}
      >
        <form onSubmit={handleSalvarCategoria} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Categoria</label>
            <input
              type="text"
              required
              placeholder="Ex: Pratos Principais, Bebidas, Sobremesas"
              value={catForm.nome}
              onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Ordem de Exibição</label>
              <input
                type="number"
                value={catForm.ordem}
                onChange={(e) => setCatForm({ ...catForm, ordem: Number(e.target.value) })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
            <div className="w-1/2 flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catForm.ativo}
                  onChange={(e) => setCatForm({ ...catForm, ativo: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Categoria Ativa
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
            <SecondaryButton onClick={() => setShowCatModal(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Salvar Categoria</PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Modal Produto */}
      <Modal
        isOpen={showProdModal}
        onClose={() => setShowProdModal(false)}
        title={editProdId ? "Editar Produto" : "Novo Produto na Vitrine"}
      >
        <form onSubmit={handleSalvarProduto} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Produto</label>
            <input
              type="text"
              required
              placeholder="Ex: Burger Artesanal com Fritas"
              value={prodForm.nome}
              onChange={(e) => setProdForm({ ...prodForm, nome: e.target.value })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
              <select
                value={prodForm.categoria_id}
                onChange={(e) => setProdForm({ ...prodForm, categoria_id: e.target.value })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-medium"
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preço Regular (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 35.00"
                value={prodForm.preco}
                onChange={(e) => setProdForm({ ...prodForm, preco: e.target.value })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900 font-bold font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preço Promocional (Opcional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 29.90"
                value={prodForm.preco_promocional}
                onChange={(e) => setProdForm({ ...prodForm, preco_promocional: e.target.value })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-emerald-700 font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">URL da Imagem / Foto</label>
              <input
                type="url"
                placeholder="https://..."
                value={prodForm.imagem_url}
                onChange={(e) => setProdForm({ ...prodForm, imagem_url: e.target.value })}
                className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição / Ingredientes</label>
            <textarea
              rows={2}
              placeholder="Descreva o prato, porção ou serviço..."
              value={prodForm.descricao}
              onChange={(e) => setProdForm({ ...prodForm, descricao: e.target.value })}
              className="w-full text-xs rounded-xl p-2.5 bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={prodForm.destaque}
                onChange={(e) => setProdForm({ ...prodForm, destaque: e.target.checked })}
                className="rounded text-amber-500"
              />
              ⭐ Item em Destaque
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={prodForm.disponivel}
                onChange={(e) => setProdForm({ ...prodForm, disponivel: e.target.checked })}
                className="rounded text-blue-600"
              />
              Produto Disponível
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
            <SecondaryButton onClick={() => setShowProdModal(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Salvar Produto</PrimaryButton>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
