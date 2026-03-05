"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  clearStoredToken,
  getStoredToken,
  isTokenExpired,
} from "@/lib/api";

export interface TamashiiUser {
  id: string;
  email?: string;
  walletAddress?: string;
}

export interface TamashiiAuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: TamashiiUser | null;
  login: () => void;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

export const TamashiiAuthContext = createContext<TamashiiAuthContextType | undefined>(
  undefined
);

export function useTamashiiAuth(): TamashiiAuthContextType {
  const context = useContext(TamashiiAuthContext);
  if (!context) {
    throw new Error("useTamashiiAuth must be used within TamashiiAuthProvider");
  }
  return context;
}

/**
 * Stub auth provider — pages render but auth functions are no-ops.
 * Replace with a real auth provider (e.g. Privy, NextAuth) when ready.
 */
export function TamashiiAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated] = useState(() => {
    const token = getStoredToken();
    return !!token && !isTokenExpired(token);
  });

  const login = useCallback(() => {
    // TODO: integrate real auth provider
    console.log("Auth not configured yet");
  }, []);

  const logout = useCallback(async () => {
    clearStoredToken();
    window.location.href = "/";
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    const token = getStoredToken();
    if (token && !isTokenExpired(token)) return token;
    throw new Error("Not authenticated");
  }, []);

  return (
    <TamashiiAuthContext.Provider
      value={{
        isLoading: false,
        isAuthenticated,
        user: null,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </TamashiiAuthContext.Provider>
  );
}
