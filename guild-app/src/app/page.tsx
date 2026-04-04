"use client";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeSkeleton } from "@/components/LoadingSkeleton";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { useWallet } from "@/hooks/useWallet";
import Link from "next/link";

const LINKS = [
  { label: "Telegram Bot", href: "https://t.me/radix_guild_bot", desc: "Propose, vote, earn XP" },
  { label: "GitHub", href: "https://github.com/bigdevxrd/radix-community-projects", desc: "Source code (MIT)" },
  { label: "CrumbsUp DAO", href: "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0", desc: "Guild governance" },
];

function Dashboard() {
  const { account, connected, badge, badgeLoading } = useWallet();

  /* State 1: Not connected */
  if (!connected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-3">Radix Guild</h1>
        <p className="g-text-2 text-sm mb-1">Community governance infrastructure for Radix.</p>
        <p className="g-text-3 text-sm">Connect your wallet to get started.</p>
      </div>
    );
  }

  /* State 2/3: Connected */
  return (
    <div className="space-y-5">
      {badgeLoading ? (
        <BadgeSkeleton />
      ) : badge ? (
        /* State 3: Has badge */
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
        /* State 2: No badge */
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

      {/* Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LINKS.map((l) => (
          <a key={l.label} href={l.href} target="_blank"
            className="g-card block p-4 no-underline g-text">
            <div className="font-semibold text-sm mb-1">{l.label}</div>
            <div className="text-xs g-text-3">{l.desc}</div>
          </a>
        ))}
      </div>

      {/* Wallet */}
      <div className="text-xs g-text-3 font-mono">
        {account?.slice(0, 20)}...{account?.slice(-8)}
      </div>
    </div>
  );
}

export default function Home() {
  return <AppShell><Dashboard /></AppShell>;
}
