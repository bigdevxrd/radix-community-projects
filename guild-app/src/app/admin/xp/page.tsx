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
import { API_URL } from "@/lib/constants";
import { truncateAddress } from "@/lib/charts";
import type { XpQueueEntry } from "@/lib/types";

const REASONS = ["vote", "bounty", "contribution", "referral", "streak", "other"];

function XpAwardForm({ onAwarded }: { onAwarded: () => void }) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState(REASONS[0]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function award() {
    if (!address.trim()) return;
    setLoading(true);
    setStatus("");
    try {
      await fetch(`${API_URL}/admin/xp/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, amount, reason }),
      });
      setStatus(`Queued ${amount} XP → ${truncateAddress(address)}`);
      setAddress("");
      onAwarded();
    } catch {
      setStatus("Failed to queue award");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Manual Award
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="account_rdx1..."
            className="flex-1 min-w-[200px] font-mono text-[13px]"
          />
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={1000}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="font-mono text-sm text-primary w-12">{amount} XP</span>
          </div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Button size="sm" onClick={award} disabled={loading || !address.trim()}>
            Award
          </Button>
        </div>
        {status && (
          <Alert>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function XpQueueSection({ queue, onRevoke }: { queue: XpQueueEntry[]; onRevoke: (i: number) => void }) {
  const total = queue.reduce((s, e) => s + e.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Pending Queue
          </CardTitle>
          <span className="text-xs font-mono text-primary">{total} XP total ({queue.length} entries)</span>
        </div>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2 text-center">Queue empty</p>
        ) : (
          <div>
            {queue.map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="font-mono text-xs">{truncateAddress(entry.address)}</div>
                  <div className="text-[10px] text-muted-foreground">{entry.reason}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-primary">{entry.amount} XP</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[11px] h-6 text-destructive"
                    onClick={() => onRevoke(i)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
            <div className="pt-3">
              <p className="text-xs text-muted-foreground">
                Run <code className="bg-muted px-1 rounded">node scripts/xp-batch-signer.js</code> to process the queue.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function XpHistorySection() {
  const [history, setHistory] = useState<XpQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL + "/xp-queue")
      .then((r) => r.json())
      .then((j) => setHistory(j?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState rows={2} />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          XP Queue History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2 text-center">No history</p>
        ) : (
          history.slice(0, 50).map((entry, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <div className="font-mono text-xs">{truncateAddress(entry.address)}</div>
                <div className="text-[10px] text-muted-foreground">{entry.reason}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-primary">{entry.amount} XP</span>
                <Badge variant={entry.signed ? "default" : "secondary"}>
                  {entry.signed ? "signed" : "pending"}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function XpManager() {
  const [queue, setQueue] = useState<XpQueueEntry[]>([]);

  function loadQueue() {
    fetch(API_URL + "/xp-queue")
      .then((r) => r.json())
      .then((j) => {
        const raw: XpQueueEntry[] = j?.data || [];
        setQueue(raw.filter((e) => !e.signed));
      })
      .catch(() => {});
  }

  useEffect(() => { loadQueue(); }, []);

  function revokeEntry(idx: number) {
    setQueue((q) => q.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">XP Rewards Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Award, queue, and track XP distributions</p>
      </div>

      <XpAwardForm onAwarded={loadQueue} />
      <XpQueueSection queue={queue} onRevoke={revokeEntry} />
      <XpHistorySection />
    </div>
  );
}

export default function AdminXpPage() {
  return (
    <AppShell>
      <AdminNav />
      <ProtectedRoute>
        <XpManager />
      </ProtectedRoute>
    </AppShell>
  );
}
