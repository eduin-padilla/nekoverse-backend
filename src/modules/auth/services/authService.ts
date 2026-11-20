import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateProfileInput } from "../schemas/authSchema.js";
import { env } from "../../../config/env.js";

const SALT_ROUNDS = 12;
const SESSION_EXPIRED = "La sesión ha expirado. Inicia sesión nuevamente";

function userConflict() {
  return Object.assign(new Error("El correo o nombre de usuario ya está registrado"), { statusCode: 409 });
}

function rethrowUserWriteError(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000 &&
      "keyPattern" in error && typeof error.keyPattern === "object" && error.keyPattern !== null) {
    const keys = Object.keys(error.keyPattern);
    if (keys.length === 1 && (keys[0] === "username" || keys[0] === "email")) throw userConflict();
  }
  throw error;
}

export async function registerUser(data: RegisterInput) {
  const existingUser = await UserModel.findOne({
    $or: [{ email: data.email }, { username: data.username }]
  });

  if (existingUser) {
    throw userConflict();
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await UserModel.create({
    username: data.username,
    email: data.email,
    password: hashedPassword,
    role: "user"
  }).catch(rethrowUserWriteError);

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

  if (existingUser) throw userConflict();

  if (data.username !== undefined) user.username = data.username;
  if (data.email !== undefined) user.email = data.email;

  await user.save().catch(rethrowUserWriteError);

  return { id: user._id, username: user.username, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
}

export async function changeUserPassword(userId: string, tokenVersion: number, data: ChangePasswordInput) {

  const user = await UserModel.findById(userId).select("+password");

  if (!user || !user.isActive) {
    throw Object.assign(new Error("Usuario no encontrado"), { statusCode: 404 });
  }

  if (user.tokenVersion !== tokenVersion) throw Object.assign(new Error(SESSION_EXPIRED), { statusCode: 401 });

  const passwordMatches = await bcrypt.compare(data.currentPassword, user.password);

  if (!passwordMatches) {
    throw Object.assign(new Error("La contraseña actual es incorrecta"), { statusCode: 400 });
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

  const result = await UserModel.updateOne(
    { _id: userId, isActive: true, tokenVersion },
    { $set: { password: hashedPassword }, $inc: { tokenVersion: 1 } }
  ).exec();
  if (result.matchedCount === 0) throw Object.assign(new Error(SESSION_EXPIRED), { statusCode: 401 });

  return { message: "Contraseña actualizada correctamente" };
}

export async function logoutUser(userId: string, tokenVersion: number) {
  const result = await UserModel.updateOne(
    { _id: userId, isActive: true, tokenVersion },
    { $inc: { tokenVersion: 1 } }
  ).exec();

  if (result.matchedCount === 0) {
    throw Object.assign(new Error(SESSION_EXPIRED), { statusCode: 401 });
  }

  return { message: "Sesión cerrada correctamente" };
}
