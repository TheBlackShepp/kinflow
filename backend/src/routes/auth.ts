import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

function createToken(user: { id: string; username: string; familyId?: string | null; role: string }) {
  const secret = process.env.JWT_SECRET || "kinflow_secret_key";
  return jwt.sign(
    { userId: user.id, username: user.username, familyId: user.familyId, role: user.role },
    secret,
    { expiresIn: "7d" }
  );
}

// System status: tells the client whether onboarding (first user) is needed
router.get("/status", async (_req, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    const familyCount = await prisma.family.count();
    res.json({
      hasUsers: userCount > 0,
      hasFamily: familyCount > 0,
    });
  } catch (error) {
    console.error("Error in /auth/status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Register
router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res
        .status(403)
        .json({ message: "Registration is closed. Use an invitation link." });
    }

    const normalizedUsername = username.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        username: normalizedUsername,
        password: hashedPassword,
        role: "admin",
      },
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        familyId: user.familyId,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Register via invitation token (creates account linked to the family)
router.post("/invite/register", async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, password, token } = req.body;

    if (!name || !username || !password || !token) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const invite = await prisma.familyInvite.findUnique({
      where: { token },
      include: { family: true },
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

    const normalizedUsername = username.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        username: normalizedUsername,
        password: hashedPassword,
        role: "member",
        familyId: invite.familyId,
      },
    });

    await prisma.familyInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedBy: user.id },
    });

    const tokenOut = createToken(user);

    res.status(201).json({
      token: tokenOut,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        familyId: user.familyId,
        family: invite.family,
      },
    });
  } catch (error) {
    console.error("Invite registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: { family: true },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        familyId: user.familyId,
        family: user.family,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Me
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        family: {
          include: {
            users: {
              select: { id: true, name: true, username: true, role: true, permissions: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      familyId: user.familyId,
      family: user.family,
    });
  } catch (error) {
    console.error("Error in /me:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
