"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { lookupAllBadges } from "@/lib/gateway";
import { API_URL, TG_BOT_URL } from "@/lib/constants";
import Link from "next/link";
import type { BadgeInfo } from "@/lib/types";

interface GameState {
  total_rolls: number; total_bonus_xp: number; streak_days: number;
  last_roll_value: number; jackpots: number;
}
interface AchievementSummary {
  grids_completed: number; best_score: number;
  achievements: { name: string; count: number }[];
  next_milestone: { name: string; grids_needed: number; nft: boolean } | null;
}
interface MyBounty { id: number; title: string; reward_xrd: number; status: string; category: string; funded: number; }
interface MyGroup { id: number; name: string; icon: string; role: string; member_count: number; }
interface MyVote { proposal_id: number; vote: string; voted_at: number; title: string; proposal_status: string; type: string; }
interface TrustBreakdown {
  age_days: number; age_points: number;
  votes: number; vote_points: number;
  proposals: number; proposal_points: number;
  tasks_completed: number; task_points: number;
  groups: number; group_points: number;
  feedback: number; feedback_points: number;
}
interface TrustScore { score: number; tier: string; breakdown: TrustBreakdown; }

type Tab = "overview" | "tasks" | "votes" | "groups" | "trust";

function ProfileContent() {
  const { account, connected, badge, badgeLoading } = useWallet();
  const [allBadges, setAllBadges] = useState<BadgeInfo[]>([]);
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [myCreated, setMyCreated] = useState<MyBounty[]>([]);
  const [myAssigned, setMyAssigned] = useState<MyBounty[]>([]);
  const [myVotes, setMyVotes] = useState<MyVote[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [taskPage, setTaskPage] = useState(1);
  const [votePage, setVotePage] = useState(1);

  useEffect(() => {
    if (!account) { setLoading(false); return; }
    Promise.all([
      lookupAllBadges(account).catch(() => []),
      fetch(API_URL + "/profile/" + account).then(r => r.json()).catch(() => null),
    ]).then(([badges, profile]) => {
      setAllBadges(badges);
      if (profile?.data) {
        const d = profile.data;
        setGame(d.game || null);
        setAchievements(d.achievements || null);
        setMyCreated(d.tasks?.created || []);
        setMyAssigned(d.tasks?.assigned || []);
        setMyVotes(d.votes || []);
        setMyGroups(d.groups || []);
        setTrustScore(d.trust || null);
      }
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
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "tasks", label: `Tasks (${myCreated.length + myAssigned.length})` },
    { key: "votes", label: `Votes (${myVotes.length})` },
    { key: "groups", label: `Groups (${myGroups.length})` },
    { key: "trust", label: "Trust" },
  ];

  const TASKS_PER_PAGE = 10;
  const VOTES_PER_PAGE = 15;
  const allTasks = [...myAssigned.map(t => ({ ...t, _type: "assigned" as const })), ...myCreated.map(t => ({ ...t, _type: "created" as const }))];
  const pagedTasks = allTasks.slice((taskPage - 1) * TASKS_PER_PAGE, taskPage * TASKS_PER_PAGE);
  const taskPages = Math.ceil(allTasks.length / TASKS_PER_PAGE);
  const pagedVotes = myVotes.slice((votePage - 1) * VOTES_PER_PAGE, votePage * VOTES_PER_PAGE);
  const votePages = Math.ceil(myVotes.length / VOTES_PER_PAGE);

  const tierColor: Record<string, string> = {
    elder: "text-purple-400", steward: "text-yellow-400", builder: "text-blue-400",
    contributor: "text-green-400", member: "text-muted-foreground", none: "text-muted-foreground",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "ghost"} size="sm"
            onClick={() => setTab(t.key)} className="text-xs whitespace-nowrap">
            {t.label}
          </Button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <>
          {/* Game Stats */}
          {game && game.total_rolls > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Dice Game</CardTitle>
                  <Link href="/game#leaderboard"><Button variant="ghost" size="sm">Leaderboard</Button></Link>
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

          {/* Achievements */}
          {achievements && achievements.grids_completed > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Grid Game</CardTitle>
                  <Link href="/game"><Button variant="ghost" size="sm">Play</Button></Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase">Grids</div>
                    <div className="text-lg font-bold font-mono text-primary">{achievements.grids_completed}</div>
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase">Best Score</div>
                    <div className="text-lg font-bold font-mono">{achievements.best_score}</div>
                  </div>
                  {achievements.next_milestone && (
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="text-[10px] text-muted-foreground uppercase">Next</div>
                      <div className="text-sm font-bold">{achievements.next_milestone.name}</div>
                      <div className="text-[10px] text-muted-foreground">{achievements.next_milestone.grids_needed} to go</div>
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

          {/* Quick summary counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Tasks", value: allTasks.length, action: () => setTab("tasks") },
              { label: "Votes", value: myVotes.length, action: () => setTab("votes") },
              { label: "Groups", value: myGroups.length, action: () => setTab("groups") },
              { label: "Trust", value: trustScore ? trustScore.score : "—", action: () => setTab("trust") },
            ].map(s => (
              <button key={s.label} onClick={s.action}
                className="bg-muted rounded-lg px-3 py-2.5 text-left hover:bg-accent/10 transition-colors">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className="text-lg font-bold font-mono text-foreground">{s.value}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Tasks Tab ── */}
      {tab === "tasks" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                My Tasks ({allTasks.length})
              </CardTitle>
              <Link href="/bounties"><Button variant="ghost" size="sm">Browse All</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {allTasks.length === 0 && (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-2">No tasks yet.</p>
                <Link href="/bounties"><Button size="sm" variant="outline">Browse Tasks</Button></Link>
              </div>
            )}
            {pagedTasks.map(b => (
              <Link key={`${b._type}-${b.id}`} href={`/bounties/${b.id}`}
                className="flex items-center justify-between py-2 border-b last:border-0 no-underline text-foreground hover:text-primary">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground font-mono text-[11px]">#{b.id}</span>
                  <span className="text-sm truncate">{b.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-primary">{b.reward_xrd} XRD</span>
                  <Badge variant="secondary" className="text-[9px]">{b._type}</Badge>
                  <Badge variant="outline" className="text-[9px]">{b.status}</Badge>
                </div>
              </Link>
            ))}
            {taskPages > 1 && (
              <div className="flex items-center justify-between pt-3">
                <Button variant="ghost" size="sm" disabled={taskPage <= 1}
                  onClick={() => setTaskPage(p => p - 1)}>Prev</Button>
                <span className="text-xs text-muted-foreground">{taskPage} / {taskPages}</span>
                <Button variant="ghost" size="sm" disabled={taskPage >= taskPages}
                  onClick={() => setTaskPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Votes Tab ── */}
      {tab === "votes" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                My Votes ({myVotes.length})
              </CardTitle>
              <Link href="/proposals"><Button variant="ghost" size="sm">All Proposals</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {myVotes.length === 0 && (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-2">No votes cast yet.</p>
                <Link href="/proposals"><Button size="sm" variant="outline">View Proposals</Button></Link>
              </div>
            )}
            {pagedVotes.map(v => (
              <Link key={v.proposal_id} href={`/proposals/${v.proposal_id}`}
                className="flex items-center justify-between py-2 border-b last:border-0 no-underline text-foreground hover:text-primary">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-[11px]">#{v.proposal_id}</span>
                    <span className="text-sm truncate">{v.title}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(v.voted_at * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="default" className="text-[9px]">{v.vote}</Badge>
                  <Badge variant={v.proposal_status === "active" ? "secondary" : "outline"} className="text-[9px]">{v.proposal_status}</Badge>
                </div>
              </Link>
            ))}
            {votePages > 1 && (
              <div className="flex items-center justify-between pt-3">
                <Button variant="ghost" size="sm" disabled={votePage <= 1}
                  onClick={() => setVotePage(p => p - 1)}>Prev</Button>
                <span className="text-xs text-muted-foreground">{votePage} / {votePages}</span>
                <Button variant="ghost" size="sm" disabled={votePage >= votePages}
                  onClick={() => setVotePage(p => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Groups Tab ── */}
      {tab === "groups" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Working Groups ({myGroups.length})
              </CardTitle>
              <Link href="/groups"><Button variant="ghost" size="sm">All Groups</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {myGroups.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-2">Not a member of any groups yet.</p>
                <Link href="/groups"><Button size="sm" variant="outline">Browse Groups</Button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {myGroups.map(g => (
                  <Link key={g.id} href={`/groups/${g.id}`}
                    className="flex items-center justify-between bg-muted rounded-lg px-4 py-3 no-underline text-foreground hover:bg-accent/10 transition-colors">
                    <div>
                      <div className="font-semibold text-sm">{g.icon} {g.name}</div>
                      <div className="text-[10px] text-muted-foreground">{g.member_count} members</div>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">{g.role || "member"}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Trust Tab ── */}
      {tab === "trust" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Trust Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trustScore ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold font-mono">{trustScore.score}</div>
                  <Badge variant="default" className={`text-sm ${tierColor[trustScore.tier] || ""}`}>
                    {trustScore.tier}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Account Age", detail: `${trustScore.breakdown.age_days} days`, points: trustScore.breakdown.age_points, max: 73 },
                    { label: "Votes Cast", detail: `${trustScore.breakdown.votes}`, points: trustScore.breakdown.vote_points, max: 50 },
                    { label: "Proposals", detail: `${trustScore.breakdown.proposals}`, points: trustScore.breakdown.proposal_points, max: 50 },
                    { label: "Tasks Done", detail: `${trustScore.breakdown.tasks_completed}`, points: trustScore.breakdown.task_points, max: 50 },
                    { label: "Groups", detail: `${trustScore.breakdown.groups}`, points: trustScore.breakdown.group_points, max: 30 },
                    { label: "Feedback", detail: `${trustScore.breakdown.feedback}`, points: trustScore.breakdown.feedback_points, max: 20 },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{row.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">{row.detail} ({row.points} pts)</span>
                      </div>
                      <Progress value={Math.min((row.points / row.max) * 100, 100)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  Trust score requires a linked Telegram account. Use <a href={TG_BOT_URL} target="_blank" className="text-primary">/register</a> in the bot.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions — always visible */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href={TG_BOT_URL} target="_blank"
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
