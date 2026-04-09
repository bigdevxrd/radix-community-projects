# Radix Guild — Dual-Track Schedule

> Open source for the community. Watertight services for market share.
> Updated: 2026-04-10

## The Strategy

**Track 1: Open Source (free, community-owned)**
Badge system, voting, charter, working groups, dashboard, bot, docs.
MIT licensed. Anyone can fork, deploy, extend. This drives adoption.

**Track 2: Services (revenue, watertight)**
Task escrow, multi-token vaults, AI governance assistant, SaaS hosting, manifest registry.
Same codebase, premium features. This drives revenue.

**Win-win:** Community gets free governance tools. We get market share from services that are so good people choose to pay.

---

## Phase 3: Beta + Community (Apr 7-30)

### Week 1-2 (Apr 7-16) — DONE
- [x] 14-page dashboard deployed
- [x] 36 bot commands live
- [x] 75 pipeline tests passing
- [x] TaskEscrow v2 deployed on mainnet (on-chain vault, no wallet custody)
- [x] On-chain TX verification for `/bounty fund`
- [x] Audit trail (actor_tg_id, verified_onchain, onchain_task_id)
- [x] Global error handlers (bot.catch, process handlers, API try/catch)
- [x] Escrow stats in /api/health + /api/escrow (on-chain truth)
- [x] Content audit — stale numbers fixed, name consistency, handle updated
- [x] UserJourneyWidget (6-stage interactive walkthrough)
- [x] GOVERNANCE-CONSTRAINTS.md (positions guild as UX layer)
- [x] OUTREACH-PLAN.md (4-channel strategy)
- [x] Copilot branches cleaned, PR #76 integrated
- [x] Voting weights removed (charter-voteable, not our decision)

### Week 3 (Apr 17-23) — IDENTITY + ESCROW V3
- [ ] Identity research → design doc (sybil mitigation, tiered trust)
- [ ] Implement Phase 1 identity: activity-based trust scoring
  - Badge age (days since mint)
  - Governance participation count (votes, proposals)
  - Task completion count
  - Composite "trust score" displayed on badge
- [ ] Escrow V3: multi-token support (XRD, fUSD, hUSDC)
  - Per-token minimum deposits ($5 stablecoin minimum)
  - Deploy as new component alongside V2
  - Wire bot + dashboard to V3
- [ ] First funded task (50-200 XRD) — prove the full cycle
- [ ] Charter re-proposal (P1-P6) with community members
- [ ] Demo video (#36) — wallet connect, mint, vote, fund task

### Week 4 (Apr 24-30) — COMMUNITY LAUNCH
- [ ] Post to Radix TG groups, RadixTalk, Discord #developers
- [ ] DM 10-20 Radix OGs
- [ ] "State of the Guild" metrics post
- [ ] Target: 20+ badges, 50+ votes, 3+ community proposals
- [ ] Collect feedback, iterate on UX
- [ ] Document all community-reported issues as GitHub issues

---

## Phase 4: SaaS Layer (May)

### Track 1 (Open Source)
- [ ] Conviction voting component (time-weighted, anti-sybil)
- [ ] Vote delegation system
- [ ] Achievement NFTs (task completion proof-of-work)
- [ ] Dashboard write operations (#75) — create proposals, vote, claim from web
- [ ] User profiles (#73) — avatar, bio, skills, portfolio
- [ ] Content moderation admin controls (#72)

### Track 2 (Services)
- [ ] `tenant.config.js` — single codebase, many DAOs
- [ ] SaaS onboarding flow: deploy BadgeManager → configure bot → launch
- [ ] Pricing tiers:
  - Free: self-hosted, MIT license, community support
  - Managed ($20-50 XRD/mo): hosted by guild, updates included
  - Enterprise (custom): dedicated support, custom components
- [ ] Customer #1 target — Radix ecosystem project or DeFi DAO
- [ ] TX Manifest Registry (separate repo) — standardised manifests for AI agents

---

## Phase 5: Revenue Features (Jun-Jul)

### Track 1 (Open Source)
- [ ] On-chain proposal outcomes (#34) — permanent verifiable results
- [ ] Multi-DAO badge federation (#32) — one factory, many DAOs
- [ ] CrumbsUp integration (#44) — formal ratification pipeline
- [ ] RAC elections when charter completes
- [ ] Treasury dashboard with spending visibility

### Track 2 (Services)
- [ ] AI Governance Assistant (0.5 XRD per assist → guild treasury)
- [ ] Escrow V4: milestone-based payments, dispute resolution
- [ ] Component royalties claiming automation
- [ ] Analytics dashboard for SaaS customers
- [ ] Multi-sig support when Radix tooling ships

---

## Phase 6: Scale (Aug-Sep)

### Track 1 (Open Source)
- [ ] CV2 Phase 2 (#58) — self-hosted dApp + vote-collector
- [ ] Cross-chain identity bridges (Gitcoin Passport, BrightID)
- [ ] Quadratic voting component
- [ ] Sub-DAO support

### Track 2 (Services)
- [ ] Target: 5-10 SaaS customers
- [ ] Break-even: 5 managed tenants covering hosting costs
- [ ] Manifest registry as community standard
- [ ] API-as-a-service (governance data feeds for other dApps)

---

## Revenue Model

| Source | Track | Status | Revenue |
|--------|-------|--------|---------|
| Task escrow fee (2.5%) | Services | Live (V2) | Per-task |
| Component royalties | Services | Accruing | Per on-chain call |
| SaaS hosting | Services | Phase 4 | $20-50/mo/tenant |
| AI assistant | Services | Phase 5 | 0.5 XRD/assist |
| Manifest registry | Services | Phase 4 | Free (drives adoption) |
| Badge minting | Open Source | Free forever | $0 |
| Voting | Open Source | Free forever | $0 |
| Dashboard | Open Source | Free forever | $0 |

---

## Identity Roadmap (Progressive Trust)

### Phase 1 (Apr) — Activity-Based (zero friction)
- Trust score from on-chain activity (badge age + votes + tasks)
- Displayed on badge profile
- No external dependencies, no data collection

### Phase 2 (May) — Social Verification (opt-in)
- Connect GitHub/Twitter/TG accounts (composable credentials)
- Increases trust score
- No data stored by guild — verification is attestation-based

### Phase 3 (Jun+) — ZK Identity (when available)
- ZK proofs of uniqueness (Worldcoin/BrightID bridge when Radix-compatible)
- Prove humanity without revealing identity
- Community votes on which identity providers to trust

### Core Principle
The guild never stores personal data. Identity is built through participation, not surveillance. Voting weights are decided by the community through charter votes, not by us.

---

## Metrics & Milestones

| Milestone | Target Date | Metric |
|-----------|------------|--------|
| First funded task completed | Apr 20 | 1 task paid via escrow |
| 20 badge holders | Apr 30 | /api/stats |
| 50 votes cast | Apr 30 | /api/stats |
| First community proposal (not bigdev) | Apr 30 | proposal.created_by != admin |
| SaaS config layer | May 15 | tenant.config.js working |
| First SaaS customer | Jun 15 | 1 paying tenant |
| 5 SaaS customers | Sep 30 | Break-even |
| 100+ badge holders | Sep 30 | Community scale |

---

## Architecture Evolution

```
Phase 3 (Now):
  guild-bot + guild-app + BadgeManager + TaskEscrow (V2)
  Single tenant, single VPS, SQLite

Phase 4 (May):
  guild-bot + guild-app + BadgeFactory + TaskEscrowFactory
  Multi-tenant config, same VPS, SQLite per tenant

Phase 5 (Jun):
  + AI assistant + analytics + manifest registry
  Multi-tenant, dedicated VPS per enterprise customer

Phase 6 (Aug):
  + cross-chain identity + sub-DAOs + API-as-a-service
  Federation model — DAOs interconnect
```

---

## What's Open Source vs What's Services

| Component | License | Track |
|-----------|---------|-------|
| Badge Manager (Scrypto) | MIT | Open Source |
| Badge Factory (Scrypto) | MIT | Open Source |
| TaskEscrow (Scrypto) | MIT | Open Source |
| Telegram Bot | MIT | Open Source |
| Dashboard | MIT | Open Source |
| REST API | MIT | Open Source |
| Pipeline Tests | MIT | Open Source |
| All docs + guides | MIT | Open Source |
| SaaS config layer | Proprietary | Services |
| AI assistant | Proprietary | Services |
| Managed hosting | Service | Services |
| Enterprise support | Service | Services |
| Analytics dashboard | Proprietary | Services |

The line: **tools are free, hosting is paid, support is premium.**
