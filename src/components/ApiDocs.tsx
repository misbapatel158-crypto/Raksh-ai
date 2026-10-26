import React, { useState } from "react";
import { Code2, Key, Check, Copy, Sparkles, Layers, Camera } from "lucide-react";

export const ApiDocs: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const endpoints = [
    {
      method: "GET",
      path: "/api/health",
      auth: "Public",
      description: "Backend health check status and server readiness",
      request: "None",
      response: `{
  "success": true,
  "message": "RakshAI backend is running"
}`,
    },
    {
      method: "POST",
      path: "/api/incidents/report",
      auth: "Optional Auth",
      description: "Citizen emergency reporting with auto-GPS capture, multi-witness proximity grouping (500m), and evidence photo attachment",
      request: `{
  "type": "ROAD_ACCIDENT",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "accuracy": 12.5,
  "description": "Multi-car collision near flyover, 2 injured individuals",
  "helpRequired": {
    "ambulance": true,
    "police": true,
    "fireBrigade": false
  },
  "evidencePhotoBase64": "data:image/jpeg;base64,...",
  "evidenceCaption": "Front vehicular impact",
  "isPrivacyBlurred": true
}`,
      response: `{
  "success": true,
  "message": "Grouped with active incident #RK-8492. Total reports: 3.",
  "data": {
    "incident": {
      "id": "cm7...",
      "incidentCode": "RK-8492",
      "type": "ROAD_ACCIDENT",
      "status": "HELP_REQUESTED",
      "reportCount": 3,
      "photoCount": 2,
      "approximateDistanceText": "1.2 km away",
      "timeline": [ ... ]
    }
  }
}`,
    },
    {
      method: "POST",
      path: "/api/incidents/ai-classify",
      auth: "Optional Auth",
      description: "AI Incident Classification & Decision Engine providing triage assessment, confidence score, and service dispatch recommendations",
      request: `{
  "description": "Smoke billowed from 2nd floor, trapped occupants in warehouse",
  "reportedType": "FIRE"
}`,
      response: `{
  "success": true,
  "data": {
    "analysis": {
      "suggestedType": "FIRE",
      "suggestedTypeLabel": "Active Structural Fire",
      "severity": "CRITICAL",
      "confidence": 96,
      "recommendedServices": ["FIRE_BRIGADE", "AMBULANCE", "POLICE"],
      "triageSummary": "Immediate Tier-1 Fire and Rescue dispatch required. Evacuate perimeter.",
      "estimatedVictims": "1-5",
      "hazardsIdentified": ["Smoke inhalation", "Thermal spread"]
    }
  }
}`,
    },
    {
      method: "POST",
      path: "/api/incidents/:id/evidence",
      auth: "Optional Auth",
      description: "Uploads photo evidence to an existing incident with Privacy Shield protection",
      request: `{
  "imageUrl": "data:image/jpeg;base64,...",
  "caption": "Ambulance en route",
  "isPrivacyBlurred": true
}`,
      response: `{
  "success": true,
  "message": "Evidence uploaded successfully.",
  "data": {
    "evidence": {
      "id": "evi_123",
      "imageUrl": "...",
      "isPrivacyBlurred": true,
      "createdAt": "2026-08-29T12:00:00.000Z"
    }
  }
}`,
    },
    {
      method: "POST",
      path: "/api/incidents/simulate",
      auth: "Optional Auth",
      description: "Creates safe demo/simulation incidents for hackathon presentations and emergency drills",
      request: `{
  "scenario": "ACCIDENT",
  "latitude": 18.5204,
  "longitude": 73.8567
}`,
      response: `{
  "success": true,
  "message": "Emergency simulation broadcasted successfully.",
  "data": {
    "incident": {
      "id": "sim_789",
      "isDemoIncident": true,
      "incidentCode": "DEMO-789",
      "status": "HELP_REQUESTED"
    }
  }
}`,
    },
    {
      method: "GET",
      path: "/api/incidents/nearby",
      auth: "Public / Optional Auth",
      description: "Queries active emergency incidents within user radius using Haversine distance",
      request: "Query params: ?latitude=18.5204&longitude=73.8567&radiusKm=5",
      response: `{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "cm7...",
        "incidentCode": "RK-8492",
        "type": "ROAD_ACCIDENT",
        "status": "HELP_REQUESTED",
        "reportCount": 2,
        "approximateDistanceText": "1.2 km away"
      }
    ],
    "totalFound": 1,
    "radiusKm": 5
  }
}`,
    },
    {
      method: "POST",
      path: "/api/auth/login",
      auth: "Public (Rate limited)",
      description: "Authenticates user and returns JWT token",
      request: `{
  "email": "demo@rakshai.org",
  "password": "Emergency123!"
}`,
      response: `{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "id": "...", "name": "Alex Mercer", "email": "demo@rakshai.org" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}`,
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div id="api-docs-container" className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-[#EF4444]">
          <Code2 className="w-5 h-5" />
          <h3 className="text-lg font-bold text-[#18181B] tracking-tight">
            RakshAI REST API &amp; Dispatch Engine Specification
          </h3>
        </div>
        <p className="text-xs text-[#71717A] leading-relaxed">
          Comprehensive documentation for all emergency reporting, multi-report proximity clustering (500m),
          AI Decision Engine triage, Privacy Shield evidence photo handling, and Haversine responder routing endpoints.
        </p>
      </div>

      <div className="space-y-4">
        {endpoints.map((ep, index) => (
          <div
            key={index}
            className="bg-white border border-[#E4E4E7] rounded-2xl p-5 space-y-3 hover:border-zinc-400 transition-colors shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E4E7] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                    ep.method === "GET"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : ep.method === "POST"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-mono text-xs font-bold text-[#18181B]">{ep.path}</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[#71717A] font-medium border border-[#E4E4E7]">
                {ep.auth}
              </span>
            </div>

            <p className="text-xs text-[#52525B]">{ep.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
                  Request Payload / Parameters
                </span>
                <pre className="bg-[#18181B] text-zinc-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                  {ep.request}
                </pre>
              </div>

              <div className="space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
                    Response
                  </span>
                  <button
                    onClick={() => handleCopy(ep.response, index)}
                    className="text-[10px] text-[#71717A] hover:text-[#18181B] flex items-center gap-1 font-semibold"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-3 h-3 text-green-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-[#18181B] text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                  {ep.response}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
