import { Link } from "react-router-dom";
import {
  ShoppingBasket,
  CalendarDays,
  BookOpen,
  Users,
  UtensilsCrossed,
  Circle,
} from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import { MEAL_TYPE_COLORS } from "../lib/types";

export default function Dashboard() {
  const { user } = useAuth();
  const { lists, recipes, mealPlans, ready } = useData();

  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = mealPlans
    .filter((m) => m.date === today)
    .sort((a, b) => a.mealType.localeCompare(b.mealType));

  const pendingItems = lists.flatMap((l) => l.items.filter((i) => !i.completed));
  const totalItems = lists.flatMap((l) => l.items);

  if (!user?.familyId) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100">
            <Users className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">¡Bienvenido a FamilyWall!</h1>
        <p className="mt-3 text-slate-500">
          Crea un hogar para compartir listas de compras, recetas y planificar los menús de la
          familia, o únete al hogar de alguien con su código de invitación.
        </p>
        <Link
          to="/family"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <Users className="h-5 w-5" />
          Configurar mi hogar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Hola, {user?.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Hogar: <span className="font-medium text-slate-700">{user?.family?.name}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/lists"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <ShoppingBasket className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{pendingItems.length}</span>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Compras pendientes</p>
        </Link>
        <Link
          to="/recipes"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <BookOpen className="h-5 w-5 text-violet-600" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{recipes.length}</span>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Recetas guardadas</p>
        </Link>
        <Link
          to="/meals"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <CalendarDays className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{todayMeals.length}</span>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Comidas de hoy</p>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800">¿Qué hay de comer hoy?</h2>
          </div>
          {!ready ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : todayMeals.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">Aún no has planificado el menú de hoy.</p>
              <Link
                to="/meals"
                className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline"
              >
                Planificar menú →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {todayMeals.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        MEAL_TYPE_COLORS[m.mealType] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.mealType}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {m.recipe?.title ?? m.customTitle}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800">Compras pendientes</h2>
          </div>
          {!ready ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : pendingItems.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">¡Nada pendiente por ahora!</p>
              <Link
                to="/lists"
                className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline"
              >
                Ir a las listas →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingItems.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="text-slate-400">· {item.quantity}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {lists.find((l) => l.id === item.listId)?.name}
                  </span>
                </li>
              ))}
              {pendingItems.length > 6 && (
                <li className="pt-2 text-center text-sm text-slate-500">
                  y {pendingItems.length - 6} más...
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {totalItems.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 font-semibold text-slate-800">Progreso de compras</h2>
          {lists.map((list) => {
            const done = list.items.filter((i) => i.completed).length;
            const total = list.items.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={list.id} className="mb-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{list.name}</span>
                  <span className="text-slate-400">
                    {done}/{total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
        <div>
          <h2 className="text-lg font-bold">Planifica la semana</h2>
          <p className="text-sm text-emerald-50">
            Exporta los ingredientes del menú directamente a tu lista de compras.
          </p>
        </div>
        <Link
          to="/meals"
          className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Planificar →
        </Link>
      </section>
    </div>
  );
}
