import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home as HomeIcon, User as UserIcon, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import AuthShell from "../components/AuthShell";

export default function Register() {
  const { t } = useTranslation();
  const { user, register, refreshUser } = useAuth();
  const navigate = useNavigate();

  const resumeAtHome = !!user && !user.familyId;
  const [step, setStep] = useState<0 | 1>(resumeAtHome ? 1 : 0);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [homeName, setHomeName] = useState(user?.family?.name ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      await register(name, username, password);
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHome = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!homeName.trim()) return;
    setLoading(true);
    try {
      await api.post("/family", { name: homeName.trim() });
      await refreshUser();
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={step === 0 ? t("auth.register.title") : t("auth.register.homeTitle")}
      subtitle={step === 0 ? t("auth.register.subtitle") : t("auth.register.homeDesc")}
    >
      <div className="mb-6 flex items-center justify-center gap-3">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            step === 0
              ? "bg-emerald-500 text-white"
              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          {t("auth.register.stepUser")}
        </div>
        <div className="h-px w-6 bg-slate-300 dark:bg-slate-600" />
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            step === 1
              ? "bg-emerald-500 text-white"
              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}
        >
          <HomeIcon className="h-3.5 w-3.5" />
          {t("auth.register.stepHome")}
        </div>
      </div>

      {step === 0 ? (
        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.register.name")}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder={t("auth.register.namePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.register.username")}</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder={t("auth.register.usernamePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.register.password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder={t("auth.register.passwordPlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.register.confirmPassword")}</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder={t("auth.register.confirmPasswordPlaceholder")}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t("auth.register.next")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t("auth.register.hasAccount")}{" "}
            <Link to="/login" className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
              {t("auth.register.login")}
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleCreateHome} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          {!resumeAtHome && (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("app.back")}
            </button>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("app.home")}</label>
            <input
              type="text"
              required
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder={t("auth.register.homePlaceholder")}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t("auth.register.finish")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
