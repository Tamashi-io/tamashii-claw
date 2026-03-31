"use client";

import { TelegramAuthProvider, useTelegramAuth } from "@/components/TelegramAuthProvider";
import TgNav from "@/components/tg/TgNav";
import Script from "next/script";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

function TgShell({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useTelegramAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">TamashiiClaw</h1>
          <p className="text-gray-400 text-sm mb-4">
            Open this app from Telegram to get started.
          </p>
          <a
            href="https://t.me/tamashiiclawbot/tamashiibot"
            className="inline-block bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-medium"
          >
            Open in Telegram
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1c1e] text-white pb-16">
      {children}
      <TgNav />
    </div>
  );
}

export default function TgLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Telegram Web App SDK — must load before our code runs */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <TonConnectUIProvider
        manifestUrl="https://claw.tamashi.io/tonconnect-manifest.json"
        actionsConfiguration={{
          twaReturnUrl: "https://t.me/tamashiiclawbot/tamashiibot",
        }}
      >
        <TelegramAuthProvider>
          <TgShell>{children}</TgShell>
        </TelegramAuthProvider>
      </TonConnectUIProvider>
    </>
  );
}
