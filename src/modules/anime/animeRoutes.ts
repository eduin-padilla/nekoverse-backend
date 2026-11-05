
import { Router } from "express";
import {createAnimeController,getAllAnimesController,getAnimeBySlugController, publishAnimeController, unpublishAnimeController, updateAnimeController, deleteAnimeController, publishManyAnimesController }from "./controllers/animeController.js";
import { getPopularExternalAnimesController, searchExternalAnimesController } from "./controllers/animeExternalController.js";
import { importPopularAnimesController,  } from "./controllers/animeImportController.js";



const animeRouter = Router();
animeRouter.post("/", createAnimeController);
animeRouter.get("/", getAllAnimesController);
animeRouter.get("/popular", getPopularExternalAnimesController);
animeRouter.get("/search", searchExternalAnimesController);
animeRouter.post("/import/popular", importPopularAnimesController);
animeRouter.patch("/:id/publish", publishAnimeController);
animeRouter.patch("/:id/unpublish", unpublishAnimeController);
animeRouter.patch("/:id", updateAnimeController);
animeRouter.delete("/:id", deleteAnimeController);
animeRouter.patch("/publish/bulk", publishManyAnimesController);



animeRouter.get("/:slug", getAnimeBySlugController);

export default animeRouter;
