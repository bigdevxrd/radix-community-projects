"use client";
import { XP_THRESHOLDS } from "@/lib/constants";

const TIER_TW_COLORS: Record<string, string> = {
  member: "bg-tier-member",
  contributor: "bg-tier-contributor",
  builder: "bg-tier-builder",
  steward: "bg-tier-steward",
  elder: "bg-tier-elder",
};

const TIER_TEXT_COLORS: Record<string, string> = {
  member: "text-tier-member",
  contributor: "text-tier-contributor",
  builder: "text-tier-builder",
  steward: "text-tier-steward",
  elder: "text-tier-elder",
};

export function TierProgression({ currentLevel }: { currentLevel?: string }) {
  const tiers = Object.entries(XP_THRESHOLDS);

  return (
    <div className="flex gap-1 items-end">
      {tiers.map(([tier, xp], i) => {
        const isActive = tier === currentLevel;
        const isPast =
          currentLevel &&
          Object.keys(XP_THRESHOLDS).indexOf(currentLevel) >= i;
        const barColor = isPast
          ? TIER_TW_COLORS[tier] || "bg-text-muted"
          : "bg-surface-2";
        const textColor = isActive
          ? TIER_TEXT_COLORS[tier] || "text-text-muted"
          : "text-text-muted";

        return (
          <div key={tier} className="flex-1 text-center">
            <div className={`h-1 rounded-sm mb-1.5 ${barColor}`} />
            <div
              className={`text-[10px] uppercase ${textColor} ${
                isActive ? "font-bold" : "font-normal"
              }`}
            >
              {tier}
            </div>
            <div className="text-[9px] text-text-muted font-mono">
              {xp.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
