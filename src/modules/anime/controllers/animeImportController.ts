import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { importPopularExternalAnimes } from "../services/animeExternalServices.js";

const importSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export async function importPopularAnimesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = importSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({ success: false, message: "Los parámetros de importación no son válidos", errors: validation.error.flatten().fieldErrors });
      return;
    }

    const { page, limit } = validation.data;
    const result = await importPopularExternalAnimes(page, limit);

    res.status(200).json({ success: true, message: "Importación de animes completada", pagination: result.pagination, imported: result.imported, data: result.data });
  } catch (error) {
    next(error);
  }
}