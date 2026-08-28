import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Copy,
  Check,
  Home as HomeIcon,
  Link2,
  Loader2,
  ShieldCheck,
  Trash2,
  ChevronUp,
  UserCheck,
  UserMinus,
  AlertTriangle,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { MODULES } from "../lib/permissions";
import type { Module, ModuleLevel, UserPermissions } from "../lib/types";
import Modal from "../components/Modal";

const MODULE_LABEL_KEYS: Record<Module, string> = {
  lists: "family.permsLists",
  products: "family.permsProducts",
  recipes: "family.permsRecipes",
  meals: "family.permsMeals",
};

function defaultPermissions(): UserPermissions {
  return { lists: "full", products: "full", recipes: "full", meals: "full" };
}

function normalizedPermissions(perms?: UserPermissions | null): UserPermissions {
  return perms && Object.keys(perms).length > 0 ? { ...defaultPermissions(), ...perms } : defaultPermissions();
}

export default function Family() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [createName, setCreateName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copyInvite, setCopyInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpires, setInviteExpires] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [invites, setInvites] = useState<any[] | null>(null);
  const [permDrafts, setPermDrafts] = useState<Record<string, UserPermissions>>({});
  const [openPerms, setOpenPerms] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState("");
  const [confirmKick, setConfirmKick] = useState<any | null>(null);
  const [kickBusy, setKickBusy] = useState(false);

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

  const loadInvites = async () => {
    try {
      const data = await api.get<any[]>("/family/invites");
      setInvites(data);
    } catch {
      setInvites([]);
    }
  };

  useEffect(() => {
    if (user?.familyId && user.role === "admin") {
      loadInvites();
    }
  }, [user?.familyId, user?.role]);

  const generateInvite = async () => {
    setGenLoading(true);
    setInviteError("");
    setAdminNotice("");
    try {
      const data = await api.post<{ token: string; expiresAt: string }>("/family/invites");
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(link);
      setInviteExpires(data.expiresAt);
      await loadInvites();
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

  const revokeInvite = async (id: string) => {
    setActionBusy(id);
    setAdminNotice("");
    try {
      await api.delete(`/family/invites/${id}`);
      setInvites((prev) => prev?.filter((i) => i.id !== id) ?? []);
    } catch (err: any) {
      setAdminNotice(err.message || t("family.actionError"));
    } finally {
      setActionBusy(null);
    }
  };

  const openPermsFor = (memberId: string, perms?: UserPermissions | null) => {
    setPermDrafts((prev) => ({ ...prev, [memberId]: normalizedPermissions(perms ?? undefined) }));
    setOpenPerms((prev) => (prev === memberId ? null : memberId));
  };

  const setModuleLevel = (memberId: string, module: Module, level: ModuleLevel) => {
    setPermDrafts((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? defaultPermissions()), [module]: level },
    }));
  };

  const savePermissions = async (memberId: string) => {
    const draft = permDrafts[memberId];
    if (!draft) return;
    setSavingPerms(memberId);
    setAdminNotice("");
    try {
      await api.patch(`/family/members/${memberId}/permissions`, { permissions: draft });
      await refreshUser();
      setAdminNotice(t("family.permsSaved"));
    } catch (err: any) {
      setAdminNotice(err.message || t("family.actionError"));
    } finally {
      setSavingPerms(null);
      setOpenPerms(null);
    }
  };

  const toggleRole = async (memberId: string, newRole: "admin" | "member") => {
    setActionBusy(memberId);
    setAdminNotice("");
    try {
      await api.patch(`/family/members/${memberId}/role`, { role: newRole });
      await refreshUser();
    } catch (err: any) {
      setAdminNotice(err.message || t("family.actionError"));
    } finally {
      setActionBusy(null);
    }
  };

  const removeMember = async () => {
    if (!confirmKick) return;
    setKickBusy(true);
    setAdminNotice("");
    try {
      await api.delete(`/family/members/${confirmKick.id}`);
      await refreshUser();
      setConfirmKick(null);
    } catch (err: any) {
      setAdminNotice(err.message || t("family.actionError"));
    } finally {
      setKickBusy(false);
    }
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
  const members = family.users ?? [];

  return (
    <div className="space-y-6">
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-2xl sm:ring-1 sm:ring-slate-100 dark:sm:ring-slate-700">
        <img
          src="/images/family-banner.svg"
          alt={t("family.bannerAlt")}
          className="h-56 w-full object-cover sm:h-64"
        />
        <h1 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow-md sm:bottom-6 sm:left-8 sm:text-3xl">
          {family.name}
        </h1>
      </div>

      {adminNotice && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            adminNotice.startsWith(t("family.permsSaved"))
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {adminNotice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("family.homeMembers")}</h2>
            <span className="ml-auto rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-300">
              {members.length}
            </span>
          </div>

          <ul className="space-y-3">
            {members.map((member) => {
              const isSelf = member.id === user.id;
              const isMemberAdmin = member.role === "admin";
              const permDraft = permDrafts[member.id] ?? normalizedPermissions(member.permissions);
              const permsOpen = openPerms === member.id;
              return (
                <li key={member.id} className="rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span className="truncate">{member.name}</span>
                        {isSelf && (
                          <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {t("family.you")}
                          </span>
                        )}
                        {isMemberAdmin && (
                          <span className="rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            {t("family.admin")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{member.username}</p>
                    </div>

                    {isAdmin && !isSelf && (
                      <div className="flex shrink-0 items-center gap-1">
                        {!isMemberAdmin && (
                          <button
                            onClick={() => openPermsFor(member.id, member.permissions)}
                            className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400"
                            title={t("family.permissions")}
                          >
                            {permsOpen ? <ChevronUp className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmKick(member)}
                          className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                          title={t("family.kickMember")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isAdmin && !isSelf && (
                    <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 px-4 py-2.5">
                      {isMemberAdmin ? (
                        <button
                          onClick={() => toggleRole(member.id, "member")}
                          disabled={actionBusy === member.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 transition hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          {actionBusy === member.id ? t("family.saving") : t("family.demote")}
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleRole(member.id, "admin")}
                          disabled={actionBusy === member.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {actionBusy === member.id ? t("family.saving") : t("family.promote")}
                        </button>
                      )}
                    </div>
                  )}

                  {isAdmin && !isSelf && !isMemberAdmin && permsOpen && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                      {MODULES.map((mod) => (
                        <label key={mod} className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t(MODULE_LABEL_KEYS[mod])}
                          </span>
                          <select
                            value={permDraft[mod]}
                            onChange={(e) => setModuleLevel(member.id, mod, e.target.value as ModuleLevel)}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-2 text-sm outline-none focus:border-emerald-500 dark:text-slate-100"
                          >
                            <option value="full">{t("family.permsFull")}</option>
                            <option value="read">{t("family.permsRead")}</option>
                            <option value="none">{t("family.permsNone")}</option>
                          </select>
                        </label>
                      ))}
                      <button
                        onClick={() => savePermissions(member.id)}
                        disabled={savingPerms === member.id}
                        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {savingPerms === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {t("family.savePerms")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {isAdmin && (
          <div className="space-y-6">
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

              <div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("family.pendingInvites")}</h3>
                {invites === null ? (
                  <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">{t("family.loadingInvites")}</p>
                ) : invites.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">{t("family.noPendingInvites")}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {invites.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700/30 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                            {t("family.inviteFrom", { date: new Date(inv.createdAt).toLocaleDateString() })}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {t("family.inviteExpires")}: {new Date(inv.expiresAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          disabled={actionBusy === inv.id}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                          {actionBusy === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          {t("family.revoke")}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <Modal
        open={!!confirmKick}
        onClose={() => setConfirmKick(null)}
        title={t("family.kickTitle")}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t("family.kickDesc", { name: confirmKick?.name ?? "" })}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setConfirmKick(null)}
            className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-700/50 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t("app.cancel")}
          </button>
          <button
            onClick={removeMember}
            disabled={kickBusy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {kickBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t("family.kickConfirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
