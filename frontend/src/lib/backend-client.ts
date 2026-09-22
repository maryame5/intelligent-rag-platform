/**
 * Client HTTP pour le backend FastAPI.
 *
 * Gère le stockage des tokens (access + refresh, voir Sprint 1 du backend),
 * attache l'en-tête Authorization automatiquement, et tente UN refresh
 * automatique en cas de 401 avant de redonner la main à l'appelant — pour ne
 * pas déconnecter l'utilisateur juste parce que l'access token (30 min) a
 * expiré pendant qu'il travaillait.
 */

export const API_BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) || "http://localhost:8000";

const ACCESS_TOKEN_KEY = "rag.access_token";
const REFRESH_TOKEN_KEY = "rag.refresh_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/** Levée quand le refresh échoue aussi : la session est vraiment terminée. */
export class AuthExpiredError extends Error {
  constructor() {
    super("Session expirée, merci de vous reconnecter.");
    this.name = "AuthExpiredError";
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.clone().json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      // Erreurs de validation Pydantic : liste d'objets {loc, msg}.
      return body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ");
    }
  } catch {
    /* pas de corps JSON exploitable */
  }
  return `Erreur ${response.status}`;
}

async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return false;

  const data = await response.json();
  setTokens(data.access_token);
  return true;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Passer `true` pour un endpoint qui ne nécessite pas d'authentification. */
  skipAuth?: boolean;
  /** Corps de la requête : objet sérialisé en JSON, FormData, ou primitif. */
  body?: unknown;
}

/**
 * Requête générique. `body` peut être un objet (sérialisé en JSON) ou un
 * FormData (upload de fichier) — dans ce dernier cas on laisse le navigateur
 * poser le Content-Type (avec sa boundary multipart) plutôt que de le forcer.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers, body, ...rest } = options;
  const isFormData = body instanceof FormData;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = { ...(headers as Record<string, string>) };
    if (!isFormData) h["Content-Type"] = "application/json";
    if (!skipAuth) {
      const token = getAccessToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  };

  const doFetch = () => {
    const init: RequestInit = {
      ...rest,
      headers: buildHeaders(),
    };
    if (body !== undefined) {
      init.body = isFormData ? (body as FormData) : JSON.stringify(body);
    }
    return fetch(`${API_BASE_URL}${path}`, init);
  };

  let response = await doFetch();

  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshAccessToken();
    if (!refreshed) {
      clearTokens();
      throw new AuthExpiredError();
    }
    response = await doFetch();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
