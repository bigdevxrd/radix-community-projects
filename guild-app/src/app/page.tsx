"use client";
import { AppShell } from "@/components/AppShell";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeSkeleton } from "@/components/LoadingSkeleton";
import { TierProgression } from "@/components/TierProgression";
import { Card, CardHeader, CardBody } from "@/components/Card";
import { useWallet } from "@/hooks/useWallet";
import Link from "next/link";

const QUICK_ACTIONS = [
  { label: "Vote on Proposals", href: "https://t.me/radix_guild_bot", desc: "Open TG bot" },
  { label: "View Proposals", href: "/guild/proposals", desc: "Live results" },
  { label: "Manage Badges", href: "/guild/admin", desc: "Admin panel" },
];

const ECOSYSTEM = [
  { name: "RadixTalk", desc: "Community forum", url: "https://radixtalk.com", status: "Link" },
  { name: "Radix Wiki", desc: "DAO Charter + ecosystem", url: "https://radix.wiki/ecosystem", status: "Link" },
  { name: "CrumbsUp", desc: "Guild DAO governance", url: "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0", status: "Active" },
  { name: "Muan Protocol", desc: "DAO infrastructure", url: "https://muanprotocol.com", status: "Pending" },
  { name: "Consultation v2", desc: "On-chain governance", url: "https://consultation.radixdlt.com", status: "Planned" },
  { name: "Astra AI", desc: "Astrolescent assistant", url: "https://astrolescent.com", status: "Planned" },
];

const RESOURCES = [
  { name: "Guild Discourse", url: "https://radix-guild.discourse.group", desc: "Discussion forum" },
  { name: "GitHub", url: "https://github.com/bigdevxrd/radix-community-projects", desc: "Source code (MIT)" },
  { name: "Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter", desc: "DAO Charter draft" },
  { name: "MVD Discussion", url: "https://radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258", desc: "Minimum Viable DAO" },
];

const STATUS_COLORS: Record<string, string> = {
  Active: "text-status-active bg-status-active/10",
  Link: "text-tier-contributor bg-tier-contributor/10",
  Pending: "text-status-pending bg-status-pending/10",
  Planned: "text-status-planned bg-status-planned/10",
};

function DashboardContent() {
  const { account, connected, badge, badgeLoading } = useWallet();

  if (!connected) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Welcome to the Radix Guild</h2>
        <p className="text-text-secondary text-base">
          Connect your Radix Wallet to participate in governance
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Badge Section */}
      {badgeLoading ? (
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
          <CardBody className="py-8">
            <h2 className="text-lg font-semibold mb-2">Become a Member</h2>
            <p className="text-text-secondary text-sm mb-4">
              Get a free Guild badge. Your badge is your vote.
            </p>
            <Link
              href="/guild/mint"
              className="inline-block bg-accent text-black px-6 py-2.5 rounded-md text-sm font-bold no-underline hover:bg-accent-hover transition-colors"
            >
              Mint Your Badge
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <CardBody>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="block bg-surface-2 border border-border rounded-md p-4 no-underline text-text-primary hover:border-accent/30 transition-colors"
              >
                <div className="font-semibold text-sm mb-1">{a.label}</div>
                <div className="text-xs text-text-muted">{a.desc}</div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Ecosystem */}
      <Card>
        <CardHeader title="Ecosystem" />
        <CardBody>
          <div className="grid grid-cols-3 gap-3">
            {ECOSYSTEM.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                className="block bg-surface-2 border border-border rounded-md p-4 no-underline text-text-primary hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[s.status] || ""
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-text-muted">{s.desc}</div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader title="Resources" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            {RESOURCES.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                className="flex items-center gap-2.5 bg-surface-2 border border-border rounded-md px-4 py-3 no-underline text-text-primary hover:border-accent/30 transition-colors"
              >
                <div>
                  <div className="font-semibold text-[13px]">{r.name}</div>
                  <div className="text-[11px] text-text-muted">{r.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Wallet */}
      <div className="bg-surface border border-border rounded-lg px-4 py-3">
        <span className="text-xs text-text-muted font-mono">
          Wallet: {account?.slice(0, 20)}...{account?.slice(-8)}
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
