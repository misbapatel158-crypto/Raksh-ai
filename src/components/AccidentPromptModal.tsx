import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  MapPin,
  Clock,
  ShieldAlert,
  PhoneCall,
  Navigation,
  Share2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Hospital as HospitalIcon,
  Flame,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { api } from "../services/api";
import { offlineStorage } from "../services/offlineStorage";
import { NearbyIncident, Hospital, FireService, User } from "../types";
import { useTranslation } from "../i18n";

interface AccidentPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  impactDetails: {
    magnitude: number;
    timestamp: number;
    isSimulated?: boolean;
  } | null;
  user: User | null;
  onIncidentCreated?: (incident: NearbyIncident) => void;
}

export const AccidentPromptModal: React.FC<AccidentPromptModalProps> = ({
  isOpen,
  onClose,
  impactDetails,
  user,
  onIncidentCreated,
}) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(25);
  const [locationStatus, setLocationStatus] = useState<"ACQUIRING" | "READY" | "FALLBACK">("ACQUIRING");
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp: string;
    isFallback?: boolean;
  }>({
    latitude: 18.5204,
    longitude: 73.8567,
    accuracy: 15,
    timestamp: new Date().toLocaleTimeString(),
    isFallback: false,
  });

  const [state, setState] = useState<"PROMPT" | "CANCELLED" | "HELP_REQUESTED" | "CREATING">("PROMPT");
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [createdIncident, setCreatedIncident] = useState<NearbyIncident | null>(null);
  const [nearestHospital, setNearestHospital] = useState<Hospital | null>(null);
  const [nearestFireService, setNearestFireService] = useState<FireService | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<any>(null);

  // Monitor online/offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Play gentle attention pulsing beeps via Web Audio API (safe, self-contained)
  const playBeep = () => {
    if (isSoundMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // A5 tone
        gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.4);
      }
    } catch {
      // Audio autoplay policy catch
    }
  };

  // Reset and start countdown when modal opens
  useEffect(() => {
    if (!isOpen) {
      clearInterval(beepIntervalRef.current);
      return;
    }

    setState("PROMPT");
    setCountdown(25);
    setLocationStatus("ACQUIRING");

    // Acquire GPS Coordinates
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date().toLocaleTimeString(),
            isFallback: false,
          });
          setLocationStatus("READY");
        },
        () => {
          // GPS fallback: default or cached location
          const fallbackLat = 18.5204;
          const fallbackLon = 73.8567;
          setCoords({
            latitude: fallbackLat,
            longitude: fallbackLon,
            accuracy: 50,
            timestamp: new Date().toLocaleTimeString(),
            isFallback: true,
          });
          setLocationStatus("FALLBACK");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // Audio beeper interval (every 2.5s)
    playBeep();
    beepIntervalRef.current = setInterval(() => {
      playBeep();
    }, 2500);

    return () => {
      clearInterval(beepIntervalRef.current);
    };
  }, [isOpen]);

  // Countdown timer logic
  useEffect(() => {
    if (!isOpen || state !== "PROMPT") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // If countdown reaches 0 and user hasn't pressed OK, auto-trigger emergency help
          handleNeedHelp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, state, coords]);

  // Handle "I'M OK"
  const handleImOk = () => {
    clearInterval(beepIntervalRef.current);
    setState("CANCELLED");

    // Save minimal local debug event log
    try {
      const logs = JSON.parse(localStorage.getItem("resqai_debug_impact_logs") || "[]");
      logs.unshift({
        type: "IMPACT_CANCELLED_BY_USER",
        magnitude: impactDetails?.magnitude,
        time: new Date().toISOString(),
      });
      localStorage.setItem("resqai_debug_impact_logs", JSON.stringify(logs.slice(0, 20)));
    } catch {
      // Ignore
    }

    setTimeout(() => {
      onClose();
    }, 1800);
  };

  // Handle "I NEED HELP"
  const handleNeedHelp = async (isAutoUnconfirmed: boolean = false) => {
    clearInterval(beepIntervalRef.current);
    setState("CREATING");

    const payload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || null,
      description: isAutoUnconfirmed
        ? "Possible road accident detected via device sensors (User unresponsive, automated alert)"
        : "Possible road accident detected via device sensors (User confirmed help needed)",
      source: "SENSOR_POSSIBLE_CRASH",
      confidence: isAutoUnconfirmed ? "UNCONFIRMED" : "POSSIBLE",
      status: "REPORTED" as const,
      ambulanceNeeded: true,
      policeNeeded: true,
      fireServiceNeeded: false,
      type: "ROAD_ACCIDENT",
    };

    // If offline: save locally in offline queue
    if (!navigator.onLine) {
      const offlineId = `offline-acc-${Date.now()}`;
      const savedLocally = offlineStorage.saveOfflineIncident({
        type: "ROAD_ACCIDENT",
        notes: payload.description,
        latitude: payload.latitude,
        longitude: payload.longitude,
        actionPlan: ["1. Call 112 / 102 Ambulance", "2. Share Live Location", "3. Alert Nearby Responders"],
        isUnconfirmedCrash: isAutoUnconfirmed,
      });


      const fallbackIncident: NearbyIncident = {

        id: offlineId,
        type: "ROAD_ACCIDENT",
        distanceKm: 0,
        approximateDistanceText: "At your location",
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        detectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        description: payload.description,
        status: "REPORTED",
        ambulanceNeeded: true,
        policeNeeded: true,
        fireServiceNeeded: false,
        source: "SENSOR_POSSIBLE_CRASH",
        confidence: payload.confidence,
        warning: "Possible accident — verification may be required.",
      };

      setCreatedIncident(fallbackIncident);
      if (onIncidentCreated) onIncidentCreated(fallbackIncident);
      setState("HELP_REQUESTED");
      return;
    }

    try {
      const res = await api.createPossibleAccident(payload);
      if (res.success && res.data?.incident) {
        setCreatedIncident(res.data.incident);
        setNearestHospital(res.data.incident.nearestHospital || null);
        setNearestFireService(res.data.incident.nearestFireService || null);
        if (onIncidentCreated) {
          onIncidentCreated(res.data.incident);
        }
      }
    } catch (err) {
      console.warn("Failed creating online incident, queued offline:", err);
    } finally {
      setState("HELP_REQUESTED");
    }
  };

  const handleShareLocation = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
    const text = `🚨 [RakshAI Emergency Alert]\nPossible Road Accident Detected\nCoordinates: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}\nMap Location: ${mapsUrl}\nPlease send Ambulance & Police.`;
    if (navigator.share) {
      navigator.share({ title: "RakshAI Emergency Incident", text, url: mapsUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("Emergency incident details and coordinates copied to clipboard.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="accident-emergency-prompt-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-[#18181B] border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Top Emergency Header */}
        <div className="bg-red-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl tracking-tight uppercase">
                {t("accident.title", "🚨 POSSIBLE ACCIDENT DETECTED")}
              </h2>
              <p className="text-xs text-red-100 font-medium">
                {t("accident.subtitle", "We detected a possible severe impact.")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className="p-2 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
            title={isSoundMuted ? "Unmute alarm" : "Mute alarm"}
          >
            {isSoundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 animate-pulse" />}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {state === "PROMPT" && (
            <>
              {/* Impact Details & GPS coordinates box */}
              <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#3F3F46] pb-2 text-xs text-[#A1A1AA]">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Sensor Impact: {impactDetails?.magnitude || 28.4} m/s²{" "}
                    {impactDetails?.isSimulated && "(Simulated Test)"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {coords.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#71717A] block">Latitude:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {coords.latitude.toFixed(5)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block">Longitude:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {coords.longitude.toFixed(5)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block">Accuracy:</span>
                    <span className="font-mono text-zinc-300">
                      ±{coords.accuracy || 15} meters
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block">Location Status:</span>
                    <span
                      className={`font-semibold ${
                        locationStatus === "READY"
                          ? "text-green-400"
                          : locationStatus === "FALLBACK"
                          ? "text-amber-400"
                          : "text-blue-400 animate-pulse"
                      }`}
                    >
                      {locationStatus === "READY"
                        ? "GPS Live Locked"
                        : locationStatus === "FALLBACK"
                        ? "Last known location"
                        : "Acquiring GPS..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Countdown Alert Indicator */}
              <div className="text-center py-3 space-y-2">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-red-500 bg-red-500/10 text-red-400 font-extrabold text-3xl animate-pulse">
                  {countdown}
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {t("accident.areYouOk", "Are you okay?")}
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  {t(
                    "accident.promptNotice",
                    "If you do not respond, RakshAI will create an unconfirmed possible accident incident and notify nearby opted-in emergency responders."
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  id="btn-accident-im-ok"
                  onClick={handleImOk}
                  className="py-4 px-5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-[0.98] text-white font-bold text-base sm:text-lg transition-all shadow-md flex items-center justify-center gap-2 border border-zinc-500"
                >
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <span>{t("accident.imOk", "I'M OK")}</span>
                </button>

                <button
                  id="btn-accident-need-help"
                  onClick={() => handleNeedHelp(false)}
                  className="py-4 px-5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black text-base sm:text-lg transition-all shadow-xl shadow-red-900/40 flex items-center justify-center gap-2 border border-red-400 animate-pulse"
                >
                  <AlertTriangle className="w-6 h-6" />
                  <span>{t("accident.needHelp", "I NEED HELP")}</span>
                </button>
              </div>
            </>
          )}

          {state === "CANCELLED" && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 text-green-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {t("accident.alertCancelled", "Emergency alert cancelled.")}
              </h3>
              <p className="text-sm text-zinc-400">
                No active public incident was created. Stay safe!
              </p>
            </div>
          )}

          {state === "CREATING" && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto" />
              <h3 className="text-xl font-bold text-white">
                {t("accident.creatingIncident", "Creating Emergency Incident...")}
              </h3>
              <p className="text-xs text-zinc-400">
                Routing nearest ambulance, police, and notifying nearby opted-in RakshAI responders...
              </p>
            </div>
          )}

          {state === "HELP_REQUESTED" && (
            <div className="space-y-5">
              {/* Emergency Status Pill */}
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-center space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-600 text-[11px] font-extrabold uppercase tracking-widest text-white">
                  🚨 Incident Created • Status: REPORTED
                </span>
                <h3 className="text-lg font-bold text-white">
                  {t("accident.helpRequestedTitle", "Emergency Help Requested")}
                </h3>
                <p className="text-xs text-red-200">
                  {isOffline
                    ? "Offline — emergency report will sync when connectivity returns."
                    : "Incident logged. Nearby opted-in RakshAI users and responders have been alerted."}
                </p>
                <div className="text-[11px] text-amber-300 font-medium pt-1">
                  ⚠️ Note: Possible accident — verification may be required. Calls require explicit tap below.
                </div>
              </div>

              {/* Direct Emergency Call Shortcuts */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  🚨 Immediate Emergency Services Dial
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <a
                    id="btn-call-112"
                    href="tel:112"
                    className="p-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-center font-bold text-xs flex flex-col items-center justify-center gap-1 shadow transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>CALL 112</span>
                    <span className="text-[10px] font-normal opacity-90">National SOS</span>
                  </a>

                  <a
                    id="btn-call-ambulance"
                    href="tel:108"
                    className="p-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-center font-bold text-xs flex flex-col items-center justify-center gap-1 shadow transition-colors"
                  >
                    <HospitalIcon className="w-4 h-4" />
                    <span>AMBULANCE</span>
                    <span className="text-[10px] font-normal opacity-90">108 / 102</span>
                  </a>

                  <a
                    id="btn-call-police"
                    href="tel:100"
                    className="p-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-center font-bold text-xs flex flex-col items-center justify-center gap-1 shadow transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span>POLICE</span>
                    <span className="text-[10px] font-normal opacity-90">100</span>
                  </a>

                  <a
                    id="btn-call-fire"
                    href="tel:101"
                    className="p-3 rounded-xl bg-orange-700 hover:bg-orange-600 text-white text-center font-bold text-xs flex flex-col items-center justify-center gap-1 shadow transition-colors"
                  >
                    <Flame className="w-4 h-4" />
                    <span>FIRE</span>
                    <span className="text-[10px] font-normal opacity-90">101</span>
                  </a>
                </div>
              </div>

              {/* Nearest Medical & Fire Facilities */}
              {nearestHospital && (
                <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <HospitalIcon className="w-4 h-4 text-emerald-400" />
                      <span>{nearestHospital.name}</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] truncate max-w-xs">{nearestHospital.address}</p>
                    <span className="text-emerald-400 font-semibold text-[11px]">
                      ~{nearestHospital.distanceKm?.toFixed(1) || "1.2"} km away (Nearest Hospital)
                    </span>
                  </div>
                  {nearestHospital.ambulancePhone ? (
                    <a
                      href={`tel:${nearestHospital.ambulancePhone}`}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Hospital</span>
                    </a>
                  ) : (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${nearestHospital.latitude},${nearestHospital.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold shrink-0 flex items-center gap-1"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Navigate</span>
                    </a>
                  )}
                </div>
              )}

              {/* Location Sharing & Navigation Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  id="btn-navigate-incident"
                  href={`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-zinc-600 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>{t("accident.viewLocation", "VIEW LOCATION")}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>

                <button
                  id="btn-share-accident-location"
                  onClick={handleShareLocation}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-zinc-600 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span>{t("accident.shareLocation", "SHARE LOCATION")}</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={onClose}
                  className="text-xs text-zinc-400 hover:text-white underline"
                >
                  Dismiss &amp; Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
