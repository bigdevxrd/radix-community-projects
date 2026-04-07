"use client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TG_BOT_URL } from "@/lib/constants";
import Link from "next/link";

const QUICK_START = [
  { step: "1", title: "Get a Radix Wallet", desc: "Download the official Radix Wallet for mobile or browser extension.", link: "https://wallet.radixdlt.com", external: true },
  { step: "2", title: "Connect your wallet", desc: "Click the connect button in the top right of this page.", link: null, external: false },
  { step: "3", title: "Mint a free badge", desc: "Choose a username. Your badge is a free on-chain NFT — no XRD required.", link: "/mint", external: false },
  { step: "4", title: "Register in Telegram", desc: "Open @rad_gov and type /register followed by your wallet address.", link: TG_BOT_URL, external: true },
  { step: "5", title: "Vote on proposals", desc: "Type /proposals in Telegram or browse them here. Charter votes shape the DAO.", link: "/proposals", external: false },
  { step: "6", title: "Earn XP and level up", desc: "Every vote earns +10 XP and a dice roll. Propose for +25 XP. Level up your badge tier.", link: "/game", external: false },
];

const VOTING_GUIDE = [
  {
    type: "Off-Chain (Telegram)",
    badge: "secondary" as const,
    items: [
      "Free — no transaction fees",
      "1 badge = 1 vote",
      "Vote with /vote in @rad_gov",
      "Results visible here and in Telegram",
      "Used for: charter votes, community polls, temp checks",
    ],
  },
  {
    type: "On-Chain (Consultation v2)",
    badge: "outline" as const,
    items: [
      "Recorded on the Radix ledger permanently",
      "XRD-weighted — vote power = XRD held",
      "Vote on the Proposals page with your Radix Wallet",
      "Same CV2 system used by the Radix Foundation",
      "Used for: binding treasury decisions, formal governance",
    ],
  },
];

const BOUNTY_COMMANDS = [
  { cmd: "/bounty create <title> <reward_xrd>", desc: "Create a new bounty (admin only)" },
  { cmd: "/bounty list", desc: "List open bounties" },
  { cmd: "/bounty claim <id>", desc: "Claim a bounty — you're committing to do the work" },
  { cmd: "/bounty submit <id>", desc: "Submit completed work for review" },
  { cmd: "/bounty verify <id>", desc: "Verify delivery and release payment (admin)" },
  { cmd: "/bounty fund <amount>", desc: "Fund the escrow treasury (admin)" },
];

const BOT_COMMANDS = [
  { section: "Getting Started", cmds: [
    { cmd: "/start", desc: "Welcome message + setup guide" },
    { cmd: "/register <account_rdx1...>", desc: "Link your Radix wallet" },
    { cmd: "/badge", desc: "Check your badge status, tier, XP" },
    { cmd: "/wallet", desc: "Show wallet address + voting weight" },
    { cmd: "/help", desc: "Full command list" },
    { cmd: "/faq", desc: "Frequently asked questions" },
  ]},
  { section: "Proposals & Voting", cmds: [
    { cmd: "/proposals", desc: "List active proposals" },
    { cmd: "/vote <id>", desc: "Re-post a proposal with vote buttons" },
    { cmd: "/results <id>", desc: "Show final results of a proposal" },
    { cmd: "/propose <title>", desc: "Create a Yes/No/Amend proposal (+25 XP)" },
    { cmd: "/poll <question> | opt1 | opt2", desc: "Create a multi-choice poll (+25 XP)" },
    { cmd: "/temp <question>", desc: "Temperature check — 24h, non-binding (+10 XP)" },
  ]},
  { section: "Charter & Game", cmds: [
    { cmd: "/charter", desc: "View charter resolution progress (32 parameters)" },
    { cmd: "/game", desc: "Your dice stats + bonus XP" },
    { cmd: "/stats", desc: "Platform-wide statistics" },
    { cmd: "/history", desc: "Recent 10 proposals with outcomes" },
  ]},
];

const TIER_INFO = [
  { tier: "Member", xp: "0", weight: "1x", color: "var(--guild-tier-member)" },
  { tier: "Contributor", xp: "100", weight: "2x", color: "var(--guild-tier-contributor)" },
  { tier: "Builder", xp: "500", weight: "3x", color: "var(--guild-tier-builder)" },
  { tier: "Steward", xp: "2,000", weight: "5x", color: "var(--guild-tier-steward)" },
  { tier: "Elder", xp: "10,000", weight: "10x", color: "var(--guild-tier-elder)" },
];

const XP_ACTIONS = [
  { action: "Vote on proposal", xp: "+10" },
  { action: "Create proposal", xp: "+25" },
  { action: "Create poll", xp: "+25" },
  { action: "Temperature check", xp: "+10" },
  { action: "Dice roll bonus", xp: "+0 to +100" },
  { action: "Complete bounty", xp: "Variable" },
];

const FAQ = [
  { q: "Is it free?", a: "Yes. Badge minting is free. Off-chain voting is free. No XRD required to participate. On-chain CV2 votes cost a small transaction fee (~0.1 XRD)." },
  { q: "What is my badge?", a: "An on-chain NFT on the Radix ledger. It stores your username, tier, XP, and governance data. It's your identity in the guild — non-transferable, permanently yours." },
  { q: "How do I earn XP?", a: "Vote (+10 XP), propose (+25 XP), create polls (+25 XP), complete bounties (variable). Every action also triggers a dice roll for bonus XP (up to +100 for a jackpot)." },
  { q: "What are the charter votes?", a: "32 governance decisions that build the DAO from the ground up. Phase 1 (Foundation) sets the rules. Phase 2 (Configuration) sets the details. Phase 3 (Operations) starts the DAO. Each phase unlocks when the previous completes." },
  { q: "What is Consultation v2?", a: "The Radix Foundation's on-chain governance system. We use the same CV2 smart contract for formal, binding votes. Your votes are recorded permanently on the Radix ledger and weighted by XRD holdings." },
  { q: "Who runs this?", a: "Big Dev built and maintains it. The code is open source (MIT). Admin controls transfer to the elected RAC (Radix Advisory Council) when Charter Step 3 completes. See /transparency for full costs." },
  { q: "How do bounties work?", a: "Anyone with a badge can create a task with an XRD reward. Workers claim it (/bounty claim), submit work (/bounty submit), a verifier checks the acceptance criteria, and XRD releases from escrow. Tasks have categories, difficulty levels, and deadlines." },
  { q: "What are the fees?", a: "2.5% platform fee on task creation. 50% goes to the guild treasury, 50% to operations (hosting, dev). Workers receive 100% of the net reward. Component royalties (0.1-0.5 XRD per on-chain call) go to the treasury. All percentages are charter-voteable." },
  { q: "How is the guild funded?", a: "Platform fees + on-chain component royalties + SaaS hosting fees. No donations, no token. Revenue from usage funds more development, which produces more royalty-earning code. See /transparency for full breakdown." },
];

const GUIDES = [
  { title: "What is Radix Governance?", desc: "Community-built tools for making decisions together.", image: "/infographics/01-what-is-radix-guild.svg" },
  { title: "How Governance Works", desc: "Two tiers: free Telegram votes + formal on-chain CV2 votes.", image: "/infographics/02-how-governance-works.svg" },
  { title: "Bounty Pipeline", desc: "Create, claim, submit, verify, pay — earn XRD for contributing.", image: "/infographics/03-bounty-pipeline.svg" },
  { title: "Badge and XP System", desc: "Free badge, earn XP, level up tiers, unlock higher voting weight.", image: "/infographics/04-badge-xp-system.svg" },
  { title: "Charter Decision Map", desc: "32 decisions across 3 phases. Each phase unlocks the next.", image: "/infographics/05-charter-decision-map.svg" },
  { title: "Architecture", desc: "TG bot + Next.js dashboard + Scrypto contracts + CV2 governance.", image: "/infographics/06-architecture-at-a-glance.svg" },
];

function DocsContent() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Getting Started</h1>
        <p className="text-muted-foreground text-sm mt-1">Everything you need to participate in Radix Guild governance.</p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Quick Start (5 minutes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {QUICK_START.map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">{s.step}</div>
                <div>
                  <div className="text-sm font-semibold">
                    {s.link ? (
                      <Link href={s.link} className="text-foreground hover:text-primary no-underline" target={s.external ? "_blank" : undefined}>{s.title}</Link>
                    ) : s.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How Voting Works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">How Voting Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VOTING_GUIDE.map(v => (
              <div key={v.type} className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={v.badge} className="text-[9px]">{v.type}</Badge>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {v.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-primary/5 rounded-lg">
            <div className="text-xs text-muted-foreground">
              <strong>Proposal types:</strong>{" "}
              <Badge variant="default" className="text-[8px] mx-0.5">Binding Decision</Badge> = charter vote (shapes the DAO),{" "}
              <Badge variant="secondary" className="text-[8px] mx-0.5">Community Vote</Badge> = formal but non-binding,{" "}
              <Badge variant="outline" className="text-[8px] mx-0.5">Gauging Interest</Badge> = 24h quick pulse check
            </div>
          </div>
        </CardContent>
      </Card>

      {/* XP & Tiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">XP & Tier System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {TIER_INFO.map(t => (
              <div key={t.tier} className="text-center">
                <div className="text-xs font-semibold" style={{ borderBottom: `2px solid ${t.color}`, paddingBottom: 2 }}>{t.tier}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{t.xp} XP</div>
                <div className="text-[10px] font-mono text-primary">{t.weight}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Higher tiers earn more voting weight in tier-weighted votes.</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {XP_ACTIONS.map(a => (
              <div key={a.action} className="flex items-center justify-between bg-muted rounded px-2 py-1.5">
                <span className="text-[11px]">{a.action}</span>
                <span className="text-[11px] font-mono text-primary">{a.xp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bounty Commands */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Bounty Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {BOUNTY_COMMANDS.map(c => (
              <div key={c.cmd} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{c.cmd}</code>
                <span className="text-[11px] text-muted-foreground">{c.desc}</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-3">
            Pipeline: Create &rarr; Claim &rarr; Submit &rarr; Verify &rarr; Pay. Escrow holds XRD until delivery is verified.
          </div>
        </CardContent>
      </Card>

      {/* Bot Commands */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">All Bot Commands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {BOT_COMMANDS.map(section => (
            <div key={section.section}>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">{section.section}</div>
              <div className="space-y-1">
                {section.cmds.map(c => (
                  <div key={c.cmd} className="flex items-start gap-2 py-1 border-b last:border-0">
                    <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{c.cmd}</code>
                    <span className="text-[11px] text-muted-foreground">{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">FAQ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {FAQ.map(f => (
              <div key={f.q}>
                <div className="text-sm font-semibold mb-0.5">{f.q}</div>
                <div className="text-xs text-muted-foreground">{f.a}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Infographics */}
      <div>
        <h2 className="text-lg font-bold mb-4">Visual Guides</h2>
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

      {/* Resources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: "Telegram Bot", url: TG_BOT_URL },
              { label: "Dashboard", url: "https://radixguild.com" },
              { label: "GitHub (open source)", url: "https://github.com/bigdevxrd/radix-community-projects" },
              { label: "DAO Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter" },
              { label: "Transparency (costs & revenue)", url: "/transparency" },
              { label: "API Reference", url: "https://github.com/bigdevxrd/radix-community-projects/blob/main/docs/API-REFERENCE.md" },
              { label: "System Health", url: "https://radixguild.com/api/health" },
            ].map(r => (
              <a key={r.label} href={r.url} target={r.url.startsWith("/") ? undefined : "_blank"} className="flex items-center justify-between py-1.5 border-b last:border-0 text-foreground no-underline hover:text-primary">
                <span>{r.label}</span>
                <span className="text-xs text-muted-foreground">&gt;</span>
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
