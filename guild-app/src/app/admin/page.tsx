"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { StatusAlert } from "@/components/StatusAlert";
import { useWallet } from "@/hooks/useWallet";
import { SCHEMAS, TIER_COLORS, ROYALTIES } from "@/lib/constants";
import { lookupAllBadges } from "@/lib/gateway";
import {
  adminMintManifest,
  updateTierManifest,
  updateXpManifest,
  revokeBadgeManifest,
  updateExtraDataManifest,
} from "@/lib/manifests";
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
    setLoading(true);
    setBadges([]);
    const found = await lookupAllBadges(address);
    setBadges(found);
    setLoading(false);
  }

  async function sendAdminTx(manifest: string, label: string) {
    if (!rdt || !account) return;
    setActionStatus(`${label}...`);
    setActionTxId("");
    setActionError("");
    try {
      const result = await rdt.walletApi.sendTransaction({
        transactionManifest: manifest,
        version: 1,
      });
      if (result.isOk()) {
        setActionStatus(`${label} complete!`);
        setActionTxId(result.value.transactionIntentHash);
      } else {
        setActionError(JSON.stringify(result.error));
        setActionStatus("");
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Transaction failed");
      setActionStatus("");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Badge Manager</h1>
        <p className="text-text-secondary text-sm mt-1">
          Manage Guild badges across all schemas
        </p>
      </div>

      {/* Badge Lookup */}
      <Card>
        <CardHeader title="Look Up Badges" />
        <CardBody>
          <div className="flex gap-2">
            <input
              value={lookupAddr}
              onChange={(e) => setLookupAddr(e.target.value)}
              placeholder="account_rdx1..."
              className="flex-1 px-3 py-2 text-[13px] bg-surface-2 border border-border rounded-md text-text-primary font-mono outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={() => handleLookup(lookupAddr)}
              className="px-5 py-2 bg-accent text-black rounded-md text-[13px] font-semibold cursor-pointer hover:bg-accent-hover transition-colors"
            >
              Search
            </button>
          </div>
          {account && (
            <button
              onClick={() => {
                setLookupAddr(account);
                handleLookup(account);
              }}
              className="mt-2 px-3 py-1 text-xs text-text-muted border border-border rounded-md cursor-pointer bg-transparent hover:border-border-focus transition-colors"
            >
              Check my badges
            </button>
          )}

          {loading && (
            <p className="text-text-muted text-sm mt-3">Loading...</p>
          )}

          {badges.length > 0 && (
            <div className="mt-4 divide-y divide-border">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="font-semibold text-sm">{b.issued_to}</div>
                    <div className="text-xs text-text-muted">
                      {b.schema_name} | {b.id}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: `${TIER_COLORS[b.tier] || "var(--text-muted)"}1a`,
                        color: TIER_COLORS[b.tier] || "var(--text-muted)",
                      }}
                    >
                      {b.tier}
                    </span>
                    <div className="text-[11px] text-text-muted mt-1">
                      XP: {b.xp} | {b.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && badges.length === 0 && lookupAddr && (
            <p className="text-text-muted text-sm mt-3">No badges found.</p>
          )}
        </CardBody>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader title="Admin Actions" />
        <CardBody>
          <p className="text-text-muted text-xs mb-4">
            Requires admin badge in connected wallet. Royalties apply.
          </p>

          <div className="space-y-3">
            <AdminAction
              label="Mint Role Badge"
              cost={ROYALTIES.mint}
              fields={[
                { name: "username", placeholder: "username" },
                {
                  name: "tier",
                  placeholder: "contributor",
                  type: "select",
                  options: SCHEMAS.guild_role.tiers,
                },
              ]}
              btnColor="bg-status-pending"
              onSubmit={(v) => {
                const s = SCHEMAS.guild_role;
                sendAdminTx(
                  adminMintManifest(s.manager, s.adminBadge, v.username, v.tier, account!),
                  "Minting role badge"
                );
              }}
            />

            <AdminAction
              label="Update Tier"
              cost={ROYALTIES.update_tier}
              fields={[
                { name: "badgeId", placeholder: "guild_member_1" },
                {
                  name: "newTier",
                  placeholder: "contributor",
                  type: "select",
                  options: SCHEMAS.guild_member.tiers,
                },
              ]}
              onSubmit={(v) =>
                sendAdminTx(
                  updateTierManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.newTier, account!),
                  "Updating tier"
                )
              }
            />

            <AdminAction
              label="Update XP"
              cost={ROYALTIES.update_xp}
              fields={[
                { name: "badgeId", placeholder: "guild_member_1" },
                { name: "newXp", placeholder: "100", type: "number" },
              ]}
              onSubmit={(v) =>
                sendAdminTx(
                  updateXpManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, parseInt(v.newXp), account!),
                  "Updating XP"
                )
              }
            />

            <AdminAction
              label="Revoke Badge"
              cost={ROYALTIES.revoke}
              fields={[
                { name: "badgeId", placeholder: "guild_member_1" },
                { name: "reason", placeholder: "Reason" },
              ]}
              btnColor="bg-status-revoked"
              onSubmit={(v) =>
                sendAdminTx(
                  revokeBadgeManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.reason, account!),
                  "Revoking badge"
                )
              }
            />

            <AdminAction
              label="Update Extra Data"
              cost={ROYALTIES.update_extra_data}
              fields={[
                { name: "badgeId", placeholder: "guild_member_1" },
                { name: "data", placeholder: '{"role":"mod"}' },
              ]}
              onSubmit={(v) =>
                sendAdminTx(
                  updateExtraDataManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.data, account!),
                  "Updating extra data"
                )
              }
            />
          </div>

          <StatusAlert
            status={actionStatus}
            txId={actionTxId}
            error={actionError}
          />
        </CardBody>
      </Card>

      {/* Schemas Overview */}
      <Card>
        <CardHeader title="Badge Schemas" />
        <CardBody>
          <div className="divide-y divide-border">
            {Object.entries(SCHEMAS).map(([name, schema]) => (
              <div key={name} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{name}</span>
                  <span
                    className={`text-xs ${
                      schema.freeMint
                        ? "text-accent"
                        : "text-status-pending"
                    }`}
                  >
                    {schema.freeMint ? "Free mint" : "Admin only"}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Tiers: {schema.tiers.join(" / ")} | Manager:{" "}
                  {schema.manager.slice(0, 25)}...
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ── Admin Action Component ── */

interface FieldDef {
  name: string;
  placeholder: string;
  type?: "text" | "number" | "select";
  options?: string[];
}

function AdminAction({
  label,
  cost,
  fields,
  onSubmit,
  btnColor = "bg-accent",
}: {
  label: string;
  cost: number;
  fields: FieldDef[];
  onSubmit: (values: Record<string, string>) => void;
  btnColor?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, f.options?.[0] || ""]))
  );

  const update = (name: string, val: string) =>
    setValues((prev) => ({ ...prev, [name]: val }));

  const allFilled = fields.every((f) => f.options || values[f.name]?.trim());

  return (
    <div className="bg-surface-2 rounded-md p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[11px] text-status-pending font-mono">
          {cost} XRD
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {fields.map((f) =>
          f.type === "select" ? (
            <select
              key={f.name}
              value={values[f.name]}
              onChange={(e) => update(f.name, e.target.value)}
              className="px-3 py-2 text-[13px] bg-surface border border-border rounded-md text-text-primary font-mono outline-none w-36"
            >
              {f.options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={f.name}
              type={f.type || "text"}
              value={values[f.name]}
              onChange={(e) => update(f.name, e.target.value)}
              placeholder={f.placeholder}
              className="flex-1 min-w-[140px] px-3 py-2 text-[13px] bg-surface border border-border rounded-md text-text-primary font-mono outline-none focus:border-accent transition-colors"
            />
          )
        )}
        <button
          onClick={() => allFilled && onSubmit(values)}
          disabled={!allFilled}
          className={`px-4 py-2 ${btnColor} text-black rounded-md text-[13px] font-semibold whitespace-nowrap transition-opacity ${
            allFilled
              ? "cursor-pointer opacity-100"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AppShell>
      <AdminContent />
    </AppShell>
  );
}
