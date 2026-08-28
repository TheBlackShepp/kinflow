import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth";
import AuthShell from "../components/AuthShell";

export default function Login() {
  const { t } = useTranslation();
  const { login, checkStatus } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState(true);

  useEffect(() => {
    let active = true;
    checkStatus()
      .then((s) => {
        if (!active) return;
        if (!s.hasUsers) {
          navigate("/register", { replace: true });
        } else {
          setHasUsers(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [checkStatus, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.login.username")}</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder={t("auth.login.usernamePlaceholder")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.login.password")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
        {hasUsers === false && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t("auth.login.noAccount")}{" "}
            <Link to="/register" className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
              {t("auth.login.register")}
            </Link>
          </p>
        )}
      </form>
    </AuthShell>
  );
}
