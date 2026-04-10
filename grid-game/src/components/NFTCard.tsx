"use client";

import { cn } from "@/lib/utils";
import { RARITY_COLORS } from "@/lib/constants";

export interface NFTCardData {
  name: string;
  rarity: string;
  image_emoji: string;
  earned_at: string;
  metadata: Record<string, unknown>;
}

interface NFTCardProps {
  nft: NFTCardData;
}

export default function NFTCard({ nft }: NFTCardProps) {
  const color = RARITY_COLORS[nft.rarity] ?? "#9ca3af";
  const isMythic = nft.rarity === "mythic";
  const description =
    (nft.metadata?.description as string) ??
    (nft.metadata?.tagline as string) ??
    "";
  const earnedDate = new Date(nft.earned_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all duration-300",
        "bg-[var(--card-bg)] hover:-translate-y-1 hover:scale-[1.03]",
        isMythic && "mythic-border",
      )}
      style={{
        borderColor: isMythic ? undefined : color,
        boxShadow: `0 0 12px ${color}44, 0 0 24px ${color}22`,
      }}
    >
      {/* Hover glow intensify */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: `0 0 24px ${color}66, 0 0 48px ${color}33`,
        }}
      />

      {/* Large emoji */}
      <span
        className="text-5xl transition-transform duration-300 group-hover:scale-110"
        style={{ filter: `drop-shadow(0 0 10px ${color})` }}
      >
        {nft.image_emoji}
      </span>

      {/* Name */}
      <h3 className="text-center text-sm font-bold text-white">{nft.name}</h3>

      {/* Rarity badge */}
      <span
        className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: color + "33", color }}
      >
        {nft.rarity}
      </span>

      {/* Description */}
      {description && (
        <p className="text-center text-[11px] leading-snug text-[var(--muted-foreground)]">
          {description}
        </p>
      )}

      {/* Earned date */}
      <span className="text-[10px] text-[var(--muted-foreground)]">
        🗓️ {earnedDate}
      </span>

      {/* Mythic rainbow border animation */}
      {isMythic && (
        <style jsx>{`
          .mythic-border {
            border-image: linear-gradient(
                135deg,
                #ef4444,
                #f59e0b,
                #22c55e,
                #3b82f6,
                #a855f7,
                #ef4444
              )
              1;
            animation: rainbow-rotate 3s linear infinite;
            border-style: solid;
          }
          @keyframes rainbow-rotate {
            0% {
              border-image: linear-gradient(
                  0deg,
                  #ef4444,
                  #f59e0b,
                  #22c55e,
                  #3b82f6,
                  #a855f7,
                  #ef4444
                )
                1;
            }
            25% {
              border-image: linear-gradient(
                  90deg,
                  #ef4444,
                  #f59e0b,
                  #22c55e,
                  #3b82f6,
                  #a855f7,
                  #ef4444
                )
                1;
            }
            50% {
              border-image: linear-gradient(
                  180deg,
                  #ef4444,
                  #f59e0b,
                  #22c55e,
                  #3b82f6,
                  #a855f7,
                  #ef4444
                )
                1;
            }
            75% {
              border-image: linear-gradient(
                  270deg,
                  #ef4444,
                  #f59e0b,
                  #22c55e,
                  #3b82f6,
                  #a855f7,
                  #ef4444
                )
                1;
            }
            100% {
              border-image: linear-gradient(
                  360deg,
                  #ef4444,
                  #f59e0b,
                  #22c55e,
                  #3b82f6,
                  #a855f7,
                  #ef4444
                )
                1;
            }
          }
        `}</style>
      )}
    </div>
  );
}
