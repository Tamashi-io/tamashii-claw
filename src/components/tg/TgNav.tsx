"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bot, CreditCard } from "lucide-react";

const tabs = [
  { href: "/tg", label: "Home", icon: Home },
  { href: "/tg/agents", label: "Agents", icon: Bot },
  { href: "/tg/plans", label: "Plans", icon: CreditCard },
];

export default function TgNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1c1c1e] border-t border-white/10 safe-area-bottom">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/tg"
              ? pathname === "/tg"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-cyan-400" : "text-gray-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
