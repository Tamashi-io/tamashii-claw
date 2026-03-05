"use client";

import { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { TamashiiAuthProvider } from "./TamashiiAuthProvider";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export function TamashiiProviders({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    // Fallback: render without auth if Privy isn't configured
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#39ff14",
          logo: undefined,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
      }}
    >
      <TamashiiAuthProvider>{children}</TamashiiAuthProvider>
    </PrivyProvider>
  );
}
