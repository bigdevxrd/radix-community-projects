"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_URL, TG_BOT_URL } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";

interface Ticket {
  id: number; tg_id: number; username: string | null;
  category: string; message: string; status: string;
  admin_response: string | null; radix_address: string | null;
  created_at: number; resolved_at: number | null;
}
interface FeedbackStats {
  open: number; responded: number; resolved: number; total: number;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive", responded: "secondary", resolved: "default",
};
const CATEGORIES = ["general", "bug", "feature", "question", "other"];

function FeedbackContent() {
  const { account, connected } = useWallet();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "all">(connected ? "my" : "all");
  const [filter, setFilter] = useState("all");

  // Submit form state
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState("");
  const [submitError, setSubmitError] = useState("");

  const fetchData = () => {
    setLoading(true);
    const fetches = [
      fetch(API_URL + "/feedback").then(r => r.json()),
      fetch(API_URL + "/feedback/stats").then(r => r.json()),
    ];
    if (account) {
      fetches.push(fetch(API_URL + "/feedback?address=" + account).then(r => r.json()));
    }
    Promise.all(fetches).then(([t, s, m]) => {
      setTickets(t.data || []);
      setStats(s.data || null);
      if (m) setMyTickets(m.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [account]);
  useEffect(() => { if (connected) setTab("my"); }, [connected]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true); setSubmitResult(""); setSubmitError("");
    try {
      const resp = await fetch(API_URL + "/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), category, address: account || null, username: "dashboard" }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSubmitResult("Ticket #" + data.data.id + " created!");
        setMessage("");
        setTimeout(() => { fetchData(); setSubmitResult(""); }, 2000);
      } else {
        setSubmitError(data.error || "Failed to submit");
      }
    } catch { setSubmitError("Network error"); }
    setSubmitting(false);
  };

  const visibleTickets = tab === "my" ? myTickets : (filter === "all" ? tickets : tickets.filter(t => t.status === filter));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Support & Feedback</h1>
        <p className="text-muted-foreground text-sm mt-1">Report issues, ask questions, or share ideas.</p>
      </div>

      {/* Submit Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Submit Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {CATEGORIES.map(c => (
              <Button key={c} variant={category === c ? "default" : "ghost"} size="sm"
                onClick={() => setCategory(c)} className="capitalize text-xs h-7 px-2">{c}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the issue or share your thoughts..."
              className="text-sm" maxLength={1000} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSubmit(); }} />
            <Button onClick={handleSubmit} disabled={submitting || !message.trim()} size="sm">
              {submitting ? "..." : "Submit"}
            </Button>
          </div>
          {submitResult && <Alert><AlertDescription>{submitResult}</AlertDescription></Alert>}
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          {!connected && (
            <p className="text-[11px] text-muted-foreground">Connect your wallet to track your tickets. Or use <code className="bg-muted px-1 rounded">/feedback</code> in <a href={TG_BOT_URL} target="_blank" className="text-primary hover:underline">Telegram</a>.</p>
          )}
        </CardContent>
      </Card>

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

      {/* Tabs: My Tickets / All Tickets */}
      <div className="flex items-center gap-2">
        {connected && (
          <>
            <Button variant={tab === "my" ? "default" : "ghost"} size="sm" onClick={() => setTab("my")} className="text-xs">
              My Tickets ({myTickets.length})
            </Button>
            <Button variant={tab === "all" ? "default" : "ghost"} size="sm" onClick={() => setTab("all")} className="text-xs">
              All Tickets
            </Button>
          </>
        )}
        {tab === "all" && (
          <div className="flex items-center gap-1 ml-auto">
            {["all", "open", "responded", "resolved"].map(f => (
              <Button key={f} variant={filter === f ? "secondary" : "ghost"} size="sm"
                onClick={() => setFilter(f)} className="capitalize text-[11px] h-7 px-2">{f}</Button>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto text-xs">Refresh</Button>
      </div>

      {/* Tickets */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></CardContent></Card>
        ))}</div>
      ) : visibleTickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              {tab === "my" ? "No tickets yet. Submit one above!" : "No feedback tickets."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleTickets.map(t => (
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
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Response</div>
                    <p className="text-xs text-foreground">{t.admin_response}</p>
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
            <div><code className="bg-muted px-1 rounded">/adminfeedback resolve &lt;id&gt;</code> — mark resolved</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FeedbackPage() {
  return <AppShell><FeedbackContent /></AppShell>;
}
