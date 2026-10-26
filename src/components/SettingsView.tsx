import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Globe,
  Volume2,
  HardDrive,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Database,
  VolumeX,
  Radio,
  AlertTriangle,
  Bell,
  Activity,
  Zap,
  Shield,
  Hospital,
  Flame,
  Info,
} from "lucide-react";
import { useTranslation } from "../i18n";
import { LanguageSelector } from "./LanguageSelector";
import { offlineStorage } from "../services/offlineStorage";
import { accidentDetection } from "../services/accidentDetectionService";
import { api } from "../services/api";
import { AlertSettings, SensorSupportStatus } from "../types";

interface SettingsViewProps {
  onSimulateImpact?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSimulateImpact }) => {
  const { t, currentLanguageMeta, speak, stopVoice, isSpeaking } = useTranslation();
  const [clearedToast, setClearedToast] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Sensor state
  const [sensorStatus, setSensorStatus] = useState<SensorSupportStatus>(
    accidentDetection.getStatus()
  );

  // Alert Settings state
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    try {
      const stored = localStorage.getItem("resqai_user_alert_settings");
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore
    }
    return {
      accidentDetectionEnabled: true,
      nearbyAlertsEnabled: true,
      alertRadiusKm: 5,
      accidentAlerts: true,
      fireAlerts: true,
      medicalAlerts: true,
      policeAlerts: true,
      notificationPermission:
        typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    };
  });

  // Subscribe to sensor status updates
  useEffect(() => {
    const unsub = accidentDetection.onStatusChange((status) => {
      setSensorStatus(status);
    });
    return unsub;
  }, []);

  // Fetch persisted alert settings from backend
  useEffect(() => {
    api.getAlertSettings().then((res) => {
      if (res.success && res.data?.settings) {
        setAlertSettings((prev) => ({
          ...prev,
          ...res.data!.settings,
        }));
      }
    }).catch(() => {});
  }, []);

  const saveSettings = async (newSettings: AlertSettings) => {
    setAlertSettings(newSettings);
    try {
      localStorage.setItem("resqai_user_alert_settings", JSON.stringify(newSettings));
    } catch {
      // Ignore
    }

    // Sync with accident detection service
    accidentDetection.setEnabled(newSettings.accidentDetectionEnabled);

    try {
      await api.updateAlertSettings(newSettings);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch {
      // Saved locally
    }
  };

  const handleToggleAccidentDetection = async () => {
    const nextEnabled = !alertSettings.accidentDetectionEnabled;
    if (nextEnabled && sensorStatus.permission === "prompt") {
      await accidentDetection.requestSensorPermission();
    }
    saveSettings({
      ...alertSettings,
      accidentDetectionEnabled: nextEnabled,
    });
  };

  const handleRequestNotifications = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        saveSettings({
          ...alertSettings,
          notificationPermission: perm,
        });
      } catch {
        // Ignore
      }
    }
  };

  const handleTestVoice = () => {
    if (isSpeaking) {
      stopVoice();
      return;
    }
    const sampleText = `${t("emergency.call112Hero")}. ${t("aiAssistant.title")}`;
    speak(sampleText);
  };

  const handleClearCache = () => {
    offlineStorage.clearOfflineIncidents();
    setClearedToast(true);
    setTimeout(() => setClearedToast(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E4E7] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold shadow-xs">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
              {t("settings.title", "Settings & Preferences")}
            </h1>
            <p className="text-xs sm:text-sm text-[#71717A] mt-0.5">
              {t("settings.subtitle", "Customize accident detection, nearby emergency alerts, and regional language")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>{currentLanguageMeta.nativeName} ({currentLanguageMeta.name})</span>
          </span>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Alert &amp; detection preferences updated successfully.</span>
        </div>
      )}

      {/* 1. Smart Accident Detection Section */}
      <div id="settings-accident-detection-section" className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F4F5] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#18181B] flex items-center gap-2">
                <span>{t("accident.settingsTitle", "Smart Accident Detection")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-700">
                  Phone Sensors
                </span>
              </h2>
              <p className="text-xs text-[#71717A]">
                {t(
                  "accident.settingsDesc",
                  "Monitors supported device motion & accelerometer to detect possible road crashes and trigger emergency confirmation."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-toggle-accident-detection"
              onClick={handleToggleAccidentDetection}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
                alertSettings.accidentDetectionEnabled
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-[#F4F4F5] text-[#71717A] hover:bg-zinc-200 border border-[#E4E4E7]"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  alertSettings.accidentDetectionEnabled ? "bg-white animate-pulse" : "bg-zinc-400"
                }`}
              />
              <span>
                {alertSettings.accidentDetectionEnabled ? "ENABLED" : "DISABLED"}
              </span>
            </button>
          </div>
        </div>

        {/* Diagnostics & Test Simulation Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-3.5 space-y-1.5">
            <span className="font-bold text-[#18181B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sensor Diagnostic Status
            </span>
            <div className="space-y-1 text-[#52525B]">
              <div className="flex justify-between">
                <span>Hardware Motion Support:</span>
                <span className={sensorStatus.supported ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                  {sensorStatus.supported ? "Available (Ready)" : "Unsupported / Sim Mode"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Monitoring:</span>
                <span className={alertSettings.accidentDetectionEnabled ? "text-emerald-700 font-bold" : "text-zinc-500"}>
                  {alertSettings.accidentDetectionEnabled ? "Active & Monitoring" : "Paused"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Current G-Force:</span>
                <span className="font-mono font-bold text-[#18181B]">
                  {sensorStatus.lastMagnitude || 9.8} m/s²
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <span className="font-bold text-[#18181B] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                Test Impact Simulation
              </span>
              <p className="text-[11px] text-[#71717A]">
                Safely test the full-screen "Possible Accident Detected" countdown prompt without physical movement.
              </p>
            </div>

            <button
              id="btn-simulate-crash-test"
              onClick={() => {
                if (onSimulateImpact) {
                  onSimulateImpact();
                } else {
                  accidentDetection.simulateCrashImpact(32.4);
                }
              }}
              className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Crash Impact</span>
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-[11px]">
            <strong>Privacy &amp; Battery Guarantee:</strong> Accelerometer readings are processed strictly locally on device. No microphone, camera, or continuous background audio is ever recorded.
          </span>
        </div>
      </div>

      {/* 2. Nearby Emergency Alerts Section */}
      <div id="settings-nearby-alerts-section" className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F4F5] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#18181B] flex items-center gap-2">
                <span>{t("nearbyAlerts.settingsTitle", "Nearby Emergency Alerts")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700">
                  Radar Feed
                </span>
              </h2>
              <p className="text-xs text-[#71717A]">
                {t(
                  "nearbyAlerts.settingsDesc",
                  "Receive alerts about possible road accidents and emergencies within your selected proximity."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-toggle-nearby-alerts"
              onClick={() =>
                saveSettings({
                  ...alertSettings,
                  nearbyAlertsEnabled: !alertSettings.nearbyAlertsEnabled,
                })
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
                alertSettings.nearbyAlertsEnabled
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-[#F4F4F5] text-[#71717A] hover:bg-zinc-200 border border-[#E4E4E7]"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  alertSettings.nearbyAlertsEnabled ? "bg-white animate-pulse" : "bg-zinc-400"
                }`}
              />
              <span>{alertSettings.nearbyAlertsEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>

        {/* Alert Radius Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#18181B]">
            Alert Proximity Radius (Distance):
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 5, 10, 25].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => saveSettings({ ...alertSettings, alertRadiusKm: r })}
                className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all border ${
                  alertSettings.alertRadiusKm === r
                    ? "bg-[#18181B] text-white border-[#18181B] shadow-sm"
                    : "bg-[#FAFAFA] text-[#71717A] border-[#E4E4E7] hover:bg-zinc-100"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {/* Alert Categories Selection */}
        <div className="space-y-2 pt-2 border-t border-[#F4F4F5]">
          <span className="block text-xs font-bold text-[#18181B]">
            Subscribed Alert Categories:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] cursor-pointer hover:bg-zinc-100">
              <input
                type="checkbox"
                checked={alertSettings.accidentAlerts}
                onChange={(e) =>
                  saveSettings({ ...alertSettings, accidentAlerts: e.target.checked })
                }
                className="rounded text-red-600"
              />
              <span className="font-semibold text-[#18181B] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Accidents
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] cursor-pointer hover:bg-zinc-100">
              <input
                type="checkbox"
                checked={alertSettings.medicalAlerts}
                onChange={(e) =>
                  saveSettings({ ...alertSettings, medicalAlerts: e.target.checked })
                }
                className="rounded text-emerald-600"
              />
              <span className="font-semibold text-[#18181B] flex items-center gap-1">
                <Hospital className="w-3.5 h-3.5 text-emerald-500" />
                Medical
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] cursor-pointer hover:bg-zinc-100">
              <input
                type="checkbox"
                checked={alertSettings.fireAlerts}
                onChange={(e) =>
                  saveSettings({ ...alertSettings, fireAlerts: e.target.checked })
                }
                className="rounded text-orange-600"
              />
              <span className="font-semibold text-[#18181B] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Fire
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] cursor-pointer hover:bg-zinc-100">
              <input
                type="checkbox"
                checked={alertSettings.policeAlerts}
                onChange={(e) =>
                  saveSettings({ ...alertSettings, policeAlerts: e.target.checked })
                }
                className="rounded text-blue-600"
              />
              <span className="font-semibold text-[#18181B] flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                Police
              </span>
            </label>
          </div>
        </div>

        {/* Web Push Notification Permission Request */}
        <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-[#18181B] flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-blue-600" />
              Browser Push Notifications
            </span>
            <p className="text-[11px] text-[#71717A]">
              Permission Status:{" "}
              <strong className="text-[#18181B]">
                {typeof Notification !== "undefined" ? Notification.permission : "Unsupported"}
              </strong>
            </p>
          </div>

          <button
            onClick={handleRequestNotifications}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
          >
            Enable Notifications
          </button>
        </div>
      </div>

      {/* 3. Language & Localization Section */}
      <div id="settings-language-section" className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-[#F4F4F5] pb-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#18181B]">
              {t("settings.languageSection", "Regional Language & Multilingual System")}
            </h2>
            <p className="text-xs text-[#71717A]">
              {t("settings.languageDesc", "Select your preferred Indian language. Applies across all features and audio prompts.")}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <LanguageSelector variant="settings" />
        </div>
      </div>

      {/* 4. Voice Assistance Section */}
      <div id="settings-voice-section" className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#F4F4F5] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Volume2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#18181B]">
                {t("settings.voiceSection", "Voice Assistance & Synthesis")}
              </h2>
              <p className="text-xs text-[#71717A]">
                {t("settings.voiceDesc", "High-clarity local speech synthesis in your selected language.")}
              </p>
            </div>
          </div>

          <button
            id="btn-settings-test-voice"
            onClick={handleTestVoice}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              isSpeaking
                ? "bg-red-600 text-white animate-pulse"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>{t("aiAssistant.voiceStop", "Stop Voice")}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>{t("aiAssistant.voiceSpeak", "Test Voice")} ({currentLanguageMeta.code.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-[#52525B]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Voice synthesis configured for speech code:{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-[#E4E4E7] font-mono font-bold text-[#18181B]">
                {currentLanguageMeta.speechCode}
              </code>
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            Web Speech Active
          </span>
        </div>
      </div>

      {/* 5. Offline Data & Caching Section */}
      <div id="settings-storage-section" className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#F4F4F5] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <HardDrive className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#18181B]">
                {t("settings.offlineSection", "Offline Storage & Local Cache")}
              </h2>
              <p className="text-xs text-[#71717A]">
                {t("settings.offlineDesc", "Offline emergency directory and incident queue.")}
              </p>
            </div>
          </div>

          <button
            id="btn-settings-clear-cache"
            onClick={handleClearCache}
            className="px-3.5 py-1.5 bg-[#F4F4F5] hover:bg-zinc-200 text-[#18181B] border border-[#E4E4E7] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>{t("settings.clearCache", "Clear Cache")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#18181B] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Facility Directory Cache</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Persistent (Offline)
              </span>
            </div>
            <p className="text-xs text-[#71717A]">
              100+ Hospitals, Police &amp; Fire stations bundled locally for instant offline Haversine proximity calculations.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#18181B] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-red-600" />
                <span>Multilingual Locale Bundles</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                13 Indian Languages
              </span>
            </div>
            <p className="text-xs text-[#71717A]">
              Zero-latency static language bundles cached in memory and local storage.
            </p>
          </div>
        </div>

        {clearedToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Offline cache refreshed successfully.</span>
          </div>
        )}
      </div>
    </div>
  );
};
