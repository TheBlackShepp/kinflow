import { beforeEach } from "vitest";
import prisma from "../src/prisma";

const MODELS = [
  "PriceEntry",
  "ListItem",
  "ListMember",
  "List",
  "Ingredient",
  "MealPlan",
  "Recipe",
  "ProductPrice",
  "Product",
  "Supermarket",
  "FamilyInvite",
  "User",
  "Family",
] as const;

export async function resetDb() {
  for (const model of MODELS) {
    // @ts-expect-error dynamic deleteMany
    await prisma[model].deleteMany({});
  }
}

beforeEach(async () => {
  await resetDb();
});
