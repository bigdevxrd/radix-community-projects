"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import ParticleBackground from "@/components/ParticleBackground";
import GameHeader from "@/components/GameHeader";
import NFTGallery from "@/components/NFTGallery";
import BuyCoinsModal from "@/components/BuyCoinsModal";

import { useWallet } from "@/hooks/useWallet";
import { useGame } from "@/hooks/useGame";
import { cn } from "@/lib/utils";
import { RARITY_COLORS } from "@/lib/constants";

/* ── Rarity filter options ───────────────────────────────────────── */

const RARITY_TABS = [
  { key: "all", label: "All", color: "#e4e4e7" },
  { key: "mythic", label: "Mythic", color: RARITY_COLORS.mythic },
  { key: "legendary", label: "Legendary", color: RARITY_COLORS.legendary },
  { key: "epic", label: "Epic", color: RARITY_COLORS.epic },
  { key: "rare", label: "Rare", color: RARITY_COLORS.rare },
  { key: "uncommon", label: "Uncommon", color: RARITY_COLORS.uncommon },
  { key: "common", label: "Common", color: RARITY_COLORS.common },
];

/* ── Page ─────────────────────────────────────────────────────────── */

export default function NFTsPage() {
  const { connected } = useWallet();
  const { nfts, buyCoins } = useGame();

  const [buyOpen, setBuyOpen] = useState(false);
  const [activeRarity, setActiveRarity] = useState("all");

  const filteredNfts = useMemo(
    () =>
      activeRarity === "all"
        ? nfts
        : nfts.filter((n) => n.rarity === activeRarity),
    [nfts, activeRarity],
  );

  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of nfts) {
      counts[n.rarity] = (counts[n.rarity] ?? 0) + 1;
    }
    return counts;
  }, [nfts]);

  return (
    <div className="relative min-h-screen bg-[var(--grid-bg)]">
      <ParticleBackground />
      <GameHeader onBuyCoins={() => setBuyOpen(true)} />
      <BuyCoinsModal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        onBuy={(amount) => {
          buyCoins(amount);
          setBuyOpen(false);
        }}
      />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--neon-green)]"
        >
          ← Back to Game
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-[var(--cyber-yellow)] via-[var(--hot-pink)] to-[var(--electric-purple)] bg-clip-text text-transparent">
              My NFT Collection
            </span>
          </h1>
          <p className="text-lg text-[var(--muted-foreground)]">
            <span className="font-bold text-white">{nfts.length}</span>{" "}
            meme {nfts.length === 1 ? "NFT" : "NFTs"} collected{" "}
            <span className="inline-block animate-float">🖼️✨</span>
          </p>
        </div>

        {!connected ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="text-5xl">🔗</span>
            <p className="text-lg text-[var(--muted-foreground)]">
              Connect your wallet to view your NFT collection
            </p>
            <radix-connect-button />
          </div>
        ) : nfts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <span className="text-7xl">🎲</span>
            <h2 className="text-2xl font-bold text-white">
              No NFTs yet!
            </h2>
            <p className="max-w-md text-[var(--muted-foreground)]">
              Roll the dice and complete boards to earn rare meme NFTs.
              From common Wojaks to mythic Diamond Pepes — collect them all!
            </p>
            <Link
              href="/"
              className="rounded-xl border border-[var(--neon-green)] bg-[var(--neon-green)]/10 px-8 py-3 font-bold text-[var(--neon-green)] transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] active:scale-95"
            >
              Start Playing 🎮
            </Link>
          </div>
        ) : (
          <>
            {/* Rarity filter pills */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              {RARITY_TABS.map((tab) => {
                const count =
                  tab.key === "all"
                    ? nfts.length
                    : rarityCounts[tab.key] ?? 0;
                if (tab.key !== "all" && count === 0) return null;

                const isActive = activeRarity === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveRarity(tab.key)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-bold transition-all duration-200",
                      isActive
                        ? "scale-105 shadow-lg"
                        : "opacity-70 hover:opacity-100",
                    )}
                    style={{
                      backgroundColor: isActive
                        ? `${tab.color}33`
                        : "var(--muted)",
                      color: isActive ? tab.color : "var(--muted-foreground)",
                      borderWidth: 1,
                      borderColor: isActive ? tab.color : "transparent",
                      boxShadow: isActive
                        ? `0 0 12px ${tab.color}44`
                        : "none",
                    }}
                  >
                    {tab.label}{" "}
                    <span className="ml-0.5 text-xs opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Gallery */}
            <NFTGallery nfts={filteredNfts} />
          </>
        )}
      </main>
    </div>
  );
}

/* Tell TypeScript about the Radix web component */
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "radix-connect-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
