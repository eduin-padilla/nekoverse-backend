
import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectMongoDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB conectado correctamente");
  console.log(`Base de datos: ${mongoose.connection.name}`);
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("Conexión con MongoDB cerrada");
}
