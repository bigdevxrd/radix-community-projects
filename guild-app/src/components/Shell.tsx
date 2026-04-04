"use client";
import { useEffect, useRef, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { RadixDappToolkit, RadixNetwork, DataRequestBuilder } from "@radixdlt/radix-dapp-toolkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DAPP_DEF, BADGE_NFT, TIER_COLORS } from "../lib/constants";
import { loadUserBadge } from "../lib/gateway";
import type { BadgeInfo } from "../lib/types";

interface WalletState {
  account: string | null;
  connected: boolean;
  rdt: RadixDappToolkit | null;
  badge: BadgeInfo | null;
  badgeLoading: boolean;
  refreshBadge: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  account: null, connected: false, rdt: null, badge: null, badgeLoading: false,
  refreshBadge: async () => {},
});

export function useWallet() { return useContext(WalletContext); }

const NAV = [
  { path: "/guild", label: "Dashboard" },
  { path: "/guild/mint", label: "Mint" },
  { path: "/guild/proposals", label: "Proposals" },
  { path: "/guild/admin", label: "Admin" },
];

export function Shell({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [badge, setBadge] = useState<BadgeInfo | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rdtRef = useRef<RadixDappToolkit | null>(null);
  const accountRef = useRef<string | null>(null);
  const pathname = usePathname();

  const doLoadBadge = useCallback(async (addr: string) => {
    setBadgeLoading(true);
    const result = await loadUserBadge(addr, BADGE_NFT);
    setBadge(result);
    setBadgeLoading(false);
  }, []);

  const refreshBadge = useCallback(async () => {
    if (accountRef.current) await doLoadBadge(accountRef.current);
  }, [doLoadBadge]);

  useEffect(() => {
    setMounted(true);
    const rdt = RadixDappToolkit({
      dAppDefinitionAddress: DAPP_DEF,
      networkId: RadixNetwork.Mainnet,
      applicationName: "Radix Guild",
      applicationVersion: "1.0.0",
    });
    rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));
    rdt.walletApi.walletData$.subscribe((data) => {
      const accts = data?.accounts ?? [];
      const addr = accts[0]?.address ?? null;
      setAccount(addr);
      accountRef.current = addr;
      if (addr) doLoadBadge(addr);
      else setBadge(null);
    });
    rdtRef.current = rdt;
    return () => rdt.destroy();
  }, [doLoadBadge]);

  const tierColor = (t: string) => TIER_COLORS[t] || "var(--text-muted)";

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("guild-theme") as "dark" | "light" : null;
    if (saved) { setTheme(saved); document.documentElement.setAttribute("data-theme", saved); }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("guild-theme", next);
  }

  return (
    <WalletContext.Provider value={{ account, connected: !!account, rdt: rdtRef.current, badge, badgeLoading, refreshBadge }}>
      <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-base)", zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/guild" style={{ textDecoration: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>
              Radix Guild
            </Link>
            {badge && (
              <span style={{
                background: tierColor(badge.tier) + "1a", color: tierColor(badge.tier),
                padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
              }}>
                {badge.tier.toUpperCase()} | {badge.xp} XP
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={toggleTheme} style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 6,
              padding: "4px 8px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14,
            }} title="Toggle theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <span style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 12px", fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              Mainnet
            </span>
            {mounted && <radix-connect-button />}
          </div>
        </div>
      </header>

      <nav style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
        {NAV.map(n => (
          <Link key={n.path} href={n.path} style={{
            padding: "12px 16px", fontSize: 13, fontWeight: 500,
            color: pathname === n.path ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: pathname === n.path ? "2px solid var(--accent)" : "2px solid transparent",
            textDecoration: "none",
          }}>
            {n.label}
          </Link>
        ))}
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {children}
      </main>

      <footer style={{ maxWidth: 900, margin: "48px auto 0", padding: 24, borderTop: "1px solid var(--border)", textAlign: "center", display: "flex", justifyContent: "center", gap: 24, fontSize: 13, color: "var(--text-secondary)" }}>
        <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" style={{ color: "var(--accent)", textDecoration: "none" }}>GitHub</a>
        <span>|</span>
        <span>Built on Radix</span>
      </footer>
    </WalletContext.Provider>
  );
}
