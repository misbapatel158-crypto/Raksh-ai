import React, { useState } from "react";
import { Sparkles, Bot, Volume2, VolumeX, AlertTriangle, ShieldCheck, HeartPulse, Flame, Car, HelpCircle, Activity } from "lucide-react";
import { useTranslation } from "../i18n";

export const AiEmergencyAssistant: React.FC = () => {
  const { t, language, speak, stopVoice, isSpeaking } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    priority: "CRITICAL" | "HIGH" | "MODERATE";
    priorityLabel: string;
    condition: string;
    recommendedAction: string;
    firstAid: string[];
  } | null>(null);

  const handleRunAnalysis = (overrideText?: string) => {
    const textToAnalyze = (overrideText || inputText).trim().toLowerCase();
    if (!textToAnalyze) return;

    setIsAnalyzing(true);
    stopVoice();

    // Simulate smart AI emergency triage analysis (fully offline functional)
    setTimeout(() => {
      let priority: "CRITICAL" | "HIGH" | "MODERATE" = "HIGH";
      let priorityLabel = t("aiAssistant.highPriority");
      let condition = "General Emergency Assessment";
      let recommendedAction = "";
      let firstAid: string[] = [];

      if (
        textToAnalyze.includes("accident") ||
        textToAnalyze.includes("collision") ||
        textToAnalyze.includes("crash") ||
        textToAnalyze.includes("दुर्घटना") ||
        textToAnalyze.includes("अपघात") ||
        textToAnalyze.includes("দুর্ঘটনা") ||
        textToAnalyze.includes("અકસ્માત") ||
        textToAnalyze.includes("விபத்து") ||
        textToAnalyze.includes("ప్రమాదం") ||
        textToAnalyze.includes("ಅಪಘಾತ") ||
        textToAnalyze.includes("റോഡപകടം") ||
        textToAnalyze.includes("ਹਾਦਸਾ") ||
        textToAnalyze.includes("ଦୁର୍ଘଟଣା") ||
        textToAnalyze.includes("حادثہ")
      ) {
        priority = "CRITICAL";
        priorityLabel = t("aiAssistant.criticalPriority");
        condition = t("emergencyTypes.ROAD_ACCIDENT");
        recommendedAction = t("emergencyTypes.ROAD_ACCIDENT_plan1");
        firstAid = [
          t("emergencyTypes.ROAD_ACCIDENT_plan2"),
          t("emergencyTypes.ROAD_ACCIDENT_plan3"),
          t("emergency.toastShared"),
        ];
      } else if (
        textToAnalyze.includes("chest") ||
        textToAnalyze.includes("heart") ||
        textToAnalyze.includes("cardiac") ||
        textToAnalyze.includes("दर्द") ||
        textToAnalyze.includes("हार्ट") ||
        textToAnalyze.includes("छातीत") ||
        textToAnalyze.includes("বুক") ||
        textToAnalyze.includes("છાતી") ||
        textToAnalyze.includes("நெஞ்சு") ||
        textToAnalyze.includes("ఛాతీ") ||
        textToAnalyze.includes("ಎದೆ") ||
        textToAnalyze.includes("നെഞ്ചു") ||
        textToAnalyze.includes("دل")
      ) {
        priority = "CRITICAL";
        priorityLabel = t("aiAssistant.criticalPriority");
        condition = t("emergencyTypes.MEDICAL");
        recommendedAction = t("emergencyTypes.MEDICAL_plan1");
        firstAid = [
          t("emergencyTypes.MEDICAL_plan2"),
          t("emergencyTypes.MEDICAL_plan3"),
        ];
      } else if (
        textToAnalyze.includes("fire") ||
        textToAnalyze.includes("smoke") ||
        textToAnalyze.includes("flame") ||
        textToAnalyze.includes("आग") ||
        textToAnalyze.includes("धुआं") ||
        textToAnalyze.includes("धूर") ||
        textToAnalyze.includes("জুই") ||
        textToAnalyze.includes("தீ") ||
        textToAnalyze.includes("మంటలు") ||
        textToAnalyze.includes("ಬೆಂಕಿ") ||
        textToAnalyze.includes("തീ") ||
        textToAnalyze.includes("ਅੱਗ") ||
        textToAnalyze.includes("ନିଆଁ") ||
        textToAnalyze.includes("آگ")
      ) {
        priority = "CRITICAL";
        priorityLabel = t("aiAssistant.criticalPriority");
        condition = t("emergencyTypes.FIRE");
        recommendedAction = t("emergencyTypes.FIRE_plan1");
        firstAid = [
          t("emergencyTypes.FIRE_plan2"),
          t("emergencyTypes.FIRE_plan3"),
        ];
      } else {
        priority = "HIGH";
        priorityLabel = t("aiAssistant.highPriority");
        condition = t("emergencyTypes.OTHER");
        recommendedAction = t("emergencyTypes.OTHER_plan1");
        firstAid = [
          t("emergencyTypes.OTHER_plan2"),
          t("emergencyTypes.OTHER_plan3"),
        ];
      }

      setAnalysisResult({
        priority,
        priorityLabel,
        condition,
        recommendedAction,
        firstAid,
      });
      setIsAnalyzing(false);
    }, 450);
  };

  const handleSpeakOutput = () => {
    if (!analysisResult) return;
    if (isSpeaking) {
      stopVoice();
      return;
    }

    const textToRead = `${analysisResult.condition}. ${analysisResult.priorityLabel}. ${analysisResult.recommendedAction}. ${analysisResult.firstAid.join(". ")}`;
    speak(textToRead);
  };

  const handleQuickScenario = (text: string) => {
    setInputText(text);
    handleRunAnalysis(text);
  };

  return (
    <div id="ai-emergency-assistant-card" className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F4F5] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18181B] flex items-center gap-2">
              <span>{t("aiAssistant.title")}</span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Multilingual AI
              </span>
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              {t("aiAssistant.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Scenario Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider block">
          {t("aiAssistant.quickScenarios")}:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickScenario(t("aiAssistant.scenarioRoad"))}
            className="px-3 py-1.5 bg-[#F4F4F5] hover:bg-zinc-200 border border-[#E4E4E7] rounded-xl text-xs font-semibold text-[#18181B] flex items-center gap-1.5 transition-colors"
          >
            <Car className="w-3.5 h-3.5 text-rose-600" />
            <span>{t("aiAssistant.scenarioRoad")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickScenario(t("aiAssistant.scenarioChest"))}
            className="px-3 py-1.5 bg-[#F4F4F5] hover:bg-zinc-200 border border-[#E4E4E7] rounded-xl text-xs font-semibold text-[#18181B] flex items-center gap-1.5 transition-colors"
          >
            <HeartPulse className="w-3.5 h-3.5 text-red-600" />
            <span>{t("aiAssistant.scenarioChest")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickScenario(t("aiAssistant.scenarioFire"))}
            className="px-3 py-1.5 bg-[#F4F4F5] hover:bg-zinc-200 border border-[#E4E4E7] rounded-xl text-xs font-semibold text-[#18181B] flex items-center gap-1.5 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>{t("aiAssistant.scenarioFire")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickScenario(t("aiAssistant.scenarioBleed"))}
            className="px-3 py-1.5 bg-[#F4F4F5] hover:bg-zinc-200 border border-[#E4E4E7] rounded-xl text-xs font-semibold text-[#18181B] flex items-center gap-1.5 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-purple-600" />
            <span>{t("aiAssistant.scenarioBleed")}</span>
          </button>
        </div>
      </div>

      {/* Input Form */}
      <div className="space-y-3 pt-1">
        <textarea
          id="ai-triage-input"
          rows={2}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t("aiAssistant.inputPlaceholder")}
          className="w-full bg-[#FAFAFA] border border-[#E4E4E7] focus:border-purple-500 focus:bg-white rounded-xl p-3 text-xs sm:text-sm text-[#18181B] font-medium resize-none transition-all"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{t("aiAssistant.disclaimer")}</span>
          </p>

          <button
            id="btn-run-ai-triage"
            type="button"
            disabled={isAnalyzing || !inputText.trim()}
            onClick={() => handleRunAnalysis()}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? t("aiAssistant.analyzing") : t("aiAssistant.analyzeBtn")}</span>
          </button>
        </div>
      </div>

      {/* AI Assessment Result Card */}
      {analysisResult && (
        <div
          id="ai-triage-assessment-box"
          className="p-4 sm:p-5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3.5 animate-in fade-in"
        >
          <div className="flex items-center justify-between gap-2 border-b border-purple-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-purple-950">
                {t("aiAssistant.assessmentTitle")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase">
                {analysisResult.priorityLabel}
              </span>
            </div>

            <button
              id="btn-speak-ai-guidance"
              onClick={handleSpeakOutput}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isSpeaking
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-purple-200/80 hover:bg-purple-300 text-purple-900"
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>{t("aiAssistant.voiceStop")}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{t("aiAssistant.voiceSpeak")}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-purple-100 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-purple-800 tracking-wider">
                {t("aiAssistant.recommendedDispatch")}
              </span>
              <p className="text-xs font-bold text-[#18181B]">
                {analysisResult.recommendedAction}
              </p>
            </div>

            <div className="p-3 bg-white border border-purple-100 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-purple-800 tracking-wider">
                {t("aiAssistant.firstAidTips")}
              </span>
              <ul className="text-xs text-[#52525B] font-medium space-y-1 list-disc list-inside">
                {analysisResult.firstAid.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
