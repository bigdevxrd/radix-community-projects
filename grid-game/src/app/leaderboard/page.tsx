"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import ParticleBackground from "@/components/ParticleBackground";
import GameHeader from "@/components/GameHeader";
import BuyCoinsModal from "@/components/BuyCoinsModal";

import { useWallet } from "@/hooks/useWallet";
import { useGame } from "@/hooks/useGame";
import { cn, shortAddress, formatNumber } from "@/lib/utils";
import { GAME_API, LEVELS, RARITY_COLORS } from "@/lib/constants";

/* ── Types ────────────────────────────────────────────────────────── */

interface LeaderboardPlayer {
  radix_address: string;
  level: number;
  level_name: string;
  level_emoji: string;
  xp: number;
  meme_coins: number;
  jackpots: number;
  total_rolls: number;
  total_wins: number;
}

interface LeaderboardCollector {
  radix_address: string;
  total_nfts: number;
  mythic: number;
  legendary: number;
  epic: number;
  rare: number;
  uncommon: number;
  common: number;
}

type Tab = "players" | "collectors";

/* ── Podium styling ──────────────────────────────────────────────── */

const PODIUM = [
  { medal: "🥇", glow: "shadow-[0_0_20px_rgba(255,215,0,0.4)]", border: "border-yellow-400", text: "text-yellow-400" },
  { medal: "🥈", glow: "shadow-[0_0_15px_rgba(192,192,192,0.3)]", border: "border-gray-300", text: "text-gray-300" },
  { medal: "🥉", glow: "shadow-[0_0_15px_rgba(205,127,50,0.3)]", border: "border-amber-600", text: "text-amber-500" },
];

/* ── Page ─────────────────────────────────────────────────────────── */

export default function LeaderboardPage() {
  const { account } = useWallet();
  const { buyCoins } = useGame();

  const [buyOpen, setBuyOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("players");
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [collectors, setCollectors] = useState<LeaderboardCollector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [playersRes, collectorsRes] = await Promise.all([
        fetch(`${GAME_API}/leaderboard`),
        fetch(`${GAME_API}/leaderboard/nfts`),
      ]);

      if (playersRes.ok) {
        setPlayers(await playersRes.json());
      }
      if (collectorsRes.ok) {
        setCollectors(await collectorsRes.json());
      }
    } catch {
      setError("Failed to load leaderboard. The game API may be offline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--neon-green)]"
        >
          ← Back to Game
        </Link>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-[var(--cyber-yellow)] via-[var(--hot-pink)] to-[var(--electric-purple)] bg-clip-text text-transparent">
              🏆 Leaderboard
            </span>
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            The greatest degens in the meme grid
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex justify-center gap-2">
          {(["players", "collectors"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl px-6 py-2 text-sm font-bold transition-all duration-200",
                tab === t
                  ? "border border-[var(--neon-green)] bg-[var(--neon-green)]/10 text-[var(--neon-green)] shadow-[0_0_15px_rgba(57,255,20,0.2)]"
                  : "border border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted-foreground)] hover:border-[var(--neon-green)]/30 hover:text-white",
              )}
            >
              {t === "players" ? "🎮 Top Players" : "🖼️ Top Collectors"}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <span className="animate-bounce text-5xl">🏆</span>
            <p className="animate-pulse text-sm text-[var(--muted-foreground)]">
              Loading leaderboard...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/30 bg-[var(--card-bg)] py-16 text-center">
            <span className="text-5xl">😵</span>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="rounded-xl border border-[var(--neon-green)] bg-[var(--neon-green)]/10 px-6 py-2 text-sm font-bold text-[var(--neon-green)] transition-all hover:bg-[var(--neon-green)]/20"
            >
              Retry
            </button>
          </div>
        ) : tab === "players" ? (
          /* ── Top Players ──────────────────────────────── */
          <div className="flex flex-col gap-2">
            {players.length === 0 ? (
              <EmptyLeaderboard message="No players on the board yet. Be the first degen! 🎲" />
            ) : (
              players.map((p, i) => {
                const rank = i + 1;
                const podium = rank <= 3 ? PODIUM[rank - 1] : null;
                const isMe = p.radix_address === account;
                const lvl =
                  LEVELS.find((l) => l.level === p.level) ?? LEVELS[0];

                return (
                  <div
                    key={p.radix_address}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200",
                      podium
                        ? [podium.border, podium.glow, "bg-[var(--card-bg)]"]
                        : "border-[var(--border)] bg-[var(--card-bg)]",
                      isMe &&
                        "ring-2 ring-[var(--neon-green)]/50 ring-offset-1 ring-offset-[var(--grid-bg)]",
                    )}
                  >
                    {/* Rank */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black",
                        podium
                          ? podium.text
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                      )}
                    >
                      {podium ? podium.medal : `#${rank}`}
                    </div>

                    {/* Player info */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {shortAddress(p.radix_address)}
                        </span>
                        {isMe && (
                          <span className="rounded-md bg-[var(--neon-green)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--neon-green)]">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {lvl.emoji} Lv.{p.level} {p.level_name}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="hidden flex-col sm:flex">
                        <span className="text-sm font-bold text-[var(--cyber-yellow)]">
                          {formatNumber(p.xp)}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          XP
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--neon-green)]">
                          {formatNumber(p.meme_coins)}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          🪙
                        </span>
                      </div>
                      <div className="hidden flex-col sm:flex">
                        <span className="text-sm font-bold text-[var(--hot-pink)]">
                          {p.jackpots}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          💰
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ── Top Collectors ───────────────────────────── */
          <div className="flex flex-col gap-2">
            {collectors.length === 0 ? (
              <EmptyLeaderboard message="No collectors yet. Earn the first meme NFT! 🖼️" />
            ) : (
              collectors.map((c, i) => {
                const rank = i + 1;
                const podium = rank <= 3 ? PODIUM[rank - 1] : null;
                const isMe = c.radix_address === account;

                return (
                  <div
                    key={c.radix_address}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200",
                      podium
                        ? [podium.border, podium.glow, "bg-[var(--card-bg)]"]
                        : "border-[var(--border)] bg-[var(--card-bg)]",
                      isMe &&
                        "ring-2 ring-[var(--neon-green)]/50 ring-offset-1 ring-offset-[var(--grid-bg)]",
                    )}
                  >
                    {/* Rank */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black",
                        podium
                          ? podium.text
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                      )}
                    >
                      {podium ? podium.medal : `#${rank}`}
                    </div>

                    {/* Address */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {shortAddress(c.radix_address)}
                        </span>
                        {isMe && (
                          <span className="rounded-md bg-[var(--neon-green)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--neon-green)]">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        🖼️ {c.total_nfts} NFTs collected
                      </span>
                    </div>

                    {/* Rarity breakdown */}
                    <div className="flex flex-wrap items-center gap-1">
                      {(
                        [
                          ["mythic", c.mythic],
                          ["legendary", c.legendary],
                          ["epic", c.epic],
                          ["rare", c.rare],
                          ["uncommon", c.uncommon],
                          ["common", c.common],
                        ] as [string, number][]
                      )
                        .filter(([, count]) => count > 0)
                        .map(([rarity, count]) => (
                          <span
                            key={rarity}
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: `${RARITY_COLORS[rarity]}33`,
                              color: RARITY_COLORS[rarity],
                            }}
                          >
                            {count}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Empty state helper ──────────────────────────────────────────── */

function EmptyLeaderboard({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-16 text-center">
      <span className="text-5xl">🏜️</span>
      <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      <Link
        href="/"
        className="rounded-xl border border-[var(--neon-green)] bg-[var(--neon-green)]/10 px-6 py-2 text-sm font-bold text-[var(--neon-green)] transition-all hover:bg-[var(--neon-green)]/20"
      >
        Start Playing 🎮
      </Link>
    </div>
  );
}
