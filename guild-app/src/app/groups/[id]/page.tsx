"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL, TG_BOT_URL } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";

interface GroupMember { id: number; radix_address: string; role: string; joined_at: number; }
interface GroupBounty { id: number; title: string; reward_xrd: number; status: string; category: string; }
interface GroupProposal { id: number; title: string; type: string; status: string; }
interface GroupDetail {
  id: number; name: string; description: string; icon: string;
  lead_address: string; status: string; member_count: number;
  members: GroupMember[]; bounties: GroupBounty[]; proposals: GroupProposal[];
}

const ICONS: Record<string, string> = {
  shield: "🛡️", vote: "🗳️", server: "🖥️", briefcase: "💼", megaphone: "📢",
};

function GroupDetailContent() {
  const params = useParams();
  const id = params?.id;
  const { account, connected } = useWallet();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(API_URL + "/groups/" + id).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setGroup(d.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  if (loading) return <div className="space-y-5"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  if (error || !group) return (
    <div className="space-y-5">
      <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground no-underline">← Back to Groups</Link>
      <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground text-sm">Group not found.</p></CardContent></Card>
    </div>
  );

  return (
    <div className="space-y-5">
      <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground no-underline">← Back to Groups</Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{ICONS[group.icon] || "📋"}</span>
            <div>
              <h1 className="text-xl font-bold">{group.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="text-xs">{group.member_count} member{group.member_count !== 1 ? "s" : ""}</Badge>
                <Badge variant="outline" className="text-xs">{group.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {group.members.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No members yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {group.members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm font-mono">{m.radix_address.slice(0, 16)}...{m.radix_address.slice(-6)}</span>
                  <Badge variant={m.role === "lead" ? "default" : "secondary"} className="text-[9px]">{m.role}</Badge>
                </div>
              ))}
            </div>
          )}
          {connected && account && group && (() => {
            const isMember = group.members.some(m => m.radix_address === account);
            const isLead = group.members.some(m => m.radix_address === account && m.role === "lead");
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
                  // Refresh
                  const d = await fetch(API_URL + "/groups/" + id).then(r => r.json());
                  setGroup(d.data);
                }
              } catch (e) {}
              setJoining(false);
            }
            return (
              <Button variant={isMember ? "ghost" : "default"} size="sm" className="w-full mt-3"
                onClick={handleJoinLeave} disabled={joining || isLead}>
                {joining ? "..." : isMember ? (isLead ? "Lead (can't leave)" : "Leave Group") : "Join Group"}
              </Button>
            );
          })()}
          {!connected && (
            <p className="text-[11px] text-muted-foreground mt-3 text-center">Connect wallet to join, or use <a href={TG_BOT_URL} target="_blank" className="text-primary hover:underline">/group join</a> in Telegram.</p>
          )}
        </CardContent>
      </Card>

      {/* Linked Bounties */}
      {group.bounties.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Linked Tasks ({group.bounties.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {group.bounties.map(b => (
                <Link key={b.id} href={`/bounties/${b.id}`} className="flex items-center justify-between py-1.5 border-b last:border-0 no-underline text-foreground hover:text-primary">
                  <div>
                    <span className="text-muted-foreground font-mono text-xs mr-2">#{b.id}</span>
                    <span className="text-sm">{b.title.slice(0, 40)}{b.title.length > 40 ? "..." : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-primary">{b.reward_xrd} XRD</span>
                    <Badge variant="secondary" className="text-[9px]">{b.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Proposals */}
      {group.proposals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Linked Proposals ({group.proposals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {group.proposals.map(p => (
                <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center justify-between py-1.5 border-b last:border-0 no-underline text-foreground hover:text-primary">
                  <div>
                    <span className="text-muted-foreground font-mono text-xs mr-2">#{p.id}</span>
                    <span className="text-sm">{p.title.slice(0, 45)}{p.title.length > 45 ? "..." : ""}</span>
                  </div>
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
