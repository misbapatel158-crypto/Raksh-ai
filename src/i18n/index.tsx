import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LanguageCode, LanguageMeta, SUPPORTED_LANGUAGES } from "./types";

import en from "../locales/en.json";
import hi from "../locales/hi.json";
import mr from "../locales/mr.json";
import bn from "../locales/bn.json";
import gu from "../locales/gu.json";
import ta from "../locales/ta.json";
import te from "../locales/te.json";
import kn from "../locales/kn.json";
import ml from "../locales/ml.json";
import pa from "../locales/pa.json";
import orLocale from "../locales/or.json";
import asLocale from "../locales/as.json";
import ur from "../locales/ur.json";

const TRANSLATIONS: Record<LanguageCode, Record<string, any>> = {
  en,
  hi,
  mr,
  bn,
  gu,
  ta,
  te,
  kn,
  ml,
  pa,
  or: orLocale,
  as: asLocale,
  ur,
};

const STORAGE_KEY = "resqai_preferred_language";

interface I18nContextType {
  language: LanguageCode;
  currentLanguageMeta: LanguageMeta;
  supportedLanguages: LanguageMeta[];
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  dir: "ltr" | "rtl";
  speak: (text: string) => void;
  stopVoice: () => void;
  isSpeaking: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    // Browser language detection
    const browserLang = navigator.language.split("-")[0].toLowerCase();
    const matched = SUPPORTED_LANGUAGES.find((l) => l.code === browserLang);
    if (matched) return matched.code;
  } catch (e) {
    console.warn("Could not retrieve saved language preference:", e);
  }
  return "en";
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const currentMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const setLanguage = useCallback((newLang: LanguageCode) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === newLang)) return;
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn("Could not persist language preference to localStorage:", e);
    }
  }, []);

  // Update HTML document attributes for accessibility & RTL
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = currentMeta.direction;
    if (language === "ur") {
      document.body.classList.add("rtl-mode");
    } else {
      document.body.classList.remove("rtl-mode");
    }
  }, [language, currentMeta.direction]);

  // Voice speech synthesis in the active language
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentMeta.speechCode;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Try to pick a native voice if available in the browser
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(
          (v) =>
            v.lang === currentMeta.speechCode ||
            v.lang.startsWith(language)
        );
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis notice:", err);
        setIsSpeaking(false);
      }
    },
    [currentMeta.speechCode, language]
  );

  const stopVoice = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } catch {
        // ignore
      }
    }
  }, []);

  // Translation function with deep lookup & fallback to English
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const keys = key.split(".");
      
      // Helper to traverse object
      const lookup = (dict: Record<string, any>): any => {
        let curr: any = dict;
        for (const k of keys) {
          if (curr && typeof curr === "object" && k in curr) {
            curr = curr[k];
          } else {
            return undefined;
          }
        }
        return curr;
      };

      // 1. Try active language
      const targetDict = TRANSLATIONS[language] || TRANSLATIONS.en;
      let val = lookup(targetDict);

      // 2. If missing, try English fallback
      if (val === undefined && language !== "en") {
        val = lookup(TRANSLATIONS.en);
      }

      if (typeof val === "string") return val;
      if (val !== undefined && val !== null) return String(val);

      return fallback !== undefined ? fallback : key;
    },
    [language]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        currentLanguageMeta: currentMeta,
        supportedLanguages: SUPPORTED_LANGUAGES,
        setLanguage,
        t,
        dir: currentMeta.direction,
        speak,
        stopVoice,
        isSpeaking,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, language, setLanguage, currentLanguageMeta, supportedLanguages, dir, speak, stopVoice, isSpeaking } = useI18n();
  return { t, language, setLanguage, currentLanguageMeta, supportedLanguages, dir, speak, stopVoice, isSpeaking };
}
