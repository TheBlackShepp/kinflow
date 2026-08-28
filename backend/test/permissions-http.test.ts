import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { api, onboardAdmin, createUser, createFamily, joinFamily, tokenFor } from "./helpers";
import { resetDb } from "./setup";
import prisma from "../src/prisma";

beforeEach(async () => {
  await resetDb();
});

async function setupFamilyWithMember() {
  const { token } = await onboardAdmin("adm");
  await request(api).post("/api/family").set("Authorization", `Bearer ${token}`).send({ name: "Home" });
  const me = await request(api).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  const familyId = me.body.familyId;

  const member = await createUser({ username: "mem" });
  await joinFamily(member.id, familyId, { role: "member", permissions: null });

  const mToken = tokenFor({ id: member.id, username: "mem", familyId, role: "member" });
  return { adminToken: token, familyId, member, mToken };
}

async function setPerms(memberId: string, permissions: any) {
  await prisma.user.update({ where: { id: memberId }, data: { permissions } });
}

describe("requireModule: method-aware access", () => {
  it("member with lists:read can GET but not POST", async () => {
    const { mToken, member } = await setupFamilyWithMember();
    await setPerms(member.id, { lists: "read", products: "read", recipes: "read", meals: "read" });

    const get = await request(api).get("/api/lists").set("Authorization", `Bearer ${mToken}`);
    expect(get.status).toBe(200);

    const post = await request(api).post("/api/lists").set("Authorization", `Bearer ${mToken}`).send({ name: "X", type: "shopping" });
    expect(post.status).toBe(403);
  });

  it("member with products:none is denied on products and supermarkets", async () => {
    const { mToken, member, familyId } = await setupFamilyWithMember();
    await setPerms(member.id, { lists: "full", products: "none", recipes: "full", meals: "full" });

    const products = await request(api).get("/api/products").set("Authorization", `Bearer ${mToken}`);
    expect(products.status).toBe(403);

    const search = await request(api).get("/api/products/search?q=x").set("Authorization", `Bearer ${mToken}`);
    expect(search.status).toBe(403);

    const supermarkets = await request(api).get("/api/supermarkets").set("Authorization", `Bearer ${mToken}`);
    expect(supermarkets.status).toBe(403);

    // writing a product is also blocked
    const create = await request(api).post("/api/products").set("Authorization", `Bearer ${mToken}`).send({ name: "P" }).set("Content-Type", "application/json");
    expect(create.status).toBe(403);
    // ensure familyId unused lint
    void familyId;
  });

  it("member with meals:read can GET but not write", async () => {
    const { mToken, member } = await setupFamilyWithMember();
    await setPerms(member.id, { lists: "full", products: "full", recipes: "full", meals: "read" });

    const get = await request(api).get("/api/meals").set("Authorization", `Bearer ${mToken}`);
    expect(get.status).toBe(200);

    const create = await request(api).post("/api/meals").set("Authorization", `Bearer ${mToken}`).send({ date: "2026-08-28", mealType: "Almuerzo", customTitle: "Pizza" });
    expect(create.status).toBe(403);
  });

  it("member with recipes:none cannot access recipes", async () => {
    const { mToken, member } = await setupFamilyWithMember();
    await setPerms(member.id, { lists: "full", products: "full", recipes: "none", meals: "full" });

    const get = await request(api).get("/api/recipes").set("Authorization", `Bearer ${mToken}`);
    expect(get.status).toBe(403);
  });

  it("admin (permissions null) has full access everywhere", async () => {
    const { adminToken } = await setupFamilyWithMember();

    const lists = await request(api).get("/api/lists").set("Authorization", `Bearer ${adminToken}`);
    expect(lists.status).toBe(200);
    const createList = await request(api).post("/api/lists").set("Authorization", `Bearer ${adminToken}`).send({ name: "A", type: "shopping" });
    expect(createList.status).toBe(201);

    const meals = await request(api).get("/api/meals").set("Authorization", `Bearer ${adminToken}`);
    expect(meals.status).toBe(200);
    const createMeal = await request(api).post("/api/meals").set("Authorization", `Bearer ${adminToken}`).send({ date: "2026-08-28", mealType: "Cena", customTitle: "Pasta" });
    expect(createMeal.status).toBe(201);
  });

  it("member with no explicit permissions defaults to full", async () => {
    const { mToken } = await setupFamilyWithMember(); // permissions: null in DB
    // a member with null permissions is treated as full default
    const post = await request(api).post("/api/products").set("Authorization", `Bearer ${mToken}`).send({ name: "Leche", category: "Lácteos", unit: "L" });
    expect(post.status).toBe(201);
  });

  it("returns 401 without a token on protected modules", async () => {
    const res = await request(api).get("/api/lists");
    expect(res.status).toBe(401);
  });
});
