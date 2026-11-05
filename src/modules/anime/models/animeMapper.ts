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
  year: number | null;
  type: string | null;
  status: string;
  genres: string[];
  studios: string[];
  externalUrl: string;
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
    year: anime.year,
    type: anime.type,
    status: anime.status,
    genres: anime.genres.map((genre) => genre.name),
    studios: anime.studios.map((studio) => studio.name),
    externalUrl: anime.url
  };
}