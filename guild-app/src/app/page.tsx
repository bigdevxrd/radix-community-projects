"use client";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeSkeleton } from "@/components/LoadingSkeleton";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { useWallet } from "@/hooks/useWallet";
import Link from "next/link";

const ACTIONS = [
  { label: "Vote on Proposals", href: "https://t.me/radix_guild_bot", desc: "Open TG bot" },
  { label: "View Proposals", href: "/proposals", desc: "Live results" },
  { label: "Manage Badges", href: "/admin", desc: "Admin panel" },
];

const ECOSYSTEM = [
  { name: "RadixTalk", desc: "Community forum", url: "https://radixtalk.com", pill: "g-pill-blue", status: "Link" },
  { name: "Radix Wiki", desc: "DAO Charter", url: "https://radix.wiki/ecosystem", pill: "g-pill-blue", status: "Link" },
  { name: "CrumbsUp", desc: "Guild DAO", url: "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0", pill: "g-pill-green", status: "Active" },
  { name: "Muan Protocol", desc: "DAO infra", url: "https://muanprotocol.com", pill: "g-pill-yellow", status: "Pending" },
  { name: "Consultation v2", desc: "On-chain governance", url: "https://consultation.radixdlt.com", pill: "g-pill-yellow", status: "Planned" },
  { name: "Astra AI", desc: "Astrolescent", url: "https://astrolescent.com", pill: "g-pill-purple", status: "Planned" },
];

const RESOURCES = [
  { name: "Guild Discourse", url: "https://radix-guild.discourse.group", desc: "Discussion forum" },
  { name: "GitHub", url: "https://github.com/bigdevxrd/radix-community-projects", desc: "Source code (MIT)" },
  { name: "Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter", desc: "DAO Charter draft" },
  { name: "MVD Discussion", url: "https://radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258", desc: "Minimum Viable DAO" },
];

function DashboardContent() {
  const { account, connected, badge, badgeLoading } = useWallet();

  if (!connected) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Welcome to the Radix Guild</h2>
        <p className="g-text-2 text-base">Connect your Radix Wallet to participate in governance</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {badgeLoading ? <BadgeSkeleton /> : badge ? (
        <>
          <BadgeCard badge={badge} />
          <Card>
            <CardHeader title="Tier Progression" />
            <CardBody><TierProgression currentLevel={badge.level} /></CardBody>
          </Card>
        </>
      ) : (
        <Card className="text-center">
          <CardBody className="py-8">
            <h2 className="text-lg font-semibold mb-2">Become a Member</h2>
            <p className="g-text-2 text-sm mb-4">Get a free Guild badge. Your badge is your vote.</p>
            <Link href="/mint" className="g-btn inline-block px-6 py-2.5 text-sm no-underline">
              Mint Your Badge
            </Link>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Quick Actions" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ACTIONS.map((a) => (
              <a key={a.label} href={a.href} className="block g-card-inner p-4 no-underline g-text rounded-md">
                <div className="font-semibold text-sm mb-1">{a.label}</div>
                <div className="text-xs g-text-3">{a.desc}</div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Ecosystem" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ECOSYSTEM.map((s) => (
              <a key={s.name} href={s.url} target="_blank" className="block g-card-inner p-4 no-underline g-text rounded-md">
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

      <Card>
        <CardHeader title="Resources" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RESOURCES.map((r) => (
              <a key={r.name} href={r.url} target="_blank" className="flex items-center gap-2.5 g-card-inner px-4 py-3 no-underline g-text rounded-md">
                <div>
                  <div className="font-semibold text-[13px]">{r.name}</div>
                  <div className="text-[11px] g-text-3">{r.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="g-card px-4 py-3">
        <span className="text-xs g-text-3 font-mono">Wallet: {account?.slice(0, 20)}...{account?.slice(-8)}</span>
      </div>
    </div>
  );
}

export default function Home() {
  return <AppShell><DashboardContent /></AppShell>;
}
