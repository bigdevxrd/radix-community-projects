"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody } from "@/components/Card";
import { ProposalSkeleton } from "@/components/LoadingSkeleton";
import { API_URL } from "@/lib/constants";

interface Proposal {
  id: number; title: string; type: string; status: string;
  created_at: number; ends_at: number; min_votes: number;
  parent_id: number | null; round: number;
  counts: Record<string, number>; total_votes: number;
}
interface Stats {
  total_proposals: number; total_voters: number;
  active_proposals: number; pending_xp_rewards: number;
}

const STATUS_PILL: Record<string, string> = {
  active: "g-pill-green", passed: "g-pill-green", completed: "g-pill-green",
  failed: "g-pill-red", expired: "g-pill-muted", cancelled: "g-pill-muted",
  needs_amendment: "g-pill-yellow",
};

const VOTE_BAR: Record<string, string> = {
  for: "g-xp-fill", against: "--g-red",
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
    ]).then(([p, s]) => {
      setProposals(p.data || []);
      setStats(s.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === "active" ? proposals.filter((p) => p.status === "active") : proposals;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Proposals</h2>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total_proposals },
            { label: "Active", value: stats.active_proposals },
            { label: "Voters", value: stats.total_voters },
            { label: "Pending XP", value: stats.pending_xp_rewards },
          ].map((s) => (
            <div key={s.label} className="g-card px-4 py-3">
              <div className="text-[10px] g-text-3 uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-bold font-mono g-accent mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 g-divider">
        {(["all", "active"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-[13px] font-medium cursor-pointer bg-transparent border-none ${
              filter === f ? "g-nav-active" : "g-nav-idle"
            }`}>
            {f === "all" ? "All" : "Active"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <ProposalSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <p className="g-text-3 text-sm py-8 text-center">No proposals found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardBody className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="g-text-3 font-mono text-xs mr-2">#{p.id}</span>
                    <span className="font-semibold text-sm">{p.title}</span>
                  </div>
                  <span className={`g-pill uppercase ${STATUS_PILL[p.status] || "g-pill-muted"}`}>{p.status}</span>
                </div>
                <div className="flex gap-3 text-[11px] g-text-3 mb-3">
                  <span>Type: {p.type || "Vote"}</span>
                  {p.round > 1 && <span>Round {p.round}</span>}
                  <span>Created: {new Date(p.created_at * 1000).toLocaleDateString()}</span>
                  <span>Ends: {new Date(p.ends_at * 1000).toLocaleDateString()}</span>
                </div>
                {Object.keys(p.counts).length > 0 && (
                  <div className="space-y-1.5">
                    {Object.entries(p.counts).map(([option, count]) => {
                      const pct = p.total_votes > 0 ? Math.round((count / p.total_votes) * 100) : 0;
                      const color = option === "for" ? "var(--g-accent)" : option === "against" ? "var(--g-red)" : "var(--g-blue)";
                      return (
                        <div key={option} className="flex items-center gap-2">
                          <span className="text-[11px] g-text-2 w-16 capitalize">{option}</span>
                          <div className="flex-1 h-2 g-xp-track rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="text-[11px] font-mono g-text-3 w-14 text-right">{count} ({pct}%)</span>
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

      <div className="text-center pt-4">
        <a href="https://t.me/radix_guild_bot" target="_blank" className="g-accent text-sm font-semibold">
          Vote in Telegram
        </a>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return <AppShell><ProposalsContent /></AppShell>;
}
