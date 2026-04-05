"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, CHART_DEFAULTS } from "@/lib/charts";

interface HistogramChartProps {
  data: { name: string; [key: string]: number | string }[];
  barKey: string;
  color?: string;
  height?: number;
}

export function HistogramChart({
  data,
  barKey,
  color = CHART_COLORS.primary,
  height = 180,
}: HistogramChartProps) {
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
      <BarChart data={data} margin={CHART_DEFAULTS.margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: CHART_DEFAULTS.fontSize, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tick={{ fontSize: CHART_DEFAULTS.fontSize, fill: "hsl(var(--muted-foreground))" }}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Bar dataKey={barKey} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
