"use client";

import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: number;
  xp: number;
  levelName: string;
  emoji: string;
  nextLevelXp: number;
}

export default function LevelBadge({
  level,
  xp,
  levelName,
  emoji,
  nextLevelXp,
}: LevelBadgeProps) {
  const progress = nextLevelXp > 0 ? Math.min(xp / nextLevelXp, 1) : 1;
  const circumference = 2 * Math.PI * 40;
  const strokeOffset = circumference * (1 - progress);

  // Glow intensity scales with level
  const glowIntensity = Math.min(level * 3, 25);
  const glowColor =
    level >= 8
      ? "#ffe600"
      : level >= 5
        ? "#bf00ff"
        : level >= 3
          ? "#39ff14"
          : "#3b82f6";

  return (
    <div className="flex items-center gap-3">
      {/* Circular progress ring */}
      <div
        className="relative flex h-14 w-14 shrink-0 items-center justify-center"
        style={{
          filter: `drop-shadow(0 0 ${glowIntensity}px ${glowColor})`,
        }}
      >
        <svg
          className="-rotate-90"
          width="56"
          height="56"
          viewBox="0 0 96 96"
        >
          {/* Background ring */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="var(--border)"
            strokeWidth="5"
          />
          {/* Progress ring */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={glowColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center emoji */}
        <span className="absolute text-xl">{emoji}</span>
      </div>

      {/* Text info */}
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-sm font-bold",
            level >= 8
              ? "text-[var(--cyber-yellow)]"
              : level >= 5
                ? "text-purple-400"
                : "text-[var(--neon-green)]",
          )}
        >
          Lv.{level} {levelName}
        </span>
        <span className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
          {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
        </span>
      </div>
    </div>
  );
}
