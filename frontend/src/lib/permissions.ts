import type { Module, ModuleLevel, User, UserPermissions } from "./types";

export const MODULES: Module[] = ["lists", "products", "recipes", "meals"] as const;

export function effectivePermissions(user?: User | null): UserPermissions | null {
  if (!user) return null;
  if (user.role === "admin") return null; // null = full access everywhere
  if (user.permissions && Object.keys(user.permissions).length > 0) return user.permissions;
  // members with no explicit permissions default to full
  return { lists: "full", products: "full", recipes: "full", meals: "full" };
}

function rank(level: ModuleLevel | undefined): number {
  if (level === "full") return 2;
  if (level === "read") return 1;
  return 0;
}

export function hasModuleAccess(user: User | null | undefined, module: Module, min: ModuleLevel): boolean {
  if (!user) return false;
  // admin = full access everywhere
  if (user.role === "admin") return true;
  const perm: UserPermissions = user.permissions && Object.keys(user.permissions).length > 0
    ? user.permissions
    : { lists: "full", products: "full", recipes: "full", meals: "full" };
  return rank(perm[module]) >= rank(min);
}

export function canReadModule(user: User | null | undefined, module: Module): boolean {
  return hasModuleAccess(user, module, "read");
}

export function canWriteModule(user: User | null | undefined, module: Module): boolean {
  return hasModuleAccess(user, module, "full");
}
