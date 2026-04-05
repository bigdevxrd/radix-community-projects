"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PieChart } from "@/components/charts/PieChart";
import { API_URL } from "@/lib/constants";
import { toOutcomePieData, truncateAddress } from "@/lib/charts";
import type { ProposalOutcome, VoteEntry } from "@/lib/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  passed: "default",
  completed: "default",
  failed: "destructive",
  expired: "secondary",
  cancelled: "secondary",
  needs_amendment: "outline",
};

const RESULT_LABELS: Record<string, string> = {
  passed: "✅ PASSED",
  failed: "❌ FAILED",
  needs_amendment: "🔄 NEEDS AMENDMENT",
  completed: "✅ COMPLETED",
  expired: "⌛ EXPIRED",
  cancelled: "🚫 CANCELLED",
};

function VoteTable({
  votes,
  total,
}: {
  votes: VoteEntry[];
  total: number;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"time" | "vote">("time");

  const lowerSearch = search.toLowerCase();
  const filtered = votes
    .filter((v) => !lowerSearch || v.radix_address.toLowerCase().includes(lowerSearch) || v.vote.toLowerCase().includes(lowerSearch))
    .sort((a, b) => sort === "time" ? b.voted_at - a.voted_at : a.vote.localeCompare(b.vote));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Vote Details ({total} votes)
          </CardTitle>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address..."
              className="h-7 rounded-md border bg-background px-2 text-[12px] font-mono w-44"
            />
            <button
              onClick={() => setSort(sort === "time" ? "vote" : "time")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Sort: {sort}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No votes found.</p>
        ) : (
          <div className="space-y-0">
            {filtered.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="font-mono text-xs">{truncateAddress(v.radix_address)}</div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      v.vote === "for" || v.vote === "yes"
                        ? "text-green-500 border-green-500/30"
                        : v.vote === "against" || v.vote === "no"
                        ? "text-red-400 border-red-400/30"
                        : "text-yellow-500 border-yellow-500/30"
                    }
                  >
                    {v.vote}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(v.voted_at * 1000).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OutcomeContent({ id }: { id: string }) {
  const [data, setData] = useState<ProposalOutcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/proposals/${id}/outcomes`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setData(j.data);
        else setError("Proposal not found");
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState rows={4} />;
  if (error) return <p className="text-destructive text-sm py-8 text-center">{error}</p>;
  if (!data) return null;

  const { proposal, counts, total_votes, votes, charter_param } = data;
  const pieData = toOutcomePieData(counts);
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const quorumMet = total_votes >= (proposal.min_votes || 3);
  const duration = proposal.ends_at - proposal.created_at;

  const onChainJson = proposal.on_chain_outcome_json
    ? (() => { try { return JSON.parse(proposal.on_chain_outcome_json); } catch { return null; } })()
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={STATUS_VARIANT[proposal.status] || "secondary"}>
            {proposal.status}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            #{proposal.id}
          </Badge>
          <Badge variant="outline" className="text-[10px]">{proposal.type}</Badge>
        </div>
        <h1 className="text-lg font-bold">{proposal.title}</h1>
        <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span>Created {new Date(proposal.created_at * 1000).toLocaleString()}</span>
          <span>Closed {new Date(proposal.ends_at * 1000).toLocaleString()}</span>
          <span>Duration {Math.round(duration / 3600)}h</span>
        </div>
      </div>

      {/* Vote Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Vote Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Total votes</span>
            <span className="font-bold font-mono">{total_votes}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Quorum ({proposal.min_votes || 3} required)</span>
            <Badge variant={quorumMet ? "default" : "destructive"}>
              {quorumMet ? "Met" : "Not met"}
            </Badge>
          </div>

          {Object.entries(counts).map(([opt, count]) => {
            const pct = total_votes > 0 ? Math.round((count / total_votes) * 100) : 0;
            return (
              <div key={opt} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{opt}</span>
                  <span className="font-mono">{count} ({pct}%)</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}

          <div className="pt-1">
            <PieChart data={pieData} height={160} />
          </div>
        </CardContent>
      </Card>

      {/* Result Card */}
      <Card>
        <CardContent className="px-4 py-4 space-y-2">
          <div className="text-lg font-bold">
            {RESULT_LABELS[proposal.status] || proposal.status.toUpperCase()}
          </div>
          {winner && (
            <div className="text-sm text-muted-foreground">
              Winner: <span className="font-semibold text-foreground capitalize">{winner[0]}</span>
              {" "}with {winner[1]} votes
            </div>
          )}
          {charter_param && (
            <div className="text-sm text-muted-foreground">
              Charter param:{" "}
              <Badge variant="outline" className="font-mono text-[10px]">
                {charter_param.param_key}
              </Badge>
              {charter_param.param_value && (
                <span className="ml-1 text-primary font-mono">= {charter_param.param_value}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* On-chain recording */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            On-Chain Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {proposal.recorded_on_chain ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span className="text-sm font-medium">Recorded on-chain</span>
              </div>
              {proposal.on_chain_tx && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">TX Hash:</span>
                  <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                    {truncateAddress(proposal.on_chain_tx, 16)}
                  </code>
                  <a
                    href={`https://dashboard.radixdlt.com/transaction/${proposal.on_chain_tx}`}
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    View in Explorer
                  </a>
                </div>
              )}
              {onChainJson && (
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                    Outcome JSON
                  </summary>
                  <pre className="bg-muted rounded p-2 mt-1 overflow-x-auto text-[11px]">
                    {JSON.stringify(onChainJson, null, 2)}
                  </pre>
                </details>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>⏳</span>
              <span>Pending on-chain recording</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related charter params */}
      {charter_param && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Related Charter Parameter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>{charter_param.title}</span>
              <Badge variant="outline" className="font-mono text-[9px]">{charter_param.param_key}</Badge>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Phase {charter_param.phase}</span>
              <span>Status: {charter_param.status}</span>
            </div>
            {charter_param.param_value && (
              <div className="text-xs">
                <span className="text-muted-foreground">Resolved value: </span>
                <span className="text-primary font-mono">{charter_param.param_value}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vote details table */}
      <VoteTable votes={votes} total={total_votes} />

      <div className="text-center pt-2">
        <a href="/proposals" className="text-primary text-sm hover:underline">
          ← Back to Proposals
        </a>
      </div>
    </div>
  );
}

export default function OutcomesPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <AppShell>
      {id ? <OutcomeContent id={id} /> : <p className="text-muted-foreground text-sm py-8 text-center">Invalid proposal ID.</p>}
    </AppShell>
  );
}
