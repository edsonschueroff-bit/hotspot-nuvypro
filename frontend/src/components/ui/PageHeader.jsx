/**
 * Exemplo de uso:
 * 
 * import { PageHeader } from "@/components/ui/PageHeader";
 * // ou: import { PageHeader } from "@/components/ui";
 * 
 * <PageHeader
 *   icon={<Users className="w-6 h-6" />}
 *   title="Usuários RADIUS"
 *   subtitle="Gerencie credenciais e conexões ativas na rede"
 *   backTo={`/admin/${slug}`}
 *   backTitle="Voltar ao Dashboard"
 *   actions={
 *     <PrimaryButton onClick={() => setShowModal(true)}>
 *       + Novo Usuário
 *     </PrimaryButton>
 *   }
 * />
 */

import React from "react";
import { Link } from "react-router-dom";

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  backTo,
  backTitle = "Voltar",
  className = "",
  children,
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
      <div className="flex items-center gap-3.5 min-w-0">
        {backTo && (
          <Link
            to={backTo}
            title={backTitle}
            className="p-2 rounded-md bg-white border border-[#e2e8f0] text-slate-500 hover:text-slate-700 hover:bg-[#f8fafc] transition-colors flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        )}

        {icon && (
          <div className="w-10 h-10 rounded-md bg-[#eff6ff] text-[#2563eb] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-[22px] font-600 text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-slate-500 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
