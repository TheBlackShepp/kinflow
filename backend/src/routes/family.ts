import { Router, Response } from "express";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

function getInviteTTLHours(): number {
  const raw = parseInt(process.env.INVITE_TTL_HOURS || "24", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
}

async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

// Verify an invitation token (public, used by the invite page)
router.get("/invites/:token/verify", async (req: AuthRequest, res: Response) => {
  try {
    const token = String(req.params.token);
    const invite = await prisma.familyInvite.findUnique({
      where: { token },
      include: { family: { select: { id: true, name: true } } },
    });

    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invite.usedAt) {
      return res.status(400).json({ message: "Invitation has already been used" });
    }

    if (Date.now() > invite.expiresAt.getTime()) {
      return res.status(410).json({ message: "Invitation has expired" });
    }

    res.json({
      familyId: invite.familyId,
      familyName: invite.family.name,
    });
  } catch (error) {
    console.error("Error verifying invite:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.use(authenticateToken);

// Create family
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Home name is required" });
    }

    const existingUser = await getCurrentUser(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (existingUser.familyId) {
      return res.status(400).json({ message: "You already belong to a home" });
    }

    const familyCount = await prisma.family.count();
    if (familyCount > 0) {
      return res
        .status(400)
        .json({ message: "A home already exists. Use an invitation link to join." });
    }

    let inviteCode = generateInviteCode();
    while (await prisma.family.findUnique({ where: { inviteCode } })) {
      inviteCode = generateInviteCode();
    }

    const family = await prisma.family.create({
      data: { name, inviteCode },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id, role: "admin" },
    });

    res.status(201).json(family);
  } catch (error) {
    console.error("Error creating family:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create an invitation link (admin only)
router.post("/invites", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await getCurrentUser(userId);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.familyId) {
      return res.status(400).json({ message: "You don't belong to any home" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can create invitations" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const ttlHours = getInviteTTLHours();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const invite = await prisma.familyInvite.create({
      data: {
        familyId: user.familyId,
        token,
        expiresAt,
      },
    });

    res.status(201).json({
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get current family info
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        family: {
          include: {
            users: {
              select: { id: true, name: true, username: true, role: true, permissions: true },
            },
            invites: true,
          },
        },
      },
    });

    if (!user?.family) {
      return res.status(404).json({ message: "You don't belong to any home" });
    }

    res.json(user.family);
  } catch (error) {
    console.error("Error fetching family:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// List pending invitations (admin only)
router.get("/invites", async (req: AuthRequest, res: Response) => {
  try {
    const user = await getCurrentUser(req.user!.userId);
    if (!user || !user.familyId) {
      return res.status(400).json({ message: "You don't belong to any home" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can manage invitations" });
    }
    const invites = await prisma.familyInvite.findMany({
      where: { familyId: user.familyId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    res.json(invites);
  } catch (error) {
    console.error("Error listing invites:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Revoke a pending invitation (admin only)
router.delete("/invites/:id", async (req: AuthRequest, res: Response) => {
  try {
    const user = await getCurrentUser(req.user!.userId);
    if (!user || !user.familyId) {
      return res.status(400).json({ message: "You don't belong to any home" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can manage invitations" });
    }
    const inviteId = String(req.params.id);
    const invite = await prisma.familyInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.familyId !== user.familyId) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    if (invite.usedAt) {
      return res.status(400).json({ message: "Invitation has already been used" });
    }
    await prisma.familyInvite.delete({ where: { id: inviteId } });
    res.status(204).end();
  } catch (error) {
    console.error("Error revoking invite:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update member permissions (admin only)
router.patch("/members/:id/permissions", async (req: AuthRequest, res: Response) => {
  try {
    const admin = await getCurrentUser(req.user!.userId);
    if (!admin || !admin.familyId) {
      return res.status(400).json({ message: "You don't belong to any home" });
    }
    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can manage permissions" });
    }

    const memberId = String(req.params.id);
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.familyId !== admin.familyId) {
      return res.status(404).json({ message: "Member not found" });
    }
    if (member.role === "admin") {
      return res.status(400).json({ message: "Admins always have full access" });
    }

    const { permissions } = req.body;
    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({ message: "Permissions are required" });
    }

    const validLevels = ["full", "read", "none"];
    const cleaned: Record<string, string> = {};
    for (const mod of ["lists", "products", "recipes", "meals"]) {
      const level = permissions[mod];
      if (level && validLevels.includes(level)) {
        cleaned[mod] = level;
      }
    }

    await prisma.user.update({
      where: { id: memberId },
      data: { permissions: cleaned },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Change member role (admin only)
router.patch("/members/:id/role", async (req: AuthRequest, res: Response) => {
  try {
    const admin = await getCurrentUser(req.user!.userId);
    if (!admin || !admin.familyId) {
      return res.status(400).json({ message: "You don't belong to any home" });
    }
    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can manage roles" });
    }

    const memberId = String(req.params.id);
    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.familyId !== admin.familyId) {
      return res.status(404).json({ message: "Member not found" });
    }

    const { role } = req.body;
    if (role !== "admin" && role !== "member") {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (role === "member") {
      const adminsInFamily = await prisma.user.count({
        where: { familyId: admin.familyId, role: "admin" },
      });
      if (adminsInFamily <= 1) {
        return res.status(400).json({ message: "Cannot remove the last admin" });
      }
    }

    // admin role reset permissions; member role needs default permissions
    const permissions = role === "admin" ? { permissions: Prisma.JsonNull } : { permissions: { lists: "full", products: "full", recipes: "full", meals: "full" } };

    await prisma.user.update({
      where: { id: memberId },
      data: { role, ...permissions },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error changing role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Remove member from home (admin only)
router.delete("/members/:id", async (req: AuthRequest, res: Response) => {
  try {
    const admin = await getCurrentUser(req.user!.userId);
    if (!admin || !admin.familyId) {
      return res.status(400).json({ message: "You don't belong to any home" });
    }
    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Only the admin can remove members" });
    }

    const memberId = String(req.params.id);
    if (memberId === admin.id) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member || member.familyId !== admin.familyId) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (member.role === "admin") {
      const adminsInFamily = await prisma.user.count({
        where: { familyId: admin.familyId, role: "admin" },
      });
      if (adminsInFamily <= 1) {
        return res.status(400).json({ message: "Cannot remove the last admin" });
      }
    }

    // Reassign lists owned by the removed member to the admin, then detach from home
    await prisma.list.updateMany({
      where: { familyId: admin.familyId, ownerId: memberId },
      data: { ownerId: admin.id },
    });

    await prisma.user.update({
      where: { id: memberId },
      data: { familyId: null, role: "member", permissions: Prisma.JsonNull },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
