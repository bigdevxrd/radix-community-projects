"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_URL, CV2_COMPONENT } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import { makeTemperatureCheckManifest, voteOnTemperatureCheckManifest } from "@/lib/manifests";

interface Proposal {
  id: number; title: string; type: string; status: string;
  created_at: number; ends_at: number;
  counts: Record<string, number>; total_votes: number;
}
interface CV2Status {
  enabled: boolean; deployed: boolean; component: string;
  temperatureCheckCount: number; proposalCount: number;
  lastSync: number | null; errors: number;
}
interface CV2Proposal {
  id: string; type: string; title: string; short_description: string;
  vote_count: number; revote_count: number; quorum: string;
  vote_options: string; hidden: number;
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
  proposal_type?: string; options?: string; param_value?: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", passed: "default", completed: "default",
  failed: "destructive", expired: "secondary", cancelled: "secondary",
  needs_amendment: "outline",
};

function ProposalsContent() {
  const { account, connected, rdt } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [charter, setCharter] = useState<{ status: CharterStatus; ready: CharterParam[]; params: CharterParam[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [cv2Status, setCv2Status] = useState<CV2Status | null>(null);
  const [cv2Proposals, setCv2Proposals] = useState<CV2Proposal[]>([]);
  const [showCreateTC, setShowCreateTC] = useState(false);
  const [tcTitle, setTcTitle] = useState("");
  const [tcDesc, setTcDesc] = useState("");
  const [tcSubmitting, setTcSubmitting] = useState(false);
  const [tcResult, setTcResult] = useState("");
  const [tcError, setTcError] = useState("");

  async function handleCreateTC() {
    if (!rdt || !account || !tcTitle.trim()) return;
    const desc = tcDesc.trim() || tcTitle.trim();
    setTcSubmitting(true); setTcResult(""); setTcError("");
    try {
      const manifest = makeTemperatureCheckManifest(
        CV2_COMPONENT, account, tcTitle.trim(), desc, desc,
        ["For", "Against"]
      );
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setTcResult("Temperature check created on-chain!");
        setTcTitle(""); setTcDesc(""); setShowCreateTC(false);
        setTimeout(() => fetchData(), 5000);
      } else { setTcError(JSON.stringify(result.error)); }
    } catch (e: unknown) { setTcError(e instanceof Error ? e.message : "Transaction failed"); }
    setTcSubmitting(false);
  }

  async function handleVoteTC(tcId: number, vote: "for" | "against") {
    if (!rdt || !account) return;
    try {
      const manifest = voteOnTemperatureCheckManifest(CV2_COMPONENT, account, tcId, vote);
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) { setTimeout(() => fetchData(), 5000); }
    } catch (e) { console.error("Vote failed:", e); }
  }

  const fetchData = () => {
    setLoading(true); setError(false);
    Promise.all([
      fetch(API_URL + "/proposals").then((r) => r.json()),
      fetch(API_URL + "/stats").then((r) => r.json()),
      fetch(API_URL + "/charter").then((r) => r.json()),
      fetch(API_URL + "/cv2/status").then((r) => r.json()).catch(() => null),
      fetch(API_URL + "/cv2/proposals").then((r) => r.json()).catch(() => null),
    ]).then(([p, s, c, cv2s, cv2p]) => {
      setProposals(p.data || []);
      setStats(s.data || null);
      setCharter(c?.data || null);
      setCv2Status(cv2s?.data || null);
      setCv2Proposals(cv2p?.data || []);
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const active = proposals.filter((p) => p.status === "active");
  const archived = proposals.filter((p) => p.status !== "active");
  const visible = showArchived ? proposals : active;

  return (
    <div className="space-y-5">
      {/* Error State */}
      {error && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">Failed to load proposals</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

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
                <div className="text-xs font-semibold text-muted-foreground mb-2">Ready to vote ({charter.ready.length}):</div>
                <div className="space-y-2">
                  {charter.ready.slice(0, 6).map((p: CharterParam) => {
                    const opts = p.options ? JSON.parse(p.options) as string[] : null;
                    return (
                      <div key={p.param_key} className="bg-muted rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">{p.title}</span>
                          <Badge variant="outline" className="text-[9px] font-mono">{p.proposal_type || "poll"}</Badge>
                        </div>
                        {opts && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {opts.map((o: string) => (
                              <Badge key={o} variant="secondary" className="text-[10px]">{o}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <a href="https://t.me/rad_gov" target="_blank">
                    <Button variant="default" size="sm" className="w-full">Vote in Telegram</Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Network Governance (On-Chain CV2) */}
      {cv2Status && cv2Status.enabled && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Network Governance</CardTitle>
                <Badge variant="outline" className="text-[9px]">On-Chain</Badge>
              </div>
              <Badge variant={cv2Status.deployed ? "default" : "secondary"} className="text-[9px]">
                {cv2Status.deployed ? "Live" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Formal on-chain governance powered by Consultation v2. Votes are XRD-weighted.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Temp Checks</div>
                <div className="text-lg font-bold font-mono text-primary">{cv2Status.temperatureCheckCount}</div>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Proposals</div>
                <div className="text-lg font-bold font-mono text-primary">{cv2Status.proposalCount}</div>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Sync</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">
                  {cv2Status.lastSync ? new Date(cv2Status.lastSync * 1000).toLocaleTimeString() : "—"}
                </div>
              </div>
            </div>

            {cv2Proposals.length > 0 ? (
              <div className="space-y-2">
                {cv2Proposals.map(p => {
                  const uniqueVotes = p.vote_count - p.revote_count;
                  const opts = p.vote_options ? JSON.parse(p.vote_options) as string[] : [];
                  return (
                    <div key={p.id} className="bg-muted rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{p.title}</span>
                        <Badge variant={p.type === "temperature_check" ? "secondary" : "default"} className="text-[9px]">
                          {p.type === "temperature_check" ? "Temp Check" : "Proposal"}
                        </Badge>
                      </div>
                      {p.short_description && (
                        <p className="text-xs text-muted-foreground mb-1.5">{p.short_description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{uniqueVotes} vote{uniqueVotes !== 1 ? "s" : ""}</span>
                        <span>Quorum: {p.quorum} XRD</span>
                      </div>
                      {opts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {opts.map((o: string) => (
                            <Badge key={o} variant="secondary" className="text-[10px]">{o}</Badge>
                          ))}
                        </div>
                      )}
                      {connected && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="default" onClick={() => handleVoteTC(parseInt(p.id.replace(/\D/g, "")), "for")} className="text-xs">Vote For</Button>
                          <Button size="sm" variant="outline" onClick={() => handleVoteTC(parseInt(p.id.replace(/\D/g, "")), "against")} className="text-xs">Vote Against</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-xs mb-2">No on-chain consultations yet.</p>
              </div>
            )}

            {/* Create Temperature Check */}
            {!showCreateTC && (
              <Button variant="default" size="sm" onClick={() => {
                if (!connected) { alert("Connect your wallet first"); return; }
                setShowCreateTC(true);
              }} className="w-full">
                Create Temperature Check
              </Button>
            )}
            {showCreateTC && (
              <div className="space-y-3 bg-muted rounded-lg p-4">
                <div className="text-sm font-semibold">New Temperature Check</div>
                <Input value={tcTitle} onChange={e => setTcTitle(e.target.value)} placeholder="Title" className="text-sm" maxLength={200} />
                <Input value={tcDesc} onChange={e => setTcDesc(e.target.value)} placeholder="Description" className="text-sm" maxLength={500} />
                <div className="text-[11px] text-muted-foreground">Options: For / Against (default). Runs for 3 days. Quorum: 1000 XRD.</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateTC} disabled={tcSubmitting || !tcTitle.trim()}>
                    {tcSubmitting ? "Submitting..." : "Create On-Chain"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateTC(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {(tcResult || tcError) && (
              <Alert variant={tcError ? "destructive" : "default"}>
                <AlertDescription>{tcError || tcResult}</AlertDescription>
              </Alert>
            )}

            <div className="text-[10px] text-muted-foreground">
              Component: <span className="font-mono">{cv2Status.component.slice(0, 20)}...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-tier label */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[9px]">Off-Chain</Badge>
        <span>Guild votes below are free, badge-gated, managed via Telegram</span>
      </div>

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
                    <Link href={`/proposals/${p.id}`} className="font-semibold text-sm hover:text-primary no-underline text-foreground">{p.title}</Link>
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
