"use client";
import { useEffect, useRef, useState, createContext, useContext, type ReactNode } from "react";
import { RadixDappToolkit, RadixNetwork, DataRequestBuilder } from "@radixdlt/radix-dapp-toolkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DAPP_DEF = process.env.NEXT_PUBLIC_DAPP_DEF || "account_rdx128lggt503h7m2dhzqnrkkqv4zklxcjmdggr8xxtqy8e47p7fkmd8cx";
const BADGE_NFT = process.env.NEXT_PUBLIC_BADGE_NFT || "resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6";
const GATEWAY = "https://mainnet.radixdlt.com";

interface WalletState {
  account: string | null;
  connected: boolean;
  rdt: RadixDappToolkit | null;
  badge: any | null;
  badgeLoading: boolean;
}

const WalletContext = createContext<WalletState>({
  account: null, connected: false, rdt: null, badge: null, badgeLoading: false,
});

export function useWallet() { return useContext(WalletContext); }

const NAV = [
  { path: "/guild", label: "Dashboard" },
  { path: "/guild/proposals", label: "Proposals" },
  { path: "/guild/admin", label: "Admin" },
];

export function Shell({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [badge, setBadge] = useState<any>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rdtRef = useRef<RadixDappToolkit | null>(null);
  const pathname = usePathname();

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
      if (addr) loadBadge(addr);
      else setBadge(null);
    });
    rdtRef.current = rdt;
    return () => rdt.destroy();
  }, []);

  async function loadBadge(addr: string) {
    setBadgeLoading(true);
    try {
      const resp = await fetch(GATEWAY + "/state/entity/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addresses: [addr], aggregation_level: "Vault",
          opt_ins: { non_fungible_include_nfids: true },
        }),
      });
      const data = await resp.json();
      const nfRes = data.items?.[0]?.non_fungible_resources?.items || [];
      const badgeRes = nfRes.find((r: any) => r.resource_address === BADGE_NFT);
      if (!badgeRes) { setBadge(null); setBadgeLoading(false); return; }

      const nfIds = badgeRes.vaults?.items?.[0]?.items || [];
      if (nfIds.length === 0) { setBadge(null); setBadgeLoading(false); return; }

      const bResp = await fetch(GATEWAY + "/state/non-fungible/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource_address: BADGE_NFT, non_fungible_ids: [nfIds[0]] }),
      });
      const bd = await bResp.json();
      const f = bd.non_fungible_ids?.[0]?.data?.programmatic_json?.fields;
      if (f) {
        const g = (i: number) => f[i]?.value || f[i]?.fields?.[0]?.value || "-";
        setBadge({ id: nfIds[0], issued_to: g(0), tier: g(3), status: g(4), xp: parseInt(g(6)) || 0, level: g(7) });
      }
    } catch (e) { console.error("Badge load error:", e); }
    setBadgeLoading(false);
  }

  const tierColor = (t: string) => ({
    member: "#8888a0", contributor: "#4ea8de", builder: "#a78bfa", steward: "#f59e0b", elder: "#00e49f",
  }[t] || "#888");

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
    <WalletContext.Provider value={{ account, connected: !!account, rdt: rdtRef.current, badge, badgeLoading }}>
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
