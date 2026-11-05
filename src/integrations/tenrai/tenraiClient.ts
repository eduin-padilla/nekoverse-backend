import { env } from "../../config/env.js";


const TENRAI_BASE_URL = env.TENRAI_BASE_URL;  

interface TenraiRequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
}

export class TenraiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "TenraiApiError";
  }
}

export async function tenraiRequest<T>(
  endpoint: string,
  options: TenraiRequestOptions = {},
): Promise<T> {
  const url = new URL(`${TENRAI_BASE_URL}${endpoint}`);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new TenraiApiError("Tiempo de espera agotado al consultar Tenrai", 504);
    }

    throw new TenraiApiError("No fue posible conectar con Tenrai", 502);
  }

  if (!response.ok) {
    throw new TenraiApiError(
      `Error al consultar Tenrai: ${response.status}`,
      response.status === 429 ? 503 : 502,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new TenraiApiError("Tenrai devolvió una respuesta JSON inválida", 502);
  }
}
