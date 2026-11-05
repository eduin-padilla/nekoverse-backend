import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware.js";

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "No estás autenticado" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "No tienes permisos de administrador" });
  }

  next();
}