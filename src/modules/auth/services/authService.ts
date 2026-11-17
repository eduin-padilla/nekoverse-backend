import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateProfileInput } from "../schemas/authSchema.js";
import { env } from "../../../config/env.js";

const SALT_ROUNDS = 12;

export async function registerUser(data: RegisterInput) {
  const existingUser = await UserModel.findOne({
    $or: [{ email: data.email }, { username: data.username }]
  });

  if (existingUser) {
    throw Object.assign(new Error("El correo o nombre de usuario ya está registrado"), { statusCode: 409 });
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await UserModel.create({
    username: data.username,
    email: data.email,
    password: hashedPassword,
    role: "user"
  });

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role
  };
}

export async function loginUser(data: LoginInput) {
  const user = await UserModel.findOne({ email: data.email }).select("+password");

  if (!user || !user.isActive) {
    throw Object.assign(new Error("Credenciales incorrectas"), { statusCode: 401 });
  }

  const passwordMatches = await bcrypt.compare(data.password, user.password);

  if (!passwordMatches) {
    throw Object.assign(new Error("Credenciales incorrectas"), { statusCode: 401 });
  }
  const token = jwt.sign({ sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion }, env.JWT_SECRET, { expiresIn: "7d" });

  return {
    token,user: {
    id: user._id, 
    username: user.username, 
    email: user.email,
    role: user.role}
  };
}

export async function getUserProfile(userId: string) {
  return UserModel.findById(userId).select("_id username email role avatarUrl createdAt").lean().exec();
}

export async function updateUserProfile(userId: string, data: UpdateProfileInput) {
  const user = await UserModel.findById(userId);
  if (!user || !user.isActive) throw Object.assign(new Error("Usuario no encontrado"), { statusCode: 404 });

  const existingUser = await UserModel.findOne({
    _id: { $ne: userId },
    $or: [
      ...(data.email !== undefined ? [{ email: data.email }] : []),
      ...(data.username !== undefined ? [{ username: data.username }] : [])
    ]
  });

  if (existingUser) throw Object.assign(new Error("El correo o nombre de usuario ya está registrado"), { statusCode: 409 });

  if (data.username !== undefined) user.username = data.username;
  if (data.email !== undefined) user.email = data.email;

  await user.save();

  return { id: user._id, username: user.username, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
}

export async function changeUserPassword(userId: string, data: ChangePasswordInput) {

  const user = await UserModel.findById(userId).select("+password");

  if (!user || !user.isActive) {
    throw Object.assign(new Error("Usuario no encontrado"), { statusCode: 404 });
  }

  const passwordMatches = await bcrypt.compare(data.currentPassword, user.password);

  if (!passwordMatches) {
    throw Object.assign(new Error("La contraseña actual es incorrecta"), { statusCode: 400 });
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

  user.password = hashedPassword;
  user.tokenVersion += 1;
  await user.save();

  return { message: "Contraseña actualizada correctamente" };
}

export async function logoutUser(userId: string) {
  const user = await UserModel.findOneAndUpdate(
    { _id: userId, isActive: true },
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );

  if (!user) {
    throw Object.assign(new Error("Usuario no encontrado"), { statusCode: 404 });
  }

  return { message: "Sesión cerrada correctamente" };
}
