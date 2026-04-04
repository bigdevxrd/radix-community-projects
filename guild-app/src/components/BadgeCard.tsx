"use client";
import { XP_THRESHOLDS } from "@/lib/constants";
import type { BadgeInfo } from "@/lib/types";

const TIER_BORDER: Record<string, string> = {
  member: "border-l-tier-member",
  contributor: "border-l-tier-contributor",
  builder: "border-l-tier-builder",
  steward: "border-l-tier-steward",
  elder: "border-l-tier-elder",
};

const TIER_BG: Record<string, string> = {
  member: "bg-tier-member",
  contributor: "bg-tier-contributor",
  builder: "bg-tier-builder",
  steward: "bg-tier-steward",
  elder: "bg-tier-elder",
};

function xpProgress(xp: number, level: string) {
  const levels = Object.entries(XP_THRESHOLDS);
  const idx = levels.findIndex(([l]) => l === level);
  const current = levels[idx]?.[1] ?? 0;
  const next = levels[idx + 1]?.[1] ?? current + 1;
  const nextLevel = levels[idx + 1]?.[0] ?? level;
  const range = next - current;
  const percent =
    range > 0 ? Math.min(100, Math.round(((xp - current) / range) * 100)) : 100;
  return { percent, next, nextLevel };
}

export function BadgeCard({ badge }: { badge: BadgeInfo }) {
  const { percent, next, nextLevel } = xpProgress(badge.xp, badge.level);
  const isMaxLevel = badge.level === "elder";
  const borderClass = TIER_BORDER[badge.tier] || "border-l-text-muted";
  const bgClass = TIER_BG[badge.tier] || "bg-text-muted";

  return (
    <div
      className={`bg-surface border border-border ${borderClass} border-l-3 rounded-lg p-5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-mono font-bold text-[15px]">
            {badge.issued_to}
          </span>
          <span className="ml-2 text-[11px] text-text-muted font-mono">
            {badge.schema_name}
          </span>
        </div>
        <span
          className={`${bgClass} text-black px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase`}
        >
          {badge.tier}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Level", value: badge.level },
          { label: "XP", value: badge.xp.toLocaleString() },
          { label: "Status", value: badge.status },
          { label: "ID", value: badge.id.replace(/[<>]/g, "") },
        ].map((s) => (
          <div key={s.label} className="bg-surface-2 rounded-md px-3 py-2">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              {s.label}
            </div>
            <div className="text-[13px] font-mono font-semibold mt-0.5 truncate">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* XP Progress Bar */}
      <div>
        <div className="flex justify-between text-[11px] text-text-muted mb-1">
          <span>{badge.xp} XP</span>
          <span>
            {isMaxLevel
              ? "Max Level"
              : `${next.toLocaleString()} XP \u2192 ${nextLevel}`}
          </span>
        </div>
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
