"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeSkeleton } from "@/components/LoadingSkeleton";
import { StatusAlert } from "@/components/StatusAlert";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { useWallet } from "@/hooks/useWallet";
import { MANAGER } from "@/lib/constants";
import { publicMintManifest } from "@/lib/manifests";

function MintContent() {
  const { account, connected, rdt, badge, badgeLoading, refreshBadge } =
    useWallet();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [minting, setMinting] = useState(false);

  async function handleMint() {
    if (!rdt || !account || !username.trim()) return;
    if (username.length > 64) {
      setError("Username too long (max 64 chars)");
      return;
    }

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
      <div className="text-center py-16">
        <h2 className="text-xl font-bold mb-2">Join the Guild</h2>
        <p className="text-text-secondary text-sm">
          Connect your Radix wallet to mint a free membership badge.
        </p>
      </div>
    );
  }

  if (badgeLoading) return <BadgeSkeleton />;

  if (badge) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Badge</h2>
        <BadgeCard badge={badge} />
        <p className="text-text-secondary text-[13px]">
          You already have a guild badge. Earn XP by voting, proposing, and
          contributing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Mint Your Badge</h2>

      <Card>
        <CardBody className="pt-5">
          <label className="block text-[11px] text-text-muted uppercase tracking-wider mb-1.5">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            maxLength={64}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-2 border border-border rounded-md text-text-primary font-mono outline-none focus:border-accent transition-colors"
          />
          <div className="text-[11px] text-text-muted mt-1">
            {username.length}/64 characters
          </div>

          <button
            onClick={handleMint}
            disabled={minting || !username.trim()}
            className={`mt-4 w-full py-3 rounded-md text-sm font-bold transition-colors ${
              !username.trim() || minting
                ? "bg-surface-2 text-text-muted cursor-not-allowed"
                : "bg-accent text-black cursor-pointer hover:bg-accent-hover"
            }`}
          >
            {minting ? "Minting..." : "Mint Guild Badge (Free)"}
          </button>

          <StatusAlert status={status} txId={txId} error={error} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tier Progression" />
        <CardBody>
          <TierProgression />
        </CardBody>
      </Card>
    </div>
  );
}

export default function MintPage() {
  return (
    <AppShell>
      <MintContent />
    </AppShell>
  );
}
