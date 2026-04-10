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
import { API_URL, TG_BOT_URL } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";

interface GroupMember { id: number; radix_address: string; role: string; joined_at: number; }
interface GroupBounty { id: number; title: string; reward_xrd: number; status: string; category: string; funded: number; }
interface GroupProposal { id: number; title: string; type: string; status: string; }
interface WGReport { id: number; delivered: string; next_steps: string; blocked: string; budget_spent: number; period: string; created_at: number; }
interface BudgetStatus { monthly: number; spent: number; remaining: number; percentage: number; }
interface GroupDetail {
  id: number; name: string; description: string; icon: string; charter: string | null;
  lead_address: string; status: string; member_count: number;
  members: GroupMember[]; bounties: GroupBounty[]; proposals: GroupProposal[];
  tasks_count: number; budget: BudgetStatus | null; latest_report: WGReport | null;
  budget_monthly: number; sunset_date: number | null;
}

const ICONS: Record<string, string> = {
  shield: "\u{1F6E1}\uFE0F", vote: "\u{1F5F3}\uFE0F", server: "\u{1F5A5}\uFE0F", briefcase: "\u{1F4BC}", megaphone: "\u{1F4E2}",
};
const TABS = ["Members", "Tasks", "Budget", "Reports", "Charter"];
const STATUS_COLORS: Record<string, string> = {
  open: "text-primary", assigned: "text-yellow-500", submitted: "text-blue-400",
  verified: "text-blue-400", paid: "text-muted-foreground", cancelled: "text-red-400",
};

function GroupDetailContent() {
  const params = useParams();
  const id = params?.id;
  const { account, connected } = useWallet();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [tasks, setTasks] = useState<GroupBounty[]>([]);
  const [reports, setReports] = useState<WGReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(API_URL + "/groups/" + id).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(API_URL + "/groups/" + id + "/tasks").then(r => r.ok ? r.json() : { data: [] }),
      fetch(API_URL + "/groups/" + id + "/reports").then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([g, t, r]) => {
      setGroup(g.data); setTasks(t.data || []); setReports(r.data || []); setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  }, [id]);

  if (loading) return <div className="space-y-5"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  if (error || !group) return (
    <div className="space-y-5">
      <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground no-underline">&larr; Back to Groups</Link>
      <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground text-sm">Group not found.</p></CardContent></Card>
    </div>
  );

  const isMember = connected && account && group.members.some(m => m.radix_address === account);
  const isLead = connected && account && group.members.some(m => m.radix_address === account && m.role === "lead");

  async function handleJoinLeave() {
    if (!account || !group) return;
    setJoining(true);
    const action = isMember ? "leave" : "join";
    try {
      const resp = await fetch(API_URL + "/groups/" + group.id + "/" + action, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account }),
      });
      if (resp.ok) {
        const d = await fetch(API_URL + "/groups/" + id).then(r => r.json());
        setGroup(d.data);
      }
    } catch (_) {}
    setJoining(false);
  }

  const budget = group.budget || { monthly: 0, spent: 0, remaining: 0, percentage: 0 };
  const openTasks = tasks.filter(t => t.status === "open").length;
  const inProgress = tasks.filter(t => t.status === "assigned" || t.status === "submitted").length;
  const completed = tasks.filter(t => t.status === "paid" || t.status === "verified").length;

  return (
    <div className="space-y-4">
      <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground no-underline">&larr; Back to Groups</Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{ICONS[group.icon] || "\u{1F4CB}"}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">{group.name}</h1>
                <div className="flex gap-1.5">
                  <Badge variant="default" className="text-[10px]">{group.member_count} member{group.member_count !== 1 ? "s" : ""}</Badge>
                  {group.status !== "active" && <Badge variant="destructive" className="text-[10px]">{group.status}</Badge>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
              {/* Quick stats */}
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{openTasks}</strong> open tasks</span>
                <span><strong className="text-foreground">{inProgress}</strong> in progress</span>
                <span><strong className="text-foreground">{completed}</strong> completed</span>
                {budget.monthly > 0 && <span><strong className="text-foreground">{budget.percentage}%</strong> budget used</span>}
              </div>
            </div>
          </div>
          {/* Join/Leave */}
          {connected ? (
            <Button variant={isMember ? "ghost" : "default"} size="sm" className="w-full mt-3"
              onClick={handleJoinLeave} disabled={joining || !!isLead}>
              {joining ? "..." : isMember ? (isLead ? "Lead (can't leave)" : "Leave Group") : "Join Group"}
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-3 text-center">Connect wallet to join, or <a href={TG_BOT_URL} target="_blank" className="text-primary hover:underline">/group join</a> in TG.</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 min-w-0 px-3 py-2 text-center text-[12px] font-medium whitespace-nowrap transition-colors border-b-2 ${
              i === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>{t}{i === 1 && tasks.length > 0 ? ` (${tasks.length})` : ""}{i === 3 && reports.length > 0 ? ` (${reports.length})` : ""}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 0 && (
        <Card>
          <CardContent className="pt-4">
            {group.members.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No members yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {group.members.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm font-mono">{m.radix_address.slice(0, 16)}...{m.radix_address.slice(-6)}</span>
                    <Badge variant={m.role === "lead" ? "default" : m.role === "steward" ? "secondary" : "outline"} className="text-[9px]">{m.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardContent className="pt-4">
            {tasks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-2">No tasks linked to this group yet.</p>
                <p className="text-[11px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">/wg assign &lt;task_id&gt; {group.name}</code> in TG to link tasks.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <Link key={t.id} href={`/bounties/${t.id}`} className="flex items-center justify-between py-2 border-b last:border-0 no-underline text-foreground hover:text-primary">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-[11px]">#{t.id}</span>
                        <span className="text-sm truncate">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[8px]">{t.category}</Badge>
                        {t.funded ? <Badge variant="default" className="text-[8px]">Funded</Badge> : <Badge variant="secondary" className="text-[8px]">Unfunded</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono text-primary">{t.reward_xrd} XRD</div>
                      <div className={`text-[10px] ${STATUS_COLORS[t.status] || "text-muted-foreground"}`}>{t.status}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            {budget.monthly > 0 ? (
              <>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Monthly Budget</span>
                    <span className="font-mono text-primary">${budget.monthly.toLocaleString()}</span>
                  </div>
                  <Progress value={budget.percentage} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                    <span>${budget.spent.toLocaleString()} spent</span>
                    <span>${budget.remaining.toLocaleString()} remaining</span>
                  </div>
                </div>
                {group.sunset_date && (
                  <div className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-2">
                    <span className="text-muted-foreground">Charter expires</span>
                    <span className="font-mono">{new Date(group.sunset_date * 1000).toLocaleDateString()}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-2">No budget set for this group.</p>
                <p className="text-[11px] text-muted-foreground">Budget is set when the WG charter is approved.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 3 && (
        <Card>
          <CardContent className="pt-4">
            {reports.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-2">No reports filed yet.</p>
                <p className="text-[11px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">/wg report {group.name}</code> in TG to file a report.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(r => (
                  <div key={r.id} className="bg-muted rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] font-mono">{r.period || "Report"}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.created_at * 1000).toLocaleDateString()}</span>
                    </div>
                    {r.delivered && <div><div className="text-[10px] text-muted-foreground uppercase">Delivered</div><div className="text-xs">{r.delivered}</div></div>}
                    {r.next_steps && <div><div className="text-[10px] text-muted-foreground uppercase">Next</div><div className="text-xs">{r.next_steps}</div></div>}
                    {r.blocked && <div><div className="text-[10px] text-muted-foreground uppercase">Blocked</div><div className="text-xs text-red-400">{r.blocked}</div></div>}
                    {r.budget_spent > 0 && <div className="text-[10px] text-muted-foreground">Budget spent: <span className="font-mono text-primary">${r.budget_spent}</span></div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 4 && (
        <Card>
          <CardContent className="pt-4">
            {group.charter ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap">{group.charter}</div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-2">No charter defined yet.</p>
                <p className="text-[11px] text-muted-foreground">The charter is set when the working group is formally proposed and approved.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Linked Proposals (always visible below tabs) */}
      {group.proposals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Linked Proposals ({group.proposals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {group.proposals.map(p => (
                <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center justify-between py-1.5 border-b last:border-0 no-underline text-foreground hover:text-primary">
                  <div><span className="text-muted-foreground font-mono text-xs mr-2">#{p.id}</span><span className="text-sm">{p.title.slice(0, 45)}{p.title.length > 45 ? "..." : ""}</span></div>
                  <Badge variant="secondary" className="text-[9px]">{p.status}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GroupDetailPage() {
  return <AppShell><GroupDetailContent /></AppShell>;
}
