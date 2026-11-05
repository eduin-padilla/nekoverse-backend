import { tenraiRequest } from "../../../integrations/tenrai/tenraiClient.js";
import type { TenraiAnimeResponse } from "../../../integrations/tenrai/tenraiTypes.js";
import { upsertExternalAnime } from "../../repositories/animeExternalRepository.js";
import { mapTenraiAnime, NormalizedAnime } from "../models/animeMapper.js";

export interface NormalizedAnimeResponse {
  pagination: TenraiAnimeResponse["pagination"];
  data: NormalizedAnime[];
}

export async function getPopularExternalAnimes(page = 1, limit = 12): Promise<NormalizedAnimeResponse> {
  const response = await tenraiRequest<TenraiAnimeResponse>("/top/anime", { query: { page, limit, sfw: true } });

  return { pagination: response.pagination, data: response.data.map(mapTenraiAnime) };
}

export async function searchExternalAnimes(query: string, page = 1, limit = 12): Promise<NormalizedAnimeResponse> {
  const response = await tenraiRequest<TenraiAnimeResponse>("/anime", { query: { q: query, page, limit, sfw: true } });

  return { pagination: response.pagination, data: response.data.map(mapTenraiAnime) };
}

export async function importPopularExternalAnimes(page = 1, limit = 12) {
  const response = await getPopularExternalAnimes(page, limit);
  const savedAnimes = await Promise.all(response.data.map(upsertExternalAnime));

  return { pagination: response.pagination, imported: savedAnimes.length, data: savedAnimes };
}