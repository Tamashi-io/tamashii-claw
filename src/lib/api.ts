function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const rawApiBase = process.env.NEXT_PUBLIC_TAMASHIICLAW_API_URL || "/api";

/** Base path for all API calls — points to our Next.js route handlers */
export const API_BASE = trimTrailingSlash(rawApiBase);

/** Models endpoint — proxied through /api/models → HyperCLI SDK */
export const MODELS_ENDPOINT = `${API_BASE}/models`;

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
  console.log("[auth] Exchanging Privy token for app token...");

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privy_token: privyToken }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[auth] Token exchange failed:", response.status, errorText);
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const data: { app_token: string; user_id: string; team_id: string } =
    await response.json();
  console.log("[auth] Token exchange success — user_id:", data.user_id);
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
  const method = options?.method || "GET";
  console.log(`[api] ${method} ${endpoint}`);

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[api] ${method} ${endpoint} → ${response.status}:`, errorText.substring(0, 300));
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[api] ${method} ${endpoint} → ${response.status} OK`, typeof data === "object" ? Object.keys(data) : data);
  return data;
}

/** Fetch raw binary data (e.g. file download). */
export async function apiFetchRaw(
  endpoint: string,
  token: string,
): Promise<globalThis.Response> {
  const url = `${API_BASE}${endpoint}`;
  console.log(`[api] GET ${endpoint} (raw)`);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  return response;
}

/** Upload raw binary data (e.g. file upload). */
export async function apiUploadRaw(
  endpoint: string,
  token: string,
  body: ArrayBuffer,
): Promise<unknown> {
  const url = `${API_BASE}${endpoint}`;
  console.log(`[api] PUT ${endpoint} (raw upload)`);
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  return response.json();
}

/** Check the user's subscription status (stored in backend DB). */
export async function getSubscriptionStatus(token: string): Promise<{
  active: boolean;
  planId?: string;
  amountPaid?: string;
  durationDays?: number;
  expiresAt?: string;
  txHash?: string;
  createdAt?: string;
}> {
  return apiFetch("/subscription", token);
}
