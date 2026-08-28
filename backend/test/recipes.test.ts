import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { api, onboardAdmin } from "./helpers";
import { resetDb } from "./setup";

beforeEach(async () => {
  await resetDb();
});

async function setup() {
  const { token } = await onboardAdmin("adm");
  await request(api).post("/api/family").set("Authorization", `Bearer ${token}`).send({ name: "Home" });
  const me = await request(api).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  return { token, familyId: me.body.familyId };
}

const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Recipes", () => {
  it("creates, fetches, updates and deletes a recipe with ingredients", async () => {
    const { token } = await setup();
    const created = await request(api)
      .post("/api/recipes")
      .set(headers(token))
      .send({
        title: "Lasaña",
        description: "De la abuela",
        prepTime: "45 min",
        servings: 4,
        instructions: "Capa a capa",
        ingredients: [
          { name: "Pasta", amount: "500", unit: "g" },
          { name: "Carne", amount: "300", unit: "g" },
        ],
      });
    expect(created.status).toBe(201);
    expect(created.body.ingredients.length).toBe(2);

    const single = await request(api).get(`/api/recipes/${created.body.id}`).set(headers(token));
    expect(single.status).toBe(200);
    expect(single.body.ingredients.length).toBe(2);

    const updated = await request(api)
      .put(`/api/recipes/${created.body.id}`)
      .set(headers(token))
      .send({
        title: "Lasaña vegana",
        ingredients: [{ name: "Tofu", amount: "400", unit: "g" }],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("Lasaña vegana");
    expect(updated.body.ingredients.length).toBe(1);

    const del = await request(api).delete(`/api/recipes/${created.body.id}`).set(headers(token));
    expect(del.status).toBe(200);
    const count = await (await import("../src/prisma")).default.recipe.count({
      where: { id: created.body.id },
    });
    expect(count).toBe(0);
  });

  it("requires a title", async () => {
    const { token } = await setup();
    const res = await request(api).post("/api/recipes").set(headers(token)).send({ servings: 2 });
    expect(res.status).toBe(400);
    void res;
  });
});
