import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "../i18n";
import { LanguageCode } from "../i18n/types";

interface LanguageSelectorProps {
  variant?: "header" | "emergency" | "settings" | "compact";
  className?: string;
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = "header",
  className = "",
  showLabel = true,
}) => {
  const { language, setLanguage, currentLanguageMeta, supportedLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const safeMeta = currentLanguageMeta || {
    code: "en" as LanguageCode,
    name: "English",
    nativeName: "English",
    region: "National",
    direction: "ltr" as const,
    speechCode: "en-IN",
  };
  const safeSupported = supportedLanguages || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  // 1. Settings Variant: Grid of language tiles
  if (variant === "settings") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {safeSupported.map((lang) => {
          const isSelected = lang.code === language;
          return (
            <button
              key={lang.code}
              id={`lang-opt-settings-${lang.code}`}
              onClick={() => handleSelectLanguage(lang.code)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? "bg-red-50 border-red-500 ring-2 ring-red-500/20 text-red-950 font-bold shadow-xs"
                  : "bg-white border-[#E4E4E7] hover:border-zinc-300 hover:bg-[#FAFAFA] text-[#18181B]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#F4F4F5] text-xs font-mono font-bold flex items-center justify-center text-[#52525B] uppercase shrink-0">
                  {lang.code}
                </span>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <span>{lang.nativeName}</span>
                    {lang.code === "hi" && (
                      <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                        National
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#71717A] mt-0.5">
                    {lang.name} • {lang.region}
                  </div>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Emergency Mode Variant: High-contrast, easily tappable bar
  if (variant === "emergency") {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          id="btn-emergency-language-selector"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-zinc-50 border-2 border-red-300 text-red-950 rounded-xl text-xs font-bold flex items-center justify-between sm:justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
          title="Change language / भाषा बदलें"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-extrabold text-sm">{safeMeta.nativeName}</span>
            <span className="text-zinc-500 font-normal">({safeMeta.name})</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div
            id="emergency-language-dropdown"
            className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-72 sm:w-80 max-h-80 bg-white border-2 border-red-500 rounded-2xl shadow-2xl overflow-y-auto z-50 p-2 space-y-1 animate-in fade-in zoom-in-95"
          >
            <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between text-xs font-bold text-zinc-700">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-red-600" />
                <span>Select Language / भाषा चुनें</span>
              </span>
              <span className="text-[10px] text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full font-mono">
                13 Languages
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1 pt-1">
              {safeSupported.map((lang) => {
                const isSelected = lang.code === language;
                return (
                  <button
                    key={lang.code}
                    id={`lang-opt-emg-${lang.code}`}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-red-600 text-white font-bold"
                        : "hover:bg-red-50 text-zinc-900 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-sm">{lang.nativeName}</span>
                      <span className={`text-[11px] ${isSelected ? "text-red-100" : "text-zinc-600"}`}>
                        {lang.name}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Header / Default Dropdown
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        id="btn-header-language-dropdown"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 sm:px-3 py-1.5 bg-white/90 hover:bg-zinc-100 text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
        title="Switch application language"
        aria-label="Language Selector"
      >
        <Globe className="w-3.5 h-3.5 text-red-600 shrink-0" />
        {showLabel && (
          <span className="font-semibold hidden xs:inline sm:inline text-xs">
            {safeMeta.nativeName}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-[#71717A] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          id="header-language-menu"
          className="absolute right-0 mt-2 w-64 max-h-80 bg-white border border-[#E4E4E7] rounded-2xl shadow-xl overflow-y-auto z-50 p-2 space-y-1 animate-in fade-in"
        >
          <div className="px-3 py-1.5 border-b border-[#F4F4F5] text-[11px] font-bold text-[#71717A] flex items-center justify-between">
            <span>🌐 Indian Languages (13)</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              Offline
            </span>
          </div>

          <div className="space-y-0.5 pt-1">
            {safeSupported.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  id={`lang-opt-hdr-${lang.code}`}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-red-600 text-white font-bold"
                      : "hover:bg-[#F4F4F5] text-[#18181B] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{lang.nativeName}</span>
                    <span className={`text-[11px] ${isSelected ? "text-red-100" : "text-[#71717A]"}`}>
                      ({lang.name})
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
