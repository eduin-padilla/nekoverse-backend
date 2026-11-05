import { Schema, model, type InferSchemaType } from "mongoose";

const animeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    titleEnglish: { type: String, default: null, trim: true },
    titleJapanese: { type: String, default: null, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 180 },
    synopsis: { type: String, default: "", trim: true, maxlength: 5000 },
    posterUrl: { type: String, required: true, trim: true },
    bannerUrl: { type: String, default: "", trim: true },
    externalId: { type: Number, default: null },
    source: { type: String, enum: ["tenrai"], default: null },
    externalUrl: { type: String, default: "", trim: true },
    episodes: { type: Number, default: null, min: 0 },
    score: { type: Number, default: null, min: 0, max: 10 },
    studios: { type: [String], default: [] },
    genres: { type: [String], default: [] },
    releaseYear: { type: Number, default: null, min: 1900, max: 2100 },
    status: { type: String, enum: ["upcoming", "airing", "completed"], default: "upcoming", required: true },
    type: { type: String, enum: ["TV", "Movie", "OVA", "ONA", "Special"], default: "TV", required: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

animeSchema.index({ source: 1, externalId: 1 }, { unique: true, partialFilterExpression: { source: { $exists: true }, externalId: { $exists: true } } });
animeSchema.index({ title: "text", synopsis: "text" });
animeSchema.index({ genres: 1, status: 1 });
animeSchema.index({ isPublished: 1, releaseYear: -1 });

export type Anime = InferSchemaType<typeof animeSchema>;

export const AnimeModel = model("Anime", animeSchema);