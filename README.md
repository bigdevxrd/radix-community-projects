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
| **Bounties + Escrow** | Create, claim, submit, verify, pay | Live |
| **Dice Game** | Every governance action = dice roll = bonus XP | Live |
| **Dashboard** | 10 pages: proposals, bounties, game, profile, admin | Live |
| **REST API** | 15+ endpoints for any dApp to consume | Live |
| **Pipeline Tests** | 39 automated tests (API, dashboard, gateway, CV2) | Passing |

## Quick Start (3 minutes)

```
1. Open @rad_gov in Telegram
2. /register account_rdx1...
3. Mint a badge (free): https://72-62-195-141.sslip.io/guild/mint
4. /proposals --> vote on foundation decisions
5. Visit the dashboard to create on-chain temperature checks
```

No XRD required for off-chain governance. On-chain CV2 votes require a small tx fee. Voting weight model (equal, XRD-based, or tier-based) is an unresolved charter decision.

## Links

| What | Where |
|------|-------|
| Telegram Bot | [@rad_gov](https://t.me/rad_gov) |
| Dashboard | [72-62-195-141.sslip.io/guild](https://72-62-195-141.sslip.io/guild) |
| CV2 Fork | [github.com/bigdevxrd/consultation_v2](https://github.com/bigdevxrd/consultation_v2) |
| DAO Charter | [radix.wiki](https://radix.wiki/ideas/radix-network-dao-charter) |
| API Reference | [docs/API-REFERENCE.md](./docs/API-REFERENCE.md) |
| Bot Commands | [docs/BOT-COMMANDS.md](./docs/BOT-COMMANDS.md) |

## Two-Tier Governance

| Tier | Cost | Where | Weight | Use Case |
|------|------|-------|--------|----------|
| **Off-chain** | Free | Telegram bot | 1 badge = 1 vote | Day-to-day decisions, temp checks, coordination |
| **On-chain** | TX fee (~0.1 XRD) | Dashboard / CV2 | TBD (charter decision) | Formal proposals, binding decisions, treasury |

Off-chain votes are fast and free. On-chain votes are XRD-weighted and recorded on the Radix ledger. Both are visible on the dashboard.

## On-Chain Addresses (Mainnet)

| Component | Address |
|-----------|---------|
| BadgeManager | `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva` |
| Badge NFT | `resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl` |
| Admin Badge | `resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe` |
| CV2 Package | `package_rdx1phazm0kmzcfyejp52493zn7zgr5ljymxzvv64rx2u99l93lhtk5dej` |
| CV2 Governance | `component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2` |
| CV2 VoteDelegation | `component_rdx1cr877kp2s6ggdy6a7hrdczj6g2up6xhg4vd2g2mqr0qwvlrlknk6z2` |

## Dashboard Pages

| Route | Description |
|-------|-------------|
| `/` | Home: badge, stats, charter, bounties, game, ecosystem |
| `/mint` | Free badge minting with username |
| `/proposals` | Off-chain votes + on-chain CV2 governance + decision tree |
| `/proposals/:id` | Individual proposal detail with vote breakdown |
| `/bounties` | Bounty board with filters, escrow history |
| `/game` | Dice mechanics, XP rewards table, leaderboard preview |
| `/leaderboard` | Top players by bonus XP |
| `/profile` | All badges, game stats, quick actions |
| `/admin` | Badge lookup + admin actions |

## Architecture

```
Radix Ledger
  +-- BadgeManager (Scrypto v4) -- NFT identity
  +-- CV2 Governance (Scrypto) -- on-chain proposals + votes
  |
  | Gateway API
  v
Guild VPS (72.62.195.141)
  +-- guild-bot (Grammy TG bot, port 3003)
  |     +-- SQLite (proposals, votes, XP, bounties, game, charter)
  |     +-- consultation.js (CV2 sync, polls every 5 min)
  |     +-- REST API (15+ endpoints)
  |
  +-- guild-app (Next.js 16, port 3002)
  |     +-- shadcn/ui + Radix dApp Toolkit
  |     +-- 10 pages, dark/light mode
  |
  +-- Caddy (reverse proxy, auto-TLS)
        /api/* --> bot (3003)
        /guild/* --> dashboard (3002)
```

## The DAO Setup Plan

The DAO Charter has 32 parameters with dependencies. Community votes unlock them in sequence:

```
STEP 1: FOUNDATION (6 decisions)
  Charter adoption, RAC seats, quorum, voting period, thresholds
      |
STEP 2: CONFIGURATION (20 decisions)
  Treasury limits, election rules, timing, reputation
      |
STEP 3: OPERATIONS (6 decisions)
  First RAC election, first bounty fund, hosting
      |
STEP 4: SELF-GOVERNING
  Anyone can propose, vote, build, earn
```

Type `/charter` in the bot to see real-time progress.

## For Developers

### Test Coverage
- 39 pipeline tests (API, dashboard, Gateway, data integrity, charter, bounties, game, CV2)
- 11 Scrypto tests (factory, manager, mint, validation, duplicates)

### API
See [docs/API-REFERENCE.md](./docs/API-REFERENCE.md) for all 15+ endpoints.

### Bot Commands
See [docs/BOT-COMMANDS.md](./docs/BOT-COMMANDS.md) for all 22 commands.

### Deploy Your Own
See [docs/INCEPTION.md](./docs/INCEPTION.md) for setup from zero.

### CV2 Deployment
See [docs/CV2-DEPLOY-GUIDE.md](./docs/CV2-DEPLOY-GUIDE.md) for Scrypto build + mainnet deployment.

### Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to earn XP.

## Transparency

- **Funding:** Self-funded by Big Dev. ~$7/month VPS.
- **Code:** MIT licensed. Everything is public.
- **Control:** Big Dev holds the admin badge. Transfers to elected RAC when Step 3 completes.
- **Hosting:** Big Dev hosts until the DAO forms and votes to transfer.

## License

MIT
