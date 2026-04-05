"use client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useFederationProposals, useFederationVoters, useSyncHealth, useVoteWeights } from "@/hooks/useFederation";

function SyncHealthTimeline({ status }: {
  status: {
    cv2_api: string;
    crumbsup_api: string;
    gateway_api: string;
    db: string;
    last_check: number;
  } | null
}) {
  const items = [
    { label: "CV2 API", value: status?.cv2_api },
    { label: "CrumbsUp API", value: status?.crumbsup_api },
    { label: "Radix Gateway", value: status?.gateway_api },
    { label: "Database", value: status?.db },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Sync Health Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <Badge variant={item.value === "ok" || item.value === "configured" ? "default" : "secondary"}>
                {item.value || "n/a"}
              </Badge>
            </div>
          ))}
        </div>
        {status?.last_check && (
          <p className="text-[11px] text-muted-foreground mt-3">
            Checked at: {new Date(status.last_check * 1000).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformComparison({ proposals }: {
  proposals: Array<{
    guild_proposal: { id: number; title: string; status: string };
    cv2: { cv2_id: string } | null;
    crumbsup: { crumbsup_id: string } | null;
    combined_vote_count: number;
  }>
}) {
  const guildOnly = proposals.filter(p => !p.cv2 && !p.crumbsup).length;
  const cv2Synced = proposals.filter(p => !!p.cv2).length;
  const crumbsupSynced = proposals.filter(p => !!p.crumbsup).length;
  const bothSynced = proposals.filter(p => !!p.cv2 && !!p.crumbsup).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Platform Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{proposals.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Proposals</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{bothSynced}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Full Sync</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{cv2Synced}</div>
            <div className="text-xs text-muted-foreground mt-0.5">CV2 Synced</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{crumbsupSynced}</div>
            <div className="text-xs text-muted-foreground mt-0.5">CrumbsUp Synced</div>
          </div>
        </div>
        {guildOnly > 0 && (
          <p className="text-xs text-muted-foreground">{guildOnly} proposals pending sync</p>
        )}
      </CardContent>
    </Card>
  );
}

function FederationVotersTable({ voters }: {
  voters: Array<{
    address: string;
    guild_xp: number;
    crumbsup_reputation: number;
    total_weight: number;
  }>
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Federation Voters</CardTitle>
      </CardHeader>
      <CardContent>
        {voters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No voter data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left py-2 font-medium">Address</th>
                  <th className="text-right py-2 font-medium">Guild XP</th>
                  <th className="text-right py-2 font-medium">CrumbsUp Rep</th>
                  <th className="text-right py-2 font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {voters.slice(0, 20).map((v) => (
                  <tr key={v.address} className="border-b last:border-0">
                    <td className="py-2 font-mono">{v.address.slice(0, 20)}...</td>
                    <td className="py-2 text-right">{v.guild_xp}</td>
                    <td className="py-2 text-right">{v.crumbsup_reputation}</td>
                    <td className="py-2 text-right font-semibold">{v.total_weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsContent() {
  const { proposals, loading: proposalsLoading } = useFederationProposals();
  const { voters, loading: votersLoading } = useFederationVoters();
  const { health, loading: healthLoading } = useSyncHealth();
  const { weights } = useVoteWeights();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Federation Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cross-platform governance metrics and sync health
        </p>
      </div>

      {/* Vote weights */}
      {weights && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Vote Multipliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(weights)
                .filter(([k]) => k !== "timestamp")
                .map(([tier, w]) => (
                  <div key={tier} className="bg-muted rounded-lg px-3 py-2 text-center min-w-[70px]">
                    <div className="text-lg font-bold">{w}x</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{tier}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthLoading ? (
          <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ) : (
          <SyncHealthTimeline status={health} />
        )}
        {proposalsLoading ? (
          <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ) : (
          <PlatformComparison proposals={proposals} />
        )}
      </div>

      <Separator />

      {votersLoading ? (
        <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : (
        <FederationVotersTable voters={voters} />
      )}
    </div>
  );
}

export default function FederationAnalyticsPage() {
  return <AppShell><AnalyticsContent /></AppShell>;
}
