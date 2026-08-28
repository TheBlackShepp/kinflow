import { Router, Response } from "express";
import prisma from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { requireModule } from "../middleware/permissions";
import { notifyFamily } from "../events";

const router = Router();

router.use(authenticateToken);
router.use(requireModule("products"));

async function requireFamily(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.familyId) {
    res.status(400).json({ message: "You need to belong to a home" });
    return null;
  }
  return user.familyId;
}

// Get all supermarkets for family
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const supermarkets = await prisma.supermarket.findMany({
      where: { familyId },
      orderBy: { name: "asc" },
    });

    res.json(supermarkets);
  } catch (error) {
    console.error("Error fetching supermarkets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create supermarket
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ message: "Name is required" });
      return;
    }

    const existing = await prisma.supermarket.findUnique({
      where: { familyId_name: { familyId, name: name.trim() } },
    });
    if (existing) {
      res.status(409).json({ message: "A supermarket with that name already exists" });
      return;
    }

    const supermarket = await prisma.supermarket.create({
      data: { familyId, name: name.trim() },
    });

    notifyFamily(familyId, "supermarket-created", req.user!.userId);
    res.status(201).json(supermarket);
  } catch (error) {
    console.error("Error creating supermarket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete supermarket
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const id = String(req.params.id);
    const existing = await prisma.supermarket.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId) {
      res.status(404).json({ message: "Supermarket not found" });
      return;
    }

    const priceCount = await prisma.productPrice.count({
      where: { supermarketId: id },
    });
    if (priceCount > 0) {
      res.status(409).json({
        message: `Cannot delete: has ${priceCount} associated price(s). Delete the prices first.`,
      });
      return;
    }

    await prisma.supermarket.delete({ where: { id } });
    notifyFamily(familyId, "supermarket-deleted", req.user!.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting supermarket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
