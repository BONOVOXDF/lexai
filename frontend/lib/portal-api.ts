/**
 * Cliente HTTP do portal do cliente.
 *
 * Usa um token próprio do portal (armazenado em `lexai_portal_token`),
 * separado da sessão do advogado.
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export const PORTAL_TOKEN_KEY = "lexai_portal_token";
export const PORTAL_CLIENTE_KEY = "lexai_portal_cliente";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function getPortalCliente(): { id: number; nome: string; email: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PORTAL_CLIENTE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setPortalSession(token: string, cliente: unknown): void {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  localStorage.setItem(PORTAL_CLIENTE_KEY, JSON.stringify(cliente));
}

export function clearPortalSession(): void {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_CLIENTE_KEY);
}

async function portalRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPortalToken();
  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) message = body.detail;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const portalApi = {
  get: <T>(path: string) => portalRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    portalRequest<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
};
