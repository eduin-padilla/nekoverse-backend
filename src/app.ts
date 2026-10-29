
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import {
  notFoundHandler,
  errorHandler,
} from './middlewares/errorMiddelware.js';

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
  }),
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "NekoVerse API funcionando",
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
