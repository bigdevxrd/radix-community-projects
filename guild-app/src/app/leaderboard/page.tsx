"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { API_URL } from "@/lib/constants";

interface LeaderboardEntry {
  radix_address: string;
  total_rolls: number;
  total_bonus_xp: number;
  streak_days: number;
  jackpots: number;
}

function LeaderboardContent() {
  const { account } = useWallet();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = () => {
    setLoading(true); setError(false);
    fetch(API_URL + "/leaderboard")
      .then(r => r.json())
      .then(d => { setEntries(d.data || []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Top players by bonus XP from dice rolls</p>
      </div>

      {error && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">Failed to load leaderboard</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Top Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No game data yet. Vote or propose to earn rolls!
            </p>
          ) : (
            <div className="space-y-0">
              {entries.map((e, i) => {
                const isYou = account && e.radix_address === account;
                return (
                  <div
                    key={e.radix_address}
                    className={`flex items-center justify-between py-3 border-b last:border-0 ${isYou ? "bg-primary/5 -mx-3 px-3 rounded-md" : ""}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className={`text-lg font-bold font-mono w-7 sm:w-8 shrink-0 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-mono truncate">
                          <span className="hidden sm:inline">{e.radix_address.slice(0, 20)}...{e.radix_address.slice(-6)}</span>
                          <span className="sm:hidden">{e.radix_address.slice(0, 12)}...{e.radix_address.slice(-4)}</span>
                          {isYou && <Badge variant="secondary" className="ml-2 text-[9px]">You</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.total_rolls} rolls · {e.streak_days}d streak · {e.jackpots} 🎰
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-primary">+{e.total_bonus_xp}</div>
                      <div className="text-[10px] text-muted-foreground">bonus XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        Every governance action earns a dice roll. Higher rolls = more bonus XP.
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <AppShell><LeaderboardContent /></AppShell>;
}
