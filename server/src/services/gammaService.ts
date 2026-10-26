import fs from "fs";
import path from "path";

export interface PresentationTemplate {
  id: string;
  title: string;
  topic: string;
  description: string;
  slideCount: number;
  recommendedStyle: "professional" | "modern" | "minimal" | "cinematic";
  language: "en" | "hi" | "mr";
  category: string;
  outlineHighlights: string[];
}

export interface GammaGenerateParams {
  topic: string;
  description: string;
  slideCount: number;
  language: "en" | "hi" | "mr";
  style: "professional" | "modern" | "minimal" | "cinematic";
  userId?: string | null;
}

export interface GeneratedSlide {
  slideNumber: number;
  title: string;
  keyPoints: string[];
  visualDirection: string;
  takeaway: string;
}

export interface PresentationRecord {
  id: string;
  userId?: string | null;
  topic: string;
  description: string;
  slideCount: number;
  language: "en" | "hi" | "mr";
  style: "professional" | "modern" | "minimal" | "cinematic";
  mode: "api" | "manual_prompt";
  gammaUrl?: string | null;
  exportUrl?: string | null;
  generationId?: string | null;
  prompt: string;
  slides: GeneratedSlide[];
  status: "completed" | "pending" | "manual_ready" | "failed";
  createdAt: string;
}

// 6 Ready-made Emergency Presentation Templates
export const EMERGENCY_TEMPLATES: PresentationTemplate[] = [
  {
    id: "emergency-response-awareness",
    title: "Emergency Response Awareness",
    topic: "Emergency Response Awareness: The Golden Hour & Rapid Multi-Agency Dispatch",
    description:
      "A comprehensive guide on rapid emergency response, understanding the Golden Hour in trauma care, calling 112/108/101, and how community bystanders can safely coordinate emergency responders.",
    slideCount: 8,
    recommendedStyle: "professional",
    language: "en",
    category: "Emergency Coordination",
    outlineHighlights: [
      "The Golden Hour: Why the First 60 Minutes Determine Survival",
      "National Emergency Helplines (112, 108 Ambulance, 101 Fire, 100 Police)",
      "Clear Communication: Relaying Precise GPS, Landmarking & Patient Triage",
      "Multi-Agency Coordination: Police, Fire & Medical Integration",
      "RakshAI Automated Assistance: Digital SOS, Nearby Responders & Route Clearing",
      "Do's and Don'ts When Waiting for Emergency Vehicles",
    ],
  },
  {
    id: "accident-prevention",
    title: "Accident Prevention",
    topic: "Road Safety & Accident Prevention: Hazard Reduction and Defensive Driving",
    description:
      "Educational presentation on defensive driving techniques, high-speed collision risks, helmet and seatbelt efficacy, pedestrian safety, and smart accident prevention protocols.",
    slideCount: 8,
    recommendedStyle: "modern",
    language: "en",
    category: "Road Safety",
    outlineHighlights: [
      "The Anatomy of a Collision: Velocity, Impact Force & Safety Margins",
      "Active Vehicle Safety: Brake Checks, Tire Health & Blind Spot Awareness",
      "Protective Gear: ISI/DOT Helmets, Seatbelts & Child Restraints",
      "Night Driving & Inclement Weather Hazard Protocols",
      "Intersection Protocols: Navigating Blind Corners & High-Risk Crossings",
      "RakshAI Impact Telemetry & Real-Time Crash Detection",
    ],
  },
  {
    id: "fire-safety-awareness",
    title: "Fire Safety Awareness",
    topic: "Fire Safety Awareness: Prevention, Fire Classes, and Rapid Evacuation Drill",
    description:
      "Crucial safety presentation covering fire classification (Class A-F), PASS fire extinguisher technique, electrical hazards, smoke inhalation protection, and building evacuation plans.",
    slideCount: 8,
    recommendedStyle: "cinematic",
    language: "en",
    category: "Fire & Rescue",
    outlineHighlights: [
      "The Fire Triangle: Oxygen, Fuel, and Ignition Sources",
      "Classes of Fire (Class A Combustibles, Class B Liquids, Class C Electrical)",
      "The P.A.S.S. Method: Pull, Aim, Squeeze, Sweep with Fire Extinguishers",
      "Smoke Inhalation Defense: Low-Crawl Evacuation & Wet Cloth Shielding",
      "Emergency Evacuation Planning & Designated Assembly Points",
      "Calling 101 / 112 Fire Dispatch: Relaying Structural Details to Responders",
    ],
  },
  {
    id: "first-aid-awareness",
    title: "First Aid Awareness",
    topic: "First Aid Awareness: Basic Life Support (BLS), CPR, and Trauma First-Response",
    description:
      "Step-by-step life-saving first-aid practices including Hands-Only CPR, choking recovery, severe hemorrhage pressure control, burn treatment, and fracture stabilization before ambulance arrival.",
    slideCount: 10,
    recommendedStyle: "professional",
    language: "en",
    category: "Medical Response",
    outlineHighlights: [
      "The DRSABCD Action Plan: Danger, Response, Send for Help, Airway, Breathing, CPR, Defibrillation",
      "Hands-Only CPR: Rate (100-120 bpm) and Compression Depth for Adults",
      "Severe Bleeding Management: Direct Pressure, Elevation & Tourniquet Rules",
      "Choking Relief: Back Blows and Abdominal Thrusts (Heimlich Maneuver)",
      "Thermal Burn First Aid: Cool Running Water (20 Mins), No Ice or Ointments",
      "Shock Management: Elevating Legs, Maintaining Warmth & Calming Patient",
    ],
  },
  {
    id: "emergency-preparedness",
    title: "Emergency Preparedness",
    topic: "Community Emergency Preparedness & Family Resilience Blueprint",
    description:
      "Blueprint for disaster resilience, assembling 72-hour emergency go-bags, flood/earthquake readiness, backup power and communication channels, and community mutual-aid networks.",
    slideCount: 10,
    recommendedStyle: "minimal",
    language: "en",
    category: "Disaster Preparedness",
    outlineHighlights: [
      "Risk Profiling: Urban Floods, Earthquakes, Cyclones & Power Grid Failures",
      "The 72-Hour Survival Go-Bag: Water, Non-Perishable Food, First Aid & Documents",
      "Family Communication & Reunification Meeting Points",
      "Offline Redundancy: Paper Maps, Battery Radios & Offline Emergency Apps",
      "Vulnerable Population Support: Elderly, Children, and Pets in Emergencies",
      "RakshAI Offline Direct Directory: Instant Calling Without Active Data",
    ],
  },
  {
    id: "ai-in-emergency-management",
    title: "AI in Emergency Management",
    topic: "AI in Emergency Management: Smart Corridors, Instant Triage, and Predictive Rescue",
    description:
      "Exploration of modern artificial intelligence in disaster management: sensor-driven crash detection, dynamic traffic light green corridors for ambulances, automated triage, and GIS spatial coordination.",
    slideCount: 8,
    recommendedStyle: "modern",
    language: "en",
    category: "Smart Tech & AI",
    outlineHighlights: [
      "Next-Gen Emergency Management: The Shift from Reactive to Predictive",
      "Smartphone Accelerometer & Gyroscope Crash Telemetry in RakshAI",
      "Dynamic Green Corridors: Synchronized Traffic Signal Preemption for Ambulances",
      "Computer Vision in Drone Search & Rescue Operations",
      "Natural Language & Multilingual AI Voice Triage for Emergency Call Centers",
      "Ethical Guardrails: Privacy Protection, Human-in-the-Loop & High Availability",
    ],
  },
];

// Persistent history storage file
const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "gamma_presentations.json");

function ensureStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(HISTORY_FILE)) {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Storage directory initialization warning:", err);
  }
}

export function getPresentationHistory(): PresentationRecord[] {
  try {
    ensureStorage();
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading presentation history:", err);
  }
  return [];
}

export function savePresentationRecord(record: PresentationRecord): void {
  try {
    ensureStorage();
    const history = getPresentationHistory();
    // Prepend new record, cap at 50 records
    const updated = [record, ...history.filter((r) => r.id !== record.id)].slice(0, 50);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving presentation record:", err);
  }
}

export function deletePresentationRecord(id: string): boolean {
  try {
    ensureStorage();
    const history = getPresentationHistory();
    const filtered = history.filter((r) => r.id !== id);
    if (filtered.length !== history.length) {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  } catch (err) {
    console.error("Error deleting presentation record:", err);
  }
  return false;
}

/**
 * Builds structured, multi-lingual slide breakdowns tailored for emergency education
 */
export function synthesizeSlides(params: GammaGenerateParams): {
  slides: GeneratedSlide[];
  promptText: string;
} {
  const { topic, description, slideCount, language, style } = params;

  const langConfig = {
    en: {
      introTitle: "Introduction & Urgent Importance",
      frameworkTitle: "Key Principles & Safety Framework",
      actionTitle: "Step-by-Step Emergency Action Plan",
      techTitle: "Technology & Community Coordination",
      mistakesTitle: "Critical Pitfalls & What to Avoid",
      preparednessTitle: "Readiness Checklist & Emergency Kit",
      summaryTitle: "Summary & Life-Saving Contacts",
      visualPrefix: "Visual Style: Crisp infographic illustration showing",
      takeawayPrefix: "Key Takeaway: ",
      badge: "Emergency Response Guide",
    },
    hi: {
      introTitle: "परिचय और त्वरित आवश्यकता (Introduction & Urgency)",
      frameworkTitle: "मुख्य सिद्धांत और सुरक्षा ढाँचा (Safety Framework)",
      actionTitle: "कदम-दर-कदम आपातकालीन कार्ययोजना (Action Plan)",
      techTitle: "तकनीक और सामुदायिक समन्वय (Technology & Coordination)",
      mistakesTitle: "गंभीर गलतियाँ और सावधानियाँ (Critical Precautions)",
      preparednessTitle: "तैयारी चेकलिस्ट और किट (Preparedness Checklist)",
      summaryTitle: "निष्कर्ष और जीवन-रक्षक हेल्पलाइन (Emergency Contacts)",
      visualPrefix: "दृश्य निर्देश (Visual): उच्च गुणवत्ता वाली इन्फोग्राफिक छवि -",
      takeawayPrefix: "मुख्य संदेश (Key Takeaway): ",
      badge: "आपातकालीन सुरक्षा गाइड",
    },
    mr: {
      introTitle: "प्रस्तावना आणि तातडीचे महत्त्व (Introduction & Importance)",
      frameworkTitle: "सुरक्षेची मूलभूत तत्त्वे (Safety Principles)",
      actionTitle: "टप्प्याटप्प्याने आपत्कालीन कृती आराखडा (Action Plan)",
      techTitle: "तंत्रज्ञान आणि सामाजिक समन्वय (Technology & Coordination)",
      mistakesTitle: "टाळावयाच्या गंभीर चुका (Critical Mistakes to Avoid)",
      preparednessTitle: "आपत्ती पूर्वतयारी व सुरक्षा किट (Preparedness Checklist)",
      summaryTitle: "निष्कर्ष व जीवनरक्षक संपर्क (Emergency Contacts)",
      visualPrefix: "दृश्य सूचना (Visual): स्पष्ट व प्रभावी माहिती आलेख -",
      takeawayPrefix: "महत्त्वाचा निष्कर्ष (Key Takeaway): ",
      badge: "आपत्कालीन सुरक्षा मार्गदर्शक",
    },
  }[language] || {
    introTitle: "Introduction & Urgent Importance",
    frameworkTitle: "Key Principles & Safety Framework",
    actionTitle: "Step-by-Step Emergency Action Plan",
    techTitle: "Technology & Community Coordination",
    mistakesTitle: "Critical Pitfalls & What to Avoid",
    preparednessTitle: "Readiness Checklist & Emergency Kit",
    summaryTitle: "Summary & Life-Saving Contacts",
    visualPrefix: "Visual Style: Crisp infographic illustration showing",
    takeawayPrefix: "Key Takeaway: ",
    badge: "Emergency Response Guide",
  };

  const slides: GeneratedSlide[] = [];
  const count = Math.max(4, Math.min(slideCount || 8, 20));

  // Slide 1: Cover
  slides.push({
    slideNumber: 1,
    title: topic,
    keyPoints: [
      `Subtitle: ${description.slice(0, 140)}`,
      `Presented by: RakshAI Public Safety Initiative`,
      `Language: ${language.toUpperCase()} | Format: ${style.toUpperCase()} Presentation Deck`,
      `Focus: Actionable preparedness, rapid decision making, and life preservation`,
    ],
    visualDirection: `${langConfig.visualPrefix} a bold ${style} cover title card with high-contrast emergency lighting, clean icons, and authoritative safety typography.`,
    takeaway: `${langConfig.takeawayPrefix}Rapid emergency readiness saves lives. Every second counts.`,
  });

  // Slide 2: The Core Problem & Urgency
  slides.push({
    slideNumber: 2,
    title: langConfig.introTitle,
    keyPoints: [
      `Context: ${description}`,
      "Every year, thousands of critical delays occur due to hesitation and lack of verified contact info.",
      "The 'Golden Hour' principle: Prompt intervention in the first 60 minutes cuts mortality rates by over 50%.",
      "Immediate bystander safety: Ensuring the scene is secure before initiating help.",
    ],
    visualDirection: `${langConfig.visualPrefix} a split diagram depicting the timeline of emergency triage and the golden-hour survival rate graph.`,
    takeaway: `${langConfig.takeawayPrefix}Early situational recognition prevents compound disasters.`,
  });

  // Slide 3: Core Safety Principles
  slides.push({
    slideNumber: 3,
    title: langConfig.frameworkTitle,
    keyPoints: [
      "1. Assess the scene: Identify active fire, electrical leakage, traffic, or toxic smoke.",
      "2. Alert authorities immediately via 112 (Universal Emergency) before attempting solo rescues.",
      "3. Direct crowd control: Assign specific individuals to clear pathways and guide incoming ambulances.",
      "4. Preserve vitals: Keep the patient warm, airway clear, and avoid moving suspect spinal injuries.",
    ],
    visualDirection: `${langConfig.visualPrefix} four sequential safety checkpoint icons with high-visibility hazard badges.`,
    takeaway: `${langConfig.takeawayPrefix}Safety first: never become a second casualty during rescue.`,
  });

  // Slide 4: Action Plan
  slides.push({
    slideNumber: 4,
    title: langConfig.actionTitle,
    keyPoints: [
      "Phase 1: Dial 112 / 108 / 101 with exact GPS coordinates and landmark references.",
      "Phase 2: Communicate caller name, patient count, conscious status, and visible hazards clearly.",
      "Phase 3: Deploy available first-aid (direct pressure for bleeding, recovery position for unconscious breathing).",
      "Phase 4: Station a volunteer at the main road junction to guide response vehicles.",
    ],
    visualDirection: `${langConfig.visualPrefix} a clean modern flowchart illustrating 4 phases of emergency execution.`,
    takeaway: `${langConfig.takeawayPrefix}Clear, calm communication is the primary bridge to rapid hospital dispatch.`,
  });

  // Additional slides if slide count >= 5
  if (count >= 5) {
    slides.push({
      slideNumber: 5,
      title: langConfig.techTitle,
      keyPoints: [
        "RakshAI Automated Assistance: Instant nearest hospital & fire station geofencing.",
        "Smart Corridors: Traffic signal coordination for emergency vehicles to bypass bottlenecks.",
        "Live GPS Share: Seamlessly sending one-tap maps location to family and responders.",
        "Offline Directory Backup: Accessing vital phone numbers even when cellular data is severed.",
      ],
      visualDirection: `${langConfig.visualPrefix} a mobile interface graphic showing smart ambulance telemetry and digital SOS routing.`,
      takeaway: `${langConfig.takeawayPrefix}Technology augments community response when integrated seamlessly.`,
    });
  }

  if (count >= 6) {
    slides.push({
      slideNumber: 6,
      title: langConfig.mistakesTitle,
      keyPoints: [
        "DO NOT crowd the casualty or restrict fresh airflow.",
        "DO NOT give liquids or water to an unconscious or heavily bleeding person (aspiration risk).",
        "DO NOT move an accident victim with suspected cervical/spinal injury unless immediate fire/explosion danger exists.",
        "DO NOT delay dialing 112 to take photos or record videos for social media.",
      ],
      visualDirection: `${langConfig.visualPrefix} red warning icons with concise 'Do Not' annotations for emergency errors.`,
      takeaway: `${langConfig.takeawayPrefix}Preventing common bystander mistakes is as vital as active aid.`,
    });
  }

  if (count >= 7) {
    slides.push({
      slideNumber: 7,
      title: langConfig.preparednessTitle,
      keyPoints: [
        "Keep a 72-hour family emergency kit (water, non-perishables, flashlight, whistle, first-aid).",
        "Store emergency numbers in phone ICE (In Case of Emergency) contacts.",
        "Conduct regular household and office fire drills and identify 2 evacuation routes.",
        "Have basic bleeding control kits (sterile gauze, elastic bandages, tourniquet) in every vehicle.",
      ],
      visualDirection: `${langConfig.visualPrefix} an exploded view of an emergency trauma kit with labeled medical tools.`,
      takeaway: `${langConfig.takeawayPrefix}Preparedness in calm times guarantees swift action during crises.`,
    });
  }

  if (count >= 8) {
    slides.push({
      slideNumber: 8,
      title: langConfig.summaryTitle,
      keyPoints: [
        "Universal Emergency Helpline: Dial 112 (24/7 National Emergency)",
        "Ambulance Services: 108 (Trauma/Emergency) | 102 (Free Transport)",
        "Fire & Rescue: 101 | Police Control: 100",
        "Empower your community with RakshAI: Stay alert, stay prepared, save lives.",
      ],
      visualDirection: `${langConfig.visualPrefix} a bold emergency card featuring prominent national helpline badges and RakshAI branding.`,
      takeaway: `${langConfig.takeawayPrefix}Save these numbers in your phone now. Preparedness starts today.`,
    });
  }

  // If user requested more than 8 slides, pad with specialized topic breakdowns
  if (count > 8) {
    const extraTopics = [
      {
        title: "Triage & Priority Assessment",
        points: [
          "Red Flag symptoms: Stridor, uncontrolled hemorrhage, absent radial pulse, coma",
          "Yellow status: Serious fractures, burns under 20%, stable breathing",
          "Green status: Walking wounded requiring basic dressing",
          "Black status: Deceased or injuries incompatible with life under mass casualty triage",
        ],
      },
      {
        title: "Pediatric & Elderly Considerations",
        points: [
          "Hypothermia risks are significantly higher in infants and elderly victims",
          "Pediatric CPR: 15:2 ratio for two-rescuer or 30:2 with 1 or 2 hands depth",
          "Medication history: Checking for anticoagulant (blood-thinner) usage",
          "Reassurance and calming psychological first aid",
        ],
      },
    ];

    extraTopics.forEach((extra, idx) => {
      if (slides.length < count) {
        slides.push({
          slideNumber: slides.length + 1,
          title: extra.title,
          keyPoints: extra.points,
          visualDirection: `${langConfig.visualPrefix} a professional diagram illustrating ${extra.title}.`,
          takeaway: `${langConfig.takeawayPrefix}Specialized patient triage ensures the right care at the right time.`,
        });
      }
    });
  }

  // Format into a comprehensive Gamma prompt
  const promptLines: string[] = [];
  promptLines.push(`Create an authoritative, highly engaging ${count}-card ${style} presentation about:`);
  promptLines.push(`Title: "${topic}"`);
  promptLines.push(`Target Language: ${language === "hi" ? "Hindi (हिंदी)" : language === "mr" ? "Marathi (मराठी)" : "English"}`);
  promptLines.push(`Tone & Style: ${style}, informative, authoritative public safety guidance`);
  promptLines.push(`Context & Description: ${description}`);
  promptLines.push("");
  promptLines.push("=== PRESENTATION STRUCTURE & CARD OUTLINE ===");

  slides.forEach((s) => {
    promptLines.push(`Card ${s.slideNumber}: ${s.title}`);
    s.keyPoints.forEach((pt) => promptLines.push(`• ${pt}`));
    promptLines.push(`[Design & Imagery]: ${s.visualDirection}`);
    promptLines.push(`[Key Takeaway]: ${s.takeaway}`);
    promptLines.push("");
  });

  promptLines.push("=== INSTRUCTIONS FOR GAMMA AI ===");
  promptLines.push(`- Output language: Write card titles and body text in ${language === "hi" ? "fluent, natural Hindi" : language === "mr" ? "fluent, natural Marathi" : "clear, professional English"}.`);
  promptLines.push(`- Visual theme: Apply a clean, modern ${style} aesthetic with emergency red and amber accents.`);
  promptLines.push("- Structure: Keep bullet points punchy and easy to scan from a distance.");
  promptLines.push("- End the deck with universal emergency phone numbers (112, 108, 101, 100).");

  const promptText = promptLines.join("\n");

  return { slides, promptText };
}

/**
 * Attempts official Gamma API call if GAMMA_API_KEY is configured
 */
export async function generateViaGammaApi(params: GammaGenerateParams, promptText: string): Promise<{
  success: boolean;
  gammaUrl?: string;
  exportUrl?: string;
  generationId?: string;
  status: "completed" | "pending" | "failed";
  error?: string;
}> {
  const apiKey = process.env.GAMMA_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      status: "failed",
      error: "GAMMA_API_KEY is not configured in the server environment.",
    };
  }

  try {
    const postRes = await fetch("https://public-api.gamma.app/v1.0/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        inputText: promptText,
        title: params.topic.slice(0, 200),
        format: "presentation",
        textMode: "generate",
        additionalInstructions: `Presentation style: ${params.style}. Language: ${params.language}. Maintain authoritative emergency response guidance with clear bullet points.`,
        cardSplit: "auto",
        exportAs: "pptx",
      }),
    });

    if (!postRes.ok) {
      const errBody = await postRes.text();
      let parsedMsg = errBody;
      try {
        const jsonErr = JSON.parse(errBody);
        parsedMsg = jsonErr.message || jsonErr.error || errBody;
      } catch {
        // use raw text
      }
      return {
        success: false,
        status: "failed",
        error: `Gamma API responded with HTTP ${postRes.status}: ${parsedMsg}`,
      };
    }

    const postData = (await postRes.json()) as { generationId: string };
    const generationId = postData.generationId;

    if (!generationId) {
      return {
        success: false,
        status: "failed",
        error: "Gamma API did not return a generationId.",
      };
    }

    // Poll status up to 4 times (with 3-second delays) for quick responsiveness
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, 2500));

      const pollRes = await fetch(`https://public-api.gamma.app/v1.0/generations/${generationId}`, {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
        },
      });

      if (pollRes.ok) {
        const pollData = (await pollRes.json()) as {
          status: string;
          gammaUrl?: string;
          exportUrl?: string;
          error?: any;
        };

        if (pollData.status === "completed" && pollData.gammaUrl) {
          return {
            success: true,
            status: "completed",
            gammaUrl: pollData.gammaUrl,
            exportUrl: pollData.exportUrl,
            generationId,
          };
        }

        if (pollData.status === "failed") {
          return {
            success: false,
            status: "failed",
            generationId,
            error: pollData.error?.message || "Gamma presentation generation failed on remote server.",
          };
        }
      }
    }

    // If still in progress, return pending so user can follow up
    return {
      success: true,
      status: "pending",
      generationId,
      gammaUrl: `https://gamma.app/docs/${generationId}`,
    };
  } catch (err: any) {
    return {
      success: false,
      status: "failed",
      error: err.message || "Failed to reach Gamma API endpoint.",
    };
  }
}
