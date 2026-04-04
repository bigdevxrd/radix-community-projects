"use client";
import { Shell, useWallet } from "../../components/Shell";
import { StatusMessage } from "../../components/StatusMessage";
import { useState } from "react";
import { SCHEMAS, TIER_COLORS, ROYALTIES } from "../../lib/constants";
import { lookupAllBadges } from "../../lib/gateway";
import {
  adminMintManifest,
  updateTierManifest,
  updateXpManifest,
  revokeBadgeManifest,
  updateExtraDataManifest,
} from "../../lib/manifests";
import type { BadgeInfo } from "../../lib/types";

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 140, padding: "8px 12px", fontSize: 13,
  background: "var(--input-bg)", border: "1px solid var(--input-border)",
  borderRadius: "var(--radius-sm)", color: "var(--input-text)", fontFamily: "var(--font-mono)",
};

const btnStyle = (color: string): React.CSSProperties => ({
  background: color, color: "#000", border: "none", padding: "8px 16px",
  borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 13, cursor: "pointer",
  whiteSpace: "nowrap",
});

function AdminContent() {
  const { account, rdt } = useWallet();
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupAddr, setLookupAddr] = useState("");

  // Admin action states
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
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Badge Manager</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>
        Manage Guild badges across all schemas
      </p>

      {/* Badge Lookup */}
      <div style={{ padding: 20, background: "var(--bg-surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: 15, marginBottom: 12 }}>Look Up Badges</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={lookupAddr}
            onChange={e => setLookupAddr(e.target.value)}
            placeholder="account_rdx1..."
            style={inputStyle}
          />
          <button onClick={() => handleLookup(lookupAddr)} style={btnStyle("var(--accent)")}>
            Search
          </button>
        </div>
        {account && (
          <button
            onClick={() => { setLookupAddr(account); handleLookup(account); }}
            style={{ marginTop: 8, background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "4px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, cursor: "pointer" }}
          >
            Check my badges
          </button>
        )}
        {loading && <p style={{ color: "var(--text-muted)", marginTop: 12 }}>Loading...</p>}
        {badges.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {badges.map(b => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{b.issued_to}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{b.schema_name} | {b.id}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    background: (TIER_COLORS[b.tier] || "var(--text-muted)") + "1a",
                    color: TIER_COLORS[b.tier] || "var(--text-muted)",
                    padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                  }}>
                    {b.tier}
                  </span>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    XP: {b.xp} | {b.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && badges.length === 0 && lookupAddr && (
          <p style={{ color: "var(--text-muted)", marginTop: 12 }}>No badges found.</p>
        )}
      </div>

      {/* Admin Actions */}
      <div style={{ marginTop: 24, padding: 20, background: "var(--bg-surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Admin Actions</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>
          Requires admin badge in connected wallet. Royalties apply.
        </p>

        <AdminMintForm onSubmit={(u, t) => {
          const s = SCHEMAS.guild_role;
          sendAdminTx(adminMintManifest(s.manager, s.adminBadge, u, t, account!), "Minting role badge");
        }} />

        <AdminActionForm
          label="Update Tier"
          cost={ROYALTIES.update_tier}
          fields={[
            { name: "badgeId", placeholder: "guild_member_1", label: "Badge ID" },
            { name: "newTier", placeholder: "contributor", label: "New Tier", type: "select", options: SCHEMAS.guild_member.tiers },
          ]}
          onSubmit={(v) => {
            sendAdminTx(updateTierManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.newTier, account!), "Updating tier");
          }}
        />

        <AdminActionForm
          label="Update XP"
          cost={ROYALTIES.update_xp}
          fields={[
            { name: "badgeId", placeholder: "guild_member_1", label: "Badge ID" },
            { name: "newXp", placeholder: "100", label: "New XP", type: "number" },
          ]}
          onSubmit={(v) => {
            sendAdminTx(updateXpManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, parseInt(v.newXp), account!), "Updating XP");
          }}
        />

        <AdminActionForm
          label="Revoke Badge"
          cost={ROYALTIES.revoke}
          fields={[
            { name: "badgeId", placeholder: "guild_member_1", label: "Badge ID" },
            { name: "reason", placeholder: "Reason for revocation", label: "Reason" },
          ]}
          onSubmit={(v) => {
            sendAdminTx(revokeBadgeManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.reason, account!), "Revoking badge");
          }}
          color="var(--status-revoked)"
        />

        <AdminActionForm
          label="Update Extra Data"
          cost={ROYALTIES.update_extra_data}
          fields={[
            { name: "badgeId", placeholder: "guild_member_1", label: "Badge ID" },
            { name: "data", placeholder: '{"role":"mod"}', label: "JSON Data" },
          ]}
          onSubmit={(v) => {
            sendAdminTx(updateExtraDataManifest(SCHEMAS.guild_member.manager, SCHEMAS.guild_member.adminBadge, v.badgeId, v.data, account!), "Updating extra data");
          }}
        />

        <StatusMessage status={actionStatus} txId={actionTxId} error={actionError} />
      </div>

      {/* Schemas Overview */}
      <div style={{ marginTop: 24, padding: 20, background: "var(--bg-surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: 15, marginBottom: 12 }}>Badge Schemas</h2>
        {Object.entries(SCHEMAS).map(([name, schema]) => (
          <div key={name} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 12, color: schema.freeMint ? "var(--accent)" : "var(--status-pending)" }}>
                {schema.freeMint ? "Free mint" : "Admin only"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Tiers: {schema.tiers.join(" / ")} | Manager: {schema.manager.slice(0, 25)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Reusable Admin Sub-Components ── */

function AdminMintForm({ onSubmit }: { onSubmit: (username: string, tier: string) => void }) {
  const [username, setUsername] = useState("");
  const [tier, setTier] = useState("contributor");
  return (
    <div style={{ marginBottom: 16, padding: 14, background: "var(--bg-surface-2)", borderRadius: "var(--radius-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Mint Role Badge</span>
        <span style={{ fontSize: 11, color: "var(--status-pending)", fontFamily: "var(--font-mono)" }}>
          {ROYALTIES.mint} XRD
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={inputStyle} />
        <select value={tier} onChange={e => setTier(e.target.value)} style={{ ...inputStyle, flex: "none", width: 140 }}>
          {SCHEMAS.guild_role.tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => username && onSubmit(username, tier)} style={btnStyle("var(--status-pending)")}>
          Mint
        </button>
      </div>
    </div>
  );
}

interface FieldDef {
  name: string;
  placeholder: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
}

function AdminActionForm({
  label, cost, fields, onSubmit, color = "var(--accent)",
}: {
  label: string;
  cost: number;
  fields: FieldDef[];
  onSubmit: (values: Record<string, string>) => void;
  color?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.name, ""]))
  );

  const update = (name: string, val: string) =>
    setValues(prev => ({ ...prev, [name]: val }));

  const allFilled = fields.every(f => values[f.name]?.trim());

  return (
    <div style={{ marginBottom: 16, padding: 14, background: "var(--bg-surface-2)", borderRadius: "var(--radius-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: "var(--status-pending)", fontFamily: "var(--font-mono)" }}>
          {cost} XRD
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {fields.map(f => f.type === "select" ? (
          <select key={f.name} value={values[f.name]} onChange={e => update(f.name, e.target.value)} style={{ ...inputStyle, flex: "none", width: 140 }}>
            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            key={f.name}
            type={f.type || "text"}
            value={values[f.name]}
            onChange={e => update(f.name, e.target.value)}
            placeholder={f.placeholder}
            style={inputStyle}
          />
        ))}
        <button
          onClick={() => allFilled && onSubmit(values)}
          disabled={!allFilled}
          style={{
            ...btnStyle(color),
            opacity: allFilled ? 1 : 0.5,
            cursor: allFilled ? "pointer" : "not-allowed",
          }}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <Shell><AdminContent /></Shell>;
}
