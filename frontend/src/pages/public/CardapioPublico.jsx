import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Utensils, 
  Search, 
  Star, 
  MessageCircle, 
  Plus, 
  Minus, 
  ShoppingBag, 
  X,
  ChevronRight,
  Wifi
} from "lucide-react";

export default function CardapioPublico() {
  const { empresaSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState("todas");
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState({});
  const [showCarrinhoModal, setShowCarrinhoModal] = useState(false);
  const [produtoModal, setProdutoModal] = useState(null);

  useEffect(() => {
    carregarCardapio();
  }, [empresaSlug]);

  const carregarCardapio = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cardapio/public/${empresaSlug || "default"}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar cardápio:", err);
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = (produto) => {
    setCarrinho(prev => {
      const atual = prev[produto.id] || { produto, quantidade: 0 };
      return {
        ...prev,
        [produto.id]: { produto, quantidade: atual.quantidade + 1 }
      };
    });
  };

  const removerItem = (produtoId) => {
    setCarrinho(prev => {
      const atual = prev[produtoId];
      if (!atual) return prev;
      if (atual.quantidade <= 1) {
        const copy = { ...prev };
        delete copy[produtoId];
        return copy;
      }
      return {
        ...prev,
        [produtoId]: { ...atual, quantidade: atual.quantidade - 1 }
      };
    });
  };

  const totalItensCarrinho = Object.values(carrinho).reduce((acc, item) => acc + item.quantidade, 0);
  const totalValorCarrinho = Object.values(carrinho).reduce((acc, item) => {
    const precoUnit = item.produto.preco_promocional ? Number(item.produto.preco_promocional) : Number(item.produto.preco);
    return acc + (precoUnit * item.quantidade);
  }, 0);

  const enviarPedidoWhatsapp = () => {
    if (!data?.empresa?.whatsapp) {
      alert("WhatsApp do estabelecimento não configurado.");
      return;
    }
    const tel = data.empresa.whatsapp.replace(/\D/g, "");
    let texto = `👋 *Olá! Gostaria de fazer um pedido pelo Cardápio Wi-Fi:*\n\n`;

    Object.values(carrinho).forEach(item => {
      const preco = item.produto.preco_promocional ? item.produto.preco_promocional : item.produto.preco;
      texto += `• *${item.quantidade}x* ${item.produto.nome} - R$ ${(Number(preco) * item.quantidade).toFixed(2)}\n`;
    });

    texto += `\n💰 *Total: R$ ${totalValorCarrinho.toFixed(2)}*\n`;
    texto += `📍 *Origem:* Conexão Wi-Fi ${data.empresa.nome}`;

    const url = `https://wa.me/${tel.startsWith("55") ? tel : "55" + tel}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Carregando Cardápio Digital...</p>
        </div>
      </div>
    );
  }

  if (!data?.empresa) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-sm">
          <Utensils className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">Cardápio Indisponível</h2>
          <p className="text-xs text-slate-500 mt-1">Este estabelecimento ainda não configurou seu cardápio digital.</p>
        </div>
      </div>
    );
  }

  const produtosFiltrados = (data.produtos || []).filter(p => {
    const matchCat = categoriaAtiva === "todas" || String(p.categoria_id) === String(categoriaAtiva);
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase()));
    return matchCat && matchBusca;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Header Mobile com Logo */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.empresa.logo_url ? (
              <img src={data.empresa.logo_url} alt={data.empresa.nome} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold">
                <Utensils className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-sm font-black text-slate-900 leading-tight">{data.empresa.nome}</h1>
                <span className="flex items-center text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  <Wifi className="w-2.5 h-2.5 mr-0.5" /> Conectado
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Cardápio & Vitrine Digital</p>
            </div>
          </div>

          {data.empresa.whatsapp && (
            <a
              href={`https://wa.me/${data.empresa.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Barra de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar pratos, bebidas ou sobremesas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-white rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Categorias - Carrossel Horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setCategoriaAtiva("todas")}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${categoriaAtiva === "todas" ? "bg-[#2563eb] text-white shadow-sm" : "bg-white text-slate-700 border border-slate-200"}`}
          >
            🔥 Todos os Itens
          </button>
          {data.categorias?.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaAtiva(String(c.id))}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${String(categoriaAtiva) === String(c.id) ? "bg-[#2563eb] text-white shadow-sm" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              {c.nome}
            </button>
          ))}
        </div>

        {/* Grid de Produtos */}
        <div className="space-y-3">
          {produtosFiltrados.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Nenhum produto encontrado nesta busca.</p>
            </div>
          ) : (
            produtosFiltrados.map((p) => {
              const qtdNoCarrinho = carrinho[p.id]?.quantidade || 0;
              const precoFinal = p.preco_promocional ? Number(p.preco_promocional) : Number(p.preco);

              return (
                <div
                  key={p.id}
                  onClick={() => setProdutoModal(p)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {p.destaque ? (
                        <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          ⭐ Mais Pedido
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-xs font-black text-slate-900 leading-snug">{p.nome}</h3>
                    {p.descricao && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{p.descricao}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-black text-[#2563eb] font-mono">
                        R$ {precoFinal.toFixed(2)}
                      </span>
                      {p.preco_promocional && (
                        <span className="text-[10px] text-slate-400 line-through font-mono">
                          R$ {Number(p.preco).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Foto e Botão Adicionar */}
                  <div className="relative flex-shrink-0 flex flex-col items-center">
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Utensils className="w-6 h-6" />
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adicionarItem(p);
                      }}
                      className="mt-1.5 px-3 py-1 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {qtdNoCarrinho > 0 ? `${qtdNoCarrinho} no pedido` : "Pedir"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Barra Flutuante de Carrinho / WhatsApp */}
      {totalItensCarrinho > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563eb] flex items-center justify-center font-bold text-xs">
                {totalItensCarrinho}
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Total do Pedido</p>
                <p className="text-sm font-black font-mono">R$ {totalValorCarrinho.toFixed(2)}</p>
              </div>
            </div>

            <button
              onClick={enviarPedidoWhatsapp}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Pedir no WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Produto */}
      {produtoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h2 className="text-base font-black text-slate-900">{produtoModal.nome}</h2>
              <button onClick={() => setProdutoModal(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {produtoModal.imagem_url && (
              <img src={produtoModal.imagem_url} alt={produtoModal.nome} className="w-full h-48 rounded-2xl object-cover border border-slate-200" />
            )}

            <p className="text-xs text-slate-600 leading-relaxed">{produtoModal.descricao || "Item preparado com ingredientes frescos selecionados especialmente para você."}</p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-400 block">Preço</span>
                <span className="text-lg font-black text-[#2563eb] font-mono">
                  R$ {(produtoModal.preco_promocional ? Number(produtoModal.preco_promocional) : Number(produtoModal.preco)).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => removerItem(produtoModal.id)}
                  disabled={!carrinho[produtoModal.id]}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold disabled:opacity-30"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-bold">{carrinho[produtoModal.id]?.quantidade || 0}</span>
                <button
                  onClick={() => adicionarItem(produtoModal)}
                  className="w-8 h-8 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
