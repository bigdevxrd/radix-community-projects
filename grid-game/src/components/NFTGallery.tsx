"use client";

import { useMemo } from "react";
import NFTCard from "@/components/NFTCard";
import type { NFTCardData } from "@/components/NFTCard";

const RARITY_ORDER: Record<string, number> = {
  mythic: 0,
  legendary: 1,
  epic: 2,
  rare: 3,
  uncommon: 4,
  common: 5,
};

interface NFTGalleryProps {
  nfts: NFTCardData[];
}

export default function NFTGallery({ nfts }: NFTGalleryProps) {
  const sorted = useMemo(
    () =>
      [...nfts].sort(
        (a, b) =>
          (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99),
      ),
    [nfts],
  );

  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of nfts) {
      counts[n.rarity] = (counts[n.rarity] ?? 0) + 1;
    }
    return counts;
  }, [nfts]);

  if (nfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-8 py-16 text-center">
        <span className="text-5xl">🎲</span>
        <p className="text-lg text-[var(--muted-foreground)]">
          No NFTs yet! Roll the dice to earn meme NFTs 🎲
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Rare rolls grant legendary collectibles ✨
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Count badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-[var(--muted)] px-3 py-1 text-sm font-bold text-white">
          🏆 {nfts.length} Total
        </span>
        {Object.entries(rarityCounts)
          .sort(
            ([a], [b]) =>
              (RARITY_ORDER[a] ?? 99) - (RARITY_ORDER[b] ?? 99),
          )
          .map(([rarity, count]) => (
            <span
              key={rarity}
              className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase"
              style={{
                backgroundColor:
                  rarity === "mythic"
                    ? "#ef444433"
                    : rarity === "legendary"
                      ? "#f59e0b33"
                      : rarity === "epic"
                        ? "#a855f733"
                        : rarity === "rare"
                          ? "#3b82f633"
                          : "#9ca3af22",
                color:
                  rarity === "mythic"
                    ? "#ef4444"
                    : rarity === "legendary"
                      ? "#f59e0b"
                      : rarity === "epic"
                        ? "#a855f7"
                        : rarity === "rare"
                          ? "#3b82f6"
                          : "#9ca3af",
              }}
            >
              {rarity}: {count}
            </span>
          ))}
      </div>

      {/* NFT grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((nft, i) => (
          <NFTCard key={`${nft.name}-${i}`} nft={nft} />
        ))}
      </div>
    </div>
  );
}
