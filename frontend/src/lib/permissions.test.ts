import { describe, it, expect } from "vitest";
import {
  MODULES,
  effectivePermissions,
  canReadModule,
  canWriteModule,
} from "../lib/permissions";
import type { User } from "../lib/types";

function user(over: Partial<User> = {}): User {
  return {
    id: "u1",
    name: "Test",
    username: "test",
    role: "member",
    permissions: null,
    ...over,
  };
}

describe("MODULES", () => {
  it("exposes the four modules", () => {
    expect(MODULES).toEqual(["lists", "products", "recipes", "meals"]);
  });
});

describe("effectivePermissions", () => {
  it("returns null for admins (full access)", () => {
    expect(effectivePermissions(user({ role: "admin" }))).toBeNull();
  });

  it("returns null when there is no user", () => {
    expect(effectivePermissions(null)).toBeNull();
    expect(effectivePermissions(undefined)).toBeNull();
  });

  it("returns the explicit permissions for a member", () => {
    const perms = { lists: "read" as const, products: "none" as const };
    expect(effectivePermissions(user({ permissions: perms }))).toEqual(perms);
  });

  it("defaults a member with no permissions to full everywhere", () => {
    expect(effectivePermissions(user({ permissions: null }))).toEqual({
      lists: "full",
      products: "full",
      recipes: "full",
      meals: "full",
    });
  });

  it("defaults a member with empty permissions to full everywhere", () => {
    expect(effectivePermissions(user({ permissions: {} }))).toEqual({
      lists: "full",
      products: "full",
      recipes: "full",
      meals: "full",
    });
  });
});

describe("hasModuleAccess / canRead / canWrite", () => {
  it("denies everything without a user", () => {
    expect(canReadModule(null, "lists")).toBe(false);
    expect(canWriteModule(undefined, "lists")).toBe(false);
  });

  it("gives admins full access regardless of stored permissions", () => {
    const admin = user({
      role: "admin",
      permissions: { lists: "none", products: "none", recipes: "none", meals: "none" },
    });
    expect(canReadModule(admin, "lists")).toBe(true);
    expect(canWriteModule(admin, "lists")).toBe(true);
  });

  it("allows read but not write for read level", () => {
    const member = user({ permissions: { lists: "read" } });
    expect(canReadModule(member, "lists")).toBe(true);
    expect(canWriteModule(member, "lists")).toBe(false);
  });

  it("denies both read and write for none level", () => {
    const member = user({ permissions: { products: "none" } });
    expect(canReadModule(member, "products")).toBe(false);
    expect(canWriteModule(member, "products")).toBe(false);
  });

  it("treats a missing module as none", () => {
    const member = user({ permissions: { recipes: "full" } });
    expect(canReadModule(member, "meals")).toBe(false);
    expect(canWriteModule(member, "meals")).toBe(false);
  });

  it("allows write (full) and read for full level", () => {
    const member = user({ permissions: { meals: "full" } });
    expect(canReadModule(member, "meals")).toBe(true);
    expect(canWriteModule(member, "meals")).toBe(true);
  });

  it("defaults a member with null permissions to full for every module", () => {
    const member = user({ permissions: null });
    for (const m of MODULES) {
      expect(canReadModule(member, m)).toBe(true);
      expect(canWriteModule(member, m)).toBe(true);
    }
  });
});
