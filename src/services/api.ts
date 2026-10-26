import {
  User,
  EmergencyContact,
  Incident,
  EmergencyResource,
  EmergencyAnalysis,
  IncidentStatus,
  ResourceType,
  ShareData,
  Hospital,
  FireService,
  NearbyHospitalsResponse,
  NearbyFireServicesResponse,
  SavedEmergencyIncident,
  NearbyIncident,
  AlertSettings,
  PossibleAccidentPayload,
  IncidentVerification,
  EmergencyIncidentStatus,
  EmergencyVehicle,
  EmergencyVehicleType,
  EmergencyVehicleStatus,
  EmergencyCorridor,
  CorridorJunction,
  RouteRecommendation,
  DispatchEvent,
  SimulationStepResponse,
} from "../types";


const TOKEN_KEY = "resqai_auth_token";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      let responseData: any;
      try {
        responseData = await response.json();
      } catch {
        responseData = {
          success: false,
          message: `Network or server response format error (${response.status})`,
        };
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
        }
        return {
          success: false,
          message: responseData.message || `Request failed with status ${response.status}`,
          errors: responseData.errors,
        };
      }

      return responseData;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to communicate with RakshAI backend server.",
      };
    }
  }

  // --- Health Check ---
  public async getHealth(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>("/api/health", { method: "GET" });
  }

  // --- Auth APIs ---
  public async signup(data: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
    countryCode?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const res = await this.request<{ user: User; token: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  public async login(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const res = await this.request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  public async getMe(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>("/api/auth/me", { method: "GET" });
  }

  public async logout(): Promise<ApiResponse> {
    const res = await this.request("/api/auth/logout", { method: "POST" });
    this.setToken(null);
    return res;
  }

  // --- User Profile APIs ---
  public async updateProfile(data: {
    name?: string;
    email?: string;
    phoneNumber?: string | null;
    countryCode?: string | null;
  }): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // --- Emergency Contacts APIs ---
  public async getContacts(): Promise<ApiResponse<{ contacts: EmergencyContact[] }>> {
    return this.request<{ contacts: EmergencyContact[] }>("/api/contacts", {
      method: "GET",
    });
  }

  public async createContact(data: {
    name: string;
    relationship: string;
    phone: string;
    isPrimary?: boolean;
  }): Promise<ApiResponse<{ contact: EmergencyContact }>> {
    return this.request<{ contact: EmergencyContact }>("/api/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async updateContact(
    id: string,
    data: {
      name?: string;
      relationship?: string;
      phone?: string;
      isPrimary?: boolean;
    }
  ): Promise<ApiResponse<{ contact: EmergencyContact }>> {
    return this.request<{ contact: EmergencyContact }>(`/api/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  public async deleteContact(id: string): Promise<ApiResponse> {
    return this.request(`/api/contacts/${id}`, {
      method: "DELETE",
    });
  }

  public async setPrimaryContact(id: string): Promise<ApiResponse<{ contact: EmergencyContact }>> {
    return this.request<{ contact: EmergencyContact }>(`/api/contacts/${id}/set-primary`, {
      method: "POST",
    });
  }

  // --- Incidents APIs ---
  public async createIncident(data: {
    incidentType: string;
    description: string;
    peopleAffected: number;
    vehiclesInvolved?: number;
    anyoneTrapped?: boolean;
    smokeOrFire?: boolean;
    latitude: number;
    longitude: number;
    locationAccuracy?: number | null;
  }): Promise<ApiResponse<{ incident: Incident }>> {
    return this.request<{ incident: Incident }>("/api/incidents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getIncidents(params?: {
    search?: string;
    type?: string;
    priority?: string;
    status?: string;
  }): Promise<ApiResponse<{ incidents: Incident[]; total: number }>> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.type && params.type !== "ALL") query.set("type", params.type);
    if (params?.priority && params.priority !== "ALL") query.set("priority", params.priority);
    if (params?.status && params.status !== "ALL") query.set("status", params.status);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return this.request<{ incidents: Incident[]; total: number }>(`/api/incidents${queryString}`, {
      method: "GET",
    });
  }

  public async getIncidentById(id: string): Promise<ApiResponse<{ incident: Incident }>> {
    return this.request<{ incident: Incident }>(`/api/incidents/${id}`, {
      method: "GET",
    });
  }

  public async updateIncidentStatus(
    id: string,
    status: IncidentStatus
  ): Promise<ApiResponse<{ incident: Incident }>> {
    return this.request<{ incident: Incident }>(`/api/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  public async deleteIncident(id: string): Promise<ApiResponse> {
    return this.request(`/api/incidents/${id}`, {
      method: "DELETE",
    });
  }

  public async getIncidentShareData(id: string): Promise<ApiResponse<{ shareData: ShareData }>> {
    return this.request<{ shareData: ShareData }>(`/api/incidents/${id}/share-data`, {
      method: "POST",
    });
  }

  // --- Emergency Resources & Analysis APIs ---
  public async getNearbyResources(params: {
    latitude: number;
    longitude: number;
    type?: ResourceType | "ALL";
    limit?: number;
  }): Promise<
    ApiResponse<{
      origin: { latitude: number; longitude: number };
      count: number;
      resources: EmergencyResource[];
    }>
  > {
    const query = new URLSearchParams();
    query.set("latitude", params.latitude.toString());
    query.set("longitude", params.longitude.toString());
    if (params.type && params.type !== "ALL") {
      query.set("type", params.type);
    }
    if (params.limit) {
      query.set("limit", params.limit.toString());
    }

    return this.request(`/api/resources/nearby?${query.toString()}`, {
      method: "GET",
    });
  }

  // --- Verified Emergency Services Search APIs ---
  public async getNearbyHospitals(params: {
    latitude: number;
    longitude: number;
    type?: "ALL" | "GOVERNMENT" | "PRIVATE";
    radiusKm?: number;
    limit?: number;
  }): Promise<ApiResponse<NearbyHospitalsResponse>> {
    const query = new URLSearchParams();
    query.set("latitude", params.latitude.toString());
    query.set("longitude", params.longitude.toString());
    if (params.type && params.type !== "ALL") {
      query.set("type", params.type);
    }
    if (params.radiusKm) {
      query.set("radiusKm", params.radiusKm.toString());
    }
    if (params.limit) {
      query.set("limit", params.limit.toString());
    }

    const res = await this.request<any>(
      `/api/emergency/hospitals/nearby?${query.toString()}`,
      { method: "GET" }
    );

    if (res.success && res.data) {
      // Normalize whether backend returned array or nested structure
      const hospitalList = Array.isArray(res.data)
        ? res.data
        : res.data.hospitals || [];
      const normalized: NearbyHospitalsResponse = {
        origin: res.data.origin || { latitude: params.latitude, longitude: params.longitude },
        filter: res.data.filter || params.type || "ALL",
        radiusKm: res.data.radiusKm || params.radiusKm || 25,
        count: hospitalList.length,
        totalFound: res.data.totalFound ?? hospitalList.length,
        nearestHospital: hospitalList[0] || null,
        nearestAvailableDistanceKm: res.data.nearestAvailableDistanceKm ?? null,
        hospitals: hospitalList,
      };
      return { success: true, data: normalized };
    }

    return res;
  }

  public async getNearbyFireServices(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<ApiResponse<NearbyFireServicesResponse>> {
    const query = new URLSearchParams();
    query.set("latitude", params.latitude.toString());
    query.set("longitude", params.longitude.toString());
    if (params.radiusKm) {
      query.set("radiusKm", params.radiusKm.toString());
    }
    if (params.limit) {
      query.set("limit", params.limit.toString());
    }

    const res = await this.request<any>(
      `/api/emergency/fire-services/nearby?${query.toString()}`,
      { method: "GET" }
    );

    if (res.success && res.data) {
      const fireList = Array.isArray(res.data)
        ? res.data
        : res.data.fireServices || [];
      const normalized: NearbyFireServicesResponse = {
        origin: res.data.origin || { latitude: params.latitude, longitude: params.longitude },
        radiusKm: res.data.radiusKm || params.radiusKm || 25,
        count: fireList.length,
        totalFound: res.data.totalFound ?? fireList.length,
        nearestFireService: fireList[0] || null,
        nearestAvailableDistanceKm: res.data.nearestAvailableDistanceKm ?? null,
        fireServices: fireList,
      };
      return { success: true, data: normalized };
    }

    return res;
  }

  public async saveEmergencyIncident(data: {
    type: string;
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    description?: string;
    nearestHospitalId?: string | null;
    nearestFireServiceId?: string | null;
  }): Promise<ApiResponse<SavedEmergencyIncident>> {
    return this.request<SavedEmergencyIncident>("/api/emergency/incidents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async analyzeEmergency(data: {

    incidentType: string;
    description: string;
    peopleAffected: number;
    vehiclesInvolved?: number;
    anyoneTrapped?: boolean;
    smokeOrFire?: boolean;
  }): Promise<ApiResponse<EmergencyAnalysis>> {
    return this.request<EmergencyAnalysis>("/api/emergency/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Workflow APIs ---
  public async startEmergencyWorkflow(location?: {
    latitude: number;
    longitude: number;
    locationAccuracy?: number | null;
  }): Promise<
    ApiResponse<{
      emergencyId: string;
      timestamp: string;
      userId: string;
      status: string;
    }>
  > {
    return this.request("/api/emergency/start", {
      method: "POST",
      body: JSON.stringify(location || {}),
    });
  }

  public async analyzeEmergencyWorkflow(
    workflowId: string,
    data: any
  ): Promise<ApiResponse<{ workflow: any; analysis: EmergencyAnalysis }>> {
    return this.request(`/api/emergency/${workflowId}/analyze`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  public async getWorkflowResources(
    workflowId: string,
    coords?: { latitude: number; longitude: number }
  ): Promise<
    ApiResponse<{
      workflowId: string;
      recommendedTypes: string[];
      resources: EmergencyResource[];
    }>
  > {
    return this.request(`/api/emergency/${workflowId}/resources`, {
      method: "POST",
      body: JSON.stringify(coords || {}),
    });
  }

  public async completeEmergencyWorkflow(
    workflowId: string
  ): Promise<ApiResponse<{ incident: Incident }>> {
    return this.request(`/api/emergency/${workflowId}/complete`, {
      method: "POST",
    });
  }

  // ========================================================
  // 🚨 SMART ACCIDENT DETECTION & NEARBY ALERT APIS
  // ========================================================

  /**
   * POST /api/incidents/possible-accident
   * Creates a sensor-detected or manual possible road accident incident
   */
  public async createPossibleAccident(
    data: PossibleAccidentPayload
  ): Promise<
    ApiResponse<{
      incident: NearbyIncident & {
        nearestHospital?: Hospital | null;
        nearestFireService?: FireService | null;
        warning?: string;
      };
    }>
  > {
    return this.request("/api/incidents/possible-accident", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /api/incidents/report
   * Report an emergency incident with auto GPS, multi-report grouping, and evidence photo
   */
  public async reportAccidentEmergency(
    data: any
  ): Promise<ApiResponse<{ incident: NearbyIncident }>> {
    return this.request("/api/incidents/report", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /api/incidents/ai-classify
   * AI Incident Classification & Decision Engine
   */
  public async classifyIncidentWithAI(
    data: { description?: string; reportedType?: string }
  ): Promise<ApiResponse<{ analysis: any }>> {
    return this.request("/api/incidents/ai-classify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /api/incidents/:id/evidence
   * Uploads photo evidence with privacy shield option
   */
  public async addIncidentEvidence(
    incidentId: string,
    data: {
      imageUrl: string;
      caption?: string;
      approxLatitude?: number | null;
      approxLongitude?: number | null;
      isPrivacyBlurred?: boolean;
    }
  ): Promise<ApiResponse<{ evidence: any; incident: NearbyIncident }>> {
    return this.request(`/api/incidents/${incidentId}/evidence`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /api/incidents/simulate
   * Safe hackathon demo simulation
   */
  public async simulateEmergencyDemo(
    data: { scenario: string; latitude?: number; longitude?: number }
  ): Promise<ApiResponse<{ incident: NearbyIncident }>> {
    return this.request("/api/incidents/simulate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /api/incidents/:id/confirm
   * Confirms emergency assistance is required for an incident
   */
  public async confirmIncident(
    id: string
  ): Promise<ApiResponse<{ incident: NearbyIncident }>> {
    return this.request(`/api/incidents/${id}/confirm`, {
      method: "POST",
    });
  }

  /**
   * POST /api/incidents/:id/cancel
   * Cancels a possible accident alert (user pressed I'M OK)
   */
  public async cancelIncident(
    id: string
  ): Promise<ApiResponse<{ incident: NearbyIncident }>> {
    return this.request(`/api/incidents/${id}/cancel`, {
      method: "POST",
    });
  }

  /**
   * GET /api/incidents/nearby
   * Fetches active emergency incidents within user's configured radius
   */
  public async getNearbyIncidents(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    type?: string;
    status?: string;
    limit?: number;
  }): Promise<
    ApiResponse<{
      incidents: NearbyIncident[];
      totalFound: number;
      radiusKm: number;
      origin: { latitude: number; longitude: number };
    }>
  > {
    const query = new URLSearchParams();
    query.set("latitude", String(params.latitude));
    query.set("longitude", String(params.longitude));
    if (params.radiusKm) query.set("radiusKm", String(params.radiusKm));
    if (params.type) query.set("type", params.type);
    if (params.status) query.set("status", params.status);
    if (params.limit) query.set("limit", String(params.limit));

    return this.request(`/api/incidents/nearby?${query.toString()}`, {
      method: "GET",
    });
  }

  /**
   * GET /api/incidents/:id
   * Fetches full details for a single emergency incident
   */
  public async getEmergencyIncidentDetails(
    id: string,
    coords?: { latitude: number; longitude: number }
  ): Promise<ApiResponse<{ incident: NearbyIncident }>> {
    const query = new URLSearchParams();
    if (coords?.latitude) query.set("latitude", String(coords.latitude));
    if (coords?.longitude) query.set("longitude", String(coords.longitude));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request(`/api/incidents/${id}${qs}`, {
      method: "GET",
    });
  }

  /**
   * POST /api/incidents/:id/verify
   * Allows nearby users to submit a community verification report
   */
  public async verifyIncident(
    id: string,
    data: {
      verificationType: "I_CAN_SEE_ACCIDENT" | "CANNOT_CONFIRM" | "APPEARS_RESOLVED";
      notes?: string;
    }
  ): Promise<
    ApiResponse<{
      verification: IncidentVerification;
      verificationStats: {
        total: number;
        seeCount: number;
        cannotConfirmCount: number;
        resolvedCount: number;
        summary: string;
      };
    }>
  > {
    return this.request(`/api/incidents/${id}/verify`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH /api/incidents/:id/status
   * Updates incident status
   */
  public async updateEmergencyIncidentStatus(
    id: string,
    status: EmergencyIncidentStatus
  ): Promise<ApiResponse<{ incident: NearbyIncident }>> {
    return this.request(`/api/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  /**
   * GET /api/alerts/settings
   * Retrieves alert settings
   */
  public async getAlertSettings(): Promise<ApiResponse<{ settings: AlertSettings }>> {
    return this.request("/api/alerts/settings", {
      method: "GET",
    });
  }

  /**
   * PATCH /api/alerts/settings
   * Updates alert preferences
   */
  public async updateAlertSettings(
    settings: Partial<AlertSettings>
  ): Promise<ApiResponse<{ settings: AlertSettings }>> {
    return this.request("/api/alerts/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  /**
   * POST /api/notifications/subscribe
   * Registers push subscription
   */
  public async subscribeNotifications(data: {
    pushToken?: string;
    endpoint?: string;
    keys?: any;
    latitude?: number;
    longitude?: number;
  }): Promise<ApiResponse<{ subscribed: boolean }>> {
    return this.request("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // 🚨 RAKSH AI — EMERGENCY CORRIDOR & VEHICLES
  // ==========================================

  /**
   * GET /api/emergency-vehicles/active
   * Retrieves live active emergency vehicles (Ambulance, Fire Brigade, Police)
   */
  public async getActiveVehicles(params?: {
    type?: string;
    status?: string;
  }): Promise<ApiResponse<{ vehicles: EmergencyVehicle[]; count: number }>> {
    const query = new URLSearchParams();
    if (params?.type) query.append("type", params.type);
    if (params?.status) query.append("status", params.status);
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return this.request(`/api/emergency-vehicles/active${queryString}`, {
      method: "GET",
    });
  }

  /**
   * GET /api/emergency-vehicles/:id
   */
  public async getVehicleById(
    id: string
  ): Promise<ApiResponse<{ vehicle: EmergencyVehicle }>> {
    return this.request(`/api/emergency-vehicles/${id}`, {
      method: "GET",
    });
  }

  /**
   * PATCH /api/emergency-vehicles/:id/location
   */
  public async updateVehicleLocation(
    id: string,
    data: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      distanceRemaining?: number;
      etaSeconds?: number;
    }
  ): Promise<ApiResponse<{ vehicle: EmergencyVehicle }>> {
    return this.request(`/api/emergency-vehicles/${id}/location`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH /api/emergency-vehicles/:id/status
   */
  public async updateVehicleStatus(
    id: string,
    data: {
      status: EmergencyVehicleStatus;
      destinationName?: string;
      destinationLatitude?: number;
      destinationLongitude?: number;
      assignedIncidentId?: string | null;
    }
  ): Promise<ApiResponse<{ vehicle: EmergencyVehicle }>> {
    return this.request(`/api/emergency-vehicles/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /api/emergency-vehicles/dispatch
   */
  public async dispatchVehicle(data: {
    vehicleId?: string;
    vehicleType?: EmergencyVehicleType;
    incidentId?: string | null;
    destinationName?: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
  }): Promise<ApiResponse<{ vehicle: EmergencyVehicle; etaMinutes: number; distanceKm: number }>> {
    return this.request("/api/emergency-vehicles/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /api/emergency-corridors/active
   */
  public async getActiveCorridors(): Promise<
    ApiResponse<{ corridors: EmergencyCorridor[]; recentDispatchEvents: DispatchEvent[] }>
  > {
    return this.request("/api/emergency-corridors/active", {
      method: "GET",
    });
  }

  /**
   * GET /api/emergency-corridors/:id
   */
  public async getCorridorById(
    id: string
  ): Promise<ApiResponse<{ corridor: EmergencyCorridor }>> {
    return this.request(`/api/emergency-corridors/${id}`, {
      method: "GET",
    });
  }

  /**
   * POST /api/emergency-corridors/recommend-route
   */
  public async getAiRouteRecommendation(data: {
    originLat?: number;
    originLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    corridorId?: string;
    vehicleId?: string;
    incidentId?: string;
    trafficCondition?: string;
  }): Promise<ApiResponse<{ recommendation: RouteRecommendation }>> {
    return this.request("/api/emergency-corridors/recommend-route", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /api/incidents/:id/response
   * Retrieves full incident emergency response payload with live vehicle tracking, distance, ETA, and timeline
   */
  public async getIncidentResponseData(
    incidentId: string,
    userCoords?: { latitude: number; longitude: number }
  ): Promise<
    ApiResponse<{
      incident: any;
      responders: {
        ambulance: EmergencyVehicle | null;
        police: EmergencyVehicle | null;
        fireBrigade: EmergencyVehicle | null;
        all: EmergencyVehicle[];
      };
      corridor: any;
    }>
  > {
    const query = new URLSearchParams();
    if (userCoords?.latitude) query.set("userLat", String(userCoords.latitude));
    if (userCoords?.longitude) query.set("userLng", String(userCoords.longitude));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request(`/api/incidents/${incidentId}/response${qs}`, {
      method: "GET",
    });
  }

  /**
   * POST /api/incidents/:id/dispatch
   * Dispatches emergency responders (Ambulance, Police, Fire Brigade) to incident
   */
  public async dispatchIncidentResponders(
    incidentId: string,
    data?: {
      services?: string[];
      notes?: string;
    }
  ): Promise<
    ApiResponse<{
      incidentId: string;
      dispatchedCount: number;
      vehicles: EmergencyVehicle[];
    }>
  > {
    return this.request(`/api/incidents/${incidentId}/dispatch`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  }

  /**
   * POST /api/emergency-corridors/simulate-step
   */
  public async simulateCorridorStep(data: {
    vehicleId?: string;
    step: number;
    action?: "STEP" | "START" | "PAUSE" | "RESET";
    incidentId?: string | null;
    destinationName?: string;
    destinationLat?: number;
    destinationLng?: number;
  }): Promise<ApiResponse<SimulationStepResponse>> {
    return this.request("/api/emergency-corridors/simulate-step", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();

