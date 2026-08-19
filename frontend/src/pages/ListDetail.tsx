import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Circle,
  Filter,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Lock,
  Users,
} from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import type { ListItem, ListType, Product } from "../lib/types";
import {
  LIST_TYPE_ICON,
  LIST_TYPE_CATEGORIES,
  MEDIA_STATUS,
  TODO_PRIORITIES,
} from "../lib/listTypes";
import Modal from "../components/Modal";
import EditListSheet from "../components/EditListSheet";

const UNITS = ["u", "g", "kg", "ml", "L"];

type SortMode = "category" | "name" | "added";
type FilterMode = "all" | "pending" | "done";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "category", label: "Por categoría" },
  { value: "name", label: "Nombre (A-Z)" },
  { value: "added", label: "Recién añadidos" },
];

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Solo pendientes" },
  { value: "done", label: "Solo comprados" },
];

const MEDIA_STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  "en curso": "bg-sky-100 text-sky-700",
  hecho: "bg-emerald-100 text-emerald-700",
};

const TODO_PRIORITY_STYLE: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-amber-100 text-amber-700",
  baja: "bg-emerald-100 text-emerald-700",
};

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lists, ready, addItem, updateItem, deleteItem, deleteList, searchProducts } = useData();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [qtyNum, setQtyNum] = useState("");
  const [unit, setUnit] = useState("u");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priceError, setPriceError] = useState("");
  const [addExpanded, setAddExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPanel, setMenuPanel] = useState<"main" | "sort" | "filter">("main");
  const [editOpen, setEditOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("category");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [hideCategories, setHideCategories] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [priceEdit, setPriceEdit] = useState<{ item: ListItem; value: string } | null>(null);
  const [priceEditError, setPriceEditError] = useState("");

  const [catalogResults, setCatalogResults] = useState<Product[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const list = lists.find((l) => l.id === id);
  const isOwner = !!list && list.ownerId === user?.id;
  const familyUsers = user?.family?.users ?? [];
  const listType: ListType = list?.type ?? "shopping";
  const isShopping = listType === "shopping";
  const cats = LIST_TYPE_CATEGORIES[listType] ?? [];
  const defaultCat = cats[0] ?? "General";

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (listType !== "shopping" || value.trim().length < 2) {
        setCatalogOpen(false);
        setCatalogResults([]);
        return;
      }
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(async () => {
        const results = await searchProducts(value.trim());
        setCatalogResults(results);
        setCatalogOpen(results.length > 0);
      }, 300);
    },
    [listType, searchProducts]
  );

  const selectCatalogProduct = (product: Product) => {
    setName(product.name);
    setCategory(product.category);
    if (product.unit) setUnit(product.unit);
    const latestPrice = product.prices?.[0]?.price;
    if (latestPrice) setPrice(latestPrice);
    setCatalogOpen(false);
    setCatalogResults([]);
    setAddExpanded(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setCatalogOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDone = (item: ListItem) =>
    listType === "media" ? (item.status ?? "pendiente") === "hecho" : item.completed;

  const buildItemData = () => {
    const base = { name, category };
    const priceTrim = price.trim();
    if (listType === "shopping") {
      return {
        ...base,
        quantity: qtyNum && qtyNum !== "0" ? `${qtyNum}${unit === "u" ? "" : " " + unit}` : "1",
        price: priceTrim || "",
      };
    }
    if (listType === "todo") {
      return {
        ...base,
        quantity: "1",
        ...(assigneeId ? { assigneeId } : {}),
        ...(priority ? { priority } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
    }
    if (listType === "packing") {
      return { ...base, quantity: qtyNum || "1" };
    }
    if (listType === "wishlist") {
      return {
        ...base,
        quantity: "1",
        price: priceTrim || "",
        ...(note.trim() ? { note: note.trim() } : {}),
      };
    }
    return {
      ...base,
      quantity: "1",
      ...(note.trim() ? { note: note.trim() } : {}),
      status: "pendiente",
    };
  };

  const resetItemFields = () => {
    setName("");
    setCategory(defaultCat);
    setQtyNum("");
    setUnit("u");
    setPrice("");
    setNote("");
    setAssigneeId("");
    setPriority("");
    setDueDate("");
    setPriceError("");
    setCatalogOpen(false);
    setCatalogResults([]);
  };

  const submitItem = async () => {
    if (!name.trim() || !id) return;
    const priceTrim = price.trim();
    if (
      (listType === "shopping" || listType === "wishlist") &&
      priceTrim &&
      Number.isNaN(Number(priceTrim.replace(",", ".")))
    ) {
      setPriceError("El precio no es válido. Escribe un número, ej: 2,50");
      return;
    }
    await addItem(id, buildItemData());
    resetItemFields();
    setAddExpanded(false);
  };

  const toggleItem = (item: ListItem) => {
    if (listType === "media") {
      const idx = MEDIA_STATUS.indexOf((item.status ?? "pendiente") as (typeof MEDIA_STATUS)[number]);
      const next = MEDIA_STATUS[(idx + 1) % MEDIA_STATUS.length];
      return updateItem(item, { status: next });
    }
    return updateItem(item, { completed: !item.completed });
  };

  const handleDeleteItem = (item: ListItem) => deleteItem(item);

  const openMenu = () => {
    setMenuPanel("main");
    setMenuOpen(true);
  };

  const openEdit = () => {
    if (!list) return;
    setMenuOpen(false);
    setEditOpen(true);
  };

  const handleDeleteList = async () => {
    if (!list) return;
    await deleteList(list.id);
    navigate("/lists");
  };

  const openPriceEdit = (item: ListItem) => {
    setPriceEdit({ item, value: item.price ?? "" });
    setPriceEditError("");
  };

  const handleSavePrice = async () => {
    if (!priceEdit) return;
    const v = priceEdit.value.trim();
    if (v && Number.isNaN(Number(v.replace(",", ".")))) {
      setPriceEditError("El precio no es válido. Escribe un número, ej: 2,50");
      return;
    }
    const modified = { ...priceEdit.item, price: v };
    modified.priceHistory = [
      {
        id: crypto.randomUUID(),
        itemId: priceEdit.item.id,
        price: v,
        recordedAt: new Date().toISOString(),
      },
      ...(priceEdit.item.priceHistory ?? []),
    ];
    await updateItem(modified, { price: v });
    setPriceEdit(null);
  };

  const filtered = useMemo(() => {
    if (!list) return [];
    return list.items.filter((i) =>
      filter === "all" ? true : filter === "pending" ? !isDone(i) : isDone(i)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, filter, listType]);

  const ordered = useMemo(() => {
    const arr = [...filtered];
    if (sortMode === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "added") {
      arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      arr.sort(
        (a, b) => Number(isDone(a)) - Number(isDone(b)) || b.createdAt.localeCompare(a.createdAt)
      );
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortMode, listType]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ListItem[]>();
    if (listType === "todo" || hideCategories) {
      if (ordered.length > 0)
        groups.set(listType === "todo" ? "Tareas" : "Todos los artículos", ordered);
      return Array.from(groups.entries());
    }
    for (const cat of cats) groups.set(cat, []);
    ordered.forEach((item) => {
      const cat = cats.includes(item.category) ? item.category : "General";
      if (groups.has(cat)) groups.get(cat)?.push(item);
    });
    return Array.from(groups.entries()).filter(([, items]) => items.length > 0);
  }, [ordered, hideCategories, listType, cats]);

  const done = list?.items.filter(isDone).length ?? 0;
  const total = list?.items.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const totalPrice = isShopping
    ? list?.items.reduce((sum, item) => {
        const p = parseFloat((item.price ?? "").replace(",", "."));
        if (isNaN(p)) return sum;
        const qtyMatch = item.quantity.match(/^([\d.]+)/);
        const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
        return sum + p * qty;
      }, 0) ?? 0
    : 0;

  const assigneeName = (uid: string) =>
    familyUsers.find((u) => u.id === uid)?.name ?? "Asignado";

  const renderItemFields = () => {
    switch (listType) {
      case "shopping":
        return (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-slate-500">Cantidad</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={qtyNum}
                  onChange={(e) => setQtyNum(e.target.value)}
                  placeholder="Ej: 500"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-semibold text-slate-500">Unidad</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u === "u" ? "unid." : u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Precio (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (priceError) setPriceError("");
                }}
                placeholder="Ej: 2,50"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </>
        );
      case "todo":
        return (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Asignado a</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Sin asignar</option>
                {familyUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Sin prioridad</option>
                {TODO_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Fecha límite
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Nota</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Detalles de la tarea..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </>
        );
      case "packing":
        return (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Cantidad</label>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="numeric"
                value={qtyNum}
                onChange={(e) => setQtyNum(e.target.value)}
                placeholder="Ej: 2"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </>
        );
      case "wishlist":
        return (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Precio (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (priceError) setPriceError("");
                }}
                placeholder="Ej: 19,99"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                ¿Para quién es?
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: el cumple de Lucas"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </>
        );
      default:
        return (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                ¿Quién lo recomendó?
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Ana"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </>
        );
    }
  };

  if (!ready) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (!list) return <p className="text-sm text-red-500">Lista no encontrada</p>;

  return (
    <div className="space-y-6 pb-36 lg:pb-0">
      <div className="flex items-center gap-4">
        <Link
          to="/lists"
          className="rounded-xl bg-white p-2 text-slate-500 shadow-sm ring-1 ring-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{list.name}</h1>
            <span className="text-xl">{LIST_TYPE_ICON[listType]}</span>
            {list.visibility === "private" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                <Lock className="h-3 w-3" />
                Privada
              </span>
            )}
            {list.visibility === "custom" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                <Users className="h-3 w-3" />
                Compartida
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {done}/{total} {done === 1 ? "completado" : "completados"}
          </p>
        </div>

        <div className="relative lg:hidden">
          {menuOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          )}
          <button
            onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
            className="rounded-xl bg-white p-2 text-slate-500 shadow-sm ring-1 ring-slate-100 hover:text-slate-700"
            aria-label="Opciones de la lista"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-100">
              {menuPanel === "main" ? (
                <>
                  {isOwner && (
                    <button
                      onClick={openEdit}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar lista
                    </button>
                  )}
                  <button
                    onClick={() => setMenuPanel("sort")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    Ordenar
                  </button>
                  <button
                    onClick={() => setMenuPanel("filter")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Filter className="h-4 w-4" />
                    Filtrar
                  </button>
                  {listType !== "todo" && (
                    <button
                      onClick={() => {
                        setHideCategories((v) => !v);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition hover:bg-slate-50 ${
                        hideCategories ? "text-emerald-600" : "text-slate-700"
                      }`}
                    >
                      <Layers className="h-4 w-4" />
                      <span className="flex-1 text-left">Ocultar categorías</span>
                      {hideCategories && <Check className="h-4 w-4" />}
                    </button>
                  )}
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar lista
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMenuPanel("main")}
                    className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {menuPanel === "sort" ? "Ordenar por" : "Filtrar"}
                  </button>
                  {(menuPanel === "sort" ? SORT_OPTIONS : FILTER_OPTIONS).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (menuPanel === "sort") setSortMode(opt.value as SortMode);
                        else setFilter(opt.value as FilterMode);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {opt.label}
                      {(menuPanel === "sort" ? sortMode === opt.value : filter === opt.value) && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {isShopping && totalPrice > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5 ring-1 ring-emerald-100">
          <span className="text-sm font-medium text-emerald-700">Total estimado</span>
          <span className="text-lg font-bold text-emerald-800">
            {totalPrice.toFixed(2).replace(".", ",")} €
          </span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitItem();
        }}
        className="hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 lg:block"
      >
        <div className="relative flex gap-2" ref={isShopping ? catalogRef : undefined}>
          <input
            type="text"
            value={name}
            onChange={(e) => isShopping ? handleNameChange(e.target.value) : setName(e.target.value)}
            placeholder={isShopping ? "Buscar o agregar artículo..." : "Agregar artículo..."}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          {catalogOpen && catalogResults.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
              <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Catálogo de productos
              </p>
              <ul className="max-h-48 overflow-y-auto">
                {catalogResults.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => selectCatalogProduct(product)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">{product.name}</p>
                        <p className="text-xs text-slate-400">{product.category} · {product.unit}</p>
                      </div>
                      {product.prices?.[0] && (
                        <span className="text-xs font-semibold text-emerald-600">
                          {product.prices[0].price}€
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {renderItemFields()}
        </div>
        {priceError && <p className="mt-2 text-xs text-red-600">{priceError}</p>}
      </form>

      {total === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <span className="mx-auto mb-3 block text-5xl opacity-60">{LIST_TYPE_ICON[listType]}</span>
          <p className="font-medium text-slate-600">Esta lista está vacía</p>
          <p className="text-sm text-slate-400">Agrega artículos para empezar</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Filter className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No hay artículos que coincidan</p>
          <p className="text-sm text-slate-400">Prueba a cambiar el filtro</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <section key={cat} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                {cat}
              </h3>
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => toggleItem(item)} className="shrink-0">
                      {listType === "media" ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            MEDIA_STATUS_STYLE[item.status ?? "pendiente"] ??
                            MEDIA_STATUS_STYLE.pendiente
                          }`}
                        >
                          {item.status ?? "pendiente"}
                        </span>
                      ) : item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 hover:text-emerald-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isDone(item) ? "text-slate-400 line-through" : "text-slate-700"
                        }`}
                      >
                        {item.name}
                      </p>
                      {listType === "todo" ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                          {item.priority && (
                            <span
                              className={`rounded-full px-2 py-0.5 font-semibold ${
                                TODO_PRIORITY_STYLE[item.priority] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}
                          {item.dueDate && <span className="text-slate-500">📅 {formatDate(item.dueDate)}</span>}
                          {item.assigneeId && (
                            <span className="text-slate-500">👤 {assigneeName(item.assigneeId)}</span>
                          )}
                          {item.note && <span className="text-slate-400">{item.note}</span>}
                        </div>
                      ) : listType === "media" ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.category}
                          {item.note ? ` · ${item.note}` : ""}
                        </p>
                      ) : listType === "wishlist" ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                          {item.category && <span className="text-slate-400">{item.category}</span>}
                          {item.note && <span className="text-slate-400">· {item.note}</span>}
                          {item.price && (
                            <span className="font-semibold text-slate-600">{item.price} €</span>
                          )}
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === item.id ? null : item.id)
                            }
                            className="text-emerald-600 hover:underline"
                          >
                            historial
                          </button>
                        </div>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.quantity !== "1" && item.quantity}
                          {item.quantity !== "1" && item.price ? " · " : ""}
                          {item.price ? `${item.price} €` : ""}
                          {!item.quantity && !item.price && item.category ? item.category : ""}
                        </p>
                      )}
                      {listType === "wishlist" && expandedId === item.id && (
                        <div className="mt-2 rounded-lg bg-slate-50 p-2.5">
                          {(item.priceHistory ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400">Sin historial todavía.</p>
                          ) : (
                            <ul className="space-y-0.5">
                              {(item.priceHistory ?? []).map((ph) => (
                                <li
                                  key={ph.id}
                                  className="flex justify-between text-xs text-slate-500"
                                >
                                  <span>
                                    {new Date(ph.recordedAt).toLocaleDateString("es-ES")}
                                  </span>
                                  <span className="font-semibold text-slate-700">{ph.price} €</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <button
                            onClick={() => openPriceEdit(item)}
                            className="mt-1.5 text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            Cambiar precio
                          </button>
                        </div>
                      )}
                    </div>
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

      <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto max-w-5xl px-4 pb-4">
          <div className="rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-100">
            <div className="relative flex items-center gap-2" ref={isShopping ? catalogRef : undefined}>
              <input
                type="text"
                value={name}
                onChange={(e) => isShopping ? handleNameChange(e.target.value) : setName(e.target.value)}
                onFocus={() => setAddExpanded(true)}
                placeholder={isShopping ? "Buscar o agregar artículo..." : listType === "todo" ? "Agregar tarea..." : "Agregar artículo..."}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
              {catalogOpen && catalogResults.length > 0 && (
                <div className="absolute left-0 bottom-full z-50 mb-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                  <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Catálogo de productos
                  </p>
                  <ul className="max-h-48 overflow-y-auto">
                    {catalogResults.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => selectCatalogProduct(product)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-700">{product.name}</p>
                            <p className="text-xs text-slate-400">{product.category} · {product.unit}</p>
                          </div>
                          {product.prices?.[0] && (
                            <span className="text-xs font-semibold text-emerald-600">
                              {product.prices[0].price}€
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={submitItem}
                disabled={!name.trim()}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>
            {addExpanded && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                {renderItemFields()}
                {priceError && <p className="text-xs text-red-600">{priceError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {list && (
        <EditListSheet open={editOpen} onClose={() => setEditOpen(false)} list={list} />
      )}

      <Modal
        open={!!priceEdit}
        onClose={() => setPriceEdit(null)}
        title="Cambiar precio"
      >
        <div className="space-y-4">
          {priceEdit && (
            <p className="text-sm text-slate-500">{priceEdit.item.name}</p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Precio (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={priceEdit?.value ?? ""}
              onChange={(e) => {
                setPriceEdit((p) => (p ? { ...p, value: e.target.value } : p));
                if (priceEditError) setPriceEditError("");
              }}
              placeholder="Ej: 19,99"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${
                priceEditError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
              }`}
            />
            {priceEditError && <p className="mt-1 text-xs text-red-600">{priceEditError}</p>}
          </div>
          <button
            onClick={handleSavePrice}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Guardar precio
          </button>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Eliminar lista">
        <p className="text-sm text-slate-600">
          ¿Seguro que quieres eliminar la lista <b>“{list.name}”</b>? Esta acción no se puede
          deshacer.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setDeleteOpen(false)}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteList}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
