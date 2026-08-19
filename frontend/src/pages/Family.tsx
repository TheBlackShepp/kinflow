import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Copy, Check, Home as HomeIcon, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Family } from "../lib/types";

export default function Family() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const createFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/family", { name: createName });
      await refreshUser();
      setCreateName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/family/join", { inviteCode: joinCode });
      await refreshUser();
      setJoinCode("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!user?.family?.inviteCode) return;
    await navigator.clipboard.writeText(user.family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user?.familyId || !user?.family) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("family.title")}</h1>
          <p className="text-sm text-slate-500">{t("family.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <form
            onSubmit={createFamily}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
              <HomeIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{t("family.createHome")}</h2>
            <p className="mb-4 text-sm text-slate-500">
              {t("family.createHomeDesc")}
            </p>
            {error && (
              <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t("family.homeNamePlaceholder")}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {t("family.createHomeButton")}
            </button>
          </form>

          <form
            onSubmit={joinFamily}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
              <UserPlus className="h-6 w-6 text-violet-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{t("family.joinHome")}</h2>
            <p className="mb-4 text-sm text-slate-500">
              {t("family.joinHomeDesc")}
            </p>
            {error && (
              <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <input
              type="text"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t("family.inviteCodePlaceholder")}
              maxLength={6}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm uppercase tracking-[0.3em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
            >
              {t("family.joinButton")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const family = user.family as Family;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("family.title")}</h1>
        <p className="text-sm text-slate-500">{t("family.homeAndCode")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <HomeIcon className="h-6 w-6" />
            <h2 className="text-lg font-bold">{family.name}</h2>
          </div>
          <p className="mt-4 text-sm text-emerald-50">{t("family.inviteCodeTitle")}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="rounded-2xl bg-white/20 px-6 py-4 text-3xl font-black tracking-[0.4em] backdrop-blur">
              {family.inviteCode}
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("family.copied") : t("family.copy")}
            </button>
          </div>
          <p className="mt-3 flex items-center gap-1 text-xs text-emerald-100">
            <ArrowRight className="h-3 w-3" />
            {t("family.shareCode")}
          </p>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800">{t("family.homeMembers")}</h2>
          </div>
          <ul className="space-y-3">
            {family.users?.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {member.name}
                    {member.id === user.id && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        {t("family.you")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{member.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
