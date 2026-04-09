"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { UserJourneyWidget } from "@/components/UserJourneyWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TG_BOT_URL, MANAGER, BADGE_NFT } from "@/lib/constants";
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
  { cmd: "/bounty", desc: "Guided menu with create, claim, view options" },
  { cmd: "/bounty create <xrd> <title>", desc: "Create a task (badge required). Add --approval pr_merged --repo owner/repo for auto-verify" },
  { cmd: "/bounty list", desc: "List open tasks" },
  { cmd: "/bounty claim <id>", desc: "Claim a funded task" },
  { cmd: "/bounty apply <id> [pitch]", desc: "Apply for tasks >100 XRD" },
  { cmd: "/bounty submit <id> <pr_url>", desc: "Submit work with GitHub PR link (validated)" },
  { cmd: "/bounty cancel <id>", desc: "Cancel your own open task" },
  { cmd: "/bounty categories", desc: "List 6 task categories" },
  { cmd: "/bounty fund <id> <tx_hash>", desc: "Verify on-chain escrow deposit (or use dashboard fund button)" },
  { cmd: "/bounty verify <id>", desc: "Verify delivery (admin)" },
  { cmd: "/bounty pay <id> <tx_hash>", desc: "Release escrow payment (admin)" },
  { cmd: "/bounty approve <app_id>", desc: "Approve an applicant (creator)" },
];

const BOT_COMMANDS = [
  { section: "Getting Started", cmds: [
    { cmd: "/start", desc: "Welcome message + setup guide" },
    { cmd: "/register <account_rdx1...>", desc: "Link your Radix wallet" },
    { cmd: "/badge", desc: "Check your badge status, tier, XP" },
    { cmd: "/wallet", desc: "Show wallet address + badge info" },
    { cmd: "/trust", desc: "Your trust score + tier (Bronze/Silver/Gold)" },
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
  { section: "Working Groups", cmds: [
    { cmd: "/groups", desc: "List all working groups with member counts" },
    { cmd: "/group <name>", desc: "View group detail + members" },
    { cmd: "/group join <name>", desc: "Join a group (badge required)" },
    { cmd: "/group leave <name>", desc: "Leave a group (leads can't leave)" },
  ]},
  { section: "Charter & Game", cmds: [
    { cmd: "/charter", desc: "View charter resolution progress (32 parameters)" },
    { cmd: "/charter guide", desc: "Interactive guided voting through charter decisions" },
    { cmd: "/game", desc: "Your dice stats + bonus XP" },
    { cmd: "/stats", desc: "Platform-wide statistics" },
    { cmd: "/history", desc: "Recent 10 proposals with outcomes" },
  ]},
  { section: "Support & Admin", cmds: [
    { cmd: "/feedback <message>", desc: "Submit a support ticket" },
    { cmd: "/mystatus", desc: "Check your open tickets" },
    { cmd: "/support", desc: "Help links + contact info" },
    { cmd: "/adminfeedback", desc: "List open tickets (admin)" },
    { cmd: "/adminfeedback respond <id> <msg>", desc: "Respond to ticket (admin)" },
    { cmd: "/adminfeedback resolve <id>", desc: "Close ticket (admin)" },
  ]},
];

const TIER_INFO = [
  { tier: "Member", xp: "0", level: "Lv.1", color: "var(--guild-tier-member)" },
  { tier: "Contributor", xp: "100", level: "Lv.2", color: "var(--guild-tier-contributor)" },
  { tier: "Builder", xp: "500", level: "Lv.3", color: "var(--guild-tier-builder)" },
  { tier: "Steward", xp: "2,000", level: "Lv.4", color: "var(--guild-tier-steward)" },
  { tier: "Elder", xp: "10,000", level: "Lv.5", color: "var(--guild-tier-elder)" },
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
  { q: "Who runs this?", a: "bigdev built and maintains it. The code is open source (MIT). Admin controls transfer to the elected RAC (Radix Advisory Council) when Charter Step 3 completes. See Costs & Transparency section below." },
  { q: "How do bounties work?", a: "Anyone with a badge can create a task with an XRD reward. Workers claim it (/bounty claim), submit work (/bounty submit), a verifier checks the acceptance criteria, and XRD releases from escrow. Tasks have categories, difficulty levels, and deadlines." },
  { q: "What are the fees?", a: "2.5% platform fee on escrow release (not deposit — cancel = full refund). Workers receive 100% of the net reward. Component royalties (0.1-0.5 XRD per on-chain call) go to the guild. All percentages are charter-voteable." },
  { q: "How is the guild funded?", a: "Platform fees + on-chain component royalties + SaaS hosting fees. No donations, no token. Revenue from usage funds more development, which produces more royalty-earning code. See Costs & Transparency section below." },
  { q: "What are working groups?", a: "Teams that organize the guild's work: Guild, DAO, Radix Infra, Business Development, Marketing. Join one with /group join <name> in Telegram. Groups have leads, members, and linked tasks." },
  { q: "How does task funding work?", a: "XRD is deposited into an on-chain escrow vault (Scrypto smart contract on Radix mainnet). No admin wallet holds funds. The contract releases XRD to the worker when delivery is verified. Fund a task by sending XRD to the escrow component via your Radix Wallet, then verify with /bounty fund <id> <tx_hash> in Telegram." },
  { q: "Where do I do things — dashboard or Telegram?", a: "Dashboard for reading, browsing, minting, on-chain votes, and the game. Telegram for governance actions: creating proposals, voting, managing tasks, joining groups. See the Dashboard vs Telegram guide above." },
  { q: "What is the trust score?", a: "A score calculated from your on-chain activity: account age, votes cast, proposals created, tasks completed, groups joined. Tiers: Bronze (0+), Silver (50+), Gold (200+). Higher trust unlocks more capabilities. All voluntary — badge is the minimum to participate. Check yours with /trust in Telegram." },
  { q: "How does auto-verification work?", a: "When creating a task, add --approval pr_merged --repo owner/repo. Workers submit a GitHub PR link. The bot checks every 5 minutes — when the PR is merged, the task is auto-verified. No manual admin step needed for code tasks. The escrow release is then queued for the verifier." },
  { q: "Can I fund tasks from the dashboard?", a: "Yes. On any unfunded task page, click the 'Fund' button. Your Radix Wallet opens with the TX manifest pre-built. One click to deposit XRD into the on-chain escrow vault. The gateway watcher auto-detects your deposit within 60 seconds." },
];

const GUIDES = [
  { title: "What is Radix Governance?", desc: "Community-built tools for making decisions together.", image: "/infographics/01-what-is-radix-guild.svg" },
  { title: "How Governance Works", desc: "Two tiers: free Telegram votes + formal on-chain CV2 votes.", image: "/infographics/02-how-governance-works.svg" },
  { title: "Bounty Pipeline", desc: "Create, claim, submit, verify, pay — earn XRD for contributing.", image: "/infographics/03-bounty-pipeline.svg" },
  { title: "Badge and XP System", desc: "Free badge, earn XP, level up tiers. Voting weights decided by charter vote.", image: "/infographics/04-badge-xp-system.svg" },
  { title: "Charter Decision Map", desc: "32 decisions across 3 phases. Each phase unlocks the next.", image: "/infographics/05-charter-decision-map.svg" },
  { title: "Architecture", desc: "TG bot + Next.js dashboard + Scrypto contracts + CV2 governance.", image: "/infographics/06-architecture-at-a-glance.svg" },
];

function GuideSlideshow() {
  const [current, setCurrent] = useState(0);
  const guide = GUIDES[current];
  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(GUIDES.length - 1, i + 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Visual Guides</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono">{current + 1}/{GUIDES.length}</Badge>
            <button onClick={prev} disabled={current === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30" aria-label="Previous">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={next} disabled={current === GUIDES.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30" aria-label="Next">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="text-sm font-bold">{guide.title}</h3>
          <p className="text-xs text-muted-foreground">{guide.desc}</p>
        </div>
        <div className="bg-muted rounded-lg p-2 flex items-center justify-center min-h-[400px]">
          <img src={guide.image} alt={guide.title} className="max-w-full h-auto max-h-[500px] rounded" />
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1.5">
          {GUIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
              aria-label={`Guide ${i + 1}`}
            />
          ))}
        </div>
        <div className="hidden sm:flex justify-center">
          <span className="text-[9px] text-muted-foreground/50">← → arrow keys to navigate</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DocsContent() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Getting Started</h1>
        <p className="text-muted-foreground text-sm mt-1">Everything you need to participate in Radix Guild governance.</p>
      </div>

      {/* Interactive Journey Overview */}
      <UserJourneyWidget />

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
                <div className="text-[10px] font-mono text-primary">{t.level}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Tiers reflect game progression. Voting weights are decided by charter vote (TBD).</div>
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

      {/* Working Groups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Working Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Working groups organize WHO does WHAT. Each group has a lead, members, and linked tasks/proposals.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: "Guild", icon: "🛡️", desc: "Overall governance + coordination" },
              { name: "DAO", icon: "🗳️", desc: "Charter votes + governance design" },
              { name: "Radix Infrastructure", icon: "🖥️", desc: "VPS, tooling, monitoring" },
              { name: "Business Development", icon: "💼", desc: "Revenue, partnerships, SaaS" },
              { name: "Marketing", icon: "📢", desc: "Content, outreach, social" },
            ].map(g => (
              <div key={g.name} className="flex items-center gap-2 bg-muted rounded px-3 py-2">
                <span>{g.icon}</span>
                <div>
                  <div className="text-xs font-semibold">{g.name}</div>
                  <div className="text-[10px] text-muted-foreground">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Join: <code className="bg-muted px-1 rounded">/group join Guild</code> in Telegram. Browse: <a href="/groups" className="text-primary hover:underline">/groups</a>
          </div>
        </CardContent>
      </Card>

      {/* How Escrow & Funding Works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">How Task Funding Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-3">
              <div className="font-semibold text-xs mb-1">For Task Creators</div>
              <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal pl-3">
                <li>Create task: <code className="bg-background px-1 rounded">/bounty create 50 Title</code></li>
                <li>Deposit XRD into the on-chain escrow via Radix Wallet</li>
                <li>Verify: <code className="bg-background px-1 rounded">/bounty fund &lt;id&gt; &lt;tx_hash&gt;</code></li>
                <li>XRD locked in Scrypto vault — no admin custody</li>
              </ol>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="font-semibold text-xs mb-1">For Workers</div>
              <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal pl-3">
                <li>Browse funded tasks at <a href="/bounties" className="text-primary hover:underline">/bounties</a></li>
                <li>Claim: <code className="bg-background px-1 rounded">/bounty claim &lt;id&gt;</code></li>
                <li>Submit work, verifier confirms delivery</li>
                <li>Escrow releases XRD to your wallet (2.5% fee to guild)</li>
              </ol>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Tasks &gt;100 XRD require applications (<code className="bg-muted px-1 rounded">/bounty apply</code>) instead of instant claims.</p>
        </CardContent>
      </Card>

      {/* Where to Do What */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Dashboard vs Telegram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[
              { action: "Mint badge", where: "Dashboard", how: "/mint page with wallet" },
              { action: "Vote on proposals", where: "Telegram", how: "/vote or tap inline buttons" },
              { action: "Create on-chain vote", where: "Dashboard", how: "Proposals page → Create Temperature Check" },
              { action: "Create/claim/submit tasks", where: "Telegram", how: "/bounty commands" },
              { action: "Browse tasks & proposals", where: "Both", how: "Dashboard to read, bot to act" },
              { action: "Join working groups", where: "Both", how: "Dashboard button or /group join <name>" },
              { action: "Submit feedback", where: "Both", how: "Dashboard form or /feedback in TG" },
              { action: "Play grid game", where: "Dashboard", how: "/game page" },
              { action: "Fund a task", where: "Both", how: "Dashboard fund button or /bounty fund <id> <tx_hash>" },
              { action: "Admin: manage tickets", where: "Telegram", how: "/adminfeedback" },
            ].map(r => (
              <div key={r.action} className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs">
                <span className="font-medium">{r.action}</span>
                <div className="text-right shrink-0 ml-2">
                  <Badge variant={r.where === "Both" ? "default" : r.where === "Dashboard" ? "secondary" : "outline"} className="text-[8px]">{r.where}</Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            The dashboard is for reading, browsing, and wallet-connected actions (minting, on-chain votes, game). The Telegram bot is for governance actions (proposals, voting, task management, groups).
          </p>
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

      {/* Visual Guides Slideshow */}
      <GuideSlideshow />

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
              { label: "Costs & Transparency", url: "#transparency" },
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
      {/* Costs & Transparency */}
      <div id="transparency">
        <h2 className="text-lg font-bold mb-4">Costs & Transparency</h2>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Actual Costs (Verified)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { item: "Domain (radixguild.com, 3yr)", cost: "$40", note: "Hostinger, paid Apr 2026" },
                { item: "AI/Dev tools (Claude Code)", cost: "~$600", note: "Development to date" },
                { item: "VPS hosting", cost: "$7/mo", note: "Hostinger VPS, ongoing" },
                { item: "TLS, database, Gateway API", cost: "Free", note: "Caddy, SQLite, Radix public endpoint" },
              ].map(c => (
                <div key={c.item} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium">{c.item}</div>
                    <div className="text-[11px] text-muted-foreground">{c.note}</div>
                  </div>
                  <span className="text-sm font-mono text-primary">{c.cost}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-semibold">
                <span className="text-sm">Total invested</span>
                <span className="text-sm font-mono text-primary">~$680</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Revenue to date</span>
                <span className="text-sm font-mono text-muted-foreground">$0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Revenue Model (Planned)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Task marketplace fee:</strong> 2.5% on funded tasks. Charged on release (not deposit — cancel = full refund). Escrow is live on mainnet.</p>
            <p><strong>Component royalties:</strong> Badge Manager calls earn 0.1-1 XRD on-chain. Accruing but unclaimed.</p>
            <p><strong>SaaS hosting:</strong> Other communities deploy their own instance. Planned for June+.</p>
            <p className="text-xs text-muted-foreground mt-2">All fee percentages are charter-voteable. The community controls the economics.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">The Deal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Who pays?</strong> bigdev self-funds until the DAO treasury is formed (Charter Step 3).</p>
            <p><strong>Who controls?</strong> bigdev holds the admin badge. It transfers to the elected RAC when Charter Step 3 completes.</p>
            <p><strong>What if bigdev disappears?</strong> Everything is open source (MIT). Fork the code, deploy your own. On-chain badges persist on the ledger.</p>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">On-Chain Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Badge Manager</span>
              <a href={`https://dashboard.radixdlt.com/component/${MANAGER}`} target="_blank" className="font-mono text-xs text-primary hover:underline">{MANAGER.slice(0, 20)}...</a>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Badge NFT</span>
              <a href={`https://dashboard.radixdlt.com/resource/${BADGE_NFT}`} target="_blank" className="font-mono text-xs text-primary hover:underline">{BADGE_NFT.slice(0, 20)}...</a>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Source Code</span>
              <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="font-mono text-xs text-primary hover:underline">MIT Licensed</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return <AppShell><DocsContent /></AppShell>;
}
