import type { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema } from "../schemas/authSchema.js";
import { loginUser, registerUser } from "../services/authService.js";


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