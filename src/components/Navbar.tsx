import React from "react";
import {
  Flame,
  Shield,
  Clock,
  UserCheck,
  Code2,
  LogOut,
  LogIn,
  Activity,
  PhoneCall,
  Settings as SettingsIcon,
  Radio,
  Route,
} from "lucide-react";
import { User } from "../types";
import { useTranslation } from "../i18n";
import { LanguageSelector } from "./LanguageSelector";

interface NavbarProps {
  user: User | null;
  activeTab: "emergency" | "live" | "corridor" | "history" | "contacts" | "api" | "settings";
  setActiveTab: (tab: "emergency" | "live" | "corridor" | "history" | "contacts" | "api" | "settings") => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  backendHealthy: boolean | null;
}


export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  backendHealthy,
}) => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E4E4E7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            id="brand-logo"
            onClick={() => setActiveTab("emergency")}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-[#EF4444] rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-red-600 transition-colors">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-[#18181B]">
                  {t("common.appName")}
                </span>
                <span className="text-[10px] font-semibold bg-[#F4F4F5] px-1.5 sm:px-2 py-0.5 rounded border border-[#E4E4E7] text-[#71717A] uppercase tracking-wider hidden xs:inline">
                  {t("common.prototypeNotice")}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden xl:block w-px h-6 bg-[#E4E4E7]" />

          {/* Status Indicators */}
          <div className="hidden lg:flex items-center gap-3">
            <div
              id="backend-status-pill"
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#52525B]"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  backendHealthy === true
                    ? "bg-green-500 animate-pulse"
                    : backendHealthy === false
                    ? "bg-red-500"
                    : "bg-amber-400"
                }`}
              />
              <span>
                {backendHealthy === true
                  ? t("nav.apiConnected")
                  : backendHealthy === false
                  ? t("nav.apiDisconnected")
                  : t("nav.connecting")}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#52525B]">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{t("nav.gpsActive")}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#F4F4F5] p-1 rounded-xl border border-[#E4E4E7] overflow-x-auto max-w-[calc(100vw-180px)] sm:max-w-none">
          <button
            id="nav-tab-emergency"
            onClick={() => setActiveTab("emergency")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "emergency"
                ? "bg-[#18181B] text-white shadow-sm"
                : "text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7]/60"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("nav.emergency", "SOS / Emergency")}</span>
            <span className="md:hidden">SOS</span>
          </button>

          <button
            id="nav-tab-live"
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "live"
                ? "bg-red-600 text-white shadow-sm"
                : "text-red-700 hover:text-red-800 hover:bg-red-50"
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden md:inline">{t("nav.liveIncidents", "Live Radar")}</span>
            <span className="md:hidden">Radar</span>
          </button>

          <button
            id="nav-tab-corridor"
            onClick={() => setActiveTab("corridor")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "corridor"
                ? "bg-[#18181B] text-white shadow-sm ring-1 ring-red-500"
                : "text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7]/60"
            }`}
          >
            <Route className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden md:inline">{t("nav.corridor", "🚨 Live Tracking")}</span>
            <span className="md:hidden">Tracking</span>
          </button>

          <button
            id="nav-tab-history"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "history"
                ? "bg-[#18181B] text-white shadow-sm"
                : "text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7]/60"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("nav.incidents", "Incidents")}</span>
            <span className="md:hidden">History</span>
          </button>


          <button
            id="nav-tab-contacts"
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "contacts"
                ? "bg-[#18181B] text-white shadow-sm"
                : "text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7]/60"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("nav.contacts")}</span>
            <span className="md:hidden">Contacts</span>
          </button>

          <button
            id="nav-tab-settings"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-[#18181B] text-white shadow-sm"
                : "text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7]/60"
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("nav.settings")}</span>
            <span className="md:hidden">Settings</span>
          </button>

          <button
            id="nav-tab-api"
            onClick={() => setActiveTab("api")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap hidden lg:flex ${
              activeTab === "api"
                ? "bg-[#18181B] text-white shadow-sm"
                : "text-[#71717A] hover:text-[#18181B] hover:bg-[#E4E4E7]/60"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{t("nav.apiDocs")}</span>
          </button>
        </nav>

        {/* Right side: Language Selector + User Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector variant="header" />

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold leading-none text-[#18181B] truncate max-w-[110px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-[#71717A] font-mono mt-0.5 truncate max-w-[110px]">
                  {user.email}
                </span>
              </div>
              <div
                id="user-badge"
                title={`${user.name} (${user.email})`}
                className="w-8 h-8 rounded-full bg-[#27272A] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                id="btn-logout"
                onClick={onLogout}
                title={t("nav.logout")}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-red-600 hover:bg-[#F4F4F5] border border-transparent hover:border-[#E4E4E7] transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-open"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181B] hover:bg-zinc-800 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t("nav.login")}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
