"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/lib/constants";

interface Ticket {
  id: number; tg_id: number; username: string | null;
  category: string; message: string; status: string;
  admin_response: string | null;
  created_at: number; resolved_at: number | null;
}
interface FeedbackStats {
  open: number; responded: number; resolved: number; total: number;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive", responded: "secondary", resolved: "default",
};

function FeedbackContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(API_URL + "/feedback").then(r => r.json()),
      fetch(API_URL + "/feedback/stats").then(r => r.json()),
    ]).then(([t, s]) => {
      setTickets(t.data || []);
      setStats(s.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Feedback & Support</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Community feedback tickets. Users submit via <code className="bg-muted px-1 rounded text-[11px]">/feedback</code> in Telegram.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open", value: stats.open, color: "text-red-400" },
            { label: "Responded", value: stats.responded, color: "text-yellow-500" },
            { label: "Resolved", value: stats.resolved, color: "text-primary" },
            { label: "Total", value: stats.total, color: "text-muted-foreground" },
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        {["all", "open", "responded", "resolved"].map(f => (
          <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm"
            onClick={() => setFilter(f)} className="capitalize text-xs">
            {f}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto text-xs">Refresh</Button>
      </div>

      {/* Tickets */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></CardContent></Card>
        ))}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              {filter === "all" ? "No feedback yet. Users can submit with /feedback in Telegram." : `No ${filter} tickets.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-xs">#{t.id}</span>
                    <span className="text-sm font-medium">@{t.username || "anon"}</span>
                    <Badge variant="outline" className="text-[9px]">{t.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">{new Date(t.created_at * 1000).toLocaleDateString()}</span>
                    <Badge variant={STATUS_VARIANT[t.status] || "secondary"} className="text-[9px]">{t.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-foreground mb-2">{t.message}</p>
                {t.admin_response && (
                  <div className="bg-muted rounded-lg p-2.5 mt-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Admin Response</div>
                    <p className="text-xs text-foreground">{t.admin_response}</p>
                  </div>
                )}
                {t.resolved_at && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Resolved: {new Date(t.resolved_at * 1000).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Instructions */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admin Commands (Telegram)</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div><code className="bg-muted px-1 rounded">/adminfeedback</code> — list open tickets</div>
            <div><code className="bg-muted px-1 rounded">/adminfeedback respond &lt;id&gt; &lt;message&gt;</code> — respond (notifies user)</div>
            <div><code className="bg-muted px-1 rounded">/adminfeedback resolve &lt;id&gt;</code> — mark resolved (notifies user)</div>
            <div><code className="bg-muted px-1 rounded">/adminfeedback stats</code> — ticket counts</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FeedbackPage() {
  return <AppShell><FeedbackContent /></AppShell>;
}
