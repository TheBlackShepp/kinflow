import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ShoppingBasket,
} from "lucide-react";
import { useData } from "../lib/store";
import type { ListItem } from "../lib/types";

const CATEGORIES = [
  "General",
  "Frutas y Verduras",
  "Lácteos",
  "Carnes y Pescados",
  "Panadería",
  "Limpieza",
  "Supermercado",
];

export default function ListDetail() {
  const { id } = useParams();
  const { lists, ready, addItem, updateItem, deleteItem } = useData();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("General");

  const list = lists.find((l) => l.id === id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id) return;
    await addItem(id, { name, quantity, category });
    setName("");
    setQuantity("1");
    setCategory("General");
  };

  const toggleItem = (item: ListItem) => updateItem(item, { completed: !item.completed });
  const handleDeleteItem = (item: ListItem) => deleteItem(item);

  const grouped = useMemo(() => {
    const groups = new Map<string, { pending: ListItem[]; done: ListItem[] }>();
    for (const cat of CATEGORIES) groups.set(cat, { pending: [], done: [] });
    list?.items.forEach((item) => {
      const cat = CATEGORIES.includes(item.category) ? item.category : "General";
      const g = groups.get(cat) ?? { pending: [], done: [] };
      if (item.completed) g.done.push(item);
      else g.pending.push(item);
      groups.set(cat, g);
    });
    return Array.from(groups.entries()).filter(
      ([, g]) => g.pending.length > 0 || g.done.length > 0
    );
  }, [list]);

  const done = list?.items.filter((i) => i.completed).length ?? 0;
  const total = list?.items.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (!ready) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (!list) return <p className="text-sm text-red-500">Lista no encontrada</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/lists"
          className="rounded-xl bg-white p-2 text-slate-500 shadow-sm ring-1 ring-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{list.name}</h1>
          <p className="text-sm text-slate-500">
            {done}/{total} comprados
          </p>
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <form onSubmit={handleAdd} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agregar artículo..."
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Cantidad"
            className="sm:w-32 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sm:w-48 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </form>

      {total === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ShoppingBasket className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Esta lista está vacía</p>
          <p className="text-sm text-slate-400">Agrega artículos para empezar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, g]) => (
            <section key={cat} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                {cat}
              </h3>
              <ul className="divide-y divide-slate-100">
                {[...g.pending, ...g.done].map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => toggleItem(item)} className="shrink-0">
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 hover:text-emerald-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          item.completed ? "text-slate-400 line-through" : "text-slate-700"
                        }`}
                      >
                        {item.name}
                      </p>
                    </div>
                    <span className="text-sm text-slate-400">{item.quantity}</span>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
