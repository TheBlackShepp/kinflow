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

const productInclude = {
  prices: {
    include: { supermarket: true },
    orderBy: { recordedAt: "desc" as const },
  },
};

// Get all products for family
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const products = await prisma.product.findMany({
      where: { familyId },
      include: productInclude,
      orderBy: { name: "asc" },
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Search products by name
router.get("/search", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const q = (req.query.q as string)?.trim() ?? "";
    if (q.length < 1) {
      res.json([]);
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        familyId,
        name: { contains: q },
      },
      include: productInclude,
      orderBy: { name: "asc" },
      take: 20,
    });

    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create product
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const { name, category, unit } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ message: "Name is required" });
      return;
    }

    const existing = await prisma.product.findUnique({
      where: { familyId_name: { familyId, name: name.trim() } },
    });
    if (existing) {
      res.status(409).json({ message: "A product with that name already exists" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        familyId,
        name: name.trim(),
        category: category?.trim() || "General",
        unit: unit?.trim() || "u",
      },
      include: productInclude,
    });

    notifyFamily(familyId, "product-created", req.user!.userId);
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update product
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const id = String(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const { name, category, unit } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(category !== undefined ? { category: category.trim() } : {}),
        ...(unit !== undefined ? { unit: unit.trim() } : {}),
      },
      include: productInclude,
    });

    notifyFamily(familyId, "product-updated", req.user!.userId);
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete product
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const id = String(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    await prisma.product.delete({ where: { id } });
    notifyFamily(familyId, "product-deleted", req.user!.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add price to product
router.post("/:id/prices", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const id = String(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const { supermarketId, price } = req.body;
    if (!supermarketId || !price?.trim()) {
      res.status(400).json({ message: "Supermarket and price are required" });
      return;
    }

    const supermarket = await prisma.supermarket.findUnique({ where: { id: String(supermarketId) } });
    if (!supermarket || supermarket.familyId !== familyId) {
      res.status(404).json({ message: "Supermarket not found" });
      return;
    }

    const productPrice = await prisma.productPrice.upsert({
      where: { productId_supermarketId: { productId: id, supermarketId: String(supermarketId) } },
      update: { price: price.trim() },
      create: { productId: id, supermarketId: String(supermarketId), price: price.trim() },
      include: { supermarket: true },
    });

    res.status(201).json(productPrice);
  } catch (error) {
    console.error("Error adding price:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete price
router.delete("/prices/:priceId", async (req: AuthRequest, res: Response) => {
  try {
    const familyId = await requireFamily(req, res);
    if (!familyId) return;

    const priceId = String(req.params.priceId);
    const priceEntry = await prisma.productPrice.findUnique({
      where: { id: priceId },
      include: { product: true },
    });
    if (!priceEntry || priceEntry.product.familyId !== familyId) {
      res.status(404).json({ message: "Price not found" });
      return;
    }

    await prisma.productPrice.delete({ where: { id: priceId } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting price:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
