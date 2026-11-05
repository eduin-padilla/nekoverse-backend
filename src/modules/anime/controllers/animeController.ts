
import type {Request,Response,NextFunction,} from "express";
import {createAnimeSchema,} from "../schemas/animeSchema.js";
import {createAnime,getAllAnimes,getAnimeBySlug,} from "../services/animeService.js";

export async function createAnimeController(req: Request,res: Response,next: NextFunction,): Promise<void> {
  try {
        const validation = createAnimeSchema.safeParse(req.body);   

        if (!validation.success) {
        res.status(400).json({success: false,message: "Los datos del anime no son válidos",errors: validation.error.flatten().fieldErrors,});
        return;
        }

        const anime = await createAnime(validation.data);

        res.status(201).json({success: true,message: "Anime registrado correctamente", data: anime});

    } catch (error) {
        if (typeof error === "object" &&error !== null &&"code" in error &&error.code === 11000) {
            res.status(409).json({success: false,message: "Ya existe un anime con ese slug",});
            return;
        }
        next(error);
    }
}

export async function getAllAnimesController(_req: Request,res: Response,next: NextFunction): Promise<void> {
  try {
        const animes = await getAllAnimes();

        res.status(200).json({success: true,total: animes.length,data: animes,});
    } catch (error) {
        next(error);
    }
}

export async function getAnimeBySlugController(req: Request,res: Response,next: NextFunction): Promise<void> {

  try {
        const slug = req.params.slug;

        if (typeof slug !== "string" || !slug.trim()) {
            res.status(400).json({success: false, message: "El slug proporcionado no es válido",});
            return;
        }
        const anime = await getAnimeBySlug(slug);

        if (!anime) {
        res.status(404).json({
            success: false,
            message: "Anime no encontrado",
        });
        return;
        }
        res.status(200).json({success: true,data: anime,});
    } catch (error) {
        next(error);
    }
}
