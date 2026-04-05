"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/lib/constants";

import { CardHeader, CardTitle } from "@/components/ui/card";

interface Proposal {
  id: number; title: string; type: string; status: string;
  created_at: number; ends_at: number;
  counts: Record<string, number>; total_votes: number;
}
interface Stats {
  total_proposals: number; total_voters: number;
  active_proposals: number; pending_xp_rewards: number;
}
interface CharterStatus {
  total: number; resolved: number; voting: number; tbd: number;
}
interface CharterParam {
  param_key: string; title: string; category: string; phase: number; status: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", passed: "default", completed: "default",
  failed: "destructive", expired: "secondary", cancelled: "secondary",
  needs_amendment: "outline",
};

function ProposalsContent() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [charter, setCharter] = useState<{ status: CharterStatus; ready: CharterParam[]; params: CharterParam[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(API_URL + "/proposals").then((r) => r.json()),
      fetch(API_URL + "/stats").then((r) => r.json()),
      fetch(API_URL + "/charter").then((r) => r.json()),
    ]).then(([p, s, c]) => {
      setProposals(p.data || []);
      setStats(s.data || null);
      setCharter(c?.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const active = proposals.filter((p) => p.status === "active");
  const archived = proposals.filter((p) => p.status !== "active");
  const visible = showArchived ? proposals : active;

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total_proposals },
            { label: "Active", value: stats.active_proposals },
            { label: "Voters", value: stats.total_voters },
            { label: "Pending XP", value: stats.pending_xp_rewards },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="px-4 py-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className="text-xl font-bold font-mono text-primary mt-0.5">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DAO MVD Decision Tree */}
      {charter && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">DAO Setup — Decision Map</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{charter.status.resolved} of {charter.status.total} decisions made</span>
              <span className="font-mono text-primary font-bold">{Math.round((charter.status.resolved / charter.status.total) * 100)}%</span>
            </div>
            <Progress value={(charter.status.resolved / charter.status.total) * 100} className="h-2" />

            {/* Decision Flow */}
            <div className="space-y-2">
              {[
                { phase: 1, label: "STEP 1: Foundation", desc: "Charter, quorum, voting rules", icon: "🏛️" },
                { phase: 2, label: "STEP 2: Configuration", desc: "Treasury, elections, timing", icon: "⚙️" },
                { phase: 3, label: "STEP 3: Operations", desc: "First election, first fund", icon: "🚀" },
              ].map((step) => {
                const params = charter.params?.filter((p: CharterParam) => p.phase === step.phase) || [];
                const resolved = params.filter((p: CharterParam) => p.status === "resolved").length;
                const total = params.length;
                const ready = charter.ready?.filter((p: CharterParam) => p.phase === step.phase).length || 0;
                const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
                const isActive = ready > 0;
                const isDone = resolved === total && total > 0;

                return (
                  <div key={step.phase} className={`rounded-lg p-3 ${isDone ? "bg-primary/10" : isActive ? "bg-muted" : "bg-muted/50 opacity-60"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{step.icon}</span>
                        <span className={`text-sm font-semibold ${isDone ? "text-primary" : ""}`}>{step.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ready > 0 && <Badge variant="default" className="text-[9px]">{ready} ready</Badge>}
                        <span className="text-xs font-mono text-muted-foreground">{resolved}/{total}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{step.desc}</div>
                    {!isActive && !isDone && step.phase > 1 && (
                      <div className="text-[10px] text-muted-foreground mt-1">Blocked — waiting for Step {step.phase - 1}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ready to vote */}
            {charter.ready && charter.ready.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1.5">Ready to vote now:</div>
                <div className="space-y-1">
                  {charter.ready.slice(0, 6).map((p: CharterParam) => (
                    <div key={p.param_key} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span>{p.title}</span>
                      <Badge variant="outline" className="text-[9px] font-mono">{p.param_key}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <a href="https://t.me/rad_gov" target="_blank">
                    <Button variant="default" size="sm" className="w-full">Vote in Telegram</Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {active.length} active{archived.length > 0 ? `, ${archived.length} archived` : ""}
        </span>
        {archived.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Show Active Only" : "Show All"}
          </Button>
        )}
      </div>

      {/* Proposals */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => (
          <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-full" /><Skeleton className="h-2 w-full" /></CardContent></Card>
        ))}</div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No proposals yet.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-muted-foreground font-mono text-xs mr-2">#{p.id}</span>
                    <span className="font-semibold text-sm">{p.title}</span>
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status] || "secondary"}>{p.status}</Badge>
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground mb-3">
                  <span>{p.type || "Vote"}</span>
                  <span>{new Date(p.created_at * 1000).toLocaleDateString()}</span>
                  <span>Ends {new Date(p.ends_at * 1000).toLocaleDateString()}</span>
                </div>
                {Object.keys(p.counts).length > 0 && (
                  <div className="space-y-1.5">
                    {Object.entries(p.counts).map(([opt, count]) => {
                      const pct = p.total_votes > 0 ? Math.round((count / p.total_votes) * 100) : 0;
                      return (
                        <div key={opt} className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground w-16 capitalize">{opt}</span>
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-[11px] font-mono text-muted-foreground w-14 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {p.status === "active" && (
                  <a href="https://t.me/rad_gov" target="_blank">
                    <Button variant="default" size="sm" className="mt-3">Vote in Telegram</Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center pt-2">
        <a href="https://t.me/rad_gov" target="_blank" className="text-primary text-sm font-semibold hover:underline">
          Open Telegram Bot
        </a>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return <AppShell><ProposalsContent /></AppShell>;
}
