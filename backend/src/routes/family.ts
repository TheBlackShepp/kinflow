import { Router, Response } from "express";
import crypto from "crypto";
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

router.use(authenticateToken);

// Create family
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Home name is required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { family: true },
    });

    if (existingUser?.familyId) {
      return res.status(400).json({ message: "You already belong to a home" });
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
      data: { familyId: family.id },
    });

    res.status(201).json(family);
  } catch (error) {
    console.error("Error creating family:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Join family by invite code
router.post("/join", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.familyId) {
      return res.status(400).json({ message: "You already belong to a home" });
    }

    const family = await prisma.family.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!family) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id },
    });

    res.json(family);
  } catch (error) {
    console.error("Error joining family:", error);
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
              select: { id: true, name: true, username: true },
            },
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

export default router;
