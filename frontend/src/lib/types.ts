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

export interface ListItem {
  id: string;
  listId: string;
  name: string;
  quantity: string;
  category: string;
  completed: boolean;
  createdAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  icon: string;
  familyId: string;
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
