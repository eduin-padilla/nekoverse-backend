import bcrypt from "bcrypt";
import { connectMongoDB, disconnectMongoDB } from "../database/mongodb.js";
import { UserModel } from "../modules/auth/models/userModel.js";

async function createAdmin() {
  try {
    await connectMongoDB();

    const username = process.env.ADMIN_USERNAME;
    const email = process.env.ADMIN_EMAIL?.toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !email || !password) {
      throw new Error("Debes configurar ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD");
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("La contraseña debe tener entre 12 y 72 bytes");
    }

    const existingAdmin = await UserModel.findOne({ role: "admin" });

    if (existingAdmin) {
      throw new Error("Ya existe un administrador. No se puede crear otro mediante este script");
    }

    const existingUser = await UserModel.findOne({$or: [{ email }, { username }]});

    if (existingUser) {
      throw new Error("El correo o nombre de usuario ya está registrado");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await UserModel.create({
        username,email,
        password: hashedPassword,
        role:"admin"
    });

    console.log("Administrador creado correctamente");
  } catch (error) {
    console.error("Error al crear administrador:", error);
    process.exitCode = 1;
  } finally {
    await disconnectMongoDB();
  }
}

void createAdmin();