"use client";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { API_URL } from "@/lib/constants";


interface Cell { state: "empty" | "progress" | "completed"; type: string; }
interface Board {
  id: number; grid: Cell[][]; score: number; rolls_used: number;
  extra_turns: number; wild_cards: number; status: string;
}
interface RollResult {
  ok: boolean; cell: { row: number; col: number }; oldState: string;
  newState: string; cellType: string; scoreChange: number;
  specialEffect: string | null; diceValue: number; usedExtra: boolean;
  score: number; gameOver: boolean; error?: string;
  achievement?: { baseXp: number; milestoneXp: number; totalXp: number; milestoneName: string | null; milestoneNft: boolean; gridsCompleted: number } | null;
}
interface AchievementSummary {
  grids_completed: number; best_score: number;
  achievements: { name: string; count: number }[];
  next_milestone: { name: string; grids_needed: number; nft: boolean } | null;
}
interface GameState {
  total_rolls: number; total_bonus_xp: number; streak_days: number;
  last_roll_value: number; jackpots: number; available_rolls: number;
}

interface LeaderboardEntry {
  radix_address: string; total_rolls: number; total_bonus_xp: number;
  streak_days: number; jackpots: number;
}

function LeaderboardSection({ account }: { account: string | null }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL + "/leaderboard").then(r => r.json())
      .then(d => { setEntries(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Card id="leaderboard">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No game data yet. Vote or propose to earn rolls!</p>
        ) : (
          <div className="space-y-0">
            {entries.map((e, i) => {
              const isYou = account && e.radix_address === account;
              return (
                <div key={e.radix_address} className={`flex items-center justify-between py-3 border-b last:border-0 ${isYou ? "bg-primary/5 -mx-3 px-3 rounded-md" : ""}`}>
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className={`text-lg font-bold font-mono w-7 shrink-0 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-mono truncate">
                        {e.radix_address.slice(0, 14)}...{e.radix_address.slice(-4)}
                        {isYou && <Badge variant="secondary" className="ml-2 text-[9px]">You</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{e.total_rolls} rolls · {e.streak_days}d streak · {e.jackpots} jackpots</div>
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
  );
}

const DICE_FACES = ["", "\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
const CELL_SYMBOLS: Record<string, Record<string, string>> = {
  normal:  { empty: "", progress: "", completed: "" },
  double:  { empty: "2x", progress: "2x", completed: "2x" },
  extra:   { empty: "+", progress: "+", completed: "+" },
  wild:    { empty: "W", progress: "W", completed: "W" },
  penalty: { empty: "!", progress: "!", completed: "!" },
};
const CELL_COLORS: Record<string, Record<string, string>> = {
  empty:    { normal: "bg-muted", double: "bg-yellow-500/10", extra: "bg-blue-500/10", wild: "bg-purple-500/10", penalty: "bg-red-500/10" },
  progress: { normal: "bg-muted ring-1 ring-primary/30", double: "bg-yellow-500/20 ring-1 ring-yellow-500/40", extra: "bg-blue-500/20", wild: "bg-purple-500/20", penalty: "bg-red-500/20" },
  completed:{ normal: "bg-primary/20", double: "bg-yellow-500/30", extra: "bg-blue-500/30", wild: "bg-purple-500/30", penalty: "bg-red-500/30" },
};
const EFFECT_LABELS: Record<string, string> = {
  double_points: "+20 points", extra_turn: "Extra turn!", wild_card: "+1 wild card", penalty: "-10 penalty",
};

function GameContent() {
  const { account, connected } = useWallet();
  const [board, setBoard] = useState<Board | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [availableRolls, setAvailableRolls] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState("");
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [hitCell, setHitCell] = useState<{ row: number; col: number } | null>(null);
  const [wildMode, setWildMode] = useState(false);
  const [boardsCompleted, setBoardsCompleted] = useState(0);
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null);

  const fetchBoard = useCallback(() => {
    if (!account) return;
    Promise.all([
      fetch(API_URL + "/game/" + account + "/board").then(r => r.json()).catch(() => null),
      fetch(API_URL + "/game/" + account).then(r => r.json()).catch(() => null),
      fetch(API_URL + "/game/" + account + "/achievements").then(r => r.json()).catch(() => null),
    ]).then(([b, g, a]) => {
      if (b?.data) {
        setBoard(b.data.board);
        setAvailableRolls(b.data.available_rolls);
        setBoardsCompleted(b.data.boards_completed || 0);
      }
      if (g?.data) setGameState(g.data);
      if (a?.data) setAchievements(a.data);
      setLoading(false);
    });
  }, [account]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  async function handleNewBoard() {
    if (!account) return;
    const resp = await fetch(API_URL + "/game/" + account + "/board/new", { method: "POST" });
    const data = await resp.json();
    if (data.ok) fetchBoard();
  }

  async function handleRoll() {
    if (!account || rolling) return;
    setRolling(true); setLastResult(null); setHitCell(null);

    // Dice animation
    let frame = 0;
    const anim = setInterval(() => {
      setDiceDisplay(DICE_FACES[1 + (frame % 6)]);
      frame++;
    }, 100);

    const resp = await fetch(API_URL + "/game/" + account + "/board/roll", { method: "POST" });
    const data: RollResult = await resp.json();

    clearInterval(anim);

    if (data.ok) {
      setDiceDisplay(DICE_FACES[data.diceValue]);
      setLastResult(data);
      setHitCell(data.cell);
      setTimeout(() => setHitCell(null), 1500);
      fetchBoard();
    } else {
      setDiceDisplay("");
      setLastResult(data);
    }
    setRolling(false);
  }

  async function handleWild(row: number, col: number) {
    if (!account || !wildMode) return;
    const resp = await fetch(API_URL + "/game/" + account + "/board/wild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, col }),
    });
    const data = await resp.json();
    if (data.ok) { setWildMode(false); fetchBoard(); }
  }

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Grid Game</h2>
        <p className="text-muted-foreground text-sm">Connect your wallet to play.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="space-y-5"><Skeleton className="h-64 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Grid Game</h1>
        <p className="text-muted-foreground text-sm mt-1">Spend governance-earned rolls to complete the grid.</p>
      </div>

      {/* Board */}
      {board ? (
        <Card>
          <CardContent className="pt-4 pb-4">
            {/* Score bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="bg-muted rounded px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                <div className="text-lg font-bold font-mono text-primary">{board.score}</div>
              </div>
              <div className="bg-muted rounded px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Rolls</div>
                <div className="text-lg font-bold font-mono">{availableRolls}</div>
              </div>
              <div className="bg-muted rounded px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Extra Turns</div>
                <div className="text-lg font-bold font-mono text-blue-400">{board.extra_turns}</div>
              </div>
              <div className="bg-muted rounded px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Wild Cards</div>
                <div className="text-lg font-bold font-mono text-purple-400">{board.wild_cards}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-4">
              <Button onClick={handleRoll} disabled={rolling || (availableRolls <= 0 && board.extra_turns <= 0) || board.status !== "active"} className="flex-1">
                {rolling ? diceDisplay || "Rolling..." : board.status === "active" ? "Roll Dice" : "Board Complete"}
              </Button>
              {board.wild_cards > 0 && board.status === "active" && (
                <Button variant={wildMode ? "default" : "outline"} onClick={() => setWildMode(!wildMode)}>
                  {wildMode ? "Cancel Wild" : "Use Wild"}
                </Button>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-6 gap-1 max-w-sm mx-auto">
              {board.grid.map((row, r) =>
                row.map((cell, c) => {
                  const isHit = hitCell?.row === r && hitCell?.col === c;
                  const colorClass = CELL_COLORS[cell.state]?.[cell.type] || "bg-muted";
                  const symbol = CELL_SYMBOLS[cell.type]?.[cell.state] || "";
                  const canWild = wildMode && cell.state !== "completed";

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => canWild && handleWild(r, c)}
                      className={`aspect-square rounded flex items-center justify-center text-xs font-mono transition-all ${colorClass} ${
                        isHit ? "ring-2 ring-primary animate-pulse scale-110" : ""
                      } ${canWild ? "cursor-pointer ring-1 ring-purple-400 hover:ring-2" : ""} ${
                        cell.state === "completed" ? "opacity-80" : ""
                      }`}
                    >
                      {cell.state === "completed" ? (
                        <span className="text-primary font-bold">ok</span>
                      ) : cell.state === "progress" ? (
                        <span className="text-muted-foreground">.</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-[10px]">{symbol}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Last roll result */}
            {lastResult && lastResult.ok && (
              <div className="mt-3 text-center text-sm">
                <span className="text-2xl mr-2">{DICE_FACES[lastResult.diceValue]}</span>
                Hit [{lastResult.cell.row},{lastResult.cell.col}]
                {lastResult.scoreChange !== 0 && (
                  <span className={lastResult.scoreChange > 0 ? "text-primary ml-1" : "text-red-400 ml-1"}>
                    {lastResult.scoreChange > 0 ? "+" : ""}{lastResult.scoreChange}
                  </span>
                )}
                {lastResult.specialEffect && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {EFFECT_LABELS[lastResult.specialEffect] || lastResult.specialEffect}
                  </Badge>
                )}
              </div>
            )}
            {lastResult && !lastResult.ok && (
              <div className="mt-3 text-center text-sm text-muted-foreground">{lastResult.error}</div>
            )}

            {/* Board complete */}
            {board.status === "completed" && (
              <div className="mt-4 text-center space-y-2">
                <div className="text-lg font-bold text-primary">Grid Complete! Score: {board.score}</div>
                {lastResult?.achievement && (
                  <div className="text-sm text-muted-foreground">
                    +{lastResult.achievement.totalXp} XP earned
                    {lastResult.achievement.milestoneName && (
                      <Badge variant="default" className="ml-2">{lastResult.achievement.milestoneName}</Badge>
                    )}
                    {lastResult.achievement.milestoneNft && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">NFT unlocked</Badge>
                    )}
                  </div>
                )}
                <Button onClick={handleNewBoard}>Start New Board</Button>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 text-[10px] text-muted-foreground justify-center">
              <span>2x = double</span>
              <span>+ = extra turn</span>
              <span>W = wild</span>
              <span>! = penalty</span>
              <span>. = in progress</span>
              <span>ok = done</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">
              {availableRolls > 0 ? `You have ${availableRolls} rolls to spend.` : "Earn rolls by voting on proposals."}
              {boardsCompleted > 0 && ` Boards completed: ${boardsCompleted}`}
            </p>
            <Button onClick={handleNewBoard}>Start New Game</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {gameState && gameState.total_rolls > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Your Stats</CardTitle>
              <a href="#leaderboard"><Button variant="ghost" size="sm">Leaderboard</Button></a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Rolls", value: gameState.total_rolls },
                { label: "Bonus XP", value: "+" + gameState.total_bonus_xp },
                { label: "Streak", value: gameState.streak_days + "d" },
                { label: "Jackpots", value: gameState.jackpots },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-lg font-bold font-mono">{s.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {achievements && achievements.grids_completed > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Grids Completed</div>
                <div className="text-lg font-bold font-mono text-primary">{achievements.grids_completed}</div>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Best Score</div>
                <div className="text-lg font-bold font-mono">{achievements.best_score}</div>
              </div>
              {achievements.next_milestone && (
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground uppercase">Next Milestone</div>
                  <div className="text-sm font-bold">{achievements.next_milestone.name}</div>
                  <div className="text-[10px] text-muted-foreground">{achievements.next_milestone.grids_needed} grid{achievements.next_milestone.grids_needed !== 1 ? "s" : ""} to go{achievements.next_milestone.nft ? " (NFT)" : ""}</div>
                </div>
              )}
            </div>
            {achievements.achievements.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {achievements.achievements.map(a => (
                  <Badge key={a.name} variant="secondary" className="text-[10px]">{a.name.replace(/_/g, " ")}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>1. Vote on proposals or complete bounties to earn dice rolls.</p>
          <p>2. Start a board and spend rolls to hit random cells.</p>
          <p>3. Each cell takes 2 hits: empty to in-progress to completed.</p>
          <p>4. Special cells: 2x = double points, + = extra turn, W = wild card, ! = penalty.</p>
          <p>5. Wild cards let you pick which cell to complete.</p>
          <p>6. Complete all 36 cells to win.</p>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <LeaderboardSection account={account} />
    </div>
  );
}

export default function GamePage() {
  return <AppShell><GameContent /></AppShell>;
}
