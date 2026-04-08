"use client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MANAGER, BADGE_NFT, CV2_COMPONENT, TG_BOT_URL } from "@/lib/constants";

function AboutContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">About Radix Guild</h1>
        <p className="text-muted-foreground text-sm mt-1">Open source governance + task infrastructure for Radix.</p>
      </div>

      {/* Mission */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <p className="text-sm leading-relaxed">
            Radix Guild builds open source tools for community governance and task coordination on the Radix network.
            Free badges, free voting, paid tasks. Anyone can participate. Everything is transparent and on-chain.
          </p>
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
            <span>Founded: April 2026</span>
            <span>License: MIT</span>
            <span>Network: Radix Mainnet</span>
          </div>
        </CardContent>
      </Card>

      {/* What We Offer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">What the Guild Offers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-muted rounded-lg p-3">
              <div className="font-semibold text-sm mb-1">Governance</div>
              <div className="text-xs text-muted-foreground">Two-tier voting: free off-chain (Telegram) + formal on-chain (CV2). 32 charter parameters build the DAO from the ground up.</div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="font-semibold text-sm mb-1">Task Marketplace</div>
              <div className="text-xs text-muted-foreground">Post tasks, fund escrow, workers deliver, payment releases. Categories, deadlines, acceptance criteria. 2.5% platform fee.</div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="font-semibold text-sm mb-1">On-Chain Identity</div>
              <div className="text-xs text-muted-foreground">Free badge NFT (Scrypto v4). Earn XP by participating. 5 tiers with increasing voting weight. Non-transferable reputation.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The Operator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">The Operator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold text-primary shrink-0">BD</div>
            <div>
              <div className="font-bold text-base">Big Dev</div>
              <div className="text-xs text-muted-foreground">@bigdevxrd</div>
              <div className="text-sm text-muted-foreground mt-1">
                Full-stack Web3 developer. Built the entire Radix Guild platform — Scrypto smart contracts, Telegram bot (22+ commands), Next.js dashboard (12 pages), REST API (20+ endpoints), 70 automated tests. Open source contributor to the Radix ecosystem.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Commits", value: "120+" },
              { label: "Dashboard", value: "12 pages" },
              { label: "Tests", value: "70" },
              { label: "Bot Commands", value: "22+" },
            ].map(s => (
              <div key={s.label} className="bg-muted rounded px-3 py-2 text-center">
                <div className="text-lg font-bold font-mono text-primary">{s.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Role:</strong> Founder, operator, and caretaker. Holds the admin badge until the community elects a RAC (Charter Step 3).</p>
            <p><strong>Commitment:</strong> Self-funded (~$680 invested). All code is open source (MIT). Admin control transfers to the elected council when governance matures.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="https://github.com/bigdevxrd" target="_blank">
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">GitHub</Badge>
            </a>
            <a href={TG_BOT_URL} target="_blank">
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">Telegram Bot</Badge>
            </a>
            <a href="https://t.me/bigdevxrd" target="_blank">
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">DM @bigdevxrd</Badge>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Services */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Skills & Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {["Scrypto", "React", "Next.js", "TypeScript", "Node.js", "Radix dApp Toolkit", "Grammy (TG Bots)", "SQLite", "Caddy", "PM2", "Git", "shadcn/ui", "Tailwind CSS"].map(s => (
              <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            {[
              { service: "Quick task (bug fix, config, bot command)", price: "50-200 XRD", time: "1-3 days" },
              { service: "Feature development (dashboard page, API endpoint)", price: "$100-150/hr", time: "Scope-based" },
              { service: "Scrypto component (smart contract)", price: "$150/hr or fixed", time: "1-4 weeks" },
              { service: "Full governance deployment (fork + configure)", price: "500-1000 XRD", time: "1 week" },
              { service: "Monthly retainer (support + maintenance)", price: "$500-1500/mo", time: "Ongoing" },
            ].map(s => (
              <div key={s.service} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div className="text-xs">{s.service}</div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-xs font-mono text-primary">{s.price}</div>
                  <div className="text-[10px] text-muted-foreground">{s.time}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">All work tracked on the guild task board. On-chain proof of delivery. Contact @bigdevxrd to discuss.</p>
        </CardContent>
      </Card>

      {/* On-Chain Proof */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">On-Chain Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { label: "Badge Manager", addr: MANAGER, type: "component" },
            { label: "Badge NFT Resource", addr: BADGE_NFT, type: "resource" },
            { label: "CV2 Governance", addr: CV2_COMPONENT, type: "component" },
          ].map(a => (
            <div key={a.label} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <span className="text-muted-foreground text-xs">{a.label}</span>
              <a href={`https://dashboard.radixdlt.com/${a.type}/${a.addr}`} target="_blank" className="font-mono text-[11px] text-primary hover:underline">
                {a.addr.slice(0, 20)}...
              </a>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground text-xs">Source Code</span>
            <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="text-[11px] text-primary hover:underline">MIT Licensed — 100% public</a>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground text-xs">System Health</span>
            <a href="https://radixguild.com/api/health" target="_blank" className="text-[11px] text-primary hover:underline">Live status</a>
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <div id="terms">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Terms of Use</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>Radix Guild is experimental beta software provided as-is under the MIT license. Use at your own risk.</p>
            <p>The platform facilitates community governance and task coordination on the Radix network. It does not provide financial advice, investment services, or guarantees of any kind.</p>
            <p>Task escrow is currently off-chain (tracked in a database, not locked in a smart contract). On-chain atomic escrow is planned but not yet deployed. Fund only what you can verify.</p>
            <p>The admin badge and platform operations are managed by Big Dev until the community elects a Radix Advisory Council (Charter Step 3). This is an interim arrangement, not permanent centralisation.</p>
          </CardContent>
        </Card>
      </div>

      <div id="privacy">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>The guild stores: Telegram user IDs, Radix wallet addresses, vote records, task data, and feedback tickets. This data is stored in a SQLite database on a private VPS.</p>
            <p>On-chain data (badges, votes, transactions) is public by nature of the Radix ledger. The guild does not control or delete on-chain data.</p>
            <p>No personal information (name, email, phone) is collected or required. Your identity is your Radix wallet address and optional Telegram username.</p>
            <p>The guild does not use cookies, analytics trackers, or third-party data services.</p>
          </CardContent>
        </Card>
      </div>

      <div id="risk">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Risk Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>This is experimental software interacting with blockchain technology. Smart contract risk, network risk, and operational risk exist.</p>
            <p>Do not deposit more XRD than you can afford to lose. Escrow is not yet on-chain — it relies on admin honesty until the atomic escrow component is deployed.</p>
            <p>XRD value fluctuates. Task rewards denominated in XRD may change in fiat value between creation and payment.</p>
            <p>The guild is not a registered entity, financial institution, or investment vehicle. Participation is voluntary and at your own risk.</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: "Telegram Bot", url: TG_BOT_URL, desc: "@rad_gov — governance, tasks, support" },
              { label: "DM the Operator", url: "https://t.me/bigdevxrd", desc: "@bigdevxrd — direct message" },
              { label: "GitHub Issues", url: "https://github.com/bigdevxrd/radix-community-projects/issues", desc: "Bug reports, feature requests" },
              { label: "Dashboard Feedback", url: "/feedback", desc: "Submit tickets from the dashboard" },
            ].map(c => (
              <a key={c.label} href={c.url} target={c.url.startsWith("/") ? undefined : "_blank"}
                className="flex items-center justify-between py-1.5 border-b last:border-0 text-foreground no-underline hover:text-primary">
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground">{c.desc}</div>
                </div>
                <span className="text-xs text-muted-foreground">&gt;</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AboutPage() {
  return <AppShell><AboutContent /></AppShell>;
}
