import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { api, onboardAdmin, createUser, joinFamily, tokenFor } from "./helpers";
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

describe("Lists CRUD", () => {
  it("creates and fetches a list", async () => {
    const { token } = await setup();
    const created = await request(api)
      .post("/api/lists")
      .set(headers(token))
      .send({ name: "Supermarket", type: "shopping" });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Supermarket");
    expect(created.body.items).toEqual([]);

    const got = await request(api).get(`/api/lists/${created.body.id}`).set(headers(token));
    expect(got.status).toBe(200);
    expect(got.body.id).toBe(created.body.id);
  });

  it("requires a name", async () => {
    const { token } = await setup();
    const res = await request(api).post("/api/lists").set(headers(token)).send({ type: "shopping" });
    expect(res.status).toBe(400);
    void res;
  });

  it("updates the list (owner)", async () => {
    const { token } = await setup();
    const created = await request(api).post("/api/lists").set(headers(token)).send({ name: "Old", type: "shopping" });
    const res = await request(api)
      .patch(`/api/lists/${created.body.id}`)
      .set(headers(token))
      .send({ name: "New" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New");
  });

  it("deletes a list", async () => {
    const { token } = await setup();
    const created = await request(api).post("/api/lists").set(headers(token)).send({ name: "Temp", type: "shopping" });
    const del = await request(api).delete(`/api/lists/${created.body.id}`).set(headers(token));
    expect(del.status).toBe(200);
    const gone = await request(api).get(`/api/lists/${created.body.id}`).set(headers(token));
    expect(gone.status).toBe(404);
  });

  it("reorders lists", async () => {
    const { token, familyId } = await setup();
    const l1 = await request(api).post("/api/lists").set(headers(token)).send({ name: "A", type: "shopping" });
    const l2 = await request(api).post("/api/lists").set(headers(token)).send({ name: "B", type: "shopping" });

    const res = await request(api)
      .patch("/api/lists/reorder")
      .set(headers(token))
      .send({ ids: [l2.body.id, l1.body.id] });
    expect(res.status).toBe(200);

    const list = await prisma.list.findUnique({ where: { id: l2.body.id } });
    expect(list!.order).toBe(0);
    void familyId;
  });

  it("respects visibility (private not shown to others)", async () => {
    const { token, familyId } = await setup();
    const member = await createUser({ username: "mem" });
    await joinFamily(member.id, familyId, { role: "member" });
    const mToken = tokenFor({ id: member.id, username: "mem", familyId, role: "member" });

    await request(api)
      .post("/api/lists")
      .set(headers(token))
      .send({ name: "Secret", type: "shopping", visibility: "private" });
    const visible = await request(api).post("/api/lists").set(headers(token)).send({ name: "Shared", type: "shopping", visibility: "family" });

    const memberLists = await request(api).get("/api/lists").set(headers(mToken));
    const names = memberLists.body.map((l: any) => l.name);
    expect(names).toContain("Shared");
    expect(names).not.toContain("Secret");
    void visible;
  });
});

describe("List items", () => {
  it("adds and toggles an item", async () => {
    const { token } = await setup();
    const list = await request(api).post("/api/lists").set(headers(token)).send({ name: "S", type: "shopping" });
    const item = await request(api)
      .post(`/api/lists/${list.body.id}/items`)
      .set(headers(token))
      .send({ name: "Leche", quantity: "2", category: "Lácteos" });
    expect(item.status).toBe(201);
    expect(item.body.completed).toBe(false);

    const toggled = await request(api)
      .patch(`/api/lists/items/${item.body.id}`)
      .set(headers(token))
      .send({ completed: true });
    expect(toggled.status).toBe(200);
    expect(toggled.body.completed).toBe(true);
  });

  it("deletes an item", async () => {
    const { token } = await setup();
    const list = await request(api).post("/api/lists").set(headers(token)).send({ name: "S", type: "shopping" });
    const item = await request(api).post(`/api/lists/${list.body.id}/items`).set(headers(token)).send({ name: "Pan" });
    const del = await request(api).delete(`/api/lists/items/${item.body.id}`).set(headers(token));
    expect(del.status).toBe(200);
    const count = await prisma.listItem.count({ where: { id: item.body.id } });
    expect(count).toBe(0);
  });

  it("records a price history for wishlist items", async () => {
    const { token } = await setup();
    const list = await request(api).post("/api/lists").set(headers(token)).send({ name: "Wish", type: "wishlist" });
    const item = await request(api)
      .post(`/api/lists/${list.body.id}/items`)
      .set(headers(token))
      .send({ name: "Un regalo", price: "19.99" });
    const prices = await request(api).get(`/api/lists/items/${item.body.id}/prices`).set(headers(token));
    expect(prices.status).toBe(200);
    expect(prices.body.length).toBe(1);
    expect(prices.body[0].price).toBe("19.99");
  });
});
