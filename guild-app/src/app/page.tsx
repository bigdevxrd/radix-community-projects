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
import { API_URL, ECOSYSTEM_LINKS, RESOURCES, TG_BOT_URL } from "@/lib/constants";
import Link from "next/link";

interface GameState {
  total_rolls: number; total_bonus_xp: number; streak_days: number;
  last_roll_value: number; jackpots: number;
}

interface ActiveProposal {
  id: number; title: string; status: string; ends_at: number;
  counts: Record<string, number>; total_votes: number;
  charter_param?: string;
}

interface DashboardData {
  stats: { total_proposals: number; active_proposals: number; total_voters: number; pending_xp_rewards: number } | null;
  charter: { status: { total: number; resolved: number; voting: number; tbd: number }; ready: { param_key: string; title: string }[] } | null;
  bounties: { stats: { open: number; assigned: number; submitted: number; verified: number; paid: number; totalPaid: number; escrow: { funded: number; released: number; available: number } }; bounties: { id: number; title: string; reward_xrd: number; status: string }[] } | null;
  game: GameState | null;
  activeVotes: ActiveProposal[] | null;
}

function countdown(endsAt: number): string {
  const diff = endsAt * 1000 - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function Dashboard() {
  const { account, connected, badge, badgeLoading } = useWallet();
  const [data, setData] = useState<DashboardData>({ stats: null, charter: null, bounties: null, game: null, activeVotes: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = () => {
    setLoading(true); setError(false);
    Promise.all([
      fetch(API_URL + "/stats").then(r => r.json()).catch(() => null),
      fetch(API_URL + "/charter").then(r => r.json()).catch(() => null),
      fetch(API_URL + "/bounties").then(r => r.json()).catch(() => null),
      fetch(API_URL + "/proposals?status=active").then(r => r.json()).catch(() => null),
    ]).then(([s, c, b, p]) => {
      const allNull = !s?.data && !c?.data && !b?.data;
      if (allNull) setError(true);
      const votes = p?.data ? [...p.data].sort((a: ActiveProposal, b: ActiveProposal) => a.ends_at - b.ends_at).slice(0, 3) : null;
      setData(prev => ({ ...prev, stats: s?.data || null, charter: c?.data || null, bounties: b?.data || null, activeVotes: votes }));
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  // Fetch game state when account is available
  useEffect(() => {
    if (!account) return;
    fetch(API_URL + "/game/" + account).then(r => r.json())
      .then(g => setData(prev => ({ ...prev, game: g?.data || null })))
      .catch(() => {});
  }, [account]);

  return (
    <div className="space-y-5">
      {/* Badge Section */}
      {!connected ? (
        <>
          <Card className="bg-gradient-to-br from-card to-muted">
            <CardContent className="px-6 py-10 text-center">
              <h1 className="text-2xl font-bold mb-2">Radix Governance</h1>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Community-built governance tools for Radix. Mint a free badge, vote on proposals, earn XP, shape the DAO.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto mb-6">
                {[
                  { label: "1. Connect", desc: "Link your Radix Wallet" },
                  { label: "2. Mint", desc: "Free on-chain badge" },
                  { label: "3. Vote", desc: "In Telegram or here" },
                  { label: "4. Earn", desc: "XP + dice roll bonus" },
                ].map((s, i) => (
                  <div key={s.label} className="bg-background/50 rounded-lg px-3 py-3 text-center">
                    <div className="text-primary font-bold text-sm">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Connect your wallet above to get started. No XRD required.</p>
            </CardContent>
          </Card>

          {/* New to Radix? */}
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">New to Radix?</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a href="https://wallet.radixdlt.com" target="_blank" className="block bg-muted rounded-lg p-3 no-underline text-foreground hover:bg-accent/10 transition-colors">
                  <div className="font-semibold text-sm mb-0.5">Get a Wallet</div>
                  <div className="text-[11px] text-muted-foreground">Download the official Radix Wallet (mobile + browser)</div>
                </a>
                <a href="https://radquest.io" target="_blank" className="block bg-muted rounded-lg p-3 no-underline text-foreground hover:bg-accent/10 transition-colors">
                  <div className="font-semibold text-sm mb-0.5">Try RadQuest</div>
                  <div className="text-[11px] text-muted-foreground">Learn Radix basics, earn rewards, set up your first account</div>
                </a>
                <Link href="/docs" className="block bg-muted rounded-lg p-3 no-underline text-foreground hover:bg-accent/10 transition-colors">
                  <div className="font-semibold text-sm mb-0.5">Read the Guide</div>
                  <div className="text-[11px] text-muted-foreground">How voting, badges, XP, and bounties work</div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Live stats visible even without wallet */}
          {data.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Proposals", value: data.stats.total_proposals },
                { label: "Active Votes", value: data.stats.active_proposals },
                { label: "Voters", value: data.stats.total_voters },
                { label: "Pending XP", value: data.stats.pending_xp_rewards },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="px-4 py-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    <div className="text-xl font-bold font-mono text-primary mt-0.5">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Browse without connecting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/proposals" className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
              <div className="font-semibold text-sm mb-1">View Proposals</div>
              <div className="text-xs text-muted-foreground">See active votes and charter progress</div>
            </Link>
            <Link href="/bounties" className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
              <div className="font-semibold text-sm mb-1">Browse Bounties</div>
              <div className="text-xs text-muted-foreground">Earn XRD by contributing</div>
            </Link>
            <Link href="/game" className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
              <div className="font-semibold text-sm mb-1">Dice Game</div>
              <div className="text-xs text-muted-foreground">Every action earns a dice roll</div>
            </Link>
          </div>
        </>
      ) : badgeLoading ? (
        <Card><CardContent className="p-5 space-y-4">
          <div className="flex justify-between"><Skeleton className="h-5 w-32" /><Skeleton className="h-5 w-20" /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}</div>
          <Skeleton className="h-1.5 w-full" />
        </CardContent></Card>
      ) : badge ? (
        <>
          <BadgeCard badge={badge} />
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Tier Progression</CardTitle></CardHeader>
            <CardContent><TierProgression currentLevel={badge.level} /></CardContent>
          </Card>
        </>
      ) : (
        <Card className="text-center">
          <CardContent className="py-10">
            <h2 className="text-lg font-bold mb-2">Become a Member</h2>
            <p className="text-muted-foreground text-sm mb-5">Free on-chain badge. Your badge is your vote.</p>
            <Link href="/mint"><Button>Mint Your Badge</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">Failed to load dashboard data</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Proposal Stats */}
      {data.stats && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Proposals</CardTitle>
              <Link href="/proposals"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: data.stats.total_proposals },
                { label: "Active", value: data.stats.active_proposals },
                { label: "Voters", value: data.stats.total_voters },
                { label: "Pending XP", value: data.stats.pending_xp_rewards },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-lg font-bold font-mono text-primary">{s.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Votes — urgency highlight */}
      {data.activeVotes && data.activeVotes.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-primary">Voting Now</CardTitle>
              <Link href="/proposals"><Button variant="ghost" size="sm">See All</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.activeVotes.map(v => (
              <Link key={v.id} href={`/proposals/${v.id}`}
                className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg no-underline text-foreground hover:bg-accent/10 transition-colors">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm font-medium leading-tight truncate">{v.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{v.total_votes} vote{v.total_votes !== 1 ? "s" : ""}</div>
                </div>
                <span className={`text-xs font-mono shrink-0 ${(v.ends_at * 1000 - Date.now()) < 86400000 ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
                  {countdown(v.ends_at)}
                </span>
              </Link>
            ))}
            <a href={TG_BOT_URL} target="_blank" className="block">
              <Button variant="default" size="sm" className="w-full mt-1">Vote in Telegram</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Charter Progress */}
      {data.charter && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Charter Progress</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{data.charter.status.resolved} of {data.charter.status.total} parameters resolved</span>
              <span className="font-mono text-primary">{Math.round((data.charter.status.resolved / data.charter.status.total) * 100)}%</span>
            </div>
            <Progress value={(data.charter.status.resolved / data.charter.status.total) * 100} className="h-2" />
            {data.charter.ready.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Ready to vote ({data.charter.ready.length}):</div>
                <div className="space-y-1">
                  {data.charter.ready.slice(0, 4).map(p => (
                    <div key={p.param_key} className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="text-[9px] font-mono">{p.param_key}</Badge>
                      <span className="text-muted-foreground">{p.title}</span>
                    </div>
                  ))}
                  {data.charter.ready.length > 4 && (
                    <div className="text-[11px] text-muted-foreground">+ {data.charter.ready.length - 4} more</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bounty Board */}
      {data.bounties && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Bounty Board</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Open", value: data.bounties.stats.open, color: "text-primary" },
                { label: "In Progress", value: data.bounties.stats.assigned, color: "text-yellow-500" },
                { label: "Review", value: data.bounties.stats.submitted + data.bounties.stats.verified, color: "text-blue-400" },
                { label: "Paid", value: data.bounties.stats.paid, color: "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Escrow Balance</span>
              <span className="font-mono font-bold text-primary">{data.bounties.stats.escrow.available} XRD</span>
            </div>
            {data.bounties.bounties.length > 0 && (
              <div className="space-y-1.5">
                {data.bounties.bounties.slice(0, 5).map(b => (
                  <div key={b.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                    <div>
                      <span className="text-muted-foreground font-mono mr-1.5">#{b.id}</span>
                      <span>{b.title.slice(0, 45)}{b.title.length > 45 ? "..." : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{b.reward_xrd} XRD</span>
                      <Badge variant={b.status === "paid" ? "default" : b.status === "open" ? "secondary" : "outline"} className="text-[9px]">{b.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Game Stats */}
      {connected && data.game && data.game.total_rolls > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Dice Game</CardTitle>
              <div className="flex gap-1">
                <Link href="/game"><Button variant="ghost" size="sm">How It Works</Button></Link>
                <Link href="/leaderboard"><Button variant="ghost" size="sm">Leaderboard</Button></Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Rolls", value: data.game.total_rolls, color: "text-foreground" },
                { label: "Bonus XP", value: data.game.total_bonus_xp, color: "text-primary" },
                { label: "Streak", value: data.game.streak_days + "d", color: "text-yellow-500" },
                { label: "Jackpots", value: data.game.jackpots, color: data.game.jackpots > 0 ? "text-primary" : "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            {data.game.last_roll_value > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Last roll: {data.game.last_roll_value} ({["", "Miss", "Small", "Nice", "Great", "Epic", "JACKPOT"][data.game.last_roll_value]})
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {connected && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Vote on Proposals", href: TG_BOT_URL, desc: "Open TG bot", external: true },
                { label: "View Proposals", href: "/proposals", desc: "Live results", external: false },
                { label: "Manage Badges", href: "/admin", desc: "Admin panel", external: false },
              ].map((a) => {
                const inner = (<><div className="font-semibold text-sm mb-1">{a.label}</div><div className="text-xs text-muted-foreground">{a.desc}</div></>);
                return a.external ? (
                  <a key={a.label} href={a.href} target="_blank" className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">{inner}</a>
                ) : (
                  <Link key={a.label} href={a.href} className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">{inner}</Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ecosystem */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Ecosystem</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ECOSYSTEM_LINKS.map((s) => (
              <a key={s.name} href={s.url} target="_blank" className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <Badge variant={s.status === "Active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resources</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RESOURCES.map((r) => (
              <a key={r.name} href={r.url} target="_blank" className="flex items-center gap-2.5 bg-muted rounded-lg px-4 py-3 no-underline text-foreground hover:bg-accent/10 transition-colors">
                <div>
                  <div className="font-semibold text-[13px]">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {account && (
        <div className="text-xs text-muted-foreground font-mono">{account.slice(0, 20)}...{account.slice(-8)}</div>
      )}
    </div>
  );
}

export default function Home() {
  return <AppShell><Dashboard /></AppShell>;
}
