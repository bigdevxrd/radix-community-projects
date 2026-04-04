"use client";
import { useState } from "react";
import { Shell, useWallet } from "../components/Shell";

function DashboardContent() {
  const { account, connected, badge, badgeLoading, rdt } = useWallet();
  const [mintStatus, setMintStatus] = useState("");
  const [txId, setTxId] = useState("");

  const MANAGER = process.env.NEXT_PUBLIC_MANAGER || "component_rdx1cqarn8x6gk0806qyc9eee4nh6arzkm90xvnk0edqgtcfgghx5m2v2w";

  async function handleMint() {
    if (!rdt || !account) return;
    setMintStatus("Opening wallet...");
    setTxId("");
    const name = "guild_" + account.slice(-8);
    const manifest = `CALL_METHOD\n  Address("${MANAGER}")\n  "public_mint"\n  "${name}"\n;\nCALL_METHOD\n  Address("${account}")\n  "deposit_batch"\n  Expression("ENTIRE_WORKTOP")\n;`;
    try {
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setMintStatus("Badge minted!");
        setTxId(result.value.transactionIntentHash);
      } else {
        setMintStatus("Error: " + JSON.stringify(result.error));
      }
    } catch (e: any) {
      setMintStatus("Error: " + e.message);
    }
  }

  if (!connected) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Welcome to the Radix Guild</h2>
        <p style={{ color: "#888", marginBottom: 24, fontSize: 16 }}>Connect your Radix Wallet to participate in governance</p>
      </div>
    );
  }

  const tierColor = (t: string) => ({ member: "#8888a0", contributor: "#4ea8de", builder: "#a78bfa", steward: "#f59e0b", elder: "#00e49f" }[t] || "#888");

  return (
    <>
      {badgeLoading && <p style={{ color: "#888" }}>Loading badge...</p>}

      {badge ? (
        <div style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: 1 }}>Your Badge</h2>
            <span style={{ background: tierColor(badge.tier) + "1a", color: tierColor(badge.tier), padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
              {badge.tier.toUpperCase()}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Level", value: badge.level, color: tierColor(badge.tier) },
              { label: "XP", value: badge.xp, color: "#00e49f" },
              { label: "Status", value: badge.status, color: badge.status === "active" ? "#00e49f" : "#ef4444" },
              { label: "Badge ID", value: badge.id.slice(1, -1).split("_").pop(), color: "#888" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Become a Member</h2>
          <p style={{ color: "#888", marginBottom: 16 }}>Get a free Guild badge. Your badge is your vote.</p>
          <button onClick={handleMint} style={{ background: "#00e49f", color: "#0a0a0f", border: "none", padding: "10px 24px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Join the Guild
          </button>
          {mintStatus && <p style={{ marginTop: 12, color: mintStatus.includes("Error") ? "#ef4444" : "#00e49f", fontSize: 13 }}>{mintStatus}</p>}
          {txId && <a href={"https://dashboard.radixdlt.com/transaction/" + txId} target="_blank" style={{ display: "block", marginTop: 8, color: "#00e49f", fontSize: 12 }}>View on Dashboard</a>}
        </div>
      )}

      <div style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Vote on Proposals", href: "https://t.me/radix_guild_bot", desc: "Open TG bot" },
            { label: "View Proposals", href: "/guild/proposals", desc: "Live results" },
            { label: "Manage Badges", href: "/guild/admin", desc: "Admin panel" },
          ].map(a => (
            <a key={a.label} href={a.href} style={{
              display: "block", background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 10, padding: 16,
              textDecoration: "none", color: "#e8e8f0", transition: "border-color 0.15s",
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{a.desc}</div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Task Counters</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 10, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Human Tasks</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#00e49f", fontFamily: "JetBrains Mono, monospace" }}>0</div>
            <div style={{ fontSize: 11, color: "#555" }}>Grid game: each task = 1 dice roll</div>
          </div>
          <div style={{ background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 10, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>AI Tasks</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#a78bfa", fontFamily: "JetBrains Mono, monospace" }}>0</div>
            <div style={{ fontSize: 11, color: "#555" }}>Bert agent integration</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Ecosystem</h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>Connected services. API providers voted on by the community.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { name: "RadixTalk", desc: "Community forum (Discourse)", url: "https://radixtalk.com", status: "Link", color: "#4ea8de" },
            { name: "Radix Wiki", desc: "DAO Charter + ecosystem", url: "https://radix.wiki/ecosystem", status: "Link", color: "#4ea8de" },
            { name: "CrumbsUp", desc: "Guild DAO governance", url: "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0", status: "Active", color: "#00e49f" },
            { name: "Muan Protocol", desc: "DAO infrastructure", url: "https://muanprotocol.com", status: "Pending", color: "#f59e0b" },
            { name: "Consultation v2", desc: "On-chain governance", url: "https://consultation.radixdlt.com", status: "Planned", color: "#f59e0b" },
            { name: "Astra AI", desc: "Astrolescent assistant", url: "https://astrolescent.com", status: "Planned", color: "#a78bfa" },
          ].map(s => (
            <a key={s.name} href={s.url} target="_blank" style={{
              display: "block", background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 10, padding: 16,
              textDecoration: "none", color: "#e8e8f0",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                <span style={{ fontSize: 10, color: s.color, background: s.color + "1a", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>{s.status}</span>
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>{s.desc}</div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Resources</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { name: "Guild Discourse", url: "https://radix-guild.discourse.group", desc: "Discussion forum" },
            { name: "GitHub", url: "https://github.com/bigdevxrd/radix-community-projects", desc: "Source code (MIT)" },
            { name: "Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter", desc: "DAO Charter draft" },
            { name: "MVD Discussion", url: "https://radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258", desc: "Minimum Viable DAO" },
          ].map(r => (
            <a key={r.name} href={r.url} target="_blank" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
              background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: 10,
              textDecoration: "none", color: "#e8e8f0", fontSize: 13,
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{r.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 16, background: "#12121a", borderRadius: 12, border: "1px solid #2a2a3d" }}>
        <div style={{ fontSize: 12, color: "#888", fontFamily: "JetBrains Mono, monospace" }}>
          Wallet: {account?.slice(0, 20)}...{account?.slice(-8)}
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Shell>
      <DashboardContent />
    </Shell>
  );
}
