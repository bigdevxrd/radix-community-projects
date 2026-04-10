"use client";

import Link from "next/link";

import ParticleBackground from "@/components/ParticleBackground";
import GameHeader from "@/components/GameHeader";
import BuyCoinsModal from "@/components/BuyCoinsModal";

import { useGame } from "@/hooks/useGame";
import { cn } from "@/lib/utils";
import {
  LEVELS,
  CELL_EMOJIS,
  RARITY_COLORS,
  COIN_RATE,
  ROLL_COST,
  BOARD_COST,
} from "@/lib/constants";
import { useState } from "react";

/* ── Step data ────────────────────────────────────────────────────── */

const STEPS = [
  {
    num: 1,
    emoji: "🔗",
    title: "Connect Your Wallet",
    description:
      "Link your Radix wallet to enter the meme grid. Your progress, coins, and NFTs are tied to your account.",
    color: "var(--neon-green)",
  },
  {
    num: 2,
    emoji: "🪙",
    title: "Buy MEME Coins",
    description: `Swap XRD for MEME coins. 1 XRD = ${COIN_RATE} MEME. These are your in-game currency for everything.`,
    color: "var(--cyber-yellow)",
  },
  {
    num: 3,
    emoji: "🎮",
    title: "Start a Board",
    description: `Pay ${BOARD_COST} MEME coins to generate a fresh 8×8 grid full of hidden cells. Each cell hides a different meme surprise!`,
    color: "var(--electric-purple)",
  },
  {
    num: 4,
    emoji: "🎲",
    title: "Roll the Dice",
    description: `Each roll costs ${ROLL_COST} MEME coins. The dice determines which cells get revealed and completed. Match cells to score points!`,
    color: "var(--hot-pink)",
  },
  {
    num: 5,
    emoji: "🖼️",
    title: "Collect NFTs",
    description:
      "Hit milestones, complete boards, and land jackpots to earn unique meme NFTs. From common Wojaks to mythic Diamond Pepes!",
    color: "#f59e0b",
  },
  {
    num: 6,
    emoji: "🏆",
    title: "Level Up",
    description:
      "Earn XP with every roll. Progress from Normie all the way to the legendary Meme Lord. Higher levels mean bigger rewards!",
    color: "#ef4444",
  },
];

/* ── Cell type guide ─────────────────────────────────────────────── */

const CELL_TYPES = [
  {
    type: "normal",
    name: "Normal",
    description: "Basic cell. Score points when completed.",
    color: "#22d3ee",
  },
  {
    type: "double_score",
    name: "Double Score",
    description: "2× points! 🚀 Every degen's best friend.",
    color: "#fb923c",
  },
  {
    type: "extra_turn",
    name: "Extra Turn",
    description: "Free roll! 🎁 Keep the momentum going.",
    color: "#34d399",
  },
  {
    type: "wild",
    name: "Wild Card",
    description: "Complete ANY cell you choose. 🃏 Strategy time!",
    color: "#c084fc",
  },
  {
    type: "rug_pull",
    name: "Rug Pull",
    description: "Lose points! 💀 The meme grid giveth and taketh away.",
    color: "#ef4444",
  },
  {
    type: "pepe_bonus",
    name: "Pepe Bonus",
    description: "Massive point boost. 🐸 Rare and glorious.",
    color: "#4ade80",
  },
  {
    type: "diamond",
    name: "Diamond",
    description: "Huge score multiplier. 💎 Diamond hands rewarded.",
    color: "#ffffff",
  },
  {
    type: "moon",
    name: "Moon",
    description: "To the moon! 🌙 Major bonus points.",
    color: "#fde047",
  },
];

/* ── Rarity tiers ────────────────────────────────────────────────── */

const RARITIES = [
  { name: "Common", emoji: "⬜", description: "Frequently earned from basic completions", chance: "~40%" },
  { name: "Uncommon", emoji: "🟢", description: "Solid rolls and decent boards", chance: "~25%" },
  { name: "Rare", emoji: "🔵", description: "Complete boards with high scores", chance: "~18%" },
  { name: "Epic", emoji: "🟣", description: "Exceptional plays and streaks", chance: "~10%" },
  { name: "Legendary", emoji: "🟡", description: "Jackpots and perfect boards", chance: "~5%" },
  { name: "Mythic", emoji: "🔴", description: "The rarest of the rare. Legend status.", chance: "~2%" },
];

/* ── Page ─────────────────────────────────────────────────────────── */

export default function HowToPlayPage() {
  const { buyCoins } = useGame();
  const [buyOpen, setBuyOpen] = useState(false);

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

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--neon-green)]"
        >
          ← Back to Game
        </Link>

        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-[var(--neon-green)] via-[var(--cyber-yellow)] to-[var(--hot-pink)] bg-clip-text text-transparent">
              How to Play
            </span>{" "}
            <span className="inline-block animate-float">🎲</span>
          </h1>
          <p className="mt-3 text-lg text-[var(--muted-foreground)]">
            Your guide to becoming the ultimate Meme Lord
          </p>
        </div>

        {/* ── Steps ───────────────────────────────────────── */}
        <section className="mb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-[var(--border)] p-6 transition-all duration-300",
                  "bg-[var(--card-bg)] hover:border-opacity-60 hover:-translate-y-1",
                )}
                style={{
                  borderColor: `${step.color}30`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 25px ${step.color}22`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {/* Step number badge */}
                <div
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white"
                  style={{ backgroundColor: `${step.color}33`, color: step.color }}
                >
                  {step.num}
                </div>
                <span className="mb-2 inline-block text-3xl transition-transform duration-300 group-hover:scale-110">
                  {step.emoji}
                </span>
                <h3 className="mb-2 text-lg font-bold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cell Types ──────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="mb-6 text-center text-2xl font-black">
            <span className="bg-gradient-to-r from-[var(--neon-green)] to-[var(--electric-purple)] bg-clip-text text-transparent">
              Cell Types
            </span>{" "}
            <span className="inline-block animate-float">🗺️</span>
          </h2>
          <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
            Each cell on the grid hides one of these types. Learn them to master
            the game!
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {CELL_TYPES.map((cell) => (
              <div
                key={cell.type}
                className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 transition-all duration-200 hover:border-opacity-50"
                style={{ borderColor: `${cell.color}30` }}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{
                    backgroundColor: `${cell.color}15`,
                    boxShadow: `0 0 12px ${cell.color}33`,
                  }}
                >
                  {CELL_EMOJIS[cell.type]}
                </div>
                <div>
                  <h4
                    className="text-sm font-bold"
                    style={{ color: cell.color }}
                  >
                    {cell.name}
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {cell.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── NFT Rarity Chart ────────────────────────────── */}
        <section className="mb-16">
          <h2 className="mb-6 text-center text-2xl font-black">
            <span className="bg-gradient-to-r from-[var(--cyber-yellow)] to-[var(--hot-pink)] bg-clip-text text-transparent">
              NFT Rarities
            </span>{" "}
            <span className="inline-block animate-float">✨</span>
          </h2>
          <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
            Meme NFTs come in six rarity tiers. The rarer the NFT, the bigger
            the flex!
          </p>

          <div className="flex flex-col gap-2">
            {RARITIES.map((r) => {
              const color =
                RARITY_COLORS[r.name.toLowerCase()] ?? "#9ca3af";
              return (
                <div
                  key={r.name}
                  className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3"
                  style={{ borderColor: `${color}30` }}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <div className="flex-1">
                    <span
                      className="text-sm font-bold"
                      style={{ color }}
                    >
                      {r.name}
                    </span>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {r.description}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: `${color}22`,
                      color,
                    }}
                  >
                    {r.chance}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Level Progression ───────────────────────────── */}
        <section className="mb-16">
          <h2 className="mb-6 text-center text-2xl font-black">
            <span className="bg-gradient-to-r from-[var(--electric-purple)] to-[var(--neon-green)] bg-clip-text text-transparent">
              Level Progression
            </span>{" "}
            <span className="inline-block animate-float">📈</span>
          </h2>
          <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
            Earn XP with every roll. How far can you climb?
          </p>

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
            {LEVELS.map((level, i) => {
              const progress =
                i < LEVELS.length - 1
                  ? `${level.xp.toLocaleString()} → ${LEVELS[i + 1].xp.toLocaleString()} XP`
                  : `${level.xp.toLocaleString()}+ XP (MAX)`;
              const widthPercent = Math.min(
                ((level.xp || 1) / (LEVELS[LEVELS.length - 1].xp || 1)) * 100,
                100,
              );

              return (
                <div
                  key={level.level}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-[var(--muted)]/30",
                  )}
                >
                  <span className="w-8 text-center text-2xl">
                    {level.emoji}
                  </span>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        Lv.{level.level} {level.name}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {progress}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--neon-green)] to-[var(--electric-purple)] transition-all duration-500"
                        style={{ width: `${Math.max(widthPercent, 3)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-bold text-white">
            Ready to become the Meme Lord? 🏆
          </p>
          <Link
            href="/"
            className={cn(
              "rounded-xl px-10 py-3 text-lg font-bold transition-all duration-200",
              "border border-[var(--neon-green)] bg-[var(--neon-green)]/10 text-[var(--neon-green)]",
              "hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_25px_rgba(57,255,20,0.3)] active:scale-95",
            )}
          >
            Let&apos;s Play! 🎲🐸💎
          </Link>
        </div>
      </main>
    </div>
  );
}
