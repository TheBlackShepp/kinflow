import { Router, Response } from "express";
import prisma from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";

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

// Get all lists for family
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const lists = await prisma.list.findMany({
      where: { familyId },
      include: {
        items: {
          orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(lists);
  } catch (error) {
    console.error("Error obteniendo listas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Create list
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { name, icon, id } = req.body;
    if (!name) {
      return res.status(400).json({ message: "El nombre de la lista es requerido" });
    }

    const list = await prisma.list.create({
      data: {
        ...(id ? { id } : {}),
        name,
        icon: icon || "shopping-bag",
        familyId,
      },
    });

    res.status(201).json(list);
  } catch (error) {
    console.error("Error creando lista:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Get single list with items
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.list.findUnique({
      where: { id: String(req.params.id) },
      include: {
        items: {
          orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!list) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    res.json(list);
  } catch (error) {
    console.error("Error obteniendo lista:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Delete list
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const list = await prisma.list.findUnique({ where: { id: String(req.params.id) } });
    if (!list || list.familyId !== familyId) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    await prisma.list.delete({ where: { id: list.id } });
    res.json({ message: "Lista eliminada" });
  } catch (error) {
    console.error("Error eliminando lista:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Add item to list
router.post("/:id/items", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const list = await prisma.list.findUnique({ where: { id: String(req.params.id) } });
    if (!list || list.familyId !== familyId) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    const { name, quantity, category, id } = req.body;
    if (!name) {
      return res.status(400).json({ message: "El nombre del artículo es requerido" });
    }

    const item = await prisma.listItem.create({
      data: {
        ...(id ? { id } : {}),
        listId: list.id,
        name,
        quantity: quantity || "1",
        category: category || "General",
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error("Error agregando artículo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Update item (toggle completed, edit)
router.patch("/items/:itemId", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const item = await prisma.listItem.findUnique({
      where: { id: String(req.params.itemId) },
      include: { list: true },
    });

    if (!item || item.list.familyId !== familyId) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    const updated = await prisma.listItem.update({
      where: { id: item.id },
      data: {
        completed: req.body.completed !== undefined ? req.body.completed : item.completed,
        name: req.body.name !== undefined ? req.body.name : item.name,
        quantity: req.body.quantity !== undefined ? req.body.quantity : item.quantity,
        category: req.body.category !== undefined ? req.body.category : item.category,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error actualizando artículo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Delete item
router.delete("/items/:itemId", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const item = await prisma.listItem.findUnique({
      where: { id: String(req.params.itemId) },
      include: { list: true },
    });

    if (!item || item.list.familyId !== familyId) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    await prisma.listItem.delete({ where: { id: item.id } });
    res.json({ message: "Artículo eliminado" });
  } catch (error) {
    console.error("Error eliminando artículo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
