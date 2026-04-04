"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/hooks/useTheme";

const NAV = [
  { path: "/", label: "Dashboard" },
  { path: "/mint", label: "Mint" },
  { path: "/proposals", label: "Proposals" },
  { path: "/admin", label: "Admin" },
];

const TIER_CSS: Record<string, string> = {
  member: "g-pill-muted",
  contributor: "g-pill-blue",
  builder: "g-pill-purple",
  steward: "g-pill-yellow",
  elder: "g-pill-green",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { badge } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const rawPathname = usePathname();
  // Strip basePath for nav matching
  const pathname = rawPathname.replace(/^\/guild/, "") || "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <header className="g-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="font-bold text-base g-text no-underline">
              Radix Guild
            </Link>
            {badge && (
              <span className={`hidden sm:inline g-pill font-mono ${TIER_CSS[badge.tier] || "g-pill-muted"}`}>
                {badge.tier.toUpperCase()} | {badge.xp} XP
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="g-input px-2 py-1 cursor-pointer text-sm"
              title="Toggle theme"
            >
              {theme === "dark" ? "\u2600\ufe0f" : "\ud83c\udf19"}
            </button>
            <span className="hidden sm:inline g-pill g-pill-accent font-mono text-xs">
              Mainnet
            </span>
            {mounted && <radix-connect-button />}
          </div>
        </div>
      </header>

      <nav className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-0.5 sm:gap-1 g-divider overflow-x-auto">
        {NAV.map((n) => (
          <Link
            key={n.path}
            href={n.path}
            className={`px-3 sm:px-4 py-3 text-[13px] font-medium no-underline whitespace-nowrap ${
              pathname === n.path ? "g-nav-active" : "g-nav-idle"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">{children}</main>

      <footer className="max-w-4xl mx-auto mt-8 sm:mt-12 px-4 sm:px-6 py-6 g-divider text-center flex justify-center gap-6 text-[13px] g-text-2">
        <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="g-accent no-underline">
          GitHub
        </a>
        <span>|</span>
        <span>Built on Radix</span>
      </footer>
    </>
  );
}
