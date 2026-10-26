import { Hospital, FireService, EmergencyContact, SavedEmergencyIncident } from "../types";


export interface OfficialEmergencyNumber {
  number: string;
  service: string;
  category: "UNIFIED" | "AMBULANCE" | "FIRE" | "POLICE" | "SPECIALIZED";
  description: string;
  authority: string;
  source: string;
  lastVerified: string;
  primaryAction?: boolean;
}

export interface CachedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  isRealGps: boolean;
  isLastKnown?: boolean;
}

// Official verified national emergency numbers
export const OFFICIAL_EMERGENCY_NUMBERS: OfficialEmergencyNumber[] = [
  {
    number: "112",
    service: "Integrated National Emergency Helpline",
    category: "UNIFIED",
    description: "Single unified emergency response number for Police, Fire, and Medical Assistance across India & Global standards.",
    authority: "Ministry of Home Affairs & Dept of Telecommunications, Govt of India / Global 112 Standard",
    source: "https://112.gov.in (ERSS - Emergency Response Support System)",
    lastVerified: "2026-08-20",
    primaryAction: true,
  },
  {
    number: "102",
    service: "National Ambulance Service",
    category: "AMBULANCE",
    description: "Free 24/7 basic life support ambulance & emergency obstetric response transport service.",
    authority: "Ministry of Health & Family Welfare (MoHFW), Govt of India",
    source: "National Health Mission (NHM) Ambulance Directory",
    lastVerified: "2026-08-20",
    primaryAction: true,
  },
  {
    number: "108",
    service: "Emergency Disaster & Medical Response Ambulance",
    category: "AMBULANCE",
    description: "Advanced critical care ambulance service for highway collisions, trauma, and acute cardiac emergencies.",
    authority: "State Emergency Medical Services & EMRI",
    source: "National Health Mission / EMRI Official Registry",
    lastVerified: "2026-08-20",
  },
  {
    number: "101",
    service: "National Fire Service & Rescue Helpline",
    category: "FIRE",
    description: "Municipal fire brigade dispatch, structural rescue, and hazardous smoke control.",
    authority: "Directorate General of Fire Services, Civil Defence & Home Guards",
    source: "Ministry of Home Affairs (MHA) Directorate of Fire Services",
    lastVerified: "2026-08-20",
    primaryAction: true,
  },
  {
    number: "100",
    service: "National Police Control Room Helpline",
    category: "POLICE",
    description: "Police control room dispatch, public security protection, and immediate law enforcement response.",
    authority: "National Police Service / State Police Headquarters",
    source: "Bureau of Police Research and Development (BPR&D)",
    lastVerified: "2026-08-20",
    primaryAction: true,
  },
  {
    number: "1091",
    service: "Women Safety & Helpline",
    category: "SPECIALIZED",
    description: "24/7 emergency assistance for women in distress, harassment, or physical danger.",
    authority: "Ministry of Women and Child Development",
    source: "National Commission for Women (NCW)",
    lastVerified: "2026-08-20",
  },
  {
    number: "1098",
    service: "Child Helpline (CHILDLINE)",
    category: "SPECIALIZED",
    description: "Emergency support, care, and protection for children in distress or facing danger.",
    authority: "Ministry of Women and Child Development",
    source: "Childline India Foundation Registry",
    lastVerified: "2026-08-20",
  },
  {
    number: "1070",
    service: "National Disaster Management Authority (NDMA)",
    category: "SPECIALIZED",
    description: "Central emergency helpline for severe floods, earthquakes, landslides, and major natural disasters.",
    authority: "National Disaster Management Authority (NDMA), Govt of India",
    source: "NDMA Official Disaster Directory",
    lastVerified: "2026-08-20",
  },
];

// Bundled offline hospitals dataset (available when no network exists)
export const BUNDLED_OFFLINE_HOSPITALS: Hospital[] = [
  // Pune & Hinjawadi Region (Reference coords: 18.6111, 73.71857)
  {
    id: "hosp-pune-1",
    name: "Ruby Hall Clinic (Hinjawadi)",
    category: "PRIVATE",
    address: "Rajiv Gandhi Infotech Park, Phase 1, Hinjawadi, Pune, Maharashtra 411057",
    latitude: 18.5913,
    longitude: 73.7389,
    phone: "+91-20-66455100",
    ambulancePhone: "+91-20-66455108",
    emergencyDepartment: "Level 1 Trauma Center, 24/7 ICU & Cardiac Emergency",
    source: "DEMO DATA - Maharashtra Directorate of Health Services",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-pune-2",
    name: "Hinjawadi Government Rural Hospital",
    category: "GOVERNMENT",
    address: "Main Road, Hinjawadi Gaon, Mulshi Taluka, Pune, Maharashtra 411057",
    latitude: 18.5962,
    longitude: 73.7224,
    phone: "+91-20-22934102",
    ambulancePhone: "108",
    emergencyDepartment: "24/7 Emergency Medical Officer & Trauma Stabilization",
    source: "DEMO DATA - District Health Office, Pune",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-pune-3",
    name: "Surya Mother & Child Super Specialty Hospital",
    category: "PRIVATE",
    address: "Survey No. 8, Bhujbal Chowk, Wakad Flyover, Wakad, Pune 411057",
    latitude: 18.5985,
    longitude: 73.7634,
    phone: "+91-20-67915555",
    ambulancePhone: "+91-20-67915500",
    emergencyDepartment: "24/7 Pediatric & Adult Emergency Department",
    source: "DEMO DATA - PMC Health Registry",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-pune-4",
    name: "Aundh District Civil Hospital (Govt)",
    category: "GOVERNMENT",
    address: "Near Bremen Chowk, Aundh, Pune, Maharashtra 411027",
    latitude: 18.5626,
    longitude: 73.8077,
    phone: "+91-20-25880436",
    ambulancePhone: "102",
    emergencyDepartment: "Full Government District Trauma Unit, Free Emergency Ward",
    source: "DEMO DATA - Directorate of Health Services (DHS), Maharashtra",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-pune-5",
    name: "Aditya Birla Memorial Hospital",
    category: "PRIVATE",
    address: "Aditya Birla Hospital Marg, Thergaon, Chinchwad, Pune 411033",
    latitude: 18.6234,
    longitude: 73.7789,
    phone: "+91-20-30717500",
    ambulancePhone: "+91-20-30717777",
    emergencyDepartment: "JCI & NABH Accredited Multi-Speciality Emergency & Trauma Center",
    source: "DEMO DATA - National Accreditation Board for Hospitals",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-pune-6",
    name: "Yashwantrao Chavan Memorial Hospital (YCMH Govt)",
    category: "GOVERNMENT",
    address: "Sant Tukaram Nagar, Pimpri, Pune, Maharashtra 411018",
    latitude: 18.6288,
    longitude: 73.8184,
    phone: "+91-20-27422501",
    ambulancePhone: "108",
    emergencyDepartment: "Major Government Tertiary Trauma Center & ICU",
    source: "DEMO DATA - PCMC Health Department",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-pune-7",
    name: "Jupiter Hospital Pune",
    category: "PRIVATE",
    address: "Near Balewadi Sports Complex, Baner-Mahalunge Road, Baner, Pune 411045",
    latitude: 18.5682,
    longitude: 73.7651,
    phone: "+91-20-27992799",
    ambulancePhone: "+91-20-27992700",
    emergencyDepartment: "Comprehensive Stroke, Cardiac & Multi-Trauma Response",
    source: "DEMO DATA - NABH Accredited Hospital Directory",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-pune-8",
    name: "Sassoon General Hospital & BJ Medical College (Govt)",
    category: "GOVERNMENT",
    address: "Station Road, Near Pune Railway Station, Pune, Maharashtra 411001",
    latitude: 18.5284,
    longitude: 73.8743,
    phone: "+91-20-26128000",
    ambulancePhone: "102",
    emergencyDepartment: "Government Apex Trauma Care Center & Burns Unit",
    source: "DEMO DATA - Medical Education & Drugs Dept, Maharashtra",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },

  // Mumbai Region (19.0033, 72.8427)
  {
    id: "hosp-mum-1",
    name: "KEM Hospital & Seth GS Medical College (Govt)",
    category: "GOVERNMENT",
    address: "Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012",
    latitude: 19.0033,
    longitude: 72.8427,
    phone: "+91-22-24107000",
    ambulancePhone: "108",
    emergencyDepartment: "24/7 Apex Trauma & Disaster Response Center",
    source: "DEMO DATA - Brihanmumbai Municipal Corporation (BMC)",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-mum-2",
    name: "Tata Memorial Hospital & Research Centre",
    category: "GOVERNMENT",
    address: "Dr. Ernest Borges Rd, Parel East, Mumbai 400012",
    latitude: 19.0062,
    longitude: 72.8431,
    phone: "+91-22-24177000",
    ambulancePhone: "+91-22-24177112",
    emergencyDepartment: "24/7 Acute Oncology & Emergency Care",
    source: "DEMO DATA - Department of Atomic Energy, Govt of India",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-mum-3",
    name: "Lilavati Hospital & Research Centre",
    category: "PRIVATE",
    address: "A-791, Bandra Reclamation, Bandra West, Mumbai 400050",
    latitude: 19.0514,
    longitude: 72.8295,
    phone: "+91-22-26751000",
    ambulancePhone: "+91-22-26568064",
    emergencyDepartment: "Advanced Level 1 Emergency & Cardiac Catheterization",
    source: "DEMO DATA - Lilavati Hospital Emergency Directorate",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },

  // Global Metros (SF, NYC, London, Tokyo)
  {
    id: "hosp-sf-1",
    name: "Zuckerberg San Francisco General Hospital and Trauma Center",
    category: "GOVERNMENT",
    address: "1001 Potrero Ave, San Francisco, CA 94110",
    latitude: 37.7558,
    longitude: -122.4045,
    phone: "+1-628-206-8000",
    ambulancePhone: "911",
    emergencyDepartment: "Only Level 1 Trauma Center in San Francisco",
    source: "DEMO DATA - SF Department of Public Health",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-nyc-1",
    name: "Bellevue Hospital Center (NYC Health + Hospitals)",
    category: "GOVERNMENT",
    address: "462 1st Ave, New York, NY 10016",
    latitude: 40.7392,
    longitude: -73.9754,
    phone: "+1-212-562-4141",
    ambulancePhone: "911",
    emergencyDepartment: "Level 1 Adult & Pediatric Trauma Center",
    source: "DEMO DATA - NYC Health + Hospitals",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-lon-1",
    name: "St Thomas' Hospital (NHS Trust)",
    category: "GOVERNMENT",
    address: "Westminster Bridge Rd, London SE1 7EH, UK",
    latitude: 51.4988,
    longitude: -0.1191,
    phone: "+44-20-7188-7188",
    ambulancePhone: "999",
    emergencyDepartment: "Major Accident & Emergency (A&E) Unit",
    source: "DEMO DATA - NHS England Directory",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "hosp-tokyo-1",
    name: "Tokyo Metropolitan Hiroo Hospital",
    category: "GOVERNMENT",
    address: "2 Chome-34-10 Ebisu, Shibuya City, Tokyo 150-0013, Japan",
    latitude: 35.6472,
    longitude: 139.7183,
    phone: "+81-3-3444-1181",
    ambulancePhone: "119",
    emergencyDepartment: "Designated Critical Care Medical Center",
    source: "DEMO DATA - Tokyo Metropolitan Bureau of Public Health",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
];

// Bundled offline fire services dataset
export const BUNDLED_OFFLINE_FIRE_SERVICES: FireService[] = [
  {
    id: "fire-pune-1",
    name: "Hinjawadi MIDC Fire Station",
    address: "Phase 1 Road, Near Infosys Circle, Hinjawadi Rajiv Gandhi Infotech Park, Pune 411057",
    latitude: 18.5918,
    longitude: 73.7314,
    phone: "+91-20-22934101",
    emergencyContact: "101",
    source: "DEMO DATA - MIDC Fire Department, Maharashtra",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "fire-pune-2",
    name: "Wakad Fire Brigade Station",
    address: "Dange Chowk - Wakad Road, Wakad, Pune, Maharashtra 411057",
    latitude: 18.6012,
    longitude: 73.7621,
    phone: "+91-20-27271101",
    emergencyContact: "101",
    source: "DEMO DATA - PCMC Fire & Rescue Services",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "fire-pune-3",
    name: "Pimpri Central Fire Station",
    address: "Old Mumbai-Pune Highway, Pimpri Colony, Pimpri-Chinchwad, Pune 411018",
    latitude: 18.6279,
    longitude: 73.8012,
    phone: "+91-20-27422101",
    emergencyContact: "101",
    source: "DEMO DATA - PCMC Directorate of Fire Services",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "fire-pune-4",
    name: "Aundh Sub-Fire Station",
    address: "DP Road, Aundh, Pune, Maharashtra 411007",
    latitude: 18.5582,
    longitude: 73.8052,
    phone: "+91-20-25881101",
    emergencyContact: "101",
    source: "DEMO DATA - Pune Municipal Corporation (PMC) Fire Brigade",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "fire-pune-5",
    name: "Central Fire Brigade HQ Pune (Bhawani Peth)",
    address: "Bhawani Peth, Near Timba Hospital, Pune, Maharashtra 411042",
    latitude: 18.5085,
    longitude: 73.8687,
    phone: "+91-20-26451707",
    emergencyContact: "101",
    source: "DEMO DATA - PMC Fire Headquarters",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "fire-mum-1",
    name: "Byculla Central Fire Brigade Headquarters",
    address: "Bapurao Jagtap Marg, Byculla West, Mumbai, Maharashtra 400008",
    latitude: 18.9754,
    longitude: 72.8291,
    phone: "+91-22-23076111",
    emergencyContact: "101",
    source: "DEMO DATA - Mumbai Fire Brigade (BMC)",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
  {
    id: "fire-sf-1",
    name: "San Francisco Fire Department Station 1",
    address: "935 Folsom St, San Francisco, CA 94107",
    latitude: 37.7801,
    longitude: -122.4048,
    phone: "+1-415-558-3200",
    emergencyContact: "911",
    source: "DEMO DATA - SFFD Headquarters",
    lastVerified: "2026-08-15",
    distanceKm: 0,
  },
];

// Offline Storage Keys
const STORAGE_KEYS = {
  LAST_LOCATION: "resqai_last_location",
  OFFLINE_CONTACTS: "resqai_offline_contacts",
  CACHED_HOSPITALS: "resqai_cached_hospitals",
  CACHED_FIRE_SERVICES: "resqai_cached_fire_services",
  OFFLINE_INCIDENTS: "resqai_offline_incidents",
  LAST_CACHE_SYNC: "resqai_last_cache_sync",
};

/**
 * Calculates Haversine distance in kilometers between two GPS coordinate pairs
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Offline Repository and Manager
 */
export class OfflineStorageManager {
  // --- Offline Incidents ---
  public static getOfflineIncidents(): SavedEmergencyIncident[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_INCIDENTS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed reading offline incidents:", e);
    }
    return [];
  }

  public static saveOfflineIncident(incident: {
    type: string;
    latitude: number;
    longitude: number;
    address?: string;
    notes?: string;
    actionPlan?: string[];
    isUnconfirmedCrash?: boolean;
  }): SavedEmergencyIncident {
    const existing = this.getOfflineIncidents();
    const newIncident: SavedEmergencyIncident = {
      incidentId: `offline-inc-${Date.now()}`,
      type: incident.type,
      latitude: incident.latitude,
      longitude: incident.longitude,
      address: incident.address || `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`,
      notes: incident.notes || "",
      actionPlan: incident.actionPlan || [],
      timestamp: new Date().toISOString(),
      isOfflineSaved: true,
      isUnconfirmedCrash: incident.isUnconfirmedCrash,
    };


    const updated = [newIncident, ...existing];
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_INCIDENTS, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed saving offline incident:", e);
    }
    return newIncident;
  }

  // --- Location Cache ---

  public static saveLastLocation(loc: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    isRealGps: boolean;
  }): void {
    if (typeof window === "undefined") return;
    try {
      const payload: CachedLocation = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy ?? null,
        timestamp: new Date().toLocaleTimeString(),
        isRealGps: loc.isRealGps,
        isLastKnown: true,
      };
      localStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(payload));
    } catch (e) {
      console.warn("Could not cache location to localStorage:", e);
    }
  }

  public static getLastLocation(): CachedLocation | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Failed reading cached location:", e);
    }
    // Default reference fallback (Pune / Hinjawadi)
    return {
      latitude: 18.6111,
      longitude: 73.71857,
      accuracy: 20,
      timestamp: "Default Seed",
      isRealGps: false,
      isLastKnown: true,
    };
  }

  // --- Offline Emergency Contacts ---
  public static getOfflineContacts(): EmergencyContact[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_CONTACTS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed reading offline contacts:", e);
    }
    // Default initial offline contact preset
    const defaultContact: EmergencyContact = {
      id: "offline-contact-1",
      userId: "local-user",
      name: "Emergency Helpline (112)",
      relationship: "National Service",
      phone: "112",
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return [defaultContact];
  }

  public static saveOfflineContact(contact: {
    name: string;
    relationship: string;
    phone: string;
    isPrimary?: boolean;
  }): EmergencyContact {
    const existing = this.getOfflineContacts();
    const newContact: EmergencyContact = {
      id: `local-contact-${Date.now()}`,
      userId: "local-user",
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      isPrimary: contact.isPrimary ?? (existing.length === 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updated = [newContact, ...existing];
    if (newContact.isPrimary) {
      updated = updated.map((c) => ({
        ...c,
        isPrimary: c.id === newContact.id,
      }));
    }

    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_CONTACTS, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed saving offline contact:", e);
    }
    return newContact;
  }

  public static deleteOfflineContact(id: string): void {
    const existing = this.getOfflineContacts();
    const filtered = existing.filter((c) => c.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_CONTACTS, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Failed deleting offline contact:", e);
    }
  }

  // --- Offline Hospital Search with Haversine Distance ---
  public static getOfflineHospitals(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    category?: "ALL" | "GOVERNMENT" | "PRIVATE";
  }): { hospitals: Hospital[]; nearestAvailableDistanceKm: number | null } {
    let allHospitals = BUNDLED_OFFLINE_HOSPITALS;

    // Check if we have dynamically cached hospitals from previous online sessions
    if (typeof window !== "undefined") {
      try {
        const cachedRaw = localStorage.getItem(STORAGE_KEYS.CACHED_HOSPITALS);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0) {
            // Merge unique by id
            const existingIds = new Set(allHospitals.map((h) => h.id));
            const merged = [...allHospitals];
            for (const h of cached) {
              if (!existingIds.has(h.id)) {
                merged.push(h);
                existingIds.add(h.id);
              }
            }
            allHospitals = merged;
          }
        }
      } catch (e) {
        console.warn("Reading dynamic hospital cache failed, using bundled data:", e);
      }
    }

    // Filter by category
    const cat = params.category || "ALL";
    const categoryFiltered = cat === "ALL"
      ? allHospitals
      : allHospitals.filter((h) => h.category === cat);

    // Calculate Haversine distance
    const withDistance = categoryFiltered.map((h) => {
      const dist = calculateHaversineKm(params.latitude, params.longitude, h.latitude, h.longitude);
      return {
        ...h,
        distanceKm: dist,
        isNearest: false,
      };
    });

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const radius = params.radiusKm || 25;
    const withinRadius = withDistance.filter((h) => h.distanceKm <= radius);

    if (withinRadius.length > 0) {
      withinRadius[0].isNearest = true;
    }

    return {
      hospitals: withinRadius.length > 0 ? withinRadius : withDistance.slice(0, 5),
      nearestAvailableDistanceKm: withDistance[0]?.distanceKm ?? null,
    };
  }

  // --- Offline Fire Service Search ---
  public static getOfflineFireServices(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
  }): { fireServices: FireService[]; nearestAvailableDistanceKm: number | null } {
    let allFireServices = BUNDLED_OFFLINE_FIRE_SERVICES;

    if (typeof window !== "undefined") {
      try {
        const cachedRaw = localStorage.getItem(STORAGE_KEYS.CACHED_FIRE_SERVICES);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0) {
            const existingIds = new Set(allFireServices.map((f) => f.id));
            const merged = [...allFireServices];
            for (const f of cached) {
              if (!existingIds.has(f.id)) {
                merged.push(f);
                existingIds.add(f.id);
              }
            }
            allFireServices = merged;
          }
        }
      } catch (e) {
        console.warn("Reading dynamic fire service cache failed, using bundled data:", e);
      }
    }

    const withDistance = allFireServices.map((f) => {
      const dist = calculateHaversineKm(params.latitude, params.longitude, f.latitude, f.longitude);
      return {
        ...f,
        distanceKm: dist,
        isNearest: false,
      };
    });

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const radius = params.radiusKm || 25;
    const withinRadius = withDistance.filter((f) => f.distanceKm <= radius);

    if (withinRadius.length > 0) {
      withinRadius[0].isNearest = true;
    }

    return {
      fireServices: withinRadius.length > 0 ? withinRadius : withDistance.slice(0, 5),
      nearestAvailableDistanceKm: withDistance[0]?.distanceKm ?? null,
    };
  }

  // --- Cache Sync ---
  public static cacheOnlineHospitals(hospitals: Hospital[]): void {
    if (typeof window === "undefined" || !Array.isArray(hospitals)) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_HOSPITALS, JSON.stringify(hospitals));
      localStorage.setItem(STORAGE_KEYS.LAST_CACHE_SYNC, new Date().toISOString());
    } catch (e) {
      console.warn("Failed caching online hospitals:", e);
    }
  }

  public static cacheOnlineFireServices(fireServices: FireService[]): void {
    if (typeof window === "undefined" || !Array.isArray(fireServices)) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_FIRE_SERVICES, JSON.stringify(fireServices));
      localStorage.setItem(STORAGE_KEYS.LAST_CACHE_SYNC, new Date().toISOString());
    } catch (e) {
      console.warn("Failed caching online fire services:", e);
    }
  }

  public static getLastCacheSync(): string {
    if (typeof window === "undefined") return "Bundled";
    const dateStr = localStorage.getItem(STORAGE_KEYS.LAST_CACHE_SYNC);
    if (!dateStr) return "Bundled Offline Package";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }

  public static clearOfflineIncidents(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_INCIDENTS);
      localStorage.removeItem(STORAGE_KEYS.CACHED_HOSPITALS);
      localStorage.removeItem(STORAGE_KEYS.CACHED_FIRE_SERVICES);
    } catch (e) {
      console.warn("Failed clearing offline incidents:", e);
    }
  }
}

export const offlineStorage = OfflineStorageManager;
