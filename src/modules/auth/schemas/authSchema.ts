import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3, "El usuario debe tener al menos 3 caracteres").max(30, "El usuario no puede superar 30 caracteres").regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos"),
  email: z.string().trim().email("El correo electrónico no es válido").max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72, "La contraseña no puede superar 72 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("El correo electrónico no es válido").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "La contraseña es obligatoria").max(72),
});

export const updateProfileSchema = z.object({
  username: z.string().trim().min(3, "El usuario debe tener al menos 3 caracteres").max(30).regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos").optional(),
  email: z.string().trim().email("El correo electrónico no es válido").max(254).transform((value) => value.toLowerCase()).optional(),
}).refine((data) => data.username !== undefined || data.email !== undefined, {
  message: "Debes proporcionar al menos un campo para actualizar",
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(72, "La contraseña no puede superar 72 caracteres"),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "La nueva contraseña debe ser diferente a la actual",
  path: ["newPassword"]
});


export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;