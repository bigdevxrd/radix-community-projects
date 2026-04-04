"use client";
import { Shell } from "../../components/Shell";
import { useEffect, useState } from "react";

const API = "https://156-67-219-105.sslip.io/api";

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

function ProposalsContent() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active">("all");

  useEffect(() => {
    Promise.all([
      fetch(API + "/proposals").then(r => r.json()),
      fetch(API + "/stats").then(r => r.json()),
    ]).then(([p, s]) => {
      setProposals(p.data || []);
      setStats(s.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === "active"
    ? proposals.filter(p => p.status === "active")
    : proposals;

  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      active: "#00e49f", passed: "#00e49f", completed: "#00e49f",
      failed: "#ef4444", expired: "#888", cancelled: "#888",
      needs_amendment: "#f59e0b",
    };
    return colors[s] || "#888";
  };

  const fmtDate = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ");

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 40, color: "#e8e8f0" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Guild Proposals</h1>
      <p style={{ color: "#888", marginBottom: 24 }}>Live from the Telegram governance bot</p>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Proposals", value: stats.total_proposals },
            { label: "Active", value: stats.active_proposals },
            { label: "Voters", value: stats.total_voters },
            { label: "Pending XP", value: stats.pending_xp_rewards },
          ].map(s => (
            <div key={s.label} style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#00e49f", fontFamily: "monospace" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "active"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? "#00e49f" : "transparent",
            color: filter === f ? "#0a0a0f" : "#888",
            border: "1px solid #2a2a3d", borderRadius: 6, padding: "6px 16px",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{f === "all" ? "All" : "Active"}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#888" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#888" }}>No proposals found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(p => {
            const total = p.total_votes;
            const topVote = Object.entries(p.counts).sort((a, b) => b[1] - a[1])[0];
            const roundLabel = p.parent_id ? " (R" + p.round + ")" : "";
            const typeLabel = p.type === "poll" ? "Poll" : p.type === "temp" ? "Temp" : "Vote";

            return (
              <div key={p.id} style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      background: statusColor(p.status) + "1a",
                      color: statusColor(p.status),
                      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    }}>{p.status.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>#{p.id} [{typeLabel}]{roundLabel}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#888" }}>{total} vote{total !== 1 ? "s" : ""}</span>
                </div>

                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{p.title}</div>

                {Object.keys(p.counts).length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {Object.entries(p.counts).sort((a, b) => b[1] - a[1]).map(([opt, cnt]) => {
                      const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                      return (
                        <span key={opt} style={{
                          background: "#1a1a26", border: "1px solid #2a2a3d",
                          borderRadius: 6, padding: "4px 10px", fontSize: 12, fontFamily: "monospace",
                        }}>
                          {opt}: {cnt} ({pct}%)
                        </span>
                      );
                    })}
                  </div>
                )}

                <div style={{ fontSize: 11, color: "#666" }}>
                  Created: {fmtDate(p.created_at)} | Ends: {fmtDate(p.ends_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 32, padding: 16, background: "#12121a", borderRadius: 12, border: "1px solid #2a2a3d" }}>
        <p style={{ color: "#888", fontSize: 13 }}>
          Vote in the <a href="https://t.me/radix_guild_bot" style={{ color: "#00e49f" }}>Telegram governance group</a>.
          This page shows live results from the bot.
        </p>
      </div>
    </div>
  );
}


export default function ProposalsPage() {
  return <Shell><ProposalsContent /></Shell>;
}
