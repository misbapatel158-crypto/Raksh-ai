import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Flame,
  ShieldAlert,
  Truck,
  Navigation,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  Gauge,
  Send,
  Wifi,
  WifiOff,
  Route,
  Siren,
  PhoneCall,
  CheckCircle2,
  Crosshair,
  Building2,
  ZoomIn,
  ZoomOut,
  Radio,
  ArrowRight,
  UserCheck,
  Compass,
} from "lucide-react";
import {
  EmergencyVehicle,
  EmergencyCorridor,
  DispatchEvent,
  RouteRecommendation,
  EmergencyVehicleType,
  EmergencyVehicleStatus,
} from "../types";
import { api } from "../services/api";
import { useTranslation } from "../i18n";

const CACHE_KEY_VEHICLES = "rakshai_corridor_vehicles_cache";
const CACHE_KEY_CORRIDOR = "rakshai_corridor_data_cache";
const CACHE_KEY_INCIDENT = "rakshai_corridor_incident_cache";

import { User } from "../types";

interface EmergencyCorridorViewProps {
  initialVehicleId?: string | null;
  onNavigateToIncidents?: () => void;
  user?: User | null;
  onOpenAuth?: () => void;
  onNavigateToIncident?: (id: any) => void;
}

export const EmergencyCorridorView: React.FC<EmergencyCorridorViewProps> = ({
  initialVehicleId,
  onNavigateToIncidents,
  user: _user,
  onOpenAuth: _onOpenAuth,
  onNavigateToIncident,
}) => {
  const { t } = useTranslation();

  // Core Data State
  const [vehicles, setVehicles] = useState<EmergencyVehicle[]>([]);
  const [corridor, setCorridor] = useState<EmergencyCorridor | null>(null);
  const [dispatchEvents, setDispatchEvents] = useState<DispatchEvent[]>([]);
  const [routeRecommendation, setRouteRecommendation] = useState<RouteRecommendation | null>(null);
  const [incidentData, setIncidentData] = useState<any>(null);

  // User GPS coordinates (Pune demo center default or navigator.geolocation)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 18.5204,
    longitude: 73.8567,
  });

  // UI Selection & Filters
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("ALL");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(initialVehicleId || null);
  const [mapFocusTarget, setMapFocusTarget] = useState<"ACCIDENT" | "AMBULANCE" | "POLICE" | "FIRE" | "ALL">("ALL");
  const [mapZoom, setMapZoom] = useState<number>(1);

  // Network & Sync State
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveToast, setLiveToast] = useState<{ message: string; type: string } | null>(null);

  // Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState<boolean>(false);
  const [dispatchVehicleType, setDispatchVehicleType] = useState<EmergencyVehicleType>("AMBULANCE");
  const [dispatchDestName, setDispatchDestName] = useState<string>("Station Road Accident Scene");
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  // Simulation Drill State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentSimStep, setCurrentSimStep] = useState<number>(1);
  const [simSpeedMs] = useState<number>(3000);
  const [simVehicleId, setSimVehicleId] = useState<string | null>(null);
  const [simDestination] = useState<string>("Station Road Accident Scene");
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Acquire user GPS if permitted
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => console.log("Using default Pune region coordinates for user demo location", err),
        { timeout: 5000 }
      );
    }
  }, []);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData(false);
      setLiveToast({ message: "Network restored. Live GPS telemetry synced.", type: "success" });
    };
    const handleOffline = () => {
      setIsOffline(true);
      setLiveToast({ message: "Network disconnected. Displaying cached tracking telemetry.", type: "warning" });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch live response data
  const fetchData = useCallback(
    async (showLoadingSpinner = false) => {
      if (showLoadingSpinner) setLoading(true);
      else setRefreshing(true);
      setErrorMsg(null);

      try {
        // Fetch active vehicles & incident response data
        const [vehiclesRes, corridorsRes, incidentRes] = await Promise.allSettled([
          api.getActiveVehicles({ type: vehicleTypeFilter !== "ALL" ? vehicleTypeFilter : undefined }),
          api.getActiveCorridors(),
          api.getIncidentResponseData("demo-incident-pune-01", userLocation),
        ]);

        if (vehiclesRes.status === "fulfilled" && vehiclesRes.value.success && vehiclesRes.value.data) {
          const loadedVehicles = vehiclesRes.value.data.vehicles;
          setVehicles(loadedVehicles);
          localStorage.setItem(CACHE_KEY_VEHICLES, JSON.stringify(loadedVehicles));

          if (!selectedVehicleId && loadedVehicles.length > 0) {
            setSelectedVehicleId(loadedVehicles[0].id);
          }
          if (!simVehicleId && loadedVehicles.length > 0) {
            const amb = loadedVehicles.find((v) => v.vehicleType === "AMBULANCE");
            setSimVehicleId(amb ? amb.id : loadedVehicles[0].id);
          }
        }

        if (corridorsRes.status === "fulfilled" && corridorsRes.value.success && corridorsRes.value.data) {
          const activeCorridor = corridorsRes.value.data.corridors[0] || null;
          setCorridor(activeCorridor);
          if (activeCorridor?.routeRecommendation) {
            setRouteRecommendation(activeCorridor.routeRecommendation);
          }
          if (corridorsRes.value.data.recentDispatchEvents) {
            setDispatchEvents(corridorsRes.value.data.recentDispatchEvents);
          }
          localStorage.setItem(CACHE_KEY_CORRIDOR, JSON.stringify(activeCorridor));
        }

        if (incidentRes.status === "fulfilled" && incidentRes.value.success && incidentRes.value.data) {
          setIncidentData(incidentRes.value.data.incident);
          if (incidentRes.value.data.corridor && !corridor) {
            setCorridor(incidentRes.value.data.corridor);
          }
          localStorage.setItem(CACHE_KEY_INCIDENT, JSON.stringify(incidentRes.value.data.incident));
        }

        setLastSyncTime(new Date());
        setIsOffline(false);
      } catch (err: any) {
        console.warn("Could not fetch live corridor data, falling back to cache:", err);
        setIsOffline(true);
        try {
          const cachedV = localStorage.getItem(CACHE_KEY_VEHICLES);
          const cachedC = localStorage.getItem(CACHE_KEY_CORRIDOR);
          const cachedI = localStorage.getItem(CACHE_KEY_INCIDENT);
          if (cachedV) setVehicles(JSON.parse(cachedV));
          if (cachedC) {
            const parsedC = JSON.parse(cachedC);
            setCorridor(parsedC);
            if (parsedC?.routeRecommendation) setRouteRecommendation(parsedC.routeRecommendation);
          }
          if (cachedI) setIncidentData(JSON.parse(cachedI));
        } catch {}
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vehicleTypeFilter, selectedVehicleId, simVehicleId, userLocation, corridor]
  );

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Polling every 3.5s for real-time tracking
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Toast auto-clear
  useEffect(() => {
    if (liveToast) {
      const t = setTimeout(() => setLiveToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [liveToast]);

  // Simulation step execution
  const executeSimulationStep = useCallback(
    async (stepIndex: number, actionType: "STEP" | "RESET" = "STEP") => {
      try {
        const res = await api.simulateCorridorStep({
          vehicleId: simVehicleId || undefined,
          step: stepIndex,
          action: actionType,
          destinationName: simDestination,
        });

        if (res.success && res.data) {
          setCurrentSimStep(res.data.currentStage);
          if (res.data.isCompleted) {
            setIsSimulating(false);
            setLiveToast({
              message: `✅ Mission Completed: Vehicle arrived at emergency scene (${simDestination}).`,
              type: "success",
            });
          }
          fetchData(false);
        }
      } catch (err: any) {
        console.error("Simulation step error:", err);
      }
    },
    [simVehicleId, simDestination, fetchData]
  );

  // Auto-play simulation loop
  useEffect(() => {
    if (!isSimulating) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      return;
    }

    simTimerRef.current = setInterval(() => {
      setCurrentSimStep((prev) => {
        const next = prev < 5 ? prev + 1 : 0;
        executeSimulationStep(next, "STEP");
        return next;
      });
    }, simSpeedMs);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating, simSpeedMs, executeSimulationStep]);

  // Re-optimize route
  const handleReoptimizeRoute = async () => {
    try {
      setRefreshing(true);
      const res = await api.getAiRouteRecommendation({
        corridorId: corridor?.id,
        vehicleId: selectedVehicleId || undefined,
        trafficCondition: corridor?.trafficCondition || "MODERATE",
      });
      if (res.success && res.data?.recommendation) {
        setRouteRecommendation(res.data.recommendation);
        setLiveToast({ message: "✨ AI Route Optimization Updated with Green Wave clearance.", type: "success" });
      }
    } catch (e) {
      console.error("Route recommendation error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Dispatch vehicle handler
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    try {
      const res = await api.dispatchVehicle({
        vehicleType: dispatchVehicleType,
        destinationName: dispatchDestName,
      });
      if (res.success) {
        setDispatchModalOpen(false);
        setLiveToast({
          message: `🚨 ${dispatchVehicleType} Dispatched to ${dispatchDestName}. ETA ~${res.data?.etaMinutes || 5} min.`,
          type: "success",
        });
        fetchData(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch vehicle.");
    } finally {
      setIsDispatching(false);
    }
  };

  // Helper functions
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;

  const ambulanceUnit = vehicles.find((v) => v.vehicleType === "AMBULANCE") || null;
  const policeUnit = vehicles.find((v) => v.vehicleType === "POLICE") || null;
  const fireUnit = vehicles.find((v) => v.vehicleType === "FIRE_BRIGADE") || null;

  const displayedVehicles = vehicles.filter((v) => {
    if (vehicleTypeFilter === "ALL") return true;
    return v.vehicleType === vehicleTypeFilter;
  });

  const getVehicleIcon = (type: EmergencyVehicleType, className = "w-4 h-4") => {
    switch (type) {
      case "AMBULANCE":
        return <Activity className={`${className} text-red-600`} />;
      case "FIRE_BRIGADE":
        return <Flame className={`${className} text-orange-500`} />;
      case "POLICE":
        return <ShieldAlert className={`${className} text-blue-600`} />;
      default:
        return <Truck className={className} />;
    }
  };

  const getVehicleHelpline = (type: EmergencyVehicleType) => {
    switch (type) {
      case "AMBULANCE":
        return { number: "108", label: "Call 108 Ambulance", tel: "tel:108" };
      case "FIRE_BRIGADE":
        return { number: "101", label: "Call 101 Fire", tel: "tel:101" };
      case "POLICE":
        return { number: "100", label: "Call 100 Police", tel: "tel:100" };
      default:
        return { number: "112", label: "Call 112 National Emergency", tel: "tel:112" };
    }
  };

  const getStatusBadgeColor = (status: EmergencyVehicleStatus) => {
    switch (status) {
      case "EN_ROUTE":
        return "bg-amber-500/10 text-amber-700 border-amber-300 animate-pulse font-bold";
      case "DISPATCHED":
        return "bg-blue-500/10 text-blue-700 border-blue-300 font-bold";
      case "ARRIVED":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold";
      case "COMPLETED":
        return "bg-zinc-100 text-zinc-700 border-zinc-300";
      case "AVAILABLE":
        return "bg-green-500/10 text-green-700 border-green-300 font-bold";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Alert */}
      {liveToast && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold shadow-md transition-all ${
            liveToast.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : "bg-amber-50 text-amber-900 border-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse shrink-0" />
            <span>{liveToast.message}</span>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="text-zinc-500 hover:text-zinc-800 text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Live Vehicle Tracking Telemetry Ribbon */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                {t("corridor.title", "🚨 LIVE EMERGENCY VEHICLE TRACKING")}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                LIVE GPS TRACKING
              </span>
              {isOffline ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  {t("common.offlineMode", "Offline Mode")}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  {t("corridor.dataFreshnessLive", "SYNCED")}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#18181B]">
              {t("corridor.subtitle", "Emergency Response Live Map & Multi-Vehicle Radar")}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#71717A]">
              {t("corridor.tagline", "Know Where Help Is. Know When It Will Arrive.")}
            </p>
          </div>

          {/* Quick Actions & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              id="btn-dispatch-responder"
              onClick={() => setDispatchModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Unit</span>
            </button>

            <button
              id="btn-toggle-autorefresh"
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? "Auto-refresh is ON (3.5s)" : "Auto-refresh is PAUSED"}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                autoRefresh
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{autoRefresh ? "Live Sync (3.5s)" : "Manual Sync"}</span>
            </button>

            <button
              id="btn-manual-refresh"
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-[#E4E4E7] bg-white hover:bg-zinc-50 text-zinc-700 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-red-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Offline Banner */}
        {isOffline && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 font-medium">
              {t("corridor.offlineNotice", "Offline Mode — Displaying cached vehicle telemetry & positions.")}
            </div>
            <span className="text-[11px] text-amber-700 font-mono">
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* 🚨 EXACT INCIDENT SUMMARY BANNER */}
      <div className="bg-red-500/10 border-2 border-red-400/40 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-red-950 uppercase tracking-wide">
                  {incidentData?.incidentCode || "RK-1024"}: ROAD ACCIDENT &amp; TRAUMA SCENE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-red-900/90 font-medium mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-700 shrink-0" />
                <span>{incidentData?.address || "Station Road, Near Pune Junction / Sassoon General Hospital, Pune"}</span>
              </p>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-red-800 font-medium flex-wrap">
                <span>📍 <strong>GPS:</strong> 18.5284° N, 73.8742° E</span>
                <span>⏱️ <strong>Reported:</strong> 10:25 AM</span>
                <span>👥 <strong>Your Distance:</strong> ~1.2 km away</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="tel:112"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call 112</span>
            </a>
            <button
              onClick={() => {
                if (onNavigateToIncident) onNavigateToIncident("demo-incident-pune-01");
                else if (onNavigateToIncidents) onNavigateToIncidents();
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-red-200 text-red-900 text-xs font-bold transition-all shadow-sm"
            >
              View Incident Details
            </button>
          </div>
        </div>
      </div>

      {/* 🚑 👮 🚒 3-COLUMN PRIMARY RESPONDER LIVE METRICS (Ambulance, Police, Fire) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. AMBULANCE CARD */}
        <div
          onClick={() => {
            if (ambulanceUnit) setSelectedVehicleId(ambulanceUnit.id);
            setMapFocusTarget("AMBULANCE");
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedVehicle?.vehicleType === "AMBULANCE"
              ? "bg-red-50/70 border-red-500 ring-2 ring-red-500 shadow-md"
              : "bg-white border-[#E4E4E7] hover:border-red-300"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-900">
                  {ambulanceUnit ? ambulanceUnit.unitCode : "AMB-102"} (Ambulance)
                </h4>
                <p className="text-[11px] text-zinc-500">
                  📍 {ambulanceUnit?.currentLocationName || "Shivaji Nagar"}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(
                ambulanceUnit?.status || "EN_ROUTE"
              )}`}
            >
              {ambulanceUnit?.status || "EN_ROUTE"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Distance from Incident</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {ambulanceUnit?.distanceRemaining !== null && ambulanceUnit?.distanceRemaining !== undefined
                  ? `${ambulanceUnit.distanceRemaining} km`
                  : "1.8 km"}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Distance Travelled</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {ambulanceUnit?.distanceTravelled !== null && ambulanceUnit?.distanceTravelled !== undefined
                  ? `${ambulanceUnit.distanceTravelled} km`
                  : "3.6 km"}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Estimated ETA</span>
              <span className="font-bold text-red-600 text-sm mt-0.5 block">
                ~{ambulanceUnit?.etaMinutes || 4} min
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Expected Arrival</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {ambulanceUnit?.expectedArrivalClockText || "10:34 AM"}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 font-mono">Speed: {ambulanceUnit?.speed || 42} km/h</span>
            <a
              href="tel:108"
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" /> Call 108
            </a>
          </div>
        </div>

        {/* 2. POLICE VEHICLE CARD */}
        <div
          onClick={() => {
            if (policeUnit) setSelectedVehicleId(policeUnit.id);
            setMapFocusTarget("POLICE");
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedVehicle?.vehicleType === "POLICE"
              ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500 shadow-md"
              : "bg-white border-[#E4E4E7] hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-900">
                  {policeUnit ? policeUnit.unitCode : "POL-021"} (Police Patrol)
                </h4>
                <p className="text-[11px] text-zinc-500">
                  📍 {policeUnit?.currentLocationName || "Deccan"}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(
                policeUnit?.status || "EN_ROUTE"
              )}`}
            >
              {policeUnit?.status || "EN_ROUTE"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Distance from Incident</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {policeUnit?.distanceRemaining !== null && policeUnit?.distanceRemaining !== undefined
                  ? `${policeUnit.distanceRemaining} km`
                  : "2.4 km"}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Distance Travelled</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {policeUnit?.distanceTravelled !== null && policeUnit?.distanceTravelled !== undefined
                  ? `${policeUnit.distanceTravelled} km`
                  : "2.1 km"}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Estimated ETA</span>
              <span className="font-bold text-blue-600 text-sm mt-0.5 block">
                ~{policeUnit?.etaMinutes || 6} min
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Expected Arrival</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {policeUnit?.expectedArrivalClockText || "10:36 AM"}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 font-mono">Speed: {policeUnit?.speed || 38} km/h</span>
            <a
              href="tel:100"
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" /> Call 100
            </a>
          </div>
        </div>

        {/* 3. FIRE BRIGADE CARD */}
        <div
          onClick={() => {
            if (fireUnit) setSelectedVehicleId(fireUnit.id);
            setMapFocusTarget("FIRE");
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedVehicle?.vehicleType === "FIRE_BRIGADE"
              ? "bg-orange-50/70 border-orange-500 ring-2 ring-orange-500 shadow-md"
              : "bg-white border-[#E4E4E7] hover:border-orange-300"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-900">
                  {fireUnit ? fireUnit.unitCode : "FIRE-014"} (Fire Engine)
                </h4>
                <p className="text-[11px] text-zinc-500">
                  📍 {fireUnit?.currentLocationName || "Camp"}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(
                fireUnit?.status || "EN_ROUTE"
              )}`}
            >
              {fireUnit?.status || "EN_ROUTE"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Distance from Incident</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {fireUnit?.distanceRemaining !== null && fireUnit?.distanceRemaining !== undefined
                  ? `${fireUnit.distanceRemaining} km`
                  : "3.7 km"}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Distance Travelled</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {fireUnit?.distanceTravelled !== null && fireUnit?.distanceTravelled !== undefined
                  ? `${fireUnit.distanceTravelled} km`
                  : "4.5 km"}
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Estimated ETA</span>
              <span className="font-bold text-orange-600 text-sm mt-0.5 block">
                ~{fireUnit?.etaMinutes || 9} min
              </span>
            </div>
            <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-semibold block">Expected Arrival</span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {fireUnit?.expectedArrivalClockText || "10:39 AM"}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 font-mono">Speed: {fireUnit?.speed || 35} km/h</span>
            <a
              href="tel:101"
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-orange-700 hover:text-orange-900 flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" /> Call 101
            </a>
          </div>
        </div>
      </div>

      {/* ARRIVED AT SCENE BANNER (IF ANY UNIT HAS ARRIVED) */}
      {selectedVehicle?.status === "ARRIVED" && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-lg flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-wide">
                ✅ {selectedVehicle.unitCode} HAS ARRIVED AT INCIDENT SCENE
              </h4>
              <p className="text-xs text-emerald-100 mt-0.5">
                {selectedVehicle.actualArrivalClockText || "Arrived at 10:33 AM"} • Responders on scene providing active medical triage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-white text-emerald-900 font-bold text-xs">
              STATUS: ON SCENE
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Live Interactive Map & Active Responders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map & Junction Radar (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Smart Interactive Map Component */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 sm:p-5 border-b border-[#E4E4E7] bg-zinc-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-red-600" />
                <span className="font-bold text-sm text-[#18181B]">
                  Live Emergency Response Map
                </span>
              </div>

              {/* Quick Focus Switchers */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setMapFocusTarget("ACCIDENT");
                    setLiveToast({ message: "📍 Map centered on Station Road Accident Scene.", type: "success" });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    mapFocusTarget === "ACCIDENT"
                      ? "bg-red-600 text-white"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  🚨 Accident
                </button>
                <button
                  onClick={() => {
                    setMapFocusTarget("AMBULANCE");
                    if (ambulanceUnit) setSelectedVehicleId(ambulanceUnit.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    mapFocusTarget === "AMBULANCE"
                      ? "bg-red-600 text-white"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  🚑 Ambulance
                </button>
                <button
                  onClick={() => {
                    setMapFocusTarget("POLICE");
                    if (policeUnit) setSelectedVehicleId(policeUnit.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    mapFocusTarget === "POLICE"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  👮 Police
                </button>
                <button
                  onClick={() => {
                    setMapFocusTarget("FIRE");
                    if (fireUnit) setSelectedVehicleId(fireUnit.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    mapFocusTarget === "FIRE"
                      ? "bg-orange-600 text-white"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  🚒 Fire
                </button>

                <div className="flex items-center border border-zinc-200 rounded-lg bg-white p-0.5 ml-1">
                  <button
                    onClick={() => setMapZoom((z) => Math.min(1.4, z + 0.1))}
                    title="Zoom in"
                    className="p-1 text-zinc-600 hover:text-zinc-900 rounded"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setMapZoom((z) => Math.max(0.8, z - 0.1))}
                    title="Zoom out"
                    className="p-1 text-zinc-600 hover:text-zinc-900 rounded"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setMapZoom(1);
                      setMapFocusTarget("ALL");
                    }}
                    title="Reset center"
                    className="p-1 text-zinc-600 hover:text-zinc-900 rounded"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Corridor Radar Map */}
            <div className="relative w-full h-84 sm:h-[440px] bg-[#18181B] flex items-center justify-center overflow-hidden">
              {/* Radar Grid Background */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  transform: `scale(${mapZoom})`,
                  transition: "transform 0.3s ease-out",
                  backgroundImage:
                    "radial-gradient(#EF4444 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                  backgroundPosition: "0 0, 16px 16px",
                }}
              />

              {/* Concentric Signal Rings */}
              <div className="absolute w-88 h-88 rounded-full border border-red-500/20 animate-ping opacity-30 pointer-events-none" />
              <div className="absolute w-60 h-60 rounded-full border border-red-500/30 pointer-events-none" />
              <div className="absolute w-[500px] h-[500px] rounded-full border border-zinc-800 pointer-events-none" />

              {/* Dynamic SVG Vehicle Route Paths to Accident Scene */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="ambRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#10B981" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="polRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="fireRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* 1. Ambulance Route Path: Shivaji Nagar Base -> Accident Scene */}
                <path
                  d="M 90 320 Q 210 240, 340 250 T 560 210"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeOpacity="0.3"
                />
                <path
                  d="M 90 320 Q 210 240, 340 250 T 560 210"
                  fill="none"
                  stroke="url(#ambRouteGrad)"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  className="animate-pulse"
                />

                {/* 2. Police Route Path: Deccan -> Accident Scene */}
                <path
                  d="M 320 380 Q 420 310, 560 210"
                  fill="none"
                  stroke="url(#polRouteGrad)"
                  strokeWidth="3"
                  strokeDasharray="4 4"
                  strokeOpacity="0.75"
                />

                {/* 3. Fire Brigade Route Path: Camp Base -> Accident Scene */}
                <path
                  d="M 210 120 Q 380 150, 560 210"
                  fill="none"
                  stroke="url(#fireRouteGrad)"
                  strokeWidth="3"
                  strokeDasharray="4 4"
                  strokeOpacity="0.75"
                />
              </svg>

              {/* 📍 YOU (User GPS Location Marker) */}
              <div className="absolute left-[16%] bottom-[15%] z-20 flex flex-col items-center group cursor-pointer">
                <div className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-100 text-[10px] font-bold border border-zinc-600 shadow-md mb-1">
                  📍 YOU (~1.2 km)
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-white flex items-center justify-center text-white text-xs shadow-lg">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 🚨 EXACT ACCIDENT LOCATION (Station Road / Sassoon Hospital) */}
              <div
                onClick={() => {
                  if (onNavigateToIncident) onNavigateToIncident("demo-incident-pune-01");
                  else if (onNavigateToIncidents) onNavigateToIncidents();
                }}
                className="absolute left-[56%] top-[42%] z-30 flex flex-col items-center group cursor-pointer"
              >
                <div className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-black border-2 border-white shadow-xl mb-1.5 animate-bounce">
                  🚨 ACCIDENT LOCATION (Station Rd)
                </div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-2xl ring-8 ring-red-500/40 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* 🚑 1. AMBULANCE MARKER (AMB-102) */}
              <div
                onClick={() => {
                  if (ambulanceUnit) setSelectedVehicleId(ambulanceUnit.id);
                }}
                className="absolute left-[34%] top-[50%] z-25 flex flex-col items-center cursor-pointer group transition-all duration-700"
              >
                <div className="px-2 py-0.5 rounded bg-red-950 text-white text-[10px] font-bold border border-red-500 shadow-md mb-1 animate-pulse">
                  🚑 AMB-102 • 42 km/h • ETA 4m
                </div>
                <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-red-500/50">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* 👮 2. POLICE VEHICLE MARKER (POL-021) */}
              <div
                onClick={() => {
                  if (policeUnit) setSelectedVehicleId(policeUnit.id);
                }}
                className="absolute left-[40%] bottom-[22%] z-25 flex flex-col items-center cursor-pointer group transition-all duration-700"
              >
                <div className="px-2 py-0.5 rounded bg-blue-950 text-blue-200 text-[10px] font-bold border border-blue-500 shadow-md mb-1">
                  👮 POL-021 • 38 km/h • ETA 6m
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-blue-500/50">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* 🚒 3. FIRE BRIGADE MARKER (FIRE-014) */}
              <div
                onClick={() => {
                  if (fireUnit) setSelectedVehicleId(fireUnit.id);
                }}
                className="absolute left-[24%] top-[24%] z-25 flex flex-col items-center cursor-pointer group transition-all duration-700"
              >
                <div className="px-2 py-0.5 rounded bg-orange-950 text-orange-200 text-[10px] font-bold border border-orange-500 shadow-md mb-1">
                  🚒 FIRE-014 • 35 km/h • ETA 9m
                </div>
                <div className="w-9 h-9 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-orange-500/50">
                  <Flame className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* 🏥 Destination Hospital (Ruby Hall / Sassoon General Hospital) */}
              <div className="absolute right-6 top-8 z-20 flex flex-col items-center group cursor-pointer">
                <div className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-200 text-[10px] font-mono border border-emerald-500 shadow-md mb-1">
                  🏥 Sassoon General Hospital
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 border-2 border-white flex items-center justify-center text-white text-xs shadow-lg">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>

              {/* Map Footer Telemetry Ribbon */}
              <div className="absolute bottom-3 left-3 right-3 z-20 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-zinc-300 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                    <span>Unit: {selectedVehicle?.unitCode || "AMB-102"} ({selectedVehicle?.speed || 42} km/h)</span>
                  </div>
                  <span className="text-zinc-600 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>ETA: ~{selectedVehicle?.etaMinutes || 4} min ({selectedVehicle?.expectedArrivalClockText || "10:34 AM"})</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-[11px] text-zinc-400">
                    Remaining: {selectedVehicle?.distanceRemaining || 1.8} km
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-emerald-400 border border-emerald-500/40">
                    🟢 LIVE TELEMETRY
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Corridor Junctions */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-[#18181B] flex items-center gap-2">
                  <Route className="w-4 h-4 text-red-600" />
                  <span>{t("corridor.junctions", "Smart Emergency Corridor Traffic Nodes")}</span>
                </h3>
                <span className="text-[11px] text-[#71717A] font-mono">
                  Automated Signal Preemption Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {corridor?.junctions && corridor.junctions.length > 0 ? (
                  corridor.junctions.map((junction, idx) => (
                    <div
                      key={junction.id}
                      className={`p-3 rounded-xl border transition-all ${
                        junction.trafficStatus === "HEAVY" || junction.corridorStatus === "REDIRECTED"
                          ? "bg-amber-50/70 border-amber-200"
                          : "bg-emerald-50/70 border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                          Node #{junction.sequence || idx + 1}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            junction.corridorStatus === "REDIRECTED"
                              ? "bg-amber-200 text-amber-900"
                              : "bg-emerald-200 text-emerald-900"
                          }`}
                        >
                          {junction.corridorStatus === "REDIRECTED" ? "REDIRECTED" : "GREEN WAVE"}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-zinc-900 truncate" title={junction.name}>
                        {junction.name}
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-1 flex items-center justify-between">
                        <span>Traffic: {junction.trafficStatus}</span>
                        <span className="font-mono text-zinc-500">
                          {junction.clearanceDistanceMeters}m clearance
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-xs text-zinc-500 text-center py-3 bg-zinc-50 rounded-xl">
                    Loading smart junction telemetry...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Vehicle In-Depth Telemetry Inspector Card */}
          {selectedVehicle && (
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
                    {getVehicleIcon(selectedVehicle.vehicleType, "w-6 h-6")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg text-zinc-900">{selectedVehicle.unitCode}</h3>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeColor(
                          selectedVehicle.status
                        )}`}
                      >
                        {selectedVehicle.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {selectedVehicle.vehicleType.replace("_", " ")} • Priority Emergency Responder
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getVehicleHelpline(selectedVehicle.vehicleType).tel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{getVehicleHelpline(selectedVehicle.vehicleType).label}</span>
                  </a>
                </div>
              </div>

              {/* Progress Bar: Start Base -> Current Location -> Incident Destination */}
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
                  <span>Start: {selectedVehicle.startLocationName || "Depot Base"}</span>
                  <span className="text-red-600 font-black">
                    Current: {selectedVehicle.currentLocationName || "En Route"}
                  </span>
                  <span>Scene: {selectedVehicle.destinationName || "Station Road"}</span>
                </div>
                <div className="relative w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          15,
                          ((selectedVehicle.distanceTravelled || 3.6) /
                            ((selectedVehicle.distanceTravelled || 3.6) + (selectedVehicle.distanceRemaining || 1.8))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Travelled: {selectedVehicle.distanceTravelled || 3.6} km</span>
                  <span>Remaining: {selectedVehicle.distanceRemaining || 1.8} km</span>
                </div>
              </div>

              {/* Timing Breakdown & Route Details */}
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-700">
                  <span className="font-semibold">Destination:</span>
                  <span className="font-bold text-zinc-900 truncate max-w-[240px]">
                    {selectedVehicle.destinationName || "Station Road Accident Scene"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-700">
                  <span className="font-semibold">Dispatched Time:</span>
                  <span className="font-mono text-zinc-600">10:26 AM</span>
                </div>
                <div className="flex items-center justify-between text-zinc-700">
                  <span className="font-semibold">Expected Arrival:</span>
                  <span className="font-mono text-red-600 font-bold">
                    {selectedVehicle.expectedArrivalClockText || "10:34 AM"} (~{selectedVehicle.etaMinutes || 4} min)
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-700">
                  <span className="font-semibold">Actual Arrival:</span>
                  <span className="font-mono text-zinc-600">
                    {selectedVehicle.status === "ARRIVED"
                      ? selectedVehicle.actualArrivalClockText || "10:33 AM (On Scene)"
                      : "En Route"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Smart Route Optimization Panel */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#18181B]">
                    {t("corridor.routeRecommendations", "AI Smart Route Optimization")}
                  </h3>
                  <p className="text-xs text-[#71717A]">
                    Automated traffic flow assessment and green corridor prioritization.
                  </p>
                </div>
              </div>

              <button
                id="btn-reoptimize-route"
                onClick={handleReoptimizeRoute}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span>Re-Optimize</span>
              </button>
            </div>

            {routeRecommendation ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Recommended Route A */}
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white tracking-wider uppercase">
                      ★ RECOMMENDED ROUTE
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      ETA: ~{routeRecommendation.recommendedEtaMinutes} min
                    </span>
                  </div>
                  <div className="font-bold text-sm text-emerald-950">
                    {routeRecommendation.recommendedRouteName}
                  </div>
                  <div className="text-xs text-emerald-800 leading-relaxed">
                    {routeRecommendation.reason}
                  </div>
                  <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900 font-mono">
                    <span>Distance: {routeRecommendation.recommendedDistanceKm} km</span>
                    <span className="font-bold text-emerald-700">94% Confidence</span>
                  </div>
                </div>

                {/* Alternative Route B */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 opacity-85">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-zinc-700 uppercase">
                      ALTERNATIVE ROUTE
                    </span>
                    <span className="text-xs font-bold text-zinc-700">
                      ETA: ~{routeRecommendation.alternativeEtaMinutes} min
                    </span>
                  </div>
                  <div className="font-bold text-sm text-zinc-900">
                    {routeRecommendation.alternativeRouteName}
                  </div>
                  <div className="text-xs text-zinc-600 leading-relaxed">
                    Standard arterial bypass with moderate signal latency.
                  </div>
                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-600 font-mono">
                    <span>Distance: {routeRecommendation.alternativeDistanceKm} km</span>
                    <span className="text-zinc-500">Backup Option</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-3 text-center bg-zinc-50 rounded-xl">
                Computing AI route recommendation...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Responders List & Live Response Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Responders List */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#18181B] flex items-center gap-2">
                <Siren className="w-4 h-4 text-red-600" />
                <span>{t("corridor.activeVehicles", "Active Responding Units")}</span>
              </h3>
              <span className="text-xs font-mono font-bold bg-zinc-100 px-2 py-0.5 rounded text-zinc-700">
                {displayedVehicles.length} Units
              </span>
            </div>

            {/* Vehicle Type Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              {[
                { key: "ALL", label: "ALL" },
                { key: "AMBULANCE", label: "🚑 Ambulance" },
                { key: "POLICE", label: "👮 Police" },
                { key: "FIRE_BRIGADE", label: "🚒 Fire" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setVehicleTypeFilter(filter.key)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all shrink-0 text-xs font-bold ${
                    vehicleTypeFilter === filter.key
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Vehicle Cards List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {displayedVehicles.length > 0 ? (
                displayedVehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicleId(v.id);
                      setSimVehicleId(v.id);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedVehicleId === v.id
                        ? "bg-red-50/50 border-red-500 ring-1 ring-red-500 shadow-sm"
                        : "bg-white border-[#E4E4E7] hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(v.vehicleType, "w-4 h-4")}
                        <span className="font-bold text-xs text-zinc-900">{v.unitCode}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(
                          v.status
                        )}`}
                      >
                        {v.status}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-600 flex items-center justify-between">
                      <span className="truncate max-w-[150px]">
                        📍 {v.currentLocationName || "En Route"}
                      </span>
                      {v.etaMinutes !== null && v.etaMinutes !== undefined && (
                        <span className="font-bold text-red-600 font-mono">
                          ~{v.etaMinutes}m ETA
                        </span>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                      <span>Speed: {v.speed || 0} km/h</span>
                      <span>{v.distanceRemaining ? `${v.distanceRemaining} km left` : "Available"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500 py-6 text-center bg-zinc-50 rounded-xl">
                  No emergency vehicles currently reporting telemetry for this filter.
                </div>
              )}
            </div>
          </div>

          {/* Live Response Timeline */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#18181B] flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-700" />
                <span>{t("corridor.timeline", "Live Response Timeline")}</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">Chronological</span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {dispatchEvents.length > 0 ? (
                dispatchEvents.map((evt) => (
                  <div key={evt.id} className="flex gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                    <div className="space-y-0.5 flex-1">
                      <div className="text-[11px] font-medium text-zinc-800 leading-snug">
                        {evt.description}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {new Date(evt.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500 py-4 text-center bg-zinc-50 rounded-xl">
                  No dispatch events logged yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Responder Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E4E4E7] space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <Siren className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-zinc-900">Dispatch Emergency Unit</h3>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Select Unit Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "AMBULANCE", label: "Ambulance", icon: Activity },
                    { type: "FIRE_BRIGADE", label: "Fire Service", icon: Flame },
                    { type: "POLICE", label: "Police", icon: ShieldAlert },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setDispatchVehicleType(item.type as EmergencyVehicleType)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                        dispatchVehicleType === item.type
                          ? "bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500"
                          : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      <item.icon className="w-4 h-4 mx-auto mb-1" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Target Destination / Scene
                </label>
                <input
                  type="text"
                  value={dispatchDestName}
                  onChange={(e) => setDispatchDestName(e.target.value)}
                  placeholder="e.g. Station Road Accident Scene"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
                >
                  {isDispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Confirm &amp; Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
