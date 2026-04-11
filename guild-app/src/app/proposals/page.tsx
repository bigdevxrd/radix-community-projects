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
import { API_URL, CV2_COMPONENT, TG_BOT_URL } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import { makeTemperatureCheckManifest, voteOnTemperatureCheckManifest, stakeOnCv3ProposalManifest, createCv3ProposalManifest } from "@/lib/manifests";
import { CV3_COMPONENT, BADGE_NFT } from "@/lib/constants";
import { InfoTip } from "@/components/InfoTip";

interface Proposal {
  id: number; title: string; type: string; status: string;
  created_at: number; ends_at: number;
  counts: Record<string, number>; total_votes: number;
  charter_param?: string; category?: string;
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
interface CV3Status {
  enabled: boolean; component: string;
  proposalCount: number; poolBalance: number;
  lastSync: number | null; errors: number;
}
interface CV3Proposal {
  id: number; title: string; description: string | null;
  requested_amount: number; conviction: number; threshold: number;
  total_staked: number; weighted_staked: number; staker_count: number;
  status: string; task_bounty_id: number | null;
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

// ── Proposal Classification ──
type ProposalClass = "charter_vote" | "community_vote" | "temp_check";

function classifyProposal(p: Proposal): ProposalClass {
  if (p.type === "temp") return "temp_check";
  if (p.charter_param) return "charter_vote";
  return "community_vote";
}

const CLASS_CONFIG: Record<ProposalClass, { label: string; badge: "default" | "secondary" | "outline"; cta: string; border: string; tip: string }> = {
  charter_vote: { label: "Binding Decision", badge: "default", cta: "Vote now — this shapes the DAO", border: "border-l-4 border-l-primary", tip: "Charter votes that shape the DAO. Results are enforced on-chain." },
  community_vote: { label: "Community Vote", badge: "secondary", cta: "Have your say", border: "border-l-4 border-l-muted-foreground/30", tip: "Formal but non-binding. Signals community preference on a topic." },
  temp_check: { label: "Gauging Interest", badge: "outline", cta: "Quick pulse check — non-binding", border: "border-l-4 border-l-muted-foreground/15", tip: "24h quick pulse check. Non-binding temperature read." },
};

// Sort: charter votes first, then community, then temp checks
function classSort(a: Proposal, b: Proposal): number {
  const order: Record<ProposalClass, number> = { charter_vote: 0, community_vote: 1, temp_check: 2 };
  const diff = order[classifyProposal(a)] - order[classifyProposal(b)];
  if (diff !== 0) return diff;
  return a.ends_at - b.ends_at; // soonest-ending first within same class
}

function useCountdown(endTimestamp: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const diff = endTimestamp * 1000 - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function Countdown({ endsAt }: { endsAt: number }) {
  const text = useCountdown(endsAt);
  const diff = endsAt * 1000 - Date.now();
  const urgent = diff > 0 && diff < 86400000;
  return (
    <span className={`text-xs font-mono ${urgent ? "text-red-400 font-bold" : "text-muted-foreground"}`}>
      {text}
    </span>
  );
}

function ProposalsContent() {
  const { account, connected, rdt } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [charter, setCharter] = useState<{ status: CharterStatus; ready: CharterParam[]; params: CharterParam[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [cv2Status, setCv2Status] = useState<CV2Status | null>(null);
  const [cv3Status, setCv3Status] = useState<CV3Status | null>(null);
  const [cv3Proposals, setCv3Proposals] = useState<CV3Proposal[]>([]);
  const [stakingId, setStakingId] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakeSubmitting, setStakeSubmitting] = useState(false);
  const [stakeResult, setStakeResult] = useState("");
  const [stakeError, setStakeError] = useState("");

  // CV3 proposal creation
  const [showCreateCv3, setShowCreateCv3] = useState(false);
  const [cv3Title, setCv3Title] = useState("");
  const [cv3Desc, setCv3Desc] = useState("");
  const [cv3Amount, setCv3Amount] = useState("");
  const [cv3Beneficiary, setCv3Beneficiary] = useState("");
  const [cv3Creating, setCv3Creating] = useState(false);
  const [cv3CreateResult, setCv3CreateResult] = useState("");
  const [cv3CreateError, setCv3CreateError] = useState("");
  const [cv2Proposals, setCv2Proposals] = useState<CV2Proposal[]>([]);
  const [showCreateTC, setShowCreateTC] = useState(false);
  const [tcTitle, setTcTitle] = useState("");
  const [tcDesc, setTcDesc] = useState("");
  const [tcSubmitting, setTcSubmitting] = useState(false);
  const [tcResult, setTcResult] = useState("");
  const [tcError, setTcError] = useState("");

  // Off-chain proposal creation
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [propTitle, setPropTitle] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [propType, setPropType] = useState("yesno");
  const [propOptions, setPropOptions] = useState("");
  const [propDays, setPropDays] = useState("3");
  const [propSubmitting, setPropSubmitting] = useState(false);
  const [propResult, setPropResult] = useState("");
  const [propError, setPropError] = useState("");

  async function handleCreateProposal() {
    if (!propTitle.trim() || !account) return;
    setPropSubmitting(true); setPropResult(""); setPropError("");
    try {
      const body: Record<string, unknown> = {
        title: propTitle.trim(),
        description: propDesc.trim() || null,
        type: propType,
        days_active: parseInt(propDays) || 3,
        address: account,
      };
      if (propType === "multi" && propOptions.trim()) {
        body.options = propOptions.split(",").map(o => o.trim()).filter(Boolean);
      }
      const res = await fetch(API_URL + "/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setPropResult("Proposal #" + data.data.id + " created!");
        setPropTitle(""); setPropDesc(""); setPropType("yesno"); setPropOptions(""); setPropDays("3");
        setShowCreateProposal(false);
        fetchData();
      } else {
        setPropError(data.error || "Failed to create proposal");
      }
    } catch { setPropError("Network error"); }
    setPropSubmitting(false);
  }

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

  async function handleStake(proposalId: number) {
    if (!rdt || !account || !stakeAmount) return;
    setStakeSubmitting(true); setStakeResult(""); setStakeError("");
    try {
      const manifest = stakeOnCv3ProposalManifest(CV3_COMPONENT, BADGE_NFT, account, proposalId, stakeAmount);
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setStakeResult("Staked " + stakeAmount + " XRD on proposal #" + proposalId);
        setStakeAmount(""); setStakingId(null);
        setTimeout(() => fetchData(), 5000);
      } else { setStakeError(JSON.stringify(result.error)); }
    } catch (e: unknown) { setStakeError(e instanceof Error ? e.message : "Transaction failed"); }
    setStakeSubmitting(false);
  }

  async function handleCreateCv3() {
    if (!rdt || !account || !cv3Title.trim() || !cv3Amount) return;
    setCv3Creating(true); setCv3CreateResult(""); setCv3CreateError("");
    try {
      const beneficiary = cv3Beneficiary.trim() || account;
      const manifest = createCv3ProposalManifest(
        CV3_COMPONENT, BADGE_NFT, account,
        cv3Title.trim(), cv3Desc.trim() || cv3Title.trim(),
        cv3Amount, beneficiary
      );
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setCv3CreateResult("CV3 proposal created on-chain! The watcher will pick it up within 60s.");
        setCv3Title(""); setCv3Desc(""); setCv3Amount(""); setCv3Beneficiary("");
        setShowCreateCv3(false);
        setTimeout(() => fetchData(), 10000);
      } else { setCv3CreateError(JSON.stringify(result.error)); }
    } catch (e: unknown) { setCv3CreateError(e instanceof Error ? e.message : "Transaction failed"); }
    setCv3Creating(false);
  }

  const fetchData = () => {
    setLoading(true); setError(false);
    Promise.all([
      fetch(API_URL + "/proposals").then((r) => r.json()),
      fetch(API_URL + "/stats").then((r) => r.json()),
      fetch(API_URL + "/charter").then((r) => r.json()),
      fetch(API_URL + "/cv2/status").then((r) => r.json()).catch(() => null),
      fetch(API_URL + "/cv2/proposals").then((r) => r.json()).catch(() => null),
      fetch(API_URL + "/cv3/status").then((r) => r.json()).catch(() => null),
      fetch(API_URL + "/cv3/proposals").then((r) => r.json()).catch(() => null),
    ]).then(([p, s, c, cv2s, cv2p, cv3s, cv3p]) => {
      setProposals(p.data || []);
      setStats(s.data || null);
      setCharter(c?.data || null);
      setCv2Status(cv2s?.data || null);
      setCv2Proposals(cv2p?.data || []);
      setCv3Status(cv3s?.data || null);
      setCv3Proposals(cv3p?.data || []);
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const active = proposals.filter((p) => p.status === "active");
  const archived = proposals.filter((p) => p.status !== "active");
  const visible = showArchived ? proposals : active;

  // Sort active: charter votes first, then by deadline
  const sortedActive = [...active].sort(classSort);
  const heroVotes = sortedActive.slice(0, 3);

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

      {/* ═══ VOTE NOW HERO ═══ */}
      {!loading && heroVotes.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-primary">Vote Now</CardTitle>
              <Badge variant="default" className="text-xs">{active.length} active</Badge>
            </div>
            <p className="text-xs text-muted-foreground">These decisions shape the DAO. Your badge = your vote.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {heroVotes.map(p => {
              const cls = classifyProposal(p);
              const cfg = CLASS_CONFIG[cls];
              const leadingOpt = Object.entries(p.counts).sort(([, a], [, b]) => b - a)[0];
              return (
                <Link key={p.id} href={`/proposals/${p.id}`} className={`block bg-background/80 rounded-lg p-3 no-underline text-foreground hover:bg-background transition-colors ${cfg.border}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight">{p.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={cfg.badge} className="text-[9px]">{cfg.label}</Badge>
                        <InfoTip text={cfg.tip} link="/docs" />
                        {p.charter_param && <Badge variant="outline" className="text-[8px] font-mono">{p.charter_param}</Badge>}
                        <span className="text-[11px] text-muted-foreground">{p.total_votes} vote{p.total_votes !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <Countdown endsAt={p.ends_at} />
                  </div>
                  {leadingOpt && p.total_votes > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-16 capitalize truncate">{leadingOpt[0]}</span>
                      <Progress value={Math.round((leadingOpt[1] / p.total_votes) * 100)} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-mono text-muted-foreground">{Math.round((leadingOpt[1] / p.total_votes) * 100)}%</span>
                    </div>
                  )}
                </Link>
              );
            })}
            {active.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">+ {active.length - 3} more active votes below</div>
            )}
            <a href={TG_BOT_URL} target="_blank" className="block">
              <Button variant="default" size="sm" className="w-full">Vote in Telegram</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* ═══ HOW VOTING WORKS ═══ */}
      <div>
        <button onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <span>{showHowItWorks ? "▾" : "▸"}</span>
          <span>How does voting work?</span>
        </button>
        {showHowItWorks && (
          <Card className="mt-2">
            <CardContent className="pt-4 pb-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[9px]">Off-Chain</Badge>
                    <span className="font-semibold text-xs">Telegram Voting</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>Free — no transaction fees</li>
                    <li>Badge-gated — 1 badge = 1 vote</li>
                    <li>Day-to-day decisions + charter votes</li>
                    <li>Vote with <code className="bg-background px-1 rounded">/vote</code> in @rad_gov</li>
                  </ul>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px]">On-Chain</Badge>
                    <span className="font-semibold text-xs">Consultation v2</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>Formal — recorded on the Radix ledger</li>
                    <li>XRD-weighted — vote power = XRD staked</li>
                    <li>Binding decisions + treasury proposals</li>
                    <li>Vote here on the dashboard with your Radix Wallet</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Both systems are visible on this page. Off-chain votes run in Telegram for speed. On-chain votes
                use the same <strong>Consultation v2</strong> component used by the Radix Foundation — your votes
                are permanent and verifiable on the ledger.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══ STATS ═══ */}
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

      {/* ═══ DECISION MAP ═══ */}
      {charter && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">DAO Setup — Decision Map</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{charter.status.resolved} of {charter.status.total} decisions made</span>
              <span className="font-mono text-primary font-bold">{Math.round((charter.status.resolved / charter.status.total) * 100)}%</span>
            </div>
            <Progress value={(charter.status.resolved / charter.status.total) * 100} className="h-2" />

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
                  <a href={TG_BOT_URL} target="_blank">
                    <Button variant="default" size="sm" className="w-full">Vote in Telegram</Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ ON-CHAIN GOVERNANCE (CV2) ═══ */}
      {cv2Status && cv2Status.enabled && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">On-Chain Governance</CardTitle>
                <Badge variant="outline" className="text-[9px]">Consultation v2</Badge>
              </div>
              <Badge variant={cv2Status.deployed ? "default" : "secondary"} className="text-[9px]">
                {cv2Status.deployed ? "Live on Mainnet" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Formal governance on the Radix ledger. Votes are XRD-weighted and permanent.
              This is the same Consultation v2 system used by the Radix Foundation.
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
              <div className="text-center py-3">
                <p className="text-muted-foreground text-xs">No on-chain consultations yet. Create a temperature check to start formal governance.</p>
              </div>
            )}

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
              Component: <a href={`https://dashboard.radixdlt.com/component/${cv2Status.component}`} target="_blank" className="font-mono text-primary hover:underline">{cv2Status.component.slice(0, 20)}...</a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ CV3 CONVICTION VOTING ═══ */}
      {cv3Status && cv3Status.enabled && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Conviction Voting</CardTitle>
                <InfoTip text="Time-weighted governance. Stake XRD on proposals — conviction grows hourly. When threshold (10x requested) is met, funds auto-release. Badge tier multipliers: Member 1x, Contributor 1.5x, Builder+ 2x." link="/docs" />
                <Badge variant="outline" className="text-[8px] text-yellow-500 border-yellow-500">BETA</Badge>
                <Badge variant="secondary" className="text-[8px]">CV3</Badge>
              </div>
              <Badge variant="secondary" className="text-[9px]">{cv3Status.poolBalance || 0} XRD pool</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Stake XRD on proposals you believe in. Conviction grows over time — when threshold is met, funds auto-release.
              Badge tier multipliers: Member 1x, Contributor 1.5x, Builder+ 2x.
            </p>
            <div className="bg-yellow-500/10 rounded px-2.5 py-1.5">
              <p className="text-[10px] text-yellow-500 font-semibold">Testing Mode — On-chain staking disabled. Mechanics are live in the database for testing. The community will vote to activate on-chain staking when ready.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Proposals</div>
                <div className="text-lg font-bold font-mono text-primary">{cv3Status.proposalCount}</div>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Pool</div>
                <div className="text-lg font-bold font-mono">{cv3Status.poolBalance || 0} XRD</div>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Synced</div>
                <div className="text-sm font-mono text-muted-foreground">
                  {cv3Status.lastSync ? new Date(cv3Status.lastSync * 1000).toLocaleTimeString() : "—"}
                </div>
              </div>
            </div>

            {cv3Proposals.length > 0 ? (
              <div className="space-y-2">
                {cv3Proposals.map(p => {
                  const pct = p.threshold > 0 ? Math.min(100, Math.round((p.conviction / p.threshold) * 100)) : 0;
                  return (
                    <div key={p.id} className="bg-muted rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold">{p.title || "Proposal #" + p.id}</div>
                          <div className="text-xs text-muted-foreground">{p.requested_amount} XRD requested</div>
                        </div>
                        <Badge variant={p.status === "executed" ? "default" : "secondary"} className="text-[9px]">{p.status}</Badge>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Conviction: {pct}%</span>
                          <span>{Math.round(p.conviction)} / {Math.round(p.threshold)}</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{p.staker_count} stakers</span>
                        <span>{p.total_staked} XRD staked</span>
                        <span>{p.weighted_staked} weighted</span>
                        {p.task_bounty_id && (
                          <Link href={`/bounties/${p.task_bounty_id}`} className="text-primary hover:underline">Bounty #{p.task_bounty_id}</Link>
                        )}
                      </div>
                      {p.status === "active" && connected && (
                        <div>
                          {stakingId === p.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input type="number" placeholder="XRD" min="1" value={stakeAmount}
                                onChange={e => setStakeAmount(e.target.value)} className="text-sm w-24 h-7" />
                              <Button size="sm" className="h-7 text-xs" disabled={stakeSubmitting || !stakeAmount}
                                onClick={() => handleStake(p.id)}>
                                {stakeSubmitting ? "..." : "Stake"}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs"
                                onClick={() => { setStakingId(null); setStakeAmount(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs mt-1" disabled>
                              Staking Coming Soon</Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-muted-foreground text-xs">No conviction proposals yet. Create one below to start community-driven funding.</p>
              </div>
            )}

            {/* Create CV3 Proposal */}
            {connected && (
              <div>
                {!showCreateCv3 && (
                  <Button variant="default" size="sm" onClick={() => setShowCreateCv3(true)} className="w-full" disabled>
                    Create Conviction Proposal (Coming Soon)
                  </Button>
                )}
                {showCreateCv3 && (
                  <div className="space-y-3 bg-background border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">New CV3 Proposal</div>
                      <Badge variant="outline" className="text-[8px] text-yellow-500 border-yellow-500">BETA</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Create a funding proposal. Community members stake XRD — when conviction reaches threshold ({cv3Amount ? Math.round(parseFloat(cv3Amount) * 10) + " conviction needed" : "10x requested amount"}), funds auto-release from the pool.
                    </p>
                    <Input placeholder="Proposal title *" value={cv3Title}
                      onChange={e => setCv3Title(e.target.value)} className="text-sm" maxLength={200} />
                    <textarea placeholder="Description (what should be funded and why)" value={cv3Desc}
                      onChange={e => setCv3Desc(e.target.value)} maxLength={500}
                      className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Requested XRD *</div>
                        <Input type="number" placeholder="Amount" min="1" value={cv3Amount}
                          onChange={e => setCv3Amount(e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Beneficiary</div>
                        <Input placeholder="account_rdx1... (default: you)" value={cv3Beneficiary}
                          onChange={e => setCv3Beneficiary(e.target.value)} className="text-sm text-[11px]" />
                      </div>
                    </div>
                    {cv3CreateError && <p className="text-destructive text-xs">{cv3CreateError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateCv3} disabled={cv3Creating || !cv3Title.trim() || !cv3Amount}>
                        {cv3Creating ? "Submitting..." : "Create On-Chain"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCreateCv3(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(stakeResult || stakeError || cv3CreateResult || cv3CreateError) && !showCreateCv3 && (
              <Alert variant={(stakeError || cv3CreateError) ? "destructive" : "default"}>
                <AlertDescription>{stakeError || cv3CreateError || stakeResult || cv3CreateResult}</AlertDescription>
              </Alert>
            )}

            <div className="text-[10px] text-muted-foreground">
              Component: <a href={`https://dashboard.radixdlt.com/component/${cv3Status.component}`} target="_blank" className="font-mono text-primary hover:underline">{cv3Status.component.slice(0, 20)}...</a>
              {" | "}<Link href="/docs" className="text-primary hover:underline">How conviction voting works</Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ CREATE PROPOSAL ═══ */}
      {connected && (
        <div>
          <Button onClick={() => setShowCreateProposal(!showCreateProposal)} size="sm"
            variant={showCreateProposal ? "outline" : "default"}>
            {showCreateProposal ? "Cancel" : "+ Create Proposal"}
          </Button>
          {showCreateProposal && (
            <Card className="mt-3">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Proposal</div>
                <Input placeholder="Proposal title *" value={propTitle}
                  onChange={e => setPropTitle(e.target.value)} className="text-sm" maxLength={500} />
                <textarea placeholder="Description (optional)" value={propDesc}
                  onChange={e => setPropDesc(e.target.value)} maxLength={2000}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase mb-1">Type</div>
                  <div className="flex gap-1">
                    {([["yesno", "Yes / No"], ["multi", "Multi-Choice"], ["temp", "Temp Check"]] as const).map(([val, label]) => (
                      <Button key={val} variant={propType === val ? "secondary" : "ghost"} size="sm"
                        onClick={() => setPropType(val)} className="text-[11px] h-7 px-2">{label}</Button>
                    ))}
                  </div>
                </div>
                {propType === "multi" && (
                  <Input placeholder="Options (comma-separated, e.g. Option A, Option B, Option C)" value={propOptions}
                    onChange={e => setPropOptions(e.target.value)} className="text-sm" />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase">Duration:</span>
                  <Input type="number" min="1" max="14" value={propDays}
                    onChange={e => setPropDays(e.target.value)} className="text-sm w-20" />
                  <span className="text-xs text-muted-foreground">days (max 14)</span>
                </div>
                {propError && <p className="text-destructive text-xs">{propError}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleCreateProposal} disabled={propSubmitting || !propTitle.trim()} size="sm">
                    {propSubmitting ? "Creating..." : "Create Proposal"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateProposal(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {(propResult || propError) && !showCreateProposal && (
            <Alert variant={propError ? "destructive" : "default"} className="mt-2">
              <AlertDescription>{propError || propResult}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* ═══ ALL PROPOSALS ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">All Proposals</span>
          <Badge variant="secondary" className="text-[9px]">Off-Chain</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {active.length} active{archived.length > 0 ? `, ${archived.length} archived` : ""}
          </span>
          {archived.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? "Active Only" : "Show All"}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => (
          <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-full" /><Skeleton className="h-2 w-full" /></CardContent></Card>
        ))}</div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No proposals yet.</p>
      ) : (
        <div className="space-y-3">
          {[...visible].sort(classSort).map((p) => {
            const cls = classifyProposal(p);
            const cfg = CLASS_CONFIG[cls];
            return (
              <Card key={p.id} className={p.status === "active" ? cfg.border : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-muted-foreground font-mono text-xs mr-2">#{p.id}</span>
                      <Link href={`/proposals/${p.id}`} className="font-semibold text-sm hover:text-primary no-underline text-foreground">{p.title}</Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.status === "active" && <Countdown endsAt={p.ends_at} />}
                      <Badge variant={STATUS_VARIANT[p.status] || "secondary"}>{p.status}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mb-3">
                    <Badge variant={cfg.badge} className="text-[9px]">{cfg.label}</Badge>
                    {p.charter_param && <Badge variant="outline" className="text-[8px] font-mono">{p.charter_param}</Badge>}
                    <span>{p.total_votes} vote{p.total_votes !== 1 ? "s" : ""}</span>
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
                    <a href={TG_BOT_URL} target="_blank">
                      <Button variant="default" size="sm" className="mt-3">{cfg.cta}</Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center pt-2">
        <a href={TG_BOT_URL} target="_blank" className="text-primary text-sm font-semibold hover:underline">
          Open Telegram Bot
        </a>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return <AppShell><ProposalsContent /></AppShell>;
}
