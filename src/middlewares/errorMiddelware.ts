
import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";

export const notFoundHandler: RequestHandler = (
  req,
  res,
) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    typeof error.statusCode === "number"
      ? error.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Error interno del servidor"
        : error.message,
  });
};
