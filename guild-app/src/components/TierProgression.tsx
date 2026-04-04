"use client";
import { XP_THRESHOLDS, TIER_COLORS } from "@/lib/constants";

export function TierProgression({ currentLevel }: { currentLevel?: string }) {
  const tiers = Object.entries(XP_THRESHOLDS);

  return (
    <div className="flex gap-1 items-end">
      {tiers.map(([tier, xp], i) => {
        const isActive = tier === currentLevel;
        const isPast = currentLevel && Object.keys(XP_THRESHOLDS).indexOf(currentLevel) >= i;
        const color = TIER_COLORS[tier] || "var(--muted)";

        return (
          <div key={tier} className="flex-1 text-center">
            <div
              className="h-1 rounded-sm mb-1.5"
              style={{ background: isPast ? color : "hsl(var(--muted))" }}
            />
            <div
              className={`text-[10px] uppercase ${isActive ? "font-bold" : "font-normal"}`}
              style={{ color: isActive ? color : undefined }}
            >
              <span className={isActive ? "" : "text-muted-foreground"}>{tier}</span>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">{xp.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}
