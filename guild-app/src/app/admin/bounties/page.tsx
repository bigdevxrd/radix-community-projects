"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProtectedRoute, LoadingState } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MetricCard } from "@/components/MetricCard";
import { API_URL } from "@/lib/constants";
import { truncateAddress, formatNumber } from "@/lib/charts";
import type { Bounty, BountyStats } from "@/lib/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "outline",
  assigned: "secondary",
  submitted: "default",
  verified: "default",
  paid: "secondary",
};

function BountyRow({
  bounty,
  onAction,
}: {
  bounty: Bounty;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [approveReward, setApproveReward] = useState(String(bounty.reward_xrd));
  const [showApprove, setShowApprove] = useState(false);

  async function doAction(action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    try {
      await fetch(`${API_URL}/admin/bounties/${bounty.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      onAction();
      setShowApprove(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground font-mono text-xs">#{bounty.id}</span>
            <span className="font-medium text-sm">{bounty.title}</span>
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
            <span className="text-yellow-500 font-mono">{bounty.reward_xrd} XRD</span>
            {bounty.assignee_address && (
              <span>Claimant: {truncateAddress(bounty.assignee_address)}</span>
            )}
            <span>{new Date(bounty.created_at * 1000).toLocaleDateString()}</span>
          </div>
          {bounty.github_pr && (
            <a
              href={bounty.github_pr}
              target="_blank"
              className="text-[11px] text-primary hover:underline"
            >
              {bounty.github_pr.slice(0, 50)}...
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={STATUS_VARIANT[bounty.status] || "secondary"}>
            {bounty.status}
          </Badge>
          {bounty.status === "submitted" && (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-[11px] bg-green-600 hover:bg-green-700"
                onClick={() => setShowApprove(!showApprove)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] text-destructive"
                disabled={loading}
                onClick={() => doAction("reject")}
              >
                Reject
              </Button>
            </>
          )}
          {bounty.status === "verified" && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-[11px]"
              disabled={loading}
              onClick={() => doAction("release")}
            >
              Release Payment
            </Button>
          )}
        </div>
      </div>

      {showApprove && (
        <div className="mt-2 p-3 bg-muted rounded-lg flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">Final reward:</span>
          <Input
            value={approveReward}
            onChange={(e) => setApproveReward(e.target.value)}
            className="w-24 h-7 text-sm font-mono"
            type="number"
          />
          <span className="text-xs text-muted-foreground">XRD</span>
          <Button
            size="sm"
            className="h-7 text-xs bg-green-600 hover:bg-green-700"
            disabled={loading}
            onClick={() =>
              doAction("approve", { finalReward: parseFloat(approveReward) })
            }
          >
            Confirm
          </Button>
        </div>
      )}
    </div>
  );
}

function BountyManager() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<BountyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  function load() {
    setLoading(true);
    fetch(API_URL + "/bounties")
      .then((r) => r.json())
      .then((j) => {
        setBounties(j?.data?.bounties || []);
        setStats(j?.data?.stats || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered =
    statusFilter === "all"
      ? bounties
      : bounties.filter((b) => b.status === statusFilter);

  const escrow = stats?.escrow;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Bounty Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Approve submissions, release payments, track escrow
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Open" value={stats.open} />
          <MetricCard label="Submitted" value={stats.submitted} />
          <MetricCard label="Paid" value={stats.paid} />
          <MetricCard label="Total Paid" value={`${formatNumber(stats.totalPaid)} XRD`} />
        </div>
      )}

      {/* Escrow */}
      {escrow && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Escrow Status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 pt-0">
            <div>
              <div className="text-[10px] text-muted-foreground">Funded</div>
              <div className="text-lg font-bold font-mono text-primary">
                {escrow.funded.toFixed(1)} XRD
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Released</div>
              <div className="text-lg font-bold font-mono">{escrow.released.toFixed(1)} XRD</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Available</div>
              <div className="text-lg font-bold font-mono text-green-500">
                {escrow.available.toFixed(1)} XRD
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-sm"
      >
        {["all", "open", "assigned", "submitted", "verified", "paid"].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Bounty list */}
      <Card>
        <CardContent className="pt-3 pb-1">
          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No bounties found.
            </p>
          ) : (
            filtered.map((b) => (
              <BountyRow key={b.id} bounty={b} onAction={load} />
            ))
          )}
        </CardContent>
      </Card>

      {(stats?.submitted ?? 0) > 0 && (
        <Alert>
          <AlertDescription>
            {stats!.submitted} bounty submission{stats!.submitted > 1 ? "s" : ""} awaiting review.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function AdminBountiesPage() {
  return (
    <AppShell>
      <AdminNav />
      <ProtectedRoute>
        <BountyManager />
      </ProtectedRoute>
    </AppShell>
  );
}
