"use client";
import { Shell, useWallet } from "../components/Shell";
import { BadgeCard } from "../components/BadgeCard";
import Link from "next/link";
import { TIER_COLORS, XP_THRESHOLDS } from "../lib/constants";

function DashboardContent() {
  const { account, connected, badge, badgeLoading } = useWallet();

  if (!connected) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Welcome to the Radix Guild</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 16 }}>
          Connect your Radix Wallet to participate in governance
        </p>
      </div>
    );
  }

  return (
    <>
      {badgeLoading && <p style={{ color: "var(--text-muted)" }}>Loading badge...</p>}

      {badge ? (
        <div style={{ marginBottom: 20 }}>
          <BadgeCard badge={badge} />
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: 20, marginTop: 12,
          }}>
            <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 12 }}>
              Tier Progression
            </h3>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {Object.entries(XP_THRESHOLDS).map(([tier], i) => {
                const isActive = tier === badge.level;
                const isPast = Object.keys(XP_THRESHOLDS).indexOf(badge.level) >= i;
                const color = TIER_COLORS[tier] || "var(--text-muted)";
                return (
                  <div key={tier} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      height: 4, borderRadius: 2, marginBottom: 6,
                      background: isPast ? color : "var(--bg-surface-2)",
                    }} />
                    <div style={{
                      fontSize: 10, fontWeight: isActive ? 700 : 400,
                      color: isActive ? color : "var(--text-muted)",
                      textTransform: "uppercase",
                    }}>
                      {tier}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : !badgeLoading ? (
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: 24, marginBottom: 20, textAlign: "center",
        }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Become a Member</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
            Get a free Guild badge. Your badge is your vote.
          </p>
          <Link href="/guild/mint" style={{
            display: "inline-block", background: "var(--accent)", color: "#000", border: "none",
            padding: "10px 24px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600,
            textDecoration: "none",
          }}>
            Mint Your Badge
          </Link>
        </div>
      ) : null}

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
        <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Vote on Proposals", href: "https://t.me/radix_guild_bot", desc: "Open TG bot" },
            { label: "View Proposals", href: "/guild/proposals", desc: "Live results" },
            { label: "Manage Badges", href: "/guild/admin", desc: "Admin panel" },
          ].map(a => (
            <a key={a.label} href={a.href} style={{
              display: "block", background: "var(--bg-surface-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: 16, textDecoration: "none", color: "var(--text-primary)",
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.desc}</div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 16 }}>Ecosystem</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { name: "RadixTalk", desc: "Community forum (Discourse)", url: "https://radixtalk.com", status: "Link", color: "var(--tier-contributor)" },
            { name: "Radix Wiki", desc: "DAO Charter + ecosystem", url: "https://radix.wiki/ecosystem", status: "Link", color: "var(--tier-contributor)" },
            { name: "CrumbsUp", desc: "Guild DAO governance", url: "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0", status: "Active", color: "var(--accent)" },
            { name: "Muan Protocol", desc: "DAO infrastructure", url: "https://muanprotocol.com", status: "Pending", color: "var(--status-pending)" },
            { name: "Consultation v2", desc: "On-chain governance", url: "https://consultation.radixdlt.com", status: "Planned", color: "var(--status-pending)" },
            { name: "Astra AI", desc: "Astrolescent assistant", url: "https://astrolescent.com", status: "Planned", color: "var(--status-planned)" },
          ].map(s => (
            <a key={s.name} href={s.url} target="_blank" style={{
              display: "block", background: "var(--bg-surface-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: 16, textDecoration: "none", color: "var(--text-primary)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                <span style={{ fontSize: 10, color: s.color, background: `color-mix(in srgb, ${s.color} 15%, transparent)`, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>{s.status}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.desc}</div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 16 }}>Resources</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { name: "Guild Discourse", url: "https://radix-guild.discourse.group", desc: "Discussion forum" },
            { name: "GitHub", url: "https://github.com/bigdevxrd/radix-community-projects", desc: "Source code (MIT)" },
            { name: "Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter", desc: "DAO Charter draft" },
            { name: "MVD Discussion", url: "https://radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258", desc: "Minimum Viable DAO" },
          ].map(r => (
            <a key={r.name} href={r.url} target="_blank" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
              background: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              textDecoration: "none", color: "var(--text-primary)", fontSize: 13,
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 16, background: "var(--bg-surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          Wallet: {account?.slice(0, 20)}...{account?.slice(-8)}
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return <Shell><DashboardContent /></Shell>;
}
