import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ListTodo,
  CalendarDays,
  BookOpen,
  Users,
  UtensilsCrossed,
  Circle,
  Package,
  LogOut,
  Globe,
  Moon,
  Sun,
} from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useDarkMode } from "../lib/useDarkMode";
import { canReadModule, canWriteModule } from "../lib/permissions";
import { MEAL_TYPE_COLORS, type ListItem } from "../lib/types";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lists, mealPlans, ready, updateItem } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();

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

  const toggleLanguage = () => {
    const next = i18n.language === "es" ? "en" : "es";
    i18n.changeLanguage(next);
    localStorage.setItem("kinflow_lang", next);
  };

  const handleLogout = () => {
    setSettingsOpen(false);
    logout();
    navigate("/login");
  };

  if (!user?.familyId) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100">
            <Users className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">{t("dashboard.welcome")}</h1>
        <p className="mt-3 text-slate-500">
          {t("dashboard.welcomeDesc")}
        </p>
        <Link
          to="/family"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <Users className="h-5 w-5" />
          {t("dashboard.setupHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 -mx-4 px-4 pb-4 backdrop-blur-md sm:static sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {t("dashboard.hello", { name: user?.name.split(" ")[0] })}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("dashboard.home", { name: user?.family?.name })}
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow-md transition hover:scale-105 hover:bg-emerald-600"
          >
            {user?.name?.charAt(0).toUpperCase()}
          </button>
        </div>

        {settingsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
            <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              <button
                onClick={toggleLanguage}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Globe className="h-4 w-4" />
                {i18n.language === "es" ? t("settings.languageEnglish") : t("settings.languageSpanish")}
              </button>
              <button
                onClick={toggleDark}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {dark ? t("settings.lightMode") : t("settings.darkMode")}
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:hidden">
        {canReadModule(user, "lists") && (
        <Link
          to="/lists"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md dark:bg-slate-800 dark:ring-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <ListTodo className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t("dashboard.lists")}</p>
        </Link>
        )}
        {canReadModule(user, "products") && (
        <Link
          to="/products"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md dark:bg-slate-800 dark:ring-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
              <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t("dashboard.products")}</p>
        </Link>
        )}
        {canReadModule(user, "recipes") && (
        <Link
          to="/recipes"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md dark:bg-slate-800 dark:ring-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40">
              <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t("dashboard.recipes")}</p>
        </Link>
        )}
        {canReadModule(user, "meals") && (
        <Link
          to="/meals"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md dark:bg-slate-800 dark:ring-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t("dashboard.meals")}</p>
        </Link>
        )}
        {user?.role === "admin" && (
          <Link
            to="/family"
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md dark:bg-slate-800 dark:ring-slate-700 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/40">
                <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t("nav.family")}</p>
          </Link>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {canReadModule(user, "meals") && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          <div className="mb-4 flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("dashboard.whatsForDinner")}</h2>
          </div>
          {!ready ? (
            <p className="text-sm text-slate-400">{t("app.loading")}</p>
          ) : todayMeals.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard.noMealsPlanned")}</p>
              <Link
                to="/meals"
                className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {t("dashboard.planMenu")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {todayMeals.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        MEAL_TYPE_COLORS[m.mealType] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {m.mealType}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {m.recipe?.title ?? m.customTitle}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}

        {canReadModule(user, "lists") && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          <div className="mb-4 flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("dashboard.pendingShopping")}</h2>
          </div>
          {!ready ? (
            <p className="text-sm text-slate-400">{t("app.loading")}</p>
          ) : pendingItems.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard.nothingPending")}</p>
              <Link
                to="/lists"
                className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {t("dashboard.goToLists")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingItems.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={canWriteModule(user, "lists") ? () => toggleItem(item) : undefined}
                    className="shrink-0"
                  >
                    <Circle className="h-4 w-4 text-slate-300 transition hover:text-emerald-500 dark:text-slate-500 dark:hover:text-emerald-400" />
                  </button>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                  {item.quantity && (
                    <span className="text-slate-400 dark:text-slate-500">· {item.quantity}</span>
                  )}
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                    {item.listName}
                  </span>
                </li>
              ))}
              {pendingItems.length > 8 && (
                <li className="pt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("dashboard.andMore", { count: pendingItems.length - 8 })}
                </li>
              )}
            </ul>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
