"use client";

import { cn } from "@/lib/utils";
import { useWallet } from "@/hooks/useWallet";
import { useGame } from "@/hooks/useGame";
import { LEVELS } from "@/lib/constants";
import LevelBadge from "@/components/LevelBadge";
import CoinBalance from "@/components/CoinBalance";

interface GameHeaderProps {
  onBuyCoins: () => void;
}

export default function GameHeader({ onBuyCoins }: GameHeaderProps) {
  const { connected } = useWallet();
  const { player } = useGame();

  const levelInfo =
    LEVELS.find((l) => l.level === player?.level) ?? LEVELS[0];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3 backdrop-blur-md",
        "bg-[var(--grid-bg)]/80",
      )}
    >
      {/* Logo */}
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="neon-text text-xl font-black tracking-wider sm:text-2xl">
          <span className="bg-gradient-to-r from-[var(--neon-green)] via-[var(--electric-purple)] to-[var(--hot-pink)] bg-clip-text text-transparent">
            MEME
          </span>{" "}
          <span className="text-white">GRID</span>
        </h1>
        <span className="animate-float text-lg">🎮</span>
      </div>

      {/* Right side: wallet info or connect prompt */}
      {connected && player ? (
        <div className="flex items-center gap-4 overflow-x-auto">
          <LevelBadge
            level={player.level}
            xp={player.xp}
            levelName={levelInfo.name}
            emoji={levelInfo.emoji}
            nextLevelXp={player.next_level_xp}
          />
          <div className="hidden h-6 w-px bg-[var(--border)] sm:block" />
          <CoinBalance coins={player.meme_coins} onBuy={onBuyCoins} />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Radix connect button slot */}
          <radix-connect-button />
          {!connected && (
            <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">
              Connect Wallet to Play 🔗
            </span>
          )}
        </div>
      )}

      {/* Radix connect button (always visible when connected too) */}
      {connected && (
        <div className="shrink-0">
          <radix-connect-button />
        </div>
      )}
    </header>
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
