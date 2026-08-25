/**
 * Exemplo de uso:
 * 
 * import { Modal } from "@/components/ui/Modal";
 * // ou: import { Modal } from "@/components/ui";
 * 
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Novo Administrador"
 *   description="Cadastre os dados de acesso do novo operador"
 *   maxWidth="md"
 *   footer={
 *     <div className="flex justify-end gap-2">
 *       <SecondaryButton onClick={() => setShowModal(false)}>Cancelar</SecondaryButton>
 *       <PrimaryButton onClick={handleSubmit} loading={salvando}>Salvar</PrimaryButton>
 *     </div>
 *   }
 * >
 *   <form className="space-y-4">
 *     ...
 *   </form>
 * </Modal>
 */

import React, { useEffect } from "react";

const MAX_WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  full: "max-w-5xl",
};

export function Modal({
  isOpen = true,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = "",
}) {
  useEffect(() => {
    if (isOpen === false) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (isOpen === false) return null;

  const widthClass = MAX_WIDTHS[maxWidth] || maxWidth;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`bg-white rounded-[14px] border border-[#e2e8f0] shadow-[0_10px_25px_rgba(0,0,0,0.10),0_4px_8px_rgba(0,0,0,0.06)] w-full ${widthClass} max-h-[90vh] flex flex-col overflow-hidden ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc] flex-shrink-0">
            <div className="min-w-0 pr-4">
              {title && (
                <h3 className="text-[15px] font-600 text-slate-900 tracking-tight truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {description}
                </p>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                title="Fechar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
