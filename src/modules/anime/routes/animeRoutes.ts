
import { Router } from "express";
import {createAnimeController,getAllAnimesController,getAnimeBySlugController, publishAnimeController, unpublishAnimeController, updateAnimeController, deleteAnimeController, publishManyAnimesController }from "../controllers/animeController.js";
import { getPopularExternalAnimesController, searchExternalAnimesController } from "../controllers/animeExternalController.js";
import { importPopularAnimesController,  } from "../controllers/animeImportController.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { adminMiddleware } from "../../../middlewares/adminMiddleware.js";



const animeRouter = Router();
animeRouter.post("/", authMiddleware, adminMiddleware,   createAnimeController);
animeRouter.get("/", getAllAnimesController);
animeRouter.get("/popular", getPopularExternalAnimesController);
animeRouter.get("/search", searchExternalAnimesController);
animeRouter.post("/import/popular", authMiddleware, adminMiddleware, importPopularAnimesController);
animeRouter.patch("/:id/publish", authMiddleware, adminMiddleware, publishAnimeController);
animeRouter.patch("/:id/unpublish", authMiddleware, adminMiddleware, unpublishAnimeController);
animeRouter.patch("/:id", authMiddleware, adminMiddleware, updateAnimeController);
animeRouter.delete("/:id", authMiddleware, adminMiddleware, deleteAnimeController);
animeRouter.patch("/publish/bulk", authMiddleware, adminMiddleware, publishManyAnimesController);



animeRouter.get("/:slug", getAnimeBySlugController);

export default animeRouter;
