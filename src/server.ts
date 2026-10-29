
import app from "./app.js";
import { env } from "./config/env.js";
import {
  connectMongoDB,
  disconnectMongoDB,
} from "./database/mongodb.js";

async function startServer(): Promise<void> {
  await connectMongoDB();

  const server = app.listen(env.PORT, () => {
    console.log(
      `NekoVerse API disponible en http://localhost:${env.PORT}`,
    );
  });

  let shuttingDown = false;

  async function shutdown(): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    server.close(async (error) => {
      try {
        await disconnectMongoDB();

        if (error) {
          console.error("Error al cerrar el servidor:", error);
          process.exitCode = 1;
        }
      } catch (shutdownError) {
        console.error(
          "Error al cerrar MongoDB:",
          shutdownError,
        );
        process.exitCode = 1;
      }
    });
  }

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

startServer().catch((error: unknown) => {
  console.error("No se pudo iniciar NekoVerse:", error);
  process.exitCode = 1;
});
