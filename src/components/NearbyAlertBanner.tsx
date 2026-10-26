import React, { useState, useEffect } from "react";
import { AlertTriangle, MapPin, X, ChevronRight, Radio } from "lucide-react";
import { NearbyIncident, AlertSettings } from "../types";
import { api } from "../services/api";

interface NearbyAlertBannerProps {
  settings: AlertSettings;
  onViewIncident: (incident: NearbyIncident) => void;
  userCoords?: { latitude: number; longitude: number };
}

export const NearbyAlertBanner: React.FC<NearbyAlertBannerProps> = ({
  settings,
  onViewIncident,
  userCoords,
}) => {
  const [activeAlert, setActiveAlert] = useState<NearbyIncident | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("resqai_dismissed_alert_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const checkNearby = async () => {
    if (!settings.nearbyAlertsEnabled) {
      setActiveAlert(null);
      return;
    }

    const lat = userCoords?.latitude || 18.5204;
    const lon = userCoords?.longitude || 73.8567;

    try {
      const res = await api.getNearbyIncidents({
        latitude: lat,
        longitude: lon,
        radiusKm: settings.alertRadiusKm || 5,
        status: "REPORTED",
        limit: 5,
      });

      if (res.success && res.data?.incidents && res.data.incidents.length > 0) {
        // Find the closest non-dismissed incident
        const urgent = res.data.incidents.find(
          (inc) =>
            !dismissedIds.has(inc.id) &&
            ((inc.type === "ROAD_ACCIDENT" && settings.accidentAlerts) ||
              (inc.type === "FIRE" && settings.fireAlerts) ||
              (inc.type === "MEDICAL" && settings.medicalAlerts) ||
              (inc.type === "POLICE" && settings.policeAlerts))
        );

        if (urgent && (!activeAlert || activeAlert.id !== urgent.id)) {
          setActiveAlert(urgent);

          // Trigger Web Notification if granted
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("🚨 RakshAI: Possible Accident Nearby", {
                body: `${urgent.type === "ROAD_ACCIDENT" ? "Possible Road Accident" : urgent.type} reported ${urgent.approximateDistanceText}.`,
                icon: "/favicon.ico",
              });
            } catch {
              // Ignore notification errors
            }
          }
        }
      }
    } catch {
      // Background poll silently fails if offline
    }
  };

  useEffect(() => {
    checkNearby();
    const interval = setInterval(checkNearby, 25000);
    return () => clearInterval(interval);
  }, [settings, userCoords, dismissedIds]);

  const handleDismiss = () => {
    if (!activeAlert) return;
    const next = new Set(dismissedIds);
    next.add(activeAlert.id);
    setDismissedIds(next);
    try {
      localStorage.setItem("resqai_dismissed_alert_ids", JSON.stringify(Array.from(next)));
    } catch {
      // Ignore
    }
    setActiveAlert(null);
  };

  if (!activeAlert || !settings.nearbyAlertsEnabled) return null;

  return (
    <div
      id="nearby-emergency-alert-toast"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-xl animate-in slide-in-from-top-4 duration-300"
    >
      <div className="bg-[#18181B] text-white border-2 border-red-500 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0 animate-pulse">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs tracking-wider uppercase text-red-400">
                🚨 POSSIBLE ACCIDENT NEARBY
              </span>
              <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 text-[10px] font-mono">
                {activeAlert.approximateDistanceText}
              </span>
            </div>
            <p className="text-xs text-zinc-300 line-clamp-1">
              {activeAlert.description || "Possible severe vehicle impact detected near your radius."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onViewIncident(activeAlert);
              handleDismiss();
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow"
          >
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
