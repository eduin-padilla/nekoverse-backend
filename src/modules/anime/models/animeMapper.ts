import type { TenraiAnime } from "../../../integrations/tenrai/tenraiTypes.js";

export interface NormalizedAnime {
  externalId: number;
  source: "tenrai";
  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;
  synopsis: string;
  posterUrl: string;
  bannerUrl: string;
  episodes: number | null;
  score: number | null;
  releaseYear: number | null;
  type: "TV" | "Movie" | "OVA" | "ONA" | "Special";
  status: "upcoming" | "airing" | "completed";
  genres: string[];
  studios: string[];
  externalUrl: string;
}

function mapAnimeStatus(status: string): NormalizedAnime["status"] {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("not yet aired")) return "upcoming";
  if (normalizedStatus.includes("finished airing")) return "completed";
  if (normalizedStatus.includes("currently airing")) return "airing";
  return "completed";
}

function mapAnimeType(type: string | null): NormalizedAnime["type"] {
  const normalizedType = type?.toUpperCase();

  if (normalizedType === "MOVIE") return "Movie";
  if (normalizedType === "OVA") return "OVA";
  if (normalizedType === "ONA") return "ONA";
  if (normalizedType === "SPECIAL") return "Special";

  return "TV";
}

export function mapTenraiAnime(anime: TenraiAnime): NormalizedAnime {
  return {
    externalId: anime.mal_id,
    source: "tenrai",
    title: anime.title,
    titleEnglish: anime.title_english,
    titleJapanese: anime.title_japanese,
    synopsis: anime.synopsis ?? "",
    posterUrl: anime.images.webp.large_image_url || anime.images.jpg.large_image_url,
    bannerUrl: anime.images.jpg.large_image_url,
    episodes: anime.episodes,
    score: anime.score,
    releaseYear: anime.year,
    type: mapAnimeType(anime.type),
    status: mapAnimeStatus(anime.status),
    genres: anime.genres.map((genre) => genre.name),
    studios: anime.studios.map((studio) => studio.name),
    externalUrl: anime.url
  };
}