import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ShoppingBasket,
  BookOpen,
  CalendarDays,
  Users,
  LogOut,
  ChefHat,
  Wifi,
  WifiOff,
  RefreshCw,
  Package,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useData } from "../lib/store";

const navItems = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/lists", label: "Listas", icon: ShoppingBasket, end: false },
  { to: "/products", label: "Productos", icon: Package, end: false },
  { to: "/recipes", label: "Recetas", icon: BookOpen, end: false },
  { to: "/meals", label: "Menús", icon: CalendarDays, end: false },
  { to: "/family", label: "Familia", icon: Users, end: false },
];

function SyncBadge() {
  const { syncStatus, pendingCount } = useData();

  if (syncStatus === "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
        <WifiOff className="h-3 w-3" />
        Sin conexión{pendingCount > 0 ? ` · ${pendingCount} pend.` : ""}
      </span>
    );
  }
  if (syncStatus === "syncing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Sincronizando...
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      <Wifi className="h-3 w-3" />
      En línea
    </span>
  );
}

function StatusBanner() {
  const { syncStatus, pendingCount } = useData();
  const { user } = useAuth();
  if (!user) return null;

  if (syncStatus === "offline") {
    return (
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white">
        <WifiOff className="h-4 w-4" />
        Sin conexión: trabajando en modo local
        {pendingCount > 0 ? ` · ${pendingCount} cambio(s) pendientes de sincronizar` : ""}
      </div>
    );
  }
  return null;
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <StatusBanner />

      {!isHome && !location.pathname.startsWith("/lists/") && (
        <Link
          to="/"
          className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100 transition hover:scale-105 lg:hidden"
          aria-label="Ir al inicio"
        >
          <Home className="h-5 w-5 text-emerald-600" />
        </Link>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-slate-900 text-white lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">FamilyWall</p>
            <p className="text-xs text-slate-400">{user?.family?.name ?? "Mi hogar"}</p>
          </div>
        </div>
        <div className="px-6">
          <SyncBadge />
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="lg:ml-60">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
