import { Router, Response } from "express";
import prisma from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { notifyFamily } from "../events";

const router = Router();

router.use(authenticateToken);

async function requireFamily(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.familyId) {
    res.status(400).json({ message: "Necesitas pertenecer a un hogar" });
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
    console.error("Error obteniendo supermercados:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Create supermarket
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ message: "Nombre es obligatorio" });
      return;
    }

    const existing = await prisma.supermarket.findUnique({
      where: { familyId_name: { familyId, name: name.trim() } },
    });
    if (existing) {
      res.status(409).json({ message: "Ya existe un supermercado con ese nombre" });
      return;
    }

    const supermarket = await prisma.supermarket.create({
      data: { familyId, name: name.trim() },
    });

    notifyFamily(familyId, "supermarket-created", req.user!.userId);
    res.status(201).json(supermarket);
  } catch (error) {
    console.error("Error creando supermercado:", error);
    res.status(500).json({ message: "Error interno del servidor" });
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
      res.status(404).json({ message: "Supermercado no encontrado" });
      return;
    }

    const priceCount = await prisma.productPrice.count({
      where: { supermarketId: id },
    });
    if (priceCount > 0) {
      res.status(409).json({
        message: `No se puede eliminar: tiene ${priceCount} precio(s) asociado(s). Elimina los precios primero.`,
      });
      return;
    }

    await prisma.supermarket.delete({ where: { id } });
    notifyFamily(familyId, "supermarket-deleted", req.user!.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando supermercado:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
