"use client";
import { Shell } from "../../components/Shell";
import { useEffect, useRef, useState } from "react";
import { RadixDappToolkit, RadixNetwork, DataRequestBuilder } from "@radixdlt/radix-dapp-toolkit";

const DAPP_DEF = process.env.NEXT_PUBLIC_DAPP_DEF || "account_rdx128lggt503h7m2dhzqnrkkqv4zklxcjmdggr8xxtqy8e47p7fkmd8cx";
const GATEWAY = "https://mainnet.radixdlt.com";

const SCHEMAS = {
  guild_member: {
    manager: "component_rdx1cqarn8x6gk0806qyc9eee4nh6arzkm90xvnk0edqgtcfgghx5m2v2w",
    badge: "resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6",
    tiers: ["member", "contributor", "builder", "steward", "elder"],
    freeMint: true,
  },
  guild_role: {
    manager: "component_rdx1crh7qlan0yuwrf8wkq7vg7tkrc6w3ftr00qqf4auktqv2uuwwg8lut",
    badge: "resource_rdx1ntr6ye27zlyg2m06r90cletnwlzpedcv6yl0rhve64pp8prg0tw65e",
    tiers: ["admin", "moderator", "contributor"],
    freeMint: false,
  },
  guild_dev: {
    manager: "component_rdx1cqarn8x6gk0806qyc9eee4nh6arzkm90xvnk0edqgtcfgghx5m2v2w",
    badge: "resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6",
    tiers: ["member", "lead", "senior"],
    freeMint: false,
  },
};

interface BadgeInfo {
  id: string;
  issued_to: string;
  schema: string;
  tier: string;
  status: string;
  xp: number;
  level: string;
}

function AdminContent() {
  const [account, setAccount] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [lookupAddr, setLookupAddr] = useState("");
  const rdtRef = useRef<RadixDappToolkit | null>(null);

  useEffect(() => {
    setMounted(true);
    const rdt = RadixDappToolkit({
      dAppDefinitionAddress: DAPP_DEF,
      networkId: RadixNetwork.Mainnet,
      applicationName: "Radix Guild Admin",
      applicationVersion: "1.0.0",
    });
    rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));
    rdt.walletApi.walletData$.subscribe((data) => {
      const accts = data?.accounts ?? [];
      setAccount(accts[0]?.address ?? null);
    });
    rdtRef.current = rdt;
    return () => rdt.destroy();
  }, []);

  async function lookupBadges(address: string) {
    if (!address) return;
    setLoading(true);
    setBadges([]);
    try {
      const resp = await fetch(GATEWAY + "/state/entity/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addresses: [address],
          aggregation_level: "Vault",
          opt_ins: { non_fungible_include_nfids: true },
        }),
      });
      const data = await resp.json();
      const nfResources = data.items?.[0]?.non_fungible_resources?.items || [];
      const found: BadgeInfo[] = [];

      for (const schema of Object.values(SCHEMAS)) {
        const res = nfResources.find((r: any) => r.resource_address === schema.badge);
        if (!res) continue;
        const nfIds = res.vaults?.items?.[0]?.items || [];
        for (const nfId of nfIds) {
          const badgeResp = await fetch(GATEWAY + "/state/non-fungible/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resource_address: schema.badge, non_fungible_ids: [nfId] }),
          });
          const bd = await badgeResp.json();
          const nft = bd.non_fungible_ids?.[0];
          if (nft?.data?.programmatic_json?.fields) {
            const f = nft.data.programmatic_json.fields;
            const g = (i: number) => f[i]?.value || f[i]?.fields?.[0]?.value || "-";
            found.push({
              id: nfId, issued_to: g(0), schema: g(1),
              tier: g(3), status: g(4), xp: parseInt(g(6)) || 0, level: g(7),
            });
          }
        }
      }
      setBadges(found);
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
    setLoading(false);
  }

  async function mintRoleBadge(username: string, tier: string) {
    if (!rdtRef.current || !account) return;
    setStatus("Minting role badge...");
    const manager = SCHEMAS.guild_role.manager;
    const manifest = `CALL_METHOD
  Address("${manager}")
  "mint_badge"
  "${username}"
  "${tier}"
;
CALL_METHOD
  Address("${account}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
    try {
      const result = await rdtRef.current.walletApi.sendTransaction({
        transactionManifest: manifest,
        version: 1,
      });
      if (result.isOk()) {
        setStatus("Role badge minted! TX: " + result.value.transactionIntentHash.slice(0, 20) + "...");
      } else {
        setStatus("Error: " + JSON.stringify(result.error));
      }
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  }

  const s = (css: Record<string, any>) => css as React.CSSProperties;

  return (
    <div style={s({ maxWidth: 800, margin: "0 auto", padding: 40, color: "#e8e8f0" })}>
      <h1 style={s({ fontSize: 24, marginBottom: 8 })}>Badge Manager</h1>
      <p style={s({ color: "#888", marginBottom: 24 })}>Manage Guild badges across all schemas</p>

      {mounted && <radix-connect-button />}

      {/* Lookup */}
      <div style={s({ marginTop: 24, padding: 20, background: "#12121a", borderRadius: 12, border: "1px solid #2a2a3d" })}>
        <h2 style={s({ fontSize: 16, marginBottom: 12 })}>Look Up Badges</h2>
        <div style={s({ display: "flex", gap: 8 })}>
          <input
            value={lookupAddr}
            onChange={(e) => setLookupAddr(e.target.value)}
            placeholder="account_rdx1..."
            style={s({ flex: 1, background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 6, padding: "8px 12px", color: "#e8e8f0", fontFamily: "monospace", fontSize: 13 })}
          />
          <button onClick={() => lookupBadges(lookupAddr)} style={s({ background: "#00e49f", color: "#0a0a0f", border: "none", padding: "8px 20px", borderRadius: 6, fontWeight: 600, cursor: "pointer" })}>
            Search
          </button>
        </div>
        {account && (
          <button onClick={() => { setLookupAddr(account); lookupBadges(account); }} style={s({ marginTop: 8, background: "none", border: "1px solid #2a2a3d", color: "#888", padding: "4px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" })}>
            Check my badges
          </button>
        )}
        {loading && <p style={s({ color: "#888", marginTop: 12 })}>Loading...</p>}
        {badges.length > 0 && (
          <div style={s({ marginTop: 16 })}>
            {badges.map((b) => (
              <div key={b.id} style={s({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #2a2a3d" })}>
                <div>
                  <div style={s({ fontWeight: 600 })}>{b.issued_to}</div>
                  <div style={s({ fontSize: 12, color: "#888" })}>{b.schema} | {b.id}</div>
                </div>
                <div style={s({ textAlign: "right" })}>
                  <span style={s({ background: "#00e49f1a", color: "#00e49f", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 })}>{b.tier}</span>
                  <div style={s({ fontSize: 11, color: "#888", marginTop: 4 })}>XP: {b.xp} | {b.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && badges.length === 0 && lookupAddr && <p style={s({ color: "#888", marginTop: 12 })}>No badges found for this address.</p>}
      </div>

      {/* Mint Role Badge */}
      <div style={s({ marginTop: 24, padding: 20, background: "#12121a", borderRadius: 12, border: "1px solid #2a2a3d" })}>
        <h2 style={s({ fontSize: 16, marginBottom: 12 })}>Mint Role Badge (Admin Only)</h2>
        <p style={s({ color: "#888", fontSize: 13, marginBottom: 12 })}>Requires admin badge in connected wallet.</p>
        <MintRoleForm onMint={mintRoleBadge} />
        {status && <p style={s({ marginTop: 12, color: status.includes("Error") ? "#ef4444" : "#00e49f", fontSize: 13 })}>{status}</p>}
      </div>

      {/* Schemas Overview */}
      <div style={s({ marginTop: 24, padding: 20, background: "#12121a", borderRadius: 12, border: "1px solid #2a2a3d" })}>
        <h2 style={s({ fontSize: 16, marginBottom: 12 })}>Badge Schemas</h2>
        {Object.entries(SCHEMAS).map(([name, schema]) => (
          <div key={name} style={s({ padding: "10px 0", borderBottom: "1px solid #2a2a3d" })}>
            <div style={s({ display: "flex", justifyContent: "space-between" })}>
              <span style={s({ fontWeight: 600 })}>{name}</span>
              <span style={s({ fontSize: 12, color: schema.freeMint ? "#00e49f" : "#f59e0b" })}>{schema.freeMint ? "Free mint" : "Admin only"}</span>
            </div>
            <div style={s({ fontSize: 12, color: "#888", marginTop: 4 })}>
              Tiers: {schema.tiers.join(" / ")} | Manager: {schema.manager.slice(0, 25)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MintRoleForm({ onMint }: { onMint: (username: string, tier: string) => void }) {
  const [username, setUsername] = useState("");
  const [tier, setTier] = useState("contributor");
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" style={{ flex: 1, minWidth: 150, background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 6, padding: "8px 12px", color: "#e8e8f0", fontFamily: "monospace", fontSize: 13 }} />
      <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 6, padding: "8px 12px", color: "#e8e8f0", fontSize: 13 }}>
        <option value="contributor">Contributor</option>
        <option value="moderator">Moderator</option>
        <option value="admin">Admin</option>
      </select>
      <button onClick={() => username && onMint(username, tier)} style={{ background: "#f59e0b", color: "#0a0a0f", border: "none", padding: "8px 20px", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
        Mint Role
      </button>
    </div>
  );
}


export default function AdminPage() {
  return <Shell><AdminContent /></Shell>;
}
