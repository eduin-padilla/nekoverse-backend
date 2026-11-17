import type { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from "../schemas/authSchema.js";
import { getUserProfile, loginUser, registerUser, updateUserProfile, changeUserPassword, logoutUser } from "../services/authService.js";
import type { AuthenticatedRequest } from "../../../middlewares/authMiddleware.js";


export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.flatten() });
    }

    const user = await registerUser(validation.data);

    return res.status(201).json({ success: true, message: "Usuario registrado correctamente", data: user });
  } catch (error) {
    next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.flatten() });
    }

    const result = await loginUser(validation.data);

    return res.status(200).json({ success: true, message: "Inicio de sesión exitoso", data: result });
  } catch (error) {
    next(error);
  }
}

export async function getProfileController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "No estás autenticado" });
    }

    const user = await getUserProfile(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfileController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "No estás autenticado" });

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ success: false, errors: validation.error.flatten() });

    const user = await updateUserProfile(req.user.id, validation.data);
    return res.status(200).json({ success: true, message: "Perfil actualizado correctamente", data: user });
  } catch (error) {
    next(error);
  }
}

export async function changePasswordController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "No estás autenticado" });

    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ success: false, errors: validation.error.flatten() });

    const result = await changeUserPassword(req.user.id, validation.data);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "No estás autenticado" });

    const result = await logoutUser(req.user.id);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}
