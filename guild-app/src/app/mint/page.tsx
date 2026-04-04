"use client";
import { Shell, useWallet } from "../../components/Shell";
import { BadgeCard } from "../../components/BadgeCard";
import { StatusMessage } from "../../components/StatusMessage";
import { useState } from "react";
import { MANAGER, XP_THRESHOLDS, TIER_COLORS } from "../../lib/constants";
import { publicMintManifest } from "../../lib/manifests";

function MintContent() {
  const { account, connected, rdt, badge, badgeLoading, refreshBadge } = useWallet();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [minting, setMinting] = useState(false);

  async function handleMint() {
    if (!rdt || !account || !username.trim()) return;
    if (username.length > 64) { setError("Username too long (max 64 chars)"); return; }

    setMinting(true);
    setStatus("");
    setError("");
    setTxId("");

    try {
      const manifest = publicMintManifest(MANAGER, username.trim(), account);
      const result = await rdt.walletApi.sendTransaction({
        transactionManifest: manifest,
        version: 1,
      });

      if (result.isOk()) {
        setStatus("Badge minted!");
        setTxId(result.value.transactionIntentHash);
        setTimeout(() => refreshBadge(), 3000);
      } else {
        setError(JSON.stringify(result.error));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    }
    setMinting(false);
  }

  if (!connected) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Join the Guild</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Connect your Radix wallet to mint a free membership badge.
        </p>
      </div>
    );
  }

  if (badgeLoading) {
    return <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>Loading badge...</p>;
  }

  if (badge) {
    return (
      <div>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Your Badge</h2>
        <BadgeCard badge={badge} />
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 16 }}>
          You already have a guild badge. Earn XP by voting, proposing, and contributing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Mint Your Badge</h2>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter your username"
          maxLength={64}
          style={{
            width: "100%", padding: "10px 14px", fontSize: 14,
            background: "var(--input-bg)", border: "1px solid var(--input-border)",
            borderRadius: "var(--radius-sm)", color: "var(--input-text)",
            fontFamily: "var(--font-mono)", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "var(--accent)"}
          onBlur={e => e.target.style.borderColor = "var(--input-border)"}
        />
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          {username.length}/64 characters
        </div>

        <button
          onClick={handleMint}
          disabled={minting || !username.trim()}
          style={{
            marginTop: 16, width: "100%", padding: "12px 0",
            background: !username.trim() || minting ? "var(--bg-surface-2)" : "var(--accent)",
            color: !username.trim() || minting ? "var(--text-muted)" : "#000",
            border: "none", borderRadius: "var(--radius-sm)",
            fontSize: 14, fontWeight: 700, cursor: !username.trim() || minting ? "not-allowed" : "pointer",
          }}
        >
          {minting ? "Minting..." : "Mint Guild Badge (Free)"}
        </button>

        <StatusMessage status={status} txId={txId} error={error} />
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12, color: "var(--text-secondary)" }}>Tier Progression</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(XP_THRESHOLDS).map(([tier, xp]) => (
            <div key={tier} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "8px 14px", flex: 1, minWidth: 100,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TIER_COLORS[tier] || "var(--text-muted)", textTransform: "uppercase" }}>
                {tier}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                {xp.toLocaleString()} XP
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MintPage() {
  return <Shell><MintContent /></Shell>;
}
