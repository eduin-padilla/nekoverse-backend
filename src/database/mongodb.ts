
import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB conectado correctamente");
    console.log(`Base de datos: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error);
    throw error;
  }
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("Conexión con MongoDB cerrada");
}
