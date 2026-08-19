import Dexie, { type Table } from "dexie";
import type { ShoppingList, ListItem, Recipe, Ingredient, MealPlan, Product, Supermarket, ProductPrice } from "./types";

export type SyncTable = "lists" | "listItems" | "recipes" | "mealPlans" | "products" | "supermarkets";
export type SyncAction = "create" | "update" | "delete";

export interface SyncOp {
  id?: number;
  table: SyncTable;
  action: SyncAction;
  payload: Record<string, unknown>;
  createdAt: number;
}

class KinflowDB extends Dexie {
  lists!: Table<ShoppingList, string>;
  listItems!: Table<ListItem, string>;
  recipes!: Table<Recipe, string>;
  ingredients!: Table<Ingredient, string>;
  mealPlans!: Table<MealPlan, string>;
  products!: Table<Product, string>;
  supermarkets!: Table<Supermarket, string>;
  productPrices!: Table<ProductPrice, string>;
  syncQueue!: Table<SyncOp, number>;

  constructor() {
    super("kinflow");
    this.version(2).stores({
      lists: "id, name, familyId",
      listItems: "id, listId, name, completed",
      recipes: "id, title, familyId",
      ingredients: "id, recipeId, name",
      mealPlans: "id, familyId, date, mealType",
      products: "id, familyId, name, category",
      supermarkets: "id, familyId, name",
      productPrices: "id, productId, supermarketId",
      syncQueue: "++id, createdAt",
    });
  }
}

export const db = new KinflowDB();

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
