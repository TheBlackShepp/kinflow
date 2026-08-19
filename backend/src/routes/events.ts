import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { addClient } from "../events";

const router = Router();

// SSE endpoint: mantiene la conexión abierta y reenvía eventos de la familia
router.get("/", async (req: any, res: Response) => {
  const authHeader = req.headers["authorization"];
  const queryToken =
    typeof req.query.token === "string" ? req.query.token : null;
  const token = (authHeader && authHeader.split(" ")[1]) || queryToken;

  if (!token) {
    return res.status(401).json({ message: "Token de acceso no proporcionado" });
  }

  const secret = process.env.JWT_SECRET || "kinflow_secret_key";
  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) {
    return res.status(401).json({ message: "Usuario no encontrado" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const remove = user.familyId
    ? addClient(user.familyId, { res, userId: user.id })
    : () => {};

  res.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    remove();
  });
});

export default router;
