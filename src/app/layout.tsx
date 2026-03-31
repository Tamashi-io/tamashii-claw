import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { TamashiiProviders } from "@/components/TamashiiProviders";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "Comput3Claw - Deploy Autonomous AI Agents",
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
      <body className={`${inter.variable} ${spaceMono.variable} font-sans antialiased overflow-x-hidden`}>
        <TamashiiProviders>
          {children}
        </TamashiiProviders>
      </body>
    </html>
  );
}
