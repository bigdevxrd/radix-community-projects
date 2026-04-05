"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/hooks/useWallet";
import { SCHEMAS, TIER_COLORS, ROYALTIES } from "@/lib/constants";
import { lookupAllBadges } from "@/lib/gateway";
import { adminMintManifest, updateTierManifest, updateXpManifest, revokeBadgeManifest, updateExtraDataManifest } from "@/lib/manifests";
import type { BadgeInfo } from "@/lib/types";

function AdminContent() {
  const { account, rdt } = useWallet();
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupAddr, setLookupAddr] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actionTxId, setActionTxId] = useState("");
  const [actionError, setActionError] = useState("");

  async function handleLookup(address: string) {
    if (!address) return;
    setLoading(true); setBadges([]);
    setBadges(await lookupAllBadges(address));
    setLoading(false);
  }

  async function sendAdminTx(manifest: string, label: string) {
    if (!rdt || !account) return;
    setActionStatus(`${label}...`); setActionTxId(""); setActionError("");
    try {
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) { setActionStatus(`${label} complete!`); setActionTxId(result.value.transactionIntentHash); }
      else { setActionError(JSON.stringify(result.error)); setActionStatus(""); }
    } catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Failed"); setActionStatus(""); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Badge Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage Guild badges across all schemas</p>
      </div>

      {/* Badge Lookup */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Look Up Badges</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={lookupAddr} onChange={(e) => setLookupAddr(e.target.value)} placeholder="account_rdx1..." className="font-mono text-[13px] flex-1" />
            <Button onClick={() => handleLookup(lookupAddr)} className="sm:w-auto w-full">Search</Button>
          </div>
          {account && (
            <Button variant="ghost" size="sm" onClick={() => { setLookupAddr(account); handleLookup(account); }}>
              Check my badges
            </Button>
          )}
          {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
          {badges.length > 0 && (
            <div className="space-y-0">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <div className="font-semibold text-sm">{b.issued_to}</div>
                    <div className="text-xs text-muted-foreground">{b.schema_name} | {b.id}</div>
                  </div>
                  <div className="text-right">
                    <Badge style={{ backgroundColor: `${TIER_COLORS[b.tier]}20`, color: TIER_COLORS[b.tier], border: "none" }}>{b.tier}</Badge>
                    <div className="text-[11px] text-muted-foreground mt-1">XP: {b.xp} | {b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && badges.length === 0 && lookupAddr && <p className="text-muted-foreground text-sm">No badges found.</p>}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Admin Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">Requires admin badge in connected wallet. Royalties apply.</p>
          <Separator />
          <ActionForm label="Mint Role Badge" cost={ROYALTIES.mint} variant="secondary"
            fields={[{ name: "username", ph: "username" }, { name: "tier", ph: "", type: "select", opts: SCHEMAS.guild_role.tiers }]}
            onSubmit={(v) => sendAdminTx(adminMintManifest(SCHEMAS.guild_role.manager, SCHEMAS.guild_role.adminBadge, v.username, v.tier, account!), "Minting")} />
          <ActionForm label="Update Tier" cost={ROYALTIES.update_tier}
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "newTier", ph: "", type: "select", opts: SCHEMAS.guild_member.tiers }]}
            onSubmit={(v) => sendAdminTx(updateTierManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.newTier, account!), "Updating tier")} />
          <ActionForm label="Update XP" cost={ROYALTIES.update_xp}
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "newXp", ph: "100", type: "number" }]}
            onSubmit={(v) => sendAdminTx(updateXpManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, parseInt(v.newXp), account!), "Updating XP")} />
          <ActionForm label="Revoke Badge" cost={ROYALTIES.revoke} variant="destructive"
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "reason", ph: "Reason" }]}
            onSubmit={(v) => sendAdminTx(revokeBadgeManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.reason, account!), "Revoking")} />
          <ActionForm label="Update Extra Data" cost={ROYALTIES.update_extra_data}
            fields={[{ name: "badgeId", ph: "guild_member_bigdevxrd" }, { name: "data", ph: '{"role":"mod"}' }]}
            onSubmit={(v) => sendAdminTx(updateExtraDataManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.data, account!), "Updating")} />

          {(actionStatus || actionError) && (
            <Alert variant={actionError ? "destructive" : "default"}>
              <AlertDescription>
                {actionError || actionStatus}
                {actionTxId && <a href={`https://dashboard.radixdlt.com/transaction/${actionTxId}`} target="_blank" className="block mt-1 text-xs text-primary hover:underline">View on Dashboard</a>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Schemas */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Badge Schemas</CardTitle></CardHeader>
        <CardContent>
          {Object.entries(SCHEMAS).map(([name, s]) => (
            <div key={name} className="py-3 border-b last:border-0">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{name}</span>
                <Badge variant={s.freeMint ? "default" : "secondary"}>{s.freeMint ? "Free mint" : "Admin only"}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Tiers: {s.tiers.join(" / ")} | Manager: {s.manager.slice(0, 25)}...</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionForm({ label, cost, fields, onSubmit, variant = "default" }: {
  label: string; cost: number; variant?: "default" | "secondary" | "destructive";
  fields: { name: string; ph: string; type?: string; opts?: string[] }[];
  onSubmit: (v: Record<string, string>) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, f.opts?.[0] || ""]))
  );
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const ok = fields.every((f) => f.opts || vals[f.name]?.trim());

  return (
    <div className="bg-muted rounded-lg p-3.5">
      <div className="flex justify-between mb-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[11px] text-yellow-500 font-mono">{cost} XRD</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {fields.map((f) => f.type === "select" ? (
          <select key={f.name} value={vals[f.name]} onChange={(e) => set(f.name, e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-[13px] font-mono w-36">
            {f.opts?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <Input key={f.name} type={f.type || "text"} value={vals[f.name]} onChange={(e) => set(f.name, e.target.value)}
            placeholder={f.ph} className="flex-1 min-w-[140px] text-[13px] font-mono" />
        ))}
        <Button onClick={() => ok && onSubmit(vals)} disabled={!ok} variant={variant} size="sm">
          {label}
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AppShell><AdminContent /></AppShell>;
}
