"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/lib/constants";

interface LeaderboardEntry {
  radix_address: string;
  total_rolls: number;
  total_bonus_xp: number;
  streak_days: number;
  jackpots: number;
  last_roll_value: number;
  last_roll_date: string | null;
}

const PAGE_SIZE = 10;

function truncateAddress(addr: string) {
  if (!addr || addr.length < 20) return addr;
  return addr.slice(0, 14) + "..." + addr.slice(-8);
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold">🥇</span>;
  if (rank === 2) return <span className="text-slate-400 font-bold">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold">🥉</span>;
  return <span className="font-mono text-muted-foreground text-sm">#{rank}</span>;
}

function LeaderboardContent() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(API_URL + "/leaderboard")
      .then((r) => r.json())
      .then((res) => {
        setEntries(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load leaderboard.");
        setLoading(false);
      });
  }, []);

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const visible = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Grid Game Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-6" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-sm py-4 text-center">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No players yet — be the first to roll!
            </p>
          ) : (
            <>
              {/* Header row */}
              <div className="grid grid-cols-[2rem_1fr_repeat(4,auto)] gap-x-4 gap-y-0 items-center text-[10px] text-muted-foreground uppercase tracking-wider mb-2 px-1">
                <span>#</span>
                <span>Address</span>
                <span className="text-right">Rolls</span>
                <span className="text-right">Bonus XP</span>
                <span className="text-right">Streak</span>
                <span className="text-right">Jackpots</span>
              </div>

              <div className="space-y-1">
                {visible.map((e, i) => {
                  const rank = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                    <div
                      key={e.radix_address}
                      className="grid grid-cols-[2rem_1fr_repeat(4,auto)] gap-x-4 items-center px-1 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-center">
                        <RankBadge rank={rank} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        {truncateAddress(e.radix_address)}
                      </span>
                      <span className="font-mono text-sm font-semibold text-primary text-right">
                        {e.total_rolls}
                      </span>
                      <span className="font-mono text-sm font-semibold text-right">
                        {e.total_bonus_xp}
                        <span className="text-[10px] text-muted-foreground ml-0.5">XP</span>
                      </span>
                      <div className="text-right">
                        {e.streak_days > 0 ? (
                          <Badge variant="secondary" className="text-[9px] font-mono">
                            🔥 {e.streak_days}d
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">—</span>
                        )}
                      </div>
                      <div className="text-right">
                        {e.jackpots > 0 ? (
                          <Badge variant="default" className="text-[9px] font-mono">
                            ⚡ {e.jackpots}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Prev
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: "Rolls", desc: "Total dice rolls" },
              { label: "Bonus XP", desc: "Cumulative bonus XP earned" },
              { label: "Streak 🔥", desc: "Consecutive daily rolls" },
              { label: "Jackpots ⚡", desc: "Roll-6 jackpot hits" },
            ].map((col) => (
              <div key={col.label} className="bg-muted rounded-lg px-3 py-2.5">
                <div className="text-xs font-semibold mb-0.5">{col.label}</div>
                <div className="text-[10px] text-muted-foreground">{col.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center pt-2">
        <a
          href="https://t.me/radix_guild_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm font-semibold hover:underline"
        >
          Roll Dice in Telegram Bot →
        </a>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <AppShell>
      <LeaderboardContent />
    </AppShell>
  );
}
