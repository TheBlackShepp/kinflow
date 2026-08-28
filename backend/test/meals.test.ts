import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { api, onboardAdmin } from "./helpers";
import { resetDb } from "./setup";
import prisma from "../src/prisma";

beforeEach(async () => {
  await resetDb();
});

async function setup() {
  const { token } = await onboardAdmin("adm");
  await request(api).post("/api/family").set("Authorization", `Bearer ${token}`).send({ name: "Home" });
  const me = await request(api).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  return { token, adminId: me.body.id, familyId: me.body.familyId };
}

const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Meals", () => {
  it("creates a custom meal and lists it by date range", async () => {
    const { token } = await setup();
    const created = await request(api)
      .post("/api/meals")
      .set(headers(token))
      .send({ date: "2026-08-28", mealType: "Almuerzo", customTitle: "Pizza" });
    expect(created.status).toBe(201);
    expect(created.body.customTitle).toBe("Pizza");

    const list = await request(api).get("/api/meals?start=2026-08-01&end=2026-08-31").set(headers(token));
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);

    const del = await request(api).delete(`/api/meals/${created.body.id}`).set(headers(token));
    expect(del.status).toBe(200);
    const count = await prisma.mealPlan.count({ where: { id: created.body.id } });
    expect(count).toBe(0);
  });

  it("requires date, mealType and a title or recipe", async () => {
    const { token } = await setup();
    const noDate = await request(api).post("/api/meals").set(headers(token)).send({ mealType: "Cena", recipeId: "x" });
    expect(noDate.status).toBe(400);

    const noTitle = await request(api)
      .post("/api/meals")
      .set(headers(token))
      .send({ date: "2026-08-28", mealType: "Desayuno" });
    expect(noTitle.status).toBe(400);
  });

  it("creates a meal from a recipe", async () => {
    const { token } = await setup();
    const recipe = await request(api).post("/api/recipes").set(headers(token)).send({ title: "Guiso" });
    const meal = await request(api)
      .post("/api/meals")
      .set(headers(token))
      .send({ date: "2026-08-29", mealType: "Cena", recipeId: recipe.body.id });
    expect(meal.status).toBe(201);
    expect(meal.body.recipeId).toBe(recipe.body.id);
  });

  it("exports planned recipe ingredients to a shopping list", async () => {
    const { token } = await setup();
    const recipe = await request(api)
      .post("/api/recipes")
      .set(headers(token))
      .send({
        title: "Guiso",
        ingredients: [
          { name: "Patata", amount: "500", unit: "g" },
          { name: "Cebolla", amount: "2", unit: "u" },
        ],
      });
    await request(api)
      .post("/api/meals")
      .set(headers(token))
      .send({ date: "2026-08-29", mealType: "Cena", recipeId: recipe.body.id });

    // same ingredient in two planned recipes
    const recipe2 = await request(api)
      .post("/api/recipes")
      .set(headers(token))
      .send({ title: "Puré", ingredients: [{ name: "Patata", amount: "300", unit: "g" }] });
    await request(api)
      .post("/api/meals")
      .set(headers(token)
      )
      .send({ date: "2026-08-30", mealType: "Cena", recipeId: recipe2.body.id });

    const res = await request(api)
      .post("/api/meals/export-to-list")
      .set(headers(token))
      .send({ start: "2026-08-01", end: "2026-08-31" });
    expect(res.status).toBe(200);

    const items = await prisma.listItem.findMany({
      where: { listId: res.body.listId },
    });
    expect(items.length).toBe(2); // Patata (merged) + Cebolla
    const patata = items.find((i) => i.name === "Patata");
    expect(patata).toBeDefined();
  });

  it("fails export when no recipes are planned in range", async () => {
    const { token } = await setup();
    const res = await request(api)
      .post("/api/meals/export-to-list")
      .set(headers(token))
      .send({ start: "2026-01-01", end: "2026-01-31" });
    expect(res.status).toBe(400);
  });
});
