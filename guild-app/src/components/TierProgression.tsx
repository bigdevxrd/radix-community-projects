"use client";
import { XP_THRESHOLDS } from "@/lib/constants";

const TIER_VAR: Record<string, string> = {
  member: "--g-tier-member",
  contributor: "--g-tier-contributor",
  builder: "--g-tier-builder",
  steward: "--g-tier-steward",
  elder: "--g-tier-elder",
};

export function TierProgression({ currentLevel }: { currentLevel?: string }) {
  const tiers = Object.entries(XP_THRESHOLDS);
  return (
    <div className="flex gap-1 items-end">
      {tiers.map(([tier, xp], i) => {
        const isActive = tier === currentLevel;
        const isPast = currentLevel && Object.keys(XP_THRESHOLDS).indexOf(currentLevel) >= i;
        const cssVar = TIER_VAR[tier] || "--g-text-3";
        return (
          <div key={tier} className="flex-1 text-center">
            <div className="h-1 rounded-sm mb-1.5" style={{ background: isPast ? `var(${cssVar})` : "var(--g-surface-2)" }} />
            <div className={`text-[10px] uppercase ${isActive ? "font-bold" : "font-normal"}`}
              style={{ color: isActive ? `var(${cssVar})` : "var(--g-text-3)" }}>
              {tier}
            </div>
            <div className="text-[9px] g-text-3 font-mono">{xp.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}
