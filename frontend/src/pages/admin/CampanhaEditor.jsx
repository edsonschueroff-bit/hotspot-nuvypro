import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { PageHeader, Card, CardHeader, CardBody, PrimaryButton, SecondaryButton, StatusBadge } from "@/components/ui";

export default function CampanhaEditor() {
  const { empresaSlug, id } = useParams();
  const [campanha, setCampanha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("admin_token");

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar campanha");
      setCampanha(data.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [id]);

  const handleToggleAtivo = async () => {
    if (!campanha) return;
    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !campanha.ativo }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar campanha");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    const formData = new FormData();
    formData.append("arquivo", file);

    setUploading(true);
    try {
      const res = await fetch(`/api/campanhas/${id}/itens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar arquivo");
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletarItem = async (itemId) => {
    if (!confirm("Deseja remover este item da campanha?")) return;
    try {
      const res = await fetch(`/api/campanhas/${id}/itens/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao remover item");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReordenar = async (itens) => {
    const ordens = itens.map((item, idx) => ({ id: item.id, ordem: idx + 1 }));
    try {
      const res = await fetch(`/api/campanhas/${id}/itens/reordenar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ordens }),
      });
      if (!res.ok) throw new Error("Erro ao reordenar itens");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const moverItem = (index, direcao) => {
    if (!campanha) return;
    const itens = [...campanha.itens];
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= itens.length) return;
    [itens[index], itens[novoIndex]] = [itens[novoIndex], itens[index]];
    handleReordenar(itens);
  };

  const formatarDuracao = (segundos) => {
    if (!segundos) return "—";
    if (segundos < 60) return `${segundos}s`;
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto p-8 text-center text-slate-500 text-sm">
          Carregando dados da campanha...
        </div>
      </AdminLayout>
    );
  }

  if (!campanha) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto p-8 text-center text-red-700 text-sm font-semibold">
          Campanha não encontrada.
        </div>
      </AdminLayout>
    );
  }

  const itens = campanha.itens || [];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
          title={campanha.nome}
          subtitle={campanha.descricao || "Gerenciamento de mídias e ordenação da campanha"}
          backTo={`/admin/${empresaSlug}/campanhas`}
          backTitle="Voltar para Lista de Campanhas"
          actions={
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                👁️ {campanha.views ?? 0} visualizações
              </span>
              <button
                onClick={handleToggleAtivo}
                className="cursor-pointer"
                title="Clique para alternar status"
              >
                <StatusBadge variant={campanha.ativo ? "success" : "neutral"} dot>
                  {campanha.ativo ? "Ativo" : "Inativo"}
                </StatusBadge>
              </button>
            </div>
          }
        />

        {/* Upload Zone & Itens */}
        <Card>
          <CardHeader
            title={`Itens da Campanha (${itens.length})`}
            subtitle="Adicione imagens (JPG, PNG, WEBP até 10MB) ou vídeos (MP4, WEBM até 50MB)"
            actions={
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  className="hidden"
                  onChange={handleUpload}
                />
                <PrimaryButton
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  loading={uploading}
                  size="sm"
                >
                  {uploading ? "Enviando Mídia..." : "+ Adicionar Item"}
                </PrimaryButton>
              </div>
            }
          />
          <CardBody>
            {itens.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nenhum item adicionado ainda. Clique em "+ Adicionar Item" para carregar imagens ou vídeos.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {itens.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 border border-slate-200 rounded-[10px] overflow-hidden shadow-sm flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="w-full h-44 bg-slate-200 flex items-center justify-center overflow-hidden relative">
                      {item.tipo === "video" ? (
                        <video
                          src={item.arquivo_url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={item.arquivo_url}
                          alt={item.titulo || `Item ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                        {item.tipo}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-bold text-slate-700">Ordem #{index + 1}</span>
                          <span>{formatarDuracao(item.duracao_segundos)}</span>
                        </div>
                        {item.titulo && (
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.titulo}</p>
                        )}
                        {item.link_destino && (
                          <p className="text-xs text-[#2563eb] truncate">{item.link_destino}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200">
                        <SecondaryButton
                          size="sm"
                          variant="outline"
                          onClick={() => moverItem(index, -1)}
                          disabled={index === 0}
                          title="Mover para cima"
                        >
                          ↑
                        </SecondaryButton>
                        <SecondaryButton
                          size="sm"
                          variant="outline"
                          onClick={() => moverItem(index, 1)}
                          disabled={index === itens.length - 1}
                          title="Mover para baixo"
                        >
                          ↓
                        </SecondaryButton>
                        <div className="flex-1" />
                        <SecondaryButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeletarItem(item.id)}
                          title="Remover item"
                        >
                          Excluir
                        </SecondaryButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}
