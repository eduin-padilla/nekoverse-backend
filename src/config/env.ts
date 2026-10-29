
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),

  CLIENT_URL: z
    .string()
    .url()
    .default("http://localhost:5173"),

  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI es obligatoria"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Error en las variables de entorno:",
    result.error.flatten().fieldErrors,
  );

  process.exit(1);
}

export const env = result.data;
