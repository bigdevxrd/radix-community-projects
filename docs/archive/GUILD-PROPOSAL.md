# Radix Guild — Community Governance Infrastructure Proposal

**Author:** Big Dev (bigdevxrd)
**Date:** April 3, 2026
**Version:** 1.0

---

## Summary

The Radix Guild is an open source governance infrastructure layer for the Radix ecosystem. One dashboard to participate across all Radix DAOs. Connect wallet, get a member badge, view proposals, vote, complete tasks, earn XP, level up.

This proposal seeks community endorsement and initial funding to sustain the Guild as public infrastructure during the Foundation-to-DAO transition.

---

## The Problem

Radix is transitioning from Foundation-led to community-led governance. 18,000+ community members are currently making decisions in scattered Telegram groups, Discord channels, and ad-hoc forums. There is no unified system for:

- Tracking who participates and how much
- Managing proposals across multiple DAOs
- Rewarding contributors for actual work
- Building portable reputation across the ecosystem
- Onboarding new participants into governance

The RAC is elected. The charter is written. But the tooling to execute it doesn't exist.

---

## The Solution

The Radix Guild provides:

1. **Member Badges** — Free, on-chain identity. Tracks XP, level, and contributions. Portable across all DAOs.
2. **Governance Dashboard** — Aggregated view of proposals from CrumbsUp, Consultation, and future governance platforms. Vote from one place.
3. **Bounty Board** — Real tasks with real XRD rewards. Verified completion. Transparent escrow.
4. **Telegram Bot** — Governance in the chat where 18K users already are. /mint, /vote, /proposals, /badge.
5. **Working Groups** — Focused teams (Dev, Content, Governance) with group-specific badges and tasks.
6. **Open Source Framework** — Every component is MIT licensed. Any project can use the Badge Manager. Community builds additional managers.

---

## What's Already Built (Live on Mainnet)

| Component | Status |
|-----------|--------|
| Badge Manager v2 (Scrypto, royalties) | Deployed |
| BadgeFactory (create unlimited managers) | Deployed |
| Guild Member Badge (5 tiers, XP, free mint) | Deployed |
| 3 Working Group schemas | Deployed |
| Portal (7 pages, React, dark/light theme) | Live |
| Telegram Bot | Live |
| CrumbsUp DAO ("Radix Guild") | Created |
| Manager Spec v0.1 | Published |
| GitHub repo (open source, MIT) | Public |

---

## Infrastructure Requirements

### Current (MVP)

| Service | Provider | Cost/month |
|---------|----------|-----------|
| VPS (Hostinger KVM2) | Existing | $14 |
| Domain | sslip.io (free) | $0 |
| GitHub | Free tier | $0 |
| **Total** | | **$14/month** |

### Production (Post-Launch)

| Service | Purpose | Cost/month |
|---------|---------|-----------|
| VPS (2x for redundancy) | Portal, bot, Consultation v2 | $28 |
| PostgreSQL (Supabase) | Consultation v2 vote collector | $25 |
| Domain (rad-guild.xyz) | Professional URL | $1 |
| Radix Validator Node | Network participation + staking revenue | $50 |
| CDN (Cloudflare) | Performance + DDoS protection | $0 |
| Monitoring (UptimeRobot) | Service health alerts | $0 |
| **Total** | | **$104/month** |

### Scaled (20M Market Cap Organization)

| Service | Purpose | Cost/month |
|---------|---------|-----------|
| Infrastructure (above) | Core services | $104 |
| Core team (3 part-time) | Dev, community, governance | $3,000 |
| Security audit (annual) | Smart contract review | $417 ($5K/year) |
| Legal (annual) | DAO entity maintenance | $167 ($2K/year) |
| Marketing/events | Community growth | $500 |
| Bounty fund | Monthly task rewards | $500 |
| **Total** | | **$4,688/month** |
| **Annual** | | **$56,250** |

At XRD ~$0.001 ($19M market cap), that's **56,250,000 XRD/year** or **4,688,000 XRD/month**.

**Reality check:** At current prices, the Guild needs to be extremely lean. The infra-only cost ($104/month = 104,000 XRD) is sustainable. The full team cost requires either: (a) XRD price appreciation, (b) significant grant funding, or (c) revenue in fiat from consulting/services.

**Lean MVP budget: $104/month infra + volunteer contributors + bounties funded from royalties.**

---

## Revenue Model

### Year 1 (Bootstrap — Grant Funded)

| Source | Monthly | Annual |
|--------|---------|--------|
| Booster Grant | Variable | 250,000 XRD |
| Component Royalties | ~500 XRD | 6,000 XRD |
| **Total** | | **256,000 XRD** |

### Year 2 (Growth — Mixed Revenue)

| Source | Monthly | Annual |
|--------|---------|--------|
| Component Royalties (10x usage) | 5,000 XRD | 60,000 XRD |
| Managed DAO Service (50 DAOs × 200 XRD) | 10,000 XRD | 120,000 XRD |
| Platform Fee (1% on 500K XRD flow) | 5,000 XRD | 60,000 XRD |
| Dev Services (consulting) | 10,000 XRD | 120,000 XRD |
| **Total** | **30,000 XRD** | **360,000 XRD** |

### Year 3+ (Self-Sustaining)

| Source | Monthly | Annual |
|--------|---------|--------|
| Royalties + fees | 15,000 XRD | 180,000 XRD |
| Managed services | 30,000 XRD | 360,000 XRD |
| Node staking rewards | 10,000 XRD | 120,000 XRD |
| Dev services | 20,000 XRD | 240,000 XRD |
| **Total** | **75,000 XRD** | **900,000 XRD** |

Break-even at Year 2 on the scaled cost structure.

---

## Badge Tiers

| Tier | Name | XP Required | Unlocks |
|------|------|------------|---------|
| 1 | Member | 0 | Vote, daily roll, join DAOs |
| 2 | Contributor | 100 | Claim bounties, submit proposals |
| 3 | Builder | 500 | Create tasks, mentor newcomers |
| 4 | Steward | 2,000 | Verify work, propose treasury spending |
| 5 | Elder | 10,000 | Run for council, create DAOs |

---

## Roadmap

### Phase 1: Foundation (Complete)
- Badge Manager on mainnet
- Portal with wallet connect
- CrumbsUp DAO
- Telegram bot
- Working groups

### Phase 2: Growth (Apr-May 2026)
- Consultation v2 deployment (own governance instance)
- Starter quests (RadQuest-inspired)
- On-chain escrow for bounties
- TG wallet integration for in-chat voting
- Grid Game v0.1

### Phase 3: Ecosystem (Jun-Jul 2026)
- Multi-DAO aggregation (read CrumbsUp + Consultation APIs)
- DAO Manager blueprint
- Manager Registry (bolt-on/bolt-off protocol)
- Miow public website
- Booster Grant application

### Phase 4: Self-Sustaining (Aug 2026+)
- Managed DAO service launch
- Validator node operation
- Dev consulting services
- Community-maintained, multiple contributors
- Revenue exceeds costs

---

## The Ask

### Immediate (Phase 2 Funding)

| Item | Amount |
|------|--------|
| Development (2 months) | 100,000 XRD |
| Bounty fund (tasks for community) | 50,000 XRD |
| Infrastructure (6 months prepaid) | 10,000 XRD |
| Security audit | 25,000 XRD |
| **Total** | **185,000 XRD** |

### In Return

1. Open source Badge Manager as public infrastructure for any Radix project
2. Governance portal aggregating all Radix DAOs
3. TG bot for 18K+ community governance
4. Framework spec enabling community-built managers
5. Self-sustaining by Year 2

---

## Why Now

- RAC elected, Foundation transferring authority
- 15 consultations completed, governance momentum building
- No standard badge/credential system exists on Radix
- Consultation v2 is open source — ready to deploy
- Community needs tooling to execute the charter
- First mover advantage in a greenfield space

---

## Team

**Big Dev (bigdevxrd)** — Builder in the Radix ecosystem. Shipped DeFi trading tools, Badge Manager on mainnet, Governance dashboard and TG bot. Open source contributor.

The Guild is designed to be community-maintained from day one. The framework is open. The repos are public. The invitation is standing: pick a manager, build it, propose it.

---

## Links

- Portal: https://156-67-219-105.sslip.io/guild/
- GitHub: https://github.com/bigdevxrd/radix-community-projects
- CrumbsUp DAO: https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0
- Badge Manager: package_rdx1p4hx8r99n3fdf60sa7868tw2p8grq7nar4uycr8nup4f3c7xwy2q90

---

*Connect wallet. Get badge. Join the Guild.*
