import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { api, createUser, createFamily, joinFamily, onboardAdmin, tokenFor } from "./helpers";
import { resetDb } from "./setup";
import prisma from "../src/prisma";

beforeEach(async () => {
  await resetDb();
});

async function setupAdminWithFamily() {
  const { token, admin } = await onboardAdmin("admin1");
  await request(api).post("/api/family").set("Authorization", `Bearer ${token}`).send({ name: "Home" });
  const me = await request(api).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  const family = me.body.family;
  return { token, admin: me.body, family };
}

describe("Family creation", () => {
  it("creates a home and associates the admin", async () => {
    const { token, admin, family } = await setupAdminWithFamily();
    expect(family.name).toBe("Home");
    expect(admin.role).toBe("admin");
    expect(admin.familyId).toBe(family.id);
  });

  it("rejects creating a second home", async () => {
    const { token } = await setupAdminWithFamily();
    const res = await request(api)
      .post("/api/family")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Second" });
    expect(res.status).toBe(400);
  });
});

describe("Invitations", () => {
  it("creates an invitation link as admin", async () => {
    const { token } = await setupAdminWithFamily();
    const res = await request(api)
      .post("/api/family/invites")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  it("does not let a member create invitations", async () => {
    const { family } = await setupAdminWithFamily();
    const member = await createUser({ username: "mem" });
    await joinFamily(member.id, family.id, { role: "member" });
    const mToken = tokenFor({ id: member.id, username: "mem", familyId: family.id, role: "member" });
    const res = await request(api)
      .post("/api/family/invites")
      .set("Authorization", `Bearer ${mToken}`);
    expect(res.status).toBe(403);
  });

  it("verifies a valid invitation", async () => {
    const { token } = await setupAdminWithFamily();
    const inv = await request(api).post("/api/family/invites").set("Authorization", `Bearer ${token}`);
    const res = await request(api).get(`/api/family/invites/${inv.body.token}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.familyName).toBe("Home");
  });

  it("returns 404 for an unknown invitation", async () => {
    const res = await request(api).get("/api/family/invites/doesnotexist/verify");
    expect(res.status).toBe(404);
  });

  it("registers a user via invitation and joins the family", async () => {
    const { token, family } = await setupAdminWithFamily();
    const inv = await request(api).post("/api/family/invites").set("Authorization", `Bearer ${token}`);
    const res = await request(api).post("/api/auth/invite/register").send({
      name: "Newbie",
      username: "newbie",
      password: "secret123",
      token: inv.body.token,
    });
    expect(res.status).toBe(201);
    expect(res.body.user.familyId).toBe(family.id);
    expect(res.body.user.role).toBe("member");
  });

  it("lists and revokes pending invitations", async () => {
    const { token } = await setupAdminWithFamily();
    await request(api).post("/api/family/invites").set("Authorization", `Bearer ${token}`);
    const list = await request(api).get("/api/family/invites").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
    const inviteId = list.body[0].id;
    const revoke = await request(api)
      .delete(`/api/family/invites/${inviteId}`)
      .set("Authorization", `Bearer ${token}`);
    expect([200, 204]).toContain(revoke.status);
    const after = await request(api).get("/api/family/invites").set("Authorization", `Bearer ${token}`);
    expect(after.body.length).toBe(0);
  });
});

describe("Permissions management", () => {
  async function setupWithMember() {
    const { token, family, admin } = await setupAdminWithFamily();
    const member = await createUser({ username: "mem" });
    await joinFamily(member.id, family.id, { role: "member", permissions: null });
    const mToken = tokenFor({ id: member.id, username: "mem", familyId: family.id, role: "member" });
    return { token, family, admin, member, mToken };
  }

  it("admin updates a member's permissions", async () => {
    const { token, member } = await setupWithMember();
    const res = await request(api)
      .patch(`/api/family/members/${member.id}/permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ permissions: { lists: "read", products: "none", recipes: "full", meals: "read" } });
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: member.id } });
    expect(user!.permissions).toEqual({
      lists: "read",
      products: "none",
      recipes: "full",
      meals: "read",
    });
  });

  it("rejects a non-admin updating permissions", async () => {
    const { mToken, member } = await setupWithMember();
    const res = await request(api)
      .patch(`/api/family/members/${member.id}/permissions`)
      .set("Authorization", `Bearer ${mToken}`)
      .send({ permissions: { lists: "read" } });
    expect(res.status).toBe(403);
  });

  it("rejects updating permissions of an admin", async () => {
    const { token, admin } = await setupWithMember();
    const res = await request(api)
      .patch(`/api/family/members/${admin.id}/permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ permissions: { lists: "read" } });
    expect(res.status).toBe(400);
  });

  it("promotes a member to admin (resets permissions to null)", async () => {
    const { token, member } = await setupWithMember();
    const res = await request(api)
      .patch(`/api/family/members/${member.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin" });
    expect(res.status).toBe(200);
    const user = await prisma.user.findUnique({ where: { id: member.id } });
    expect(user!.role).toBe("admin");
    expect(user!.permissions).toBeNull();
  });

  it("demotes an admin to member (resets permissions to full)", async () => {
    const { token, member } = await setupWithMember();
    await joinFamily(member.id, (await prisma.user.findUnique({ where: { id: member.id } }))!.familyId!, {
      role: "admin",
    });
    const res = await request(api)
      .patch(`/api/family/members/${member.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "member" });
    expect(res.status).toBe(200);
    const user = await prisma.user.findUnique({ where: { id: member.id } });
    expect(user!.role).toBe("member");
    expect(user!.permissions).toEqual({
      lists: "full",
      products: "full",
      recipes: "full",
      meals: "full",
    });
  });

  it("cannot demote the last admin", async () => {
    const { token, admin } = await setupAdminWithFamily();
    const res = await request(api)
      .patch(`/api/family/members/${admin.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "member" });
    expect(res.status).toBe(400);
  });
});

describe("Member removal (kick)", () => {
  it("removes a member from the home, detaching their data", async () => {
    const { token, family, admin } = await setupAdminWithFamily();
    const member = await createUser({ username: "mem" });
    await joinFamily(member.id, family.id, { role: "member" });
    // give the member a list
    await prisma.list.create({
      data: { name: "Mine", type: "shopping", familyId: family.id, ownerId: member.id, icon: "🛒" },
    });

    const res = await request(api)
      .delete(`/api/family/members/${member.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect([200, 204]).toContain(res.status);

    const user = await prisma.user.findUnique({ where: { id: member.id } });
    expect(user!.familyId).toBeNull();
    expect(user!.role).toBe("member");

    // the list was reassigned to the admin (owner remains admin)
    const list = await prisma.list.findFirst({ where: { name: "Mine" } });
    expect(list!.ownerId).toBe(admin.id);
  });

  it("does not allow removing yourself", async () => {
    const { token, admin } = await setupAdminWithFamily();
    const res = await request(api)
      .delete(`/api/family/members/${admin.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("does not allow removing the last admin", async () => {
    const { token, admin } = await setupAdminWithFamily();
    const res = await request(api)
      .delete(`/api/family/members/${admin.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
