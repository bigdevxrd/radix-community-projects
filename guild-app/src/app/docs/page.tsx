"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { UserJourneyWidget } from "@/components/UserJourneyWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TG_BOT_URL, MANAGER, BADGE_NFT, ESCROW_COMPONENT, ESCROW_V3_COMPONENT, CV2_COMPONENT, CV3_COMPONENT } from "@/lib/constants";
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
    type: "Off-Chain (Telegram + Dashboard)",
    badge: "secondary" as const,
    items: [
      "Free — no transaction fees",
      "1 badge = 1 vote",
      "Vote with /vote in @rad_gov or from the dashboard",
      "Create proposals from Telegram or the dashboard",
      "Used for: charter votes, community polls, temp checks",
    ],
  },
  {
    type: "On-Chain (CV2 + Conviction Voting)",
    badge: "outline" as const,
    items: [
      "Recorded on the Radix ledger permanently",
      "CV2: XRD-weighted temperature checks + proposals",
      "CV3: Conviction voting — stake XRD, conviction grows over time",
      "Badge tier multipliers: Member 1x, Contributor 1.5x, Builder+ 2x",
      "Used for: binding decisions, treasury, fund allocation",
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
    { cmd: "/wg report <group>", desc: "File a structured monthly report (delivered/next/blocked/spent)" },
    { cmd: "/wg assign <task_id> <group>", desc: "Link a task to a working group" },
    { cmd: "/wg budget <group>", desc: "Show group budget status" },
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
  { q: "How do bounties work?", a: "Anyone with a badge can create a task — either from the dashboard or with /bounty create in Telegram. Workers claim, submit, verify, and get paid from on-chain escrow. Escrow V3 supports XRD, xUSDC, and xUSDT." },
  { q: "What are the fees?", a: "2.5% platform fee on escrow release (not deposit — cancel = full refund). Workers receive 100% of the net reward. Component royalties (0.1-0.5 XRD per on-chain call) go to the guild. All percentages are charter-voteable." },
  { q: "What is conviction voting?", a: "CV3 — a time-weighted governance system for fund allocation. Stake XRD on proposals you believe in. Conviction grows over time (3-day half-life). When conviction exceeds the threshold, the proposal auto-executes and funds are released. Badge tier multipliers: Member 1x, Contributor 1.5x, Builder+ 2x." },
  { q: "How is the guild funded?", a: "Platform fees + on-chain component royalties + SaaS hosting fees. No donations, no token. Revenue from usage funds more development, which produces more royalty-earning code. See Costs & Transparency section below." },
  { q: "What are working groups?", a: "Teams that organize the guild's work: Guild, DAO, Radix Infra, Business Development, Marketing. Join one with /group join <name> in Telegram. Groups have leads, members, and linked tasks." },
  { q: "How does task funding work?", a: "XRD is deposited into an on-chain escrow vault (Scrypto smart contract on Radix mainnet). No admin wallet holds funds. The contract releases XRD to the worker when delivery is verified. Fund a task by sending XRD to the escrow component via your Radix Wallet, then verify with /bounty fund <id> <tx_hash> in Telegram." },
  { q: "Where do I do things — dashboard or Telegram?", a: "Both! Dashboard now supports creating proposals, creating bounties, voting, funding tasks, joining groups, and viewing your full profile with trust score. Telegram is still great for quick governance actions. See the Dashboard vs Telegram guide above." },
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
  { title: "Architecture", desc: "TG bot + Next.js dashboard + Scrypto contracts + CV2 + CV3 conviction voting.", image: "/infographics/06-architecture-at-a-glance.svg" },
  { title: "Working Groups", desc: "Join a group, claim tasks, get paid, file reports. Badge-gated coordination.", image: "/infographics/08-working-groups.svg" },
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

      {/* Visual Guides Slideshow */}
      <GuideSlideshow />

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

      {/* Conviction Voting (CV3) */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Conviction Voting (CV3)</CardTitle>
            <Badge variant="outline" className="text-[9px] text-yellow-500 border-yellow-500">BETA</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-primary/5 rounded-lg p-3">
            <p className="text-sm font-semibold mb-1">What is it?</p>
            <p className="text-xs text-muted-foreground">
              Time-weighted governance for fund allocation. Instead of a one-time vote, you <strong>stake XRD</strong> on proposals you believe in.
              Your conviction grows over time. When it crosses the threshold, funds release automatically from a shared pool. No admin step needed.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">How it works — step by step</p>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { step: "1", label: "Stake", desc: "Lock XRD on a proposal" },
                { step: "2", label: "Wait", desc: "Conviction grows each hour" },
                { step: "3", label: "Threshold", desc: "Conviction reaches target" },
                { step: "4", label: "Execute", desc: "Funds auto-release" },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground text-xs mx-0.5">&rarr;</span>}
                  <div className="bg-muted rounded px-2 py-1.5 text-center">
                    <div className="text-[11px] font-semibold">{s.label}</div>
                    <div className="text-[9px] text-muted-foreground">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Why conviction voting?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { problem: "Snapshot voting is gameable", solution: "Conviction requires sustained commitment — can't dump votes last-minute" },
                { problem: "Whales dominate", solution: "Badge tier multipliers reward earned trust, not just wealth" },
                { problem: "Admin bottleneck on payouts", solution: "Auto-execution when threshold met — no human in the loop" },
                { problem: "No signal about intensity", solution: "Staking shows HOW MUCH you care, not just which side you're on" },
              ].map(r => (
                <div key={r.problem} className="bg-muted rounded-lg p-2.5">
                  <div className="text-[10px] text-red-400 line-through mb-0.5">{r.problem}</div>
                  <div className="text-[11px] text-muted-foreground">{r.solution}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold">Beta Parameters</p>
              <Badge variant="outline" className="text-[9px] text-yellow-500 border-yellow-500">Subject to charter vote</Badge>
            </div>
            <div className="space-y-2">
              {[
                {
                  param: "Decay factor (alpha)",
                  value: "0.9904",
                  reasoning: "Gives a 3-day half-life. If everyone unstakes, conviction halves every 72 hours. Fast enough to respond to changing sentiment, slow enough to reward patience. Based on Commons Stack / 1Hive research — most conviction systems use 2-7 day half-lives.",
                },
                {
                  param: "Threshold multiplier",
                  value: "10x requested amount",
                  reasoning: "A proposal requesting 1,000 XRD needs conviction score of 10,000 to auto-execute. This means a single person staking 1,000 XRD would need ~4 days of sustained staking to pass. A group of 10 staking 1,000 each would pass in hours. Prevents lone-wolf proposals while rewarding community support.",
                },
                {
                  param: "Time step",
                  value: "1 hour",
                  reasoning: "Conviction updates hourly (anyone can trigger). Short enough for responsive governance, long enough to prevent gas-wasting spam. Each update applies: new_conviction = 0.9904 * old_conviction + weighted_stake.",
                },
                {
                  param: "Tier multipliers",
                  value: "Member 1x, Contributor 1.5x, Builder+ 2x",
                  reasoning: "Earned trust amplifies your voice. A Builder staking 100 XRD has the conviction weight of a Member staking 200 XRD. Tiers come from XP (voting, proposing, completing tasks) — not wealth. Prevents pure plutocracy.",
                },
                {
                  param: "Funding pool",
                  value: "Shared XRD vault",
                  reasoning: "All proposals compete for the same pool. The community can only fund what the pool holds. This creates natural prioritization — high-conviction proposals drain the pool first. Admin funds the pool; later this can be fed by platform fees.",
                },
              ].map(p => (
                <div key={p.param} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{p.param}</span>
                    <code className="text-[11px] font-mono text-primary bg-background px-1.5 py-0.5 rounded">{p.value}</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{p.reasoning}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-semibold mb-1">The math</p>
            <div className="font-mono text-xs text-primary mb-2">y(t+1) = 0.9904 * y(t) + S(t)</div>
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p><strong>y(t)</strong> = current conviction score for a proposal</p>
              <p><strong>S(t)</strong> = total weighted stake (sum of all stakers, adjusted by badge tier)</p>
              <p><strong>0.9904</strong> = decay factor (conviction fades if stake is removed)</p>
              <p><strong>Steady state:</strong> With constant stake S, conviction approaches S / (1 - 0.9904) = S * 104.2</p>
              <p><strong>Half-life:</strong> 72 hours (3 days) — if all stake removed, conviction halves every 3 days</p>
              <p><strong>Threshold:</strong> When y(t) exceeds requested_amount * 10, proposal auto-executes</p>
            </div>
          </div>

          <div className="bg-yellow-500/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-yellow-500 mb-1">Beta Notice</p>
            <p className="text-[11px] text-muted-foreground">
              These parameters are starting values based on research from Commons Stack, 1Hive Gardens, and Gitcoin.
              All values are tuneable by the contract owner and will be subject to community charter vote.
              The contract is deployed on Radix mainnet but integration with the dashboard and bot is in progress.
            </p>
          </div>

          <div className="text-[11px] text-muted-foreground space-y-1">
            <p><strong>Prior art:</strong> 1Hive Gardens (Ethereum), Commons Stack Conviction Voting, Gitcoin Allo Protocol, Token Engineering Commons</p>
            <p><strong>On-chain:</strong> <a href={`https://dashboard.radixdlt.com/component/${CV3_COMPONENT}`} target="_blank" className="font-mono text-primary hover:underline">{CV3_COMPONENT.slice(0, 25)}...</a></p>
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
          <p className="text-xs text-muted-foreground mt-1"><strong>Escrow V3:</strong> Now supports multi-token deposits — XRD, xUSDC, and xUSDT. Per-token minimum deposits and fee vaults. V2 stays active for existing tasks.</p>
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
              { action: "Create proposals", where: "Both", how: "Dashboard form or /propose in TG" },
              { action: "Create bounties", where: "Both", how: "Dashboard form or /bounty create in TG" },
              { action: "Claim/submit tasks", where: "Both", how: "Dashboard buttons or /bounty claim in TG" },
              { action: "View profile & trust", where: "Dashboard", how: "/profile → tabbed view with trust breakdown" },
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
            Most actions now work from both dashboard and Telegram. Dashboard is best for wallet-connected actions (minting, on-chain votes, funding, profile). Telegram is great for quick governance (voting, task management, groups).
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
            {[
              { label: "Badge Manager", addr: MANAGER, type: "component" },
              { label: "Badge NFT", addr: BADGE_NFT, type: "resource" },
              { label: "TaskEscrow V2", addr: ESCROW_COMPONENT, type: "component" },
              { label: "Escrow V3 (Multi-Token)", addr: ESCROW_V3_COMPONENT, type: "component" },
              { label: "CV2 Governance", addr: CV2_COMPONENT, type: "component" },
              { label: "ConvictionVoting (CV3)", addr: CV3_COMPONENT, type: "component" },
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between py-1.5 ${i < 5 ? "border-b" : ""}`}>
                <span className="text-muted-foreground">{item.label}</span>
                <a href={`https://dashboard.radixdlt.com/${item.type}/${item.addr}`} target="_blank" className="font-mono text-xs text-primary hover:underline">{item.addr.slice(0, 20)}...</a>
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5 border-t">
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
