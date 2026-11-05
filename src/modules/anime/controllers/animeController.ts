import { isValidObjectId } from "mongoose";
import type { Request, Response, NextFunction } from "express";
import { bulkPublishAnimeSchema, createAnimeSchema, getAnimesQuerySchema, updateAnimeSchema  } from "../schemas/animeSchema.js";
import { createAnime, getAllAnimes, getAnimeBySlug, updateAnimePublication, updateAnime, deleteAnime, publishManyAnimes   } from "../services/animeService.js";



export async function createAnimeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = createAnimeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Los datos del anime no son válidos", errors: validation.error.flatten().fieldErrors });
      return;
    }
    const anime = await createAnime(validation.data);
    res.status(201).json({ success: true, message: "Anime registrado correctamente", data: anime });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      res.status(409).json({ success: false, message: "Ya existe un anime con ese slug" });
      return;
    }
    next(error);
  }
}

export async function getAllAnimesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = getAnimesQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({ success: false, message: "Los parámetros de consulta no son válidos", errors: validation.error.flatten().fieldErrors });
      return;
    }
    const result = await getAllAnimes(validation.data);
    res.status(200).json({ success: true, pagination: result.pagination, data: result.data });
  } catch (error) {
    next(error);
  }
}

export async function getAnimeBySlugController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = req.params.slug;
    if (typeof slug !== "string" || !slug.trim()) {
      res.status(400).json({ success: false, message: "El slug proporcionado no es válido" });
      return;
    }
    const anime = await getAnimeBySlug(slug);
    if (!anime) {
      res.status(404).json({ success: false, message: "Anime no encontrado" });
      return;
    }
    res.status(200).json({ success: true, data: anime });
  } catch (error) {
    next(error);
  }
}

async function changeAnimePublication(req: Request, res: Response, next: NextFunction, isPublished: boolean): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "El ID del anime no es válido" });
      return;
    }

    const anime = await updateAnimePublication(id, isPublished);

    if (!anime) {
      res.status(404).json({ success: false, message: "Anime no encontrado" });
      return;
    }

    res.status(200).json({ success: true, message: isPublished ? "Anime publicado correctamente" : "Anime despublicado correctamente", data: anime });
  } catch (error) {
    next(error);
  }
}

export async function publishAnimeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await changeAnimePublication(req, res, next, true);
}

export async function unpublishAnimeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  await changeAnimePublication(req, res, next, false);
}


export async function updateAnimeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "El ID del anime no es válido" });
      return;
    }

    const validation = updateAnimeSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, message: "Los datos de actualización no son válidos", errors: validation.error.flatten().fieldErrors });
      return;
    }

    const anime = await updateAnime(id, validation.data);

    if (!anime) {
      res.status(404).json({ success: false, message: "Anime no encontrado" });
      return;
    }

    res.status(200).json({ success: true, message: "Anime actualizado correctamente", data: anime });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      res.status(409).json({ success: false, message: "Ya existe un anime con ese slug" });
      return;
    }
    next(error);
  }
}

export async function deleteAnimeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "El ID del anime no es válido" });
      return;
    }

    const anime = await deleteAnime(id);

    if (!anime) {
      res.status(404).json({ success: false, message: "Anime no encontrado" });
      return;
    }

    res.status(200).json({ success: true, message: "Anime eliminado correctamente", data: anime });
  } catch (error) {
    next(error);
  }
}

export async function publishManyAnimesController(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = bulkPublishAnimeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.flatten() });
    }

    const published = await publishManyAnimes(validation.data.ids);

    return res.status(200).json({success: true,message: "Publicación masiva completada",requested: validation.data.ids.length,published});
  } catch (error) {
    next(error);
  }
}

