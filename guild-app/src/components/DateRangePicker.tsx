"use client";
import { Button } from "@/components/ui/button";

export type DateRange = "7d" | "30d" | "90d" | "all";

const OPTIONS: { label: string; value: DateRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All time", value: "all" },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (v: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={value === o.value ? "default" : "ghost"}
          onClick={() => onChange(o.value)}
          className="text-[11px] h-7 px-2"
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
