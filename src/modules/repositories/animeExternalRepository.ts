import { NormalizedAnime } from "../anime/models/animeMapper.js";
import { AnimeModel } from "../anime/models/animeModel.js";


function generateSlug(title: string, externalId: number): string {
  const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug}-${externalId}`;
}

export async function upsertExternalAnime(anime: NormalizedAnime) {
  return AnimeModel.findOneAndUpdate(
    { source: anime.source, externalId: anime.externalId },
    {
      $set: {
        title: anime.title,
        titleEnglish: anime.titleEnglish,
        titleJapanese: anime.titleJapanese,
        synopsis: anime.synopsis,
        posterUrl: anime.posterUrl,
        bannerUrl: anime.bannerUrl,
        externalUrl: anime.externalUrl,
        episodes: anime.episodes,
        score: anime.score,
        studios: anime.studios,
        genres: anime.genres,
        releaseYear: anime.releaseYear,
        status: anime.status,
        type: anime.type
      },
      $setOnInsert: {
        slug: generateSlug(anime.title, anime.externalId),
        isPublished: false
      }
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}