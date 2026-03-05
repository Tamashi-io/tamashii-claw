function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function stripApiSuffix(value: string): string {
  const trimmed = trimTrailingSlash(value);
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

const rawApiBase = process.env.NEXT_PUBLIC_TAMASHIICLAW_API_URL || "";
const rawModelsUrl = process.env.NEXT_PUBLIC_TAMASHIICLAW_MODELS_URL || "";

export const API_BASE = trimTrailingSlash(rawApiBase);

export const MODELS_ENDPOINT = rawModelsUrl
  ? trimTrailingSlash(rawModelsUrl)
  : rawApiBase
    ? `${stripApiSuffix(rawApiBase)}/models`
    : "/models";

const TOKEN_KEY = "tamashiiclaw_auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp;
    if (!exp) return true;
    return Date.now() >= exp * 1000 - 60000;
  } catch {
    return true;
  }
}

export async function exchangeToken(privyToken: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privy_token: privyToken }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const data: { app_token: string; user_id: string; team_id: string } =
    await response.json();
  setStoredToken(data.app_token);
  return data.app_token;
}

export async function getAppToken(
  getPrivyToken: () => Promise<string | null>
): Promise<string> {
  const storedToken = getStoredToken();
  if (storedToken && !isTokenExpired(storedToken)) {
    return storedToken;
  }

  const privyToken = await getPrivyToken();
  if (!privyToken) {
    throw new Error("Not authenticated");
  }

  return exchangeToken(privyToken);
}

export async function apiFetch<T>(
  endpoint: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const headers: HeadersInit = {
    ...options?.headers,
    Authorization: `Bearer ${token}`,
  };

  if (!(options?.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
