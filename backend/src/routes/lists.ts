import { Router, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { notifyFamily, notifyUsers } from "../events";

const router = Router();

const VISIBILITIES = ["private", "family", "custom"];

const LIST_TYPES = ["shopping", "todo", "packing", "wishlist", "media"];

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

interface ListMeta {
  id: string;
  familyId: string;
  ownerId: string | null;
  visibility: string;
  members: { userId: string }[];
}

function memberSet(list: ListMeta): Set<string> {
  return new Set(list.members.map((m) => m.userId));
}

function canAccess(list: ListMeta, userId: string): boolean {
  if (list.visibility === "family") return true;
  if (list.visibility === "private") return list.ownerId === userId;
  if (list.visibility === "custom") {
    return list.ownerId === userId || memberSet(list).has(userId);
  }
  return false;
}

function notifyListChange(familyId: string, list: ListMeta, type: string, byUserId: string) {
  if (list.visibility === "family") {
    notifyFamily(familyId, type, byUserId);
    return;
  }
  const targets = new Set<string>();
  if (list.ownerId) targets.add(list.ownerId);
  for (const m of list.members) targets.add(m.userId);
  notifyUsers(familyId, Array.from(targets), type, byUserId);
}

const listInclude: Prisma.ListInclude = {
  items: {
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    include: { priceHistory: { orderBy: { recordedAt: "desc" } } },
  },
  members: { select: { userId: true } },
};

// Get lists visible to the user
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;
    const userId = req.user!.userId;

    const lists = await prisma.list.findMany({
      where: {
        familyId,
        OR: [
          { visibility: "family" },
          { ownerId: userId },
          { visibility: "custom", members: { some: { userId } } },
        ],
      },
      include: listInclude,
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
    const userId = req.user!.userId;

    const { name, icon, id, visibility, memberIds, type } = req.body;
    if (!name) {
      return res.status(400).json({ message: "El nombre de la lista es requerido" });
    }

    const vis = VISIBILITIES.includes(visibility) ? visibility : "family";
    const listType = LIST_TYPES.includes(type) ? type : "shopping";
    let validMemberIds: string[] = [];
    if (vis === "custom" && Array.isArray(memberIds)) {
      const users = await prisma.user.findMany({
        where: { id: { in: memberIds }, familyId },
      });
      validMemberIds = users.map((u) => u.id);
    }

    const list = await prisma.list.create({
      data: {
        ...(id ? { id } : {}),
        name,
        icon: icon || "shopping-bag",
        type: listType,
        familyId,
        ownerId: userId,
        visibility: vis,
        ...(vis === "custom"
          ? { members: { create: validMemberIds.map((uid) => ({ userId: uid })) } }
          : {}),
      },
      include: listInclude,
    });

    notifyListChange(familyId, list, "list.created", userId);
    res.status(201).json(list);
  } catch (error) {
    console.error("Error creando lista:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Get single list with items
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;
    const userId = req.user!.userId;

    const list = await prisma.list.findUnique({
      where: { id: String(req.params.id) },
      include: listInclude,
    });

    if (!list || list.familyId !== familyId || !canAccess(list, userId)) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    res.json(list);
  } catch (error) {
    console.error("Error obteniendo lista:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Update list (owner only): name, icon, visibility, members
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;
    const userId = req.user!.userId;

    const list = await prisma.list.findUnique({
      where: { id: String(req.params.id) },
      include: { members: { select: { userId: true } } },
    });

    if (!list || list.familyId !== familyId) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }
    if (list.ownerId !== userId) {
      return res.status(403).json({ message: "Solo el propietario puede modificar la lista" });
    }

    const data: Prisma.ListUpdateInput = {};
    if (req.body.name !== undefined) data.name = String(req.body.name);
    if (req.body.icon !== undefined) data.icon = String(req.body.icon);
    if (req.body.type !== undefined) {
      if (!LIST_TYPES.includes(req.body.type)) {
        return res.status(400).json({ message: "Tipo de lista no válido" });
      }
      data.type = req.body.type;
    }
    if (req.body.visibility !== undefined) {
      if (!VISIBILITIES.includes(req.body.visibility)) {
        return res.status(400).json({ message: "Visibilidad no válida" });
      }
      data.visibility = req.body.visibility;
    }

    if (Array.isArray(req.body.memberIds)) {
      const nextVis = (data.visibility as string | undefined) ?? list.visibility;
      let validMemberIds: string[] = [];
      if (nextVis === "custom") {
        const users = await prisma.user.findMany({
          where: { id: { in: req.body.memberIds }, familyId },
        });
        validMemberIds = users.map((u) => u.id);
      }
      await prisma.$transaction([
        prisma.listMember.deleteMany({
          where: { listId: list.id, userId: { notIn: validMemberIds } },
        }),
        ...validMemberIds.map((uid) =>
          prisma.listMember.upsert({
            where: { listId_userId: { listId: list.id, userId: uid } },
            update: {},
            create: { listId: list.id, userId: uid },
          })
        ),
      ]);
    }

    const updated = await prisma.list.update({
      where: { id: list.id },
      data,
      include: listInclude,
    });

    notifyListChange(familyId, updated, "list.updated", userId);
    res.json(updated);
  } catch (error) {
    console.error("Error actualizando lista:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Delete list
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;
    const userId = req.user!.userId;

    const list = await prisma.list.findUnique({
      where: { id: String(req.params.id) },
      include: { members: { select: { userId: true } } },
    });
    if (!list || list.familyId !== familyId || !canAccess(list, userId)) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    await prisma.list.delete({ where: { id: list.id } });
    notifyListChange(familyId, list, "list.deleted", userId);
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
    const userId = req.user!.userId;

    const list = await prisma.list.findUnique({
      where: { id: String(req.params.id) },
      include: { members: { select: { userId: true } } },
    });
    if (!list || list.familyId !== familyId || !canAccess(list, userId)) {
      return res.status(404).json({ message: "Lista no encontrada" });
    }

    const { name, quantity, category, price, note, assigneeId, dueDate, priority, status, id } =
      req.body;
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
        price: price || "",
        note: note || "",
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    if (list.type === "wishlist" && price) {
      await prisma.priceEntry.create({ data: { itemId: item.id, price } });
    }

    notifyListChange(familyId, list, "item.created", userId);
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
    const userId = req.user!.userId;

    const item = await prisma.listItem.findUnique({
      where: { id: String(req.params.itemId) },
      include: {
        list: { include: { members: { select: { userId: true } } } },
      },
    });

    if (!item || item.list.familyId !== familyId || !canAccess(item.list, userId)) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    const data: Prisma.ListItemUpdateInput = {
      completed: req.body.completed !== undefined ? req.body.completed : item.completed,
      name: req.body.name !== undefined ? req.body.name : item.name,
      quantity: req.body.quantity !== undefined ? req.body.quantity : item.quantity,
      category: req.body.category !== undefined ? req.body.category : item.category,
      price: req.body.price !== undefined ? req.body.price : item.price,
      note: req.body.note !== undefined ? req.body.note : item.note,
      assigneeId: req.body.assigneeId !== undefined ? req.body.assigneeId : item.assigneeId,
      dueDate: req.body.dueDate !== undefined ? req.body.dueDate : item.dueDate,
      priority: req.body.priority !== undefined ? req.body.priority : item.priority,
      status: req.body.status !== undefined ? req.body.status : item.status,
    };

    const priceChanged =
      req.body.price !== undefined &&
      String(req.body.price) !== String(item.price) &&
      item.list.type === "wishlist";

    const updated = await prisma.listItem.update({
      where: { id: item.id },
      data,
    });

    if (priceChanged && updated.price) {
      await prisma.priceEntry.create({
        data: { itemId: item.id, price: String(updated.price) },
      });
    }

    notifyListChange(familyId, item.list, "item.updated", userId);
    res.json(updated);
  } catch (error) {
    console.error("Error actualizando artículo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Price history for an item
router.get("/items/:itemId/prices", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;
    const userId = req.user!.userId;

    const item = await prisma.listItem.findUnique({
      where: { id: String(req.params.itemId) },
      include: {
        list: { include: { members: { select: { userId: true } } } },
      },
    });

    if (!item || item.list.familyId !== familyId || !canAccess(item.list, userId)) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    const prices = await prisma.priceEntry.findMany({
      where: { itemId: item.id },
      orderBy: { recordedAt: "desc" },
    });

    res.json(prices);
  } catch (error) {
    console.error("Error obteniendo historial de precios:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Delete item
router.delete("/items/:itemId", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;
    const userId = req.user!.userId;

    const item = await prisma.listItem.findUnique({
      where: { id: String(req.params.itemId) },
      include: {
        list: { include: { members: { select: { userId: true } } } },
      },
    });

    if (!item || item.list.familyId !== familyId || !canAccess(item.list, userId)) {
      return res.status(404).json({ message: "Artículo no encontrado" });
    }

    await prisma.listItem.delete({ where: { id: item.id } });
    notifyListChange(familyId, item.list, "item.deleted", userId);
    res.json({ message: "Artículo eliminado" });
  } catch (error) {
    console.error("Error eliminando artículo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
