import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  AlertCircle,
  Lock,
  Users,
  ChevronRight,
  SlidersHorizontal,
  Pin,
  Pencil,
  Check,
} from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import { canWriteModule } from "../lib/permissions";
import type { ShoppingList, ListType, ListVisibility } from "../lib/types";
import { getVISIBILITY_OPTIONS } from "../lib/listVisibility";
import { getLIST_TYPES, LIST_TYPE_ICON } from "../lib/listTypes";
import { LIST_COLORS, getListColor } from "../lib/listColors";
import { useLongPress } from "../lib/useLongPress";
import BottomSheet from "../components/BottomSheet";
import EditListSheet from "../components/EditListSheet";

const ICONS = ["shopping-bag", "pill", "apple", "home", "car", "baby"];

function VisibilityBadge({ visibility }: { visibility?: ListVisibility }) {
  const { t } = useTranslation();
  if (visibility === "private") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
        <Lock className="h-3 w-3" />
        {t("lists.private")}
      </span>
    );
  }
  if (visibility === "custom") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
        <Users className="h-3 w-3" />
        {t("lists.shared")}
      </span>
    );
  }
  return null;
}

function PinnedCard({
  list,
  onLongPress,
}: {
  list: ShoppingList;
  onLongPress: (list: ShoppingList, x: number, y: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const justFiredRef = useRef(false);

  const handleLongPress = useCallback(
    (x: number, y: number) => {
      justFiredRef.current = true;
      onLongPress(list, x, y);
    },
    [list, onLongPress]
  );

  const { pressing, handlers } = useLongPress(handleLongPress);

  const total = list.items.length;
  const done = list.items.filter((i) => i.completed).length;
  const pending = total - done;
  const complete = total > 0 && pending === 0;
  const listColor = getListColor(list.color);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 transition-all duration-150 ${listColor.pinned} ${
        isDragging ? `z-50 opacity-40 ${listColor.pinnedRing}` : listColor.pinnedRing
      } ${pressing ? `scale-[0.97] ${listColor.pinnedRing}` : ""}`}
      {...handlers}
    >
      <Link
        to={`/lists/${list.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 touch-none select-none"
        {...attributes}
        {...listeners}
        onClickCapture={(e) => {
          if (justFiredRef.current || pressing) {
            e.preventDefault();
            e.stopPropagation();
            justFiredRef.current = false;
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress(list, e.clientX, e.clientY);
        }}
      >
        <Pin className="h-3.5 w-3.5 shrink-0 fill-emerald-500 text-emerald-500" />
        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-800">{list.name}</span>
      </Link>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          complete
            ? "bg-emerald-500 text-white"
            : "bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400"
        }`}
      >
        {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : pending}
      </span>
    </div>
  );
}

function ListCard({
  list,
  isDragging,
  onLongPress,
}: {
  list: ShoppingList;
  isDragging?: boolean;
  onLongPress: (list: ShoppingList, x: number, y: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: list.id });

  const justFiredRef = useRef(false);

  const handleLongPress = useCallback(
    (x: number, y: number) => {
      justFiredRef.current = true;
      onLongPress(list, x, y);
    },
    [list, onLongPress]
  );

  const { pressing, progress, handlers } = useLongPress(handleLongPress);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const total = list.items.length;
  const done = list.items.filter((i) => i.completed).length;
  const pending = total - done;
  const complete = total > 0 && pending === 0;
  const listType = list.type ?? "shopping";
  const listColor = getListColor(list.color);

  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100 transition-all duration-150 dark:bg-slate-800 dark:ring-slate-700 ${
        pressing ? "scale-[0.97] long-press-active ring-emerald-400 shadow-lg" : "hover:shadow-md"
      } ${isDragging ? "z-50 ring-2 ring-emerald-400 shadow-xl" : ""}`}
      {...handlers}
    >
      <Link
        to={`/lists/${list.id}`}
        className="block touch-none select-none"
        {...attributes}
        {...listeners}
        onClickCapture={(e) => {
          if (justFiredRef.current || pressing) {
            e.preventDefault();
            e.stopPropagation();
            justFiredRef.current = false;
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress(list, e.clientX, e.clientY);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${listColor.icon} text-lg`}>
              {LIST_TYPE_ICON[listType]}
            </div>
            {pressing && (
              <svg
                className="absolute -left-1 -top-1 h-[44px] w-[44px] -rotate-90"
                viewBox="0 0 40 40"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2.5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-none"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{list.name}</h3>
            <div className="mt-0.5 flex items-center gap-2">
              {list.pinned && (
                <Pin className="h-3 w-3 shrink-0 fill-emerald-500 text-emerald-500" />
              )}
              <VisibilityBadge visibility={list.visibility} />
            </div>
          </div>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            complete
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
          }`}>
            {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : pending}
          </span>
        </div>
      </Link>
    </div>
  );
}

function ListCardOverlay({ list }: { list: ShoppingList }) {
  const total = list.items.length;
  const done = list.items.filter((i) => i.completed).length;
  const pending = total - done;
  const complete = total > 0 && pending === 0;
  const listType = list.type ?? "shopping";
  const listColor = getListColor(list.color);

  return (
    <div className="w-full rounded-2xl bg-white p-3.5 shadow-2xl ring-2 ring-emerald-400 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${listColor.icon} text-lg`}>
          {LIST_TYPE_ICON[listType]}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{list.name}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            {list.pinned && (
              <Pin className="h-3 w-3 shrink-0 fill-emerald-500 text-emerald-500" />
            )}
            <VisibilityBadge visibility={list.visibility} />
          </div>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          complete
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
        }`}>
          {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : pending}
        </span>
      </div>
    </div>
  );
}

export default function Lists() {
  const { t } = useTranslation();
  const LIST_TYPES = getLIST_TYPES();
  const VISIBILITY_OPTIONS = getVISIBILITY_OPTIONS();

  const { user } = useAuth();
  const canWrite = canWriteModule(user, "lists");
  const { lists, ready, createList, deleteList, reorderLists, updateList } = useData();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"type" | "form">("type");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState("emerald");
  const [type, setType] = useState<ListType>("shopping");
  const [visibility, setVisibility] = useState<ListVisibility>("family");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<ListType | "all">("all");
  const [nameFilter, setNameFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    listId: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const familyUsers = user?.family?.users ?? [];
  const hasFilters = typeFilter !== "all" || nameFilter.trim() !== "";
  const filteredLists = lists.filter((l) => {
    if (typeFilter !== "all" && (l.type ?? "shopping") !== typeFilter) return false;
    if (nameFilter.trim() && !l.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
      return false;
    return true;
  });

  const sortedLists = useMemo(() => {
    return [...filteredLists].sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        b.createdAt.localeCompare(a.createdAt)
    );
  }, [filteredLists]);

  const pinnedLists = useMemo(
    () => sortedLists.filter((l) => l.pinned),
    [sortedLists]
  );
  const unpinnedLists = useMemo(
    () => sortedLists.filter((l) => !l.pinned),
    [sortedLists]
  );

  const listIds = useMemo(() => sortedLists.map((l) => l.id), [sortedLists]);
  const activeList = activeId ? sortedLists.find((l) => l.id === activeId) ?? null : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const list = await createList(name, icon, type, visibility, memberIds, color);
      setCreateOpen(false);
      setCreateStep("type");
      setName("");
      setIcon(ICONS[0]);
      setColor("emerald");
      setType("shopping");
      setVisibility("family");
      setMemberIds([]);
      navigate(`/lists/${list.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (id: string) => {
    setContextMenu(null);
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteList(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleTogglePin = (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    setContextMenu(null);
    updateList(listId, {
      name: list.name,
      icon: list.icon,
      color: list.color,
      type: list.type ?? "shopping",
      visibility: list.visibility ?? "family",
      memberIds: list.members?.map((m) => m.userId) ?? [],
      pinned: !list.pinned,
    });
  };

  const handleEdit = (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    setContextMenu(null);
    setEditingList(list);
  };

  const resetFilters = () => {
    setTypeFilter("all");
    setNameFilter("");
  };

  const handleLongPress = useCallback(
    (list: ShoppingList, x: number, y: number) => {
      if (!canWrite) return;
      setContextMenu({ listId: list.id, x, y });
    },
    [canWrite]
  );

  const handleDragStart = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;
      const oldIndex = listIds.indexOf(String(active.id));
      const newIndex = listIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newOrder = arrayMove(listIds, oldIndex, newIndex);
      reorderLists(newOrder);
    },
    [listIds, reorderLists]
  );

  if (!user?.familyId) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6" />
          <p className="font-medium">
            {t("lists.needsHome")}{" "}
            <Link to="/family" className="underline">
              {t("lists.setupHome")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const ctxList = contextMenu ? lists.find((l) => l.id === contextMenu.listId) : null;

  return (
    <div className="space-y-6">
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-2xl sm:ring-1 sm:ring-slate-100 dark:sm:ring-slate-700">
        <img
          src="/images/list-banner.svg"
          alt={t("lists.bannerAlt")}
          className="h-56 w-full object-cover sm:h-64"
        />
        <h1 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow-md sm:bottom-6 sm:left-8 sm:text-3xl">
          {t("lists.title")}
        </h1>
      </div>

      <div className="fixed right-4 top-4 z-50">
        {filterOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
        )}
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm ring-1 ring-white/20 transition hover:bg-white dark:bg-slate-800/90 dark:text-slate-300 dark:ring-slate-700/20 dark:hover:bg-slate-800"
          aria-label={t("app.filters")}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {hasFilters && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
          )}
        </button>
        {filterOpen && (
          <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder={t("lists.searchPlaceholder")}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-700/30 dark:text-slate-200 dark:focus:bg-slate-800"
            />
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t("lists.type")}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  typeFilter === "all"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                {t("lists.allTypes")}
              </button>
              {LIST_TYPES.map((lt) => (
                <button
                  key={lt.value}
                  onClick={() => setTypeFilter(lt.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    typeFilter === lt.value
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {lt.icon} {lt.label}
                </button>
              ))}
            </div>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                {t("lists.clearFilters")}
              </button>
            )}
          </div>
        )}
      </div>

      {!ready ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{t("app.loading")}</p>
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-600">
          <span className="mx-auto mb-3 block h-10 w-10 text-3xl">📝</span>
          <p className="font-medium text-slate-600 dark:text-slate-300">{t("lists.empty")}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("lists.emptyDesc")}</p>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={canWrite ? handleDragStart : undefined}
            onDragEnd={canWrite ? handleDragEnd : undefined}
          >
            <SortableContext items={listIds} strategy={rectSortingStrategy}>
              <div className="sm:hidden">
                {pinnedLists.length > 0 && (
                  <div className={`mb-3 grid gap-2 ${pinnedLists.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {pinnedLists.map((list) => (
                      <PinnedCard
                        key={list.id}
                        list={list}
                        onLongPress={handleLongPress}
                      />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {unpinnedLists.map((list) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      isDragging={activeId === list.id}
                      onLongPress={handleLongPress}
                    />
                  ))}
                </div>
              </div>
              <div className="hidden sm:block">
                {pinnedLists.length > 0 && (
                  <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pinnedLists.map((list) => (
                      <PinnedCard
                        key={list.id}
                        list={list}
                        onLongPress={handleLongPress}
                      />
                    ))}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unpinnedLists.map((list) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      isDragging={activeId === list.id}
                      onLongPress={handleLongPress}
                    />
                  ))}
                </div>
              </div>
            </SortableContext>
            <DragOverlay>
              {activeList ? <ListCardOverlay list={activeList} /> : null}
            </DragOverlay>
          </DndContext>
          {sortedLists.length === 0 && (
            <p className="text-center text-sm text-slate-400 dark:text-slate-500">
              {hasFilters
                ? t("lists.noMatchFilters")
                : t("lists.noListsYet")}
            </p>
          )}
        </>
      )}

      {canWrite && (
      <button
        onClick={() => {
          setCreateStep("type");
          setError("");
          setCreateOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-1 ring-emerald-600 transition hover:bg-emerald-600 hover:shadow-xl"
        aria-label={t("lists.newList")}
      >
        <Plus className="h-7 w-7" />
      </button>
      )}

      {contextMenu && ctxList && (
        <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)}>
          <div className="absolute inset-0 bg-slate-900/30" />
          <div
            className="absolute z-10 w-56 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
            style={{
              left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 232)),
              top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - 200)),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 px-3 pt-2 text-xs font-bold text-slate-400 dark:text-slate-500">{ctxList.name}</p>
            <button
              onClick={() => handleTogglePin(ctxList.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Pin className={`h-4 w-4 ${ctxList.pinned ? "fill-emerald-500 text-emerald-500" : ""}`} />
              {ctxList.pinned ? t("lists.unpin") : t("lists.pin")}
            </button>
            <button
              onClick={() => handleEdit(ctxList.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Pencil className="h-4 w-4" />
              {t("lists.editList")}
            </button>
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            <button
              onClick={() => handleDelete(ctxList.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              {t("lists.deleteList")}
            </button>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("lists.confirmDelete")}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t("lists.confirmDeleteDesc")}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                {t("app.cancel")}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                {t("lists.deleteList")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingList && (
        <EditListSheet
          open={!!editingList}
          onClose={() => setEditingList(null)}
          list={editingList}
        />
      )}

      <BottomSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createStep === "type" ? t("lists.createTypeTitle") : t("lists.createList")}
        onBack={createStep === "form" ? () => setCreateStep("type") : undefined}
        step={createStep === "type" ? 1 : 2}
        steps={2}
      >
        {createStep === "type" ? (
          <div className="grid grid-cols-2 gap-3">
            {LIST_TYPES.map((lt) => (
              <button
                key={lt.value}
                type="button"
                onClick={() => {
                  setType(lt.value);
                  setError("");
                  setCreateStep("form");
                }}
                className="flex flex-col items-center rounded-2xl border-2 border-slate-200 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-600 dark:hover:bg-emerald-900/20"
              >
                <span className="text-3xl">{lt.icon}</span>
                <span className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{lt.label}</span>
                <span className="mt-0.5 text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                  {lt.description}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
            )}
            <button
              type="button"
              onClick={() => setCreateStep("type")}
              className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
            >
              <span className="text-xl">{LIST_TYPE_ICON[type]}</span>
              <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {LIST_TYPES.find((lt) => lt.value === type)?.label}
              </span>
              <span className="flex items-center text-xs font-medium text-emerald-600">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("lists.listNamePlaceholder")}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-500 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("lists.icon")}</label>
              <div className="flex gap-2">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                      icon === ic
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-700"
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
                    onClick={() => setColor(c.name)}
                    className={`flex h-9 w-full items-center justify-center rounded-xl border-2 transition ${
                      color === c.name
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
                    onClick={() => setVisibility(opt.value)}
                    className={`rounded-xl border px-4 py-2.5 text-left transition ${
                      visibility === opt.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{opt.label}</span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>
            {visibility === "custom" && (
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
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
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
                          className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:border-slate-500"
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
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              {t("lists.createList")}
            </button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
