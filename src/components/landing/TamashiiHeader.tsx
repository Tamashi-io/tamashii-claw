"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTamashiiAuth } from "@/components/TamashiiAuthProvider";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#", external: false },
];

export function TamashiiHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, login } = useTamashiiAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        mobileOpen
          ? "bg-background border-b border-border"
          : scrolled
            ? "bg-background/80 backdrop-blur-lg border-b border-border"
            : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="text-foreground">Tamashii</span>
              <span className="text-primary">Claw</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="nav-link text-sm font-medium"
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => window.location.href = "https://claw.tamashi.io/dashboard"}
                className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
              >
                Launch App
              </button>
            ) : (
              <>
                <button
                  onClick={login}
                  className="text-text-secondary hover:text-foreground text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={login}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-text-secondary hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-border mt-2 pt-4 bg-background">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="nav-link text-sm font-medium px-2 py-1"
                  onClick={() => setMobileOpen(false)}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => { setMobileOpen(false); window.location.href = "https://claw.tamashi.io/dashboard"; }}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium w-full"
                >
                  Launch App
                </button>
              ) : (
                <button
                  onClick={() => { setMobileOpen(false); login(); }}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium w-full"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
