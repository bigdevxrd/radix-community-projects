"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { COIN_RATE } from "@/lib/constants";

interface BuyCoinsModalProps {
  open: boolean;
  onClose: () => void;
  onBuy: (amount: number) => void;
}

const PRESETS = [
  { xrd: 1, coins: 100, emoji: "🪙" },
  { xrd: 5, coins: 500, emoji: "💰" },
  { xrd: 10, coins: 1000, emoji: "🤑" },
  { xrd: 50, coins: 5000, emoji: "🏦" },
];

export default function BuyCoinsModal({
  open,
  onClose,
  onBuy,
}: BuyCoinsModalProps) {
  const [customXrd, setCustomXrd] = useState("");
  const customCoins = customXrd ? Math.floor(Number(customXrd) * COIN_RATE) : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className={cn(
          "animate-slide-up relative z-10 w-full max-w-md rounded-2xl border border-[var(--neon-green)]/30 p-6",
          "bg-[var(--card-bg)]",
          "shadow-[0_0_40px_rgba(57,255,20,0.15)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--muted-foreground)] transition-colors hover:text-white"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="mb-1 text-center text-2xl font-black">
          <span className="neon-text">Buy MEME Coins</span> 🪙
        </h2>
        <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
          1 XRD = {COIN_RATE} MEME 🪙
        </p>

        {/* Preset options */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {PRESETS.map(({ xrd, coins, emoji }) => (
            <button
              key={xrd}
              onClick={() => onBuy(xrd)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] p-4 transition-all",
                "bg-[var(--muted)] hover:border-[var(--neon-green)]/50 hover:bg-[var(--neon-green)]/5 hover:shadow-[0_0_15px_rgba(57,255,20,0.2)]",
                "active:scale-95",
              )}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-lg font-bold text-white">
                {coins.toLocaleString()}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {xrd} XRD
              </span>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4 flex flex-col gap-2">
          <label className="text-sm font-semibold text-[var(--muted-foreground)]">
            Custom Amount
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={customXrd}
                onChange={(e) => setCustomXrd(e.target.value)}
                placeholder="XRD amount"
                className={cn(
                  "w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-white placeholder-[var(--muted-foreground)] outline-none transition-all",
                  "focus:border-[var(--neon-green)]/50 focus:shadow-[0_0_10px_rgba(57,255,20,0.15)]",
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">
                XRD
              </span>
            </div>
            <span className="text-[var(--muted-foreground)]">→</span>
            <span className="min-w-[80px] text-center text-sm font-bold text-[var(--neon-green)]">
              {customCoins > 0 ? customCoins.toLocaleString() : "—"} 🪙
            </span>
          </div>
          {customCoins > 0 && (
            <button
              onClick={() => onBuy(Number(customXrd))}
              className={cn(
                "mt-1 rounded-xl border border-[var(--neon-green)] bg-[var(--neon-green)]/10 py-2.5 font-bold text-[var(--neon-green)] transition-all",
                "hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] active:scale-[0.98]",
              )}
            >
              Buy {customCoins.toLocaleString()} MEME 🪙
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[11px] leading-relaxed text-[var(--muted-foreground)]">
          💡 Coins are stored in-game. On-chain token integration coming soon!
        </p>
      </div>
    </div>
  );
}
