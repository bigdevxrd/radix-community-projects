"use client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  FederationStatus,
  ProposalSyncStatus,
  VoteWeightViewer,
  CrossPlatformLeaderboard,
} from "@/components/federation";
import {
  useSyncHealth,
  useFederationProposals,
  useFederationVoters,
  useCV2Status,
  useCrumbsUpSync,
  useVoteWeights,
} from "@/hooks/useFederation";

function CV2StatusCard() {
  const { data, loading } = useCV2Status();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Consultation v2</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-14 w-full" /> : (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={data?.cv2_enabled ? "default" : "secondary"}>
                {data?.cv2_enabled ? "enabled" : "disabled"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sync health</span>
              <span className="text-sm font-medium">{data?.sync_health || "n/a"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Proposals synced</span>
              <span className="text-sm font-semibold">{data?.proposals_synced ?? 0}</span>
            </div>
            {data?.last_sync && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last sync</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(data.last_sync * 1000).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CrumbsUpStatusCard() {
  const { status, loading } = useCrumbsUpSync();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">CrumbsUp</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-14 w-full" /> : (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={status?.crumbsup_enabled ? "default" : "secondary"}>
                {status?.crumbsup_enabled ? "enabled" : "disabled"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">DAO ID</span>
              <span className="text-xs font-mono text-muted-foreground">{status?.dao_id || "guild-radix-dao"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Members synced</span>
              <span className="text-sm font-semibold">{status?.member_count ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Proposals synced</span>
              <span className="text-sm font-semibold">{status?.proposals_synced ?? 0}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FederationContent() {
  const { proposals, loading: proposalsLoading } = useFederationProposals();
  const { voters, loading: votersLoading } = useFederationVoters();
  const { weights } = useVoteWeights();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Federation Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cross-platform sync status: Guild ↔ CV2 ↔ CrumbsUp
        </p>
      </div>

      {/* Health + Platform Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FederationStatus />
        <CV2StatusCard />
        <CrumbsUpStatusCard />
      </div>

      <Separator />

      {/* Proposal Sync + Vote Weights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proposalsLoading ? (
          <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ) : (
          <ProposalSyncStatus proposals={proposals} />
        )}
        <VoteWeightViewer weights={weights} />
      </div>

      <Separator />

      {/* Cross-Platform Leaderboard */}
      {votersLoading ? (
        <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : (
        <CrossPlatformLeaderboard voters={voters} />
      )}
    </div>
  );
}

export default function FederationAdminPage() {
  return <AppShell><FederationContent /></AppShell>;
}
