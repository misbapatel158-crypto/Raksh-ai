import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  MapPin,
  Clock,
  PhoneCall,
  Navigation,
  Share2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Hospital as HospitalIcon,
  Flame,
  Shield,
  Filter,
  ExternalLink,
  Info,
  Radio,
  ChevronRight,
  Sparkles,
  Camera,
  Layers,
  PlayCircle,
  PlusCircle,
  Ambulance,
  AlertOctagon,
} from "lucide-react";
import { api } from "../services/api";
import { NearbyIncident, User } from "../types";
import { useTranslation } from "../i18n";
import { ReportAccidentModal } from "./ReportAccidentModal";
import { IncidentDetailsModal } from "./IncidentDetailsModal";

interface LiveIncidentsViewProps {
  user: User | null;
  onOpenAuth?: () => void;
  onNavigateToCorridor?: () => void;
}

export const LiveIncidentsView: React.FC<LiveIncidentsViewProps> = ({
  user,
  onOpenAuth,
  onNavigateToCorridor,
}) => {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState<NearbyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [selectedIncident, setSelectedIncident] = useState<NearbyIncident | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  // User current location coordinates
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy?: number | null }>({
    latitude: 18.5204,
    longitude: 73.8567,
    accuracy: 12,
  });

  // Fetch user location
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {
          // Use default coordinates
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Fetch nearby incidents
  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getNearbyIncidents({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radiusKm,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });

      if (res.success && res.data) {
        setIncidents(res.data.incidents || []);
      } else {
        setError(res.message || "Failed loading nearby incidents.");
      }
    } catch (err: any) {
      setError(err.message || "Failed loading nearby emergency incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    // Auto-refresh every 25 seconds
    const interval = setInterval(fetchIncidents, 25000);
    return () => clearInterval(interval);
  }, [userLocation, radiusKm, typeFilter, statusFilter]);

  const handleSimulateDemo = async (scenario: "ACCIDENT" | "FIRE" | "MEDICAL" | "CROWD_REPORT") => {
    setIsSimulating(true);
    setSimulationToast(null);
    try {
      const res = await api.simulateEmergencyDemo({
        scenario,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
      if (res.success && res.data?.incident) {
        setSimulationToast(
          `Demo Simulation Broadcasted: #${res.data.incident.incidentCode || res.data.incident.id.slice(0, 8)} (${scenario})`
        );
        fetchIncidents();
        setTimeout(() => setSimulationToast(null), 5000);
      }
    } catch (err) {
      console.warn("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleShareIncident = (inc: NearbyIncident) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${inc.latitude},${inc.longitude}`;
    const text = `🚨 [RakshAI Live Incident Alert]\nType: ${inc.type}\nDistance: ${inc.approximateDistanceText}\nStatus: ${inc.status}\nLocation: ${mapsUrl}\nWarning: Possible emergency — community verification in progress.`;
    if (navigator.share) {
      navigator.share({ title: "RakshAI Live Incident", text, url: mapsUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("Incident link & summary copied to clipboard.");
    }
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case "ROAD_ACCIDENT":
      case "ACCIDENT":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "FIRE":
      case "FIRE_SERVICE":
        return <Flame className="w-5 h-5 text-orange-500" />;
      case "MEDICAL":
        return <HospitalIcon className="w-5 h-5 text-emerald-500" />;
      case "POLICE":
      case "SAFETY":
        return <Shield className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "POSSIBLE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            🟡 Possible Incident
          </span>
        );
      case "REPORTED":
      case "HELP_REQUESTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            🚨 Help Requested
          </span>
        );
      case "RESPONSE_INITIATED":
      case "RESPONSE_REPORTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            🔵 Responders En Route
          </span>
        );
      case "HELP_ARRIVING":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            🟣 Help Arriving
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-300">
            🟢 Resolved
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-300">
            ⚪ Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-800">
            {status}
          </span>
        );
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title Header */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#18181B]">
                  {t("liveIncidents.title", "🚨 LIVE INCIDENTS")}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 uppercase tracking-wider">
                  Live Radar
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#71717A]">
                {t(
                  "liveIncidents.subtitle",
                  "Real-time radar of possible road accidents & emergencies near your selected area."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Report Accident + Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-report-accident-main"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95"
          >
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>REPORT ACCIDENT</span>
          </button>

          <button
            id="btn-refresh-live-incidents"
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] font-semibold text-xs transition-colors border border-[#E4E4E7]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-red-500" : ""}`} />
            <span>{t("common.refresh", "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* Hackathon Demo / Simulation Bar */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase text-purple-200">
                Hackathon Demo / Simulation Mode
              </span>
              <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">
                SAFE DEMO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Instantly simulate real-time multi-witness grouping, timeline events, and AI triage.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleSimulateDemo("ACCIDENT")}
            disabled={isSimulating}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-[11px] rounded-lg border border-zinc-600 transition-colors flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            + Road Crash Demo
          </button>
          <button
            onClick={() => handleSimulateDemo("FIRE")}
            disabled={isSimulating}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-[11px] rounded-lg border border-zinc-600 transition-colors flex items-center gap-1"
          >
            <Flame className="w-3 h-3 text-amber-400" />
            + Fire Demo
          </button>
          <button
            onClick={() => handleSimulateDemo("CROWD_REPORT")}
            disabled={isSimulating}
            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-lg shadow transition-colors flex items-center gap-1"
          >
            <Layers className="w-3 h-3" />
            + Multi-Witness Cluster
          </button>
        </div>
      </div>

      {simulationToast && (
        <div className="p-3 bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>{simulationToast}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E4E4E7] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Radius Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#71717A] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Radius:
            </span>
            <div className="flex items-center bg-[#F4F4F5] p-0.5 rounded-lg border border-[#E4E4E7]">
              {[1, 2, 5, 10, 25].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    radiusKm === r
                      ? "bg-[#18181B] text-white shadow-sm"
                      : "text-[#71717A] hover:text-[#18181B]"
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Incident Type Filter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#71717A]">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg px-2.5 py-1 font-semibold text-[#18181B] focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">All Categories</option>
              <option value="ROAD_ACCIDENT">Possible Accidents</option>
              <option value="FIRE">Fire Emergencies</option>
              <option value="MEDICAL">Medical Emergencies</option>
              <option value="ROAD_BLOCK">Road Blocks / Hazards</option>
              <option value="POLICE">Police / Safety Alerts</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#71717A]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg px-2.5 py-1 font-semibold text-[#18181B] focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="POSSIBLE">Possible / Awaiting Verification</option>
              <option value="REPORTED">Help Requested</option>
              <option value="RESPONSE_INITIATED">Responders En Route</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        <div className="text-[#71717A] text-[11px] font-mono">
          Found {incidents.length} active incident{incidents.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Safety Notice & Privacy Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Community Verification &amp; Privacy Shield:</span>
          <p className="text-amber-800 text-[11px]">
            Sensor-detected and citizen reports are grouped by proximity (500m) to avoid duplicate dispatch. Reporter identities and precise personal details are protected by Privacy Shield.
          </p>
        </div>
      </div>

      {/* Incidents Grid / List */}
      {loading ? (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto" />
          <h3 className="font-bold text-base text-[#18181B]">Scanning nearby active radar...</h3>
          <p className="text-xs text-[#71717A]">Locating emergency incidents within {radiusKm} km.</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#18181B]">No Active Incidents Nearby</h3>
          <p className="text-xs text-[#71717A] max-w-md mx-auto">
            All clear within {radiusKm} km of your area. If you encounter or witness an accident, click <strong>REPORT ACCIDENT</strong> above to broadcast assistance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              id={`incident-card-${inc.id}`}
              onClick={() => setSelectedIncident(inc)}
              className="bg-white border border-[#E4E4E7] hover:border-red-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-red-50 transition-colors">
                      {getIncidentIcon(inc.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-[#18181B] group-hover:text-red-600 transition-colors">
                          {inc.type.replace(/_/g, " ")}
                        </h3>
                        {inc.isDemoIncident && (
                          <span className="text-[9px] bg-purple-100 text-purple-800 font-mono px-1 rounded font-bold">
                            DEMO
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(inc.detectedAt || inc.createdAt)}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(inc.status)}
                </div>

                {/* Multiple Witness Reports Grouping Badge */}
                {inc.reportCount && inc.reportCount > 1 ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-[11px] font-bold">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>{inc.reportCount} Citizen Reports Clustered</span>
                  </div>
                ) : null}

                {/* Distance & Description */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#18181B]">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>{inc.approximateDistanceText}</span>
                    <span className="text-[#A1A1AA] text-[10px] font-normal">
                      (±{inc.accuracy || 15}m accuracy)
                    </span>
                  </div>
                  <p className="text-[#71717A] text-[11px] line-clamp-2">
                    {inc.description || "Possible emergency reported via RakshAI dispatch network."}
                  </p>
                </div>
              </div>

              {/* Help Needed & Evidence Badges */}
              <div className="pt-2 border-t border-[#F4F4F5] space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex flex-wrap gap-1.5">
                    {inc.ambulanceNeeded && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold flex items-center gap-1">
                        🚑 Ambulance
                      </span>
                    )}
                    {inc.policeNeeded && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-semibold flex items-center gap-1">
                        👮 Police
                      </span>
                    )}
                    {inc.fireServiceNeeded && (
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-semibold flex items-center gap-1">
                        🚒 Fire
                      </span>
                    )}
                  </div>

                  {inc.photoCount && inc.photoCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px] font-semibold flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {inc.photoCount} Photo{inc.photoCount > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>

                {/* Verification Summary */}
                {inc.verificationStats && (
                  <div className="text-[11px] text-[#52525B] bg-[#F4F4F5] px-2.5 py-1 rounded-lg flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      {inc.verificationStats.summary}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA]" />
                  </div>
                )}

                {/* Responding Emergency Units Preview */}
                <div className="p-2 rounded-xl bg-red-50/60 border border-red-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-red-950">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                    <span>🚑 AMB-102 &amp; 👮 POL-021</span>
                  </div>
                  <span className="font-bold text-red-700 font-mono">ETA: ~4m</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {onNavigateToCorridor && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToCorridor();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Track Vehicle</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIncident(inc);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#18181B] hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1 transition-colors ml-auto"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Hub</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Accident Modal */}
      <ReportAccidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        userCoords={userLocation}
        onIncidentReported={(newInc) => {
          fetchIncidents();
        }}
      />

      {/* Incident Details & Timeline & Evidence Hub Modal */}
      <IncidentDetailsModal
        incident={selectedIncident}
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onNavigateToCorridor={onNavigateToCorridor}
        onStatusUpdated={(updated) => {
          setSelectedIncident(updated);
          fetchIncidents();
        }}
      />
    </div>
  );
};
