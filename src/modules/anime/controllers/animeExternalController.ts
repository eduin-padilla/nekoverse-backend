import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getPopularExternalAnimes, searchExternalAnimes } from "../services/animeExternalServices.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export async function getPopularExternalAnimesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = paginationSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({ success: false, message: "Los parámetros de paginación no son válidos", errors: validation.error.flatten().fieldErrors });
      return;
    }

    const { page, limit } = validation.data;
    const animes = await getPopularExternalAnimes(page, limit);

    res.status(200).json({ success: true, source: "Tenrai API", pagination: animes.pagination, data: animes.data });
  } catch (error) {
    next(error);
  }
}

const searchAnimeSchema = z.object({
  q: z.string().trim().min(1, "Debes escribir un título").max(300),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export async function searchExternalAnimesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = searchAnimeSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({ success: false, message: "Los parámetros de búsqueda no son válidos", errors: validation.error.flatten().fieldErrors });
      return;
    }

    const { q, page, limit } = validation.data;
    const animes = await searchExternalAnimes(q, page, limit);

    res.status(200).json({ success: true, source: "Tenrai API", query: q, pagination: animes.pagination, data: animes.data });
  } catch (error) {
    next(error);
  }
}