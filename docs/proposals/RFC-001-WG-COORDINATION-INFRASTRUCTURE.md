# RFC: Working Group Coordination Infrastructure

**Author:** bigdev (@bigdev_xrd)
**Date:** April 2026
**Status:** Draft — seeking community feedback
**Category:** Governance Tooling / Infrastructure

---

**TLDR:** I've built and deployed open-source coordination tooling for Radix — task marketplace with on-chain escrow, badge-gated working groups, trust scoring, and a 14-page dashboard. I'm proposing to connect this infrastructure to the community's emerging governance framework (Daffy's WG charters, the RAC, MIDAO) and maintain it full-time for trial 6 months at $1,100/month.

---

## Context

The Radix community is standing up governance structures: the RAC is elected, MIDAO legal is progressing, Daffy has published a comprehensive Working Group framework, and Phil has proposed a Strategic Council. These define *who decides*, *what the rules are*, and *how groups are organised*.

What's missing is *where the work happens*. Right now DAOs typically stitch together 5-7 tools — Snapshot for voting, Safe for treasury, Dework for tasks, Discord for chat, Notion for docs, Coordinape for compensation. Each has its own login, its own data, and none of them know about Radix.

## What Exists Today

Everything below is live, open source (MIT), and verifiable on-chain:

| Component | Status | Verify |
|-----------|--------|--------|
| Badge Manager (Scrypto v4) | Mainnet | [component_rdx1czex...](https://dashboard.radixdlt.com/component/component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva) |
| TaskEscrow (Scrypto v2) | Mainnet | [component_rdx1cp8m...](https://dashboard.radixdlt.com/component/component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r) |
| Dashboard (14 pages) | Live | [radixguild.com](https://radixguild.com) |
| Telegram Bot (37 commands) | Live | [@rad_gov](https://t.me/rad_gov) |
| REST API (34 endpoints) | Live | [/api/health](https://radixguild.com/api/health) |
| Source code | Public | [GitHub](https://github.com/bigdevxrd/radix-community-projects) |

Infrastructure deployed:
- **Trust scoring** — Bronze/Silver/Gold tiers calculated from on-chain activity (no KYC)
- **Gateway event watcher** — auto-detects on-chain escrow events every 60 seconds
- **PR merge watcher** — auto-verifies tasks when linked GitHub PRs are merged
- **75 automated pipeline tests** — API, dashboard, gateway, escrow, data integrity
- **Working groups** — 5 groups with badge-gated membership, join/leave from dashboard and TG
- **All Self-Funded**

## PROPOSAL

Connect this infrastructure to the community's governance framework and maintain it full-time for 6 months. Specifically:

**Working Group Operations**
- Working group scoped task boards (tasks linked to specific groups)
- Per-WG role system (lead / steward / member / observer)
- Per-WG budget tracking with spend-vs-envelope dashboard
- Monthly structured reporting template (`/wg report`)
- Charter lifecycle management (create → operate → sunset)

**Dashboard Write Operations + Multi-Token Escrow**
- Vote on proposals from the dashboard (not just TG)
- Create proposals from the dashboard (trust-gated)
- Fund tasks from the dashboard (wallet TX — fund button already built)
- Escrow V3: accept xUSDC + xUSDT alongside XRD ($5 stablecoin minimum)

**MConviction Voting + Handover**
- On-chain conviction voting component (Scrypto) — time-weighted, anti-sybil
- Badge tier multipliers for governance weight
- Working group infrastructure handover documentation
- Sunset review — community decides whether to renew etc

All code remains MIT licensed. All infrastructure is transferable. If I disappear, fork the code and deploy your own — everything is public.

## Cost

**Free for now while the community evaluates.** Proposing a trial arrangement — **$4,000 USD/month** hybrid ($2,400 base + $1,600 milestone bonuses) subject to RAC approval or community crowdfunding and negotiation. Funding allows me to focus full-time on Radix (40 weeks pa). The scope is TBC.

**Payment structure (hybrid):**
- $2,400/month base — covers infrastructure, maintenance, and ongoing development time
- $1,600/month milestone bonus — released on delivery of each month's deliverables
- Milestones verified by: working code deployed, public on GitHub, testable at radixguild.com
- If deliverables aren't met → milestone payment withheld, community reviews

## How This Fits the Ecosystem

| Initiative | What It Does | Relationship |
|-----------|-------------|-------------|
| Daffy's WG Framework | Defines governance rules, charters, accountability | This proposal implements the tooling that makes those rules operational |
| Phil's Strategic Council | Defines leadership structure | Council leads would use this infrastructure to coordinate |
| RAC | Provides oversight | WG reports flow to the RAC through structured templates |
| MIDAO | Provides legal entity | Legal entity needs operational infrastructure to manage |
| CV2 | On-chain voting | Already integrated (read-only). Dashboard displays CV2 proposals. |

This proposal is complementary to all of the above, competitive with none.

## Track Record

- 5 years hodling xrd
- 2 Scrypto components deployed on mainnet (Badge Manager + TaskEscrow)
- First on-chain escrow service on Radix
- First task marketplace on Radix
- First trust scoring system on Radix
- 75 automated tests, 0 failures
- All self-funded, all open source

## Accountability

- Monthly structured report: delivered / next / blocked / budget spent
- All code public on GitHub
- All on-chain components verifiable on Radix Dashboard
- 6-month sunset clause — renewal requires community vote
- If I underdeliver: stop payment, fork the code, everything is transferable
- If the community finds a better solution: I'll help migrate and step aside

## Open Questions

I'd welcome community feedback on:
- **Scope priority** — which deliverables matter most? Should I reorder?
- **Budget** — is the hybrid structure clear enough? Should milestones be defined differently?
- **Working group alignment** — should this proposal be submitted under Daffy's WG Framework as the first chartered working group?
- **Reporting** — who should monthly reports go to? RAC? Community forum? Both?

## How to Verify

Everything in this proposal is checkable right now:
- Visit [radixguild.com](https://radixguild.com) and connect a Radix Wallet
- Mint a free badge at [/mint](https://radixguild.com/mint)
- Join the bot: [@rad_gov](https://t.me/rad_gov) → /start
- Browse the code: [github.com/bigdevxrd/radix-community-projects](https://github.com/bigdevxrd/radix-community-projects)
- Check escrow on-chain: [TaskEscrow component](https://dashboard.radixdlt.com/component/component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r)
- Check system health: [/api/health](https://radixguild.com/api/health)
- Run the tests: `node scripts/pipeline-test.js` (75/75 passing)

---

*Built by operators, for operators. The code is the proposal.*
