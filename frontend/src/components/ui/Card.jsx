/**
 * Exemplo de uso:
 * 
 * import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
 * // ou: import { Card, CardHeader, CardBody } from "@/components/ui";
 * 
 * <Card>
 *   <CardHeader
 *     title="Sessões Ativas"
 *     subtitle="6 usuários conectados em tempo real"
 *     actions={<PrimaryButton size="sm">Atualizar</PrimaryButton>}
 *   />
 *   <CardBody noPadding>
 *     <table className="w-full">...</table>
 *   </CardBody>
 *   <CardFooter>
 *     <p className="text-xs text-slate-500">Última atualização às 14:30</p>
 *   </CardFooter>
 * </Card>
 */

import React from "react";

export function Card({
  children,
  className = "",
  hover = false,
  ...props
}) {
  return (
    <div
      className={`bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-200 ${
        hover ? "hover:border-[#cbd5e1] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
  children,
  className = "",
}) {
  return (
    <div
      className={`px-5 py-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc] ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-md bg-[#eff6ff] text-[#2563eb] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="text-[14px] font-600 text-slate-900 tracking-tight truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function CardBody({
  children,
  noPadding = false,
  className = "",
  ...props
}) {
  return (
    <div className={`${noPadding ? "p-0" : "p-5 md:p-6"} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...props
}) {
  return (
    <div
      className={`px-5 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between gap-3 text-[12px] text-slate-500 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
