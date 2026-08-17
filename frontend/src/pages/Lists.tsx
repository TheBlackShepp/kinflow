import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, AlertCircle, Lock, Users, ChevronRight } from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import type { ListType, ListVisibility } from "../lib/types";
import { VISIBILITY_OPTIONS } from "../lib/listVisibility";
import { LIST_TYPES, LIST_TYPE_ICON } from "../lib/listTypes";
import BottomSheet from "../components/BottomSheet";

const ICONS = ["shopping-bag", "pill", "apple", "home", "car", "baby"];

function VisibilityBadge({ visibility }: { visibility?: ListVisibility }) {
  if (visibility === "private") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
        <Lock className="h-3 w-3" />
        Privada
      </span>
    );
  }
  if (visibility === "custom") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
        <Users className="h-3 w-3" />
        Compartida
      </span>
    );
  }
  return null;
}

export default function Lists() {
  const { user } = useAuth();
  const { lists, ready, createList, deleteList } = useData();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"type" | "form">("type");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [type, setType] = useState<ListType>("shopping");
  const [visibility, setVisibility] = useState<ListVisibility>("family");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<ListType | "all">("all");
  const [error, setError] = useState("");

  const familyUsers = user?.family?.users ?? [];
  const filteredLists =
    typeFilter === "all"
      ? lists
      : lists.filter((l) => (l.type ?? "shopping") === typeFilter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const list = await createList(name, icon, type, visibility, memberIds);
      setCreateOpen(false);
      setCreateStep("type");
      setName("");
      setIcon(ICONS[0]);
      setType("shopping");
      setVisibility("family");
      setMemberIds([]);
      navigate(`/lists/${list.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta lista?")) return;
    await deleteList(id);
  };

  if (!user?.familyId) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-700">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6" />
          <p className="font-medium">
            Necesitas un hogar para crear listas.{" "}
            <Link to="/family" className="underline">
              Configurar hogar
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
        <img
          src="/images/list-banner.svg"
          alt="Listas de compras"
          className="h-48 w-full object-cover sm:h-64"
        />
        <h1 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow-md sm:bottom-6 sm:left-8 sm:text-3xl">
        Listas
      </h1>
      </div>

      {!ready ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <span className="mx-auto mb-3 block h-10 w-10 text-3xl">📝</span>
          <p className="font-medium text-slate-600">Aún no hay listas</p>
          <p className="text-sm text-slate-400">Crea tu primera lista</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                typeFilter === "all"
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              Todas
            </button>
            {LIST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  typeFilter === t.value
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLists.map((list) => {
              const total = list.items.length;
              const done = list.items.filter((i) => i.completed).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const listType = list.type ?? "shopping";
              return (
                <div
                  key={list.id}
                  className="group relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                >
                  <Link to={`/lists/${list.id}`} className="block">
                    <div className="flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-xl">
                        {LIST_TYPE_ICON[listType]}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {pct}%
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-800">{list.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs text-slate-400">
                        {total} artículo{total !== 1 && "s"}
                      </p>
                      <VisibilityBadge visibility={list.visibility} />
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    title="Eliminar lista"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          {filteredLists.length === 0 && (
            <p className="text-center text-sm text-slate-400">
              No hay listas de este tipo todavía.
            </p>
          )}
        </>
      )}

      <button
        onClick={() => {
          setCreateStep("type");
          setError("");
          setCreateOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-1 ring-emerald-600 transition hover:bg-emerald-600 hover:shadow-xl"
        aria-label="Nueva lista"
      >
        <Plus className="h-7 w-7" />
      </button>

      <BottomSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createStep === "type" ? "¿Qué tipo de lista?" : "Nueva lista"}
        onBack={createStep === "form" ? () => setCreateStep("type") : undefined}
        step={createStep === "type" ? 1 : 2}
        steps={2}
      >
        {createStep === "type" ? (
          <div className="grid grid-cols-2 gap-3">
            {LIST_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setType(t.value);
                  setError("");
                  setCreateStep("form");
                }}
                className="flex flex-col items-center rounded-2xl border-2 border-slate-200 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="text-3xl">{t.icon}</span>
                <span className="mt-2 text-sm font-semibold text-slate-700">{t.label}</span>
                <span className="mt-0.5 text-[11px] leading-tight text-slate-400">
                  {t.description}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <button
              type="button"
              onClick={() => setCreateStep("type")}
              className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left transition hover:bg-emerald-100"
            >
              <span className="text-xl">{LIST_TYPE_ICON[type]}</span>
              <span className="flex-1 text-sm font-semibold text-slate-700">
                {LIST_TYPES.find((t) => t.value === type)?.label}
              </span>
              <span className="flex items-center text-xs font-medium text-emerald-600">
                Cambiar
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Supermercado, Farmacia, Fretería..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Icono</label>
              <div className="flex gap-2">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                      icon === ic
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 text-slate-400 hover:bg-slate-50"
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
              <label className="mb-1 block text-sm font-medium text-slate-700">¿Quién la ve?</label>
              <div className="grid gap-2">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`rounded-xl border px-4 py-2.5 text-left transition ${
                      visibility === opt.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-medium text-slate-700">{opt.label}</span>
                    <span className="block text-xs text-slate-400">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>
            {visibility === "custom" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Miembros de la familia
                </label>
                <div className="space-y-2">
                  {familyUsers
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={memberIds.includes(u.id)}
                          onChange={(e) =>
                            setMemberIds((prev) =>
                              e.target.checked
                                ? [...prev, u.id]
                                : prev.filter((m) => m !== u.id)
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{u.name}</span>
                        <span className="ml-auto text-xs text-slate-400">{u.email}</span>
                      </label>
                    ))}
                  {familyUsers.length <= 1 && (
                    <p className="text-xs text-slate-400">
                      No hay otros miembros en el hogar todavía.
                    </p>
                  )}
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Crear lista
            </button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
