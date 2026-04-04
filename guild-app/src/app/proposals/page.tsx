"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/lib/constants";

interface Proposal {
  id: number; title: string; type: string; status: string;
  created_at: number; ends_at: number;
  counts: Record<string, number>; total_votes: number;
}
interface Stats {
  total_proposals: number; total_voters: number;
  active_proposals: number; pending_xp_rewards: number;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", passed: "default", completed: "default",
  failed: "destructive", expired: "secondary", cancelled: "secondary",
  needs_amendment: "outline",
};

function ProposalsContent() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(API_URL + "/proposals").then((r) => r.json()),
      fetch(API_URL + "/stats").then((r) => r.json()),
    ]).then(([p, s]) => {
      setProposals(p.data || []);
      setStats(s.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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

      {/* Proposals */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => (
          <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-full" /><Skeleton className="h-2 w-full" /></CardContent></Card>
        ))}</div>
      ) : proposals.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No proposals yet.</p>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
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
                  <a href="https://t.me/radix_guild_bot" target="_blank">
                    <Button variant="default" size="sm" className="mt-3">Vote in Telegram</Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center pt-2">
        <a href="https://t.me/radix_guild_bot" target="_blank" className="text-primary text-sm font-semibold hover:underline">
          Open Telegram Bot
        </a>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return <AppShell><ProposalsContent /></AppShell>;
}
