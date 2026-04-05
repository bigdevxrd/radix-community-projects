"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProtectedRoute, LoadingState } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { API_URL } from "@/lib/constants";
import type { CharterParam } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  resolved: "text-green-500",
  voting: "text-yellow-500",
  tbd: "text-muted-foreground",
};

const PHASE_LABELS = ["", "Foundation", "Configuration", "Operations"];

interface ResolveForm {
  value: string;
  reasoning: string;
}

function ParamRow({
  param,
  onResolved,
}: {
  param: CharterParam;
  onResolved: () => void;
}) {
  const [showResolve, setShowResolve] = useState(false);
  const [form, setForm] = useState<ResolveForm>({ value: "", reasoning: "" });
  const [loading, setLoading] = useState(false);

  async function resolve() {
    if (!form.value.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/admin/charter/${param.param_key}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onResolved();
      setShowResolve(false);
    } finally {
      setLoading(false);
    }
  }

  const deps: string[] = (() => {
    try { return JSON.parse(param.depends_on || "[]"); } catch { return []; }
  })();

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] font-mono">{param.param_key}</Badge>
            <span className="font-medium text-sm">{param.title}</span>
          </div>
          <div className="flex gap-3 text-[11px] mt-0.5 flex-wrap">
            <span className="text-muted-foreground">Phase {param.phase} — {PHASE_LABELS[param.phase]}</span>
            <span className={STATUS_COLORS[param.status] || ""}>{param.status.toUpperCase()}</span>
            {param.param_value && (
              <span className="text-primary font-mono">= {param.param_value}</span>
            )}
          </div>
          {deps.length > 0 && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Depends on: {deps.join(", ")}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {param.status !== "resolved" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] h-7"
              onClick={() => setShowResolve(!showResolve)}
            >
              {showResolve ? "Close" : "Mark Resolved"}
            </Button>
          )}
        </div>
      </div>

      {showResolve && (
        <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
          <div className="flex gap-2">
            <Input
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder="Resolved value (e.g. 5)"
              className="flex-1 text-sm h-8"
            />
            <Input
              value={form.reasoning}
              onChange={(e) => setForm((f) => ({ ...f, reasoning: e.target.value }))}
              placeholder="Reasoning (optional)"
              className="flex-1 text-sm h-8"
            />
            <Button size="sm" onClick={resolve} disabled={loading || !form.value}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CharterManager() {
  const [params, setParams] = useState<CharterParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  function load() {
    setLoading(true);
    fetch(API_URL + "/charter")
      .then((r) => r.json())
      .then((j) => setParams(j?.data?.params || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = params.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.param_key.includes(search.toLowerCase());
    const matchPhase = !phaseFilter || p.phase === phaseFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchPhase && matchStatus;
  });

  const byPhase = [1, 2, 3].map((ph) => ({
    phase: ph,
    total: params.filter((p) => p.phase === ph).length,
    resolved: params.filter((p) => p.phase === ph && p.status === "resolved").length,
  }));

  const readyToVote = params.filter((p) => {
    if (p.status !== "tbd") return false;
    try {
      const deps: string[] = JSON.parse(p.depends_on || "[]");
      if (!deps.length) return true;
      return deps.every((d) => {
        const dep = params.find((x) => x.param_key === d);
        return dep?.status === "resolved";
      });
    } catch {
      return false;
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Charter Parameters</h1>
        <p className="text-muted-foreground text-sm mt-1">All 32 charter params across 3 phases</p>
      </div>

      {/* Phase progress bars */}
      <div className="grid gap-3">
        {byPhase.map((ph) => (
          <Card key={ph.phase}>
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Phase {ph.phase} — {PHASE_LABELS[ph.phase]}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {ph.resolved}/{ph.total}
                </span>
              </div>
              <Progress value={ph.total > 0 ? (ph.resolved / ph.total) * 100 : 0} className="h-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ready to vote */}
      {readyToVote.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-500">
              ✅ Ready to Vote ({readyToVote.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {readyToVote.map((p) => (
                <div key={p.param_key} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                  <span>{p.title}</span>
                  <Badge variant="outline" className="text-[9px] font-mono">{p.param_key}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-48 h-8 text-sm"
        />
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(parseInt(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value={0}>All phases</option>
          <option value={1}>Phase 1</option>
          <option value={2}>Phase 2</option>
          <option value={3}>Phase 3</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="all">All status</option>
          <option value="tbd">TBD</option>
          <option value="voting">Voting</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Params table */}
      <Card>
        <CardContent className="pt-3 pb-1">
          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No params found.</p>
          ) : (
            filtered.map((p) => (
              <ParamRow key={p.param_key} param={p} onResolved={load} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminCharterPage() {
  return (
    <AppShell>
      <AdminNav />
      <ProtectedRoute>
        <CharterManager />
      </ProtectedRoute>
    </AppShell>
  );
}
