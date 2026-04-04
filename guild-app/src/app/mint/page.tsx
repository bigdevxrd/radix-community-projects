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
  const { account, connected, rdt, badge, badgeLoading, refreshBadge } = useWallet();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [minting, setMinting] = useState(false);

  async function handleMint() {
    if (!rdt || !account || !username.trim()) return;
    if (username.length > 64) { setError("Username too long (max 64 chars)"); return; }
    setMinting(true); setStatus(""); setError(""); setTxId("");
    try {
      const manifest = publicMintManifest(MANAGER, username.trim(), account);
      const result = await rdt.walletApi.sendTransaction({ transactionManifest: manifest, version: 1 });
      if (result.isOk()) {
        setStatus("Badge minted!");
        setTxId(result.value.transactionIntentHash);
        setTimeout(() => refreshBadge(), 3000);
      } else { setError(JSON.stringify(result.error)); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Transaction failed"); }
    setMinting(false);
  }

  if (!connected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Join the Guild</h2>
        <p className="g-text-2 text-sm">Connect your wallet to mint a free badge.</p>
      </div>
    );
  }

  if (badgeLoading) return <BadgeSkeleton />;

  if (badge) {
    return (
      <div className="space-y-5">
        <BadgeCard badge={badge} />
        <p className="g-text-2 text-[13px]">You already have a badge. Earn XP by voting and contributing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="pt-5">
          <label className="block text-[11px] g-text-3 uppercase tracking-wider mb-1.5">Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username" maxLength={64}
            className="g-input w-full px-3.5 py-2.5 text-sm" />
          <div className="text-[11px] g-text-3 mt-1">{username.length}/64</div>
          <button onClick={handleMint} disabled={minting || !username.trim()}
            className="g-btn mt-4 w-full py-3 text-sm">
            {minting ? "Minting..." : "Mint Guild Badge (Free)"}
          </button>
          <StatusAlert status={status} txId={txId} error={error} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How It Works" />
        <CardBody>
          <div className="space-y-3 text-sm g-text-2">
            <p>Your badge is an on-chain NFT that lives in your Radix Wallet.</p>
            <p>Badge holders can propose ideas and vote in the Telegram governance group.</p>
            <p>Participating earns XP. XP determines your tier and voting weight.</p>
          </div>
          <div className="mt-4">
            <TierProgression />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function MintPage() {
  return <AppShell><MintContent /></AppShell>;
}
