"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/hooks/useTheme";
import { TIER_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon } from "lucide-react";

const NAV = [
  { path: "/", label: "Dashboard" },
  { path: "/mint", label: "Mint" },
  { path: "/proposals", label: "Proposals" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/admin", label: "Admin" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { badge } = useWallet();
  const { theme, setTheme } = useTheme();
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/^\/guild/, "") || "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="font-bold text-base text-foreground no-underline">
              Radix Governance
            </Link>
            {badge && (
              <Badge variant="secondary" className="hidden sm:inline-flex font-mono text-[11px]"
                style={{ borderLeft: `3px solid ${TIER_COLORS[badge.tier] || "var(--muted)"}` }}>
                {badge.tier.toUpperCase()} | {badge.xp} XP
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {mounted && (
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            <Badge variant="outline" className="hidden sm:inline-flex font-mono text-xs text-primary">
              Mainnet
            </Badge>
            {mounted && <radix-connect-button />}
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-0.5 sm:gap-1 border-b overflow-x-auto">
        {NAV.map((n) => (
          <Link
            key={n.path}
            href={n.path}
            className={`px-3 sm:px-4 py-3 text-[13px] font-medium no-underline whitespace-nowrap border-b-2 transition-colors ${
              pathname === n.path
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">{children}</main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto mt-8 sm:mt-12 px-4 sm:px-6 py-6 border-t text-center flex justify-center gap-6 text-[13px] text-muted-foreground">
        <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="text-primary no-underline hover:underline">
          GitHub
        </a>
        <Separator orientation="vertical" className="h-4" />
        <span>Built on Radix</span>
      </footer>
    </>
  );
}
