import React from "react";

const SIZES = {
  sm: "px-3 py-1.5 text-[12px] font-500 rounded-md gap-1.5",
  md: "px-4 py-2 text-[13px] font-600 rounded-md gap-2",
  lg: "px-5 py-2.5 text-[14px] font-600 rounded-md gap-2.5",
};

const VARIANTS = {
  primary: "bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
  secondary: "bg-white border border-[#e2e8f0] text-slate-700 hover:text-slate-900 hover:bg-[#f8fafc] hover:border-slate-300 active:bg-[#f1f5f9]",
  outline: "bg-white border border-[#e2e8f0] text-slate-700 hover:text-slate-900 hover:bg-[#f8fafc] hover:border-slate-300 active:bg-[#f1f5f9]",
  danger: "bg-[#fef2f2] hover:bg-[#fee2e2] text-red-700 border border-[#fecaca] active:bg-[#fecaca]",
  subtle: "bg-[#f8fafc] hover:bg-[#f1f5f9] text-slate-700 border border-[#e2e8f0]",
  ghost: "bg-transparent hover:bg-[#f8fafc] text-slate-600 hover:text-slate-900 border border-transparent",
};

export function Button({
  children,
  icon,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  fullWidth = false,
  className = "",
  style = {},
  ...props
}) {
  const sizeClasses = SIZES[size] || SIZES.md;
  const variantClasses = VARIANTS[variant] || VARIANTS.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ borderRadius: "6px", ...style }}
      className={`inline-flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${sizeClasses} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

export default Button;
