/**
 * Exemplo de uso:
 * 
 * import { StatusBadge } from "@/components/ui/StatusBadge";
 * // ou: import { StatusBadge } from "@/components/ui";
 * 
 * // Por variante explícita:
 * <StatusBadge variant="success" dot>Ativo</StatusBadge>
 * <StatusBadge variant="danger">Suspenso</StatusBadge>
 * <StatusBadge variant="trial" dot>7 dias restantes</StatusBadge>
 * 
 * // Por status automático (converte string em badge apropriado):
 * <StatusBadge status={empresa.status_financeiro} />
 * <StatusBadge status={pagamento.status} />
 */

import React from "react";

const VARIANTS = {
  success: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  danger: {
    badge: "bg-red-50 text-red-700 border-red-200/80",
    dot: "bg-red-500",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
  },
  info: {
    badge: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-500",
  },
  primary: {
    badge: "bg-blue-50 text-[#2563eb] border-blue-200/80",
    dot: "bg-[#2563eb]",
  },
  trial: {
    badge: "bg-orange-50 text-orange-700 border-orange-200/80",
    dot: "bg-orange-500",
  },
  neutral: {
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

const STATUS_MAP = {
  // Sucessos
  ativo: { variant: "success", label: "Ativo" },
  active: { variant: "success", label: "Ativo" },
  pago: { variant: "success", label: "Pago" },
  approved: { variant: "success", label: "Aprovado" },
  adimplente: { variant: "success", label: "Adimplente" },
  online: { variant: "success", label: "Online" },
  conectado: { variant: "success", label: "Conectado" },

  // Alertas / Pendências
  pendente: { variant: "warning", label: "Pendente" },
  pending: { variant: "warning", label: "Pendente" },
  aguardando: { variant: "warning", label: "Aguardando" },
  vencido: { variant: "warning", label: "Vencido" },
  inadimplente: { variant: "warning", label: "Inadimplente" },

  // Erros / Bloqueios
  inativo: { variant: "danger", label: "Inativo" },
  suspenso: { variant: "danger", label: "Suspenso" },
  bloqueado: { variant: "danger", label: "Bloqueado" },
  offline: { variant: "danger", label: "Offline" },
  cancelado: { variant: "danger", label: "Cancelado" },
  rejeitado: { variant: "danger", label: "Rejeitado" },
  failed: { variant: "danger", label: "Falhou" },
  expirado: { variant: "danger", label: "Expirado" },

  // Trial
  trial: { variant: "trial", label: "Trial" },
  degustacao: { variant: "trial", label: "Degustação" },
};

const SIZES = {
  sm: "px-2 py-0.5 text-[11px] gap-1.5",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export function StatusBadge({
  children,
  status,
  variant,
  dot = false,
  size = "md",
  className = "",
  ...props
}) {
  let finalVariant = variant;
  let label = children;

  if (status && !variant) {
    const key = String(status).toLowerCase().trim();
    const config = STATUS_MAP[key];
    if (config) {
      finalVariant = config.variant;
      if (!children) label = config.label;
    } else {
      finalVariant = "neutral";
      if (!children) label = status;
    }
  }

  if (!finalVariant) finalVariant = "neutral";

  const vConfig = VARIANTS[finalVariant] || VARIANTS.neutral;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border tracking-wide uppercase ${vConfig.badge} ${sizeClass} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vConfig.dot}`} />
      )}
      <span>{label}</span>
    </span>
  );
}

export default StatusBadge;
