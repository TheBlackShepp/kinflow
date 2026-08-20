import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

// Register
router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

    const secret = process.env.JWT_SECRET || "kinflow_secret_key";
    const token = jwt.sign(
      { userId: user.id, email: user.email, familyId: user.familyId },
      secret,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        familyId: user.familyId,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { family: true },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET || "kinflow_secret_key";
    const token = jwt.sign(
      { userId: user.id, email: user.email, familyId: user.familyId },
      secret,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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
              select: { id: true, name: true, email: true },
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
      email: user.email,
      familyId: user.familyId,
      family: user.family,
    });
  } catch (error) {
    console.error("Error in /me:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
