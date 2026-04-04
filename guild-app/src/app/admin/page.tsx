"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { StatusAlert } from "@/components/StatusAlert";
import { useWallet } from "@/hooks/useWallet";
import { SCHEMAS, ROYALTIES } from "@/lib/constants";
import { lookupAllBadges } from "@/lib/gateway";
import { adminMintManifest, updateTierManifest, updateXpManifest, revokeBadgeManifest, updateExtraDataManifest } from "@/lib/manifests";
import type { BadgeInfo } from "@/lib/types";

const TIER_PILL: Record<string, string> = {
  member: "g-pill-muted", contributor: "g-pill-blue", builder: "g-pill-purple",
  steward: "g-pill-yellow", elder: "g-pill-green", admin: "g-pill-green",
  moderator: "g-pill-yellow",
};

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
        <p className="g-text-2 text-sm mt-1">Manage Guild badges across all schemas</p>
      </div>

      {/* Lookup */}
      <Card>
        <CardHeader title="Look Up Badges" />
        <CardBody>
          <div className="flex gap-2">
            <input value={lookupAddr} onChange={(e) => setLookupAddr(e.target.value)}
              placeholder="account_rdx1..." className="g-input flex-1 px-3 py-2 text-[13px]" />
            <button onClick={() => handleLookup(lookupAddr)} className="g-btn px-5 py-2 text-[13px]">Search</button>
          </div>
          {account && (
            <button onClick={() => { setLookupAddr(account); handleLookup(account); }}
              className="g-input mt-2 px-3 py-1 text-xs cursor-pointer">Check my badges</button>
          )}
          {loading && <p className="g-text-3 text-sm mt-3">Loading...</p>}
          {badges.length > 0 && (
            <div className="mt-4">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 g-divider">
                  <div>
                    <div className="font-semibold text-sm">{b.issued_to}</div>
                    <div className="text-xs g-text-3">{b.schema_name} | {b.id}</div>
                  </div>
                  <div className="text-right">
                    <span className={`g-pill ${TIER_PILL[b.tier] || "g-pill-muted"}`}>{b.tier}</span>
                    <div className="text-[11px] g-text-3 mt-1">XP: {b.xp} | {b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && badges.length === 0 && lookupAddr && <p className="g-text-3 text-sm mt-3">No badges found.</p>}
        </CardBody>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader title="Admin Actions" />
        <CardBody>
          <p className="g-text-3 text-xs mb-4">Requires admin badge in connected wallet. Royalties apply.</p>
          <div className="space-y-3">
            <ActionForm label="Mint Role Badge" cost={ROYALTIES.mint} btnClass="g-btn-yellow"
              fields={[{ name: "username", ph: "username" }, { name: "tier", ph: "", type: "select", opts: SCHEMAS.guild_role.tiers }]}
              onSubmit={(v) => sendAdminTx(adminMintManifest(SCHEMAS.guild_role.manager, SCHEMAS.guild_role.adminBadge, v.username, v.tier, account!), "Minting")} />
            <ActionForm label="Update Tier" cost={ROYALTIES.update_tier}
              fields={[{ name: "badgeId", ph: "guild_member_1" }, { name: "newTier", ph: "", type: "select", opts: SCHEMAS.guild_member.tiers }]}
              onSubmit={(v) => sendAdminTx(updateTierManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.newTier, account!), "Updating tier")} />
            <ActionForm label="Update XP" cost={ROYALTIES.update_xp}
              fields={[{ name: "badgeId", ph: "guild_member_1" }, { name: "newXp", ph: "100", type: "number" }]}
              onSubmit={(v) => sendAdminTx(updateXpManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, parseInt(v.newXp), account!), "Updating XP")} />
            <ActionForm label="Revoke Badge" cost={ROYALTIES.revoke} btnClass="g-btn-red"
              fields={[{ name: "badgeId", ph: "guild_member_1" }, { name: "reason", ph: "Reason" }]}
              onSubmit={(v) => sendAdminTx(revokeBadgeManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.reason, account!), "Revoking")} />
            <ActionForm label="Update Extra Data" cost={ROYALTIES.update_extra_data}
              fields={[{ name: "badgeId", ph: "guild_member_1" }, { name: "data", ph: '{"role":"mod"}' }]}
              onSubmit={(v) => sendAdminTx(updateExtraDataManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.data, account!), "Updating")} />
          </div>
          <StatusAlert status={actionStatus} txId={actionTxId} error={actionError} />
        </CardBody>
      </Card>

      {/* Schemas */}
      <Card>
        <CardHeader title="Badge Schemas" />
        <CardBody>
          {Object.entries(SCHEMAS).map(([name, s]) => (
            <div key={name} className="py-3 g-divider">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{name}</span>
                <span className={`text-xs ${s.freeMint ? "g-accent" : "g-yellow"}`}>{s.freeMint ? "Free mint" : "Admin only"}</span>
              </div>
              <div className="text-xs g-text-3 mt-1">Tiers: {s.tiers.join(" / ")} | Manager: {s.manager.slice(0, 25)}...</div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function ActionForm({ label, cost, fields, onSubmit, btnClass = "" }: {
  label: string; cost: number; btnClass?: string;
  fields: { name: string; ph: string; type?: string; opts?: string[] }[];
  onSubmit: (v: Record<string, string>) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, f.opts?.[0] || ""]))
  );
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const ok = fields.every((f) => f.opts || vals[f.name]?.trim());

  return (
    <div className="g-card-inner p-3.5 rounded-md">
      <div className="flex justify-between mb-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[11px] g-yellow font-mono">{cost} XRD</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {fields.map((f) => f.type === "select" ? (
          <select key={f.name} value={vals[f.name]} onChange={(e) => set(f.name, e.target.value)}
            className="g-input px-3 py-2 text-[13px] w-36">{f.opts?.map((o) => <option key={o} value={o}>{o}</option>)}</select>
        ) : (
          <input key={f.name} type={f.type || "text"} value={vals[f.name]} onChange={(e) => set(f.name, e.target.value)}
            placeholder={f.ph} className="g-input flex-1 min-w-[140px] px-3 py-2 text-[13px]" />
        ))}
        <button onClick={() => ok && onSubmit(vals)} disabled={!ok}
          className={`g-btn ${btnClass} px-4 py-2 text-[13px] whitespace-nowrap ${!ok ? "opacity-50 cursor-not-allowed" : ""}`}>
          {label}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AppShell><AdminContent /></AppShell>;
}
