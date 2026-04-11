"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTip } from "@/components/InfoTip";
import { API_URL, TG_BOT_URL } from "@/lib/constants";

interface WorkingGroup {
  id: number; name: string; description: string; icon: string;
  lead_address: string; status: string; member_count: number; created_at: number;
}
interface OverdueData { period: string; groups: { id: number }[]; }
interface ExpiringGroup { id: number; days_remaining: number; }

const ICONS: Record<string, string> = {
  shield: "🛡️", vote: "🗳️", server: "🖥️", briefcase: "💼", megaphone: "📢",
};

function GroupsContent() {
  const [groups, setGroups] = useState<WorkingGroup[]>([]);
  const [overdueIds, setOverdueIds] = useState<Set<number>>(new Set());
  const [expiringMap, setExpiringMap] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(API_URL + "/groups").then(r => r.json()),
      fetch(API_URL + "/groups/overdue").then(r => r.json()).catch(() => null),
      fetch(API_URL + "/groups/expiring").then(r => r.json()).catch(() => null),
    ]).then(([g, o, e]) => {
      setGroups(g.data || []);
      if (o?.data?.groups) setOverdueIds(new Set(o.data.groups.map((x: { id: number }) => x.id)));
      if (e?.data) {
        const m = new Map<number, number>();
        e.data.forEach((x: ExpiringGroup) => m.set(x.id, x.days_remaining));
        setExpiringMap(m);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-bold">Working Groups</h1>
          <InfoTip text="Teams that organize who does what. Each group has a lead, charter with sunset date, budget, and biweekly reports. Join with /group join in TG or click Join on any group page." link="/docs" />
        </div>
        <p className="text-muted-foreground text-sm mt-1">Teams that coordinate the guild&apos;s work. Join a group to contribute.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">No working groups yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map(g => (
            <Link key={g.id} href={`/groups/${g.id}`} className="block no-underline text-foreground">
              <Card className="hover:bg-accent/5 transition-colors h-full">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{ICONS[g.icon] || "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{g.name}</span>
                        <div className="flex items-center gap-1">
                          {overdueIds.has(g.id) && <Badge variant="destructive" className="text-[8px]">Report Overdue</Badge>}
                          {expiringMap.has(g.id) && (
                            <Badge variant={expiringMap.get(g.id)! <= 7 ? "destructive" : "outline"} className="text-[8px] text-yellow-500 border-yellow-500">
                              {expiringMap.get(g.id)!}d left
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[9px]">{g.member_count} member{g.member_count !== 1 ? "s" : ""}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{g.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* How Working Groups Work */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="bg-muted rounded-lg p-2 flex items-center justify-center">
            <img src="/infographics/08-working-groups.svg" alt="Working Groups — Join, Contribute, Report" className="max-w-full h-auto max-h-[500px] rounded" />
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        Join a group: <a href={TG_BOT_URL} target="_blank" className="text-primary hover:underline">/group join &lt;name&gt;</a> in Telegram, or click Join on any group page above.
      </div>
    </div>
  );
}

export default function GroupsPage() {
  return <AppShell><GroupsContent /></AppShell>;
}
