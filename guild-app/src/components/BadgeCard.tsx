"use client";
import { TIER_COLORS, XP_THRESHOLDS } from "../lib/constants";
import type { BadgeInfo } from "../lib/types";

function xpProgress(xp: number, level: string): { percent: number; current: number; next: number; nextLevel: string } {
  const levels = Object.entries(XP_THRESHOLDS);
  const idx = levels.findIndex(([l]) => l === level);
  const current = levels[idx]?.[1] ?? 0;
  const next = levels[idx + 1]?.[1] ?? current + 1;
  const nextLevel = levels[idx + 1]?.[0] ?? level;
  const range = next - current;
  const percent = range > 0 ? Math.min(100, Math.round(((xp - current) / range) * 100)) : 100;
  return { percent, current, next, nextLevel };
}

export function BadgeCard({ badge }: { badge: BadgeInfo }) {
  const color = TIER_COLORS[badge.tier] || "var(--text-muted)";
  const { percent, next, nextLevel } = xpProgress(badge.xp, badge.level);
  const isMaxLevel = badge.level === "elder";

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${color}`,
      borderRadius: "var(--radius)",
      padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15 }}>
            {badge.issued_to}
          </span>
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {badge.schema_name}
          </span>
        </div>
        <span style={{
          background: color, color: "#000", padding: "2px 10px",
          borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        }}>
          {badge.tier}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Level", value: badge.level },
          { label: "XP", value: badge.xp.toLocaleString() },
          { label: "Status", value: badge.status },
          { label: "ID", value: badge.id.replace(/[<>]/g, "") },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-surface-2)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
          <span>{badge.xp} XP</span>
          <span>{isMaxLevel ? "Max Level" : `${next.toLocaleString()} XP → ${nextLevel}`}</span>
        </div>
        <div style={{ height: 6, background: "var(--xp-bar-bg)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${percent}%`,
            background: "var(--xp-bar-fill)", borderRadius: 3,
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>
    </div>
  );
}
