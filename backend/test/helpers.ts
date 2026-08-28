import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../src/app";
import prisma from "../src/prisma";
import type { Family, User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";

export const api = app;

// Create a user directly in the DB (bypasses HTTP) for setup speed.
export async function createUser(overrides: {
  username: string;
  name?: string;
  password?: string;
}): Promise<User> {
  const { username, name = "Test User", password = "test1234" } = overrides;
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      username,
      name,
      password: hashed,
      role: "member",
    },
  });
}

// Create a family directly in the DB.
export async function createFamily(overrides?: {
  name?: string;
  inviteCode?: string;
}): Promise<Family> {
  const name = overrides?.name || "Home Family";
  let inviteCode = overrides?.inviteCode || "ABCDEF";
  // ensure unique inviteCode
  let existing = await prisma.family.findUnique({ where: { inviteCode } });
  while (existing) {
    inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    existing = await prisma.family.findUnique({ where: { inviteCode } });
  }
  return prisma.family.create({ data: { name, inviteCode } });
}

// Attach a user to a family and optionally set role/permissions.
export async function joinFamily(
  userId: string,
  familyId: string,
  opts?: { role?: "admin" | "member"; permissions?: any }
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      familyId,
      role: opts?.role ?? "member",
      permissions: opts?.permissions ?? undefined,
    },
  });
}

export function tokenFor(user: { id: string; username: string; familyId?: string | null; role: string }) {
  return jwt.sign(
    { userId: user.id, username: user.username, familyId: user.familyId, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function authHeader(user: Partial<User> & { id: string; role: string }) {
  return { Authorization: `Bearer ${tokenFor({ id: user.id, username: "u", familyId: null, role: user.role })}` };
}

// Full-stack helper: register the first user (admin) and create a family via API.
export async function onboardAdmin(username = "firstadmin") {
  const reg = await request(api).post("/api/auth/register").send({
    name: "First Admin",
    username,
    password: "test1234",
  });
  const token = reg.body?.token;
  const me = await request(api)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return { token, admin: me.body as any };
}

// Convenience: create a family via API as an already-registered admin.
export async function apiCreateFamily(adminToken: string, name = "Home Family") {
  const res = await request(api)
    .post("/api/family")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name });
  return res;
}
