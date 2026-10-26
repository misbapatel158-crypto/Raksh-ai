export type LanguageCode =
  | "en"
  | "hi"
  | "mr"
  | "bn"
  | "gu"
  | "ta"
  | "te"
  | "kn"
  | "ml"
  | "pa"
  | "or"
  | "as"
  | "ur";

export interface LanguageMeta {
  code: LanguageCode;
  name: string;        // English name
  nativeName: string;  // Native script name
  direction: "ltr" | "rtl";
  speechCode: string;  // BCP-47 for SpeechSynthesis / Recognition
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr", speechCode: "en-IN", region: "India / International" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", speechCode: "hi-IN", region: "National / North India" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", direction: "ltr", speechCode: "mr-IN", region: "Maharashtra" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr", speechCode: "bn-IN", region: "West Bengal / Tripura" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", direction: "ltr", speechCode: "gu-IN", region: "Gujarat" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", direction: "ltr", speechCode: "ta-IN", region: "Tamil Nadu / Puducherry" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", direction: "ltr", speechCode: "te-IN", region: "Andhra Pradesh / Telangana" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", direction: "ltr", speechCode: "kn-IN", region: "Karnataka" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", direction: "ltr", speechCode: "ml-IN", region: "Kerala / Lakshadweep" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", direction: "ltr", speechCode: "pa-IN", region: "Punjab" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", direction: "ltr", speechCode: "or-IN", region: "Odisha" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", direction: "ltr", speechCode: "as-IN", region: "Assam" },
  { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl", speechCode: "ur-IN", region: "Telangana / J&K / National" },
];
