"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSyncHealth } from "@/hooks/useFederation";

function StatusDot({ status }: { status: string }) {
  const color = status === "ok" || status === "configured"
    ? "bg-green-500"
    : status === "disabled"
    ? "bg-yellow-500"
    : "bg-red-500";
  return <span className={"inline-block w-2 h-2 rounded-full mr-2 " + color} />;
}

export function FederationStatus() {
  const { health, status, loading, refetch } = useSyncHealth();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Federation Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Federation Health</CardTitle>
          <button onClick={refetch} className="text-xs text-muted-foreground hover:text-foreground">↻ Refresh</button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">CV2 API</div>
            <div className="flex items-center text-sm font-medium">
              <StatusDot status={health?.cv2_api || "unknown"} />
              {health?.cv2_api || "unknown"}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">CrumbsUp API</div>
            <div className="flex items-center text-sm font-medium">
              <StatusDot status={health?.crumbsup_api || "unknown"} />
              {health?.crumbsup_api || "unknown"}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Radix Gateway</div>
            <div className="flex items-center text-sm font-medium">
              <StatusDot status={health?.gateway_api || "unknown"} />
              {health?.gateway_api || "unknown"}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Database</div>
            <div className="flex items-center text-sm font-medium">
              <StatusDot status={health?.db || "unknown"} />
              {health?.db || "unknown"}
            </div>
          </div>
        </div>
        {status && (
          <div className="border-t pt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>CV2 proposals: {status.cv2_proposals}</span>
            <span>CrumbsUp proposals: {status.crumbsup_proposals}</span>
          </div>
        )}
        {health?.last_check && (
          <p className="text-[11px] text-muted-foreground">
            Last checked: {new Date(health.last_check * 1000).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ProposalSyncStatus({ proposals }: {
  proposals: Array<{
    guild_proposal: { id: number; title: string; status: string };
    cv2: { cv2_id: string; cv2_url: string } | null;
    crumbsup: { crumbsup_id: string; crumbsup_url: string } | null;
    combined_vote_count: number;
  }>
}) {
  if (!proposals || proposals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Proposal Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No proposals yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Proposal Sync Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {proposals.map((p) => (
          <div key={p.guild_proposal.id} className="py-3 border-b last:border-0">
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-medium">#{p.guild_proposal.id} {p.guild_proposal.title.slice(0, 40)}</span>
              <span className="text-xs text-muted-foreground">{p.combined_vote_count} votes</span>
            </div>
            <div className="flex gap-2">
              <Badge variant={p.cv2 ? "default" : "secondary"} className="text-[10px] h-4">
                CV2 {p.cv2 ? "✓" : "–"}
              </Badge>
              <Badge variant={p.crumbsup ? "default" : "secondary"} className="text-[10px] h-4">
                CrumbsUp {p.crumbsup ? "✓" : "–"}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-4">{p.guild_proposal.status}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function VoteWeightViewer({ weights }: {
  weights: {
    member: number;
    contributor: number;
    builder: number;
    steward: number;
    elder: number;
  } | null
}) {
  const tiers = [
    { name: "member", label: "Member", color: "text-gray-400" },
    { name: "contributor", label: "Contributor", color: "text-blue-400" },
    { name: "builder", label: "Builder", color: "text-green-400" },
    { name: "steward", label: "Steward", color: "text-yellow-400" },
    { name: "elder", label: "Elder", color: "text-purple-400" },
  ] as const;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Vote Weights by Tier</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tiers.map((tier) => {
          const w = weights?.[tier.name] ?? 1;
          const maxW = 10;
          const pct = (w / maxW) * 100;
          return (
            <div key={tier.name} className="flex items-center gap-3">
              <span className={"text-xs font-medium w-20 " + tier.color}>{tier.label}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: pct + "%" }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-6 text-right">{w}x</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function CrossPlatformLeaderboard({ voters }: {
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
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Cross-Platform Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {voters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No voter data yet.</p>
        ) : (
          voters.slice(0, 10).map((v, i) => (
            <div key={v.address} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <span className="text-xs font-mono">{v.address.slice(0, 20)}...</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>XP: {v.guild_xp}</span>
                <span>Rep: {v.crumbsup_reputation}</span>
                <span className="text-foreground font-semibold">{v.total_weight}w</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ProposalSyncBadge({ cv2Id, crumbsupId, cv2Url, crumbsupUrl }: {
  cv2Id?: string | null;
  crumbsupId?: string | null;
  cv2Url?: string | null;
  crumbsupUrl?: string | null;
}) {
  if (!cv2Id && !crumbsupId) return null;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {cv2Id && (
        cv2Url
          ? <a href={cv2Url} target="_blank" rel="noreferrer"><Badge variant="default" className="text-[10px]">CV2 ↗</Badge></a>
          : <Badge variant="default" className="text-[10px]">CV2</Badge>
      )}
      {crumbsupId && (
        crumbsupUrl
          ? <a href={crumbsupUrl} target="_blank" rel="noreferrer"><Badge variant="secondary" className="text-[10px]">CrumbsUp ↗</Badge></a>
          : <Badge variant="secondary" className="text-[10px]">CrumbsUp</Badge>
      )}
    </div>
  );
}
