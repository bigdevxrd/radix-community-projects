"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { ProposalSkeleton } from "@/components/LoadingSkeleton";
import { API_URL } from "@/lib/constants";

interface Proposal {
  id: number;
  title: string;
  type: string;
  status: string;
  created_at: number;
  ends_at: number;
  min_votes: number;
  parent_id: number | null;
  round: number;
  counts: Record<string, number>;
  total_votes: number;
}

interface Stats {
  total_proposals: number;
  total_voters: number;
  active_proposals: number;
  pending_xp_rewards: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: "text-status-active bg-status-active/10",
  passed: "text-status-active bg-status-active/10",
  completed: "text-status-active bg-status-active/10",
  failed: "text-status-revoked bg-status-revoked/10",
  expired: "text-text-muted bg-surface-2",
  cancelled: "text-text-muted bg-surface-2",
  needs_amendment: "text-status-pending bg-status-pending/10",
};

function ProposalsContent() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active">("all");

  useEffect(() => {
    Promise.all([
      fetch(API_URL + "/proposals").then((r) => r.json()),
      fetch(API_URL + "/stats").then((r) => r.json()),
    ])
      .then(([p, s]) => {
        setProposals(p.data || []);
        setStats(s.data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered =
    filter === "active"
      ? proposals.filter((p) => p.status === "active")
      : proposals;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Proposals</h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total_proposals },
            { label: "Active", value: stats.active_proposals },
            { label: "Voters", value: stats.total_voters },
            { label: "Pending XP", value: stats.pending_xp_rewards },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-surface border border-border rounded-lg px-4 py-3"
            >
              <div className="text-[10px] text-text-muted uppercase tracking-wider">
                {s.label}
              </div>
              <div className="text-xl font-bold font-mono text-accent mt-0.5">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["all", "active"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${
              filter === f
                ? "text-accent border-accent"
                : "text-text-secondary border-transparent hover:text-text-primary"
            }`}
          >
            {f === "all" ? "All" : "Active"}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <ProposalSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-text-muted text-sm py-8 text-center">
          No proposals found.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardBody className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-text-muted font-mono text-xs mr-2">
                      #{p.id}
                    </span>
                    <span className="font-semibold text-sm">{p.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      STATUS_STYLES[p.status] || "text-text-muted bg-surface-2"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="flex gap-3 text-[11px] text-text-muted mb-3">
                  <span>Type: {p.type || "Vote"}</span>
                  {p.round > 1 && <span>Round {p.round}</span>}
                  <span>
                    Created: {new Date(p.created_at * 1000).toLocaleDateString()}
                  </span>
                  <span>
                    Ends: {new Date(p.ends_at * 1000).toLocaleDateString()}
                  </span>
                </div>

                {/* Vote Bars */}
                {Object.keys(p.counts).length > 0 && (
                  <div className="space-y-1.5">
                    {Object.entries(p.counts).map(([option, count]) => {
                      const pct =
                        p.total_votes > 0
                          ? Math.round((count / p.total_votes) * 100)
                          : 0;
                      return (
                        <div key={option} className="flex items-center gap-2">
                          <span className="text-[11px] text-text-secondary w-16 capitalize">
                            {option}
                          </span>
                          <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                option === "for"
                                  ? "bg-accent"
                                  : option === "against"
                                  ? "bg-status-revoked"
                                  : "bg-tier-contributor"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-text-muted w-12 text-right">
                            {count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="text-center pt-4">
        <a
          href="https://t.me/radix_guild_bot"
          target="_blank"
          className="text-accent text-sm font-semibold hover:text-accent-hover"
        >
          Vote in Telegram
        </a>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <AppShell>
      <ProposalsContent />
    </AppShell>
  );
}
