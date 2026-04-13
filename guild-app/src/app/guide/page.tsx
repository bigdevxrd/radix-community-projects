"use client";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TG_BOT_URL } from "@/lib/constants";

function GuideContent() {
  return (
    <div className="space-y-16 py-4">
      {/* Hero */}
      <header className="text-center space-y-4">
        <Badge variant="outline" className="text-xs tracking-widest text-primary border-primary/30 bg-primary/5">
          GETTING STARTED
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2dd4bf] via-[#a78bfa] to-[#f59e0b]">
            Radix Guild
          </span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Your visual roadmap to joining, governing, and earning within the Radix community governance platform.
        </p>
      </header>

      {/* Step 1: Identity */}
      <section className="relative">
        <div className="absolute -left-2 top-0 text-[120px] font-black text-primary/5 select-none leading-none hidden sm:block">01</div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur p-6 sm:p-10 shadow-[0_0_30px_rgba(45,212,191,0.08)]">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#2dd4bf] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_15px_rgba(45,212,191,0.4)]">ID</span>
                Identity & Onboarding
              </h2>
              {[
                { step: "01", title: "Connect Radix Wallet", desc: "Download the official Radix Wallet and connect with one click. Your wallet is your identity.", link: null },
                { step: "02", title: "Mint a Free Badge", desc: "Choose a username and mint your Guild Badge — a free on-chain NFT that tracks your tier, XP, and governance history.", link: "/mint" },
                { step: "03", title: "Register in Telegram", desc: "Open @rad_gov and type /register with your wallet address. This links your on-chain badge to governance notifications.", link: TG_BOT_URL },
              ].map((s, i) => (
                <div key={s.step} className={`flex gap-4 ${i > 0 ? "border-l-2 border-[#2dd4bf]/20 ml-2 pl-5" : ""}`}>
                  <div className="text-[#2dd4bf] font-mono font-bold pt-0.5 shrink-0">{s.step}</div>
                  <div>
                    <h4 className="font-bold text-sm">{s.title}</h4>
                    <p className="text-muted-foreground text-xs mt-0.5">{s.desc}</p>
                    {s.link && (
                      <Link href={s.link} className="text-xs text-primary hover:underline mt-1 inline-block" target={s.link.startsWith("http") ? "_blank" : undefined}>
                        {s.link.startsWith("http") ? "Open Bot" : "Go to " + s.title} &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full md:w-64 h-64 bg-gradient-to-br from-[#2dd4bf]/10 to-transparent rounded-2xl border border-[#2dd4bf]/20 flex items-center justify-center">
              <div className="w-36 h-48 rounded-xl border border-[#2dd4bf]/30 bg-card/50 backdrop-blur flex flex-col items-center justify-center p-4 hover:scale-105 transition-transform">
                <div className="w-10 h-10 rounded-full bg-[#2dd4bf]/20 mb-3 animate-pulse" />
                <div className="w-full h-1.5 bg-[#2dd4bf]/20 rounded mb-1.5" />
                <div className="w-2/3 h-1.5 bg-[#2dd4bf]/10 rounded" />
                <div className="mt-6 text-[9px] text-[#2dd4bf] font-mono tracking-wider">GUILD BADGE NFT</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Governance */}
      <section className="relative">
        <div className="absolute -right-2 top-0 text-[120px] font-black text-[#a78bfa]/5 select-none leading-none text-right w-full hidden sm:block">02</div>
        <div className="rounded-2xl border border-[#a78bfa]/20 bg-[#a78bfa]/5 backdrop-blur p-6 sm:p-10 shadow-[0_0_30px_rgba(167,139,250,0.08)]">
          <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
            <div className="flex-1 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#a78bfa] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_15px_rgba(167,139,250,0.4)]">GOV</span>
                Governance & Decisions
              </h2>
              {[
                { title: "47 Decisions Mapped", desc: "Charter params, structural decisions, and P3 service transitions — all running as non-binding temp checks. Vote on what matters.", color: "text-[#a78bfa]" },
                { title: "Two-Tier Voting", desc: "Free off-chain votes in Telegram + formal on-chain votes via CV2. Your badge tier amplifies your voice.", color: "text-[#a78bfa]" },
                { title: "Conviction Voting (CV3)", desc: "Stake XRD on proposals. Conviction grows over time — when threshold is met, funds auto-release. No admin needed.", color: "text-[#a78bfa]" },
              ].map(item => (
                <div key={item.title} className="p-3.5 bg-[#a78bfa]/5 rounded-xl border border-[#a78bfa]/10 hover:bg-[#a78bfa]/10 transition-colors">
                  <h4 className={`font-bold text-sm ${item.color} mb-0.5`}>{item.title}</h4>
                  <p className="text-muted-foreground text-xs">{item.desc}</p>
                </div>
              ))}
              <Link href="/proposals?view=decisions">
                <Button size="sm" className="mt-2">View Decisions &rarr;</Button>
              </Link>
            </div>
            <div className="w-full md:w-72 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {["Yes!", "Maybe", "No"].map(opt => (
                  <div key={opt} className="h-16 bg-[#a78bfa]/10 rounded-lg border border-[#a78bfa]/20 flex items-center justify-center text-xs font-bold text-[#a78bfa]">
                    {opt}
                  </div>
                ))}
              </div>
              <div className="h-14 bg-card/50 rounded-lg border border-border p-3">
                <div className="w-full h-full bg-[#a78bfa]/10 rounded relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 bg-[#a78bfa]/60 w-[65%] rounded" />
                </div>
                <div className="flex justify-between text-[8px] text-muted-foreground font-mono mt-1">
                  <span>CONVICTION: 65%</span>
                  <span>5 DAYS LEFT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3: Bounties */}
      <section className="relative">
        <div className="absolute -left-2 top-0 text-[120px] font-black text-[#f59e0b]/5 select-none leading-none hidden sm:block">03</div>
        <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 backdrop-blur p-6 sm:p-10 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f59e0b] to-[#f97316]">
              The Task Pipeline
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Earn XRD and XP by completing tasks for the community.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { step: "1", label: "CLAIM", desc: "Browse open tasks and claim one that fits your skills.", color: "text-[#f59e0b]" },
              { step: "2", label: "WORK", desc: "Complete the deliverable. Submit a GitHub PR or proof of work.", color: "text-[#f59e0b]" },
              { step: "3", label: "VERIFY", desc: "Reviewer confirms delivery. Auto-verify via PR merge detection.", color: "text-[#f59e0b]" },
              { step: "4", label: "PAYOUT", desc: "XRD released from on-chain escrow. +XP to level up your badge.", color: "text-primary", highlight: true },
            ].map(s => (
              <div key={s.step} className={`p-4 rounded-xl border text-center ${s.highlight ? "bg-[#f59e0b]/10 border-[#f59e0b]/30" : "bg-card/50 border-border"}`}>
                <div className={`w-10 h-10 rounded-full ${s.highlight ? "bg-[#f59e0b]/30" : "bg-[#f59e0b]/10"} flex items-center justify-center mx-auto mb-3 ${s.color} text-sm font-bold`}>
                  {s.step}
                </div>
                <h4 className={`font-bold text-xs mb-1 ${s.highlight ? "text-[#f59e0b]" : ""}`}>{s.label}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/bounties"><Button size="sm" variant="outline">Browse Tasks &rarr;</Button></Link>
          </div>
        </div>
      </section>

      {/* Step 4: XP & Tiers */}
      <section className="relative">
        <div className="absolute -right-2 top-0 text-[120px] font-black text-[#f472b6]/5 select-none leading-none text-right w-full hidden sm:block">04</div>
        <div className="rounded-2xl border border-[#f472b6]/20 bg-[#f472b6]/5 backdrop-blur p-6 sm:p-10 shadow-[0_0_30px_rgba(244,114,182,0.08)]">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#f472b6] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_15px_rgba(244,114,182,0.4)]">XP</span>
            Level Up Your Badge
          </h2>
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
            {[
              { tier: "Member", xp: "0", color: "#2dd4bf" },
              { tier: "Contributor", xp: "100", color: "#4ea8de" },
              { tier: "Builder", xp: "500", color: "#a78bfa" },
              { tier: "Steward", xp: "2,000", color: "#f59e0b" },
              { tier: "Elder", xp: "10,000", color: "#f472b6" },
            ].map(t => (
              <div key={t.tier} className="text-center p-2 sm:p-3 rounded-xl bg-card/50 border border-border">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mx-auto mb-1.5" style={{ backgroundColor: t.color + "30", border: `2px solid ${t.color}` }} />
                <div className="text-[10px] sm:text-xs font-bold">{t.tier}</div>
                <div className="text-[9px] text-muted-foreground font-mono">{t.xp} XP</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { action: "Vote on proposal", xp: "+10 XP" },
              { action: "Create proposal", xp: "+25 XP" },
              { action: "Complete task", xp: "Variable" },
              { action: "Dice roll bonus", xp: "0–100 XP" },
              { action: "Temperature check", xp: "+10 XP" },
              { action: "CV3 tier multiplier", xp: "1x–2x" },
            ].map(a => (
              <div key={a.action} className="flex items-center justify-between bg-card/50 rounded-lg px-3 py-2 border border-border">
                <span className="text-muted-foreground text-[11px]">{a.action}</span>
                <span className="font-mono text-[#f472b6] text-[11px] font-bold">{a.xp}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/profile"><Button size="sm" variant="outline">View Your Profile &rarr;</Button></Link>
          </div>
        </div>
      </section>

      {/* Step 5: Working Groups */}
      <section className="relative">
        <div className="absolute -left-2 top-0 text-[120px] font-black text-[#00e49f]/5 select-none leading-none hidden sm:block">05</div>
        <div className="rounded-2xl border border-[#00e49f]/20 bg-[#00e49f]/5 backdrop-blur p-6 sm:p-10 shadow-[0_0_30px_rgba(0,228,159,0.08)]">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#00e49f] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_15px_rgba(0,228,159,0.4)]">WG</span>
            Join a Working Group
          </h2>
          <p className="text-muted-foreground text-sm mb-6">Teams that organize the guild's work. Each has a lead, charter, budget, and biweekly reports.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: "Guild", icon: "🛡️", desc: "Coordination + governance" },
              { name: "DAO", icon: "🗳️", desc: "Charter + legal structure" },
              { name: "Infrastructure", icon: "🖥️", desc: "VPS, tooling, monitoring" },
              { name: "Biz Dev", icon: "💼", desc: "Revenue + partnerships" },
              { name: "Marketing", icon: "📢", desc: "Content + outreach" },
              { name: "Join one →", icon: "➕", desc: "/group join <name>" },
            ].map(g => (
              <div key={g.name} className="flex items-center gap-2.5 bg-card/50 rounded-xl px-3 py-3 border border-border hover:bg-[#00e49f]/5 transition-colors">
                <span className="text-lg">{g.icon}</span>
                <div>
                  <div className="text-xs font-bold">{g.name}</div>
                  <div className="text-[9px] text-muted-foreground">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/groups"><Button size="sm" variant="outline">Browse Groups &rarr;</Button></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-6 py-8">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to participate?</h2>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Mint a free badge, vote on decisions, claim tasks, earn XRD. Everything is open source and on-chain.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/mint"><Button size="lg">Mint Free Badge</Button></Link>
          <Link href="/proposals?view=decisions"><Button size="lg" variant="outline">Vote on Decisions</Button></Link>
          <Link href="/bounties"><Button size="lg" variant="outline">Browse Tasks</Button></Link>
        </div>
        <div className="flex justify-center gap-4 text-[11px] text-muted-foreground font-mono pt-4">
          <span>MIT Licensed</span>
          <span>|</span>
          <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="text-primary hover:underline">GitHub</a>
          <span>|</span>
          <span>On-Chain Verified</span>
        </div>
      </section>
    </div>
  );
}

export default function GuidePage() {
  return <AppShell><GuideContent /></AppShell>;
}
