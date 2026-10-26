import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Presentation,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Layers,
  Globe,
  Palette,
  AlertTriangle,
  History,
  Trash2,
  RefreshCw,
  Info,
  Key,
  ShieldCheck,
  FileText,
  Sliders,
  ChevronRight,
  Flame,
  Car,
  HeartPulse,
  Shield,
  Clock,
  Radio,
} from "lucide-react";
import { api } from "../services/api";
import {
  User,
  PresentationStyle,
  PresentationLanguage,
  PresentationTemplate,
  GammaGenerateResponse,
  PresentationRecord,
  GammaStatusResponse,
} from "../types";
import { useTranslation } from "../i18n";

interface GammaStudioProps {
  user: User | null;
  onOpenAuth: () => void;
  onNavigateToEmergency?: () => void;
}

const STYLES_CONFIG: Array<{
  id: PresentationStyle;
  label: string;
  badge: string;
  desc: string;
  icon: string;
}> = [
  {
    id: "professional",
    label: "Professional",
    badge: "Formal & Institutional",
    desc: "Rigorous, authoritative emergency service structure with clean corporate data cards.",
    icon: "💼",
  },
  {
    id: "modern",
    label: "Modern",
    badge: "Bold & Sleek",
    desc: "Vibrant high-contrast typography, bold warning ribbons, and dynamic slide layouts.",
    icon: "⚡",
  },
  {
    id: "minimal",
    label: "Minimal",
    badge: "Clean & Focused",
    desc: "Distraction-free high legibility layout, large emergency phone callouts, and clean white-space.",
    icon: "🎯",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    badge: "High-Impact Visuals",
    desc: "Dramatic emergency staging cues, emotive rescue visuals, and intense situational imagery.",
    icon: "🎬",
  },
];

const LANGUAGES_CONFIG: Array<{
  id: PresentationLanguage;
  name: string;
  native: string;
  flag: string;
}> = [
  { id: "en", name: "English", native: "English", flag: "🇬🇧" },
  { id: "hi", name: "Hindi", native: "हिंदी", flag: "🇮🇳" },
  { id: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳" },
];

const SLIDE_COUNT_OPTIONS = [5, 8, 10, 12, 15];

export const GammaStudio: React.FC<GammaStudioProps> = ({
  user,
  onOpenAuth,
  onNavigateToEmergency,
}) => {
  const { t } = useTranslation();

  // Form State
  const [topic, setTopic] = useState("Emergency Response Awareness: The Golden Hour & Rapid Multi-Agency Dispatch");
  const [description, setDescription] = useState(
    "A comprehensive guide on rapid emergency response, understanding the Golden Hour in trauma care, calling 112/108/101, and how community bystanders can safely coordinate emergency responders."
  );
  const [slideCount, setSlideCount] = useState<number>(8);
  const [language, setLanguage] = useState<PresentationLanguage>("en");
  const [style, setStyle] = useState<PresentationStyle>("professional");

  // Integration & Backend Status State
  const [statusConfig, setStatusConfig] = useState<GammaStatusResponse | null>(null);
  const [templates, setTemplates] = useState<PresentationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("emergency-response-awareness");

  // Generation & Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GammaGenerateResponse | null>(null);

  // History State
  const [history, setHistory] = useState<PresentationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PresentationRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load: Fetch Gamma Status & Templates + Presentation History
  useEffect(() => {
    loadStatusAndTemplates();
    loadHistory();
  }, []);

  const loadStatusAndTemplates = async () => {
    try {
      const res = await api.getGammaStatus();
      if (res.success && res.data) {
        setStatusConfig(res.data);
        if (res.data.templates && res.data.templates.length > 0) {
          setTemplates(res.data.templates);
        }
      }
    } catch (err) {
      console.warn("Could not load Gamma configuration status:", err);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getGammaHistory();
      if (res.success && res.data?.presentations) {
        setHistory(res.data.presentations);
      }
    } catch (err) {
      console.warn("Could not load presentation history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 2. Select Template & Customize
  const handleSelectTemplate = (tpl: PresentationTemplate) => {
    setSelectedTemplateId(tpl.id);
    setTopic(tpl.topic);
    setDescription(tpl.description);
    setSlideCount(tpl.slideCount);
    setStyle(tpl.recommendedStyle);
    setLanguage(tpl.language);
    setResult(null);
    setErrorMessage(null);
    showToast(`✓ Template "${tpl.title}" loaded.`);
  };

  // 3. Generate Presentation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMessage("Please enter a presentation topic.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please enter a short description of the presentation.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setResult(null);
    setGenerationStep("Analyzing emergency topic & structuring slide outline...");

    try {
      // Step simulation for high responsiveness feedback
      const stepTimer1 = setTimeout(() => {
        setGenerationStep(
          statusConfig?.isApiConfigured
            ? "Connecting to official Gamma API..."
            : "Synthesizing multi-lingual emergency prompt cards..."
        );
      }, 700);

      const res = await api.generateGammaPresentation({
        topic: topic.trim(),
        description: description.trim(),
        slideCount,
        language,
        style,
      });

      clearTimeout(stepTimer1);

      if (res.success && res.data) {
        setResult(res.data);
        showToast(
          res.data.mode === "api"
            ? "✓ Presentation generated via Gamma API!"
            : "✓ Presentation prompt ready for Gamma!"
        );
        loadHistory();
      } else {
        setErrorMessage(res.message || "Failed to generate presentation. Please check inputs.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while connecting to presentation engine.");
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  // 4. Copy Prompt to Clipboard
  const handleCopyPrompt = async (promptText: string, id: string = "active") => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedId(id);
      showToast("✓ Presentation prompt copied to clipboard!");
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      showToast("⚠️ Could not copy automatically. Please select text manually.");
    }
  };

  // 5. Delete History Item
  const handleDeleteHistory = async (id: string) => {
    try {
      const res = await api.deleteGammaHistory(id);
      if (res.success) {
        setHistory((prev) => prev.filter((p) => p.id !== id));
        if (selectedHistoryItem?.id === id) {
          setSelectedHistoryItem(null);
        }
        showToast("✓ Presentation record deleted.");
      }
    } catch (err) {
      showToast("Failed to delete record.");
    }
  };

  return (
    <div id="gamma-ai-studio-root" className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181B] text-white px-4 py-3 rounded-xl shadow-2xl border border-zinc-700 flex items-center gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER: GAMMA AI STUDIO                                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-red-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
                  Gamma AI Studio
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                  Emergency Deck Generator
                </span>
                {statusConfig?.isApiConfigured ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Direct API Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                    Smart Prompt + Open Gamma Mode
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#71717A] mt-1 max-w-2xl leading-relaxed">
                Generate high-impact emergency awareness presentations, safety briefing decks, and medical training slides powered by Gamma AI and RakshAI safety knowledge.
              </p>
            </div>
          </div>

          {/* Quick Stats & Navigation */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => setActiveTab("create")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "create"
                  ? "bg-[#18181B] text-white shadow-xs"
                  : "bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#18181B]"
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Studio Generator</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                loadHistory();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-[#18181B] text-white shadow-xs"
                  : "bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#18181B]"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Deck History</span>
              {history.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Integration Note Banner */}
        <div className="mt-4 pt-4 border-t border-[#F4F4F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#71717A]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {statusConfig?.isApiConfigured
                ? "Official Gamma API is configured. Decks can be generated automatically in your workspace."
                : "No API key required! Build tailored multilingual slides, copy your custom prompt with 1 click, and open Gamma to generate."}
            </span>
          </div>
          <a
            href="https://gamma.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline shrink-0"
          >
            <span>Learn about Gamma</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN GENERATOR VIEW                                                    */}
      {/* ========================================================================= */}
      {activeTab === "create" && (
        <div className="space-y-6">
          {/* READY-MADE EMERGENCY PRESENTATION TEMPLATES */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#18181B] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-red-600" />
                  <span>Ready-Made Emergency Presentation Templates</span>
                </h2>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Select a pre-built RakshAI topic to instantly populate safety outlines, or customize any field below.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#71717A] bg-[#F4F4F5] px-2.5 py-1 rounded-lg border border-[#E4E4E7] self-start sm:self-auto">
                6 Verified Templates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all text-left flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-red-50/50 border-red-500 shadow-xs ring-1 ring-red-400"
                        : "bg-[#FAFAFA] border-[#E4E4E7] hover:border-zinc-300 hover:bg-white"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#E4E4E7] text-[#52525B]">
                          {tpl.category}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-red-600">
                          {tpl.slideCount} Slides
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-[#18181B] leading-snug">
                        {tpl.title}
                      </h3>
                      <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E4E4E7]/70 flex items-center justify-between text-[11px]">
                      <span className="text-[#71717A] capitalize flex items-center gap-1">
                        <span>Style:</span>
                        <strong className="text-[#18181B]">{tpl.recommendedStyle}</strong>
                      </span>
                      <span className={`font-bold ${isSelected ? "text-red-600" : "text-[#71717A]"}`}>
                        {isSelected ? "✓ Active" : "Use Template →"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GENERATOR FORM & CONFIGURATION */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="border-b border-[#F4F4F5] pb-3">
              <h2 className="text-base font-bold text-[#18181B] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-red-600" />
                <span>Presentation Parameters &amp; Content</span>
              </h2>
              <p className="text-xs text-[#71717A] mt-0.5">
                Customize topic, slide volume, target language, and visual presentation style.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Field 1: Topic */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider">
                  Presentation Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fire Safety Protocols & High-Rise Building Evacuation"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-[#E4E4E7] focus:border-red-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#18181B] transition-colors outline-hidden shadow-2xs"
                />
              </div>

              {/* Field 2: Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider">
                    Presentation Description &amp; Scope <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#A1A1AA] font-mono">
                    {description.length} chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize the core objectives, key safety procedures, target audience, and primary emergency takeaways..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-[#E4E4E7] focus:border-red-500 focus:bg-white rounded-xl p-3 text-xs sm:text-sm font-medium text-[#18181B] transition-colors outline-hidden shadow-2xs"
                />
              </div>

              {/* Selectors Row: Slide Count, Language, and Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {/* 1. Slide Count */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>Number of Slides</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 bg-[#F4F4F5] p-1 rounded-xl border border-[#E4E4E7]">
                    {SLIDE_COUNT_OPTIONS.map((count) => (
                      <button
                        type="button"
                        key={count}
                        onClick={() => setSlideCount(count)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                          slideCount === count
                            ? "bg-white text-red-600 shadow-xs border border-[#E4E4E7]"
                            : "text-[#71717A] hover:text-[#18181B]"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Recommended: 8 slides for awareness briefs, 10-12 for detailed training.
                  </p>
                </div>

                {/* 2. Presentation Language */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>Presentation Language</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[#F4F4F5] p-1 rounded-xl border border-[#E4E4E7]">
                    {LANGUAGES_CONFIG.map((lang) => (
                      <button
                        type="button"
                        key={lang.id}
                        onClick={() => setLanguage(lang.id)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
                          language === lang.id
                            ? "bg-white text-indigo-700 shadow-xs border border-[#E4E4E7]"
                            : "text-[#71717A] hover:text-[#18181B]"
                        }`}
                      >
                        <span className="text-[10px] text-[#A1A1AA]">{lang.flag}</span>
                        <span>{lang.native}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Full prompt synthesis in English, हिंदी, or मराठी.
                  </p>
                </div>

                {/* 3. Style Selector Dropdown/Quick View */}
                <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>Presentation Style</span>
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as PresentationStyle)}
                    className="w-full bg-[#FAFAFA] border border-[#E4E4E7] focus:border-red-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-[#18181B] transition-colors outline-hidden shadow-2xs h-10"
                  >
                    {STYLES_CONFIG.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label} ({s.badge})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Directs typography, color grading, and card layout in Gamma.
                  </p>
                </div>
              </div>

              {/* Style Cards Quick Selection */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#71717A]">
                  Style Visual Guide
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {STYLES_CONFIG.map((s) => {
                    const isSelected = style === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all text-left ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-600 shadow-xs ring-1 ring-indigo-400"
                            : "bg-[#FAFAFA] border-[#E4E4E7] hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">{s.icon}</span>
                          <span className="font-bold text-xs text-[#18181B]">{s.label}</span>
                        </div>
                        <p className="text-[11px] text-[#71717A] line-clamp-2 leading-tight">
                          {s.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-[#71717A]">
                  <span>Ready to compile {slideCount} slides in </span>
                  <strong className="text-[#18181B]">
                    {language === "hi" ? "Hindi (हिंदी)" : language === "mr" ? "Marathi (मराठी)" : "English"}
                  </strong>
                  <span> with </span>
                  <strong className="text-[#18181B] capitalize">{style}</strong>
                  <span> styling.</span>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{generationStep || "Generating Presentation..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Presentation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* 3. GENERATION RESULTS & PREVIEW SECTION                                  */}
          {/* ========================================================================= */}
          {result && (
            <div
              id="presentation-result-section"
              className="bg-white border-2 border-indigo-500/80 rounded-2xl p-5 sm:p-6 shadow-md space-y-5 animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F4F5] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                      {result.mode === "api" ? "Gamma API Generated" : "Gamma Prompt Ready"}
                    </span>
                    <span className="text-xs font-mono text-[#71717A]">
                      {result.slideCount} Cards • {result.language.toUpperCase()} • {result.style}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-[#18181B] mt-1">
                    {result.topic}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyPrompt(result.prompt, result.id)}
                    className="px-3.5 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    {copiedId === result.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#71717A]" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>

                  <a
                    href={result.gammaUrl || result.gammaWebUrl || "https://gamma.app/new"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Open Gamma</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* API Mode vs Manual Workflow Guidance */}
              {result.mode === "api" && result.gammaUrl ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <strong className="text-xs text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Presentation successfully created in Gamma!
                    </strong>
                    <p className="text-xs text-emerald-800">
                      You can view the interactive presentation, export to PowerPoint (.pptx), or share with your team.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={result.gammaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <span>View on Gamma</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {result.exportUrl && (
                      <a
                        href={result.exportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100 text-xs font-bold rounded-xl flex items-center gap-1.5"
                      >
                        <span>Download PPTX</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-xs text-amber-900">
                        Gamma Workflow: 2-Step Instant Deck Generation
                      </strong>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        Your presentation prompt has been synthesized with full structure, speaker notes, and emergency helpline cards. Follow these 2 quick steps:
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-amber-900">
                    <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200/80 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                        1
                      </span>
                      <span>
                        Click <strong>"Copy Prompt"</strong> above to copy the tailored presentation outline.
                      </span>
                    </div>
                    <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200/80 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                        2
                      </span>
                      <span>
                        Click <strong>"Open Gamma"</strong> → Choose <em>Paste in text</em> → Paste &amp; generate!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Synthesized Slide Cards Breakdown */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#18181B] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Synthesized Slide Breakdown ({result.slides?.length || 0} Cards)</span>
                  </h4>
                  <button
                    onClick={() => handleCopyPrompt(result.prompt, "prompt-full")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Raw Prompt</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.slides?.map((slide) => (
                    <div
                      key={slide.slideNumber}
                      className="p-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl space-y-2 hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[#E4E4E7] pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white border border-[#E4E4E7] px-2 py-0.5 rounded text-[#52525B]">
                          Card {slide.slideNumber}
                        </span>
                        <span className="text-[10px] font-mono text-[#71717A] truncate max-w-[150px]">
                          {result.style}
                        </span>
                      </div>

                      <h5 className="font-bold text-xs sm:text-sm text-[#18181B] leading-snug">
                        {slide.title}
                      </h5>

                      <ul className="space-y-1 text-xs text-[#52525B]">
                        {slide.keyPoints?.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-red-500 font-bold shrink-0">•</span>
                            <span className="leading-relaxed">{pt}</span>
                          </li>
                        ))}
                      </ul>

                      {slide.takeaway && (
                        <div className="p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 font-medium">
                          <strong>Takeaway:</strong> {slide.takeaway}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Raw Prompt View */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                    Complete Prompt Text (Ready for Gamma)
                  </span>
                  <button
                    onClick={() => handleCopyPrompt(result.prompt, "prompt-bottom")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedId === "prompt-bottom" ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-4 bg-[#18181B] text-[#F4F4F5] rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap selection:bg-red-500 selection:text-white">
                  {result.prompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRESENTATION HISTORY VIEW                                              */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F4F5] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#18181B] flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Generated Presentation History</span>
              </h2>
              <p className="text-xs text-[#71717A] mt-0.5">
                Saved presentations and tailored emergency prompts stored in your session.
              </p>
            </div>

            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="px-3.5 py-1.5 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-[#FAFAFA] border border-dashed border-[#E4E4E7] rounded-2xl">
              <Presentation className="w-10 h-10 text-[#A1A1AA] mx-auto" />
              <h3 className="text-sm font-bold text-[#18181B]">No presentations in history yet</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Select an emergency template or enter custom topic parameters in the Studio Generator to create your first presentation.
              </p>
              <button
                onClick={() => setActiveTab("create")}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Create Presentation Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => {
                const isSelected = selectedHistoryItem?.id === record.id;

                return (
                  <div
                    key={record.id}
                    className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                      isSelected
                        ? "bg-indigo-50/40 border-indigo-400 shadow-sm"
                        : "bg-white border-[#E4E4E7] hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              record.mode === "api"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-zinc-100 text-zinc-800 border-zinc-200"
                            }`}
                          >
                            {record.mode === "api" ? "API Generated" : "Prompt Created"}
                          </span>
                          <span className="text-xs font-bold text-[#18181B] bg-[#F4F4F5] px-2 py-0.5 rounded-lg">
                            {record.slideCount} Slides
                          </span>
                          <span className="text-xs font-bold text-[#52525B] bg-[#F4F4F5] px-2 py-0.5 rounded-lg capitalize">
                            {record.style}
                          </span>
                          <span className="text-[11px] font-mono text-[#71717A]">
                            {new Date(record.createdAt).toLocaleDateString()} at{" "}
                            {new Date(record.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-[#18181B] leading-snug">
                          {record.topic}
                        </h3>

                        <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed">
                          {record.description}
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#F4F4F5]">
                        <button
                          onClick={() => handleCopyPrompt(record.prompt, record.id)}
                          className="px-3 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] flex items-center gap-1.5 transition-colors"
                        >
                          {copiedId === record.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#71717A]" />
                              <span>Copy Prompt</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setSelectedHistoryItem(isSelected ? null : record)}
                          className="px-3 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-xl text-xs font-bold border border-[#E4E4E7] flex items-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#71717A]" />
                          <span>{isSelected ? "Hide Cards" : "View Cards"}</span>
                        </button>

                        <a
                          href={record.gammaUrl || "https://gamma.app/new"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <span>Open Gamma</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleDeleteHistory(record.id)}
                          className="p-2 text-[#71717A] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                          title="Delete history item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Slide Cards Preview */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-[#E4E4E7] space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#18181B]">
                            Presentation Structure ({record.slides?.length || 0} Cards)
                          </span>
                          <span className="text-[11px] font-mono text-[#71717A]">
                            Lang: {record.language.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {record.slides?.map((s) => (
                            <div
                              key={s.slideNumber}
                              className="p-3 bg-white border border-[#E4E4E7] rounded-xl space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-1">
                                <span className="font-bold text-[#18181B]">Card {s.slideNumber}</span>
                                <span className="text-[10px] text-[#A1A1AA] truncate max-w-[200px]">
                                  {s.title}
                                </span>
                              </div>
                              <ul className="space-y-0.5 text-[#52525B]">
                                {s.keyPoints?.slice(0, 3).map((kp, idx) => (
                                  <li key={idx} className="truncate">
                                    • {kp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
