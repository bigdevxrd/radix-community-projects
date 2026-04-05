"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { API_URL } from "@/lib/constants";
import Link from "next/link";

interface GameState {
  total_rolls: number; total_bonus_xp: number; streak_days: number;
  last_roll_value: number; jackpots: number;
}
interface LeaderboardEntry {
  radix_address: string; total_rolls: number;
  total_bonus_xp: number; streak_days: number; jackpots: number;
}

const ROLL_LABELS = ["", "Miss", "Small", "Nice", "Great", "Epic", "JACKPOT"];
const ROLL_BONUSES = [0, 0, 5, 10, 25, 50, 100];
const ROLL_WEIGHTS = [30, 25, 20, 13, 8, 4];
const ROLL_COLORS = ["", "text-muted-foreground", "text-muted-foreground", "text-blue-400", "text-yellow-500", "text-purple-400", "text-primary"];
const DICE_FACES = ["", "\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];

function GameContent() {
  const { account, connected } = useWallet();
  const [game, setGame] = useState<GameState | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises = [
      fetch(API_URL + "/leaderboard").then(r => r.json()).catch(() => null),
    ];
    if (account) {
      promises.push(fetch(API_URL + "/game/" + account).then(r => r.json()).catch(() => null));
    }
    Promise.all(promises).then(([l, g]) => {
      setLeaders(l?.data || []);
      if (g?.data) setGame(g.data);
      setLoading(false);
    });
  }, [account]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Dice Game</h1>
        <p className="text-muted-foreground text-sm mt-1">Every governance action earns a dice roll. Higher rolls = more bonus XP.</p>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map(roll => (
              <div key={roll} className={`text-center rounded-lg p-3 ${roll === 6 ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted"}`}>
                <div className="text-3xl sm:text-4xl mb-1">{DICE_FACES[roll]}</div>
                <div className={`text-xs font-bold ${ROLL_COLORS[roll]}`}>{ROLL_LABELS[roll]}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">+{ROLL_BONUSES[roll]} XP</div>
                <div className="text-[9px] text-muted-foreground">{ROLL_WEIGHTS[roll - 1]}%</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Earn a roll every time you: vote on a proposal, create a proposal, or complete a bounty.</p>
            <p>Streak bonus: consecutive daily governance activity increases your streak counter.</p>
            <p>Rolling a 6 is a JACKPOT — only 4% chance but +100 bonus XP!</p>
          </div>
        </CardContent>
      </Card>

      {/* Your Stats */}
      {connected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Your Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : !game || game.total_rolls === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">No rolls yet. Vote on a proposal to earn your first roll!</p>
                <Link href="/proposals"><Button size="sm">View Proposals</Button></Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Rolls", value: game.total_rolls, color: "text-foreground" },
                    { label: "Bonus XP", value: "+" + game.total_bonus_xp, color: "text-primary" },
                    { label: "Streak", value: game.streak_days + " days", color: "text-yellow-500" },
                    { label: "Jackpots", value: game.jackpots, color: game.jackpots > 0 ? "text-primary" : "text-muted-foreground" },
                  ].map(s => (
                    <div key={s.label} className="bg-muted rounded-lg px-3 py-2.5">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                      <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {game.last_roll_value > 0 && (
                  <div className="mt-3 flex items-center gap-3 bg-muted rounded-lg px-4 py-3">
                    <span className="text-3xl">{DICE_FACES[game.last_roll_value]}</span>
                    <div>
                      <div className={`text-sm font-bold ${ROLL_COLORS[game.last_roll_value]}`}>
                        Last Roll: {ROLL_LABELS[game.last_roll_value]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        +{ROLL_BONUSES[game.last_roll_value]} bonus XP
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Top Players</CardTitle>
            <Link href="/leaderboard"><Button variant="ghost" size="sm">Full Leaderboard</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : leaders.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No players yet.</p>
          ) : (
            <div className="space-y-0">
              {leaders.slice(0, 5).map((e, i) => {
                const isYou = account && e.radix_address === account;
                return (
                  <div key={e.radix_address}
                    className={`flex items-center justify-between py-2.5 border-b last:border-0 ${isYou ? "bg-primary/5 -mx-3 px-3 rounded-md" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-lg font-bold font-mono w-7 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-mono truncate">
                          {e.radix_address.slice(0, 12)}...{e.radix_address.slice(-4)}
                          {isYou && <Badge variant="secondary" className="ml-2 text-[9px]">You</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.total_rolls} rolls · {e.jackpots} jackpots
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold font-mono text-primary">+{e.total_bonus_xp}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* XP Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">XP Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { action: "Vote on a proposal", xp: 10, roll: true },
              { action: "Create a proposal", xp: 20, roll: true },
              { action: "Complete a bounty", xp: "varies", roll: true },
              { action: "Dice roll bonus", xp: "0-100", roll: false },
            ].map(r => (
              <div key={r.action} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <span className="text-muted-foreground">{r.action}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-primary font-bold">+{r.xp} XP</span>
                  {r.roll && <Badge variant="outline" className="text-[9px]">+ roll</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center pt-2">
        <a href="https://t.me/rad_gov" target="_blank" className="text-primary text-sm font-semibold hover:underline">
          Start Earning — Vote in Telegram
        </a>
      </div>
    </div>
  );
}

export default function GamePage() {
  return <AppShell><GameContent /></AppShell>;
}
