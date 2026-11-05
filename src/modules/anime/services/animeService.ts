
import {AnimeModel,type Anime,} from '../models/animeModel.js';
import type { CreateAnimeInput } from "../schemas/animeSchema.js";

export async function createAnime(data: CreateAnimeInput,): Promise<Anime> {
  const anime = await AnimeModel.create(data);
  return anime.toObject();
}

export async function getAllAnimes(): Promise<Anime[]> {
  return AnimeModel.find({ isPublished: true }).sort({ createdAt: -1 }).lean<Anime[]>().exec();
}

export async function getAnimeBySlug(slug: string,): Promise<Anime | null> {
  return AnimeModel.findOne({slug, isPublished: true,}).lean<Anime>().exec();
}
