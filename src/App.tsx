/**
 * ResQAI Emergency Response Coordination Frontend
 */

import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SafetyBanner } from "./components/SafetyBanner";
import { EmergencyWizard } from "./components/EmergencyWizard";
import { LiveIncidentsView } from "./components/LiveIncidentsView";
import { EmergencyCorridorView } from "./components/EmergencyCorridorView";
import { IncidentHistory } from "./components/IncidentHistory";
import { ContactsManager } from "./components/ContactsManager";
import { SettingsView } from "./components/SettingsView";
import { ApiDocs } from "./components/ApiDocs";
import { AuthModal } from "./components/AuthModal";
import { AccidentPromptModal } from "./components/AccidentPromptModal";
import { NearbyAlertBanner } from "./components/NearbyAlertBanner";
import { api } from "./services/api";
import { accidentDetection } from "./services/accidentDetectionService";
import { User, Incident, NearbyIncident, AlertSettings } from "./types";
import { I18nProvider, useTranslation } from "./i18n";

function AppContent() {
  const [activeTab, setActiveTab] = useState<
    "emergency" | "live" | "corridor" | "history" | "contacts" | "api" | "settings"
  >("emergency");
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const { t } = useTranslation();

  // Accident Detection state
  const [accidentModalOpen, setAccidentModalOpen] = useState(false);
  const [impactDetails, setImpactDetails] = useState<{
    magnitude: number;
    timestamp: number;
    isSimulated?: boolean;
  } | null>(null);

  // User Coordinates & Alert Settings
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 18.5204,
    longitude: 73.8567,
  });

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
    };
  });

  // Initialize: Health check, authenticate session, start motion monitoring
  useEffect(() => {
    // 1. Check backend health
    api.getHealth().then((res) => {
      setBackendHealthy(res.success);
    }).catch(() => {
      setBackendHealthy(false);
    });

    // 2. Load user session if token exists
    if (api.isAuthenticated()) {
      api.getMe().then((res) => {
        if (res.success && res.data?.user) {
          setUser(res.data.user);
        } else {
          api.setToken(null);
          setUser(null);
        }
      });
    }

    // 3. Obtain user GPS
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    // 4. Start Accident Detection Service
    accidentDetection.start(alertSettings.accidentDetectionEnabled);

    const unsubImpact = accidentDetection.onImpactDetected((details) => {
      setImpactDetails(details);
      setAccidentModalOpen(true);
    });

    return () => {
      unsubImpact();
      accidentDetection.stop();
    };
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleIncidentSaved = (_incident: Incident) => {
    // Optional notification or badge update
  };

  const handleSimulateImpact = () => {
    setImpactDetails({
      magnitude: 31.8,
      timestamp: Date.now(),
      isSimulated: true,
    });
    setAccidentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-[#18181B] flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Hackathon Safety Notice */}
      <SafetyBanner />

      {/* Nearby Alert Banner / Push Notification Toast */}
      <NearbyAlertBanner
        settings={alertSettings}
        userCoords={userCoords}
        onViewIncident={(_inc: NearbyIncident) => {
          setActiveTab("live");
        }}
      />

      {/* Main Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        backendHealthy={backendHealthy}
      />

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "emergency" && (
          <EmergencyWizard
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onIncidentSaved={handleIncidentSaved}
            onNavigateToLive={() => setActiveTab("live")}
            onNavigateToCorridor={() => setActiveTab("corridor")}
            onSimulateAccidentImpact={handleSimulateImpact}
          />
        )}

        {activeTab === "live" && (
          <LiveIncidentsView
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateToCorridor={() => setActiveTab("corridor")}
          />
        )}

        {activeTab === "corridor" && (
          <EmergencyCorridorView
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateToIncident={(_id) => setActiveTab("live")}
          />
        )}

        {activeTab === "history" && (
          <IncidentHistory
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === "contacts" && (
          <ContactsManager
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onUserUpdated={(updated) => setUser(updated)}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView onSimulateImpact={handleSimulateImpact} />
        )}

        {activeTab === "api" && <ApiDocs />}
      </main>

      {/* Full-Screen Accident Emergency Prompt Modal */}
      <AccidentPromptModal
        isOpen={accidentModalOpen}
        onClose={() => setAccidentModalOpen(false)}
        impactDetails={impactDetails}
        user={user}
        onIncidentCreated={(_incident) => {
          // If created, can navigate or notify
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />

      {/* Footer */}
      <footer className="border-t border-[#E4E4E7] bg-white py-5 text-xs text-[#71717A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#18181B]">{t("common.appName")} Systems</span>
            <span>•</span>
            <span>Emergency Response &amp; Resource Routing Engine</span>
          </div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#A1A1AA]">
            Node.js • Express • Prisma • SQLite • 13 Indian Languages
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}


