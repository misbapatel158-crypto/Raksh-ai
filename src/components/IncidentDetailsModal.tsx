import React, { useState, useRef } from "react";
import {
  AlertTriangle,
  MapPin,
  Clock,
  Shield,
  Layers,
  Camera,
  CheckCircle2,
  XCircle,
  Sparkles,
  PhoneCall,
  X,
  ExternalLink,
  ChevronRight,
  Upload,
  UserCheck,
  RefreshCw,
  Ambulance,
  Flame,
  Building2,
  Navigation,
  Route,
} from "lucide-react";
import type { NearbyIncident, IncidentEvidenceItem, IncidentTimelineEvent, EmergencyIncidentStatus } from "../types";
import { api } from "../services/api";
import { useTranslation } from "../i18n";

interface IncidentDetailsModalProps {
  incident: NearbyIncident | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: NearbyIncident) => void;
  onNavigateToCorridor?: () => void;
}

export const IncidentDetailsModal: React.FC<IncidentDetailsModalProps> = ({
  incident,
  isOpen,
  onClose,
  onStatusUpdated,
  onNavigateToCorridor,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeIncident, setActiveIncident] = useState<NearbyIncident | null>(incident);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [evidenceCaption, setEvidenceCaption] = useState("");
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync active incident
  React.useEffect(() => {
    setActiveIncident(incident);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAddingEvidence(false);
    setEvidencePhoto(null);
  }, [incident]);

  if (!isOpen || !activeIncident) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${activeIncident.latitude},${activeIncident.longitude}`;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setEvidencePhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadEvidence = async () => {
    if (!evidencePhoto) return;
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await api.addIncidentEvidence(activeIncident.id, {
        imageUrl: evidencePhoto,
        caption: evidenceCaption.trim() || undefined,
        isPrivacyBlurred,
      });
      if (res.success && res.data?.incident) {
        setActiveIncident(res.data.incident);
        if (onStatusUpdated) onStatusUpdated(res.data.incident);
        setSuccessMsg("Evidence photo uploaded and secured with Privacy Shield.");
        setIsAddingEvidence(false);
        setEvidencePhoto(null);
        setEvidenceCaption("");
      } else {
        setErrorMsg(res.message || "Failed to upload evidence.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error submitting evidence.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerify = async (type: "I_CAN_SEE_ACCIDENT" | "CANNOT_CONFIRM" | "APPEARS_RESOLVED") => {
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const res = await api.verifyIncident(activeIncident.id, {
        verificationType: type,
        notes: `Community verification via citizen portal`,
      });
      if (res.success) {
        setSuccessMsg("Verification recorded. Thank you for contributing to public safety.");
        // Refresh details
        const refreshed = await api.getEmergencyIncidentDetails(activeIncident.id);
        if (refreshed.success && refreshed.data?.incident) {
          setActiveIncident(refreshed.data.incident);
          if (onStatusUpdated) onStatusUpdated(refreshed.data.incident);
        }
      } else {
        setErrorMsg(res.message || "Failed to record verification.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Verification submission error.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateStatus = async (newStatus: EmergencyIncidentStatus) => {
    setIsUpdatingStatus(true);
    setErrorMsg(null);
    try {
      const res = await api.updateEmergencyIncidentStatus(activeIncident.id, newStatus);
      if (res.success && res.data?.incident) {
        setActiveIncident(res.data.incident);
        if (onStatusUpdated) onStatusUpdated(res.data.incident);
        setSuccessMsg(`Incident status transitioned to ${newStatus}.`);
      } else {
        setErrorMsg(res.message || "Failed to update incident status.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Status update error.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const timelineList: IncidentTimelineEvent[] = activeIncident.timeline || [
    {
      timestamp: activeIncident.createdAt,
      title: "Incident Reported",
      description: `Logged via RakshAI citizen dispatch system (${activeIncident.source}).`,
      actor: "Citizen Reporter",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        id="incident-details-modal-card"
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-[#18181B] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {activeIncident.type.replace(/_/g, " ")}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                  #{activeIncident.incidentCode || activeIncident.id.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {activeIncident.isDemoIncident ? "⚠️ DEMO / SIMULATION INCIDENT" : "Verified Emergency Incident Hub"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-zinc-800">
          {/* Status & Priority Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">CURRENT STATUS:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {activeIncident.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-500">SEVERITY:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  activeIncident.severity === "CRITICAL"
                    ? "bg-red-100 text-red-800"
                    : activeIncident.severity === "HIGH"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {activeIncident.severity || "MEDIUM"}
              </span>
            </div>
          </div>

          {/* Multiple Witness Reports Grouping Card */}
          {activeIncident.reportCount && activeIncident.reportCount > 1 ? (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {activeIncident.reportCount} Citizen Reports Grouped
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Clustered within 500m radius into this single live incident stream.
                  </div>
                </div>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 font-bold rounded text-[10px] uppercase">
                Consolidated
              </span>
            </div>
          ) : null}

          {/* AI Decision Engine Insights */}
          {activeIncident.aiSummary && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5 text-xs text-purple-950">
              <div className="flex items-center justify-between font-bold text-purple-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  AI Triage & Decision Engine
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-bold">
                  AI Analyzed
                </span>
              </div>
              <p className="text-[11px] text-purple-900">{activeIncident.aiSummary}</p>
            </div>
          )}

          {/* Location & Privacy Shield */}
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>Location Coordinates (Privacy Shield Protected)</span>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="text-xs font-mono text-zinc-700 bg-white p-2.5 rounded-lg border border-zinc-200 flex items-center justify-between">
              <span>
                {activeIncident.latitude.toFixed(4)}, {activeIncident.longitude.toFixed(4)}
              </span>
              {activeIncident.approximateDistanceText && (
                <span className="text-zinc-500 font-sans font-medium">
                  {activeIncident.approximateDistanceText}
                </span>
              )}
            </div>
          </div>

          {/* EMERGENCY RESPONSE PANEL */}
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <h4 className="text-xs font-bold text-red-950 uppercase tracking-wider">
                  Emergency Response Units
                </h4>
              </div>
              {onNavigateToCorridor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCorridor();
                  }}
                  className="text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1 underline"
                >
                  <span>[ VIEW ROUTE / TRACK LIVE ]</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-white border border-red-200 rounded-xl shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                    <Ambulance className="w-4 h-4 text-red-600" />
                    <span>🚑 AMB-102</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    🟢 EN ROUTE
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-600 pt-1">
                  <span>Dist: 2.4 km</span>
                  <span className="font-bold text-red-600 font-mono">ETA: ~4 min</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>👮 POL-021</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    🟢 EN ROUTE
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-600 pt-1">
                  <span>Dist: 1.2 km</span>
                  <span className="font-bold text-blue-600 font-mono">ETA: ~4 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Description */}
          {activeIncident.description && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Reported Situation
              </h4>
              <p className="text-xs text-zinc-800 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                {activeIncident.description}
              </p>
            </div>
          )}

          {/* Incident Response Timeline */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Incident Response Timeline</span>
            </h4>
            <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 space-y-3">
              {timelineList.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 relative">
                  {idx < timelineList.length - 1 && (
                    <div className="absolute left-2.5 top-5 bottom-0 w-0.5 bg-zinc-200 -z-0" />
                  )}
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 z-10">
                    {idx + 1}
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-zinc-900">
                      <span>{item.title}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-zinc-600 text-[11px] mt-0.5">{item.description}</p>
                    {item.actorBadge && (
                      <span className="text-[10px] text-zinc-400 font-medium">By: {item.actorBadge}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Incident Evidence Hub */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-zinc-500" />
                <span>Incident Evidence Hub ({activeIncident.evidenceList?.length || 0})</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingEvidence(!isAddingEvidence)}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                {isAddingEvidence ? "Cancel Evidence" : "+ Add Scene Photo"}
              </button>
            </div>

            {/* Evidence Upload Form */}
            {isAddingEvidence && (
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                <p className="text-[11px] text-zinc-600">
                  Upload additional scene photo to assist responder units. Faces and license plates are automatically blurred.
                </p>
                {evidencePhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-300 max-h-40 flex items-center justify-center bg-black/10">
                    <img
                      src={evidencePhoto}
                      alt="New evidence"
                      className={`max-h-40 w-full object-contain ${isPrivacyBlurred ? "filter blur-[2px]" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setEvidencePhoto(null)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl bg-white text-xs font-semibold text-zinc-600 hover:border-red-400 flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-zinc-400" />
                      Select Photo from Device
                    </button>
                  </div>
                )}

                {evidencePhoto && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={evidenceCaption}
                      onChange={(e) => setEvidenceCaption(e.target.value)}
                      placeholder="Add caption (e.g. front damage, fire engine en route)..."
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 bg-white"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsPrivacyBlurred(!isPrivacyBlurred)}
                        className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5"
                      >
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        {isPrivacyBlurred ? "Privacy Blur Active" : "Privacy Blur Off"}
                      </button>
                      <button
                        type="button"
                        onClick={handleUploadEvidence}
                        disabled={isUploading}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isUploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload Evidence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Gallery of Existing Evidence */}
            {activeIncident.evidenceList && activeIncident.evidenceList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeIncident.evidenceList.map((item, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 aspect-video flex items-center justify-center"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.caption || "Incident evidence"}
                      className={`w-full h-full object-cover ${item.isPrivacyBlurred ? "filter blur-[1px]" : ""}`}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-[10px]">
                      <p className="truncate font-medium">{item.caption || "Scene Photo"}</p>
                      <span className="text-[9px] text-zinc-300">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-center">
                No photo evidence attached yet.
              </p>
            )}
          </div>

          {/* Responder Status Workflow Controls */}
          <div className="space-y-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-zinc-500" />
              <span>Update Incident Response Status</span>
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { status: "RESPONSE_INITIATED" as const, label: "Response Initiated", color: "bg-blue-600 hover:bg-blue-700 text-white" },
                { status: "HELP_ARRIVING" as const, label: "Help Arriving", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
                { status: "RESOLVED" as const, label: "Mark Resolved", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
              ].map((btn) => (
                <button
                  key={btn.status}
                  type="button"
                  onClick={() => handleUpdateStatus(btn.status)}
                  disabled={isUpdatingStatus || activeIncident.status === btn.status}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Community Verification Actions */}
          <div className="space-y-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Citizen Verification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleVerify("I_CAN_SEE_ACCIDENT")}
                disabled={isVerifying}
                className="p-2.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-red-600" />
                I Can See Accident
              </button>
              <button
                type="button"
                onClick={() => handleVerify("CANNOT_CONFIRM")}
                disabled={isVerifying}
                className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4 text-zinc-500" />
                Cannot Confirm
              </button>
              <button
                type="button"
                onClick={() => handleVerify("APPEARS_RESOLVED")}
                disabled={isVerifying}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Appears Resolved
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl font-medium">
              {successMsg}
            </div>
          )}

          {/* Helplines bottom bar */}
          <div className="pt-2 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="tel:112"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Call 112
              </a>
              <a
                href="tel:102"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Ambulance className="w-3.5 h-3.5" />
                Call 102
              </a>
              {onNavigateToCorridor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCorridor();
                  }}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Route className="w-3.5 h-3.5 text-red-400" />
                  <span>Track in Emergency Corridor</span>
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold rounded-xl transition-colors"
            >
              Close Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
