"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Bot, Key, CreditCard, Settings, LogOut } from "lucide-react";
import { useTamashiiAuth } from "@/components/TamashiiAuthProvider";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "API Keys", href: "/dashboard/keys", icon: Key },
  { label: "Plans", href: "/dashboard/plans", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useTamashiiAuth();

  // Truncate wallet address for display
  const displayAddress = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
    : null;

  const displayName = user?.email || displayAddress || "Account";

  return (
    <>
      {/* Desktop header */}
      <header className="fixed top-0 left-0 right-0 z-40 glassmorphism">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <a href="/" className="text-lg font-bold">
                <span className="text-foreground">Tamashii</span>
                <span className="text-primary">Claw</span>
              </a>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "text-foreground bg-surface-low"
                          : "text-text-tertiary hover:text-foreground hover:bg-surface-low/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* User info + logout (desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-text-tertiary">{displayName}</span>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-surface-low/50"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glassmorphism border-t border-border">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive ? "text-primary" : "text-text-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
