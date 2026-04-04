"use client";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { ECOSYSTEM_LINKS, QUICK_ACTIONS, RESOURCES } from "@/lib/constants";
import Link from "next/link";

function Dashboard() {
  const { account, connected, badge, badgeLoading } = useWallet();

  return (
    <div className="space-y-5">
      {/* Badge Section */}
      {!connected ? (
        <Card className="bg-gradient-to-br from-card to-muted">
          <CardContent className="px-6 py-12 text-center">
            <h1 className="text-2xl font-bold mb-3">Radix Governance</h1>
            <p className="text-muted-foreground text-sm mb-6">Governance infrastructure for the Radix community</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { title: "On-chain Badges", desc: "NFT membership in your wallet" },
                { title: "Badge-gated Voting", desc: "Propose and vote in Telegram" },
                { title: "Open Source", desc: "MIT licensed, clone and build" },
              ].map((f) => (
                <div key={f.title} className="text-center">
                  <div className="text-sm font-semibold mb-1">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : badgeLoading ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between"><Skeleton className="h-5 w-32" /><Skeleton className="h-5 w-20" /></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
            <Skeleton className="h-1.5 w-full" />
          </CardContent>
        </Card>
      ) : badge ? (
        <>
          <BadgeCard badge={badge} />
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Tier Progression</CardTitle></CardHeader>
            <CardContent><TierProgression currentLevel={badge.level} /></CardContent>
          </Card>
        </>
      ) : (
        <Card className="text-center">
          <CardContent className="py-10">
            <h2 className="text-lg font-bold mb-2">Become a Member</h2>
            <p className="text-muted-foreground text-sm mb-5">Free on-chain badge. Your badge is your vote.</p>
            <Link href="/mint"><Button>Mint Your Badge</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {connected && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map((a) => {
                const inner = (<><div className="font-semibold text-sm mb-1">{a.label}</div><div className="text-xs text-muted-foreground">{a.desc}</div></>);
                return a.external ? (
                  <a key={a.label} href={a.href} target="_blank" className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">{inner}</a>
                ) : (
                  <Link key={a.label} href={a.href} className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">{inner}</Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ecosystem */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Ecosystem</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ECOSYSTEM_LINKS.map((s) => (
              <a key={s.name} href={s.url} target="_blank" className="block bg-muted rounded-lg p-4 no-underline text-foreground hover:bg-accent/10 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <Badge variant={s.status === "Active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resources</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RESOURCES.map((r) => (
              <a key={r.name} href={r.url} target="_blank" className="flex items-center gap-2.5 bg-muted rounded-lg px-4 py-3 no-underline text-foreground hover:bg-accent/10 transition-colors">
                <div>
                  <div className="font-semibold text-[13px]">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wallet */}
      {account && (
        <div className="text-xs text-muted-foreground font-mono">{account.slice(0, 20)}...{account.slice(-8)}</div>
      )}
    </div>
  );
}

export default function Home() {
  return <AppShell><Dashboard /></AppShell>;
}
