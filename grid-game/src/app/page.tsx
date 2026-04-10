"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ParticleBackground from "@/components/ParticleBackground";
import GameHeader from "@/components/GameHeader";
import Toast from "@/components/Toast";
import BuyCoinsModal from "@/components/BuyCoinsModal";
import GameGrid from "@/components/GameGrid";
import type { Cell } from "@/components/GameGrid";
import DiceRoller from "@/components/DiceRoller";
import LevelBadge from "@/components/LevelBadge";
import NFTCard from "@/components/NFTCard";

import { useWallet } from "@/hooks/useWallet";
import { useGame } from "@/hooks/useGame";
import { cn } from "@/lib/utils";
import {
  LEVELS,
  CELL_EMOJIS,
  ROLL_COST,
  BOARD_COST,
} from "@/lib/constants";

/* ── Scrolling meme phrases ──────────────────────────────────────── */

const MEME_PHRASES = [
  "gm", "wagmi", "wen moon", "ngmi", "probably nothing", "ser",
  "fren", "based", "touch grass", "lfg", "diamond hands", "wen lambo",
  "to the moon", "degen life", "ape in", "few understand",
];

/* ── Feature cards data ──────────────────────────────────────────── */

const FEATURES = [
  {
    emoji: "🎲",
    title: "Roll & Win",
    description: "Buy MEME coins, roll the dice, complete the grid",
  },
  {
    emoji: "🐸",
    title: "Collect NFTs",
    description: "Earn legendary meme NFTs from Wojak to Diamond Pepe",
  },
  {
    emoji: "🏆",
    title: "Climb the Ranks",
    description: "Level up from Normie to Meme Lord",
  },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function parseGrid(raw: string[][]): Cell[][] {
  return raw.map((row) =>
    row.map((v) => {
      if (typeof v === "object" && v !== null) return v as unknown as Cell;
      // If cells are encoded as "type:state" strings
      const [type, state] = String(v).split(":");
      return {
        type: type || "normal",
        state: (state as Cell["state"]) || "hidden",
      };
    }),
  );
}

/* ── Confetti visual ─────────────────────────────────────────────── */

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        color: ["#39ff14", "#bf00ff", "#ff006e", "#ffe600", "#3b82f6"][
          Math.floor(Math.random() * 5)
        ],
        size: Math.random() * 8 + 4,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti-fall absolute top-0 rounded-sm"
          style={{
            left: p.left,
            animationDelay: p.delay,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function GamePage() {
  const { connected } = useWallet();
  const {
    player,
    board,
    nfts,
    loading,
    rolling,
    lastRoll,
    error,
    toast,
    buyCoins,
    newBoard,
    rollDice,
    useWild,
  } = useGame();

  const [buyOpen, setBuyOpen] = useState(false);
  const [wildMode, setWildMode] = useState(false);
  const [lastHit, setLastHit] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [animatingCell, setAnimatingCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  /* ── Toast state ─────────────────────────────────────────── */
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<
    "success" | "error" | "info" | "reward"
  >("info");

  useEffect(() => {
    if (toast) {
      setToastMsg(toast);
      setToastType(toast.includes("NFT") ? "reward" : "success");
      setToastVisible(true);
    }
  }, [toast]);

  useEffect(() => {
    if (error) {
      setToastMsg(error);
      setToastType("error");
      setToastVisible(true);
    }
  }, [error]);

  /* ── Last roll effect ──────────────────────────────────── */
  useEffect(() => {
    if (!lastRoll?.matched) return;

    // Find the cell that was just matched
    if (lastRoll.board?.grid) {
      const grid = parseGrid(lastRoll.board.grid);
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c].state === "completed") {
            // Check if this is a newly completed cell
            setLastHit({ row: r, col: c });
            setAnimatingCell({ row: r, col: c });
            break;
          }
        }
      }
    }
    const timer = setTimeout(() => {
      setLastHit(null);
      setAnimatingCell(null);
    }, 1200);
    return () => clearTimeout(timer);
  }, [lastRoll]);

  /* ── Wild card handler ─────────────────────────────────── */
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!wildMode) return;
      useWild(row, col);
      setWildMode(false);
    },
    [wildMode, useWild],
  );

  /* ── Grid parsing ──────────────────────────────────────── */
  const parsedGrid = useMemo(
    () => (board?.grid ? parseGrid(board.grid) : null),
    [board?.grid],
  );

  /* ── Level info ────────────────────────────────────────── */
  const levelInfo =
    LEVELS.find((l) => l.level === player?.level) ?? LEVELS[0];

  const boardCompleted = board?.status === "completed";
  const canRoll =
    !!board &&
    !boardCompleted &&
    !rolling &&
    (player?.meme_coins ?? 0) >= ROLL_COST;

  /* ── Render: Not connected (Landing) ───────────────────── */
  if (!connected) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[var(--grid-bg)]">
        <ParticleBackground />
        <GameHeader onBuyCoins={() => setBuyOpen(true)} />

        <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-12 px-4 py-20">
          {/* Hero */}
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-6xl font-black tracking-tight sm:text-8xl">
              <span className="animate-pulse-neon bg-gradient-to-r from-[var(--neon-green)] via-[var(--electric-purple)] to-[var(--hot-pink)] bg-clip-text text-transparent">
                MEME
              </span>
              <br />
              <span className="bg-gradient-to-r from-[var(--cyber-yellow)] via-[var(--hot-pink)] to-[var(--electric-purple)] bg-clip-text text-transparent">
                GRID
              </span>
            </h1>

            <p className="max-w-xl text-lg text-[var(--muted-foreground)] sm:text-xl">
              Roll the dice. Collect meme NFTs. Become the Meme Lord.{" "}
              <span className="inline-block animate-float">🎲💎🐸</span>
            </p>

            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="neon-border rounded-2xl p-1">
                <radix-connect-button />
              </div>
              <span className="animate-pulse text-sm text-[var(--neon-green)]">
                ⬆ Connect Wallet to Play ⬆
              </span>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={cn(
                  "group flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] p-6 text-center transition-all duration-300",
                  "bg-[var(--card-bg)] hover:border-[var(--neon-green)]/40 hover:shadow-[0_0_20px_rgba(57,255,20,0.15)]",
                )}
              >
                <span className="text-4xl transition-transform duration-300 group-hover:scale-125">
                  {f.emoji}
                </span>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          {/* Scrolling meme text */}
          <div className="w-full overflow-hidden opacity-40">
            <div className="flex animate-[scroll_20s_linear_infinite] whitespace-nowrap">
              {[...MEME_PHRASES, ...MEME_PHRASES].map((phrase, i) => (
                <span
                  key={i}
                  className="mx-4 text-sm font-medium text-[var(--neon-green)]"
                >
                  {phrase} ·
                </span>
              ))}
            </div>
          </div>
        </main>

        <style jsx>{`
          @keyframes scroll {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }
        `}</style>
      </div>
    );
  }

  /* ── Render: Connected but loading ─────────────────────── */
  if (loading && !player) {
    return (
      <div className="relative min-h-screen bg-[var(--grid-bg)]">
        <ParticleBackground />
        <GameHeader onBuyCoins={() => setBuyOpen(true)} />
        <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <span className="animate-bounce text-5xl">🎲</span>
          <p className="animate-pulse text-lg text-[var(--neon-green)]">
            Initializing your degen journey...
          </p>
        </div>
      </div>
    );
  }

  /* ── Render: Connected and ready ───────────────────────── */
  return (
    <div className="relative min-h-screen bg-[var(--grid-bg)]">
      <ParticleBackground />
      <GameHeader onBuyCoins={() => setBuyOpen(true)} />

      <Toast
        message={toastMsg}
        type={toastType}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
      <BuyCoinsModal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        onBuy={(amount) => {
          buyCoins(amount);
          setBuyOpen(false);
        }}
      />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ──── LEFT: Main Game Area ──────────────────── */}
          <div className="flex-1">
            {!board || !parsedGrid ? (
              /* No active board */
              <div className="flex flex-col items-center gap-6">
                <div
                  className={cn(
                    "w-full max-w-lg rounded-2xl border border-[var(--border)] p-8 text-center",
                    "bg-[var(--card-bg)] shadow-[0_0_30px_rgba(57,255,20,0.08)]",
                  )}
                >
                  <span className="mb-4 inline-block text-5xl">🎮</span>
                  <h2 className="mb-2 text-2xl font-black text-white">
                    Ready to play?
                  </h2>
                  <p className="mb-6 text-sm text-[var(--muted-foreground)]">
                    Start a new 8×8 meme grid and roll your way to glory!
                  </p>
                  <button
                    onClick={newBoard}
                    disabled={loading || (player?.meme_coins ?? 0) < BOARD_COST}
                    className={cn(
                      "rounded-xl px-8 py-3 text-lg font-bold transition-all duration-200",
                      (player?.meme_coins ?? 0) >= BOARD_COST
                        ? "border border-[var(--neon-green)] bg-[var(--neon-green)]/10 text-[var(--neon-green)] hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] active:scale-95"
                        : "cursor-not-allowed border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Creating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Start New Board 🎲
                        <span className="rounded-md bg-[var(--neon-green)]/20 px-2 py-0.5 text-xs">
                          {BOARD_COST} 🪙
                        </span>
                      </span>
                    )}
                  </button>
                  {(player?.meme_coins ?? 0) < BOARD_COST && (
                    <p className="mt-3 text-xs text-red-400">
                      You need {BOARD_COST} MEME coins.{" "}
                      <button
                        onClick={() => setBuyOpen(true)}
                        className="underline hover:text-[var(--cyber-yellow)]"
                      >
                        Buy some! 🛒
                      </button>
                    </p>
                  )}
                </div>

                {/* Player stats summary */}
                {player && (
                  <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Total Rolls", value: player.total_rolls, emoji: "🎲" },
                      { label: "Wins", value: player.total_wins, emoji: "🏅" },
                      { label: "Jackpots", value: player.jackpots, emoji: "💰" },
                      { label: "NFTs", value: player.nfts_earned, emoji: "🖼️" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-3"
                      >
                        <span className="text-xl">{s.emoji}</span>
                        <span className="text-lg font-bold text-white">
                          {s.value}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Active board */
              <div className="flex flex-col items-center gap-5">
                {/* Board completed celebration */}
                {boardCompleted && (
                  <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--cyber-yellow)]/50 bg-[var(--card-bg)] p-6 text-center shadow-[0_0_40px_rgba(255,230,0,0.2)]">
                    <Confetti />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <span className="text-5xl">🎉🏆🎉</span>
                      <h2 className="text-2xl font-black text-[var(--cyber-yellow)]">
                        Board Complete!
                      </h2>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Final Score:{" "}
                        <span className="font-bold text-white">
                          {board.score}
                        </span>{" "}
                        in{" "}
                        <span className="font-bold text-white">
                          {board.rolls_used}
                        </span>{" "}
                        rolls
                      </p>
                      {lastRoll?.nft_earned && (
                        <div className="mt-2 flex flex-col items-center gap-1">
                          <span className="text-3xl">
                            {lastRoll.nft_earned.image_emoji}
                          </span>
                          <p className="text-sm font-bold text-[var(--cyber-yellow)]">
                            You earned: {lastRoll.nft_earned.name}!
                          </p>
                        </div>
                      )}
                      <button
                        onClick={newBoard}
                        disabled={
                          loading || (player?.meme_coins ?? 0) < BOARD_COST
                        }
                        className="mt-3 rounded-xl border border-[var(--neon-green)] bg-[var(--neon-green)]/10 px-6 py-2.5 font-bold text-[var(--neon-green)] transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] active:scale-95"
                      >
                        Start New Board 🎲
                        <span className="ml-2 rounded-md bg-[var(--neon-green)]/20 px-2 py-0.5 text-xs">
                          {BOARD_COST} 🪙
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Score bar */}
                <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "Score", value: board.score, emoji: "⭐", color: "text-[var(--cyber-yellow)]" },
                    { label: "Rolls Used", value: board.rolls_used, emoji: "🎲", color: "text-[var(--neon-green)]" },
                    { label: "Wild Cards", value: board.wild_cards, emoji: "🃏", color: "text-purple-400" },
                    { label: "Extra Turns", value: board.extra_turns, emoji: "🎁", color: "text-emerald-400" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2"
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <div className="flex flex-col leading-tight">
                        <span className={cn("text-lg font-bold", s.color)}>
                          {s.value}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {s.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* The grid */}
                <GameGrid
                  grid={parsedGrid}
                  onCellClick={handleCellClick}
                  wildMode={wildMode}
                  lastHit={lastHit}
                  animatingCell={animatingCell}
                />

                {/* Dice roller */}
                {!boardCompleted && (
                  <DiceRoller
                    value={lastRoll?.dice?.[0] ?? null}
                    rolling={rolling}
                    onRoll={rollDice}
                    disabled={!canRoll}
                    cost={ROLL_COST}
                  />
                )}

                {/* Wild card button */}
                {!boardCompleted && board.wild_cards > 0 && (
                  <button
                    onClick={() => setWildMode(!wildMode)}
                    className={cn(
                      "rounded-xl px-6 py-2.5 font-bold transition-all duration-200",
                      wildMode
                        ? "border-2 border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_20px_rgba(192,132,252,0.4)]"
                        : "border border-purple-400/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(192,132,252,0.3)]",
                    )}
                  >
                    {wildMode
                      ? "🃏 Click a cell to use Wild Card — Cancel?"
                      : `🃏 Use Wild Card (${board.wild_cards} left)`}
                  </button>
                )}

                {/* Roll result display */}
                {lastRoll && !boardCompleted && (
                  <div
                    className={cn(
                      "animate-slide-up w-full rounded-xl border p-4 text-center",
                      lastRoll.matched
                        ? "border-[var(--neon-green)]/40 bg-[var(--neon-green)]/5"
                        : "border-[var(--border)] bg-[var(--card-bg)]",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <span className="text-3xl">
                        {lastRoll.matched ? "🎯" : "😅"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {lastRoll.message || (lastRoll.matched ? "Hit!" : "Miss!")}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
                          {lastRoll.points_earned > 0 && (
                            <span className="rounded-md bg-[var(--neon-green)]/20 px-2 py-0.5 font-bold text-[var(--neon-green)]">
                              +{lastRoll.points_earned} pts
                            </span>
                          )}
                          {lastRoll.xp_earned > 0 && (
                            <span className="rounded-md bg-purple-500/20 px-2 py-0.5 font-bold text-purple-400">
                              +{lastRoll.xp_earned} XP
                            </span>
                          )}
                          {lastRoll.cell_type && lastRoll.cell_type !== "normal" && (
                            <span className="rounded-md bg-[var(--cyber-yellow)]/20 px-2 py-0.5 font-bold text-[var(--cyber-yellow)]">
                              {CELL_EMOJIS[lastRoll.cell_type] ?? "⬜"}{" "}
                              {lastRoll.cell_type.replace("_", " ")}
                            </span>
                          )}
                          {lastRoll.extra_turn && (
                            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400">
                              🎁 Extra Turn!
                            </span>
                          )}
                          {lastRoll.nft_earned && (
                            <span className="rounded-md bg-[var(--cyber-yellow)]/20 px-2 py-0.5 font-bold text-[var(--cyber-yellow)]">
                              🏆 NFT: {lastRoll.nft_earned.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ──── RIGHT: Sidebar ────────────────────────── */}
          {player && (
            <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
              {/* Player Info */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Player Info
                </h3>
                <div className="flex flex-col items-center gap-3">
                  <LevelBadge
                    level={player.level}
                    xp={player.xp}
                    levelName={levelInfo.name}
                    emoji={levelInfo.emoji}
                    nextLevelXp={player.next_level_xp}
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-lg">🪙</span>
                    <span className="font-bold text-[var(--cyber-yellow)]">
                      {player.meme_coins.toLocaleString()}
                    </span>
                    <span className="text-[var(--muted-foreground)]">MEME</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--neon-green)] to-[var(--electric-purple)] transition-all duration-700"
                      style={{
                        width: `${player.next_level_xp > 0 ? Math.min((player.xp / player.next_level_xp) * 100, 100) : 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {player.xp.toLocaleString()} / {player.next_level_xp.toLocaleString()} XP to next level
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Rolls", value: player.total_rolls, emoji: "🎲" },
                    { label: "Wins", value: player.total_wins, emoji: "🏅" },
                    { label: "Jackpots", value: player.jackpots, emoji: "💰" },
                    { label: "NFTs", value: player.nfts_earned, emoji: "🖼️" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-2 rounded-lg bg-[var(--muted)] px-3 py-2"
                    >
                      <span>{s.emoji}</span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-bold text-white">
                          {s.value}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {s.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent NFTs */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Recent NFTs
                  </h3>
                  {nfts.length > 0 && (
                    <Link
                      href="/nfts"
                      className="text-xs font-semibold text-[var(--neon-green)] transition-colors hover:text-white"
                    >
                      View All →
                    </Link>
                  )}
                </div>
                {nfts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
                    No NFTs yet — keep rolling! 🎲
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {nfts.slice(0, 3).map((nft, i) => (
                      <NFTCard key={`${nft.name}-${i}`} nft={nft} />
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Radix connect button declaration (for TS) */}
      <style jsx>{``}</style>
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
