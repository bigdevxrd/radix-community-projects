"use client";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeSkeleton } from "@/components/LoadingSkeleton";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { useWallet } from "@/hooks/useWallet";
import { ECOSYSTEM_LINKS, QUICK_ACTIONS, RESOURCES } from "@/lib/constants";
import Link from "next/link";

function Dashboard() {
  const { account, connected, badge, badgeLoading } = useWallet();

  return (
    <div className="space-y-5">
      {/* Badge Section — state-dependent */}
      {!connected ? (
        <div className="g-hero px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-3">Radix Guild</h1>
          <p className="g-text-2 text-sm mb-6">Community governance infrastructure for Radix</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { title: "On-chain Badges", desc: "NFT membership in your wallet" },
              { title: "Badge-gated Voting", desc: "Propose and vote in Telegram" },
              { title: "Open Source", desc: "MIT licensed, clone and build" },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-sm font-semibold mb-1">{f.title}</div>
                <div className="text-xs g-text-3">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ) : badgeLoading ? (
        <BadgeSkeleton />
      ) : badge ? (
        <>
          <BadgeCard badge={badge} />
          <Card>
            <CardHeader title="Tier Progression" />
            <CardBody>
              <TierProgression currentLevel={badge.level} />
            </CardBody>
          </Card>
        </>
      ) : (
        <Card className="text-center">
          <CardBody className="py-10">
            <h2 className="text-lg font-bold mb-2">Become a Member</h2>
            <p className="g-text-2 text-sm mb-5">Free on-chain badge. Your badge is your vote.</p>
            <Link href="/mint" className="g-btn inline-block px-8 py-3 text-sm no-underline">
              Mint Your Badge
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Quick Actions — only when connected */}
      {connected && (
        <Card>
          <CardHeader title="Quick Actions" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map((a) =>
                a.external ? (
                  <a key={a.label} href={a.href} target="_blank"
                    className="g-card-inner block p-4 no-underline g-text rounded-md">
                    <div className="font-semibold text-sm mb-1">{a.label}</div>
                    <div className="text-xs g-text-3">{a.desc}</div>
                  </a>
                ) : (
                  <Link key={a.label} href={a.href}
                    className="g-card-inner block p-4 no-underline g-text rounded-md">
                    <div className="font-semibold text-sm mb-1">{a.label}</div>
                    <div className="text-xs g-text-3">{a.desc}</div>
                  </Link>
                )
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Ecosystem — always visible */}
      <Card>
        <CardHeader title="Ecosystem" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ECOSYSTEM_LINKS.map((s) => (
              <a key={s.name} href={s.url} target="_blank"
                className="g-card-inner block p-4 no-underline g-text rounded-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className={`g-pill ${s.pill}`}>{s.status}</span>
                </div>
                <div className="text-xs g-text-3">{s.desc}</div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Resources — always visible */}
      <Card>
        <CardHeader title="Resources" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RESOURCES.map((r) => (
              <a key={r.name} href={r.url} target="_blank"
                className="g-card-inner flex items-center gap-2.5 px-4 py-3 no-underline g-text rounded-md">
                <div>
                  <div className="font-semibold text-[13px]">{r.name}</div>
                  <div className="text-[11px] g-text-3">{r.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Wallet — only when connected */}
      {account && (
        <div className="text-xs g-text-3 font-mono">
          {account.slice(0, 20)}...{account.slice(-8)}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return <AppShell><Dashboard /></AppShell>;
}
