"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProtectedRoute, LoadingState } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/constants";
import type { Proposal } from "@/lib/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", passed: "default", completed: "default",
  failed: "destructive", expired: "secondary", cancelled: "secondary",
  needs_amendment: "outline",
};

const PROPOSAL_TYPES = ["yesno", "poll", "amend", "charter"];

interface CreateForm {
  title: string;
  type: string;
  hoursActive: string;
  options: string;
}

function ProposalRow({ p, onAction }: { p: Proposal & { total_votes: number }; onAction: () => void }) {
  const [working, setWorking] = useState(false);

  async function doAction(action: string) {
    setWorking(true);
    try {
      await fetch(`${API_URL}/admin/proposals/${p.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onAction();
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground font-mono text-xs">#{p.id}</span>
            <span className="font-medium text-sm truncate">{p.title}</span>
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
            <span>{p.type}</span>
            <span>{p.total_votes} votes</span>
            <span>{new Date(p.created_at * 1000).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={STATUS_VARIANT[p.status] || "secondary"}>{p.status}</Badge>
          {p.status === "active" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] h-7"
              disabled={working}
              onClick={() => doAction("cancel")}
            >
              Cancel
            </Button>
          )}
          {(p.status === "passed" || p.status === "expired") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] h-7"
              disabled={working}
              onClick={() => doAction("archive")}
            >
              Archive
            </Button>
          )}
          <a href={`/proposals/${p.id}/outcomes`}>
            <Button size="sm" variant="outline" className="text-[11px] h-7">
              View
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateForm>({
    title: "", type: "yesno", hoursActive: "72", options: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.title.trim()) { setError("Title required"); return; }
    setLoading(true); setError("");
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        type: form.type,
        hoursActive: parseInt(form.hoursActive) || 72,
      };
      if (form.type === "poll" && form.options) {
        body.options = form.options.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const res = await fetch(`${API_URL}/admin/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Create Proposal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Proposal title..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              {PROPOSAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {form.type === "poll" && (
            <div>
              <label className="text-xs text-muted-foreground">Options (comma-separated)</label>
              <Input
                value={form.options}
                onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                placeholder="Option A, Option B, Option C"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Voting period (hours)</label>
            <Input
              type="number"
              value={form.hoursActive}
              onChange={(e) => setForm((f) => ({ ...f, hoursActive: e.target.value }))}
              className="mt-1"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button onClick={submit} disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Proposal"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProposalManager() {
  const [proposals, setProposals] = useState<(Proposal & { total_votes: number; counts: Record<string, number> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setLoading(true);
    fetch(API_URL + "/proposals?limit=100")
      .then((r) => r.json())
      .then((j) => setProposals(j.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = proposals.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function bulkArchive() {
    const passed = proposals.filter((p) => p.status === "passed");
    await Promise.all(
      passed.map((p) =>
        fetch(`${API_URL}/admin/proposals/${p.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive" }),
        })
      )
    );
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Proposal Manager</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          + Create
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-48 h-8 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {["all", "active", "passed", "failed", "expired", "cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={bulkArchive}>
          Archive all passed
        </Button>
      </div>

      <Card>
        <CardContent className="pt-3 pb-1">
          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No proposals found.</p>
          ) : (
            filtered.map((p) => (
              <ProposalRow key={p.id} p={p} onAction={load} />
            ))
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}

export default function AdminProposalsPage() {
  return (
    <AppShell>
      <AdminNav />
      <ProtectedRoute>
        <ProposalManager />
      </ProtectedRoute>
    </AppShell>
  );
}
