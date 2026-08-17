export interface User {
  id: string;
  name: string;
  email: string;
  familyId?: string | null;
  family?: Family | null;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  users?: { id: string; name: string; email: string }[];
}

export interface PriceEntry {
  id: string;
  itemId: string;
  price: string;
  recordedAt: string;
}

export interface ListItem {
  id: string;
  listId: string;
  name: string;
  quantity: string;
  category: string;
  price?: string | null;
  note?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  status?: string;
  completed: boolean;
  createdAt: string;
  priceHistory?: PriceEntry[];
}

export type ListVisibility = "private" | "family" | "custom";

export type ListType = "shopping" | "todo" | "packing" | "wishlist" | "media";

export interface ShoppingList {
  id: string;
  name: string;
  icon: string;
  color?: string;
  type?: ListType;
  familyId: string;
  ownerId?: string | null;
  visibility?: ListVisibility;
  pinned?: boolean;
  order?: number;
  members?: { userId: string }[];
  createdAt: string;
  items: ListItem[];
}

export interface Ingredient {
  id?: string;
  recipeId?: string;
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  familyId: string;
  title: string;
  description?: string | null;
  prepTime?: string | null;
  servings: number;
  instructions?: string | null;
  ingredients: Ingredient[];
  createdAt: string;
}

export interface MealPlan {
  id: string;
  familyId: string;
  date: string;
  mealType: string;
  recipeId?: string | null;
  recipe?: Recipe | null;
  customTitle?: string | null;
  createdAt: string;
}

export const MEAL_TYPES = ["Desayuno", "Almuerzo", "Cena", "Snack"] as const;

export const MEAL_TYPE_COLORS: Record<string, string> = {
  Desayuno: "bg-amber-100 text-amber-700",
  Almuerzo: "bg-emerald-100 text-emerald-700",
  Cena: "bg-indigo-100 text-indigo-700",
  Snack: "bg-pink-100 text-pink-700",
};
