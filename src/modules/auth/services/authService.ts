import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";
import type { LoginInput, RegisterInput } from "../schemas/authSchema.js";
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

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  };
}