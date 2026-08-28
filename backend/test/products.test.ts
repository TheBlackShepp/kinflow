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

describe("Products", () => {
  it("creates, searches, updates and deletes a product", async () => {
    const { token } = await setup();
    const created = await request(api)
      .post("/api/products")
      .set(headers(token))
      .send({ name: "Leche", category: "Lácteos", unit: "L" });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Leche");

    const search = await request(api).get("/api/products/search?q=lech").set(headers(token));
    expect(search.status).toBe(200);
    expect(search.body.length).toBe(1);

    const updated = await request(api)
      .patch(`/api/products/${created.body.id}`)
      .set(headers(token))
      .send({ name: "Leche entera" });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Leche entera");

    const del = await request(api).delete(`/api/products/${created.body.id}`).set(headers(token));
    expect(del.status).toBe(200);
  });

  it("prevents duplicate product names in a family", async () => {
    const { token } = await setup();
    await request(api).post("/api/products").set(headers(token)).send({ name: "Leche", category: "L", unit: "L" });
    const dup = await request(api).post("/api/products").set(headers(token)).send({ name: "Leche", category: "L", unit: "L" });
    expect(dup.status).toBe(409);
  });

  it("manages prices per supermarket (upsert)", async () => {
    const { token } = await setup();
    const supermercado = await request(api).post("/api/supermarkets").set(headers(token)).send({ name: "Mercadona" });
    const product = await request(api).post("/api/products").set(headers(token)).send({ name: "Arroz", category: "Supermercado", unit: "kg" });

    const price = await request(api)
      .post(`/api/products/${product.body.id}/prices`)
      .set(headers(token))
      .send({ supermarketId: supermercado.body.id, price: "1.05" });
    expect(price.status).toBe(201);

    // upsert same product+supermarket updates price
    const price2 = await request(api)
      .post(`/api/products/${product.body.id}/prices`)
      .set(headers(token))
      .send({ supermarketId: supermercado.body.id, price: "1.10" });
    expect(price2.body.price).toBe("1.10");

    const del = await request(api).delete(`/api/products/prices/${price2.body.id}`).set(headers(token));
    expect(del.status).toBe(200);
  });
});

describe("Supermarkets", () => {
  it("creates and deletes a supermarket", async () => {
    const { token } = await setup();
    const created = await request(api).post("/api/supermarkets").set(headers(token)).send({ name: "Lidl" });
    expect(created.status).toBe(201);

    const del = await request(api).delete(`/api/supermarkets/${created.body.id}`).set(headers(token));
    expect(del.status).toBe(200);
  });

  it("prevents deleting a supermarket that has prices", async () => {
    const { token } = await setup();
    const sup = await request(api).post("/api/supermarkets").set(headers(token)).send({ name: "Mercadona" });
    const product = await request(api).post("/api/products").set(headers(token)).send({ name: "Pan", category: "Panadería", unit: "u" });
    await request(api)
      .post(`/api/products/${product.body.id}/prices`)
      .set(headers(token))
      .send({ supermarketId: sup.body.id, price: "0.80" });

    const del = await request(api).delete(`/api/supermarkets/${sup.body.id}`).set(headers(token));
    expect(del.status).toBe(409);
  });
});
