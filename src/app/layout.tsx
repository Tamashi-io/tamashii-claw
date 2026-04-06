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
  title: "TamashiiClaw - Deploy Autonomous AI Agents",
  description: "Deploy persistent AI agents on decentralized B200 GPUs. Flat-rate inference, OpenAI-compatible API, pay with USDC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${syne.variable} ${spaceMono.variable} font-sans antialiased overflow-x-hidden`}>
        <TamashiiProviders>
          {children}
        </TamashiiProviders>
      </body>
    </html>
  );
}
