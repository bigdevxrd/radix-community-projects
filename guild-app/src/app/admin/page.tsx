"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { SCHEMAS, TIER_COLORS, ROYALTIES, API_URL } from "@/lib/constants";
import { lookupAllBadges } from "@/lib/gateway";
import { adminMintManifest, updateTierManifest, updateXpManifest, revokeBadgeManifest, updateExtraDataManifest } from "@/lib/manifests";
import type { BadgeInfo } from "@/lib/types";

type Tab = "proposals" | "charter" | "xp" | "bounties" | "health" | "badges";

const TABS: { id: Tab; label: string }[] = [
  { id: "proposals", label: "Proposals" },
  { id: "charter", label: "Charter" },
  { id: "xp", label: "XP Rewards" },
  { id: "bounties", label: "Bounties" },
  { id: "health", label: "System Health" },
  { id: "badges", label: "Badges" },
];

interface Proposal {
  id: number; title: string; type: string; status: string;
  created_at: number; ends_at: number;
  counts: Record<string, number>; total_votes: number;
}

interface CharterParam {
  param_key: string; title: string; category: string; phase: number;
  status: string; param_value: string | null; depends_on: string;
}

interface Bounty {
  id: number; title: string; description: string | null;
  reward_xrd: number; reward_xp: number; status: string;
  assignee_address: string | null; github_pr: string | null;
  created_at: number; paid_at: number | null; paid_tx: string | null;
}

interface XpEntry { address: string; pendingXp: number }

interface BountyStats {
  open: number; assigned: number; submitted: number; verified: number; paid: number;
  totalPaid: number; escrow: { funded: number; released: number; available: number };
}

// ── Proposals Tab ──────────────────────────────────────
function ProposalsTab() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDays, setNewDays] = useState("3");

  function load() {
    setLoading(true);
    fetch(API_URL + "/proposals?status=all&limit=50")
      .then((r) => r.json())
      .then((d) => { setProposals(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const active = proposals.filter((p) => p.status === "active");
  const pending = proposals.filter((p) => p.status === "needs_amendment");
  const archived = proposals.filter((p) => !["active", "needs_amendment"].includes(p.status));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Create Proposal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">New proposals are created via the Telegram bot.</p>
          <div className="flex gap-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Proposal title (for reference)" className="text-[13px]" />
            <Input value={newDays} onChange={(e) => setNewDays(e.target.value)} placeholder="Days" className="w-20 text-[13px]" type="number" />
          </div>
          <Alert>
            <AlertDescription className="text-xs">
              Use the Telegram bot command <code className="bg-muted px-1 rounded">/propose &lt;title&gt;</code> with an authorized admin wallet to create proposals on-chain.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Active ({active.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-20" /> : active.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No active proposals</p>
          ) : active.map((p) => (
            <div key={p.id} className="py-3 border-b last:border-0 flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-xs text-muted-foreground mr-2">#{p.id}</span>
                <span className="text-sm font-semibold">{p.title}</span>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {p.total_votes} votes · Ends {new Date(p.ends_at * 1000).toLocaleDateString()}
                </div>
              </div>
              <Badge variant="default" className="shrink-0 text-[9px]">active</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Pending Amendment ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pending.map((p) => (
              <div key={p.id} className="py-3 border-b last:border-0 flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-muted-foreground mr-2">#{p.id}</span>
                  <span className="text-sm">{p.title}</span>
                </div>
                <Badge variant="outline" className="shrink-0 text-[9px]">needs_amendment</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {archived.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Archive ({archived.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {archived.slice(0, 20).map((p) => (
              <div key={p.id} className="py-2 border-b last:border-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-muted-foreground mr-2">#{p.id}</span>
                  <span className="text-xs truncate">{p.title}</span>
                </div>
                <Badge variant={["passed", "completed"].includes(p.status) ? "default" : "secondary"} className="shrink-0 text-[9px]">{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Charter Tab ──────────────────────────────────────────
function CharterTab() {
  const [params, setParams] = useState<CharterParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "tbd" | "resolved" | "voting">("all");

  useEffect(() => {
    fetch(API_URL + "/charter")
      .then((r) => r.json())
      .then((d) => { setParams(d.data?.params || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const visible = filter === "all" ? params : params.filter((p) => p.status === filter);
  const byPhase = [1, 2, 3].map(phase => ({
    phase,
    total: params.filter((p) => p.phase === phase).length,
    resolved: params.filter((p) => p.phase === phase && p.status === "resolved").length,
  }));

  const STATUS_BADGE: Record<string, "default" | "secondary" | "outline"> = {
    resolved: "default", voting: "outline", tbd: "secondary",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {byPhase.map((p) => (
          <Card key={p.phase}>
            <CardContent className="px-4 py-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Phase {p.phase}</div>
              <div className="text-lg font-bold font-mono text-primary">{p.resolved}/{p.total}</div>
              <Progress value={p.total > 0 ? (p.resolved / p.total) * 100 : 0} className="h-1 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(["all", "tbd", "voting", "resolved"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-[11px]" onClick={() => setFilter(f)}>
            {f === "all" ? `All (${params.length})` : `${f} (${params.filter((p) => p.status === f).length})`}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 max-h-96 overflow-y-auto">
          {loading ? <Skeleton className="h-40" /> : visible.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No parameters</p>
          ) : visible.map((p) => {
            const deps: string[] = JSON.parse(p.depends_on || "[]");
            return (
              <div key={p.param_key} className="py-3 border-b last:border-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold leading-snug">{p.title}</span>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{p.param_key}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[9px]">P{p.phase}</Badge>
                    <Badge variant={STATUS_BADGE[p.status] || "secondary"} className="text-[9px]">{p.status}</Badge>
                  </div>
                </div>
                {p.param_value && <div className="text-xs text-primary font-mono mt-1">Value: {p.param_value}</div>}
                {deps.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {deps.map((d) => <Badge key={d} variant="secondary" className="text-[9px] font-mono">{d}</Badge>)}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="text-xs">
          Charter parameters are resolved via community proposals. Use <code className="bg-muted px-1 rounded">/propose</code> in the Telegram bot to create a charter vote.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ── XP Rewards Tab ───────────────────────────────────────
function XpTab() {
  const [queue, setQueue] = useState<XpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualAddr, setManualAddr] = useState("");
  const [manualAmt, setManualAmt] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(API_URL + "/xp-queue")
      .then((r) => r.json())
      .then((d) => { setQueue(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalPending = queue.reduce((a, e) => a + e.pendingXp, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Manual XP Award</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Input value={manualAddr} onChange={(e) => setManualAddr(e.target.value)} placeholder="account_rdx1..." className="font-mono text-[13px]" />
            <div className="flex gap-2">
              <Input value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} placeholder="XP amount" type="number" className="w-32 text-[13px]" />
              <Input value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="Reason (e.g. community contribution)" className="flex-1 text-[13px]" />
            </div>
            <Button
              size="sm"
              disabled={!manualAddr.trim() || !manualAmt || parseInt(manualAmt) <= 0}
              onClick={() => {
                setStatus(`XP award queued for ${manualAddr.slice(0, 20)}... (+${manualAmt} XP). Apply via the XP batch script.`);
                setManualAddr(""); setManualAmt(""); setManualReason("");
              }}
            >
              Queue XP Award
            </Button>
          </div>
          {status && <p className="text-xs text-primary">{status}</p>}
          <Separator />
          <p className="text-xs text-muted-foreground">
            To apply XP rewards on-chain, run: <code className="bg-muted px-1 rounded">scripts/xp-batch-apply.sh</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Pending Queue ({queue.length})</CardTitle>
            <Badge variant="outline" className="font-mono text-xs">{totalPending.toLocaleString()} total XP</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24" /> : queue.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No pending XP rewards</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {queue.map((entry) => (
                <div key={entry.address} className="flex items-center justify-between text-xs py-2 border-b last:border-0">
                  <span className="font-mono text-[11px] text-muted-foreground">{entry.address.slice(0, 24)}...</span>
                  <Badge variant="outline" className="font-mono text-yellow-500 text-[10px]">+{entry.pendingXp} XP</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Bounties Tab ─────────────────────────────────────────
function BountiesTab() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<BountyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");

  function load() {
    setLoading(true);
    fetch(API_URL + "/bounties")
      .then((r) => r.json())
      .then((d) => { setBounties(d.data?.bounties || []); setStats(d.data?.stats || null); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const open = bounties.filter((b) => b.status === "open");
  const review = bounties.filter((b) => ["submitted", "verified"].includes(b.status));
  const paid = bounties.filter((b) => b.status === "paid");

  const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    open: "secondary", assigned: "outline", submitted: "default", verified: "default", paid: "default",
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open", value: stats.open },
            { label: "In Review", value: stats.submitted + stats.verified },
            { label: "Paid Out", value: stats.paid },
            { label: "Escrow", value: stats.escrow.available + " XRD" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="px-4 py-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className="text-lg font-bold font-mono text-primary mt-0.5">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Open Bounties ({open.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24" /> : open.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No open bounties</p>
          ) : open.map((b) => (
            <div key={b.id} className="py-3 border-b last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-muted-foreground mr-2">#{b.id}</span>
                  <span className="text-sm font-semibold">{b.title}</span>
                  {b.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-muted-foreground">{b.reward_xrd} XRD</span>
                  <Badge variant={STATUS_BADGE[b.status] || "secondary"} className="text-[9px]">{b.status}</Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {review.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Awaiting Review ({review.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {review.map((b) => (
              <div key={b.id} className="py-3 border-b last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">#{b.id}</span>
                    <span className="text-sm">{b.title}</span>
                    {b.github_pr && (
                      <a href={b.github_pr} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline mt-0.5">
                        PR: {b.github_pr.slice(0, 40)}...
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-mono text-xs text-muted-foreground">{b.reward_xrd} XRD</span>
                    <Badge variant={STATUS_BADGE[b.status] || "outline"} className="text-[9px]">{b.status}</Badge>
                  </div>
                </div>
                {b.status === "submitted" && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="default" className="text-[11px]"
                      onClick={() => setActionStatus(`Bounty #${b.id}: Use /verify_bounty ${b.id} in the bot to approve.`)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="text-[11px]"
                      onClick={() => setActionStatus(`Bounty #${b.id}: Use /reject_bounty ${b.id} in the bot to reject.`)}>
                      Reject
                    </Button>
                  </div>
                )}
                {b.status === "verified" && (
                  <div className="mt-2">
                    <Button size="sm" variant="default" className="text-[11px]"
                      onClick={() => setActionStatus(`Bounty #${b.id}: Run scripts/bounty-batch-payer.js to release ${b.reward_xrd} XRD to ${b.assignee_address?.slice(0, 20) || "assignee"}.`)}>
                      Trigger Payment
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {actionStatus && (
              <Alert className="mt-3">
                <AlertDescription className="text-xs">{actionStatus}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {paid.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Paid Out ({paid.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto">
            {paid.map((b) => (
              <div key={b.id} className="py-2 border-b last:border-0 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-muted-foreground mr-2">#{b.id}</span>
                  <span>{b.title.slice(0, 40)}{b.title.length > 40 ? "..." : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">{b.reward_xrd} XRD</span>
                  {b.paid_tx && (
                    <a href={`https://dashboard.radixdlt.com/transaction/${b.paid_tx}`} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono text-[10px]">
                      TX ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── System Health Tab ────────────────────────────────────
function HealthTab() {
  const [stats, setStats] = useState<{
    total_proposals: number; total_voters: number; active_proposals: number;
    pending_xp_rewards: number; xp: { pending: number; applied: number; totalXpAwarded: number }
  } | null>(null);
  const [escrow, setEscrow] = useState<{
    balance: { funded: number; released: number; available: number };
    transactions: { id: number; tx_type: string; amount_xrd: number; tx_hash: string | null; description: string; created_at: number }[]
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  useEffect(() => {
    const t0 = Date.now();
    Promise.all([
      fetch(API_URL + "/stats").then((r) => r.json()).catch(() => null),
      fetch(API_URL + "/escrow").then((r) => r.json()).catch(() => null),
    ]).then(([s, e]) => {
      setApiLatency(Date.now() - t0);
      setStats(s?.data || null);
      setEscrow(e?.data || null);
      setLoading(false);
    });
  }, []);

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="px-4 py-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">API Status</div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-500" : "bg-green-500"}`} />
              <span className="text-sm font-semibold">{loading ? "Checking..." : "Online"}</span>
            </div>
            {apiLatency !== null && <div className="text-[10px] text-muted-foreground mt-0.5">{apiLatency}ms response</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Check</div>
            <div className="text-sm font-semibold mt-1">{now.toLocaleTimeString()}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{now.toLocaleDateString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Network</div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold">Mainnet</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Radix DLT</div>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Governance Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Proposals", value: stats.total_proposals },
                { label: "Active", value: stats.active_proposals },
                { label: "Total Voters", value: stats.total_voters },
                { label: "Pending XP", value: stats.pending_xp_rewards },
              ].map((s) => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-lg font-bold font-mono text-primary">{s.value}</div>
                </div>
              ))}
            </div>
            {stats.xp && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { label: "XP Pending", value: stats.xp.pending },
                  { label: "XP Applied", value: stats.xp.applied },
                  { label: "Total XP", value: stats.xp.totalXpAwarded.toLocaleString() },
                ].map((s) => (
                  <div key={s.label} className="bg-muted rounded-lg px-3 py-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    <div className="text-sm font-bold font-mono text-primary">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {escrow && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Escrow Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Funded", value: escrow.balance.funded + " XRD" },
                { label: "Released", value: escrow.balance.released + " XRD" },
                { label: "Available", value: escrow.balance.available + " XRD" },
              ].map((s) => (
                <div key={s.label} className="bg-muted rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-sm font-bold font-mono text-primary">{s.value}</div>
                </div>
              ))}
            </div>
            {escrow.transactions.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Recent Transactions</div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {escrow.transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                      <div>
                        <Badge variant={tx.tx_type === "deposit" ? "default" : "secondary"} className="text-[9px] mr-1.5">{tx.tx_type}</Badge>
                        <span className="text-muted-foreground">{tx.description?.slice(0, 35)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">{tx.amount_xrd} XRD</span>
                        {tx.tx_hash && (
                          <a href={`https://dashboard.radixdlt.com/transaction/${tx.tx_hash}`} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline text-[10px]">TX ↗</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && <Skeleton className="h-40" />}
    </div>
  );
}

// ── Badges Tab ───────────────────────────────────────────
function BadgesTab() {
  const { account, rdt } = useWallet();
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupAddr, setLookupAddr] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actionTxId, setActionTxId] = useState("");
  const [actionError, setActionError] = useState("");

  async function handleLookup(address: string) {
    if (!address) return;
    setLoading(true); setBadges([]);
    setBadges(await lookupAllBadges(address));
    setLoading(false);
  }

  async function sendAdminTx(manifest: string, label: string) {
    if (!rdt || !account) return;
    setActionStatus(`${label}...`); setActionTxId(""); setActionError("");
    try {
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) { setActionStatus(`${label} complete!`); setActionTxId(result.value.transactionIntentHash); }
      else { setActionError(JSON.stringify(result.error)); setActionStatus(""); }
    } catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Failed"); setActionStatus(""); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Look Up Badges</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={lookupAddr} onChange={(e) => setLookupAddr(e.target.value)} placeholder="account_rdx1..." className="font-mono text-[13px]" />
            <Button onClick={() => handleLookup(lookupAddr)}>Search</Button>
          </div>
          {account && (
            <Button variant="ghost" size="sm" onClick={() => { setLookupAddr(account); handleLookup(account); }}>
              Check my badges
            </Button>
          )}
          {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
          {badges.length > 0 && (
            <div className="space-y-0">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <div className="font-semibold text-sm">{b.issued_to}</div>
                    <div className="text-xs text-muted-foreground">{b.schema_name} | {b.id}</div>
                  </div>
                  <div className="text-right">
                    <Badge style={{ backgroundColor: `${TIER_COLORS[b.tier]}20`, color: TIER_COLORS[b.tier], border: "none" }}>{b.tier}</Badge>
                    <div className="text-[11px] text-muted-foreground mt-1">XP: {b.xp} | {b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && badges.length === 0 && lookupAddr && <p className="text-muted-foreground text-sm">No badges found.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Admin Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">Requires admin badge in connected wallet. Royalties apply.</p>
          <Separator />
          <ActionForm label="Mint Role Badge" cost={ROYALTIES.mint} variant="secondary"
            fields={[{ name: "username", ph: "username" }, { name: "tier", ph: "", type: "select", opts: SCHEMAS.guild_role.tiers }]}
            onSubmit={(v) => sendAdminTx(adminMintManifest(SCHEMAS.guild_role.manager, SCHEMAS.guild_role.adminBadge, v.username, v.tier, account!), "Minting")} />
          <ActionForm label="Update Tier" cost={ROYALTIES.update_tier}
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "newTier", ph: "", type: "select", opts: SCHEMAS.guild_member.tiers }]}
            onSubmit={(v) => sendAdminTx(updateTierManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.newTier, account!), "Updating tier")} />
          <ActionForm label="Update XP" cost={ROYALTIES.update_xp}
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "newXp", ph: "100", type: "number" }]}
            onSubmit={(v) => sendAdminTx(updateXpManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, parseInt(v.newXp), account!), "Updating XP")} />
          <ActionForm label="Revoke Badge" cost={ROYALTIES.revoke} variant="destructive"
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "reason", ph: "Reason" }]}
            onSubmit={(v) => sendAdminTx(revokeBadgeManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.reason, account!), "Revoking")} />
          <ActionForm label="Update Extra Data" cost={ROYALTIES.update_extra_data}
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "data", ph: '{"role":"mod"}' }]}
            onSubmit={(v) => sendAdminTx(updateExtraDataManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.data, account!), "Updating")} />

          {(actionStatus || actionError) && (
            <Alert variant={actionError ? "destructive" : "default"}>
              <AlertDescription>
                {actionError || actionStatus}
                {actionTxId && <a href={`https://dashboard.radixdlt.com/transaction/${actionTxId}`} target="_blank" className="block mt-1 text-xs text-primary hover:underline">View on Dashboard</a>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Badge Schemas</CardTitle></CardHeader>
        <CardContent>
          {Object.entries(SCHEMAS).map(([name, s]) => (
            <div key={name} className="py-3 border-b last:border-0">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{name}</span>
                <Badge variant={s.freeMint ? "default" : "secondary"}>{s.freeMint ? "Free mint" : "Admin only"}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Tiers: {s.tiers.join(" / ")} | Manager: {s.manager.slice(0, 25)}...</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionForm({ label, cost, fields, onSubmit, variant = "default" }: {
  label: string; cost: number; variant?: "default" | "secondary" | "destructive";
  fields: { name: string; ph: string; type?: string; opts?: string[] }[];
  onSubmit: (v: Record<string, string>) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, f.opts?.[0] || ""]))
  );
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const ok = fields.every((f) => f.opts || vals[f.name]?.trim());

  return (
    <div className="bg-muted rounded-lg p-3.5">
      <div className="flex justify-between mb-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[11px] text-yellow-500 font-mono">{cost} XRD</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {fields.map((f) => f.type === "select" ? (
          <select key={f.name} value={vals[f.name]} onChange={(e) => set(f.name, e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-[13px] font-mono w-36">
            {f.opts?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <Input key={f.name} type={f.type || "text"} value={vals[f.name]} onChange={(e) => set(f.name, e.target.value)}
            placeholder={f.ph} className="flex-1 min-w-[140px] text-[13px] font-mono" />
        ))}
        <Button onClick={() => ok && onSubmit(vals)} disabled={!ok} variant={variant} size="sm">
          {label}
        </Button>
      </div>
    </div>
  );
}

function AdminContent() {
  const [tab, setTab] = useState<Tab>("proposals");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage all Phase 3 governance systems</p>
      </div>

      <div className="flex gap-0.5 flex-wrap border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "proposals" && <ProposalsTab />}
      {tab === "charter" && <CharterTab />}
      {tab === "xp" && <XpTab />}
      {tab === "bounties" && <BountiesTab />}
      {tab === "health" && <HealthTab />}
      {tab === "badges" && <BadgesTab />}
    </div>
  );
}

export default function AdminPage() {
  return <AppShell><AdminContent /></AppShell>;
}
