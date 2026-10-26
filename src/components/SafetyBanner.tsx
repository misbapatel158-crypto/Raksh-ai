import React from "react";
import { ShieldAlert, Info } from "lucide-react";
import { useTranslation } from "../i18n";

export const SafetyBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      id="safety-disclaimer-banner"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-bold text-amber-800 uppercase tracking-wide text-[11px]">
          {t("safety.prototypeNotice")}
        </span>
        <span className="text-amber-900/90 text-xs">
          {t("safety.bannerText")}
        </span>
      </div>
      <div className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 shrink-0 uppercase tracking-wider">
        <Info className="w-3.5 h-3.5" />
        <span>{t("safety.demoNotice")}</span>
      </div>
    </div>
  );
};

