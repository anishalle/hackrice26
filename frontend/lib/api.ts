/**
 * Client for the FastAPI backend (see ../backend).
 *
 * The backend currently exposes one route — GET /api/v1/health — so this is
 * deliberately thin. Its job today is to give the UI one place to reach the
 * API, so adding a real endpoint means adding a function here rather than
 * scattering fetch calls through components.
 *
 * The backend's CORS allows a single origin from FRONTEND_HOST, which defaults
 * to http://localhost:5173 (a Vite default). Next dev serves on :3000, so
 * FRONTEND_HOST=http://localhost:3000 has to be set in the backend's .env or
 * browser requests are rejected before they reach a route.
 */

export const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/$/, "");

export const API_V1 = `${API_BASE}/api/v1`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_V1}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new ApiError(`${init?.method ?? "GET"} ${path} failed`, res.status);
  }
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  status: "ok";
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

/** True when the backend answers. Used for the connection indicator. */
export async function isBackendUp(): Promise<boolean> {
  try {
    const health = await getHealth();
    return health.status === "ok";
  } catch {
    return false;
  }
}
