import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Copy, Check, Home as HomeIcon, Link2, ArrowRight, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Family() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [createName, setCreateName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyInvite, setCopyInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpires, setInviteExpires] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

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

  const copyCode = async () => {
    if (!user?.family?.inviteCode) return;
    await navigator.clipboard.writeText(user.family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateInvite = async () => {
    setGenLoading(true);
    setInviteError("");
    try {
      const data = await api.post<{ token: string; expiresAt: string }>("/family/invites");
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(link);
      setInviteExpires(data.expiresAt);
    } catch (err: any) {
      setInviteError(err.message || t("family.inviteError"));
    } finally {
      setGenLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopyInvite(true);
    setTimeout(() => setCopyInvite(false), 2000);
  };

  if (!user?.familyId || !user?.family) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("family.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("family.subtitle")}</p>
        </div>

        <form
          onSubmit={createFamily}
          className="max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/20">
            <HomeIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t("family.createHome")}</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {t("family.createHomeDesc")}
          </p>
          {error && (
            <div className="mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <input
            type="text"
            required
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={t("family.homeNamePlaceholder")}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-500 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            {t("family.createHomeButton")}
          </button>
        </form>
      </div>
    );
  }

  const family = user.family;
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("family.title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("family.homeAndCode")}</p>
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

        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("family.homeMembers")}</h2>
          </div>
          <ul className="space-y-3">
            {family.users?.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {member.name}
                    {member.id === user.id && (
                      <span className="ml-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {t("family.you")}
                      </span>
                    )}
                    {member.role === "admin" && (
                      <span className="ml-2 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        {t("family.admin")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{member.username}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {isAdmin && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("family.inviteMembers")}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("family.inviteMembersDesc")}</p>

          {!inviteLink ? (
            <button
              onClick={generateInvite}
              disabled={genLoading}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {genLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {genLoading ? t("family.generating") : t("family.generateInvite")}
            </button>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("family.inviteLinkTitle")}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  readOnly
                  value={inviteLink}
                  className="w-full flex-1 rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200"
                />
                <button
                  onClick={copyInviteLink}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  {copyInvite ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copyInvite ? t("family.copied") : t("family.copy")}
                </button>
              </div>
              {inviteExpires && (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  {t("family.inviteExpires")}: {new Date(inviteExpires).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {inviteError && (
            <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {inviteError}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
