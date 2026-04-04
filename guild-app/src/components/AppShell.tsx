"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/hooks/useTheme";
import { TIER_COLORS } from "@/lib/constants";

const NAV = [
  { path: "/guild", label: "Dashboard" },
  { path: "/guild/mint", label: "Mint" },
  { path: "/guild/proposals", label: "Proposals" },
  { path: "/guild/admin", label: "Admin" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { badge } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const tierColor = badge ? TIER_COLORS[badge.tier] || "var(--c-text-muted)" : "";

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-base">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/guild"
              className="font-bold text-base text-text-primary no-underline"
            >
              Radix Guild
            </Link>
            {badge && (
              <span
                className="hidden sm:inline px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono"
                style={{ background: `${tierColor}1a`, color: tierColor }}
              >
                {badge.tier.toUpperCase()} | {badge.xp} XP
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="bg-transparent border border-border rounded-md px-2 py-1 cursor-pointer text-text-secondary text-sm hover:border-border-focus"
              title="Toggle theme"
            >
              {theme === "dark" ? "\u2600\ufe0f" : "\ud83c\udf19"}
            </button>
            <span className="hidden sm:inline bg-surface-2 border border-border rounded-full px-3 py-1 text-xs text-accent font-mono">
              Mainnet
            </span>
            {mounted && <radix-connect-button />}
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-0.5 sm:gap-1 border-b border-border overflow-x-auto">
        {NAV.map((n) => (
          <Link
            key={n.path}
            href={n.path}
            className={`px-3 sm:px-4 py-3 text-[13px] font-medium no-underline border-b-2 transition-colors whitespace-nowrap ${
              pathname === n.path
                ? "text-accent border-accent"
                : "text-text-secondary border-transparent hover:text-text-primary"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">{children}</main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto mt-8 sm:mt-12 px-4 sm:px-6 py-6 border-t border-border text-center flex justify-center gap-6 text-[13px] text-text-secondary">
        <a
          href="https://github.com/bigdevxrd/radix-community-projects"
          target="_blank"
          className="text-accent no-underline hover:text-accent-hover"
        >
          GitHub
        </a>
        <span>|</span>
        <span>Built on Radix</span>
      </footer>
    </>
  );
}
