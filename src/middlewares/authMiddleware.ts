import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { UserModel } from "../modules/auth/models/userModel.js";

const tokenClaimsSchema = z.object({
  sub: z.string().regex(/^[0-9a-f]{24}$/i),
  tokenVersion: z.number().int().nonnegative(),
});

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "user" | "admin";
    tokenVersion: number;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No estás autenticado" });
  }

  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token no proporcionado" });
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Token inválido o expirado" });
  }

  const claims = tokenClaimsSchema.safeParse(decoded);
  if (!claims.success) {
    return res.status(401).json({ success: false, message: "Token inválido" });
  }

  let user;
  try {
    user = await UserModel.findById(claims.data.sub).select("_id role isActive tokenVersion");
  } catch (error) {
    return next(error);
  }

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: "Usuario inexistente o inactivo" });
  }

  if (user.tokenVersion !== claims.data.tokenVersion) {
    return res.status(401).json({ success: false, message: "La sesión ha expirado. Inicia sesión nuevamente" });
  }

  req.user = { id: user._id.toString(), role: user.role as "user" | "admin", tokenVersion: claims.data.tokenVersion };
  next();
}
