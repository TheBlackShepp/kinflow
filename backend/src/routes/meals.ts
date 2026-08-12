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

// Get meal plans between two dates
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { start, end } = req.query;

    const where: any = { familyId };
    if (start && end) {
      where.date = { gte: String(start), lte: String(end) };
    }

    const mealPlans = await prisma.mealPlan.findMany({
      where,
      include: {
        recipe: { include: { ingredients: true } },
      },
      orderBy: [{ date: "asc" }, { mealType: "asc" }],
    });

    res.json(mealPlans);
  } catch (error) {
    console.error("Error obteniendo menús:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Set a meal plan entry (creates a new entry; several can share date + mealType)
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { date, mealType, recipeId, customTitle, id } = req.body;

    if (!date || !mealType) {
      return res.status(400).json({ message: "Fecha y tipo de comida son requeridos" });
    }

    if (!customTitle && !recipeId) {
      return res.status(400).json({ message: "Se necesita una receta o un título" });
    }

    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!recipe || recipe.familyId !== familyId) {
        return res.status(404).json({ message: "Receta no encontrada" });
      }
    }

    const mealPlan = await prisma.mealPlan.create({
      data: {
        ...(id ? { id } : {}),
        familyId,
        date,
        mealType,
        recipeId: recipeId || null,
        customTitle: customTitle || null,
      },
      include: { recipe: true },
    });

    notifyFamily(familyId, "meal.updated", req.user!.userId);
    res.status(201).json(mealPlan);
  } catch (error) {
    console.error("Error guardando menú:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Delete a single meal plan entry
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const meal = await prisma.mealPlan.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!meal || meal.familyId !== familyId) {
      return res.status(404).json({ message: "Entrada de menú no encontrada" });
    }

    await prisma.mealPlan.delete({ where: { id: meal.id } });
    notifyFamily(familyId, "meal.updated", req.user!.userId);
    res.json({ message: "Entrada eliminada" });
  } catch (error) {
    console.error("Error eliminando menú:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Export ingredients from meal plans to a shopping list
router.post("/export-to-list", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { start, end, listId } = req.body;

    if (!start || !end) {
      return res.status(400).json({ message: "Se requiere un rango de fechas" });
    }

    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        familyId,
        date: { gte: start, lte: end },
        recipeId: { not: null },
      },
      include: { recipe: { include: { ingredients: true } } },
    });

    if (mealPlans.length === 0) {
      return res.status(400).json({ message: "No hay recetas planificadas en ese rango" });
    }

    // Pick target list: provided, or first list, or create one
    let list;
    if (listId) {
      list = await prisma.list.findUnique({ where: { id: listId } });
      if (!list || list.familyId !== familyId) {
        return res.status(404).json({ message: "Lista no encontrada" });
      }
    } else {
      list = await prisma.list.findFirst({
        where: { familyId },
        orderBy: { createdAt: "asc" },
      });
      if (!list) {
        list = await prisma.list.create({
          data: { name: "Supermercado", familyId },
        });
      }
    }

    // Aggregate ingredients, merging duplicates
    const aggregated = new Map<string, { name: string; quantity: string; count: number }>();
    for (const mp of mealPlans) {
      for (const ing of mp.recipe!.ingredients) {
        const key = ing.name.toLowerCase().trim();
        const existing = aggregated.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          aggregated.set(key, {
            name: ing.name,
            quantity: `${ing.amount}${ing.unit ? " " + ing.unit : ""}`,
            count: 1,
          });
        }
      }
    }

    let createdCount = 0;
    for (const [key, ing] of aggregated) {
      const existingItem = await prisma.listItem.findFirst({
        where: { listId: list.id, name: ing.name, completed: false },
      });

      if (existingItem) {
        await prisma.listItem.update({
          where: { id: existingItem.id },
          data: { quantity: ing.quantity },
        });
      } else {
        await prisma.listItem.create({
          data: {
            listId: list.id,
            name: ing.name,
            quantity: ing.quantity,
            category: "Supermercado",
          },
        });
        createdCount += 1;
      }
    }

    const result = await prisma.list.findUnique({
      where: { id: list.id },
      include: { items: { orderBy: { completed: "asc" } } },
    });

    notifyFamily(familyId, "list.updated", req.user!.userId);
    res.json({
      list: result,
      createdCount,
      aggregatedIngredients: Array.from(aggregated.values()).map((i) => ({
        name: i.name,
        quantity: i.quantity,
      })),
    });
  } catch (error) {
    console.error("Error exportando ingredientes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
