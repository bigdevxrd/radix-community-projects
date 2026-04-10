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
import { API_URL, TG_BOT_URL } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";

interface ProposalDetail {
  id: number; title: string; type: string; status: string;
  options: string[] | null; created_at: number; ends_at: number;
  min_votes: number; creator_tg_id: number;
  counts: Record<string, number>; total_votes: number;
  amendments?: { id: number; title: string; status: string; round: number }[];
  charter_param?: string; category?: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", passed: "default", completed: "default",
  failed: "destructive", expired: "secondary", cancelled: "secondary",
  needs_amendment: "outline",
};

type ProposalClass = "charter_vote" | "community_vote" | "temp_check";
function classifyProposal(p: ProposalDetail): ProposalClass {
  if (p.type === "temp") return "temp_check";
  if (p.charter_param) return "charter_vote";
  return "community_vote";
}
const CLASS_LABEL: Record<ProposalClass, { label: string; badge: "default" | "secondary" | "outline"; desc: string }> = {
  charter_vote: { label: "Binding Decision", badge: "default", desc: "This vote directly updates the DAO Charter. The result is binding." },
  community_vote: { label: "Community Vote", badge: "secondary", desc: "A formal community vote. Results inform DAO direction." },
  temp_check: { label: "Gauging Interest", badge: "outline", desc: "A quick, non-binding pulse check. 24 hours, low threshold." },
};

function ProposalDetailContent() {
  const params = useParams();
  const id = params?.id;
  const { account, connected, badge } = useWallet();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);
  const [voteError, setVoteError] = useState("");

  async function handleVote(choice: string) {
    if (!account || !proposal) return;
    setVoting(true); setVoteError("");
    try {
      const resp = await fetch(API_URL + "/proposals/" + proposal.id + "/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account, vote: choice }),
      });
      const data = await resp.json();
      if (data.ok) {
        setVoted(choice);
        // Update counts immediately
        if (data.data?.counts && proposal) {
          setProposal({ ...proposal, counts: data.data.counts, total_votes: Object.values(data.data.counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0) });
        }
      } else {
        setVoteError(data.error === "already_voted" ? "You already voted on this proposal." : data.error || "Vote failed");
      }
    } catch (_) { setVoteError("Network error — try again"); }
    setVoting(false);
  }

  const fetchData = () => {
    if (!id) return;
    setLoading(true); setError(false);
    fetch(API_URL + "/proposals/" + id)
      .then(r => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(d => {
        if (d.data) {
          const p = d.data;
          // Build counts if not present
          if (!p.counts) p.counts = {};
          if (!p.total_votes) p.total_votes = Object.values(p.counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
          setProposal(p);
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Card><CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm mb-3">
              {error ? "Failed to load proposal" : "Proposal not found"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
              <Link href="/proposals"><Button variant="ghost" size="sm">Back to Proposals</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = proposal.status === "active";
  const endDate = new Date(proposal.ends_at * 1000);
  const createdDate = new Date(proposal.created_at * 1000);
  const now = Date.now();
  const timeLeft = endDate.getTime() - now;
  const timeLeftStr = timeLeft > 0
    ? timeLeft > 86400000 ? Math.floor(timeLeft / 86400000) + "d left"
      : timeLeft > 3600000 ? Math.floor(timeLeft / 3600000) + "h left"
      : Math.floor(timeLeft / 60000) + "m left"
    : "Ended";

  // Sort options by vote count descending
  const sortedOptions = Object.entries(proposal.counts)
    .sort(([, a], [, b]) => b - a);
  const maxVotes = sortedOptions.length > 0 ? sortedOptions[0][1] : 0;

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link href="/proposals" className="text-sm text-muted-foreground hover:text-foreground no-underline">
        ← Back to Proposals
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-muted-foreground font-mono text-xs mr-2">#{proposal.id}</span>
              <span className="font-bold text-lg">{proposal.title}</span>
            </div>
            <Badge variant={STATUS_VARIANT[proposal.status] || "secondary"} className="text-sm">
              {proposal.status}
            </Badge>
          </div>
          {(() => { const cls = classifyProposal(proposal); const cfg = CLASS_LABEL[cls]; return (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={cfg.badge} className="text-xs">{cfg.label}</Badge>
              <span className="text-xs text-muted-foreground">{cfg.desc}</span>
            </div>
          ); })()}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Created: {createdDate.toLocaleDateString()}</span>
            <span>{isActive ? timeLeftStr : "Ended " + endDate.toLocaleDateString()}</span>
            <span>Min votes: {proposal.min_votes}</span>
          </div>
          {proposal.charter_param && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs font-mono">{proposal.charter_param}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vote Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Results ({proposal.total_votes} vote{proposal.total_votes !== 1 ? "s" : ""})
            </CardTitle>
            {isActive && !connected && (
              <span className="text-xs text-muted-foreground">Connect wallet to vote</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No votes yet</p>
          ) : (
            <div className="space-y-3">
              {sortedOptions.map(([opt, count], i) => {
                const pct = proposal.total_votes > 0 ? Math.round((count / proposal.total_votes) * 100) : 0;
                const isWinner = i === 0 && !isActive && count > 0;
                return (
                  <div key={opt}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm capitalize ${isWinner ? "font-bold text-primary" : ""}`}>
                        {opt} {isWinner && "✓"}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className={`h-3 ${isWinner ? "" : ""}`} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vote Buttons */}
      {isActive && connected && (
        <Card>
          <CardContent className="py-4 space-y-3">
            {voted ? (
              <div className="text-center">
                <Badge variant="default" className="text-sm">Voted: {voted}</Badge>
                <p className="text-xs text-muted-foreground mt-1">+10 XP earned</p>
              </div>
            ) : voteError ? (
              <div className="text-center">
                <p className="text-xs text-red-400">{voteError}</p>
                {voteError !== "You already voted on this proposal." && (
                  <p className="text-[10px] text-muted-foreground mt-1">You can also vote via <a href={TG_BOT_URL} target="_blank" className="text-primary hover:underline">Telegram</a></p>
                )}
              </div>
            ) : (
              <>
                <div className="text-xs text-muted-foreground text-center mb-2">Cast your vote{!badge && " (badge recommended for XP)"}</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {proposal.type === "yesno" ? (
                    <>
                      <Button variant="default" size="sm" onClick={() => handleVote("for")} disabled={voting}>For</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleVote("against")} disabled={voting}>Against</Button>
                      <Button variant="outline" size="sm" onClick={() => handleVote("amend")} disabled={voting}>Amend</Button>
                    </>
                  ) : (
                    (proposal.options || Object.keys(proposal.counts)).map(opt => (
                      <Button key={opt} variant="outline" size="sm" onClick={() => handleVote(opt)} disabled={voting}>{opt}</Button>
                    ))
                  )}
                </div>
                {voting && <p className="text-xs text-muted-foreground text-center">Submitting vote...</p>}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Amendments */}
      {proposal.amendments && proposal.amendments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Amendments ({proposal.amendments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {proposal.amendments.map(a => (
                <Link key={a.id} href={`/proposals/${a.id}`}
                  className="flex items-center justify-between py-2 border-b last:border-0 no-underline text-foreground hover:bg-muted/50 -mx-2 px-2 rounded">
                  <div>
                    <span className="text-muted-foreground font-mono text-xs mr-2">#{a.id}</span>
                    <span className="text-sm">{a.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">Round {a.round}</span>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status] || "secondary"} className="text-[10px]">{a.status}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Created</span>
              <span className="font-mono text-xs">{createdDate.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${isActive ? "bg-yellow-500 animate-pulse" : "bg-primary"}`} />
              <span className="text-muted-foreground">{isActive ? "Voting ends" : "Voting ended"}</span>
              <span className="font-mono text-xs">{endDate.toLocaleString()}</span>
            </div>
            {!isActive && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Result</span>
                <Badge variant={STATUS_VARIANT[proposal.status] || "secondary"} className="text-[10px]">{proposal.status}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProposalDetailPage() {
  return <AppShell><ProposalDetailContent /></AppShell>;
}
