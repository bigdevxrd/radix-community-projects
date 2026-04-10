"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ROLL_COST } from "@/lib/constants";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

interface DiceRollerProps {
  value: number | null;
  rolling: boolean;
  onRoll: () => void;
  disabled: boolean;
  cost?: number;
}

export default function DiceRoller({
  value,
  rolling,
  onRoll,
  disabled,
  cost = ROLL_COST,
}: DiceRollerProps) {
  const [displayFace, setDisplayFace] = useState(0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!rolling) return;
    setLanded(false);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % 6;
      setDisplayFace(idx);
    }, 80);
    return () => clearInterval(interval);
  }, [rolling]);

  useEffect(() => {
    if (value !== null && !rolling) {
      setDisplayFace(value - 1);
      setLanded(true);
      const timer = setTimeout(() => setLanded(false), 600);
      return () => clearTimeout(timer);
    }
  }, [value, rolling]);

  const face = DICE_FACES[displayFace] ?? "⚀";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dice display */}
      <div
        className={cn(
          "relative flex h-[120px] w-[120px] items-center justify-center rounded-2xl border-2 transition-all duration-300",
          "bg-[var(--card-bg)]",
          rolling
            ? "animate-shake border-[var(--cyber-yellow)] shadow-[0_0_30px_var(--cyber-yellow),0_0_60px_rgba(255,230,0,0.3)]"
            : "border-[var(--neon-green)] shadow-[0_0_15px_rgba(57,255,20,0.3),0_0_30px_rgba(57,255,20,0.15)]",
          landed && "scale-110",
        )}
        style={{ perspective: "400px", transformStyle: "preserve-3d" }}
      >
        <span
          className={cn(
            "select-none text-7xl transition-transform duration-300",
            rolling && "opacity-80",
            landed && "animate-bounce",
          )}
          style={{
            filter: rolling
              ? "drop-shadow(0 0 12px var(--cyber-yellow))"
              : "drop-shadow(0 0 8px var(--neon-green))",
          }}
        >
          {face}
        </span>

        {/* Corner decorations */}
        {["top-1.5 left-1.5", "top-1.5 right-1.5", "bottom-1.5 left-1.5", "bottom-1.5 right-1.5"].map(
          (pos) => (
            <span
              key={pos}
              className={cn(
                "absolute h-1.5 w-1.5 rounded-full",
                rolling ? "bg-[var(--cyber-yellow)]" : "bg-[var(--neon-green)]",
                pos,
              )}
            />
          ),
        )}
      </div>

      {/* Roll button */}
      <button
        onClick={onRoll}
        disabled={disabled || rolling}
        className={cn(
          "relative overflow-hidden rounded-xl px-8 py-3 text-lg font-bold tracking-wide transition-all duration-200",
          disabled || rolling
            ? "cursor-not-allowed border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]"
            : "border border-[var(--neon-green)] bg-[var(--neon-green)]/10 text-[var(--neon-green)] hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] active:scale-95",
        )}
      >
        {rolling ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">🎲</span> Rolling...
          </span>
        ) : disabled ? (
          "Need more coins! 💸"
        ) : (
          <span className="flex items-center gap-2">
            ROLL 🎲
            <span className="rounded-md bg-[var(--neon-green)]/20 px-2 py-0.5 text-xs">
              {cost} 🪙
            </span>
          </span>
        )}

        {/* Shimmer effect on hover */}
        {!disabled && !rolling && (
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 hover:translate-x-full" />
        )}
      </button>
    </div>
  );
}
