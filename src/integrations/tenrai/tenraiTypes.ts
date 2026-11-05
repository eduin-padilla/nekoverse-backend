
export interface TenraiImage {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface TenraiImages {
  jpg: TenraiImage;
  webp: TenraiImage;
}

export interface TenraiGenre {
  mal_id: number;
  name: string;
  type: string;
  url: string;
}

export interface TenraiStudio {
  mal_id: number;
  name: string;
  type: string;
  url: string;
}

export interface TenraiAnime {
  mal_id: number;
  url: string;
  images: TenraiImages;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  title_synonyms: string[];
  type: string | null;
  episodes: number | null;
  status: string;
  score: number | null;
  synopsis: string | null;
  year: number | null;
  genres: TenraiGenre[];
  studios: TenraiStudio[];
}

export interface TenraiPagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface TenraiAnimeResponse {
  pagination: TenraiPagination;
  data: TenraiAnime[];
}
