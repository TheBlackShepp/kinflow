const TOKEN_KEY = "familywall_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class OfflineError extends Error {
  constructor() {
    super("Sin conexión");
    this.name = "OfflineError";
  }
}

export function isNavigatorOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!isNavigatorOnline()) {
    throw new OfflineError();
  }

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new OfflineError();
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Error en la solicitud");
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
