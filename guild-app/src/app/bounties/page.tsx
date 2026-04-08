"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { API_URL, TG_BOT_URL } from "@/lib/constants";

interface Bounty {
  id: number; title: string; description: string | null;
  reward_xrd: number; reward_xp: number; status: string;
  category: string; difficulty: string; priority: string;
  deadline: number | null; platform_fee_pct: number;
  creator_tg_id: number; assignee_tg_id: number | null;
  assignee_address: string | null; github_issue: string | null;
  github_pr: string | null; created_at: number;
  assigned_at: number | null; submitted_at: number | null;
  verified_at: number | null; paid_at: number | null; paid_tx: string | null;
  funded: number;
}
interface Category { id: number; name: string; description: string; icon: string; sort_order: number; }
interface BountyStats {
  open: number; assigned: number; submitted: number;
  verified: number; paid: number; totalPaid: number;
  escrow: { funded: number; released: number; available: number };
}
interface EscrowTx {
  id: number; bounty_id: number | null; tx_type: string;
  amount_xrd: number; tx_hash: string | null;
  description: string; created_at: number;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default", assigned: "secondary", submitted: "outline", verified: "outline", paid: "default", cancelled: "destructive",
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  open: "text-primary", assigned: "text-yellow-500", submitted: "text-blue-400",
  verified: "text-blue-400", paid: "text-muted-foreground",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400", medium: "text-yellow-500", hard: "text-orange-400", expert: "text-red-400",
};

function deadlineCountdown(deadline: number | null): string | null {
  if (!deadline) return null;
  const diff = deadline * 1000 - Date.now();
  if (diff <= 0) return "Expired";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h left`;
}

function BountiesContent() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<BountyStats | null>(null);
  const [transactions, setTransactions] = useState<EscrowTx[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [showTxs, setShowTxs] = useState(false);

  const fetchData = () => {
    setLoading(true); setError(false);
    Promise.all([
      fetch(API_URL + "/bounties").then(r => r.json()),
      fetch(API_URL + "/escrow").then(r => r.json()).catch(() => null),
      fetch(API_URL + "/bounties/categories").then(r => r.json()).catch(() => null),
    ]).then(([d, e, c]) => {
      setBounties(d.data?.bounties || []);
      setStats(d.data?.stats || null);
      setTransactions(e?.data?.transactions || []);
      setCategories(c?.data || []);
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  let filtered = filter === "all" ? bounties : bounties.filter(b => b.status === filter);
  if (catFilter !== "all") filtered = filtered.filter(b => b.category === catFilter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Bounty Board</h1>
        <p className="text-muted-foreground text-sm mt-1">Earn XRD and XP by completing tasks for the community.</p>
      </div>

      {/* How Bounties Work */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">How It Works</div>
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: "Create", desc: "Admin posts a task + reward" },
              { label: "Claim", desc: "/bounty claim <id>" },
              { label: "Submit", desc: "/bounty submit <id>" },
              { label: "Verify", desc: "Admin reviews delivery" },
              { label: "Pay", desc: "XRD released from escrow" },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground text-xs mx-0.5">&rarr;</span>}
                <div className="bg-muted rounded px-2 py-1 text-center">
                  <div className="text-[11px] font-semibold">{s.label}</div>
                  <div className="text-[9px] text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            All bounty commands run in <a href={TG_BOT_URL} target="_blank" className="text-primary hover:underline">@rad_gov</a> on Telegram. Escrow holds XRD until delivery is verified.
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">Failed to load bounties</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open", value: stats.open, color: STATUS_TEXT_COLORS.open },
            { label: "In Progress", value: stats.assigned, color: STATUS_TEXT_COLORS.assigned },
            { label: "Review", value: stats.submitted + stats.verified, color: STATUS_TEXT_COLORS.submitted },
            { label: "Paid", value: stats.paid, color: STATUS_TEXT_COLORS.paid },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="px-4 py-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Funding Summary */}
      {stats && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Funded tasks: {bounties.filter(b => b.funded).length}</span>
          <span>Unfunded: {bounties.filter(b => !b.funded && b.status === "open").length}</span>
          <span>Total value: {bounties.reduce((a, b) => a + b.reward_xrd, 0)} XRD</span>
        </div>
      )}

      {/* Escrow Transactions */}
      {transactions.length > 0 && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setShowTxs(!showTxs)}
            className="text-xs text-muted-foreground">
            {showTxs ? "Hide" : "Show"} Transaction History ({transactions.length})
          </Button>
          {showTxs && (
            <Card className="mt-2">
              <CardContent className="pt-3 pb-3">
                <div className="space-y-0">
                  {transactions.slice(0, 20).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant={tx.tx_type === "deposit" ? "default" : "secondary"} className="text-[9px]">
                          {tx.tx_type}
                        </Badge>
                        <span className="text-muted-foreground">{tx.description}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono font-bold ${tx.tx_type === "deposit" ? "text-primary" : "text-muted-foreground"}`}>
                          {tx.tx_type === "deposit" ? "+" : "-"}{tx.amount_xrd} XRD
                        </span>
                        <span className="text-muted-foreground">{new Date(tx.created_at * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {["all", "open", "assigned", "submitted", "verified", "paid"].map(f => (
          <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm"
            onClick={() => setFilter(f)} className="capitalize text-xs">
            {f === "all" ? `All (${bounties.length})` : f}
          </Button>
        ))}
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">Category:</span>
          <Button variant={catFilter === "all" ? "secondary" : "ghost"} size="sm"
            onClick={() => setCatFilter("all")} className="text-[11px] h-7 px-2">All</Button>
          {categories.map(c => (
            <Button key={c.name} variant={catFilter === c.name ? "secondary" : "ghost"} size="sm"
              onClick={() => setCatFilter(c.name)} className="text-[11px] h-7 px-2 capitalize">
              {c.name}
            </Button>
          ))}
        </div>
      )}

      {/* Bounty List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-full" />
            </CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-2">
              {filter === "all" ? "No tasks listed yet." : `No ${filter} tasks.`}
            </p>
            <p className="text-xs text-muted-foreground">
              Badge holders can create tasks in <a href={TG_BOT_URL} target="_blank" className="text-primary hover:underline">Telegram</a>. Sponsors fund them. Workers deliver and get paid.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <Card key={b.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <span className="text-muted-foreground font-mono text-xs mr-2">#{b.id}</span>
                    <Link href={`/bounties/${b.id}`} className="font-semibold text-sm hover:text-primary no-underline text-foreground">{b.title}</Link>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-bold text-primary">{b.reward_xrd} XRD</span>
                    {b.status === "open" && (
                      <Badge variant={b.funded ? "default" : "outline"} className={`text-[9px] ${b.funded ? "" : "text-muted-foreground"}`}>
                        {b.funded ? "Funded" : "Seeking Sponsor"}
                      </Badge>
                    )}
                    <Badge variant={STATUS_COLORS[b.status] || "secondary"}>{b.status}</Badge>
                  </div>
                </div>
                {/* Category + Difficulty + Deadline */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {b.category && b.category !== "general" && (
                    <Badge variant="outline" className="text-[9px] capitalize">{b.category}</Badge>
                  )}
                  {b.difficulty && b.difficulty !== "medium" && (
                    <Badge variant="outline" className={`text-[9px] capitalize ${DIFFICULTY_COLORS[b.difficulty] || ""}`}>{b.difficulty}</Badge>
                  )}
                  {b.priority && b.priority !== "normal" && (
                    <Badge variant="destructive" className="text-[9px] capitalize">{b.priority}</Badge>
                  )}
                  {(() => {
                    const dl = deadlineCountdown(b.deadline);
                    if (!dl) return null;
                    const urgent = dl === "Expired" || (b.deadline && b.deadline * 1000 - Date.now() < 86400000);
                    return <Badge variant={urgent ? "destructive" : "secondary"} className="text-[9px] font-mono">{dl}</Badge>;
                  })()}
                </div>
                {b.description && (
                  <p className="text-xs text-muted-foreground mb-2">{b.description.slice(0, 120)}{b.description.length > 120 ? "..." : ""}</p>
                )}
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span>Created {new Date(b.created_at * 1000).toLocaleDateString()}</span>
                  {b.assignee_address && (
                    <span>Assignee: {b.assignee_address.slice(0, 12)}...{b.assignee_address.slice(-4)}</span>
                  )}
                  {b.reward_xp > 0 && <span>+{b.reward_xp} XP</span>}
                  {b.platform_fee_pct > 0 && <span className="text-[10px]">{b.platform_fee_pct}% fee</span>}
                </div>
                {(b.github_issue || b.github_pr) && (
                  <div className="flex gap-3 mt-2">
                    {b.github_issue && (
                      <a href={b.github_issue} target="_blank" className="text-xs text-primary hover:underline">Issue</a>
                    )}
                    {b.github_pr && (
                      <a href={b.github_pr} target="_blank" className="text-xs text-primary hover:underline">PR</a>
                    )}
                  </div>
                )}
                {b.paid_tx && (
                  <a href={`https://dashboard.radixdlt.com/transaction/${b.paid_tx}`} target="_blank"
                    className="text-xs text-primary hover:underline mt-1 block">
                    View payment tx
                  </a>
                )}
                {/* Timeline dots */}
                <div className="flex items-center gap-1.5 mt-3">
                  {["created", "assigned", "submitted", "verified", "paid"].map((step, i) => {
                    const ts = [b.created_at, b.assigned_at, b.submitted_at, b.verified_at, b.paid_at][i];
                    const active = !!ts;
                    return (
                      <div key={step} className="flex items-center gap-1.5">
                        {i > 0 && <div className={`h-px w-4 sm:w-6 ${active ? "bg-primary" : "bg-muted"}`} />}
                        <div className={`h-2 w-2 rounded-full ${active ? "bg-primary" : "bg-muted"}`}
                          title={step + (ts ? ": " + new Date(ts * 1000).toLocaleDateString() : "")} />
                      </div>
                    );
                  })}
                  <span className="text-[10px] text-muted-foreground ml-1 capitalize">{b.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center pt-2">
        <a href={TG_BOT_URL} target="_blank" className="text-primary text-sm font-semibold hover:underline">
          Create Bounties in Telegram
        </a>
      </div>
    </div>
  );
}

export default function BountiesPage() {
  return <AppShell><BountiesContent /></AppShell>;
}
