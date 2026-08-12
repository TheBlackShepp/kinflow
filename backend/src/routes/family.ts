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
      return res.status(400).json({ message: "El nombre del hogar es requerido" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { family: true },
    });

    if (existingUser?.familyId) {
      return res.status(400).json({ message: "Ya perteneces a un hogar" });
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
    console.error("Error creando familia:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Join family by invite code
router.post("/join", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ message: "El código de invitación es requerido" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.familyId) {
      return res.status(400).json({ message: "Ya perteneces a un hogar" });
    }

    const family = await prisma.family.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!family) {
      return res.status(404).json({ message: "Código de invitación inválido" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id },
    });

    res.json(family);
  } catch (error) {
    console.error("Error uniendo a familia:", error);
    res.status(500).json({ message: "Error interno del servidor" });
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
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!user?.family) {
      return res.status(404).json({ message: "No perteneces a ningún hogar" });
    }

    res.json(user.family);
  } catch (error) {
    console.error("Error obteniendo familia:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
