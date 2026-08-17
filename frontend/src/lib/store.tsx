import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api, OfflineError, isNavigatorOnline, getToken } from "./api";
import { db, uid, type SyncAction, type SyncTable } from "./db";
import { useAuth } from "./auth";
import type {
  ShoppingList,
  ListItem,
  Recipe,
  Ingredient,
  MealPlan,
  ListVisibility,
  ListType,
} from "./types";

export type SyncStatus = "online" | "offline" | "syncing";

export interface NewRecipeInput {
  title: string;
  description?: string;
  prepTime?: string;
  servings?: number;
  instructions?: string;
  ingredients?: { name: string; amount: string; unit: string }[];
}

interface DataContextValue {
  ready: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncedAt: Date | null;
  lists: ShoppingList[];
  recipes: Recipe[];
  mealPlans: MealPlan[];
  syncNow: () => Promise<void>;
  createList: (
    name: string,
    icon: string,
    type: ListType,
    visibility?: ListVisibility,
    memberIds?: string[]
  ) => Promise<ShoppingList>;
  updateList: (
    id: string,
    data: {
      name: string;
      icon: string;
      type: ListType;
      visibility: ListVisibility;
      memberIds: string[];
    }
  ) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addItem: (
    listId: string,
    data: {
      name: string;
      quantity: string;
      category: string;
      price?: string;
      note?: string;
      assigneeId?: string;
      dueDate?: string;
      priority?: string;
      status?: string;
    }
  ) => Promise<ListItem>;
  updateItem: (
    item: ListItem,
    data: Partial<
      Pick<
        ListItem,
        | "name"
        | "quantity"
        | "category"
        | "price"
        | "note"
        | "assigneeId"
        | "dueDate"
        | "priority"
        | "status"
        | "completed"
      >
    >
  ) => Promise<void>;
  deleteItem: (item: ListItem) => Promise<void>;
  createRecipe: (data: NewRecipeInput) => Promise<Recipe>;
  updateRecipe: (id: string, data: NewRecipeInput) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  setMealPlan: (data: {
    date: string;
    mealType: string;
    recipeId?: string | null;
    customTitle?: string | null;
  }) => Promise<MealPlan | void>;
  deleteMealPlan: (id: string) => Promise<void>;
  exportIngredients: (
    mealIds: string[],
    listId?: string
  ) => Promise<{
    list: ShoppingList;
    createdCount: number;
    aggregatedIngredients: { name: string; quantity: string }[];
  }>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function nestLists(lists: ShoppingList[], items: ListItem[]): ShoppingList[] {
  return lists.map((l) => ({ ...l, items: items.filter((i) => i.listId === l.id) }));
}

function nestRecipes(recipes: Recipe[], ingredients: Ingredient[]): Recipe[] {
  return recipes.map((r) => ({
    ...r,
    ingredients: ingredients.filter((i) => i.recipeId === r.id),
  }));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const familyId = user?.familyId ?? null;

  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isNavigatorOnline() ? "online" : "offline"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);

  const syncingRef = useRef(false);
  const familyRef = useRef(familyId);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await db.syncQueue.count());
  }, []);

  const loadLocal = useCallback(async () => {
    const [ls, items, recs, ings, meals] = await Promise.all([
      db.lists.toArray(),
      db.listItems.toArray(),
      db.recipes.toArray(),
      db.ingredients.toArray(),
      db.mealPlans.toArray(),
    ]);
    setLists(nestLists(ls, items));
    setRecipes(nestRecipes(recs, ings));
    setMealPlans(meals);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  const pullAll = useCallback(async () => {
    const [ls, recs, meals] = await Promise.all([
      api.get<ShoppingList[]>("/lists"),
      api.get<Recipe[]>("/recipes"),
      api.get<MealPlan[]>("/meals"),
    ]);

    const items = ls.flatMap((l) => l.items);
    const ings = recs.flatMap((r) => r.ingredients);

    await db.transaction(
      "rw",
      db.lists,
      db.listItems,
      db.recipes,
      db.ingredients,
      db.mealPlans,
      async () => {
        await db.lists.clear();
        await db.listItems.clear();
        await db.recipes.clear();
        await db.ingredients.clear();
        await db.mealPlans.clear();
        for (const l of ls) await db.lists.put(l);
        for (const i of items) await db.listItems.put(i);
        for (const r of recs) await db.recipes.put(r);
        for (const ing of ings) await db.ingredients.put(ing);
        for (const m of meals) await db.mealPlans.put(m);
      }
    );

    setLists(nestLists(ls, items));
    setRecipes(nestRecipes(recs, ings));
    setMealPlans(meals);
  }, []);

  const executeOp = useCallback(
    async (op: { table: SyncTable; action: SyncAction; payload: any }) => {
      const { table, action, payload } = op;

      switch (table) {
        case "lists": {
          if (action === "create") {
            const list = await api.post<ShoppingList>("/lists", payload);
            const normalized = { ...list, items: list.items ?? [] };
            await db.lists.put(normalized);
            setLists((s) => [
              normalized,
              ...s.filter((l) => l.id !== normalized.id),
            ]);
          } else if (action === "delete") {
            await api.delete(`/lists/${payload.id}`);
            await db.lists.delete(payload.id);
            await db.listItems.where("listId").equals(payload.id).delete();
            setLists((s) => s.filter((l) => l.id !== payload.id));
          } else if (action === "update") {
            const body: Record<string, unknown> = { ...payload };
            delete body.id;
            const list = await api.patch<ShoppingList>(`/lists/${payload.id}`, body);
            const normalized = { ...list, items: list.items ?? [] };
            await db.lists.put(normalized);
            setLists((s) =>
              s.map((l) => (l.id === normalized.id ? normalized : l))
            );
          }
          break;
        }
        case "listItems": {
          if (action === "create") {
            const item = await api.post<ListItem>(`/lists/${payload.listId}/items`, payload);
            await db.listItems.put(item);
            setLists((s) =>
              s.map((l) =>
                l.id === item.listId ? { ...l, items: [item, ...l.items] } : l
              )
            );
          } else if (action === "update") {
            const item = await api.patch<ListItem>(`/lists/items/${payload.id}`, payload);
            await db.listItems.put(item);
            setLists((s) =>
              s.map((l) =>
                l.id === item.listId
                  ? {
                      ...l,
                      items: l.items.map((i) => (i.id === item.id ? item : i)),
                    }
                  : l
              )
            );
          } else if (action === "delete") {
            await api.delete(`/lists/items/${payload.id}`);
            await db.listItems.delete(payload.id);
            setLists((s) =>
              s.map((l) => ({ ...l, items: l.items.filter((i) => i.id !== payload.id) }))
            );
          }
          break;
        }
        case "recipes": {
          if (action === "create") {
            const recipe = await api.post<Recipe>("/recipes", payload);
            await db.recipes.put(recipe);
            for (const ing of recipe.ingredients) await db.ingredients.put(ing);
            setRecipes((s) => [
              recipe,
              ...s.filter((r) => r.id !== recipe.id),
            ]);
          } else if (action === "update") {
            const recipe = await api.put<Recipe>(`/recipes/${payload.id}`, payload);
            await db.ingredients.where("recipeId").equals(recipe.id).delete();
            await db.recipes.put(recipe);
            for (const ing of recipe.ingredients) await db.ingredients.put(ing);
            setRecipes((s) =>
              s.map((r) => (r.id === recipe.id ? recipe : r))
            );
          } else if (action === "delete") {
            await api.delete(`/recipes/${payload.id}`);
            await db.recipes.delete(payload.id);
            await db.ingredients.where("recipeId").equals(payload.id).delete();
            setRecipes((s) => s.filter((r) => r.id !== payload.id));
          }
          break;
        }
        case "mealPlans": {
          if (action === "delete") {
            await api.delete(`/meals/${payload.id}`);
            await db.mealPlans.delete(payload.id);
            setMealPlans((s) => s.filter((m) => m.id !== payload.id));
            break;
          }
          const meal = await api.post<MealPlan>("/meals", payload);
          await db.mealPlans.delete(payload.id);
          await db.mealPlans.put(meal);
          setMealPlans((s) => [
            ...s.filter((m) => m.id !== meal.id),
            meal,
          ]);
          break;
        }
      }
    },
    []
  );

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !isNavigatorOnline()) return;
    syncingRef.current = true;
    setSyncStatus("syncing");
    try {
      const ops = await db.syncQueue.orderBy("createdAt").toArray();
      for (const op of ops) {
        try {
          await executeOp(op);
          await db.syncQueue.delete(op.id!);
        } catch (e) {
          if (e instanceof OfflineError) {
            break;
          }
          console.error("Fallo al sincronizar operación:", op, e);
          await db.syncQueue.delete(op.id!);
        }
      }
      await pullAll();
      setLastSyncedAt(new Date());
      setSyncStatus(isNavigatorOnline() ? "online" : "offline");
    } catch (e) {
      console.error("Error durante la sincronización:", e);
      setSyncStatus(isNavigatorOnline() ? "online" : "offline");
    } finally {
      syncingRef.current = false;
      await refreshPendingCount();
    }
  }, [executeOp, pullAll, refreshPendingCount]);

  const enqueue = useCallback(
    async (table: SyncTable, action: SyncAction, payload: Record<string, unknown>) => {
      await db.syncQueue.add({ table, action, payload, createdAt: Date.now() });
      await refreshPendingCount();
    },
    [refreshPendingCount]
  );

  const cancelPendingFor = useCallback(
    async (table: SyncTable, match: (p: Record<string, unknown>) => boolean) => {
      const ops = await db.syncQueue.toArray();
      const toDelete = ops.filter(
        (o) => o.table === table && match(o.payload)
      );
      if (toDelete.length) {
        await db.syncQueue.bulkDelete(toDelete.map((o) => o.id!));
        await refreshPendingCount();
      }
    },
    [refreshPendingCount]
  );

  // Boot: load local data immediately, then sync if online
  useEffect(() => {
    loadLocal().then(() => setReady(true));
  }, [loadLocal]);

  useEffect(() => {
    if (!ready || !familyId) return;
    if (isNavigatorOnline()) {
      syncNow();
    }
  }, [ready, familyId, syncNow]);

  // Reload data when family changes
  useEffect(() => {
    const prev = familyRef.current;
    if (prev !== null && prev !== familyId) {
      db.transaction(
        "rw",
        [db.lists, db.listItems, db.recipes, db.ingredients, db.mealPlans, db.syncQueue],
        async () => {
          await db.lists.clear();
          await db.listItems.clear();
          await db.recipes.clear();
          await db.ingredients.clear();
          await db.mealPlans.clear();
          await db.syncQueue.clear();
        }
      ).then(() => loadLocal());
    }
    familyRef.current = familyId;
  }, [familyId, loadLocal]);

  // Online/offline listeners
  useEffect(() => {
    const onOnline = () => {
      setSyncStatus("syncing");
      syncNow();
    };
    const onOffline = () => setSyncStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncNow]);

  // Real-time: subscribe to family events via SSE and re-sync on changes
  useEffect(() => {
    if (!familyId) return;
    const token = getToken();
    if (!token) return;

    const source = new EventSource(
      `/api/events?token=${encodeURIComponent(token)}`
    );

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.familyId === familyId) {
          syncNow();
        }
      } catch {
        // ignorar eventos malformados
      }
    };

    return () => {
      source.close();
    };
  }, [familyId, syncNow]);

  // --- CRUD operations ---

  const createList = useCallback(
    async (
      name: string,
      icon: string,
      type: ListType = "shopping",
      visibility: ListVisibility = "family",
      memberIds: string[] = []
    ): Promise<ShoppingList> => {
      const list: ShoppingList = {
        id: uid(),
        name,
        icon,
        type,
        familyId: familyId!,
        ownerId: user?.id ?? null,
        visibility,
        members: memberIds.map((userId) => ({ userId })),
        createdAt: new Date().toISOString(),
        items: [],
      };
      setLists((s) => [list, ...s]);
      await db.lists.put(list);
      const payload = { id: list.id, name, icon, type, visibility, memberIds };
      try {
        const created = await api.post<ShoppingList>("/lists", payload);
        const normalized = { ...created, items: created.items ?? [] };
        await db.lists.put(normalized);
        setLists((s) => [normalized, ...s.filter((l) => l.id !== list.id)]);
        return normalized;
      } catch (e) {
        if (e instanceof OfflineError) {
          await enqueue("lists", "create", payload);
          return list;
        }
        throw e;
      }
    },
    [familyId, user, enqueue]
  );

  const updateList = useCallback(
    async (
      id: string,
      data: {
        name: string;
        icon: string;
        type: ListType;
        visibility: ListVisibility;
        memberIds: string[];
      }
    ) => {
      const prev = lists.find((l) => l.id === id);
      if (!prev) return;
      const next: ShoppingList = {
        ...prev,
        name: data.name,
        icon: data.icon,
        type: data.type,
        visibility: data.visibility,
        members: data.memberIds.map((userId) => ({ userId })),
      };
      setLists((s) => s.map((l) => (l.id === id ? next : l)));
      await db.lists.put(next);
      try {
        const updated = await api.patch<ShoppingList>(`/lists/${id}`, data);
        const normalized = { ...updated, items: updated.items ?? prev.items };
        await db.lists.put(normalized);
        setLists((s) => s.map((l) => (l.id === id ? normalized : l)));
      } catch (e) {
        if (e instanceof OfflineError) {
          await enqueue("lists", "update", { id, ...data });
          return;
        }
        throw e;
      }
    },
    [lists, enqueue]
  );

  const deleteList = useCallback(
    async (id: string) => {
      setLists((s) => s.filter((l) => l.id !== id));
      await db.lists.delete(id);
      await db.listItems.where("listId").equals(id).delete();
      try {
        await api.delete(`/lists/${id}`);
      } catch (e) {
        if (e instanceof OfflineError) {
          await cancelPendingFor("lists", (p) => p.id === id);
          await enqueue("lists", "delete", { id });
          return;
        }
        throw e;
      }
    },
    [enqueue, cancelPendingFor]
  );

  const addItem = useCallback(
    async (
      listId: string,
      data: {
        name: string;
        quantity: string;
        category: string;
        price?: string;
        note?: string;
        assigneeId?: string;
        dueDate?: string;
        priority?: string;
        status?: string;
      }
    ): Promise<ListItem> => {
      const item: ListItem = {
        id: uid(),
        listId,
        name: data.name,
        quantity: data.quantity,
        category: data.category,
        price: data.price ?? "",
        note: data.note ?? "",
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        completed: false,
        createdAt: new Date().toISOString(),
        priceHistory: [],
      };
      setLists((s) => s.map((l) => (l.id === listId ? { ...l, items: [item, ...l.items] } : l)));
      await db.listItems.put(item);
      try {
        const created = await api.post<ListItem>(`/lists/${listId}/items`, {
          id: item.id,
          ...data,
        });
        const merged = { ...created, priceHistory: item.priceHistory ?? [] };
        await db.listItems.put(merged);
        setLists((s) =>
          s.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: [merged, ...l.items.filter((i) => i.id !== item.id)],
                }
              : l
          )
        );
        return merged;
      } catch (e) {
        if (e instanceof OfflineError) {
          await enqueue("listItems", "create", { id: item.id, listId, ...data });
          return item;
        }
        throw e;
      }
    },
    [enqueue]
  );

  const updateItem = useCallback(
    async (
      item: ListItem,
      data: Partial<
        Pick<
          ListItem,
          | "name"
          | "quantity"
          | "category"
          | "price"
          | "note"
          | "assigneeId"
          | "dueDate"
          | "priority"
          | "status"
          | "completed"
        >
      >
    ) => {
      const next = { ...item, ...data };
      setLists((s) =>
        s.map((l) =>
          l.id === item.listId
            ? { ...l, items: l.items.map((i) => (i.id === item.id ? next : i)) }
            : l
        )
      );
      await db.listItems.put(next);
      try {
        const updated = await api.patch<ListItem>(`/lists/items/${item.id}`, data);
        const merged = { ...updated, priceHistory: next.priceHistory ?? [] };
        await db.listItems.put(merged);
        setLists((s) =>
          s.map((l) =>
            l.id === item.listId
              ? { ...l, items: l.items.map((i) => (i.id === item.id ? merged : i)) }
              : l
          )
        );
      } catch (e) {
        if (e instanceof OfflineError) {
          await enqueue("listItems", "update", {
            id: item.id,
            name: next.name,
            quantity: next.quantity,
            category: next.category,
            completed: next.completed,
          });
          return;
        }
        throw e;
      }
    },
    [enqueue]
  );

  const deleteItem = useCallback(
    async (item: ListItem) => {
      setLists((s) =>
        s.map((l) => ({ ...l, items: l.items.filter((i) => i.id !== item.id) }))
      );
      await db.listItems.delete(item.id);
      try {
        await api.delete(`/lists/items/${item.id}`);
      } catch (e) {
        if (e instanceof OfflineError) {
          await cancelPendingFor("listItems", (p) => p.id === item.id);
          await enqueue("listItems", "delete", { id: item.id });
          return;
        }
        throw e;
      }
    },
    [enqueue, cancelPendingFor]
  );

  const createRecipe = useCallback(
    async (data: NewRecipeInput): Promise<Recipe> => {
      const id = uid();
      const recipe: Recipe = {
        id,
        familyId: familyId!,
        title: data.title,
        description: data.description ?? null,
        prepTime: data.prepTime ?? null,
        servings: data.servings ?? 4,
        instructions: data.instructions ?? null,
        ingredients:
          data.ingredients?.map((ing) => ({
            id: uid(),
            recipeId: id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
          })) ?? [],
        createdAt: new Date().toISOString(),
      };
      setRecipes((s) => [recipe, ...s]);
      await db.recipes.put(recipe);
      for (const ing of recipe.ingredients) await db.ingredients.put(ing);
      const payload = {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        instructions: recipe.instructions,
        ingredients: recipe.ingredients.map((i) => ({
          name: i.name,
          amount: i.amount,
          unit: i.unit,
        })),
      };
      try {
        const created = await api.post<Recipe>("/recipes", payload);
        await db.recipes.put(created);
        for (const ing of created.ingredients) await db.ingredients.put(ing);
        setRecipes((s) => [created, ...s.filter((r) => r.id !== recipe.id)]);
        return created;
      } catch (e) {
        if (e instanceof OfflineError) {
          await enqueue("recipes", "create", payload);
          return recipe;
        }
        throw e;
      }
    },
    [familyId, enqueue]
  );

  const updateRecipe = useCallback(
    async (id: string, data: NewRecipeInput) => {
      const existing = recipes.find((r) => r.id === id);
      if (!existing) return;
      const next: Recipe = {
        ...existing,
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        prepTime: data.prepTime ?? existing.prepTime,
        servings: data.servings ?? existing.servings,
        instructions: data.instructions ?? existing.instructions,
        ingredients:
          data.ingredients?.map((ing) => ({
            id: uid(),
            recipeId: id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
          })) ?? existing.ingredients,
      };
      setRecipes((s) => s.map((r) => (r.id === id ? next : r)));
      await db.ingredients.where("recipeId").equals(id).delete();
      await db.recipes.put(next);
      for (const ing of next.ingredients) await db.ingredients.put(ing);
      const payload = {
        id,
        title: next.title,
        description: next.description,
        prepTime: next.prepTime,
        servings: next.servings,
        instructions: next.instructions,
        ingredients: next.ingredients.map((i) => ({
          name: i.name,
          amount: i.amount,
          unit: i.unit,
        })),
      };
      try {
        const updated = await api.put<Recipe>(`/recipes/${id}`, payload);
        await db.ingredients.where("recipeId").equals(id).delete();
        await db.recipes.put(updated);
        for (const ing of updated.ingredients) await db.ingredients.put(ing);
        setRecipes((s) => s.map((r) => (r.id === id ? updated : r)));
      } catch (e) {
        if (e instanceof OfflineError) {
          await enqueue("recipes", "update", payload);
          return;
        }
        throw e;
      }
    },
    [recipes, enqueue]
  );

  const deleteRecipe = useCallback(
    async (id: string) => {
      setRecipes((s) => s.filter((r) => r.id !== id));
      await db.recipes.delete(id);
      await db.ingredients.where("recipeId").equals(id).delete();
      try {
        await api.delete(`/recipes/${id}`);
      } catch (e) {
        if (e instanceof OfflineError) {
          await cancelPendingFor("recipes", (p) => p.id === id);
          await enqueue("recipes", "delete", { id });
          return;
        }
        throw e;
      }
    },
    [enqueue, cancelPendingFor]
  );

  const setMealPlan = useCallback(
    async (data: { date: string; mealType: string; recipeId?: string | null; customTitle?: string | null }) => {
      if (!data.recipeId && !data.customTitle) return;
      const meal: MealPlan = {
        id: uid(),
        familyId: familyId!,
        date: data.date,
        mealType: data.mealType,
        recipeId: data.recipeId ?? null,
        recipe: data.recipeId ? recipes.find((r) => r.id === data.recipeId) ?? null : null,
        customTitle: data.customTitle ?? null,
        createdAt: new Date().toISOString(),
      };
      setMealPlans((s) => [...s, meal]);
      await db.mealPlans.put(meal);
      const payload = {
        id: meal.id,
        date: data.date,
        mealType: data.mealType,
        recipeId: data.recipeId ?? null,
        customTitle: data.customTitle ?? null,
      };
      try {
        const saved = await api.post<MealPlan>("/meals", payload);
        await db.mealPlans.delete(meal.id);
        await db.mealPlans.put(saved);
        setMealPlans((s) => [...s.filter((m) => m.id !== meal.id), saved]);
      } catch (e) {
        if (e instanceof OfflineError) {
          await cancelPendingFor("mealPlans", (p) => p.id === meal.id);
          await enqueue("mealPlans", "create", payload);
          return meal;
        }
        throw e;
      }
    },
    [recipes, familyId, enqueue, cancelPendingFor]
  );

  const deleteMealPlan = useCallback(
    async (id: string) => {
      setMealPlans((s) => s.filter((m) => m.id !== id));
      await db.mealPlans.delete(id);
      try {
        await api.delete(`/meals/${id}`);
      } catch (e) {
        if (e instanceof OfflineError) {
          await cancelPendingFor("mealPlans", (p) => p.id === id);
          await enqueue("mealPlans", "delete", { id });
          return;
        }
        throw e;
      }
    },
    [enqueue, cancelPendingFor]
  );

  const exportIngredients = useCallback(
    async (mealIds: string[], listId?: string) => {
      const meals = mealPlans.filter((m) => m.recipeId && mealIds.includes(m.id));
      if (meals.length === 0) {
        throw new Error("No hay recetas planificadas para exportar");
      }

      const aggregated = new Map<
        string,
        { name: string; quantity: string }
      >();
      for (const mp of meals) {
        const recipe = recipes.find((r) => r.id === mp.recipeId);
        if (!recipe) continue;
        for (const ing of recipe.ingredients) {
          const key = ing.name.toLowerCase().trim();
          aggregated.set(key, {
            name: ing.name,
            quantity: `${ing.amount}${ing.unit ? " " + ing.unit : ""}`,
          });
        }
      }

      let target = listId
        ? lists.find((l) => l.id === listId)
        : lists.find((l) => l.id === listId) ?? lists[0];
      if (!target) {
        target = await createList("Supermercado", "shopping-bag");
      }

      let createdCount = 0;
      for (const ing of aggregated.values()) {
        const existingItem = target.items.find(
          (i) => i.name === ing.name && !i.completed
        );
        if (existingItem) {
          await updateItem(existingItem, { quantity: ing.quantity });
        } else {
          await addItem(target.id, {
            name: ing.name,
            quantity: ing.quantity,
            category: "Supermercado",
          });
          createdCount += 1;
        }
      }

      return {
        list: target,
        createdCount,
        aggregatedIngredients: Array.from(aggregated.values()),
      };
    },
    [mealPlans, recipes, lists, createList, addItem, updateItem]
  );

  return (
    <DataContext.Provider
      value={{
        ready,
        syncStatus,
        pendingCount,
        lastSyncedAt,
        lists,
        recipes,
        mealPlans,
        syncNow,
        createList,
        updateList,
        deleteList,
        addItem,
        updateItem,
        deleteItem,
        createRecipe,
        updateRecipe,
        deleteRecipe,
        setMealPlan,
        deleteMealPlan,
        exportIngredients,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData debe usarse dentro de DataProvider");
  return ctx;
}
