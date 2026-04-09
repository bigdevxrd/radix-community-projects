# Radix Governance

Open source governance infrastructure for the Radix community. Two-tier system: free off-chain coordination in Telegram + formal on-chain voting via Consultation v2 on mainnet.

**Radix Governance** = the system (badges, voting, bounties, XP, on-chain identity)
**Radix Guild** = the first community using it

```
Idea --> Vote --> Decision --> Fund --> Build --> Verify --> Reward
```

## What's Live

| System | What It Does | Status |
|--------|-------------|--------|
| **On-chain Badges** | NFT identity (Scrypto v4, free mint) | Mainnet |
| **Off-chain Voting** | Propose + vote in Telegram (free, badge-gated) | Live |
| **On-chain Governance** | CV2 temperature checks + proposals (XRD-weighted) | Mainnet |
| **Charter Tracking** | 32 governance decisions with dependency tree | Live |
| **Bounties + Escrow** | Create, claim, submit, verify, pay pipeline | Live |
| **Dice Game** | Every governance action = dice roll = bonus XP | Live |
| **Dashboard** | 14 pages: proposals, bounties, groups, game, docs, feedback, about | Live |
| **Support System** | /feedback tickets, FAQ matching, admin management | Live |
| **REST API** | 32 endpoints including /api/health system monitor | Live |
| **Pipeline Tests** | 70 automated tests (API, dashboard, gateway, CV2, feedback) | Passing |

## Quick Start (5 minutes)

```
1. Get a Radix Wallet: https://wallet.radixdlt.com
2. Open @rad_gov in Telegram
3. /register account_rdx1...
4. Mint a badge (free): https://radixguild.com/mint
5. /proposals --> vote on foundation decisions
6. Read the docs: https://radixguild.com/docs
```

No XRD required for off-chain governance. On-chain CV2 votes require a small tx fee (~0.1 XRD).

## Links

| What | Where |
|------|-------|
| Dashboard | [radixguild.com](https://radixguild.com) |
| Telegram Bot | [@rad_gov](https://t.me/rad_gov) |
| Docs & Guides | [radixguild.com/docs](https://radixguild.com/docs) |
| Costs & Transparency | [radixguild.com/docs#transparency](https://radixguild.com/docs#transparency) |
| System Health | [radixguild.com/api/health](https://radixguild.com/api/health) |
| CV2 Fork | [github.com/bigdevxrd/consultation_v2](https://github.com/bigdevxrd/consultation_v2) |
| DAO Charter | [radix.wiki](https://radix.wiki/ideas/radix-network-dao-charter) |
| API Reference | [docs/API-REFERENCE.md](./docs/API-REFERENCE.md) |
| Bot Commands | [docs/BOT-COMMANDS.md](./docs/BOT-COMMANDS.md) |
| Roadmap | [docs/ROADMAP.md](./docs/ROADMAP.md) |

## Two-Tier Governance

| Tier | Cost | Where | Weight | Use Case |
|------|------|-------|--------|----------|
| **Off-chain** | Free | Telegram bot | 1 badge = 1 vote | Day-to-day decisions, charter votes, temp checks |
| **On-chain** | TX fee (~0.1 XRD) | Dashboard / CV2 | XRD-weighted | Formal proposals, binding decisions, treasury |

Proposals are classified visually:
- **Binding Decision** — charter votes that shape the DAO
- **Community Vote** — formal but non-binding
- **Gauging Interest** — 24h quick pulse check (temp check)

## On-Chain Addresses (Mainnet)

| Component | Address |
|-----------|---------|
| BadgeManager | `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva` |
| Badge NFT | `resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl` |
| Admin Badge | `resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe` |
| CV2 Package | `package_rdx1phazm0kmzcfyejp52493zn7zgr5ljymxzvv64rx2u99l93lhtk5dej` |
| CV2 Governance | `component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2` |
| TaskEscrow | `component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r` |
| TaskEscrow Package | `package_rdx1p5m3z284wgnck2cwqs3nayh74c4qkghjrra76mq0azphxmsnhhcvtl` |
| Escrow Receipt NFT | `resource_rdx1thyxus6dhqnd0zs0rvswlxrde3j9rcj8f79f0qsw9vcwf2zxgv6j2r` |

## Dashboard Pages

| Route | Description |
|-------|-------------|
| `/` | Home: badge, stats, active votes, charter, bounties, onboarding |
| `/mint` | Free badge minting with username |
| `/proposals` | Vote Now hero + proposal classification + decision tree + CV2 |
| `/proposals/:id` | Proposal detail with classification, countdown, results |
| `/groups` | Working groups list with member counts |
| `/groups/:id` | Group detail: members, linked tasks/proposals, join/leave |
| `/bounties` | Bounty board with categories, filters, funded/unfunded, escrow |
| `/bounties/:id` | Task detail with acceptance criteria, milestones, claiming |
| `/game` | Dice mechanics, XP rewards, leaderboard |
| `/profile` | Badges, game stats, quick actions |
| `/docs` | Guides, voting, XP, commands, FAQ, costs & transparency |
| `/feedback` | Support tickets with status filters |
| `/about` | Mission, operator, services, legal, on-chain verification |
| `/admin` | Badge lookup + admin actions |

## Architecture

```
Radix Ledger
  +-- BadgeManager (Scrypto v4) -- NFT identity + royalties
  +-- CV2 Governance (Scrypto) -- on-chain proposals + votes
  |
  | Gateway API
  v
radixguild.com (Caddy, auto-TLS)
  +-- guild-bot (Grammy TG bot, port 3003)
  |     +-- SQLite (proposals, votes, XP, bounties, game, charter, feedback)
  |     +-- consultation.js (CV2 sync)
  |     +-- faq-matcher.js (zero-cost support)
  |     +-- REST API (32 endpoints)
  |
  +-- guild-app (Next.js 16, port 3002)
  |     +-- shadcn/ui + Radix dApp Toolkit
  |     +-- 14 pages, dark/light mode
  |
  +-- Caddy (reverse proxy, auto-TLS)
        /api/* --> bot (3003)
        /* --> dashboard (3002)
```

## For Developers

### Test Coverage
- 70 pipeline tests (API, dashboard, Gateway, data integrity, charter, bounties, game, CV2, feedback, error handling)
- 11 Scrypto tests (factory, manager, mint, validation, duplicates)
- Run: `node scripts/pipeline-test.js`

### API
See [docs/API-REFERENCE.md](./docs/API-REFERENCE.md) for all 32 endpoints.

### Bot Commands
See [docs/BOT-COMMANDS.md](./docs/BOT-COMMANDS.md) for all commands.

### Deploy Your Own
See [docs/INCEPTION.md](./docs/INCEPTION.md) for setup from zero.

### Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to earn XP.

## Transparency

- **Funding:** Self-funded by bigdev. ~$680 invested ($40 domain, ~$600 AI/dev, $7/mo VPS). Revenue: $0.
- **Code:** MIT licensed. Everything is public.
- **Control:** bigdev holds the admin badge. Transfers to elected RAC when Step 3 completes.
- **Hosting:** bigdev hosts until the DAO forms and votes to transfer.
- **Full details:** [radixguild.com/docs#transparency](https://radixguild.com/docs#transparency)

## License

MIT
