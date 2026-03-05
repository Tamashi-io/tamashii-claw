"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  clearStoredToken,
  getStoredToken,
  isTokenExpired,
  getAppToken,
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

export function TamashiiAuthProvider({ children }: { children: ReactNode }) {
  const {
    ready,
    authenticated,
    login: privyLogin,
    logout: privyLogout,
    user: privyUser,
    getAccessToken,
  } = usePrivy();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<TamashiiUser | null>(null);

  // Check for existing valid token on mount
  useEffect(() => {
    if (!ready) return;

    const token = getStoredToken();
    if (token && !isTokenExpired(token)) {
      setIsAuthenticated(true);
      if (privyUser) {
        setUser({
          id: privyUser.id,
          email: privyUser.email?.address,
          walletAddress: privyUser.wallet?.address,
        });
      }
    }
    setIsLoading(false);
  }, [ready, privyUser]);

  // Exchange Privy token for app token when Privy authenticates
  useEffect(() => {
    if (!ready || !authenticated || isAuthenticated) return;

    const exchange = async () => {
      try {
        setIsLoading(true);
        await getAppToken(getAccessToken);
        setIsAuthenticated(true);
        if (privyUser) {
          setUser({
            id: privyUser.id,
            email: privyUser.email?.address,
            walletAddress: privyUser.wallet?.address,
          });
        }
      } catch (err) {
        console.error("Token exchange failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    exchange();
  }, [ready, authenticated, isAuthenticated, getAccessToken, privyUser]);

  const login = useCallback(() => {
    privyLogin();
  }, [privyLogin]);

  const logout = useCallback(async () => {
    clearStoredToken();
    setIsAuthenticated(false);
    setUser(null);
    await privyLogout();
  }, [privyLogout]);

  const getToken = useCallback(async (): Promise<string> => {
    return getAppToken(getAccessToken);
  }, [getAccessToken]);

  return (
    <TamashiiAuthContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        user,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </TamashiiAuthContext.Provider>
  );
}
