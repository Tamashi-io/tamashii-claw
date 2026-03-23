"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_BASE } from "@/lib/api";

/* ── Types ─────────────────────────────────────────────────────────── */

interface TelegramUser {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
}

interface TelegramAuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: TelegramUser | null;
  getToken: () => Promise<string>;
  logout: () => void;
}

const TelegramAuthContext = createContext<TelegramAuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  getToken: async () => "",
  logout: () => {},
});

export const useTelegramAuth = () => useContext(TelegramAuthContext);

/* ── Storage ───────────────────────────────────────────────────────── */

const TOKEN_KEY = "tamashiiclaw_tg_auth_token";

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Refresh 60s before expiry
    return Date.now() > (payload.exp * 1000 - 60_000);
  } catch {
    return true;
  }
}

/* ── Provider ──────────────────────────────────────────────────────── */

export function TelegramAuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initialize Telegram Web App and authenticate
  useEffect(() => {
    async function init() {
      // Get Telegram WebApp instance
      const tg = (window as any).Telegram?.WebApp;
      if (!tg) {
        console.warn("[tg-auth] Not running in Telegram — no WebApp object");
        setIsLoading(false);
        return;
      }

      // Signal readiness and expand to full screen
      tg.ready();
      tg.expand();

      const initData = tg.initData;
      if (!initData) {
        console.warn("[tg-auth] No initData — not launched via bot");
        setIsLoading(false);
        return;
      }

      // Check for cached token
      const cached = getStoredToken();
      if (cached && !isTokenExpired(cached)) {
        try {
          const payload = JSON.parse(atob(cached.split(".")[1]));
          setToken(cached);
          setUser({
            id: payload.sub,
            telegramId: payload.telegram_id,
            username: payload.telegram_username,
            firstName: payload.telegram_first_name,
          });
          setIsLoading(false);
          console.log("[tg-auth] Using cached token for", payload.sub);
          return;
        } catch {
          clearToken();
        }
      }

      // Exchange initData for app token
      try {
        console.log("[tg-auth] Exchanging initData for app token...");
        const res = await fetch(`${API_BASE}/auth/telegram`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Auth failed: ${res.status} ${err}`);
        }

        const data = await res.json();
        const appToken = data.app_token;
        storeToken(appToken);
        setToken(appToken);
        setUser({
          id: data.user_id,
          telegramId: data.telegram_id,
          username: data.telegram_username,
          firstName: data.telegram_first_name,
        });
        console.log("[tg-auth] Authenticated:", data.user_id);
      } catch (err) {
        console.error("[tg-auth] Authentication failed:", err);
      }

      setIsLoading(false);
    }

    init();
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    if (token && !isTokenExpired(token)) {
      return token;
    }

    // Token expired — re-authenticate with Telegram initData
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) {
      throw new Error("No Telegram context for token refresh");
    }

    const res = await fetch(`${API_BASE}/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    });

    if (!res.ok) throw new Error("Token refresh failed");

    const data = await res.json();
    const newToken = data.app_token;
    storeToken(newToken);
    setToken(newToken);
    return newToken;
  }, [token]);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    const tg = (window as any).Telegram?.WebApp;
    tg?.close();
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!token && !!user,
      user,
      getToken,
      logout,
    }),
    [isLoading, token, user, getToken, logout],
  );

  return (
    <TelegramAuthContext.Provider value={value}>
      {children}
    </TelegramAuthContext.Provider>
  );
}
