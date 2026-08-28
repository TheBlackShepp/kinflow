import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth";
import familyRoutes from "./routes/family";
import listRoutes from "./routes/lists";
import recipeRoutes from "./routes/recipes";
import mealRoutes from "./routes/meals";
import eventRoutes from "./routes/events";
import productRoutes from "./routes/products";
import supermarketRoutes from "./routes/supermarkets";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/products", productRoutes);
app.use("/api/supermarkets", supermarketRoutes);

const frontendDist = path.resolve(__dirname, "../../frontend/dist");
const indexFile = path.join(frontendDist, "index.html");
app.use(express.static(frontendDist));
app.get("/{*path}", (_req, res) => {
  if (!fs.existsSync(indexFile)) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  res.sendFile(indexFile);
});

app.listen(port, () => {
  console.log(`🚀 API server running at http://localhost:${port}`);
});
