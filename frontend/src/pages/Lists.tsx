import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ShoppingBasket, Trash2, AlertCircle } from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import Modal from "../components/Modal";

const ICONS = ["shopping-bag", "pill", "apple", "home", "car", "baby"];

export default function Lists() {
  const { user } = useAuth();
  const { lists, ready, createList, deleteList } = useData();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const list = await createList(name, icon);
      setCreateOpen(false);
      setName("");
      setIcon(ICONS[0]);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Listas de compras</h1>
          <p className="text-sm text-slate-500">Compartidas con tu hogar</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <Plus className="h-5 w-5" />
          Nueva lista
        </button>
      </div>

      {!ready ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ShoppingBasket className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Aún no hay listas</p>
          <p className="text-sm text-slate-400">Crea tu primera lista de compras</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const total = list.items.length;
            const done = list.items.filter((i) => i.completed).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div
                key={list.id}
                className="group relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
              >
                <Link to={`/lists/${list.id}`} className="block">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                      <ShoppingBasket className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {pct}%
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-800">{list.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {total} artículo{total !== 1 && "s"}
                  </p>
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
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva lista">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              required
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
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Crear lista
          </button>
        </form>
      </Modal>
    </div>
  );
}
