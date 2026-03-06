"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

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
 * Single-account mode — no user login required.
 * The server-side API key handles all auth with HyperClaw.
 */
export function TamashiiAuthProvider({ children }: { children: ReactNode }) {
  return (
    <TamashiiAuthContext.Provider
      value={{
        isLoading: false,
        isAuthenticated: true,
        user: { id: "tamashii", email: "admin@tamashii.io" },
        login: () => { window.location.href = "/dashboard"; },
        logout: async () => { window.location.href = "/"; },
        getToken: async () => "",
      }}
    >
      {children}
    </TamashiiAuthContext.Provider>
  );
}
