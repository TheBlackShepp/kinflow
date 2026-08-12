import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import familyRoutes from "./routes/family";
import listRoutes from "./routes/lists";
import recipeRoutes from "./routes/recipes";
import mealRoutes from "./routes/meals";
import eventRoutes from "./routes/events";

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

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.listen(port, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${port}`);
});
