import React, { useState } from "react";
import { X, Lock, Mail, User as UserIcon, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { api } from "../services/api";
import { User } from "../types";
import { useTranslation } from "../i18n";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        if (res.success && res.data?.user) {
          onSuccess(res.data.user);
          onClose();
        } else {
          setError(res.message || "Invalid login credentials.");
        }
      } else {
        const res = await api.signup({
          name,
          email,
          password,
          phoneNumber: phoneNumber || undefined,
          countryCode: countryCode || undefined,
        });
        if (res.success && res.data?.user) {
          onSuccess(res.data.user);
          onClose();
        } else {
          setError(res.message || "Failed to create account.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setIsLogin(true);
    setEmail("demo@rakshai.org");
    setPassword("RakshAI123");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-white border border-[#E4E4E7] rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 relative"
      >
        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#71717A] hover:text-[#18181B] rounded-lg hover:bg-[#F4F4F5] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#FEE2E2] border border-red-200 text-[#EF4444] mb-3 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#18181B] tracking-tight">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h3>
          <p className="text-xs text-[#71717A] mt-1">
            {isLogin
              ? t("auth.accessProfile")
              : t("auth.setupFastSos")}
          </p>
        </div>

        {/* Demo Fast Fill Button */}
        <button
          id="btn-fill-demo-credentials"
          type="button"
          onClick={fillDemoCredentials}
          className="w-full mb-5 py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>{t("auth.demoCreds")}</span>
        </button>

        {error && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1.5">
                {t("auth.fullName")}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-auth-name"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#18181B] placeholder-[#A1A1AA] font-medium focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1.5">
              {t("auth.email")}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-auth-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#18181B] placeholder-[#A1A1AA] font-medium focus:bg-white focus:outline-none focus:border-[#18181B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1.5">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-auth-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-[#18181B] placeholder-[#A1A1AA] font-medium focus:bg-white focus:outline-none focus:border-[#18181B]"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1.5">
                  {t("contacts.code")}
                </label>
                <input
                  id="input-auth-country-code"
                  type="text"
                  placeholder="+91"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl px-3 py-2.5 text-sm text-[#18181B] font-bold focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1.5">
                  {t("contacts.phone")}
                </label>
                <input
                  id="input-auth-phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] font-mono font-bold focus:bg-white focus:outline-none focus:border-[#18181B]"
                />
              </div>
            </div>
          )}

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#18181B] hover:bg-zinc-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              t("auth.signIn")
            ) : (
              t("auth.createAccount")
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs text-[#71717A]">
          {isLogin ? (
            <span>
              {t("auth.noAccount")}{" "}
              <button
                id="btn-toggle-signup"
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                }}
                className="text-[#18181B] hover:underline font-bold underline-offset-2 ml-1"
              >
                {t("auth.signUpNow")}
              </button>
            </span>
          ) : (
            <span>
              {t("auth.alreadyHaveAccount")}{" "}
              <button
                id="btn-toggle-login"
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                }}
                className="text-[#18181B] hover:underline font-bold underline-offset-2 ml-1"
              >
                {t("auth.signInNow")}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

