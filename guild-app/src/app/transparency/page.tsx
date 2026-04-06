"use client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MANAGER, BADGE_NFT, ROYALTIES } from "@/lib/constants";

const COSTS = [
  { item: "VPS (Hostinger)", cost: "$7/mo", note: "Bot, dashboard, API, database" },
  { item: "Domain (radixguild.com)", cost: "$0.01 first year", note: "~$10/yr after" },
  { item: "TLS Certificate", cost: "Free", note: "Caddy auto-provisions via Let's Encrypt" },
  { item: "Database (SQLite)", cost: "Free", note: "Embedded, no external service" },
  { item: "Radix Gateway API", cost: "Free", note: "Public endpoint by RDX Works" },
];

const REVENUE = [
  { source: "Badge minting royalty", amount: `${ROYALTIES.mint} XRD per mint`, status: "live", note: "On-chain, goes to component owner" },
  { source: "Tier update royalty", amount: `${ROYALTIES.update_tier} XRD`, status: "live", note: "On-chain component royalty" },
  { source: "XP update royalty", amount: `${ROYALTIES.update_xp} XRD`, status: "live", note: "On-chain component royalty" },
  { source: "Governance assistant", amount: "0.5 XRD per use", status: "planned", note: "LLM-powered proposal drafting" },
  { source: "SaaS hosting", amount: "TBD", status: "planned", note: "White-label for other DAOs" },
];

function TransparencyContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Transparency</h1>
        <p className="text-muted-foreground text-sm mt-1">
          How Radix Guild is funded, what it costs, and where the money goes. Full visibility, always.
        </p>
      </div>

      {/* Monthly Cost */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Monthly Costs</CardTitle>
            <Badge variant="secondary" className="text-xs font-mono">~$8/mo</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {COSTS.map(c => (
              <div key={c.item} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">{c.item}</div>
                  <div className="text-[11px] text-muted-foreground">{c.note}</div>
                </div>
                <span className="text-sm font-mono text-primary">{c.cost}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Revenue Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {REVENUE.map(r => (
              <div key={r.source} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.source}</span>
                    <Badge variant={r.status === "live" ? "default" : "outline"} className="text-[9px]">
                      {r.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.note}</div>
                </div>
                <span className="text-sm font-mono text-primary">{r.amount}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* The Deal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">The Deal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>Who pays?</strong> Big Dev self-funds infrastructure until the DAO treasury is formed (Charter Step 3).</p>
          <p><strong>Who controls?</strong> Big Dev holds the admin badge. It transfers to the elected RAC (Radix Advisory Council) when Charter Step 3 completes.</p>
          <p><strong>What happens if Big Dev disappears?</strong> Everything is open source (MIT). Anyone can fork the code and deploy their own instance. On-chain badges and CV2 votes persist independently on the Radix ledger.</p>
          <p><strong>Can the community take over?</strong> Yes. That is the explicit goal. Charter Steps 1-3 build the governance structure. Step 4 is self-governing.</p>
        </CardContent>
      </Card>

      {/* On-Chain Proof */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">On-Chain Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Badge Manager</span>
            <a href={`https://dashboard.radixdlt.com/component/${MANAGER}`} target="_blank" className="font-mono text-xs text-primary hover:underline">
              {MANAGER.slice(0, 20)}...
            </a>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Badge NFT Resource</span>
            <a href={`https://dashboard.radixdlt.com/resource/${BADGE_NFT}`} target="_blank" className="font-mono text-xs text-primary hover:underline">
              {BADGE_NFT.slice(0, 20)}...
            </a>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Source Code</span>
            <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="font-mono text-xs text-primary hover:underline">
              MIT Licensed
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TransparencyPage() {
  return <AppShell><TransparencyContent /></AppShell>;
}
