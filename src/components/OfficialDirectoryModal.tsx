import React from "react";
import { Shield, Phone, ExternalLink, X, CheckCircle2, Building2 } from "lucide-react";
import { OFFICIAL_EMERGENCY_NUMBERS, OfficialEmergencyNumber } from "../services/offlineStorage";
import { useTranslation } from "../i18n";

interface OfficialDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialDirectoryModal: React.FC<OfficialDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        id="official-directory-modal"
        className="bg-white border border-[#E4E4E7] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18181B]">
                {t("directory.title")}
              </h3>
              <p className="text-xs text-[#71717A]">
                {t("directory.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#E4E4E7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              {t("directory.notice")}
            </span>
          </div>

          <div className="space-y-3">
            {OFFICIAL_EMERGENCY_NUMBERS.map((entry) => (
              <div
                key={entry.number}
                className="p-4 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-300 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-[#18181B] font-mono bg-white px-2 py-0.5 rounded border border-[#E4E4E7]">
                      {entry.number}
                    </span>
                    <span className="font-bold text-xs text-[#18181B]">
                      {entry.service}
                    </span>
                  </div>
                  <p className="text-xs text-[#71717A]">
                    {entry.description}
                  </p>
                  <div className="text-[10px] text-[#A1A1AA] flex flex-wrap items-center gap-2 pt-0.5 font-mono">
                    <span>🏛️ {t("common.source")}: {entry.authority}</span>
                    <span>•</span>
                    <span>{t("common.verified")}: {entry.lastVerified}</span>
                  </div>
                </div>

                <a
                  href={`tel:${entry.number}`}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{t("common.call")} {entry.number}</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-between">
          <span className="text-xs text-[#71717A]">
            {t("directory.tollFreeNotice")}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#18181B] hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {t("directory.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

