"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) { setError("Username can only contain letters, numbers, _ and -"); return; }
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
        <p className="text-muted-foreground text-sm">Connect your wallet to mint a free badge.</p>
      </div>
    );
  }

  if (badgeLoading) {
    return <Card><CardContent className="p-5 space-y-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-14 w-full" /><Skeleton className="h-1.5 w-full" /></CardContent></Card>;
  }

  if (badge) {
    return (
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-card to-muted">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="text-3xl mb-2">Welcome, {badge.issued_to}!</div>
            <p className="text-muted-foreground text-sm">Your badge is live on-chain. You're part of Radix Governance.</p>
          </CardContent>
        </Card>

        <BadgeCard badge={badge} />

        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-sm font-semibold mb-3">Get started in 3 steps:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div>
                  <div className="text-sm font-semibold">Join the governance group</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Open <a href="https://t.me/rad_gov" target="_blank" className="text-primary hover:underline">@rad_gov</a> in Telegram and type <code className="font-mono text-[11px] bg-muted px-1 rounded">/register {account?.slice(0, 20)}...</code>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div>
                  <div className="text-sm font-semibold">Cast your first vote</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Type <code className="font-mono text-[11px] bg-muted px-1 rounded">/proposals</code> to see active votes, or <Link href="/proposals" className="text-primary hover:underline">browse them here</Link>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <div>
                  <div className="text-sm font-semibold">Earn XP + roll the dice</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Every vote earns XP and a <Link href="/game" className="text-primary hover:underline">dice roll</Link> for bonus XP. Track progress on your <Link href="/profile" className="text-primary hover:underline">profile</Link>.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div>
            <label className="block text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Username</label>
            <p className="text-xs text-muted-foreground mb-2">Your governance identity. Stored on-chain with your badge.</p>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. bigdevxrd"
              maxLength={64}
              className="font-mono"
            />
            <div className="text-[11px] text-muted-foreground mt-1">{username.length}/64 characters</div>
          </div>
          <Button onClick={handleMint} disabled={minting || !username.trim()} className="w-full">
            {minting ? "Minting..." : "Mint Guild Badge (Free)"}
          </Button>
          {(status || error) && (
            <Alert variant={error ? "destructive" : "default"}>
              <AlertDescription>
                {error || status}
                {txId && (
                  <a href={`https://dashboard.radixdlt.com/transaction/${txId}`} target="_blank" className="block mt-1 text-xs text-primary hover:underline">
                    View on Dashboard
                  </a>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">How It Works</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Your badge is an on-chain NFT that lives in your Radix Wallet.</p>
            <p>Badge holders can propose ideas and vote in the Telegram governance group.</p>
            <p>Participating earns XP. XP determines your tier and voting weight.</p>
          </div>
          <TierProgression />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MintPage() {
  return <AppShell><MintContent /></AppShell>;
}
