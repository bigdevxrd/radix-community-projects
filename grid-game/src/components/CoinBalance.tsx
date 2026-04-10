"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

interface CoinBalanceProps {
  coins: number;
  onBuy: () => void;
}

export default function CoinBalance({ coins, onBuy }: CoinBalanceProps) {
  const [displayCoins, setDisplayCoins] = useState(coins);
  const prevCoins = useRef(coins);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const prev = prevCoins.current;
    prevCoins.current = coins;

    if (prev === coins) {
      setDisplayCoins(coins);
      return;
    }

    setFlash(coins > prev ? "up" : "down");

    const diff = coins - prev;
    const steps = Math.min(Math.abs(diff), 20);
    const increment = diff / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayCoins(coins);
        clearInterval(interval);
        setTimeout(() => setFlash(null), 400);
      } else {
        setDisplayCoins(Math.round(prev + increment * step));
      }
    }, 40);

    return () => clearInterval(interval);
  }, [coins]);

  return (
    <div className="flex items-center gap-3">
      {/* Coin icon + balance */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block text-2xl"
          style={{
            animation: "spin 3s linear infinite",
            filter: "drop-shadow(0 0 6px #ffe600)",
          }}
        >
          🪙
        </span>
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "text-xl font-extrabold tabular-nums tracking-tight transition-colors duration-300",
              flash === "up" && "text-[var(--neon-green)]",
              flash === "down" && "text-red-400",
              !flash && "neon-text",
            )}
          >
            {formatNumber(displayCoins)}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
            MEME
          </span>
        </div>
      </div>

      {/* Buy button */}
      <button
        onClick={onBuy}
        className={cn(
          "rounded-lg border border-[var(--cyber-yellow)]/50 bg-[var(--cyber-yellow)]/10 px-3 py-1.5 text-xs font-bold text-[var(--cyber-yellow)] transition-all hover:bg-[var(--cyber-yellow)]/20 hover:shadow-[0_0_12px_rgba(255,230,0,0.3)] active:scale-95",
        )}
      >
        🛒 Buy
      </button>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotateY(0deg);
          }
          to {
            transform: rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
}
