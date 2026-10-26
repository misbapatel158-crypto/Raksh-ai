import React, { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  Phone,
  PhoneCall,
  Navigation,
  Share2,
  RefreshCw,
  MapPin,
  Flame,
  Car,
  HeartPulse,
  Shield,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
  Clock,
  SlidersHorizontal,
  Compass,
  Check,
  Search,
  Wifi,
  WifiOff,
  UserPlus,
  BookOpen,
  Send,
  Radio,
  Zap,
  Route,
} from "lucide-react";

import { api } from "../services/api";
import {
  OfflineStorageManager,
  CachedLocation,
  calculateHaversineKm,
} from "../services/offlineStorage";
import { OfficialDirectoryModal } from "./OfficialDirectoryModal";
import {
  User,
  Incident,
  Hospital,
  FireService,
  EmergencyContact,
  SavedEmergencyIncident,
} from "../types";
import { useTranslation } from "../i18n";

interface EmergencyWizardProps {
  user: User | null;
  onOpenAuth: () => void;
  onIncidentSaved: (incident: Incident) => void;
  onNavigateToLive?: () => void;
  onNavigateToCorridor?: () => void;
  onSimulateAccidentImpact?: () => void;
}


const EMERGENCY_TYPES = [
  {
    id: "ROAD_ACCIDENT",
    label: "Road Accident",
    icon: Car,
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    description: "Vehicle collision, highway trauma, pedestrian hit",
    primaryTarget: "HOSPITAL",
    actionPlan: ["1. Call 112 / 102 Ambulance", "2. Route to nearest Trauma Center", "3. Share GPS location with contacts"],
  },
  {
    id: "FIRE",
    label: "Fire Emergency",
    icon: Flame,
    badgeColor: "bg-red-100 text-red-900 border-red-300",
    description: "Building fire, industrial smoke, chemical flame",
    primaryTarget: "FIRE_SERVICE",
    actionPlan: ["1. Call 101 Fire Brigade", "2. Call 112 Emergency", "3. Evacuate structure & share coordinates"],
  },
  {
    id: "MEDICAL",
    label: "Medical Critical",
    icon: HeartPulse,
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
    description: "Cardiac arrest, stroke, severe trauma, unconsciousness",
    primaryTarget: "HOSPITAL",
    actionPlan: ["1. Call 108 / 102 Ambulance", "2. Locate nearest 24/7 ICU Hospital", "3. Start CPR if trained"],
  },
  {
    id: "POLICE",
    label: "Police & Threat",
    icon: Shield,
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    description: "Active crime, physical assault, intruder, violence",
    primaryTarget: "POLICE",
    actionPlan: ["1. Call 100 / 112 Police", "2. Seek secure shelter", "3. Transmit live coordinates silently"],
  },
  {
    id: "OTHER",
    label: "Other Rescue",
    icon: AlertTriangle,
    badgeColor: "bg-zinc-100 text-zinc-900 border-zinc-300",
    description: "Natural disaster, building collapse, flood rescue",
    primaryTarget: "ALL",
    actionPlan: ["1. Call 112 National Rescue", "2. Call 1070 NDMA Helpline", "3. Broadcast location to responders"],
  },
];

const PRESET_LOCATIONS = [
  { name: "Pune / Hinjawadi (Reference)", lat: 18.6111, lon: 73.71857 },
  { name: "Mumbai (South / Parel)", lat: 19.0033, lon: 72.8427 },
  { name: "San Francisco (Civic Center)", lat: 37.7749, lon: -122.4194 },
  { name: "New York City (Manhattan)", lat: 40.7128, lon: -74.0060 },
  { name: "London (Westminster)", lat: 51.5074, lon: -0.1278 },
  { name: "Tokyo (Shibuya)", lat: 35.6580, lon: 139.7016 },
];

const RADIUS_OPTIONS = [5, 10, 25, 50];

export const EmergencyWizard: React.FC<EmergencyWizardProps> = ({
  user,
  onOpenAuth,
  onIncidentSaved,
  onNavigateToLive,
  onNavigateToCorridor,
  onSimulateAccidentImpact,
}) => {

  const { t } = useTranslation();
  // Network connectivity status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Modal for official emergency directory
  const [showDirectoryModal, setShowDirectoryModal] = useState<boolean>(false);

  // Selected emergency type
  const [incidentType, setIncidentType] = useState<string>("ROAD_ACCIDENT");
  const [inEmergencyMode, setInEmergencyMode] = useState<boolean>(false);

  // GPS & Location state
  const [coords, setCoords] = useState<CachedLocation>(() => {
    const cached = OfflineStorageManager.getLastLocation();
    return (
      cached || {
        latitude: 18.6111,
        longitude: 73.71857,
        accuracy: 15,
        timestamp: new Date().toLocaleTimeString(),
        isRealGps: false,
        isLastKnown: true,
      }
    );
  });

  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<{ lat: string; lon: string }>({
    lat: "18.6111",
    lon: "73.71857",
  });

  // Search & Filter state
  const [selectedRadius, setSelectedRadius] = useState<number>(25);
  const [hospitalCategoryFilter, setHospitalCategoryFilter] = useState<"ALL" | "GOVERNMENT" | "PRIVATE">("ALL");
  const [activeTab, setActiveTab] = useState<"HOSPITALS" | "FIRE_SERVICES" | "CONTACTS">("HOSPITALS");

  // Facility Results
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [fireServices, setFireServices] = useState<FireService[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);
  const [nearestAvailableDistance, setNearestAvailableDistance] = useState<number | null>(null);

  // Emergency Contacts
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("Family");
  const [showAddContact, setShowAddContact] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Monitor online / offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("🟢 Internet connection restored. Online sync active.");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("🟠 Offline mode active: Using cached directory and local calculations.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load Contacts (Online if logged in, otherwise Offline local storage)
  const refreshContacts = useCallback(async () => {
    if (user && isOnline) {
      try {
        const res = await api.getContacts();
        if (res.success && res.data?.contacts) {
          setContacts(res.data.contacts);
          return;
        }
      } catch (e) {
        console.warn("Failed fetching online contacts, using offline fallback:", e);
      }
    }
    const local = OfflineStorageManager.getOfflineContacts();
    setContacts(local);
  }, [user, isOnline]);

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  // Acquire Geolocation
  const acquireLocation = useCallback((): Promise<CachedLocation> => {
    return new Promise((resolve) => {
      setLocationLoading(true);
      setLocationMessage(null);

      if (!navigator.geolocation) {
        const fallback: CachedLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? 25,
          timestamp: new Date().toLocaleTimeString(),
          isRealGps: false,
          isLastKnown: true,
        };
        setCoords(fallback);
        setLocationMessage("Geolocation is not supported by your browser. Using stored reference location.");
        setLocationLoading(false);
        resolve(fallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const acc = position.coords.accuracy ? Math.round(position.coords.accuracy) : null;
          const now = new Date().toLocaleTimeString();

          const loc: CachedLocation = {
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            timestamp: now,
            isRealGps: true,
            isLastKnown: false,
          };

          setCoords(loc);
          setManualInput({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
          OfflineStorageManager.saveLastLocation({
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            isRealGps: true,
          });
          setLocationLoading(false);
          setLocationMessage(null);
          resolve(loc);
        },
        (error) => {
          console.warn("Geolocation prompt denied/failed:", error.message);
          const cached = OfflineStorageManager.getLastLocation() || {
            latitude: 18.6111,
            longitude: 73.71857,
            accuracy: 30,
            timestamp: new Date().toLocaleTimeString(),
            isRealGps: false,
            isLastKnown: true,
          };
          const updated: CachedLocation = {
            ...cached,
            timestamp: new Date().toLocaleTimeString(),
            isLastKnown: true,
          };
          setCoords(updated);
          setLocationMessage(
            "GPS location access unavailable. Using last known/reference coordinates. You can select a city preset or enter custom coordinates."
          );
          setLocationLoading(false);
          resolve(updated);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
      );
    });
  }, [coords]);

  // Fetch Hospitals and Fire Services (Online with automatic fallback to Offline storage + automatic radius expansion)
  const fetchServices = useCallback(
    async (
      lat: number,
      lon: number,
      radius: number = selectedRadius,
      catFilter: "ALL" | "GOVERNMENT" | "PRIVATE" = hospitalCategoryFilter
    ) => {
      setLoadingServices(true);

      // Attempt online API first if connected
      if (isOnline) {
        try {
          const [hospRes, fireRes] = await Promise.allSettled([
            api.getNearbyHospitals({ latitude: lat, longitude: lon, type: catFilter, radiusKm: radius, limit: 20 }),
            api.getNearbyFireServices({ latitude: lat, longitude: lon, radiusKm: radius, limit: 20 }),
          ]);

          let onlineHospitals: Hospital[] = [];
          let onlineFireServices: FireService[] = [];
          let minHospitalDist: number | null = null;

          if (hospRes.status === "fulfilled" && hospRes.value.success && hospRes.value.data) {
            onlineHospitals = hospRes.value.data.hospitals || [];
            minHospitalDist = hospRes.value.data.nearestAvailableDistanceKm ?? null;
            OfflineStorageManager.cacheOnlineHospitals(onlineHospitals);
          }

          if (fireRes.status === "fulfilled" && fireRes.value.success && fireRes.value.data) {
            onlineFireServices = fireRes.value.data.fireServices || [];
            OfflineStorageManager.cacheOnlineFireServices(onlineFireServices);
          }

          // If online returned results, use them
          if (onlineHospitals.length > 0 || onlineFireServices.length > 0) {
            setHospitals(onlineHospitals);
            setFireServices(onlineFireServices);
            setNearestAvailableDistance(minHospitalDist);
            setLoadingServices(false);
            return {
              nearestHospital: onlineHospitals[0] || null,
              nearestFireService: onlineFireServices[0] || null,
            };
          }
        } catch (e) {
          console.warn("Online API query encountered issue, falling back to local dataset:", e);
        }
      }

      // Offline or fallback dataset query
      const offlineHosp = OfflineStorageManager.getOfflineHospitals({
        latitude: lat,
        longitude: lon,
        radiusKm: radius,
        category: catFilter,
      });

      const offlineFire = OfflineStorageManager.getOfflineFireServices({
        latitude: lat,
        longitude: lon,
        radiusKm: radius,
      });

      // Auto-radius fallback: If 0 hospitals within current radius, check larger radius
      let finalHospitals = offlineHosp.hospitals;
      if (finalHospitals.length === 0 && radius < 50) {
        const expanded = OfflineStorageManager.getOfflineHospitals({
          latitude: lat,
          longitude: lon,
          radiusKm: 50,
          category: catFilter,
        });
        finalHospitals = expanded.hospitals;
      }

      setHospitals(finalHospitals);
      setFireServices(offlineFire.fireServices);
      setNearestAvailableDistance(offlineHosp.nearestAvailableDistanceKm);
      setLoadingServices(false);

      return {
        nearestHospital: finalHospitals[0] || null,
        nearestFireService: offlineFire.fireServices[0] || null,
      };
    },
    [isOnline, selectedRadius, hospitalCategoryFilter]
  );

  // Initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const loc = await acquireLocation();
      if (isMounted) {
        await fetchServices(loc.latitude, loc.longitude, selectedRadius, hospitalCategoryFilter);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  // Manual Radius change
  const handleRadiusChange = async (newRadius: number) => {
    setSelectedRadius(newRadius);
    await fetchServices(coords.latitude, coords.longitude, newRadius, hospitalCategoryFilter);
  };

  // Category Filter change
  const handleCategoryFilterChange = async (cat: "ALL" | "GOVERNMENT" | "PRIVATE") => {
    setHospitalCategoryFilter(cat);
    await fetchServices(coords.latitude, coords.longitude, selectedRadius, cat);
  };

  // Refresh Location
  const handleRefreshLocation = async () => {
    const loc = await acquireLocation();
    await fetchServices(loc.latitude, loc.longitude, selectedRadius, hospitalCategoryFilter);
    showToast("📍 Coordinates refreshed. Nearby resources updated.");
  };

  // Apply City Preset
  const handleApplyPreset = async (preset: { name: string; lat: number; lon: number }) => {
    const loc: CachedLocation = {
      latitude: preset.lat,
      longitude: preset.lon,
      accuracy: 10,
      timestamp: new Date().toLocaleTimeString(),
      isRealGps: false,
      isLastKnown: true,
    };
    setCoords(loc);
    setManualInput({ lat: preset.lat.toString(), lon: preset.lon.toString() });
    setLocationMessage(null);
    setShowManualLocation(false);
    OfflineStorageManager.saveLastLocation({
      latitude: preset.lat,
      longitude: preset.lon,
      accuracy: 10,
      isRealGps: false,
    });
    await fetchServices(preset.lat, preset.lon, selectedRadius, hospitalCategoryFilter);
    showToast(`📍 Relocated to ${preset.name}. Nearby facilities updated.`);
  };

  // Custom Coordinates
  const handleApplyCustomCoords = async () => {
    const lat = parseFloat(manualInput.lat);
    const lon = parseFloat(manualInput.lon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      showToast("❌ Enter valid numerical coordinates (-90 to 90 lat, -180 to 180 lon).");
      return;
    }
    const loc: CachedLocation = {
      latitude: lat,
      longitude: lon,
      accuracy: null,
      timestamp: new Date().toLocaleTimeString(),
      isRealGps: false,
      isLastKnown: true,
    };
    setCoords(loc);
    setLocationMessage(null);
    setShowManualLocation(false);
    OfflineStorageManager.saveLastLocation({
      latitude: lat,
      longitude: lon,
      accuracy: null,
      isRealGps: false,
    });
    await fetchServices(lat, lon, selectedRadius, hospitalCategoryFilter);
    showToast(`📍 Set custom location: ${lat.toFixed(4)}, ${lon.toFixed(4)}.`);
  };

  // Trigger Emergency Mode
  const triggerEmergency = async (type: string) => {
    setIncidentType(type);
    setInEmergencyMode(true);
    if (type === "FIRE") {
      setActiveTab("FIRE_SERVICES");
    } else {
      setActiveTab("HOSPITALS");
    }

    const loc = await acquireLocation();
    const { nearestHospital, nearestFireService } = await fetchServices(
      loc.latitude,
      loc.longitude,
      selectedRadius,
      hospitalCategoryFilter
    );

    // Save incident asynchronously to backend if online
    if (isOnline) {
      api.saveEmergencyIncident({
        type,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        description: `Emergency alert triggered for ${type.replace(/_/g, " ")}`,
        nearestHospitalId: nearestHospital?.id || null,
        nearestFireServiceId: nearestFireService?.id || null,
      }).catch((e) => console.warn("Background incident logging notice:", e));
    }

    showToast(`🚨 ${type.replace(/_/g, " ")} active. Direct emergency options loaded below.`);
  };

  // Share Location & Incident
  const handleShareLocation = async (targetName?: string, targetPhone?: string | null) => {
    const lat = coords.latitude;
    const lon = coords.longitude;
    const mapUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    const nearestHosp = hospitals[0];
    const nearestFire = fireServices[0];

    const shareTitle = `🚨 RakshAI Emergency Alert: ${incidentType.replace(/_/g, " ")}`;
    const shareText = `🚨 [RakshAI EMERGENCY ALERT] 🚨
Incident Type: ${incidentType.replace(/_/g, " ")}
GPS Location: ${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E (±${coords.accuracy || 15}m)
Google Maps Link: ${mapUrl}
${nearestHosp ? `Nearest Hospital: ${nearestHosp.name} (${nearestHosp.distanceKm.toFixed(1)} km) - Tel: ${nearestHosp.phone || "N/A"}` : ""}
${nearestFire ? `Nearest Fire Station: ${nearestFire.name} (${nearestFire.distanceKm.toFixed(1)} km) - Tel: ${nearestFire.phone || "N/A"}` : ""}
${targetName ? `Facility Selected: ${targetName} (Tel: ${targetPhone || "N/A"})` : ""}
Timestamp: ${new Date().toLocaleString()}
Mode: ${isOnline ? "Online" : "Offline Storage"}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: mapUrl,
        });
        showToast("✓ Emergency coordinates shared.");
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      showToast("✓ Emergency report and GPS coordinates copied to clipboard!");
    } catch {
      showToast("⚠️ Could not copy automatically. Please note coordinates manually.");
    }
  };

  // Add Contact (Offline + Online)
  const handleAddQuickContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    if (user && isOnline) {
      try {
        const res = await api.createContact({
          name: newContactName.trim(),
          relationship: newContactRelation.trim(),
          phone: newContactPhone.trim(),
          isPrimary: contacts.length === 0,
        });
        if (res.success && res.data?.contact) {
          setContacts((prev) => [res.data.contact, ...prev]);
        }
      } catch (err) {
        console.warn("Online contact save failed, storing locally:", err);
        const local = OfflineStorageManager.saveOfflineContact({
          name: newContactName.trim(),
          relationship: newContactRelation.trim(),
          phone: newContactPhone.trim(),
        });
        setContacts((prev) => [local, ...prev]);
      }
    } else {
      const local = OfflineStorageManager.saveOfflineContact({
        name: newContactName.trim(),
        relationship: newContactRelation.trim(),
        phone: newContactPhone.trim(),
      });
      setContacts((prev) => [local, ...prev]);
    }

    setNewContactName("");
    setNewContactPhone("");
    setShowAddContact(false);
    showToast("✓ Emergency contact saved.");
  };

  const nearestHospital = hospitals[0] || null;
  const selectedTypeConfig = EMERGENCY_TYPES.find((t) => t.id === incidentType) || EMERGENCY_TYPES[0];

  return (
    <div id="emergency-assistance-root" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181B] text-white px-4 py-3 rounded-xl shadow-2xl border border-zinc-700 flex items-center gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Official Directory Modal */}
      <OfficialDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
      />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ONE-TAP EMERGENCY SECTION                                */}
      {/* ========================================================================= */}
      <div
        id="one-tap-hero-section"
        className="bg-white border-2 border-red-500/80 rounded-2xl p-5 sm:p-6 shadow-md space-y-5"
      >
        {/* Top Title, Network Indicator & Directory Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F4F5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-red-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-sm shrink-0">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight uppercase">
                  {t("emergency.title")}
                </h1>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {t("emergency.online")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                    <WifiOff className="w-3 h-3 text-amber-600" />
                    {t("emergency.offlineMode")}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A] mt-0.5">
                {t("emergency.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              id="btn-view-official-directory"
              onClick={() => setShowDirectoryModal(true)}
              className="px-3 py-1.5 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#71717A]" />
              <span>{t("emergency.helplineDirectory")}</span>
            </button>
          </div>
        </div>

        {/* Network & Cellular Notice */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>{t("emergency.carrierNoticeTitle")}:</strong> {t("emergency.carrierNoticeDesc")}
          </div>
        </div>

        {/* PRIMARY HERO CALL BUTTON: CALL 112 */}
        <div className="pt-1">
          <a
            id="btn-call-112-hero"
            href="tel:112"
            className="w-full py-4 sm:py-5 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-2xl text-lg sm:text-xl font-black flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all cursor-pointer uppercase tracking-wider"
          >
            <PhoneCall className="w-6 h-6 sm:w-7 sm:h-7 animate-bounce" />
            <span>{t("emergency.call112")}</span>
          </a>
        </div>

        {/* ONE-TAP DIRECT EMERGENCY BUTTONS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* 1. AMBULANCE (102 / 108) */}
          <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl flex flex-col justify-between gap-3 hover:border-zinc-400 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-base">
                🚑
              </div>
              <div>
                <h2 className="font-bold text-xs sm:text-sm text-[#18181B]">
                  {t("emergency.ambulance")}
                </h2>
                <span className="text-[11px] font-mono text-[#71717A]">
                  102 (Free) / 108 (Trauma)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                id="btn-call-102"
                href="tel:102"
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t("common.call")} 102</span>
              </a>
              <a
                id="btn-call-108"
                href="tel:108"
                className="flex-1 py-2 bg-[#18181B] hover:bg-zinc-800 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t("common.call")} 108</span>
              </a>
            </div>
          </div>

          {/* 2. POLICE (100) */}
          <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl flex flex-col justify-between gap-3 hover:border-zinc-400 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-base">
                👮
              </div>
              <div>
                <h2 className="font-bold text-xs sm:text-sm text-[#18181B]">
                  {t("emergency.police")}
                </h2>
                <span className="text-[11px] font-mono text-[#71717A]">
                  100 (Direct Control)
                </span>
              </div>
            </div>
            <a
              id="btn-call-100"
              href="tel:100"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t("common.call")} 100</span>
            </a>
          </div>

          {/* 3. FIRE BRIGADE (101) */}
          <div className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl flex flex-col justify-between gap-3 hover:border-zinc-400 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-base">
                🚒
              </div>
              <div>
                <h2 className="font-bold text-xs sm:text-sm text-[#18181B]">
                  {t("emergency.fireBrigade")}
                </h2>
                <span className="text-[11px] font-mono text-[#71717A]">
                  101 (Municipal Dispatch)
                </span>
              </div>
            </div>
            <a
              id="btn-call-101"
              href="tel:101"
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t("common.call")} 101</span>
            </a>
          </div>

          {/* 4. NEAREST HOSPITAL (Direct One-Tap) */}
          <div className="p-4 bg-rose-50/70 border border-rose-300 rounded-xl flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center font-bold text-base">
                🏥
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  {t("emergency.nearestHospital")}
                </span>
                <p className="font-bold text-xs sm:text-sm text-[#18181B] truncate">
                  {nearestHospital ? nearestHospital.name : t("common.searching")}
                </p>
                <span className="text-[11px] font-bold text-rose-800">
                  {nearestHospital ? `📍 ${nearestHospital.distanceKm.toFixed(1)} km away` : t("common.calculating")}
                </span>
              </div>
            </div>
            {nearestHospital?.phone ? (
              <a
                id="btn-call-nearest-hospital-quick"
                href={`tel:${nearestHospital.phone.replace(/[^0-9+]/g, "")}`}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t("common.call")} ({nearestHospital.phone})</span>
              </a>
            ) : (
              <button
                onClick={() => handleRadiusChange(25)}
                className="w-full py-2 bg-[#18181B] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t("emergency.viewHospitals")}</span>
              </button>
            )}
          </div>
        </div>

        {/* 🚨 SMART ACCIDENT DETECTION & LIVE RADAR & CORRIDOR QUICK ACTION STRIP */}
        <div className="pt-2 border-t border-[#F4F4F5]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Live Incidents Radar Quick Link */}
            <div className="bg-[#18181B] text-white rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold">
                  <Radio className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div>
                  <span className="font-extrabold text-xs tracking-tight block">
                    {t("liveIncidents.quickTitle", "🚨 Live Radar")}
                  </span>
                  <span className="text-[11px] text-zinc-300 truncate">
                    Nearby emergencies
                  </span>
                </div>
              </div>

              <button
                id="btn-quick-open-live-radar"
                onClick={() => onNavigateToLive && onNavigateToLive()}
                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0 shadow-xs"
              >
                <span>Radar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Emergency Corridor Quick Link */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 text-white rounded-xl p-3.5 flex items-center justify-between gap-3 border border-zinc-800 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-400">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs tracking-tight block text-emerald-300">
                    {t("corridor.quickTitle", "🚨 Green Corridor")}
                  </span>
                  <span className="text-[11px] text-zinc-300 truncate">
                    Track responding units
                  </span>
                </div>
              </div>

              <button
                id="btn-quick-open-corridor"
                onClick={() => onNavigateToCorridor && onNavigateToCorridor()}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0 shadow-xs"
              >
                <span>Corridor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Smart Accident Detection Status & Test */}
            <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#18181B] block">
                    {t("accident.statusTitle", "Accident Detection")}
                  </span>
                  <span className="text-[11px] text-[#71717A]">
                    Auto crash impact
                  </span>
                </div>
              </div>

              <button
                id="btn-quick-simulate-impact"
                onClick={() => onSimulateAccidentImpact && onSimulateAccidentImpact()}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shrink-0 shadow-xs"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Simulate</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 2. GPS & LOCATION CONTROLS BAR                                           */}
      {/* ========================================================================= */}
      <div
        id="location-control-bar"
        className="bg-white border border-[#E4E4E7] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  {coords.isRealGps ? t("emergency.liveGps") : t("emergency.cachedGps")}
                </span>
                {coords.isRealGps ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.2 rounded border border-amber-300">
                    Cached
                  </span>
                )}
              </div>
              <div className="text-sm sm:text-base font-bold text-[#18181B] font-mono">
                {coords.latitude.toFixed(5)}° N, {coords.longitude.toFixed(5)}° E
                <span className="text-[#71717A] text-xs font-sans font-normal ml-2">
                  (±{coords.accuracy || 15}m) • {coords.timestamp}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-refresh-gps"
              onClick={handleRefreshLocation}
              disabled={locationLoading}
              className="px-3 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locationLoading ? "animate-spin text-red-600" : ""}`} />
              <span>{locationLoading ? t("common.calculating") : t("emergency.refreshGps")}</span>
            </button>

            <button
              id="btn-share-gps-top"
              onClick={() => handleShareLocation()}
              className="px-3 py-2 bg-white hover:bg-[#F4F4F5] text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{t("emergency.shareLocation")}</span>
            </button>

            <button
              id="btn-toggle-presets"
              onClick={() => setShowManualLocation(!showManualLocation)}
              className="px-3 py-2 border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{showManualLocation ? t("emergency.hidePresets") : t("emergency.cityPresets")}</span>
            </button>
          </div>
        </div>

        {locationMessage && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>{locationMessage}</span>
          </div>
        )}

        {/* City Presets Drawer */}
        {showManualLocation && (
          <div className="p-4 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl space-y-3 animate-in fade-in">
            <div className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center justify-between">
              <span>{t("emergency.presetsDesc")}</span>
              <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono font-bold">
                OFFLINE COMPATIBLE
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-3 py-1.5 border text-xs font-semibold rounded-lg transition-colors shadow-2xs ${
                    Math.abs(coords.latitude - preset.lat) < 0.01 && Math.abs(coords.longitude - preset.lon) < 0.01
                      ? "bg-red-600 border-red-600 text-white font-bold"
                      : "bg-white border-[#E4E4E7] text-[#18181B] hover:border-red-400"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[#E4E4E7] flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <label className="font-bold text-[#71717A]">Lat:</label>
                <input
                  type="text"
                  value={manualInput.lat}
                  onChange={(e) => setManualInput({ ...manualInput, lat: e.target.value })}
                  className="w-24 px-2 py-1 bg-white border border-[#E4E4E7] rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="font-bold text-[#71717A]">Lon:</label>
                <input
                  type="text"
                  value={manualInput.lon}
                  onChange={(e) => setManualInput({ ...manualInput, lon: e.target.value })}
                  className="w-24 px-2 py-1 bg-white border border-[#E4E4E7] rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <button
                onClick={handleApplyCustomCoords}
                className="px-3 py-1 bg-[#18181B] text-white hover:bg-zinc-800 text-xs font-bold rounded-lg transition-colors"
              >
                Set Location
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. EMERGENCY CATEGORY SELECTION & ACTION PLAN                            */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#18181B]">
              {t("emergency.triageTitle")}
            </h2>
            <p className="text-xs text-[#71717A]">
              {t("emergency.triageDesc")}
            </p>
          </div>
          {inEmergencyMode && (
            <button
              onClick={() => setInEmergencyMode(false)}
              className="text-xs font-bold text-[#71717A] hover:text-[#18181B]"
            >
              {t("emergency.resetCategory")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {EMERGENCY_TYPES.map((type) => {
            const IconComponent = type.icon;
            const isSelected = incidentType === type.id && inEmergencyMode;
            const typeLabel =
              type.id === "ROAD_ACCIDENT"
                ? t("emergency.roadAccident")
                : type.id === "FIRE"
                ? t("emergency.fireEmergency")
                : type.id === "MEDICAL"
                ? t("emergency.medicalEmergency")
                : type.id === "POLICE"
                ? t("emergency.policeSecurity")
                : t("emergency.otherRescue");

            return (
              <button
                key={type.id}
                id={`btn-triage-${type.id.toLowerCase()}`}
                onClick={() => triggerEmergency(type.id)}
                className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-2 ${
                  isSelected
                    ? "bg-red-50 border-red-500 shadow-sm ring-1 ring-red-400"
                    : "bg-[#FAFAFA] border-[#E4E4E7] hover:bg-white hover:border-red-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-white border border-[#E4E4E7] text-red-600 shadow-2xs">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA]" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#18181B] leading-tight">
                    {typeLabel}
                  </div>
                  <div className="text-[11px] text-[#71717A] mt-0.5 line-clamp-1">
                    {type.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {inEmergencyMode && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-900 uppercase tracking-wide">
                {t("emergency.actionPlan")}: {
                  incidentType === "ROAD_ACCIDENT"
                    ? t("emergency.roadAccident")
                    : incidentType === "FIRE"
                    ? t("emergency.fireEmergency")
                    : incidentType === "MEDICAL"
                    ? t("emergency.medicalEmergency")
                    : incidentType === "POLICE"
                    ? t("emergency.policeSecurity")
                    : t("emergency.otherRescue")
                }
              </span>
              <button
                onClick={() => handleShareLocation()}
                className="text-xs font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" />
                <span>{t("emergency.shareReport")}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-red-900 font-medium">
              {selectedTypeConfig.actionPlan.map((action, idx) => (
                <div key={idx} className="p-2 bg-white/80 rounded-lg border border-red-200">
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. RESOURCE TABS & FACILITIES LIST                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#E4E4E7] p-1 rounded-xl">
          <button
            id="tab-hospitals"
            onClick={() => setActiveTab("HOSPITALS")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "HOSPITALS"
                ? "bg-white text-[#18181B] shadow-xs"
                : "text-[#71717A] hover:text-[#18181B]"
            }`}
          >
            <Building2 className="w-4 h-4 text-rose-600" />
            <span>{t("emergency.tabHospitals")} ({hospitals.length})</span>
          </button>

          <button
            id="tab-fire"
            onClick={() => setActiveTab("FIRE_SERVICES")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "FIRE_SERVICES"
                ? "bg-white text-[#18181B] shadow-xs"
                : "text-[#71717A] hover:text-[#18181B]"
            }`}
          >
            <Flame className="w-4 h-4 text-amber-600" />
            <span>{t("emergency.tabFire")} ({fireServices.length})</span>
          </button>

          <button
            id="tab-contacts"
            onClick={() => setActiveTab("CONTACTS")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "CONTACTS"
                ? "bg-white text-[#18181B] shadow-xs"
                : "text-[#71717A] hover:text-[#18181B]"
            }`}
          >
            <Shield className="w-4 h-4 text-blue-600" />
            <span>{t("emergency.tabContacts")} ({contacts.length})</span>
          </button>
        </div>

        {/* Filter Controls (Radius & Category) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Radius Selector */}
          <div className="flex items-center gap-1 bg-white border border-[#E4E4E7] p-1 rounded-xl">
            <span className="text-[11px] font-bold text-[#71717A] px-2">{t("emergency.radius")}:</span>
            {RADIUS_OPTIONS.map((rad) => (
              <button
                key={rad}
                id={`btn-rad-${rad}km`}
                onClick={() => handleRadiusChange(rad)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedRadius === rad
                    ? "bg-red-600 text-white"
                    : "text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
                }`}
              >
                {rad} km
              </button>
            ))}
          </div>

          {/* Hospital Category Filter */}
          {activeTab === "HOSPITALS" && (
            <div className="flex items-center gap-1 bg-white border border-[#E4E4E7] p-1 rounded-xl">
              <span className="text-[11px] font-bold text-[#71717A] px-2 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> {t("emergency.type")}:
              </span>
              {(["ALL", "GOVERNMENT", "PRIVATE"] as const).map((filterVal) => (
                <button
                  key={filterVal}
                  id={`btn-filter-${filterVal.toLowerCase()}`}
                  onClick={() => handleCategoryFilterChange(filterVal)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    hospitalCategoryFilter === filterVal
                      ? "bg-[#18181B] text-white"
                      : "text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]"
                  }`}
                >
                  {filterVal === "ALL" ? t("emergency.all") : filterVal === "GOVERNMENT" ? `🏛️ ${t("emergency.govt")}` : `🏥 ${t("emergency.private")}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TAB PANELS CONTENT                                                    */}
      {/* ========================================================================= */}
      {loadingServices ? (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <RefreshCw className="w-7 h-7 text-red-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#18181B]">
            {t("history.loading")}
          </p>
          <p className="text-xs text-[#71717A]">
            {t("emergency.radius")}: {selectedRadius} km ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: HOSPITALS & AMBULANCES */}
          {activeTab === "HOSPITALS" && (
            <div className="space-y-3">
              {hospitals.length === 0 ? (
                <div className="bg-white border border-[#E4E4E7] rounded-2xl p-8 text-center space-y-4 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 mx-auto flex items-center justify-center font-bold text-xl">
                    🏥
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#18181B]">
                      {t("emergency.noHospitalsFound")} ({selectedRadius} km)
                    </h3>
                    <p className="text-xs text-[#71717A] max-w-md mx-auto">
                      {nearestAvailableDistance
                        ? `${t("emergency.nearestHospital")} ~${nearestAvailableDistance.toFixed(1)} km.`
                        : t("emergency.noHospitalsFound")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {selectedRadius < 10 && (
                      <button
                        onClick={() => handleRadiusChange(10)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        10 km
                      </button>
                    )}
                    {selectedRadius < 25 && (
                      <button
                        onClick={() => handleRadiusChange(25)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        25 km
                      </button>
                    )}
                    {selectedRadius < 50 && (
                      <button
                        onClick={() => handleRadiusChange(50)}
                        className="px-4 py-2 bg-[#18181B] hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        50 km
                      </button>
                    )}
                    <a
                      href={`https://www.google.com/maps/search/hospital/@${coords.latitude},${coords.longitude},13z`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#18181B] text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{t("common.map")}</span>
                      <ExternalLink className="w-3 h-3 text-[#71717A]" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {hospitals.map((hospital, idx) => {
                    const isTopNearest = idx === 0;
                    const isGov = hospital.category === "GOVERNMENT";

                    return (
                      <div
                        key={hospital.id}
                        id={`hospital-card-${hospital.id}`}
                        className={`rounded-2xl border transition-all ${
                          isTopNearest
                            ? "bg-rose-50/40 border-rose-300 shadow-sm ring-1 ring-rose-200"
                            : "bg-white border-[#E4E4E7] hover:border-zinc-300"
                        } p-4 sm:p-5`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Facility Info */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {isTopNearest && (
                                <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                  ★ {t("emergency.nearestHospitalBadge")}
                                </span>
                              )}
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                                  isGov
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : "bg-purple-50 text-purple-800 border-purple-200"
                                }`}
                              >
                                {isGov ? `🏛️ ${t("emergency.govtHospital")}` : `🏥 ${t("emergency.privateHospital")}`}
                              </span>
                              <span className="text-xs font-bold text-[#18181B] bg-[#F4F4F5] px-2 py-0.5 rounded-lg">
                                📍 {hospital.distanceKm.toFixed(1)} km
                              </span>
                            </div>

                            <div>
                              <h3 className="text-base sm:text-lg font-bold text-[#18181B] leading-tight">
                                {hospital.name}
                              </h3>
                              <p className="text-xs text-[#71717A] mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                                <span>{hospital.address}</span>
                              </p>
                            </div>

                            {hospital.emergencyDepartment && (
                              <p className="text-xs text-rose-900 bg-rose-100/70 px-2.5 py-1 rounded-lg inline-block font-medium">
                                🩺 {hospital.emergencyDepartment}
                              </p>
                            )}

                            <div className="text-[10px] text-[#A1A1AA] flex flex-wrap items-center gap-1 font-mono pt-0.5">
                              <span>Source: {hospital.source}</span>
                              <span>•</span>
                              <span>Verified: {hospital.lastVerified}</span>
                            </div>
                          </div>

                          {/* Actions: Call Hospital, Call Ambulance, Navigate, Share */}
                          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col xl:flex-row items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#F4F4F5]">
                            {hospital.phone ? (
                              <a
                                id={`call-hospital-${hospital.id}`}
                                href={`tel:${hospital.phone.replace(/[^0-9+]/g, "")}`}
                                className="flex-1 sm:flex-none w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{t("common.call")} ({hospital.phone})</span>
                              </a>
                            ) : (
                              <button
                                disabled
                                className="flex-1 sm:flex-none w-full sm:w-auto px-4 py-2.5 bg-[#F4F4F5] text-[#A1A1AA] rounded-xl font-medium text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                              >
                                <Phone className="w-3.5 h-3.5 text-zinc-300" />
                                <span>{t("emergency.noDirectPhone")}</span>
                              </button>
                            )}

                            {hospital.ambulancePhone && (
                              <a
                                id={`call-ambulance-${hospital.id}`}
                                href={`tel:${hospital.ambulancePhone.replace(/[^0-9+]/g, "")}`}
                                className="flex-1 sm:flex-none w-full sm:w-auto px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
                              >
                                <HeartPulse className="w-3.5 h-3.5" />
                                <span>{t("emergency.ambulance")} ({hospital.ambulancePhone})</span>
                              </a>
                            )}

                            <a
                              id={`nav-hospital-${hospital.id}`}
                              href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 sm:flex-none w-full sm:w-auto px-3.5 py-2.5 bg-[#18181B] hover:bg-zinc-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>{t("common.navigate")}</span>
                              <ExternalLink className="w-3 h-3 text-zinc-400" />
                            </a>

                            <button
                              id={`share-hospital-${hospital.id}`}
                              onClick={() => handleShareLocation(hospital.name, hospital.phone)}
                              className="p-2.5 border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#71717A] hover:text-[#18181B] rounded-xl transition-colors"
                              title="Share hospital location"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FIRE STATIONS */}
          {activeTab === "FIRE_SERVICES" && (
            <div className="space-y-3">
              {fireServices.length === 0 ? (
                <div className="bg-white border border-[#E4E4E7] rounded-2xl p-8 text-center space-y-3 shadow-xs">
                  <Flame className="w-10 h-10 text-amber-600 mx-auto" />
                  <h3 className="text-base font-bold text-[#18181B]">
                    {t("emergency.noFireFound")} ({selectedRadius} km)
                  </h3>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => handleRadiusChange(50)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
                    >
                      50 km
                    </button>
                    <a
                      href="tel:101"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                    >
                      {t("common.call")} 101
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {fireServices.map((station, idx) => {
                    const isTopNearest = idx === 0;

                    return (
                      <div
                        key={station.id}
                        id={`fire-card-${station.id}`}
                        className={`rounded-2xl border transition-all ${
                          isTopNearest
                            ? "bg-amber-50/40 border-amber-300 shadow-sm ring-1 ring-amber-200"
                            : "bg-white border-[#E4E4E7] hover:border-zinc-300"
                        } p-4 sm:p-5`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {isTopNearest && (
                                <span className="px-2.5 py-0.5 bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                  ★ {t("emergency.nearestFireStation")}
                                </span>
                              )}
                              <span className="text-xs font-bold text-[#18181B] bg-[#F4F4F5] px-2 py-0.5 rounded-lg">
                                📍 {station.distanceKm.toFixed(1)} km
                              </span>
                            </div>

                            <div>
                              <h3 className="text-base sm:text-lg font-bold text-[#18181B] leading-tight">
                                {station.name}
                              </h3>
                              <p className="text-xs text-[#71717A] mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                                <span>{station.address}</span>
                              </p>
                            </div>

                            <div className="text-[10px] text-[#A1A1AA] flex flex-wrap items-center gap-1 font-mono pt-0.5">
                              <span>Source: {station.source}</span>
                              <span>•</span>
                              <span>Verified: {station.lastVerified}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col xl:flex-row items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#F4F4F5]">
                            {station.phone ? (
                              <a
                                id={`call-fire-${station.id}`}
                                href={`tel:${station.phone.replace(/[^0-9+]/g, "")}`}
                                className="flex-1 sm:flex-none w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{t("common.call")} ({station.phone})</span>
                              </a>
                            ) : (
                              <a
                                href="tel:101"
                                className="flex-1 sm:flex-none w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{t("common.call")} 101</span>
                              </a>
                            )}

                            <a
                              id={`nav-fire-${station.id}`}
                              href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 sm:flex-none w-full sm:w-auto px-3.5 py-2.5 bg-[#18181B] hover:bg-zinc-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>{t("common.navigate")}</span>
                              <ExternalLink className="w-3 h-3 text-zinc-400" />
                            </a>

                            <button
                              id={`share-fire-${station.id}`}
                              onClick={() => handleShareLocation(station.name, station.phone)}
                              className="p-2.5 border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#71717A] hover:text-[#18181B] rounded-xl transition-colors"
                              title="Share fire station location"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTACTS */}
          {activeTab === "CONTACTS" && (
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E4E7] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#18181B]">
                    {t("emergency.tabContacts")} ({t("emergency.offlineMode")})
                  </h3>
                  <p className="text-xs text-[#71717A]">
                    {t("emergency.trustedDesc")}
                  </p>
                </div>
                <button
                  id="btn-add-quick-contact"
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddContact ? t("common.cancel") : t("emergency.addContact")}</span>
                </button>
              </div>

              {showAddContact && (
                <form onSubmit={handleAddQuickContact} className="p-4 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                        {t("contacts.fullName")}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="w-full bg-white border border-[#E4E4E7] rounded-xl p-2 text-xs text-[#18181B] font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                        {t("contacts.relationship")}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Spouse, Parent, Doctor"
                        value={newContactRelation}
                        onChange={(e) => setNewContactRelation(e.target.value)}
                        className="w-full bg-white border border-[#E4E4E7] rounded-xl p-2 text-xs text-[#18181B] font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1">
                        {t("contacts.phoneNumber")}
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        className="w-full bg-white border border-[#E4E4E7] rounded-xl p-2 text-xs text-[#18181B] font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddContact(false)}
                      className="px-3 py-1.5 text-xs text-[#71717A] hover:text-[#18181B]"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                    >
                      {t("contacts.addContact")}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#18181B]">
                          {contact.name}
                        </span>
                        <span className="text-xs text-[#71717A]">
                          ({contact.relationship})
                        </span>
                        {contact.isPrimary && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {t("contacts.primaryBadge")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-[#52525B]">
                        {contact.phone}
                      </span>
                    </div>

                    <a
                      href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{t("common.call")}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
