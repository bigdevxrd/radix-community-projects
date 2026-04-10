"use client";

import { cn } from "@/lib/utils";
import { CELL_EMOJIS } from "@/lib/constants";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface Cell {
  type: string;
  state: "hidden" | "revealed" | "completed";
}

interface GameGridProps {
  grid: Cell[][];
  onCellClick: (row: number, col: number) => void;
  wildMode: boolean;
  lastHit: { row: number; col: number } | null;
  animatingCell: { row: number; col: number } | null;
}

/* ── Glow map per cell type ────────────────────────────────────────── */

const GLOW: Record<string, { border: string; shadow: string; bg: string }> = {
  normal: {
    border: "border-cyan-400",
    shadow: "shadow-[0_0_12px_rgba(34,211,238,0.5)]",
    bg: "bg-cyan-500/10",
  },
  double_score: {
    border: "border-orange-400",
    shadow: "shadow-[0_0_12px_rgba(251,146,60,0.5)]",
    bg: "bg-orange-500/10",
  },
  extra_turn: {
    border: "border-emerald-400",
    shadow: "shadow-[0_0_12px_rgba(52,211,153,0.5)]",
    bg: "bg-emerald-500/10",
  },
  wild: {
    border: "border-purple-400",
    shadow: "shadow-[0_0_12px_rgba(192,132,252,0.5)]",
    bg: "bg-purple-500/10",
  },
  rug_pull: {
    border: "border-red-500",
    shadow: "shadow-[0_0_12px_rgba(239,68,68,0.5)]",
    bg: "bg-red-500/10",
  },
  pepe_bonus: {
    border: "border-green-400",
    shadow: "shadow-[0_0_12px_rgba(74,222,128,0.5)]",
    bg: "bg-green-500/10",
  },
  diamond: {
    border: "border-white",
    shadow: "shadow-[0_0_16px_rgba(255,255,255,0.5)]",
    bg: "bg-white/10",
  },
  moon: {
    border: "border-yellow-300",
    shadow: "shadow-[0_0_12px_rgba(253,224,71,0.5)]",
    bg: "bg-yellow-500/10",
  },
};

const DEFAULT_GLOW = GLOW.normal;

/* ── Component ─────────────────────────────────────────────────────── */

export default function GameGrid({
  grid,
  onCellClick,
  wildMode,
  lastHit,
  animatingCell,
}: GameGridProps) {
  if (!grid || grid.length === 0) return null;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[540px] rounded-xl border p-1.5",
        "border-[var(--neon-green)]/30",
        "shadow-[0_0_20px_rgba(57,255,20,0.1)]",
        "bg-[var(--grid-bg)]",
      )}
    >
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${grid[0].length}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isLastHit = lastHit?.row === r && lastHit?.col === c;
            const isAnimating =
              animatingCell?.row === r && animatingCell?.col === c;
            const glow = GLOW[cell.type] ?? DEFAULT_GLOW;
            const emoji = CELL_EMOJIS[cell.type] ?? "⬜";
            const isWildTarget =
              wildMode && cell.state !== "completed";

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => onCellClick(r, c)}
                disabled={!isWildTarget}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-lg text-base transition-all duration-300 sm:text-xl md:rounded-xl md:text-2xl",

                  /* Hidden cell */
                  cell.state === "hidden" && [
                    "border border-[var(--border)] bg-[var(--card-bg)]",
                    "animate-pulse-neon cursor-default text-[var(--muted-foreground)]",
                  ],

                  /* Revealed cell */
                  cell.state === "revealed" && [
                    "border",
                    glow.border,
                    glow.bg,
                    glow.shadow,
                  ],

                  /* Completed cell */
                  cell.state === "completed" && [
                    "border-2",
                    glow.border,
                    glow.bg,
                    glow.shadow,
                    "brightness-125 saturate-150",
                  ],

                  /* Last hit flash */
                  isLastHit && "animate-pulse ring-2 ring-[var(--cyber-yellow)]",

                  /* Animating cell */
                  isAnimating && "animate-bounce",

                  /* Wild mode highlight */
                  isWildTarget && [
                    "cursor-pointer ring-2 ring-purple-400/60 hover:ring-purple-400 hover:scale-105",
                  ],
                )}
              >
                {cell.state === "hidden" ? (
                  <span className="text-lg opacity-50 sm:text-xl md:text-2xl">
                    ?
                  </span>
                ) : (
                  <>
                    <span className="select-none">{emoji}</span>
                    {cell.state === "completed" && (
                      <span className="absolute -right-0.5 -top-0.5 text-[10px] sm:text-xs">
                        ✅
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
