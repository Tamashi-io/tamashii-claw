"use client";

import { ReactNode } from "react";
import { TamashiiAuthProvider } from "./TamashiiAuthProvider";

export function TamashiiProviders({ children }: { children: ReactNode }) {
  return (
    <TamashiiAuthProvider>
      {children}
    </TamashiiAuthProvider>
  );
}
