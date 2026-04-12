"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoTip } from "@/components/InfoTip";
import { useWallet } from "@/hooks/useWallet";
import { API_URL } from "@/lib/constants";
import Link from "next/link";

interface DProposal {
  id: number; title: string; type: string; status: string;
  options: string[] | null; counts: Record<string, number>;
  total_votes: number; ends_at: number;
}
interface Decision {
  id: number; proposal_id: number | null; phase: number;
  depends_on: number[]; radixtalk_topic_id: number | null;
  radixtalk_url: string | null; summary: string; title: string;
  status: string; proposal: DProposal | null;
  unlocked: boolean; category: string;
}
interface RadixTalkTopic { id: number; title: string; posts_count: number; views: number; url: string; }

export function DecisionsView() {
  const { account, connected } = useWallet();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [topics, setTopics] = useState<RadixTalkTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);
  const [voteMsg, setVoteMsg] = useState("");

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
    setVoting(proposalId); setVoteMsg("");
    try {
      const resp = await fetch(API_URL + "/proposals/" + proposalId + "/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account, vote }),
      });
      const data = await resp.json();
      if (data.ok) {
        setVoteMsg("Vote recorded!");
        setTimeout(() => { fetchData(); setVoteMsg(""); }, 2000);
      } else {
        setVoteMsg(data.error === "already_voted" ? "Already voted" : (data.error || "Failed"));
      }
    } catch { setVoteMsg("Network error"); }
    setVoting(null);
  }

  type Category = { key: string; label: string; badge: string; items: Decision[] };
  const categories: Category[] = [
    { key: "charter-1", label: "Phase 1: Foundation", badge: "Must resolve first", items: decisions.filter(d => d.phase === 1) },
    { key: "charter-2", label: "Phase 2: Configuration", badge: "Unlocks after Phase 1", items: decisions.filter(d => d.phase === 2) },
    { key: "charter-3", label: "Phase 3: Operations", badge: "Unlocks after Phase 2", items: decisions.filter(d => d.phase === 3) },
    { key: "structural", label: "Structural Decisions", badge: "Parallel track", items: decisions.filter(d => d.category === "structural") },
    { key: "p3", label: "P3 Service Transitions", badge: "Foundation handover", items: decisions.filter(d => d.category === "p3_services") },
  ].filter(c => c.items.length > 0);

  const linkedTopicIds = new Set(decisions.filter(d => d.radixtalk_topic_id).map(d => d.radixtalk_topic_id));
  const unlinkedTopics = topics.filter(t => !linkedTopicIds.has(t.id) && t.posts_count > 1);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading decisions...</div>;

  return (
    <div className="space-y-5">
      <div className="bg-yellow-500/10 rounded px-2.5 py-1.5">
        <p className="text-[10px] text-yellow-500 font-semibold">TEMP CHECKS — All votes are non-binding pulse checks. Results inform formal proposals. Flow: Temp Check &rarr; Review &rarr; Formal Proposal &rarr; Binding On-Chain Vote.</p>
      </div>

      {/* Decision Tree Mini */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1 flex-wrap text-[11px]">
            {decisions.slice(0, 12).map((d, i) => {
              const resolved = d.status === "resolved";
              const active = d.unlocked && d.proposal?.status === "active";
              return (
                <div key={d.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground/30 mx-0.5">&rarr;</span>}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    resolved ? "bg-primary/20 text-primary" : active ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground"
                  }`}>{d.title.split(" ").slice(0, 2).join(" ")}</span>
                </div>
              );
            })}
            {decisions.length > 12 && <span className="text-[10px] text-muted-foreground">+{decisions.length - 12} more</span>}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      {categories.map(cat => (
        <div key={cat.key}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{cat.label}</h2>
            <Badge variant={cat.key === "charter-1" ? "secondary" : "outline"} className="text-[9px]">{cat.items.length}</Badge>
            <span className="text-[9px] text-muted-foreground">{cat.badge}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cat.items.map(d => {
              const p = d.proposal;
              const resolved = d.status === "resolved";
              const active = d.unlocked && p?.status === "active";
              const locked = !d.unlocked;
              const options = p?.type === "yesno" ? ["for", "against"] : (p?.options || []);
              const totalVotes = p?.total_votes || 0;
              let timeLeft = "";
              if (p?.ends_at) {
                const diff = p.ends_at * 1000 - Date.now();
                if (diff <= 0) timeLeft = "Ended";
                else { const days = Math.floor(diff / 86400000); const hours = Math.floor((diff % 86400000) / 3600000); timeLeft = days > 0 ? `${days}d ${hours}h` : `${hours}h`; }
              }

              return (
                <Card key={d.id} className={`transition-all ${resolved ? "border-primary/30 bg-primary/5" : active ? "border-yellow-500/30" : locked ? "opacity-50" : ""}`}>
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">{d.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{d.summary}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {resolved && <Badge variant="default" className="text-[8px]">Resolved</Badge>}
                        {active && <Badge variant="secondary" className="text-[8px]">{timeLeft}</Badge>}
                        {locked && <Badge variant="outline" className="text-[8px]">Locked</Badge>}
                        {p?.type === "temp" && <Badge variant="outline" className="text-[8px] text-yellow-500 border-yellow-500">Temp Check</Badge>}
                      </div>
                    </div>
                    {p && active && connected && (
                      <div className="space-y-1.5">
                        {options.map(opt => {
                          const count = p.counts[opt] || 0;
                          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                          return (
                            <Button key={opt} variant="outline" size="sm" className="w-full justify-between h-8 text-xs"
                              disabled={voting === p.id} onClick={() => handleVote(p.id, opt)}>
                              <span className="capitalize">{opt}</span>
                              <span className="font-mono text-muted-foreground">{count} ({pct}%)</span>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                    {p && resolved && (
                      <div className="space-y-1">
                        {options.map(opt => {
                          const count = p.counts[opt] || 0;
                          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                          return (
                            <div key={opt}>
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                                <span className="capitalize">{opt}</span><span>{count} ({pct}%)</span>
                              </div>
                              <Progress value={pct} className="h-1" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {locked && d.depends_on.length > 0 && (
                      <div className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-1.5">
                        Requires: Decision{d.depends_on.length > 1 ? "s" : ""} #{d.depends_on.join(", #")} to resolve first
                      </div>
                    )}
                    {p && active && !connected && <div className="text-[10px] text-muted-foreground">Connect wallet to vote</div>}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {totalVotes > 0 && <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>}
                      {d.radixtalk_url && <a href={d.radixtalk_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Read discussion</a>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {voteMsg && <Alert variant={voteMsg.includes("error") || voteMsg.includes("Failed") ? "destructive" : "default"}><AlertDescription>{voteMsg}</AlertDescription></Alert>}

      {/* RadixTalk */}
      {unlinkedTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">RadixTalk Discussions</h2>
            <InfoTip text="Live governance threads from RadixTalk. Read context before voting." />
            <Badge variant="outline" className="text-[9px]">{unlinkedTopics.length} threads</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlinkedTopics.slice(0, 8).map(t => (
              <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer" className="block no-underline text-foreground">
                <Card className="hover:bg-accent/5 transition-colors h-full">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-sm font-semibold mb-1">{t.title.slice(0, 60)}{t.title.length > 60 ? "..." : ""}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{t.posts_count} replies</span><span>{t.views} views</span>
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
    </div>
  );
}
