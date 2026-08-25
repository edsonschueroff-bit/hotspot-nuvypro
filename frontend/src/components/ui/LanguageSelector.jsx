import React from "react";
import { translations, setPortalLanguage } from "../../utils/i18n";

export default function LanguageSelector({ currentLang, onLangChange }) {
  const languages = [
    { code: "pt", flag: "🇧🇷", label: "PT" },
    { code: "en", flag: "🇺🇸", label: "EN" },
    { code: "es", flag: "🇪🇸", label: "ES" }
  ];

  const handleSelect = (code) => {
    setPortalLanguage(code);
    if (onLangChange) onLangChange(code);
  };

  return (
    <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-100/90 backdrop-blur-xs rounded-xl border border-slate-200 w-fit mx-auto shadow-xs">
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => handleSelect(l.code)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentLang === l.code ? "bg-white text-[#2563eb] shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
        >
          <span>{l.flag}</span>
          <span className="text-[10px] uppercase font-mono">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
