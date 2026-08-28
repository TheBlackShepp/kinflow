import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { api, createUser } from "./helpers";
import { resetDb } from "./setup";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/auth/status", () => {
  it("returns empty system state on a fresh DB", async () => {
    const res = await request(api).get("/api/auth/status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hasUsers: false, hasFamily: false });
  });
});

describe("POST /api/auth/register", () => {
  it("registers the first user as admin and returns a token", async () => {
    const res = await request(api).post("/api/auth/register").send({
      name: "Alice",
      username: "alice",
      password: "secret123",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.username).toBe("alice");
    expect(res.body.user.role).toBe("admin");
  });

  it("rejects registration when users already exist", async () => {
    await createUser({ username: "bob" });
    const res = await request(api).post("/api/auth/register").send({
      name: "Carol",
      username: "carol",
      password: "secret123",
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 (registration closed) once a user exists, even on duplicate username", async () => {
    await request(api).post("/api/auth/register").send({
      name: "Alice",
      username: "alice",
      password: "secret123",
    });
    const res = await request(api).post("/api/auth/register").send({
      name: "Alice 2",
      username: "ALICE", // would be normalized to lowercase if reached
      password: "secret123",
    });
    expect(res.status).toBe(403);
  });

  it("rejects missing fields", async () => {
    const res = await request(api).post("/api/auth/register").send({
      name: "OnlyName",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with valid credentials", async () => {
    await request(api).post("/api/auth/register").send({
      name: "Alice",
      username: "alice",
      password: "secret123",
    });
    const res = await request(api).post("/api/auth/login").send({
      username: "alice",
      password: "secret123",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.username).toBe("alice");
  });

  it("rejects wrong password", async () => {
    await request(api).post("/api/auth/register").send({
      name: "Alice",
      username: "alice",
      password: "secret123",
    });
    const res = await request(api).post("/api/auth/login").send({
      username: "alice",
      password: "wrongpass",
    });
    expect(res.status).toBe(400);
  });

  it("rejects unknown user", async () => {
    const res = await request(api).post("/api/auth/login").send({
      username: "nobody",
      password: "secret123",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user with family", async () => {
    const { token } = await onboardFirst();
    const res = await request(api).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("firstadmin");
    expect(res.body.permissions).toBeNull();
  });

  it("returns 401 without a token", async () => {
    const res = await request(api).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 403/401 for an invalid token", async () => {
    const res = await request(api)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-valid-token");
    expect([401, 403]).toContain(res.status);
  });
});

async function onboardFirst() {
  const reg = await request(api).post("/api/auth/register").send({
    name: "First Admin",
    username: "firstadmin",
    password: "test1234",
  });
  return { token: reg.body.token };
}
