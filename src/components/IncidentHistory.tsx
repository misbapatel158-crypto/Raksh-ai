import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  AlertTriangle,
  Trash2,
  Share2,
  ExternalLink,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { api } from "../services/api";
import { Incident, IncidentStatus, IncidentPriority, User, ShareData } from "../types";
import { useTranslation } from "../i18n";

interface IncidentHistoryProps {
  user: User | null;
  onOpenAuth: () => void;
}

export const IncidentHistory: React.FC<IncidentHistoryProps> = ({
  user,
  onOpenAuth,
}) => {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const STATUS_OPTIONS: { value: IncidentStatus; label: string; color: string }[] = [
    { value: "REPORT_CREATED", label: t("history.statusCreated"), color: "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]" },
    { value: "HELP_IDENTIFIED", label: t("history.statusHelp"), color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "ACTION_TAKEN", label: t("history.statusAction"), color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "RESOLVED", label: t("history.statusResolved"), color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ];


  // Share modal state
  const [selectedShare, setSelectedShare] = useState<ShareData | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Status updating state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchIncidents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getIncidents({
        search: search.trim() || undefined,
        type: typeFilter,
        priority: priorityFilter,
        status: statusFilter,
      });

      if (res.success && res.data?.incidents) {
        setIncidents(res.data.incidents);
      }
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchIncidents();
    }
  }, [user, typeFilter, priorityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  const handleStatusChange = async (incidentId: string, newStatus: IncidentStatus) => {
    setUpdatingId(incidentId);
    try {
      const res = await api.updateIncidentStatus(incidentId, newStatus);
      if (res.success && res.data?.incident) {
        setIncidents((prev) =>
          prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc))
        );
      }
    } catch (err) {
      console.error("Failed to update incident status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (incidentId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this incident record?")) {
      return;
    }

    try {
      const res = await api.deleteIncident(incidentId);
      if (res.success) {
        setIncidents((prev) => prev.filter((inc) => inc.id !== incidentId));
      }
    } catch (err) {
      console.error("Failed to delete incident:", err);
    }
  };

  const handleOpenShare = async (incidentId: string) => {
    try {
      const res = await api.getIncidentShareData(incidentId);
      if (res.success && res.data?.shareData) {
        setSelectedShare(res.data.shareData);
      }
    } catch (err) {
      console.error("Failed to get share data:", err);
    }
  };

  const handleCopyShareText = async () => {
    if (!selectedShare) return;
    try {
      await navigator.clipboard.writeText(selectedShare.formattedShareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white border border-[#E4E4E7] rounded-2xl p-8 space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] text-[#71717A] flex items-center justify-center mx-auto border border-[#E4E4E7]">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#18181B]">{t("history.signInPrompt")}</h3>
        <p className="text-xs text-[#71717A] max-w-md mx-auto">
          {t("history.signInDesc")}
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 bg-[#18181B] hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
        >
          {t("auth.signIn")} / {t("auth.createAccount")}
        </button>
      </div>
    );
  }

  return (
    <div id="incident-history-container" className="max-w-5xl mx-auto space-y-6">
      {/* Filters & Search Header */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#18181B] tracking-tight">
              {t("history.title")}
            </h3>
            <p className="text-xs text-[#71717A]">
              {t("history.subtitle")}
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-[#F4F4F5] border border-[#E4E4E7] text-[#18181B] rounded-xl self-start sm:self-auto">
            {t("history.totalRecords")}: {incidents.length}
          </span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-incidents"
              type="text"
              placeholder={t("history.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#18181B] placeholder-[#A1A1AA] focus:bg-white focus:outline-none focus:border-[#18181B]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#18181B] hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            {t("history.search")}
          </button>
        </form>

        {/* Filter Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">{t("history.filterType")}</label>
            <select
              id="select-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg p-2 text-xs text-[#18181B] font-medium focus:outline-none focus:border-[#18181B]"
            >
              <option value="ALL">{t("history.allTypes")}</option>
              <option value="ROAD_ACCIDENT">{t("emergency.roadAccident")}</option>
              <option value="FIRE">{t("emergency.fireEmergency")}</option>
              <option value="MEDICAL">{t("emergency.medicalEmergency")}</option>
              <option value="POLICE">{t("emergency.policeSecurity")}</option>
              <option value="NATURAL_DISASTER">{t("emergency.naturalDisaster")}</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">{t("history.filterPriority")}</label>
            <select
              id="select-priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg p-2 text-xs text-[#18181B] font-medium focus:outline-none focus:border-[#18181B]"
            >
              <option value="ALL">{t("history.allPriorities")}</option>
              <option value="CRITICAL">{t("history.priorityCritical")}</option>
              <option value="HIGH">{t("history.priorityHigh")}</option>
              <option value="MEDIUM">{t("history.priorityMedium")}</option>
              <option value="LOW">{t("history.priorityLow")}</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">{t("history.filterStatus")}</label>
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg p-2 text-xs text-[#18181B] font-medium focus:outline-none focus:border-[#18181B]"
            >
              <option value="ALL">{t("history.allStatuses")}</option>
              <option value="REPORT_CREATED">{t("history.statusCreated")}</option>
              <option value="HELP_IDENTIFIED">{t("history.statusHelp")}</option>
              <option value="ACTION_TAKEN">{t("history.statusAction")}</option>
              <option value="RESOLVED">{t("history.statusResolved")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents List */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-[#E4E4E7] rounded-2xl shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-[#EF4444] mx-auto mb-2" />
          <p className="text-xs text-[#71717A] font-medium">{t("history.loading")}</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E4E4E7] rounded-2xl space-y-2 shadow-sm">
          <Clock className="w-8 h-8 text-[#A1A1AA] mx-auto" />
          <h4 className="text-sm font-bold text-[#18181B]">{t("history.noIncidents")}</h4>
          <p className="text-xs text-[#71717A] max-w-sm mx-auto">
            {search || typeFilter !== "ALL" || priorityFilter !== "ALL" || statusFilter !== "ALL"
              ? t("history.noIncidentsMatch")
              : t("history.noIncidentsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`;
            const dateStr = new Date(incident.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={incident.id}
                id={`incident-item-${incident.id}`}
                className="bg-white border border-[#E4E4E7] rounded-2xl p-5 hover:border-zinc-400 transition-all space-y-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E4E7] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#18181B] text-base">
                      {incident.incidentType.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-mono text-[#71717A]">
                      #{incident.id.slice(-6)}
                    </span>
                    {/* Priority Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        incident.aiPriority === "CRITICAL"
                          ? "bg-[#FEE2E2] text-[#EF4444]"
                          : incident.aiPriority === "HIGH"
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : incident.aiPriority === "MEDIUM"
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      }`}
                    >
                      {incident.aiPriority}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#71717A] flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#A1A1AA]" />
                      {dateStr}
                    </span>
                  </div>
                </div>

                {/* Content & AI Summary */}
                <div className="space-y-2">
                  <p className="text-xs text-[#18181B] leading-relaxed font-medium">
                    {incident.aiSummary || incident.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#71717A]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#EF4444]" />
                      {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                    </span>
                    <span>•</span>
                    <span>{t("history.peopleAffected")}: {incident.peopleAffected}</span>
                    {incident.vehiclesInvolved > 0 && (
                      <>
                        <span>•</span>
                        <span>{t("history.vehicles")}: {incident.vehiclesInvolved}</span>
                      </>
                    )}
                    {incident.anyoneTrapped && (
                      <>
                        <span>•</span>
                        <span className="text-[#EF4444] font-bold">{t("history.trapped")}: YES</span>
                      </>
                    )}
                    {incident.smokeOrFire && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 font-bold">{t("history.fireSmoke")}: YES</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Controls: Status Selector, Map Link, Share & Delete */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E4E4E7]">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#71717A]">{t("history.statusLabel")}:</span>
                    <select
                      id={`select-status-${incident.id}`}
                      value={incident.status}
                      disabled={updatingId === incident.id}
                      onChange={(e) =>
                        handleStatusChange(incident.id, e.target.value as IncidentStatus)
                      }
                      className="bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg px-2.5 py-1 text-xs font-bold text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {updatingId === incident.id && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#71717A]" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-[#18181B] px-3 py-1.5 rounded-lg bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t("common.map")}</span>
                    </a>

                    <button
                      id={`btn-share-${incident.id}`}
                      onClick={() => handleOpenShare(incident.id)}
                      className="flex items-center gap-1 text-xs font-bold text-[#18181B] px-3 py-1.5 rounded-lg bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{t("history.shareData")}</span>
                    </button>

                    <button
                      id={`btn-delete-${incident.id}`}
                      onClick={() => handleDelete(incident.id)}
                      className="p-1.5 text-[#71717A] hover:text-[#EF4444] rounded-lg hover:bg-[#F4F4F5] transition-colors"
                      title="Delete Incident Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal Dialog */}
      {selectedShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E4E7] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#EF4444]" />
                <h4 className="font-bold text-[#18181B] text-base">
                  {t("history.shareSummaryTitle")}
                </h4>
              </div>
              <button
                onClick={() => setSelectedShare(null)}
                className="text-xs font-bold text-[#71717A] hover:text-[#18181B] px-2 py-1 rounded hover:bg-[#F4F4F5]"
              >
                {t("common.close")}
              </button>
            </div>

            <div className="p-3.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl font-mono text-xs text-[#18181B] whitespace-pre-wrap leading-relaxed">
              {selectedShare.formattedShareText}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                id="btn-copy-share-text"
                onClick={handleCopyShareText}
                className="px-4 py-2 bg-[#18181B] hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                {shareCopied ? t("history.copied") : t("history.copySummary")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
