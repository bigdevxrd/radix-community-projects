"use client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const GUIDES = [
  {
    title: "What is Radix Governance?",
    desc: "Community-built tools for making decisions together. Badges, voting, bounties, all on Radix.",
    image: "/infographics/01-what-is-radix-guild.svg",
  },
  {
    title: "How Governance Works",
    desc: "Two tiers: free votes in Telegram for day-to-day coordination, on-chain CV2 votes for formal decisions.",
    image: "/infographics/02-how-governance-works.svg",
  },
  {
    title: "Bounty Pipeline",
    desc: "Fund, create, claim, submit, verify, pay. Earn XRD and XP by contributing work.",
    image: "/infographics/03-bounty-pipeline.svg",
  },
  {
    title: "Badge and XP System",
    desc: "Mint a free badge. Earn XP by participating. XP tracks your contribution level and unlocks tiers.",
    image: "/infographics/04-badge-xp-system.svg",
  },
  {
    title: "Charter Decision Map",
    desc: "32 governance decisions organized into 3 phases. Each phase unlocks when the previous one completes.",
    image: "/infographics/05-charter-decision-map.svg",
  },
  {
    title: "Architecture",
    desc: "Telegram bot, Next.js dashboard, Scrypto smart contracts, CV2 on-chain governance. All open source.",
    image: "/infographics/06-architecture-at-a-glance.svg",
  },
];

const QUICK_START = [
  { step: "1", title: "Connect your Radix Wallet", desc: "Click the connect button in the top right of any page.", link: null },
  { step: "2", title: "Mint a free badge", desc: "Choose a username and mint your on-chain governance badge.", link: "/mint" },
  { step: "3", title: "Join the Telegram group", desc: "Open @rad_gov and type /register with your wallet address.", link: "https://t.me/rad_gov" },
  { step: "4", title: "Vote on proposals", desc: "Type /proposals in Telegram or browse them on the dashboard.", link: "/proposals" },
  { step: "5", title: "Earn XP and play the game", desc: "Every vote earns XP and a dice roll. Spend rolls on the grid game.", link: "/game" },
  { step: "6", title: "Browse bounties", desc: "Earn XRD by completing tasks for the community.", link: "/bounties" },
];

function DocsContent() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Getting Started</h1>
        <p className="text-muted-foreground text-sm mt-1">Everything you need to know to participate in Radix Governance.</p>
      </div>

      {/* Quick start */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {QUICK_START.map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">{s.step}</div>
                <div>
                  <div className="text-sm font-semibold">
                    {s.link ? (
                      <Link href={s.link} className="text-foreground hover:text-primary no-underline" target={s.link.startsWith("http") ? "_blank" : undefined}>{s.title}</Link>
                    ) : s.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Infographics */}
      <div>
        <h2 className="text-lg font-bold mb-4">How It All Works</h2>
        <div className="space-y-6">
          {GUIDES.map((g, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-5">
                <h3 className="text-sm font-bold mb-1">{g.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{g.desc}</p>
                <div className="bg-muted rounded-lg p-4 flex items-center justify-center">
                  <img src={g.image} alt={g.title} className="max-w-full h-auto max-h-80" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: "Telegram Bot", url: "https://t.me/rad_gov" },
              { label: "GitHub (open source)", url: "https://github.com/bigdevxrd/radix-community-projects" },
              { label: "DAO Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter" },
              { label: "API Reference", url: "https://github.com/bigdevxrd/radix-community-projects/blob/main/docs/API-REFERENCE.md" },
              { label: "Bot Commands", url: "https://github.com/bigdevxrd/radix-community-projects/blob/main/docs/BOT-COMMANDS.md" },
              { label: "How It Works (detailed)", url: "https://github.com/bigdevxrd/radix-community-projects/blob/main/docs/HOW-IT-WORKS.md" },
            ].map(r => (
              <a key={r.label} href={r.url} target="_blank" className="flex items-center justify-between py-1.5 border-b last:border-0 text-foreground no-underline hover:text-primary">
                <span>{r.label}</span>
                <span className="text-xs text-muted-foreground">{">"}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DocsPage() {
  return <AppShell><DocsContent /></AppShell>;
}
