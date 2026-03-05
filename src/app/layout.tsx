import type { Metadata } from "next";
import { Syne, Space_Mono } from "next/font/google";
import "./globals.css";
import { TamashiiProviders } from "@/components/TamashiiProviders";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-syne",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "TamashiiClaw - Unlimited Agent Inference",
  description: "Flat-rate, unlimited LLM inference for AI agents. OpenAI-compatible API on NVIDIA B200 GPUs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${syne.variable} ${spaceMono.variable} font-sans antialiased overflow-x-hidden`}>
        <TamashiiProviders>
          {children}
        </TamashiiProviders>
      </body>
    </html>
  );
}
