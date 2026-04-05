"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_URL } from "@/lib/constants";

interface ProposalDetail {
  id: number;
  title: string;
  type: string;
  status: string;
  created_at: number;
  ends_at: number;
  min_votes: number;
  charter_param: string | null;
  stage: string | null;
  round: number;
  counts: Record<string, number>;
  amendments: ProposalDetail[];
}

interface CharterParam {
  param_key: string;
  title: string;
  category: string;
  phase: number;
  status: string;
  param_value: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  passed: "default",
  completed: "default",
  failed: "destructive",
  expired: "secondary",
  cancelled: "secondary",
  needs_amendment: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  passed: "✅ Passed",
  completed: "✅ Completed",
  failed: "❌ Failed",
  expired: "⏰ Expired",
  cancelled: "🚫 Cancelled",
  needs_amendment: "🔄 Needs Amendment",
  active: "🗳️ Active",
};

function VoteBar({ option, count, total }: { option: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium capitalize">{option}</span>
        <span className="font-mono text-muted-foreground">{count} votes ({pct}%)</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function OutcomeContent() {
  const params = useParams();
  const id = params?.id as string;
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [charterParam, setCharterParam] = useState<CharterParam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(API_URL + "/proposals/" + id)
      .then((r) => r.json())
      .then(async (resp) => {
        if (!resp.ok) { setError("Proposal not found"); setLoading(false); return; }
        const p = resp.data as ProposalDetail;
        setProposal(p);

        // Load related charter param if linked
        if (p.charter_param) {
          try {
            const charterResp = await fetch(API_URL + "/charter").then((r) => r.json());
            const found = charterResp?.data?.params?.find(
              (cp: CharterParam) => cp.param_key === p.charter_param
            );
            if (found) setCharterParam(found);
          } catch {
            // Charter param load failure is non-critical; proposal outcome still displays
          }
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load proposal"); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "Proposal not found"}</AlertDescription>
      </Alert>
    );
  }

  const totalVotes = Object.values(proposal.counts).reduce((a, b) => a + b, 0);
  const quorumMet = totalVotes >= proposal.min_votes;
  const isResolved = proposal.status !== "active";

  // Determine winning option
  let winner: string | null = null;
  if (isResolved && totalVotes > 0) {
    const sorted = Object.entries(proposal.counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) winner = sorted[0][0];
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/proposals" className="hover:text-foreground transition-colors">Proposals</Link>
        <span>/</span>
        <span>#{proposal.id}</span>
        <span>/</span>
        <span className="text-foreground font-medium">Outcome</span>
      </div>

      {/* Proposal Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base leading-snug">{proposal.title}</CardTitle>
            <Badge variant={STATUS_VARIANT[proposal.status] || "secondary"} className="shrink-0">
              {proposal.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: "Type", value: proposal.type || "yesno" },
              { label: "Round", value: proposal.round || 1 },
              { label: "Created", value: new Date(proposal.created_at * 1000).toLocaleDateString() },
              { label: "Ended", value: new Date(proposal.ends_at * 1000).toLocaleDateString() },
            ].map((f) => (
              <div key={f.label} className="bg-muted rounded px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</div>
                <div className="font-mono font-semibold mt-0.5">{f.value}</div>
              </div>
            ))}
          </div>

          {/* Quorum Status */}
          <div className="flex items-center justify-between text-xs bg-muted rounded px-3 py-2">
            <span className="text-muted-foreground">Quorum ({proposal.min_votes} required)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{totalVotes} votes cast</span>
              <Badge variant={quorumMet ? "default" : "destructive"} className="text-[9px]">
                {quorumMet ? "Met" : "Not Met"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vote Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Vote Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {totalVotes === 0 ? (
            <p className="text-muted-foreground text-sm">No votes recorded.</p>
          ) : (
            Object.entries(proposal.counts)
              .sort((a, b) => b[1] - a[1])
              .map(([opt, count]) => (
                <VoteBar key={opt} option={opt} count={count} total={totalVotes} />
              ))
          )}
          <div className="text-xs text-muted-foreground pt-1">Total: {totalVotes} votes</div>
        </CardContent>
      </Card>

      {/* Result */}
      {isResolved && (
        <Card className={proposal.status === "passed" || proposal.status === "completed" ? "border-green-500/30 bg-green-500/5" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-lg font-bold">
              {STATUS_LABEL[proposal.status] || proposal.status}
            </div>
            {winner && (
              <div className="text-sm text-muted-foreground">
                Leading option: <span className="font-semibold capitalize text-foreground">{winner}</span>
                {" "}({proposal.counts[winner]} votes, {totalVotes > 0 ? Math.round((proposal.counts[winner] / totalVotes) * 100) : 0}%)
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Closed: {new Date(proposal.ends_at * 1000).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* On-chain Recording Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">On-chain Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Proposal outcomes are recorded on-chain via the Radix ledger. Once recorded, the transaction hash provides
            permanent, verifiable proof of the governance decision.
          </p>
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Outcome Snapshot (JSON)</div>
            <pre className="text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify({
                proposal_id: proposal.id,
                title: proposal.title,
                status: proposal.status,
                type: proposal.type,
                votes: proposal.counts,
                total_votes: totalVotes,
                quorum_required: proposal.min_votes,
                quorum_met: quorumMet,
                winner: winner,
                closed_at: proposal.ends_at,
                charter_param: proposal.charter_param || null,
              }, null, 2)}
            </pre>
          </div>
          <a
            href="https://dashboard.radixdlt.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="text-xs">
              View on Radix Dashboard ↗
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Related Charter Param */}
      {charterParam && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Related Charter Parameter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">{charterParam.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Phase {charterParam.phase} · {charterParam.category}</div>
              </div>
              <Badge variant={charterParam.status === "resolved" ? "default" : "outline"} className="shrink-0 text-[10px]">
                {charterParam.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{charterParam.param_key}</span>
            </div>
            {charterParam.param_value && (
              <div className="bg-muted rounded px-3 py-2 text-xs">
                <span className="text-muted-foreground">Resolved value: </span>
                <span className="font-mono font-semibold">{charterParam.param_value}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Amendments */}
      {proposal.amendments && proposal.amendments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Amendment Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {proposal.amendments.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs py-2 border-b last:border-0">
                  <div>
                    <span className="text-muted-foreground font-mono mr-2">Round {a.round}</span>
                    <span>{a.title}</span>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status] || "secondary"} className="text-[9px]">{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Link href="/proposals">
          <Button variant="outline" size="sm">← All Proposals</Button>
        </Link>
        <Link href="/analytics">
          <Button variant="ghost" size="sm">Analytics →</Button>
        </Link>
      </div>
    </div>
  );
}

export default function OutcomesPage() {
  return <AppShell><OutcomeContent /></AppShell>;
}
