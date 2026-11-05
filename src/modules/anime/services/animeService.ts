
import { AnimeModel, type Anime } from "../models/animeModel.js";
import type { CreateAnimeInput } from "../schemas/animeSchema.js";
import type { UpdateAnimeInput } from "../schemas/animeSchema.js";
export interface GetAnimesFilters {
  page: number;
  limit: number;
  search?: string;
  genre?: string;
  status?: "upcoming" | "airing" | "completed";
  type?: "TV" | "Movie" | "OVA" | "ONA" | "Special";
}

export interface PaginatedAnimes {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  data: Anime[];
}

export async function createAnime(data: CreateAnimeInput): Promise<Anime> {
  const anime = await AnimeModel.create(data);
  return anime.toObject();
}

export async function getAllAnimes(filters: GetAnimesFilters): Promise<PaginatedAnimes> {
  const { page, limit, search, genre, status, type } = filters;
  const query: Record<string, unknown> = { isPublished: true };

  if (search) query.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (genre) query.genres = { $regex: `^${genre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
  if (status) query.status = status;
  if (type) query.type = type;

  const skip = (page - 1) * limit;
  const [animes, total] = await Promise.all([
    AnimeModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<Anime[]>().exec(),
    AnimeModel.countDocuments(query).exec()
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    data: animes
  };
}

export async function getAnimeBySlug(slug: string): Promise<Anime | null> {
  return AnimeModel.findOne({ slug, isPublished: true }).lean<Anime>().exec();
}


export async function updateAnimePublication(id: string, isPublished: boolean): Promise<Anime | null> {
  return AnimeModel.findByIdAndUpdate(id, { isPublished }, { new: true, runValidators: true }).lean<Anime>().exec();
}

export async function updateAnime(id: string, data: UpdateAnimeInput): Promise<Anime | null> {
  return AnimeModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean<Anime>().exec();
}

export async function deleteAnime(id: string): Promise<Anime | null> {
  return AnimeModel.findByIdAndDelete(id).lean<Anime>().exec();
}

export async function publishManyAnimes(ids: string[]): Promise<number> {
  const result = await AnimeModel.updateMany(
    { _id: { $in: ids }, isPublished: false },
    { $set: { isPublished: true } }
  );

  return result.modifiedCount;
}