// Chart configuration and helpers for Recharts

export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  passed: "#22c55e",
  failed: "#ef4444",
  amended: "#f59e0b",
  completed: "#3b82f6",
  xp: "#a855f7",
  voters: "#06b6d4",
  muted: "hsl(var(--muted-foreground))",
};

export const CHART_DEFAULTS = {
  margin: { top: 10, right: 20, left: 0, bottom: 0 },
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
};

// Shorten Radix addresses for display
export function truncateAddress(address: string, chars = 8): string {
  if (!address) return "";
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

// Format large numbers (e.g. 5240 → "5.2k")
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// Convert proposals timeline data for Recharts
export function toTimelineChartData(
  raw: { month: string; total: number; passed: number; failed: number; amended: number }[]
) {
  return [...raw].reverse().map((r) => ({
    name: r.month,
    Proposals: r.total,
    Passed: r.passed,
    Failed: r.failed,
    Amended: r.amended,
  }));
}

// Convert voter histogram for BarChart
export function toVoterHistogramData(raw: { range: string; count: number }[]) {
  return raw.map((r) => ({ name: r.range, Voters: r.count }));
}

// Convert XP distribution for BarChart
export function toXpBarData(raw: { week: string; xp: number }[]) {
  return [...raw].reverse().map((r) => ({ name: r.week.replace(/^\d{4}-/, ""), XP: r.xp }));
}

// Outcome pie data
export function toOutcomePieData(counts: Record<string, number>) {
  const colorMap: Record<string, string> = {
    for: CHART_COLORS.passed,
    yes: CHART_COLORS.passed,
    against: CHART_COLORS.failed,
    no: CHART_COLORS.failed,
    amend: CHART_COLORS.amended,
    abstain: CHART_COLORS.muted,
  };
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    fill: colorMap[name] || CHART_COLORS.primary,
  }));
}

// Export data as CSV
export function exportCsv(
  rows: Record<string, unknown>[],
  filename = "export.csv"
) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.join(","),
    ...rows.map((r) =>
      keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
