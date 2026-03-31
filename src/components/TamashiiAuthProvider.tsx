"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getAppToken,
  getStoredToken,
  clearStoredToken,
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

export const TamashiiAuthContext = createContext<
  TamashiiAuthContextType | undefined
>(undefined);

export function useTamashiiAuth(): TamashiiAuthContextType {
  const context = useContext(TamashiiAuthContext);
  if (!context) {
    throw new Error("useTamashiiAuth must be used within TamashiiAuthProvider");
  }
  return context;
}

export function TamashiiAuthProvider({ children }: { children: ReactNode }) {
  const {
    ready,
    authenticated,
    user: privyUser,
    login: privyLogin,
    logout: privyLogout,
    getAccessToken,
  } = usePrivy();

  const { wallets } = useWallets();
  const [tamashiiUser, setTamashiiUser] = useState<TamashiiUser | null>(null);

  // Stable wallet address ref to avoid infinite loops from useWallets()
  const walletAddress = wallets?.[0]?.address ?? privyUser?.wallet?.address;

  // Map Privy user → TamashiiUser whenever auth state changes
  useEffect(() => {
    if (!authenticated || !privyUser) {
      setTamashiiUser(null);
      return;
    }

    setTamashiiUser({
      id: privyUser.id,
      email: privyUser.email?.address,
      walletAddress,
    });
  }, [authenticated, privyUser?.id, privyUser?.email?.address, walletAddress]);

  const login = useCallback(() => {
    privyLogin();
  }, [privyLogin]);

  const logout = useCallback(async () => {
    clearStoredToken();
    await privyLogout();
    window.location.href = "/";
  }, [privyLogout]);

  const getToken = useCallback(async (): Promise<string> => {
    // Check stored app token first
    const stored = getStoredToken();
    if (stored && !isTokenExpired(stored)) return stored;

    // Exchange Privy access token for app token
    return getAppToken(async () => {
      const token = await getAccessToken();
      return token;
    });
  }, [getAccessToken]);

  return (
    <TamashiiAuthContext.Provider
      value={{
        isLoading: !ready,
        isAuthenticated: authenticated,
        user: tamashiiUser,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </TamashiiAuthContext.Provider>
  );
}
