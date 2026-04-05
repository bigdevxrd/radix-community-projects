"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/lib/constants";

interface AnalyticsSummary {
  total_voters: number;
  total_proposals: number;
  xp_distributed: number;
  bounties_paid: number;
  avg_votes_per_proposal: number;
  outcomes: Record<string, number>;
}

interface TimelineEntry { month: string; count: number }

interface VoterData {
  histogram: Record<string, number>;
  top_voters: { tg_id: number; vote_count: number; last_voted_at: number }[];
}

interface XpData {
  stats: { pending: number; applied: number; totalXpAwarded: number };
  top_pending: { address: string; pendingXp: number }[];
}

interface ChartPhase {
  phase: number; total: number; resolved: number; voting: number; tbd: number; pct: number;
}

interface CharterData {
  phases: ChartPhase[];
  overall: { total: number; resolved: number; voting: number; tbd: number };
}

const OUTCOME_COLORS: Record<string, string> = {
  passed: "bg-green-500",
  completed: "bg-green-400",
  failed: "bg-red-500",
  expired: "bg-muted-foreground",
  cancelled: "bg-yellow-600",
  needs_amendment: "bg-blue-400",
};

const OUTCOME_LABELS: Record<string, string> = {
  passed: "Passed",
  completed: "Completed",
  failed: "Failed",
  expired: "Expired",
  cancelled: "Cancelled",
  needs_amendment: "Needs Amendment",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold font-mono text-primary mt-0.5">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground w-24 shrink-0">{d.label}</span>
          <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
            <div
              className={`h-5 rounded-full transition-all ${d.color || "bg-primary"}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsContent() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [voterData, setVoterData] = useState<VoterData | null>(null);
  const [xpData, setXpData] = useState<XpData | null>(null);
  const [charterData, setCharterData] = useState<CharterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(API_URL + "/analytics/summary").then((r) => r.json()).catch((err) => { console.error("Analytics summary fetch failed:", err); return null; }),
      fetch(API_URL + "/analytics/proposals-timeline").then((r) => r.json()).catch((err) => { console.error("Analytics timeline fetch failed:", err); return null; }),
      fetch(API_URL + "/analytics/voters-histogram").then((r) => r.json()).catch((err) => { console.error("Analytics voters fetch failed:", err); return null; }),
      fetch(API_URL + "/analytics/xp-distribution").then((r) => r.json()).catch((err) => { console.error("Analytics XP fetch failed:", err); return null; }),
      fetch(API_URL + "/analytics/charter-progress").then((r) => r.json()).catch((err) => { console.error("Analytics charter fetch failed:", err); return null; }),
    ]).then(([s, t, v, x, c]) => {
      setSummary(s?.data || null);
      setTimeline(t?.data || []);
      setVoterData(v?.data || null);
      setXpData(x?.data || null);
      setCharterData(c?.data || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-20" />
          </CardContent></Card>
        ))}
      </div>
    );
  }

  const totalOutcomes = summary ? Object.values(summary.outcomes).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Governance Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Public metrics for DAO health and community engagement</p>
      </div>

      {/* Key Metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Voters" value={summary.total_voters} />
          <StatCard label="Total Proposals" value={summary.total_proposals} sub={`avg ${summary.avg_votes_per_proposal} votes each`} />
          <StatCard label="XP Distributed" value={summary.xp_distributed.toLocaleString()} />
          <StatCard label="Bounties Paid" value={summary.bounties_paid} />
        </div>
      )}

      {/* Outcomes Distribution */}
      {summary && totalOutcomes > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Proposal Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Visual bar */}
            <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
              {Object.entries(summary.outcomes).map(([status, count]) => (
                <div
                  key={status}
                  className={`${OUTCOME_COLORS[status] || "bg-muted"} transition-all`}
                  style={{ width: `${(count / totalOutcomes) * 100}%` }}
                  title={`${OUTCOME_LABELS[status] || status}: ${count}`}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(summary.outcomes).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5 text-[11px]">
                  <div className={`w-2.5 h-2.5 rounded-sm ${OUTCOME_COLORS[status] || "bg-muted"}`} />
                  <span className="text-muted-foreground">{OUTCOME_LABELS[status] || status}</span>
                  <span className="font-mono font-semibold">{count}</span>
                  <span className="text-muted-foreground">({Math.round((count / totalOutcomes) * 100)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposals Timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Proposals Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={timeline.map((t) => ({ label: t.month, value: t.count }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Charter Progress */}
      {charterData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Charter Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{charterData.overall.resolved} of {charterData.overall.total} parameters resolved</span>
              <span className="font-mono text-primary font-bold">
                {charterData.overall.total > 0 ? Math.round((charterData.overall.resolved / charterData.overall.total) * 100) : 0}%
              </span>
            </div>
            <Progress
              value={charterData.overall.total > 0 ? (charterData.overall.resolved / charterData.overall.total) * 100 : 0}
              className="h-2"
            />
            {/* Per Phase */}
            <div className="space-y-3 pt-1">
              {charterData.phases.map((p) => (
                <div key={p.phase}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">Phase {p.phase}</span>
                      {p.pct === 100 && <Badge variant="default" className="text-[9px]">Complete</Badge>}
                      {p.voting > 0 && <Badge variant="outline" className="text-[9px]">{p.voting} voting</Badge>}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">{p.resolved}/{p.total}</span>
                  </div>
                  <Progress value={p.pct} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voter Engagement */}
      {voterData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Voter Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Vote count distribution (voters by # of votes cast)</div>
              <BarChart
                data={Object.entries(voterData.histogram).map(([bucket, count]) => ({
                  label: `${bucket} votes`,
                  value: count,
                }))}
              />
            </div>
            {voterData.top_voters.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Top Voters</div>
                <div className="space-y-1">
                  {voterData.top_voters.map((v, i) => (
                    <div key={v.tg_id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground w-5">#{i + 1}</span>
                        <span className="font-mono text-[11px]">TG:{v.tg_id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-[11px]">
                          Last: {new Date(v.last_voted_at * 1000).toLocaleDateString()}
                        </span>
                        <Badge variant="secondary" className="font-mono text-[10px]">{v.vote_count} votes</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* XP Distribution */}
      {xpData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">XP Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Awarded", value: xpData.stats.totalXpAwarded.toLocaleString() + " XP" },
                { label: "Pending", value: xpData.stats.pending + " rewards" },
                { label: "Applied", value: xpData.stats.applied + " rewards" },
              ].map((s) => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-sm font-bold font-mono text-primary mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
            {xpData.top_pending.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Top Pending XP Awards</div>
                <div className="space-y-1">
                  {xpData.top_pending.map((entry, i) => (
                    <div key={entry.address} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground w-5">#{i + 1}</span>
                        <span className="font-mono text-[11px]">{entry.address.slice(0, 22)}...</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] text-yellow-500">{entry.pendingXp} XP</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center pt-2 text-[11px] text-muted-foreground">
        Data sourced from on-chain governance and Telegram bot activity
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return <AppShell><AnalyticsContent /></AppShell>;
}
