"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoTip } from "@/components/InfoTip";
import { useWallet } from "@/hooks/useWallet";
import { API_URL } from "@/lib/constants";
import Link from "next/link";

interface Proposal {
  id: number; title: string; type: string; status: string;
  options: string[] | null; counts: Record<string, number>;
  total_votes: number; ends_at: number; created_at: number;
}
interface Decision {
  id: number; proposal_id: number | null; phase: number;
  depends_on: number[]; radixtalk_topic_id: number | null;
  radixtalk_url: string | null; summary: string; title: string;
  status: string; sort_order: number; proposal: Proposal | null;
  unlocked: boolean;
}
interface RadixTalkTopic {
  id: number; title: string; posts_count: number;
  views: number; url: string;
}

function DecisionsContent() {
  const { account, connected } = useWallet();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [topics, setTopics] = useState<RadixTalkTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);
  const [voteSuccess, setVoteSuccess] = useState("");
  const [voteError, setVoteError] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(API_URL + "/decisions").then(r => r.json()).catch(() => null),
      fetch(API_URL + "/decisions/radixtalk").then(r => r.json()).catch(() => null),
    ]).then(([d, rt]) => {
      setDecisions(d?.data || []);
      setTopics(rt?.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  async function handleVote(proposalId: number, vote: string) {
    if (!account) return;
    setVoting(proposalId); setVoteSuccess(""); setVoteError("");
    try {
      const resp = await fetch(API_URL + "/proposals/" + proposalId + "/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account, vote }),
      });
      const data = await resp.json();
      if (data.ok) {
        setVoteSuccess("Vote recorded!");
        setTimeout(() => { fetchData(); setVoteSuccess(""); }, 2000);
      } else {
        setVoteError(data.error === "already_voted" ? "You already voted on this" : (data.error || "Vote failed"));
      }
    } catch { setVoteError("Network error"); }
    setVoting(null);
  }

  const activeCount = decisions.filter(d => d.unlocked && d.proposal?.status === "active").length;
  const phase1 = decisions.filter(d => d.phase === 1);
  const phase2 = decisions.filter(d => d.phase === 2);

  // RadixTalk topics not already linked to a decision
  const linkedTopicIds = new Set(decisions.filter(d => d.radixtalk_topic_id).map(d => d.radixtalk_topic_id));
  const unlinkedTopics = topics.filter(t => !linkedTopicIds.has(t.id) && t.posts_count > 1);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Decisions</h1>
          <InfoTip text="Real governance decisions happening now. Vote on temp checks to signal your preference. Binding votes happen on-chain via CV2." link="/docs" />
          {activeCount > 0 && (
            <Badge variant="default" className="text-[10px]">{activeCount} need input</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Shape the DAO. Each decision unlocks the next. Vote on what matters to you.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <>
          {/* Decision Tree Visual */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-1 flex-wrap text-[11px]">
                {decisions.map((d, i) => {
                  const resolved = d.proposal?.status === "passed" || d.proposal?.status === "completed";
                  const active = d.unlocked && d.proposal?.status === "active";
                  return (
                    <div key={d.id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground/30 mx-0.5">&rarr;</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        resolved ? "bg-primary/20 text-primary" :
                        active ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {d.title.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Phase 1: Foundation */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Phase 1: Foundation</h2>
              <Badge variant="secondary" className="text-[9px]">{phase1.length} decisions</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {phase1.map(d => <DecisionCard key={d.id} decision={d} onVote={handleVote} voting={voting} connected={connected} />)}
            </div>
          </div>

          {/* Phase 2: Structure */}
          {phase2.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Phase 2: Structure</h2>
                <Badge variant="outline" className="text-[9px]">Unlocks after Phase 1</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {phase2.map(d => <DecisionCard key={d.id} decision={d} onVote={handleVote} voting={voting} connected={connected} />)}
              </div>
            </div>
          )}

          {/* Alerts */}
          {(voteSuccess || voteError) && (
            <Alert variant={voteError ? "destructive" : "default"}>
              <AlertDescription>{voteError || voteSuccess}</AlertDescription>
            </Alert>
          )}

          {/* RadixTalk Discussions */}
          {unlinkedTopics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">RadixTalk Discussions</h2>
                <InfoTip text="Live governance threads from RadixTalk. Read the context before voting on formal proposals above." />
                <Badge variant="outline" className="text-[9px]">{unlinkedTopics.length} threads</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unlinkedTopics.slice(0, 8).map(t => (
                  <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                    className="block no-underline text-foreground">
                    <Card className="hover:bg-accent/5 transition-colors h-full">
                      <CardContent className="pt-4 pb-4">
                        <div className="text-sm font-semibold mb-1">{t.title.slice(0, 60)}{t.title.length > 60 ? "..." : ""}</div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{t.posts_count} replies</span>
                          <span>{t.views} views</span>
                          <Badge variant="outline" className="text-[8px]">RadixTalk</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!connected && (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground text-sm">Connect your wallet to vote on decisions.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DecisionCard({ decision: d, onVote, voting, connected }: {
  decision: Decision; onVote: (id: number, vote: string) => void;
  voting: number | null; connected: boolean;
}) {
  const p = d.proposal;
  const resolved = p?.status === "passed" || p?.status === "completed";
  const active = d.unlocked && p?.status === "active";
  const locked = !d.unlocked;

  // Time remaining
  let timeLeft = "";
  if (p && p.ends_at) {
    const diff = p.ends_at * 1000 - Date.now();
    if (diff <= 0) timeLeft = "Ended";
    else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      timeLeft = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    }
  }

  // Vote options
  const options = p?.type === "yesno" ? ["for", "against"] : (p?.options || []);
  const totalVotes = p?.total_votes || 0;

  return (
    <Card className={`transition-all ${
      resolved ? "border-primary/30 bg-primary/5" :
      active ? "border-yellow-500/30" :
      locked ? "opacity-50" : ""
    }`}>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold">{d.title}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{d.summary}</div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {resolved && <Badge variant="default" className="text-[8px]">Resolved</Badge>}
            {active && <Badge variant="secondary" className="text-[8px]">{timeLeft}</Badge>}
            {locked && <Badge variant="outline" className="text-[8px]">Locked</Badge>}
            {p && <Badge variant="outline" className="text-[8px]">{p.type === "yesno" ? "Yes/No" : "Poll"}</Badge>}
          </div>
        </div>

        {/* Vote results / options */}
        {p && active && connected && (
          <div className="space-y-1.5">
            {options.map(opt => {
              const count = p.counts[opt] || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return (
                <Button key={opt} variant="outline" size="sm"
                  className="w-full justify-between h-8 text-xs"
                  disabled={voting === p.id}
                  onClick={() => onVote(p.id, opt)}>
                  <span className="capitalize">{opt}</span>
                  <span className="font-mono text-muted-foreground">{count} ({pct}%)</span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Results for resolved */}
        {p && resolved && (
          <div className="space-y-1">
            {options.map(opt => {
              const count = p.counts[opt] || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return (
                <div key={opt}>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span className="capitalize">{opt}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-1" />
                </div>
              );
            })}
          </div>
        )}

        {/* Locked message */}
        {locked && d.depends_on.length > 0 && (
          <div className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-1.5">
            Requires: Decision{d.depends_on.length > 1 ? "s" : ""} #{d.depends_on.join(", #")} to be resolved first
          </div>
        )}

        {/* Not connected */}
        {p && active && !connected && (
          <div className="text-[10px] text-muted-foreground">Connect wallet to vote</div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {totalVotes > 0 && <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>}
          {d.radixtalk_url && (
            <a href={d.radixtalk_url} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline">Read discussion</a>
          )}
          {p && <Link href={`/proposals/${p.id}`} className="text-primary hover:underline">Full proposal</Link>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DecisionsPage() {
  return <AppShell><DecisionsContent /></AppShell>;
}
