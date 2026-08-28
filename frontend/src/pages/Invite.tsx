import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth";
import AuthShell from "../components/AuthShell";

type VerifyState =
  | { status: "loading" }
  | { status: "ok"; familyId: string; familyName: string }
  | { status: "expired" }
  | { status: "used" }
  | { status: "notfound" }
  | { status: "error" };

export default function Invite() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const { registerViaInvite } = useAuth();
  const navigate = useNavigate();
  const [verify, setVerify] = useState<VerifyState>({ status: "loading" });
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        if (active) setVerify({ status: "notfound" });
        return;
      }
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL ?? ""}/api/family/invites/${encodeURIComponent(token)}/verify`
        );
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.status === 410) setVerify({ status: "expired" });
        else if (res.status === 404) setVerify({ status: "notfound" });
        else if (!res.ok) setVerify({ status: "used" });
        else setVerify({ status: "ok", familyId: data.familyId, familyName: data.familyName });
      } catch {
        if (active) setVerify({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      await registerViaInvite(name, username, password, token);
      navigate("/family");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verify.status === "loading") {
    return (
      <AuthShell title={t("invite.title")} subtitle={t("invite.loading")}>
        <div className="py-4 text-center text-sm text-slate-400">{t("app.loading")}</div>
      </AuthShell>
    );
  }

  if (verify.status === "expired") {
    return (
      <AuthShell title={t("invite.title")} subtitle={t("invite.expired")}>
        <Link to="/login" className="mt-4 inline-block rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
          {t("invite.backToLogin")}
        </Link>
      </AuthShell>
    );
  }

  if (verify.status === "used") {
    return (
      <AuthShell title={t("invite.title")} subtitle={t("invite.used")}>
        <Link to="/login" className="mt-4 inline-block rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
          {t("invite.backToLogin")}
        </Link>
      </AuthShell>
    );
  }

  if (verify.status === "notfound" || verify.status === "error") {
    return (
      <AuthShell title={t("invite.title")} subtitle={t("invite.notFound")}>
        <Link to="/login" className="mt-4 inline-block rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
          {t("invite.backToLogin")}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("invite.title")} subtitle={t("invite.subtitle")}>
      <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        {t("invite.invitedTo", { name: verify.familyName })}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? t("auth.register.submitting") : t("invite.submit")}
        </button>
      </form>
    </AuthShell>
  );
}
