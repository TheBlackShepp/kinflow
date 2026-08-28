import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import type { ShoppingList, ListType, ListVisibility } from "../lib/types";
import { getVISIBILITY_OPTIONS } from "../lib/listVisibility";
import { getLIST_TYPES, LIST_TYPE_ICON } from "../lib/listTypes";
import { LIST_COLORS } from "../lib/listColors";
import BottomSheet from "./BottomSheet";

const ICONS = ["shopping-bag", "pill", "apple", "home", "car", "baby"];

export default function EditListSheet({
  open,
  onClose,
  list,
}: {
  open: boolean;
  onClose: () => void;
  list: ShoppingList;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { updateList } = useData();
  const [step, setStep] = useState<"type" | "form">("type");
  const [editName, setEditName] = useState(list.name);
  const [editIcon, setEditIcon] = useState(list.icon || "shopping-bag");
  const [editColor, setEditColor] = useState(list.color || "emerald");
  const [editType, setEditType] = useState<ListType>(list.type ?? "shopping");
  const [editVis, setEditVis] = useState<ListVisibility>(list.visibility ?? "family");
  const [editMemberIds, setEditMemberIds] = useState<string[]>(
    list.members?.map((m) => m.userId) ?? []
  );
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const familyUsers = user?.family?.users ?? [];
  const LIST_TYPES = getLIST_TYPES();
  const VISIBILITY_OPTIONS = getVISIBILITY_OPTIONS();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      await updateList(list.id, {
        name: editName.trim(),
        icon: editIcon,
        color: editColor,
        type: editType,
        visibility: editVis,
        memberIds: editMemberIds,
      });
      onClose();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={step === "type" ? t("lists.editTypeTitle") : t("lists.editFormTitle")}
      onBack={step === "form" ? () => setStep("type") : undefined}
      step={step === "type" ? 1 : 2}
      steps={2}
    >
      {step === "type" ? (
        <div className="grid grid-cols-2 gap-3">
          {LIST_TYPES.map((t_item) => (
            <button
              key={t_item.value}
              type="button"
              onClick={() => {
                setEditType(t_item.value);
                setSaveError("");
                setStep("form");
              }}
              className={`flex flex-col items-center rounded-2xl border-2 p-4 text-center transition ${
                editType === t_item.value
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-slate-200 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              }`}
            >
              <span className="text-3xl">{t_item.icon}</span>
              <span className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t_item.label}</span>
              <span className="mt-0.5 text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                {t_item.description}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {saveError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">{saveError}</div>
          )}
          <button
            type="button"
            onClick={() => setStep("type")}
            className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-left transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
          >
            <span className="text-xl">{LIST_TYPE_ICON[editType]}</span>
            <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {LIST_TYPES.find((t_item) => t_item.value === editType)?.label}
            </span>
            <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {t("lists.change")}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("lists.listName")}</label>
            <input
              type="text"
              required
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t("lists.namePlaceholder")}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("lists.icon")}</label>
            <div className="flex gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setEditIcon(ic)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                    editIcon === ic
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {ic === "shopping-bag" && "🛒"}
                  {ic === "pill" && "💊"}
                  {ic === "apple" && "🍎"}
                  {ic === "home" && "🏠"}
                  {ic === "car" && "🚗"}
                  {ic === "baby" && "🍼"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("lists.color")}</label>
            <div className="grid grid-cols-6 gap-2">
              {LIST_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setEditColor(c.name)}
                  className={`flex h-9 w-full items-center justify-center rounded-xl border-2 transition ${
                    editColor === c.name
                      ? `${c.icon} ${c.ring} border-current`
                      : "border-transparent hover:opacity-80"
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full ${c.icon}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("lists.whoSeesIt")}</label>
            <div className="grid gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEditVis(opt.value)}
                  className={`rounded-xl border px-4 py-2.5 text-left transition ${
                    editVis === opt.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{opt.label}</span>
                  <span className="block text-xs text-slate-400 dark:text-slate-500">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>
          {editVis === "custom" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("lists.familyMembers")}
              </label>
              <div className="space-y-2">
                {familyUsers
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={editMemberIds.includes(u.id)}
                        onChange={(e) =>
                          setEditMemberIds((prev) =>
                            e.target.checked
                              ? [...prev, u.id]
                              : prev.filter((m) => m !== u.id)
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.name}</span>
                      <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{u.username}</span>
                    </label>
                  ))}
                {familyUsers.length <= 1 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t("lists.noOtherMembers")}
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? t("app.saving") : t("lists.saveChanges")}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
