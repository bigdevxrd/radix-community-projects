"use client";
import { truncateAddress } from "@/lib/charts";

interface RankingRow {
  address?: string;
  label?: string;
  value: number;
  badge?: string;
  meta?: string;
}

interface RankingTableProps {
  rows: RankingRow[];
  valueLabel?: string;
  emptyText?: string;
}

export function RankingTable({ rows, valueLabel = "Score", emptyText = "No data" }: RankingTableProps) {
  if (!rows.length) {
    return <p className="text-muted-foreground text-sm py-4 text-center">{emptyText}</p>;
  }

  return (
    <div className="space-y-0">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2.5 border-b last:border-0"
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground w-5">
              {i + 1}
            </span>
            <div>
              <div className="text-sm font-mono">
                {row.label ?? (row.address ? truncateAddress(row.address) : "—")}
              </div>
              {row.meta && (
                <div className="text-[10px] text-muted-foreground">{row.meta}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {row.badge && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                {row.badge}
              </span>
            )}
            <span className="text-sm font-bold font-mono text-primary">{row.value}</span>
            <span className="text-[10px] text-muted-foreground">{valueLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
