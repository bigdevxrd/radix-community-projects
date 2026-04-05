"use client";
import { useWallet } from "./useWallet";
import type { AdminStats } from "@/lib/types";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/constants";

const ADMIN_TIERS = ["admin", "elder", "steward"];

export function useAdmin() {
  const { badge, connected } = useWallet();
  const isAdmin = connected && badge != null && ADMIN_TIERS.includes(badge.tier);
  return { isAdmin, badge, connected };
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(API_URL + "/stats").then((r) => r.json()),
      fetch(API_URL + "/charter").then((r) => r.json()),
    ])
      .then(([s, c]) => {
        const xpQueue = s?.data?.pending_xp_rewards ?? 0;
        const charterStatus = c?.data?.status;
        const unresolved = charterStatus
          ? charterStatus.total - charterStatus.resolved
          : 0;
        const activeProposals = s?.data?.active_proposals ?? 0;
        setStats({
          pending_proposals: activeProposals,
          unresolved_charter: unresolved,
          xp_queue: xpQueue,
          bounty_submitted: 0,
          bounty_open: 0,
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
