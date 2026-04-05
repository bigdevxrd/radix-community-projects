"use client";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/lib/charts";

interface PieChartProps {
  data: { name: string; value: number; fill?: string }[];
  height?: number;
  onSelect?: (name: string) => void;
}

const FALLBACK_COLORS = [
  CHART_COLORS.passed,
  CHART_COLORS.failed,
  CHART_COLORS.amended,
  CHART_COLORS.completed,
  CHART_COLORS.xp,
];

export function PieChart({ data, height = 220, onSelect }: PieChartProps) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          onClick={(entry) => onSelect?.(entry.name)}
          style={{ cursor: onSelect ? "pointer" : undefined }}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={entry.fill ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </RePieChart>
    </ResponsiveContainer>
  );
}
