"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "reward";

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onClose: () => void;
}

const TYPE_CONFIG: Record<
  ToastType,
  { emoji: string; border: string; bg: string; text: string; shadow: string }
> = {
  success: {
    emoji: "✅",
    border: "border-emerald-400",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    shadow: "shadow-[0_0_20px_rgba(52,211,153,0.3)]",
  },
  error: {
    emoji: "❌",
    border: "border-red-400",
    bg: "bg-red-500/15",
    text: "text-red-300",
    shadow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
  },
  info: {
    emoji: "ℹ️",
    border: "border-blue-400",
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    shadow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  },
  reward: {
    emoji: "✨",
    border: "border-[var(--cyber-yellow)]",
    bg: "bg-[var(--cyber-yellow)]/15",
    text: "text-[var(--cyber-yellow)]",
    shadow: "shadow-[0_0_20px_rgba(255,230,0,0.3)]",
  },
};

export default function Toast({ message, type, visible, onClose }: ToastProps) {
  const cfg = TYPE_CONFIG[type];

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-[100] flex max-w-sm items-center gap-3 rounded-xl border px-5 py-3 backdrop-blur-md transition-all duration-400",
        cfg.border,
        cfg.bg,
        cfg.shadow,
        visible
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-full opacity-0",
      )}
    >
      <span className="text-xl">{cfg.emoji}</span>
      <p className={cn("text-sm font-semibold", cfg.text)}>{message}</p>
      <button
        onClick={onClose}
        className="ml-2 text-[var(--muted-foreground)] transition-colors hover:text-white"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
