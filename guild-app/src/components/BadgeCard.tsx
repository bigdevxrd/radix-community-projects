"use client";
import { XP_THRESHOLDS } from "@/lib/constants";
import type { BadgeInfo } from "@/lib/types";

const TIER_PILL: Record<string, string> = {
  member: "g-pill-muted",
  contributor: "g-pill-blue",
  builder: "g-pill-purple",
  steward: "g-pill-yellow",
  elder: "g-pill-green",
};

function xpProgress(xp: number, level: string) {
  const levels = Object.entries(XP_THRESHOLDS);
  const idx = levels.findIndex(([l]) => l === level);
  const current = levels[idx]?.[1] ?? 0;
  const next = levels[idx + 1]?.[1] ?? current + 1;
  const nextLevel = levels[idx + 1]?.[0] ?? level;
  const range = next - current;
  const percent = range > 0 ? Math.min(100, Math.round(((xp - current) / range) * 100)) : 100;
  return { percent, next, nextLevel };
}

export function BadgeCard({ badge }: { badge: BadgeInfo }) {
  const { percent, next, nextLevel } = xpProgress(badge.xp, badge.level);
  const isMax = badge.level === "elder";

  return (
    <div className="g-card p-5" style={{ borderLeft: `3px solid var(--g-tier-${badge.tier}, var(--g-text-3))` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-mono font-bold text-[15px]">{badge.issued_to}</span>
          <span className="ml-2 text-[11px] g-text-3 font-mono">{badge.schema_name}</span>
        </div>
        <span className={`g-pill text-[11px] uppercase ${TIER_PILL[badge.tier] || "g-pill-muted"}`}>
          {badge.tier}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Level", value: badge.level },
          { label: "XP", value: badge.xp.toLocaleString() },
          { label: "Status", value: badge.status },
          { label: "ID", value: badge.id.replace(/[<>]/g, "") },
        ].map((s) => (
          <div key={s.label} className="g-card-inner px-3 py-2">
            <div className="text-[10px] g-text-3 uppercase tracking-wider">{s.label}</div>
            <div className="text-[13px] font-mono font-semibold mt-0.5 truncate">{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-[11px] g-text-3 mb-1">
          <span>{badge.xp} XP</span>
          <span>{isMax ? "Max Level" : `${next.toLocaleString()} XP \u2192 ${nextLevel}`}</span>
        </div>
        <div className="g-xp-track h-1.5 rounded-full overflow-hidden">
          <div className="g-xp-fill h-full rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
