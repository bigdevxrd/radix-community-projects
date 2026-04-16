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
import { API_URL, TG_BOT_URL, ESCROW_COMPONENT, ESCROW_RECEIPT, BADGE_NFT, ESCROW_V3_COMPONENT, ESCROW_V3_RECEIPT } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import { createEscrowTaskManifest, claimTaskManifest, submitTaskManifest, cancelTaskManifest } from "@/lib/manifests";

interface BountyDetail {
  id: number; title: string; description: string | null; description_long: string | null;
  reward_xrd: number; reward_xp: number; status: string;
  category: string; difficulty: string; priority: string;
  deadline: number | null; acceptance_criteria: string | null;
  tags: string | null; skills_required: string | null;
  platform_fee_pct: number; fee_collected_xrd: number;
  insurance_fee_xrd: number | null; insurance_fee_pct: number | null; insurance_status: string | null;
  depends_on: string | null; blocks: string | null; is_blocked: number;
  group_id: number | null; escrow_version: number | null;
  creator_tg_id: number; assignee_tg_id: number | null;
  assignee_address: string | null; github_issue: string | null;
  github_pr: string | null; paid_tx: string | null;
  created_at: number; assigned_at: number | null;
  submitted_at: number | null; verified_at: number | null;
  paid_at: number | null; cancelled_at: number | null; cancel_reason: string | null;
  funded: number;
  milestones: { id: number; title: string; percentage: number; amount_xrd: number; status: string }[];
  applications: { id: number; applicant_tg_id: number; applicant_address: string; pitch: string | null; estimated_hours: number | null; status: string; created_at: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  open: "text-primary", assigned: "text-yellow-500", submitted: "text-blue-400",
  verified: "text-blue-400", paid: "text-muted-foreground", cancelled: "text-red-400",
  disputed: "text-orange-400",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default", assigned: "secondary", submitted: "outline",
  verified: "outline", paid: "default", cancelled: "destructive", disputed: "destructive",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400", medium: "text-yellow-500", hard: "text-orange-400", expert: "text-red-400",
};

function BountyDetailContent() {
  const params = useParams();
  const id = params?.id;
  const [bounty, setBounty] = useState<BountyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { account, rdt, badge, connected } = useWallet();
  const [funding, setFunding] = useState(false);
  const [fundStatus, setFundStatus] = useState("");
  const [fundError, setFundError] = useState("");

  // Resolve escrow addresses based on bounty version
  const escrowComp = bounty?.escrow_version === 3 ? ESCROW_V3_COMPONENT : ESCROW_COMPONENT;
  const escrowReceipt = bounty?.escrow_version === 3 ? ESCROW_V3_RECEIPT : ESCROW_RECEIPT;

  async function handleFund() {
    if (!rdt || !account || !bounty) return;
    setFunding(true); setFundStatus(""); setFundError("");
    try {
      const manifest = createEscrowTaskManifest(
        escrowComp, BADGE_NFT, account,
        String(bounty.reward_xrd), null
      );
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        const txHash = result.value.transactionIntentHash;
        setFundStatus("Funded! Verifying on-chain...");
        // Verify TX and link on-chain task ID (wait a few seconds for gateway indexing)
        setTimeout(async () => {
          try {
            const verifyRes = await fetch(API_URL + "/bounties/" + bounty.id + "/verify-fund", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tx_hash: txHash }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              setFundStatus("Funded & verified on-chain! TX: " + txHash.slice(0, 40) + "...");
            } else {
              setFundStatus("TX submitted: " + txHash.slice(0, 40) + "...\nVerification pending — the escrow watcher will sync within 60s.");
            }
          } catch {
            setFundStatus("TX submitted: " + txHash.slice(0, 40) + "...\nVerification pending.");
          }
          // Refresh bounty data
          fetch(API_URL + "/bounties/" + bounty.id).then(r => r.json()).then(d => { if (d.data) setBounty(d.data); }).catch(() => {});
        }, 8000);
      } else {
        setFundError("Transaction rejected or failed.");
      }
    } catch (e: unknown) {
      setFundError(e instanceof Error ? e.message : "Transaction failed");
    }
    setFunding(false);
  }

  const [actionStatus, setActionStatus] = useState("");
  const [actionError, setActionError] = useState("");
  const [actioning, setActioning] = useState(false);

  async function handleClaim() {
    if (!rdt || !account || !bounty) return;
    setActioning(true); setActionStatus(""); setActionError("");
    try {
      const manifest = claimTaskManifest(escrowComp, BADGE_NFT, account, bounty.id);
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setActionStatus("Claimed! TX: " + result.value.transactionIntentHash.slice(0, 40) + "...");
        setTimeout(() => fetchData(), 10000);
      } else { setActionError("Transaction rejected."); }
    } catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Failed"); }
    setActioning(false);
  }

  async function handleSubmit() {
    if (!rdt || !account || !bounty) return;
    setActioning(true); setActionStatus(""); setActionError("");
    try {
      const manifest = submitTaskManifest(escrowComp, BADGE_NFT, account, bounty.id);
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setActionStatus("Submitted! Awaiting verification. TX: " + result.value.transactionIntentHash.slice(0, 40) + "...");
        setTimeout(() => fetchData(), 10000);
      } else { setActionError("Transaction rejected."); }
    } catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Failed"); }
    setActioning(false);
  }

  async function handleCancel() {
    if (!rdt || !account || !bounty) return;
    setActioning(true); setActionStatus(""); setActionError("");
    try {
      const manifest = cancelTaskManifest(escrowComp, escrowReceipt, account, bounty.id);
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setActionStatus("Cancelled! XRD refunded. TX: " + result.value.transactionIntentHash.slice(0, 40) + "...");
        setTimeout(() => fetchData(), 10000);
      } else { setActionError("Transaction rejected."); }
    } catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Failed"); }
    setActioning(false);
  }

  const fetchData = () => {
    if (!id) return;
    setLoading(true); setError(false);
    fetch(API_URL + "/bounties/" + id)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(d => { setBounty(d.data || null); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) {
    return (<div className="space-y-5"><Card><CardContent className="p-5 space-y-4"><Skeleton className="h-6 w-64" /><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /></CardContent></Card></div>);
  }

  if (error || !bounty) {
    return (<div className="space-y-5"><Card><CardContent className="py-12 text-center"><p className="text-muted-foreground text-sm mb-3">{error ? "Failed to load" : "Bounty not found"}</p><div className="flex gap-3 justify-center"><Button variant="outline" size="sm" onClick={fetchData}>Retry</Button><Link href="/bounties"><Button variant="ghost" size="sm">Back</Button></Link></div></CardContent></Card></div>);
  }

  const isActive = bounty.status === "open" || bounty.status === "assigned";
  const criteria = bounty.acceptance_criteria ? JSON.parse(bounty.acceptance_criteria) as string[] : [];
  const tags = bounty.tags ? JSON.parse(bounty.tags) as string[] : [];
  const skills = bounty.skills_required ? JSON.parse(bounty.skills_required) as string[] : [];
  const feeXrd = bounty.reward_xrd * (bounty.platform_fee_pct / 100);
  const netReward = bounty.reward_xrd - feeXrd;

  const deadlineStr = bounty.deadline
    ? (() => {
        const diff = bounty.deadline * 1000 - Date.now();
        if (diff <= 0) return "Expired";
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
      })()
    : null;

  return (
    <div className="space-y-5">
      <Link href="/bounties" className="text-sm text-muted-foreground hover:text-foreground no-underline">
        ← Back to Bounties
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-muted-foreground font-mono text-xs mr-2">#{bounty.id}</span>
              <span className="font-bold text-lg">{bounty.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-lg font-bold text-primary">{bounty.reward_xrd} XRD</span>
              <Badge variant={STATUS_VARIANT[bounty.status] || "secondary"}>{bounty.status}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="text-xs capitalize">{bounty.category}</Badge>
            <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[bounty.difficulty] || ""}`}>{bounty.difficulty}</Badge>
            {bounty.priority !== "normal" && <Badge variant="destructive" className="text-xs capitalize">{bounty.priority}</Badge>}
            {bounty.escrow_version === 3 && (
              <Badge variant="outline" className="text-xs text-primary border-primary/30">V3 Escrow</Badge>
            )}
            {deadlineStr && (
              <Badge variant={deadlineStr === "Expired" ? "destructive" : "secondary"} className="text-xs font-mono">{deadlineStr}</Badge>
            )}
          </div>

          {(bounty.description || bounty.description_long) && (
            <p className="text-sm text-muted-foreground">{bounty.description_long || bounty.description}</p>
          )}

          {/* Tags + Skills */}
          {(tags.length > 0 || skills.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              {skills.map(s => <Badge key={s} variant="outline" className="text-[10px] font-mono">{s}</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-3 ${bounty.insurance_fee_xrd ? "grid-cols-4" : "grid-cols-3"}`}>
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">Reward</div>
              <div className="text-lg font-bold font-mono text-primary">{bounty.reward_xrd} XRD</div>
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">Fee ({bounty.platform_fee_pct}%)</div>
              <div className="text-lg font-bold font-mono text-muted-foreground">{feeXrd.toFixed(1)} XRD</div>
            </div>
            {bounty.insurance_fee_xrd != null && bounty.insurance_fee_xrd > 0 && (
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Insurance ({bounty.insurance_fee_pct || 0}%)</div>
                <div className="text-lg font-bold font-mono text-muted-foreground">{bounty.insurance_fee_xrd.toFixed(1)} XRD</div>
              </div>
            )}
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">Worker Gets</div>
              <div className="text-lg font-bold font-mono text-primary">{netReward.toFixed(1)} XRD</div>
            </div>
          </div>
          {bounty.is_blocked === 1 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-orange-400">
              <span className="font-semibold">Blocked</span>
              <span className="text-muted-foreground">— waiting on dependencies to complete</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acceptance Criteria */}
      {criteria.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Acceptance Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`h-4 w-4 rounded border mt-0.5 shrink-0 flex items-center justify-center text-[10px] ${bounty.status === "paid" ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                    {bounty.status === "paid" && "✓"}
                  </div>
                  <span className="text-sm">{c}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {bounty.milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bounty.milestones.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.percentage}% — {m.amount_xrd} XRD</div>
                  </div>
                  <Badge variant={m.status === "paid" ? "default" : m.status === "verified" ? "secondary" : "outline"} className="text-[9px]">{m.status}</Badge>
                </div>
              ))}
            </div>
            <Progress value={bounty.milestones.filter(m => m.status === "paid").length / bounty.milestones.length * 100} className="h-2 mt-3" />
          </CardContent>
        </Card>
      )}

      {/* Applications */}
      {bounty.applications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Applications ({bounty.applications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bounty.applications.map(a => (
                <div key={a.id} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono">{a.applicant_address.slice(0, 16)}...{a.applicant_address.slice(-6)}</span>
                    <Badge variant={a.status === "accepted" ? "default" : a.status === "rejected" ? "destructive" : "outline"} className="text-[9px]">{a.status}</Badge>
                  </div>
                  {a.pitch && <p className="text-xs text-muted-foreground">{a.pitch}</p>}
                  {a.estimated_hours && <span className="text-[11px] text-muted-foreground">Est: {a.estimated_hours}h</span>}
                </div>
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
            {[
              { label: "Created", ts: bounty.created_at, active: true },
              { label: "Assigned", ts: bounty.assigned_at, active: !!bounty.assigned_at },
              { label: "Submitted", ts: bounty.submitted_at, active: !!bounty.submitted_at },
              { label: "Verified", ts: bounty.verified_at, active: !!bounty.verified_at },
              { label: "Paid", ts: bounty.paid_at, active: !!bounty.paid_at },
            ].map(step => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${step.active ? "bg-primary" : "bg-muted"}`} />
                <span className="text-muted-foreground w-20">{step.label}</span>
                <span className="font-mono text-xs">{step.ts ? new Date(step.ts * 1000).toLocaleString() : "—"}</span>
              </div>
            ))}
            {bounty.cancelled_at && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-red-400 w-20">Cancelled</span>
                <span className="font-mono text-xs">{new Date(bounty.cancelled_at * 1000).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        {bounty.github_issue && <a href={bounty.github_issue} target="_blank" className="text-xs text-primary hover:underline">GitHub Issue</a>}
        {bounty.github_pr && <a href={bounty.github_pr} target="_blank" className="text-xs text-primary hover:underline">Pull Request</a>}
        {bounty.paid_tx && <a href={`https://dashboard.radixdlt.com/transaction/${bounty.paid_tx}`} target="_blank" className="text-xs text-primary hover:underline">Payment TX</a>}
      </div>

      {/* CTA — context-sensitive action buttons */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {/* Status message */}
          {actionStatus && <p className="text-xs text-primary text-center">{actionStatus}</p>}
          {actionError && <p className="text-xs text-red-400 text-center">{actionError}</p>}

          {/* OPEN + UNFUNDED → Fund button */}
          {bounty.status === "open" && !bounty.funded && connected && badge && (
            <>
              <div className="text-sm font-semibold text-center">This task needs funding</div>
              <Button variant="default" className="w-full" onClick={handleFund} disabled={funding}>
                {funding ? "Waiting for wallet..." : `Fund ${bounty.reward_xrd} XRD via Escrow`}
              </Button>
              {fundStatus && <p className="text-xs text-primary text-center">{fundStatus}</p>}
              {fundError && <p className="text-xs text-red-400 text-center">{fundError}</p>}
              <p className="text-[10px] text-muted-foreground text-center">
                XRD goes into a Scrypto smart contract vault. Cancel = full refund.
                {bounty.escrow_version === 3 && <span className="ml-1 text-primary">(Escrow V3 — multi-token)</span>}
              </p>
            </>
          )}

          {/* OPEN + FUNDED → Claim button */}
          {bounty.status === "open" && bounty.funded && connected && badge && (
            <>
              <Button variant="default" className="w-full" onClick={handleClaim} disabled={actioning}>
                {actioning ? "Waiting for wallet..." : "Claim This Task"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">Your Radix Wallet will sign a claim transaction. Badge proof required.</p>
            </>
          )}

          {/* OPEN + FUNDED → Cancel button (for creator with receipt NFT) */}
          {bounty.status === "open" && bounty.funded && connected && account && (
            <Button variant="ghost" size="sm" className="w-full" onClick={handleCancel} disabled={actioning}>
              Cancel &amp; Refund (requires receipt NFT)
            </Button>
          )}

          {/* ASSIGNED → Submit button (for assignee) */}
          {bounty.status === "assigned" && connected && bounty.assignee_address === account && (
            <>
              <Button variant="default" className="w-full" onClick={handleSubmit} disabled={actioning}>
                {actioning ? "Waiting for wallet..." : "Submit Work (Mark Complete)"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">Marks your work as submitted on-chain. Awaiting verification.</p>
            </>
          )}

          {/* ASSIGNED → Info for non-assignee */}
          {bounty.status === "assigned" && connected && bounty.assignee_address !== account && (
            <p className="text-sm text-muted-foreground text-center">This task is claimed by another worker.</p>
          )}

          {/* SUBMITTED → Awaiting verification */}
          {bounty.status === "submitted" && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs">Awaiting Verification</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">
                {bounty.github_pr ? "PR merge watcher checks every 5 minutes." : "Admin will verify delivery."}
              </p>
            </div>
          )}

          {/* DISPUTED → Under dispute */}
          {bounty.status === "disputed" && (
            <div className="text-center">
              <Badge variant="destructive" className="text-xs">Under Dispute</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">
                This task is being reviewed by an arbiter. Escrow is locked until resolution.
              </p>
            </div>
          )}

          {/* CANCELLED → Show reason */}
          {bounty.status === "cancelled" && (
            <div className="text-center">
              <Badge variant="destructive" className="text-xs">Cancelled</Badge>
              {bounty.cancel_reason && (
                <p className="text-[10px] text-muted-foreground mt-1">Reason: {bounty.cancel_reason.replace(/_/g, " ")}</p>
              )}
            </div>
          )}

          {/* PAID → Complete */}
          {bounty.status === "paid" && (
            <div className="text-center">
              <Badge variant="default" className="text-xs bg-green-600">Completed &amp; Paid</Badge>
              {bounty.paid_tx && <p className="text-[10px] text-muted-foreground mt-1 font-mono">{bounty.paid_tx.slice(0, 40)}...</p>}
            </div>
          )}

          {/* Not connected */}
          {!connected && (
            <p className="text-xs text-muted-foreground text-center">Connect your wallet to interact with this task.</p>
          )}
          {connected && !badge && bounty.status !== "paid" && bounty.status !== "submitted" && (
            <p className="text-xs text-muted-foreground text-center"><a href="/mint" className="text-primary hover:underline">Mint a badge</a> to interact with tasks.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BountyDetailPage() {
  return <AppShell><BountyDetailContent /></AppShell>;
}
