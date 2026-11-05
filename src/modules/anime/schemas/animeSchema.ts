
import { z } from "zod";

const currentYear = new Date().getFullYear();

export const createAnimeSchema = z.object({
  title: z .string() .trim().min(1, "El título es obligatorio").max(150, "El título no puede superar 150 caracteres"),

  slug: z.string().trim().min(1, "El slug es obligatorio").max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,"El slug solo puede contener letras minúsculas, números y guiones"),

  synopsis: z.string().trim().min(1, "La sinopsis es obligatoria").max(5000,
    "La sinopsis no puede superar 5000 caracteres"),

  posterUrl: z.string().trim().url("La URL del póster no es válida"),

  bannerUrl: z.string().trim().url("La URL del banner no es válida")
  .or(z.literal("")).optional(),

  genres: z.array(z.string().trim().min(1)).max(20, "No puedes agregar más de 20 géneros").default([]),

  releaseYear: z.number().int("El año debe ser un número entero").min(1900).max(currentYear + 5),

  status: z.enum(["upcoming", "airing", "completed"]).default("upcoming"),

  type: z.enum(["TV", "Movie", "OVA", "ONA", "Special"]).default("TV"),

  isPublished: z.boolean().default(false),
});

export type CreateAnimeInput = z.infer<typeof createAnimeSchema>;
