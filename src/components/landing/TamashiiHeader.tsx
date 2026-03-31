"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTamashiiAuth } from "@/components/TamashiiAuthProvider";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Models", href: "#models" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
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
            ? "bg-background/95 backdrop-blur-sm border-b border-border"
            : "bg-background"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold">
              <span className="text-foreground">Comput3</span>
              <span className="text-primary">Claw</span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="nav-link text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="btn-primary px-5 py-2 rounded-full text-sm font-medium"
              >
                Console
              </button>
            ) : (
              <button
                onClick={login}
                className="btn-primary px-5 py-2 rounded-full text-sm font-medium"
              >
                Login
              </button>
            )}
          </div>

          <button
            className="lg:hidden p-2 text-text-secondary hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t border-border mt-2 pt-4 bg-background">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="nav-link text-sm font-medium px-2 py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => { setMobileOpen(false); isAuthenticated ? router.push("/dashboard") : login(); }}
                className="btn-primary px-5 py-2 rounded-full text-sm font-medium w-full"
              >
                {isAuthenticated ? "Console" : "Login"}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
