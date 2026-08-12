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

// Get all recipes for family
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const recipes = await prisma.recipe.findMany({
      where: { familyId },
      include: { ingredients: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(recipes);
  } catch (error) {
    console.error("Error obteniendo recetas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Get single recipe
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: String(req.params.id) },
      include: { ingredients: true },
    });

    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    res.json(recipe);
  } catch (error) {
    console.error("Error obteniendo receta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Create recipe
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { title, description, prepTime, servings, instructions, ingredients, id } = req.body;

    if (!title) {
      return res.status(400).json({ message: "El título de la receta es requerido" });
    }

    const recipe = await prisma.recipe.create({
      data: {
        ...(id ? { id } : {}),
        familyId,
        title,
        description: description || null,
        prepTime: prepTime || null,
        servings: servings || 4,
        instructions: instructions || null,
        ingredients: {
          create:
            ingredients && Array.isArray(ingredients)
              ? ingredients.map((ing: { name: string; amount: string; unit: string }) => ({
                  name: ing.name,
                  amount: ing.amount || "1",
                  unit: ing.unit || "",
                }))
              : [],
        },
      },
      include: { ingredients: true },
    });

    notifyFamily(familyId, "recipe.created", req.user!.userId);
    res.status(201).json(recipe);
  } catch (error) {
    console.error("Error creando receta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Update recipe
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const existing = await prisma.recipe.findUnique({ where: { id: String(req.params.id) } });
    if (!existing || existing.familyId !== familyId) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    const { title, description, prepTime, servings, instructions, ingredients } = req.body;

    if (ingredients && Array.isArray(ingredients)) {
      await prisma.ingredient.deleteMany({ where: { recipeId: existing.id } });
    }

    const recipe = await prisma.recipe.update({
      where: { id: existing.id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        prepTime: prepTime !== undefined ? prepTime : existing.prepTime,
        servings: servings !== undefined ? servings : existing.servings,
        instructions: instructions !== undefined ? instructions : existing.instructions,
        ingredients:
          ingredients && Array.isArray(ingredients)
            ? {
                create: ingredients.map(
                  (ing: { name: string; amount: string; unit: string }) => ({
                    name: ing.name,
                    amount: ing.amount || "1",
                    unit: ing.unit || "",
                  })
                ),
              }
            : undefined,
      },
      include: { ingredients: true },
    });

    notifyFamily(familyId, "recipe.updated", req.user!.userId);
    res.json(recipe);
  } catch (error) {
    console.error("Error actualizando receta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Delete recipe
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const existing = await prisma.recipe.findUnique({ where: { id: String(req.params.id) } });
    if (!existing || existing.familyId !== familyId) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    await prisma.recipe.delete({ where: { id: existing.id } });
    notifyFamily(familyId, "recipe.deleted", req.user!.userId);
    res.json({ message: "Receta eliminada" });
  } catch (error) {
    console.error("Error eliminando receta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
