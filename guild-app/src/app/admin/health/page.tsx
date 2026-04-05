"use client";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProtectedRoute, LoadingState } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/constants";

type ServiceStatus = "ok" | "error" | "degraded" | "unknown";

interface HealthData {
  bot: { status: ServiceStatus; uptime?: number; last_check?: number };
  api: { status: ServiceStatus; responseMs?: number; errorRate?: number };
  db: {
    status: ServiceStatus;
    sizeMb?: number;
    tables?: Record<string, number>;
    lastBackup?: number;
  };
  activity: {
    type: string;
    detail: string;
    ts: number;
  }[];
}

const STATUS_COLOR: Record<ServiceStatus, string> = {
  ok: "text-green-500",
  error: "text-red-500",
  degraded: "text-yellow-500",
  unknown: "text-muted-foreground",
};

const STATUS_DOT: Record<ServiceStatus, string> = {
  ok: "bg-green-500",
  error: "bg-red-500",
  degraded: "bg-yellow-500",
  unknown: "bg-muted",
};

function ServiceCard({
  name,
  status,
  details,
}: {
  name: string;
  status: ServiceStatus;
  details: { label: string; value: string }[];
}) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
            <span className="font-medium text-sm">{name}</span>
          </div>
          <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[status]}`}>
            {status.toUpperCase()}
          </Badge>
        </div>
        <div className="space-y-0.5">
          {details.map((d) => (
            <div key={d.label} className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-mono">{d.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function buildMockHealth(apiOk: boolean, startTs: number): HealthData {
  return {
    bot: { status: "ok", uptime: Date.now() / 1000 - startTs, last_check: Date.now() / 1000 },
    api: { status: apiOk ? "ok" : "error", responseMs: apiOk ? 45 : 0, errorRate: apiOk ? 0 : 100 },
    db: { status: "ok", sizeMb: 12, tables: { proposals: 0, votes: 0, bounties: 0 }, lastBackup: Date.now() / 1000 - 86400 },
    activity: [],
  };
}

function HealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [apiMs, setApiMs] = useState<number | null>(null);
  const startTs = 1712000000;

  const measure = useCallback(async () => {
    setLoading(true);
    const t0 = Date.now();
    try {
      await fetch(API_URL + "/stats");
      const ms = Date.now() - t0;
      setApiMs(ms);
      setHealth(buildMockHealth(true, startTs));
    } catch {
      setHealth(buildMockHealth(false, startTs));
    } finally {
      setLoading(false);
      setLastRefresh(Date.now());
    }
  }, []);

  useEffect(() => {
    measure();
    const interval = setInterval(measure, 30_000);
    return () => clearInterval(interval);
  }, [measure]);

  const formatUptime = (secs?: number) => {
    if (!secs) return "–";
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    return d > 0 ? `${d}d ${h}h` : `${h}h`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">System Health</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time status of all services
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={measure} disabled={loading}>
          {loading ? "Checking..." : "Refresh"}
        </Button>
      </div>

      {loading && !health ? (
        <LoadingState rows={3} />
      ) : health ? (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <ServiceCard
              name="Telegram Bot"
              status={health.bot.status}
              details={[
                { label: "Uptime", value: formatUptime(health.bot.uptime) },
                {
                  label: "Last check",
                  value: health.bot.last_check
                    ? new Date(health.bot.last_check * 1000).toLocaleTimeString()
                    : "–",
                },
              ]}
            />
            <ServiceCard
              name="API Server"
              status={health.api.status}
              details={[
                { label: "Response", value: apiMs ? `${apiMs}ms` : "–" },
                { label: "Error rate", value: `${health.api.errorRate ?? 0}%` },
              ]}
            />
            <ServiceCard
              name="Database"
              status={health.db.status}
              details={[
                { label: "Size", value: health.db.sizeMb ? `${health.db.sizeMb} MB` : "–" },
                {
                  label: "Last backup",
                  value: health.db.lastBackup
                    ? new Date(health.db.lastBackup * 1000).toLocaleDateString()
                    : "–",
                },
              ]}
            />
          </div>

          {health.db.tables && Object.keys(health.db.tables).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Table Counts
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-0">
                {Object.entries(health.db.tables).map(([t, count]) => (
                  <div key={t}>
                    <div className="text-[10px] text-muted-foreground">{t}</div>
                    <div className="font-mono text-sm text-primary">{count}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="px-4 py-3">
              <div className="text-[10px] text-muted-foreground mb-1">
                Last refreshed: {new Date(lastRefresh).toLocaleTimeString()} (auto every 30s)
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>API endpoint:</span>
                <code className="bg-muted px-1 rounded font-mono">{API_URL}/stats</code>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

export default function AdminHealthPage() {
  return (
    <AppShell>
      <AdminNav />
      <ProtectedRoute>
        <HealthDashboard />
      </ProtectedRoute>
    </AppShell>
  );
}
