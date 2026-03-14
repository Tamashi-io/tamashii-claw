"use client";

import { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { base, bsc } from "viem/chains";
import { TamashiiAuthProvider } from "./TamashiiAuthProvider";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export function TamashiiProviders({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#22d3ee",
          logo: "/logo.svg",
        },
        loginMethods: ["wallet", "email"],
        defaultChain: base,
        supportedChains: [base, bsc],
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <TamashiiAuthProvider>{children}</TamashiiAuthProvider>
    </PrivyProvider>
  );
}
