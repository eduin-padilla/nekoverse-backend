
import { Router } from "express";
import {createAnimeController,getAllAnimesController,getAnimeBySlugController,}from "./controllers/animeController.js";
import { getPopularExternalAnimesController, searchExternalAnimesController } from "./controllers/animeExternalController.js";





const animeRouter = Router();
animeRouter.post("/", createAnimeController);
animeRouter.get("/", getAllAnimesController);
animeRouter.get("/popular", getPopularExternalAnimesController);
animeRouter.get("/search", searchExternalAnimesController);
animeRouter.get("/:slug", getAnimeBySlugController);

export default animeRouter;
