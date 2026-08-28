import { Response, NextFunction } from "express";
import prisma from "../prisma";
import { AuthRequest } from "./auth";

export const MODULES = ["lists", "products", "recipes", "meals"] as const;
export type Module = (typeof MODULES)[number];
export type ModuleLevel = "full" | "read" | "none";

export type UserPermissions = Partial<Record<Module, ModuleLevel>>;

export function defaultPermissions(userRole?: string): UserPermissions | null {
  if (userRole === "admin") return null; // admins always have full access
  return { lists: "full", products: "full", recipes: "full", meals: "full" };
}

function levelRank(level: ModuleLevel | undefined): number {
  if (level === "full") return 2;
  if (level === "read") return 1;
  return 0;
}

function requireLevel(perm: UserPermissions | null, module: Module, min: ModuleLevel): boolean {
  // null permissions = admin (full access)
  if (perm === null) return true;
  return levelRank(perm[module]) >= levelRank(min);
}

export function requireModule(module: Module) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.role === "admin") {
        return next();
      }

      const record = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { role: true, permissions: true },
      });

      if (!record) {
        return res.status(404).json({ message: "User not found" });
      }

      const perm = (record.permissions as UserPermissions | null) ?? defaultPermissions(record.role);
      const requestMethod = (req.method || "GET").toUpperCase();
      const isWrite = !["GET", "HEAD", "OPTIONS"].includes(requestMethod);
      const min: ModuleLevel = isWrite ? "full" : "read";

      if (!requireLevel(perm, module, min)) {
        return res.status(403).json({ message: "You don't have permission to access this module" });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}
