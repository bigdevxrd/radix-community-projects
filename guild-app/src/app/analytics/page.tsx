"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { RankingTable } from "@/components/RankingTable";
import { DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import { LoadingState } from "@/components/ProtectedRoute";
import { LineChart } from "@/components/charts/LineChart";
import { PieChart } from "@/components/charts/PieChart";
import { HistogramChart } from "@/components/charts/HistogramChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useAnalyticsSummary,
  useAnalyticsTimeline,
  useAnalyticsVoters,
  useAnalyticsXp,
  useAnalyticsCharter,
  useTopVoters,
} from "@/hooks/useAnalytics";
import {
  toTimelineChartData,
  toVoterHistogramData,
  toXpBarData,
  CHART_COLORS,
  formatNumber,
  truncateAddress,
} from "@/lib/charts";

function AnalyticsContent() {
  const [range, setRange] = useState<DateRange>("30d");

  const { data: summary, loading: summaryLoading } = useAnalyticsSummary();
  const { data: timeline, loading: timelineLoading } = useAnalyticsTimeline();
  const { data: voters, loading: votersLoading } = useAnalyticsVoters();
  const { data: xp, loading: xpLoading } = useAnalyticsXp();
  const { data: charter, loading: charterLoading } = useAnalyticsCharter();
  const { data: topVoters, loading: votersRankLoading } = useTopVoters();

  const timelineChart = toTimelineChartData(timeline);
  const voterHistogram = toVoterHistogramData(voters);
  const xpBar = toXpBarData(xp?.by_week || []);

  const outcomePie = summary
    ? [
        { name: "Passed", value: Math.round((summary.pass_rate / 100) * summary.total_proposals), fill: CHART_COLORS.passed },
        { name: "Failed", value: summary.total_proposals - Math.round((summary.pass_rate / 100) * summary.total_proposals), fill: CHART_COLORS.failed },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Public governance metrics — no auth required
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Key metrics */}
      {summaryLoading ? (
        <LoadingState rows={1} />
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard label="Total Voters" value={summary.total_voters} />
          <MetricCard label="Total Proposals" value={summary.total_proposals} />
          <MetricCard label="Pass Rate" value={`${summary.pass_rate}%`} />
          <MetricCard label="XP Distributed" value={formatNumber(summary.xp_distributed)} />
          <MetricCard
            label="Avg Votes / Proposal"
            value={summary.avg_votes_per_proposal}
          />
          <MetricCard label="Bounties Paid" value={summary.bounties_paid} />
        </div>
      ) : null}

      {/* Chart 1: Participation Over Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Participation Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <LoadingState rows={2} />
            </div>
          ) : (
            <LineChart
              data={timelineChart}
              lines={[
                { key: "Proposals", color: CHART_COLORS.primary },
                { key: "Passed", color: CHART_COLORS.passed },
                { key: "Failed", color: CHART_COLORS.failed },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* Chart 2 + 3 side by side on desktop */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Proposal Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={outcomePie} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Voter Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {votersLoading ? (
              <div className="h-[180px] flex items-center justify-center">
                <LoadingState rows={2} />
              </div>
            ) : (
              <HistogramChart
                data={voterHistogram}
                barKey="Voters"
                color={CHART_COLORS.voters}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart 4: XP Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            XP Distribution by Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {xpLoading ? (
            <div className="h-[180px] flex items-center justify-center">
              <LoadingState rows={2} />
            </div>
          ) : (
            <HistogramChart
              data={xpBar}
              barKey="XP"
              color={CHART_COLORS.xp}
            />
          )}
        </CardContent>
      </Card>

      {/* Chart 5: Charter Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Charter Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {charterLoading ? (
            <LoadingState rows={3} />
          ) : charter ? (
            <div className="space-y-4">
              {(["phase_1", "phase_2", "phase_3"] as const).map((key, i) => {
                const ph = charter[key];
                const label = ["Phase 1 — Foundation", "Phase 2 — Configuration", "Phase 3 — Operations"][i];
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm">{label}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {ph.resolved}/{ph.total} ({ph.percent}%)
                      </span>
                    </div>
                    <Progress value={ph.percent} className="h-2" />
                    {!ph.ready && ph.blockers.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Blocked: {ph.blockers.join(", ")}
                      </p>
                    )}
                    {ph.next_to_vote && ph.ready && (
                      <p className="text-[10px] text-primary mt-1">
                        Next: {ph.next_to_vote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No data</p>
          )}
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Top Voters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {votersRankLoading ? (
              <LoadingState rows={3} />
            ) : (
              <RankingTable
                rows={topVoters.map((v) => ({
                  address: v.address,
                  value: v.votes,
                  meta: v.last_vote
                    ? `Last vote ${new Date(v.last_vote).toLocaleDateString()}`
                    : undefined,
                }))}
                valueLabel="votes"
                emptyText="No voters yet"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Top XP Earners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {xpLoading ? (
              <LoadingState rows={3} />
            ) : (
              <RankingTable
                rows={(xp?.top_earners || []).map((e) => ({
                  address: e.address,
                  value: e.total,
                }))}
                valueLabel="XP"
                emptyText="No earners yet"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AppShell>
      <AnalyticsContent />
    </AppShell>
  );
}
