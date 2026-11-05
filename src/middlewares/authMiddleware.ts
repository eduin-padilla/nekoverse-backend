import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UserModel } from "../modules/auth/models/userModel.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "user" | "admin";
  };
}

interface JwtPayload {
  sub: string;
  role: "user" | "admin";
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No estás autenticado" });
    }

    const token = authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === "string" || !decoded.sub) {
      return res.status(401).json({ success: false, message: "Token inválido" });
    }

    const user = await UserModel.findById(decoded.sub).select("_id role isActive");

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Usuario inexistente o inactivo" });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role as "user" | "admin"
    };

    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token inválido o expirado" });
  }
}