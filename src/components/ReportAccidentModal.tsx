import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Camera,
  MapPin,
  Clock,
  Shield,
  Upload,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X,
  PhoneCall,
  Eye,
  Lock,
  Layers,
  ChevronRight,
  Flame,
  Ambulance,
  Building2,
  AlertOctagon,
} from "lucide-react";
import { api } from "../services/api";
import type { NearbyIncident, AIClassificationResult } from "../types";
import { useTranslation } from "../i18n";

interface ReportAccidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords?: { latitude: number; longitude: number; accuracy?: number | null } | null;
  onIncidentReported?: (incident: NearbyIncident) => void;
}

export const ReportAccidentModal: React.FC<ReportAccidentModalProps> = ({
  isOpen,
  onClose,
  userCoords,
  onIncidentReported,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [emergencyType, setEmergencyType] = useState<"ROAD_ACCIDENT" | "FIRE" | "MEDICAL" | "ROAD_BLOCK" | "OTHER">("ROAD_ACCIDENT");
  const [description, setDescription] = useState("");
  const [ambulanceNeeded, setAmbulanceNeeded] = useState(true);
  const [policeNeeded, setPoliceNeeded] = useState(true);
  const [fireBrigadeNeeded, setFireBrigadeNeeded] = useState(false);
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [evidenceCaption, setEvidenceCaption] = useState("");
  const [isPrivacyBlurred, setIsPrivacyBlurred] = useState(true);
  
  // GPS State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy?: number | null } | null>(
    userCoords || null
  );
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // AI Assistant State
  const [aiAnalysis, setAiAnalysis] = useState<AIClassificationResult | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    incident: NearbyIncident;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch current GPS when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitSuccess(null);
      setErrorMessage(null);
      if (!coords) {
        acquireLiveGps();
      }
    }
  }, [isOpen]);

  // Adjust defaults when type changes
  useEffect(() => {
    if (emergencyType === "FIRE") {
      setFireBrigadeNeeded(true);
      setAmbulanceNeeded(true);
      setPoliceNeeded(true);
    } else if (emergencyType === "MEDICAL") {
      setAmbulanceNeeded(true);
      setPoliceNeeded(false);
      setFireBrigadeNeeded(false);
    } else if (emergencyType === "ROAD_BLOCK") {
      setPoliceNeeded(true);
      setAmbulanceNeeded(false);
      setFireBrigadeNeeded(false);
    } else {
      setAmbulanceNeeded(true);
      setPoliceNeeded(true);
    }
  }, [emergencyType]);

  const acquireLiveGps = () => {
    setIsAcquiringGps(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setIsAcquiringGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsAcquiringGps(false);
      },
      (err) => {
        // Fallback default coordinates (e.g. Pune/Mumbai region)
        setCoords({
          latitude: 18.5204,
          longitude: 73.8567,
          accuracy: 15,
        });
        setGpsError("Could not retrieve precise location. Using approximate region coordinates.");
        setIsAcquiringGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const runAiClassification = async () => {
    if (!description && !emergencyType) return;
    setIsAnalyzingAi(true);
    try {
      const res = await api.classifyIncidentWithAI({
        description,
        reportedType: emergencyType,
      });
      if (res.success && res.data?.analysis) {
        setAiAnalysis(res.data.analysis);
        if (res.data.analysis.suggestedType) {
          setEmergencyType(res.data.analysis.suggestedType);
        }
        if (res.data.analysis.recommendedServices) {
          setAmbulanceNeeded(res.data.analysis.recommendedServices.includes("AMBULANCE"));
          setPoliceNeeded(res.data.analysis.recommendedServices.includes("POLICE"));
          setFireBrigadeNeeded(res.data.analysis.recommendedServices.includes("FIRE_BRIGADE"));
        }
      }
    } catch (e) {
      console.warn("AI Classification error:", e);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      setErrorMessage("GPS location coordinates are required to dispatch responders.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        type: emergencyType,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || null,
        description: description.trim(),
        helpRequired: {
          ambulance: ambulanceNeeded,
          police: policeNeeded,
          fireBrigade: fireBrigadeNeeded,
        },
        evidencePhotoBase64: evidencePhoto || null,
        evidenceCaption: evidenceCaption.trim() || null,
        isPrivacyBlurred,
        source: "USER_REPORT",
      };

      const res = await api.reportAccidentEmergency(payload);

      if (res.success && res.data?.incident) {
        setSubmitSuccess({
          incident: res.data.incident,
          message: res.message || "Emergency report broadcasted successfully.",
        });
        if (onIncidentReported) {
          onIncidentReported(res.data.incident);
        }
      } else {
        setErrorMessage(res.message || "Failed to submit emergency report. Please call 112 directly.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect to RakshAI emergency dispatch server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        id="report-accident-modal-card"
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-red-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {t("reportAccident.title", "🚨 Report Emergency / Accident")}
              </h2>
              <p className="text-xs text-red-100 font-medium">
                {t("reportAccident.subtitle", "One emergency. Multiple witnesses. One intelligent response.")}
              </p>
            </div>
          </div>
          <button
            id="close-report-accident-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {submitSuccess ? (
            /* Success Summary View */
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 bg-red-100 text-red-700 font-mono font-bold text-xs rounded-full uppercase tracking-wider mb-2">
                  Incident #{submitSuccess.incident.incidentCode || submitSuccess.incident.id.slice(0, 8)}
                </span>
                <h3 className="text-xl font-bold text-zinc-900">
                  {submitSuccess.incident.reportCount && submitSuccess.incident.reportCount > 1
                    ? `Grouped with Active Incident (${submitSuccess.incident.reportCount} Witness Reports)`
                    : "Emergency Incident Logged & Broadcasted"}
                </h3>
                <p className="text-sm text-zinc-600 mt-1 max-w-md mx-auto">
                  {submitSuccess.message}
                </p>
              </div>

              {/* Status Banner */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-left max-w-lg mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                  <span>DISPATCH STATUS</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold uppercase">
                    {submitSuccess.incident.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-800 font-medium">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    Lat: {submitSuccess.incident.latitude.toFixed(4)}, Lon: {submitSuccess.incident.longitude.toFixed(4)}
                  </span>
                </div>
                {submitSuccess.incident.photoCount ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Camera className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>{submitSuccess.incident.photoCount} evidence photo(s) securely attached with Privacy Shield</span>
                  </div>
                ) : null}
              </div>

              {/* Direct Helplines */}
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                <a
                  href="tel:112"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  DIAL 112 NATIONAL
                </a>
                <a
                  href="tel:102"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Ambulance className="w-3.5 h-3.5" />
                  CALL 102 AMBULANCE
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Return to Live Radar
                </button>
              </div>
            </div>
          ) : (
            /* Emergency Reporting Form */
            <form onSubmit={handleSubmitReport} className="space-y-5">
              {/* GPS Auto-Capture Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>Auto-Captured GPS Location</span>
                  </div>
                  <button
                    type="button"
                    onClick={acquireLiveGps}
                    disabled={isAcquiringGps}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAcquiringGps ? "animate-spin" : ""}`} />
                    {isAcquiringGps ? "Acquiring..." : "Refresh GPS"}
                  </button>
                </div>

                {coords ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-800 bg-white p-2.5 rounded-lg border border-zinc-200 font-mono">
                    <div>
                      <span className="font-semibold text-zinc-500">LAT:</span> {coords.latitude.toFixed(5)} &bull;{" "}
                      <span className="font-semibold text-zinc-500">LON:</span> {coords.longitude.toFixed(5)}
                    </div>
                    {coords.accuracy ? (
                      <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 font-medium">
                        ±{Math.round(coords.accuracy)}m accuracy
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    Acquiring satellite GPS fix...
                  </div>
                )}
                {gpsError && <p className="text-[11px] text-amber-600">{gpsError}</p>}
              </div>

              {/* 1. Emergency Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  1. {t("reportAccident.typePrompt", "What type of emergency?")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "ROAD_ACCIDENT", label: "ROAD ACCIDENT", icon: AlertTriangle, color: "border-red-500 bg-red-50 text-red-800" },
                    { id: "FIRE", label: "FIRE EMERGENCY", icon: Flame, color: "border-amber-500 bg-amber-50 text-amber-800" },
                    { id: "MEDICAL", label: "MEDICAL EMERGENCY", icon: Ambulance, color: "border-emerald-500 bg-emerald-50 text-emerald-800" },
                    { id: "ROAD_BLOCK", label: "ROAD BLOCK / HAZARD", icon: AlertOctagon, color: "border-orange-500 bg-orange-50 text-orange-800" },
                    { id: "OTHER", label: "OTHER INCIDENT", icon: Layers, color: "border-zinc-500 bg-zinc-50 text-zinc-800" },
                  ].map((item) => {
                    const isSelected = emergencyType === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEmergencyType(item.id as any)}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                          isSelected
                            ? `${item.color} ring-2 ring-red-500 shadow-sm font-bold`
                            : "border-zinc-200 hover:border-zinc-300 bg-white text-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-current" : "text-zinc-500"}`} />
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-current" />}
                        </div>
                        <span className="text-xs font-bold leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Help Required Checkboxes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  2. {t("reportAccident.helpPrompt", "What help is required?")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      ambulanceNeeded ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold" : "border-zinc-200 bg-white text-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ambulanceNeeded}
                      onChange={(e) => setAmbulanceNeeded(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold">Ambulance</div>
                      <div className="text-[10px] text-zinc-500">102 / 108 Dispatch</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      policeNeeded ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold" : "border-zinc-200 bg-white text-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={policeNeeded}
                      onChange={(e) => setPoliceNeeded(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold">Police</div>
                      <div className="text-[10px] text-zinc-500">100 / 112 Control</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      fireBrigadeNeeded ? "border-red-500 bg-red-50 text-red-900 font-semibold" : "border-zinc-200 bg-white text-zinc-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={fireBrigadeNeeded}
                      onChange={(e) => setFireBrigadeNeeded(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold">Fire Brigade</div>
                      <div className="text-[10px] text-zinc-500">101 Rescue Engine</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Description + AI Classifier */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    3. Incident Situation Details (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={runAiClassification}
                    disabled={isAnalyzingAi || !description}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded-lg border border-purple-200 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 ${isAnalyzingAi ? "animate-spin" : ""}`} />
                    {isAnalyzingAi ? "Analyzing..." : "AI Triage Assist"}
                  </button>
                </div>
                <textarea
                  id="incident-description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe vehicles involved, fire/smoke, trapped individuals, landmarks..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-zinc-900"
                />

                {/* AI Triage Banner */}
                {aiAnalysis && (
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-1.5 text-xs text-purple-950">
                    <div className="flex items-center justify-between font-bold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        AI Decision Engine: {aiAnalysis.suggestedTypeLabel}
                      </span>
                      <span className="px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded text-[10px]">
                        {aiAnalysis.confidence}% Confidence
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800">{aiAnalysis.triageSummary}</p>
                  </div>
                )}
              </div>

              {/* 4. Incident Evidence Hub (Photo Upload with Privacy Blur) */}
              <div className="space-y-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-zinc-700" />
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                      {t("reportAccident.photoEvidence", "Incident Evidence Hub")}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">Optional</span>
                </div>

                <p className="text-[11px] text-zinc-600">
                  {t("reportAccident.photoEvidenceDesc", "Upload scene photo. Privacy Shield automatically protects faces & vehicle registration plates.")}
                </p>

                {evidencePhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-300 bg-black/5 max-h-48 flex items-center justify-center group">
                    <img
                      src={evidencePhoto}
                      alt="Evidence preview"
                      className={`max-h-48 w-full object-contain ${isPrivacyBlurred ? "filter blur-[2px]" : ""}`}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsPrivacyBlurred(!isPrivacyBlurred)}
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow ${
                          isPrivacyBlurred ? "bg-emerald-600 text-white" : "bg-zinc-800 text-white"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {isPrivacyBlurred ? "Privacy Shield: ON" : "Shield: OFF"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvidencePhoto(null)}
                        className="p-1 rounded bg-red-600 text-white shadow hover:bg-red-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-zinc-300 hover:border-red-400 rounded-xl bg-white hover:bg-red-50/30 flex flex-col items-center justify-center gap-1.5 text-xs text-zinc-600 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-zinc-400" />
                      <span className="font-semibold text-zinc-800">Tap to Capture / Upload Scene Photo</span>
                      <span className="text-[10px] text-zinc-400">Supports JPEG, PNG • Automatic Privacy Blurring</span>
                    </button>
                  </div>
                )}

                {evidencePhoto && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={evidenceCaption}
                      onChange={(e) => setEvidenceCaption(e.target.value)}
                      placeholder="Add caption (e.g. 2 sedan collision near flyover)..."
                      className="w-full text-xs p-2 rounded-lg border border-zinc-200 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Multi-report Grouping Notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {t(
                    "reportAccident.groupingNotice",
                    "Multi-witness reports within 500m are automatically grouped into a single unified incident response to prevent duplicate dispatch."
                  )}
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-accident-report-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Broadcasting Incident...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      {t("reportAccident.submitBtn", "Broadcast Emergency Report")}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
