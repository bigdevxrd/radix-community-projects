"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { API_URL, ECOSYSTEM_LINKS, RESOURCES } from "@/lib/constants";
import Link from "next/link";

interface DashboardData {
  stats: { total_proposals: number; active_proposals: number; total_voters: number; pending_proposals: number } | null;
  charter: { status: string; total: number; resolved: number; voting: number; tbd: number } | null;
  bounties: { data: { open: number; assigned: number; submitted: number; verified: number } | null };
  // Added Game Stats interface
  game: { 
    total_rolls: number; 
    total_bonus_xp: number; 
    streak_days: number; 
    jackpots: number; 
    last_roll_value: number 
  } | null;
}

export default function Dashboard() {
  const { account, connected, badge, badgeLoading } = useWallet();
  const [data, setData] = useState<DashboardData>({ 
    stats: null, 
    charter: null, 
    bounties: { data: null },
    game: null 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const promises = [
          fetch(API_URL + "/stats").then((r) => r.json()).catch(() => null),
          fetch(API_URL + "/charter").then((r) => r.json()).catch(() => null),
          fetch(API_URL + "/bounties").then((r) => r.json()).catch(() => null),
        ];

        // Only add game stats fetch if account exists
        if (account) {
          promises.push(fetch(`${API_URL}/game/${account}`).then((r) => r.json()).catch(() => null));
        }

        const [s, c, b, g] = await Promise.all(promises);

        setData({
          stats: s?.data || null,
          charter: c?.data || null,
          bounties: b || { data: null },
          game: g || null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [account]);

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Community Dashboard</h1>
            <p className="text-muted-foreground">Monitor ecosystem growth and participation</p>
          </div>
        </div>

        {/* Badge & Progress Section */}
        {!connected ? (
            <Card className="bg-gradient-to-br from-card to-muted">
                <CardContent className="px-6 py-12 text-center">
                    <h2 className="text-2xl font-bold mb-3">Radix Governance</h2>
                    <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
                        Connect your wallet to view your personalized contribution stats and tier progression.
                    </p>
                </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TierProgression badge={badge} loading={badgeLoading} />
                </div>
                <BadgeCard title="Your Current Badge" value={badge?.name || "No Badge"} />
            </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BadgeCard title="Total Proposals" value={data.stats?.total_proposals || 0} loading={loading} />
          <BadgeCard title="Active Proposals" value={data.stats?.active_proposals || 0} loading={loading} />
          <BadgeCard title="Total Voters" value={data.stats?.total_voters || 0} loading={loading} />
          <BadgeCard title="Pending" value={data.stats?.pending_proposals || 0} loading={loading} />
        </div>

        {/* Bounty Section (Reference Point) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bounty Board Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Open Bounties</p>
                            <p className="text-2xl font-bold">{data.bounties.data?.open || 0}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Verified</p>
                            <p className="text-2xl font-bold">{data.bounties.data?.verified || 0}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Governance Charter</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Status: <Badge variant="outline">{data.charter?.status || "Unknown"}</Badge></span>
                            <span>{data.charter?.resolved || 0}/{data.charter?.total || 0} Resolved</span>
                        </div>
                        <Progress value={data.charter ? (data.charter.resolved / data.charter.total) * 100 : 0} />
                   </div>
                </CardContent>
            </Card>
        </div>

        {/* --- NEW GAME STATS SECTION --- */}
        {connected && data.game && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold tracking-tight">Game Stats</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <BadgeCard title="Rolls" value={data.game.total_rolls} />
              <BadgeCard title="Bonus XP" value={data.game.total_bonus_xp} />
              <BadgeCard title="Streak" value={`${data.game.streak_days} Days`} />
              <BadgeCard title="Jackpots" value={data.game.jackpots} />
            </div>

            <Card>
              <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-sm font-medium">
                    Last Roll Result: <span className="font-bold text-primary ml-1">{getRollLabel(data.game.last_roll_value)}</span>
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/api/leaderboard">
                    View Full Rankings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-3">
                <h3 className="font-semibold">Ecosystem Links</h3>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(ECOSYSTEM_LINKS).map(([name, url]) => (
                        <Button key={name} variant="secondary" size="sm" asChild>
                            <a href={url} target="_blank" rel="noreferrer">{name}</a>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Helper function to determine the label of the last roll
 * Based on the requirements in Issue #46
 */
function getRollLabel(value: number): string {
  if (value >= 95) return "JACKPOT";
  if (value >= 80) return "Epic";
  if (value >= 60) return "Great";
  if (value >= 40) return "Nice";
  if (value >= 20) return "Small";
  return "Miss";
}