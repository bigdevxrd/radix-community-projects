"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { lookupAllBadges } from "@/lib/gateway";
import { API_URL } from "@/lib/constants";
import Link from "next/link";
import type { BadgeInfo } from "@/lib/types";

interface GameState {
  total_rolls: number; total_bonus_xp: number; streak_days: number;
  last_roll_value: number; jackpots: number;
}

function ProfileContent() {
  const { account, connected, badge, badgeLoading } = useWallet();
  const [allBadges, setAllBadges] = useState<BadgeInfo[]>([]);
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) { setLoading(false); return; }
    Promise.all([
      lookupAllBadges(account).catch(() => []),
      fetch(API_URL + "/game/" + account).then(r => r.json()).catch(() => null),
    ]).then(([badges, g]) => {
      setAllBadges(badges);
      setGame(g?.data || null);
      setLoading(false);
    });
  }, [account]);

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Your Profile</h2>
        <p className="text-muted-foreground text-sm">Connect your wallet to view your governance profile.</p>
      </div>
    );
  }

  if (badgeLoading || loading) {
    return (
      <div className="space-y-5">
        <Card><CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}</div>
          <Skeleton className="h-2 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  const rollLabels = ["", "Miss", "Small", "Nice", "Great", "Epic", "JACKPOT"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1 font-mono">
          <span className="hidden sm:inline">{account}</span>
          <span className="sm:hidden">{account?.slice(0, 16)}...{account?.slice(-8)}</span>
        </p>
      </div>

      {/* Primary Badge */}
      {badge ? (
        <>
          <BadgeCard badge={badge} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Tier Progression</CardTitle>
            </CardHeader>
            <CardContent><TierProgression currentLevel={badge.level} /></CardContent>
          </Card>
        </>
      ) : (
        <Card className="text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground text-sm mb-3">No badge found. Mint one to start participating.</p>
            <Link href="/mint"><Button size="sm">Mint Badge</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* All Badges */}
      {allBadges.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              All Badges ({allBadges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {allBadges.map(b => (
                <div key={b.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <div className="font-semibold text-sm">{b.issued_to}</div>
                    <div className="text-xs text-muted-foreground font-mono">{b.schema_name} | {b.id}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-[10px]">{b.tier}</Badge>
                    <div className="text-[11px] text-muted-foreground mt-1">{b.xp} XP | {b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Stats */}
      {game && game.total_rolls > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Dice Game</CardTitle>
              <Link href="/leaderboard"><Button variant="ghost" size="sm">Leaderboard</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Rolls", value: game.total_rolls, color: "text-foreground" },
                { label: "Bonus XP", value: game.total_bonus_xp, color: "text-primary" },
                { label: "Streak", value: game.streak_days + "d", color: "text-yellow-500" },
                { label: "Jackpots", value: game.jackpots, color: game.jackpots > 0 ? "text-primary" : "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            {game.last_roll_value > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Last roll: {game.last_roll_value} ({rollLabels[game.last_roll_value]})
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="https://t.me/rad_gov" target="_blank"
              className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
              <div className="font-semibold text-sm mb-1">Vote on Proposals</div>
              <div className="text-xs text-muted-foreground">Open TG bot</div>
            </a>
            <Link href="/proposals"
              className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
              <div className="font-semibold text-sm mb-1">View Proposals</div>
              <div className="text-xs text-muted-foreground">Live results</div>
            </Link>
            <Link href="/bounties"
              className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
              <div className="font-semibold text-sm mb-1">Browse Bounties</div>
              <div className="text-xs text-muted-foreground">Earn XRD + XP</div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return <AppShell><ProfileContent /></AppShell>;
}
