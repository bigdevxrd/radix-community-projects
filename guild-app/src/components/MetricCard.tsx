"use client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function MetricCard({ label, value, trend, trendUp, className }: MetricCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="px-4 py-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold font-mono text-primary mt-0.5">{value}</div>
        {trend && (
          <div
            className={cn(
              "text-[11px] mt-0.5 font-mono",
              trendUp ? "text-green-500" : "text-red-400"
            )}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
