import { Link } from "react-router-dom";
import {
  ListTodo,
  CalendarDays,
  BookOpen,
  Users,
  UtensilsCrossed,
  Circle,
  Package,
} from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import { MEAL_TYPE_COLORS, type ListItem } from "../lib/types";

export default function Dashboard() {
  const { user } = useAuth();
  const { lists, mealPlans, ready, updateItem } = useData();

  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = mealPlans
    .filter((m) => m.date === today)
    .sort((a, b) => a.mealType.localeCompare(b.mealType));

  const shoppingLists = lists.filter((l) => (l.type ?? "shopping") === "shopping");
  const pendingItems = shoppingLists.flatMap((l) =>
    l.items.filter((i) => !i.completed).map((i) => ({ ...i, listName: l.name }))
  );

  const toggleItem = (item: ListItem) => {
    updateItem(item, { completed: !item.completed });
  };

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

      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/lists"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <ListTodo className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Listas</p>
        </Link>
        <Link
          to="/products"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100">
              <Package className="h-5 w-5 text-cyan-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Productos</p>
        </Link>
        <Link
          to="/recipes"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <BookOpen className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Recetas</p>
        </Link>
        <Link
          to="/meals"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <CalendarDays className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Menús</p>
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
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
            <ListTodo className="h-5 w-5 text-emerald-600" />
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
              {pendingItems.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => toggleItem(item)}
                    className="shrink-0"
                  >
                    <Circle className="h-4 w-4 text-slate-300 transition hover:text-emerald-500" />
                  </button>
                  <span className="font-medium text-slate-700">{item.name}</span>
                  {item.quantity && (
                    <span className="text-slate-400">· {item.quantity}</span>
                  )}
                  <span className="ml-auto text-xs text-slate-400">
                    {item.listName}
                  </span>
                </li>
              ))}
              {pendingItems.length > 8 && (
                <li className="pt-2 text-center text-sm text-slate-500">
                  y {pendingItems.length - 8} más...
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
