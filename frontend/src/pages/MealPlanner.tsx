import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBasket,
  Plus,
  X,
  Check,
  UtensilsCrossed,
  AlertCircle,
  CalendarDays,
  List,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useData } from "../lib/store";
import { MEAL_TYPES } from "../lib/types";
import Modal from "../components/Modal";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MEAL_CARD_STYLES: Record<string, { card: string; badge: string; chip: string }> = {
  Desayuno: {
    card: "border-amber-400 bg-amber-50/60",
    badge: "text-amber-600",
    chip: "bg-amber-100 text-amber-700 ring-amber-300",
  },
  Almuerzo: {
    card: "border-emerald-400 bg-emerald-50/60",
    badge: "text-emerald-600",
    chip: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  },
  Cena: {
    card: "border-indigo-400 bg-indigo-50/60",
    badge: "text-indigo-600",
    chip: "bg-indigo-100 text-indigo-700 ring-indigo-300",
  },
  Snack: {
    card: "border-pink-400 bg-pink-50/60",
    badge: "text-pink-600",
    chip: "bg-pink-100 text-pink-700 ring-pink-300",
  },
};

function dateLabel(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function MealPlanner() {
  const { user } = useAuth();
  const {
    ready,
    mealPlans,
    recipes,
    lists,
    setMealPlan,
    deleteMealPlan,
    exportIngredients,
  } = useData();
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));

  const [cell, setCell] = useState<{ date: string; mealType: string } | null>(null);
  const [recipeId, setRecipeId] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  const [exportOpen, setExportOpen] = useState(false);
  const [exportMealIds, setExportMealIds] = useState<string[]>([]);
  const [exportListId, setExportListId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    listId: string;
    listName: string;
    ingredients: { name: string; quantity: string }[];
  } | null>(null);
  const [exportError, setExportError] = useState("");

  const dates = useMemo(() => {
    if (view === "week") {
      const weekDates = Array.from({ length: 7 }, (_, i) => toISO(addDays(anchor, i)));
      return { weekDates, start: weekDates[0], end: weekDates[6] };
    }
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    return { weekDates: [], start: toISO(first), end: toISO(last) };
  }, [view, anchor]);

  const openCell = (date: string, mealType: string) => {
    setRecipeId("");
    setCustomTitle("");
    setCell({ date, mealType });
  };

  const saveCell = async () => {
    if (!cell) return;
    await setMealPlan({
      date: cell.date,
      mealType: cell.mealType,
      recipeId: recipeId || undefined,
      customTitle: customTitle || undefined,
    });
    setRecipeId("");
    setCustomTitle("");
  };

  const cellMeals = cell
    ? mealPlans.filter((m) => m.date === cell.date && m.mealType === cell.mealType)
    : [];

  const rangeLabel =
    view === "week"
      ? `${dates.start.slice(8, 10)}/${dates.start.slice(5, 7)} – ${dates.end.slice(8, 10)}/${dates.end.slice(5, 7)}`
      : new Date(anchor.getFullYear(), anchor.getMonth(), 1).toLocaleDateString("es", {
          month: "long",
          year: "numeric",
        });

  const monthWeeks = useMemo(() => {
    if (view !== "month") return [];
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);
    const cells: string[] = [];
    for (let i = 0; i < 42; i++) {
      cells.push(toISO(addDays(start, i)));
    }
    const weeks: string[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [view, anchor]);

  const navigate = (dir: number) => {
    if (view === "week") {
      setAnchor(addDays(anchor, dir * 7));
    } else {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    }
    setExportResult(null);
  };

  const runExport = async () => {
    setExporting(true);
    setExportError("");
    setExportResult(null);
    try {
      const res = await exportIngredients(exportMealIds, exportListId || undefined);
      setExportResult({
        listId: res.list.id,
        listName: res.list.name,
        ingredients: res.aggregatedIngredients,
      });
      setExportOpen(false);
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (!user?.familyId) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-700">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6" />
          <p className="font-medium">Necesitas un hogar para planificar los menús.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
        <img
          src="/images/meals-banner.svg"
          alt="Planificador de menús"
          className="h-48 w-full object-cover sm:h-64"
        />
        <h1 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow-md sm:bottom-6 sm:left-8 sm:text-3xl">
          Planificador de menús
        </h1>
      </div>

      <div className="flex w-full justify-center sm:justify-end">
        <div className="flex w-full max-w-md items-center justify-between rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-100 sm:max-w-none">
          <button
            onClick={() => navigate(-1)}
            title="Anterior"
            aria-label="Anterior"
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setAnchor(view === "week" ? startOfWeek(new Date()) : new Date());
              setExportResult(null);
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            Hoy
          </button>
          <span className="px-2 text-sm font-medium text-slate-600 capitalize">{rangeLabel}</span>
          <button
            onClick={() => navigate(1)}
            title="Siguiente"
            aria-label="Siguiente"
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {exportResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 font-semibold text-emerald-700">
            <Check className="h-5 w-5" />
            Ingredientes exportados a "{exportResult.listName}"
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {exportResult.ingredients.map((ing) => (
              <span
                key={ing.name}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm"
              >
                {ing.name} · {ing.quantity}
              </span>
            ))}
          </div>
        </div>
      )}

      {!ready ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : view === "week" ? (
        <div className="space-y-5">
          {dates.weekDates.map((d, i) => {
            const dayMeals = mealPlans.filter((m) => m.date === d);
            const today = toISO(new Date());
            const isToday = d === today;
            return (
              <section key={d}>
                <h3
                  className={`text-base font-bold ${
                    isToday ? "text-emerald-600" : "text-slate-800"
                  }`}
                >
                  {WEEKDAYS[i]}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    {Number(d.slice(8, 10))}
                  </span>
                  {isToday && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Hoy
                    </span>
                  )}
                </h3>
                {dayMeals.length === 0 ? (
                  <button
                    onClick={() => openCell(d, "Almuerzo")}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-400 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <Plus className="h-4 w-4" />
                    Planificar comida
                  </button>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {dayMeals.map((m) => {
                      const style = MEAL_CARD_STYLES[m.mealType] ?? MEAL_CARD_STYLES.Almuerzo;
                      return (
                        <button
                          key={m.id}
                          onClick={() => openCell(d, m.mealType)}
                          className={`rounded-xl border-l-4 px-3 py-2.5 text-left shadow-sm ring-1 ring-slate-100 transition hover:shadow-md ${style.card}`}
                        >
                          <span className={`text-[10px] font-bold uppercase ${style.badge}`}>
                            {m.mealType}
                          </span>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                            {m.recipe && (
                              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate">{m.recipe?.title ?? m.customTitle}</span>
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-1 text-xs font-bold uppercase text-slate-400">
                {wd}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthWeeks.flat().map((d) => {
              const inMonth =
                d.slice(0, 7) ===
                toISO(new Date(anchor.getFullYear(), anchor.getMonth(), 1)).slice(0, 7);
              if (!inMonth) {
                return <div key={d} className="min-h-[72px]" />;
              }
              const dayMeals = mealPlans.filter((m) => m.date === d);
              const today = toISO(new Date());
              return (
                <button
                  key={d}
                  onClick={() => {
                    setView("week");
                    setAnchor(startOfWeek(new Date(`${d}T12:00:00`)));
                  }}
                  className={`min-h-[72px] rounded-xl p-1.5 text-left transition bg-slate-50 hover:bg-emerald-50 ${
                    d === today ? "ring-2 ring-emerald-400" : ""
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${d === today ? "text-emerald-600" : "text-slate-600"}`}
                  >
                    {Number(d.slice(8, 10))}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayMeals.slice(0, 4).map((m) => (
                      <span
                        key={m.id}
                        title={m.recipe?.title ?? m.customTitle ?? ""}
                        className="h-1.5 w-4 rounded-full bg-emerald-400"
                      />
                    ))}
                  </div>
                  <p className="mt-1 truncate text-[10px] text-slate-500">
                    {dayMeals.length > 0
                      ? dayMeals
                          .map((m) => m.recipe?.title ?? m.customTitle ?? "")
                          .join(", ")
                          .slice(0, 30)
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={!!cell}
        onClose={() => setCell(null)}
        title={cell ? dateLabel(cell.date) : ""}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((mt) => {
              const selected = cell?.mealType === mt;
              const style = MEAL_CARD_STYLES[mt] ?? MEAL_CARD_STYLES.Almuerzo;
              return (
                <button
                  key={mt}
                  onClick={() => setCell(cell ? { ...cell, mealType: mt } : cell)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${
                    selected ? style.chip : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {mt}
                </button>
              );
            })}
          </div>

          {cellMeals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                {cell?.mealType}s planificados
              </p>
              {cellMeals.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                >
                  <span className="flex items-center gap-1.5 text-sm text-slate-700">
                    {m.recipe && <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-500" />}
                    {m.recipe?.title ?? m.customTitle}
                  </span>
                  <button
                    onClick={() => deleteMealPlan(m.id)}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    title="Quitar esta comida"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {cellMeals.some((m) => m.recipeId) && (
            <button
              onClick={() => {
                setExportMealIds(cellMeals.filter((m) => m.recipeId).map((m) => m.id));
                setCell(null);
                setExportOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <ShoppingBasket className="h-4 w-4" />
              Exportar a compras
            </button>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Añadir comida</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Elegir receta guardada
                </label>
                <select
                  value={recipeId}
                  onChange={(e) => {
                    setRecipeId(e.target.value);
                    setCustomTitle("");
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">— Sin receta —</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  O escribir una comida personalizada
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    if (e.target.value) setRecipeId("");
                  }}
                  placeholder="Ej: Pizza de la mamá"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <button
                onClick={saveCell}
                disabled={!recipeId && !customTitle}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-40"
              >
                Añadir comida
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exportar ingredientes"
      >
        <div className="space-y-4">
          {exportError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{exportError}</div>
          )}
          <p className="text-sm text-slate-500">
            Se añadirán a la lista los ingredientes de las recetas de esta comida.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lista de destino
            </label>
            <select
              value={exportListId}
              onChange={(e) => setExportListId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Usar primera lista disponible</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={runExport}
            disabled={exporting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            <ShoppingBasket className="h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar ahora"}
          </button>
        </div>
      </Modal>

      <button
        onClick={() => {
          setView(view === "week" ? "month" : "week");
          setExportResult(null);
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-1 ring-emerald-600 transition hover:bg-emerald-600 hover:shadow-xl"
        title={view === "week" ? "Cambiar a vista mensual" : "Cambiar a vista semanal"}
        aria-label={view === "week" ? "Cambiar a vista mensual" : "Cambiar a vista semanal"}
      >
        {view === "week" ? <CalendarDays className="h-6 w-6" /> : <List className="h-6 w-6" />}
      </button>
    </div>
  );
}
