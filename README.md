# Radix Guild

Community governance for Radix — propose ideas, vote on them, earn XP. All from Telegram.

## How It Works

1. **Mint a free badge** — an on-chain NFT in your Radix Wallet
2. **Register in the TG bot** — link your wallet to your Telegram account
3. **Propose and vote** — create proposals, vote with inline buttons
4. **Earn XP** — voting and proposing earn XP. Higher XP = higher tier = more voting weight

Tiers: Member (1x) → Contributor (2x) → Builder (3x) → Steward (5x) → Elder (10x)

## Get Started

- **Telegram Bot:** [@radix_guild_bot](https://t.me/radix_guild_bot)
- **Dashboard:** [Guild Dashboard](https://156-67-219-105.sslip.io/guild)
- **CrumbsUp DAO:** [Guild on CrumbsUp](https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0)

## How Voting Works

| What | Where | Cost | On-chain? |
|------|-------|------|-----------|
| **Badge minting** | Dashboard | Free (0 XRD) | Yes — NFT in your wallet |
| **Voting** | Telegram bot | Free | No — stored in bot database |
| **Proposals** | Telegram bot | Free | No — stored in bot database |
| **XP updates** | Admin batch signer | Free to user | Yes — written on-chain periodically |

**Radix Governance** = network-level decisions (all XRD holders, via Consultation v2)
**Radix Guild** = community coordination (badge holders, via Telegram bot)

The TG bot handles temperature checks and community proposals. On-chain governance (Consultation v2) is planned for formal ratification in Phase 4.

## Architecture

```
Telegram Bot (primary UX)
  ├── Proposals, voting, XP, badge verification
  ├── REST API: /api/proposals, /api/badge/:address
  └── SQLite: proposals, votes, users, XP rewards

Dashboard (signing bridge + badge viewer)
  ├── Next.js 16, Tailwind v4, Radix dApp Toolkit
  ├── Badge minting, tier progression, proposals
  └── Admin: badge lookup, update tier/XP/revoke

Badge Manager (on-chain, Scrypto)
  ├── BadgeFactory → creates BadgeManagers
  ├── BadgeManager → mints/manages NFT badges
  └── Royalties enabled, 9/9 unit tests passing
```

## Project Structure

| Directory | What | Status |
|-----------|------|--------|
| [badge-manager/](./badge-manager) | Scrypto smart contracts | Live on Mainnet (v4) |
| [bot/](./bot) | Telegram governance bot | Active (20+ commands) |
| [guild-app/](./guild-app) | Next.js dashboard | Active (4 pages) |
| [scripts/](./scripts) | Pipeline tests, deploy, XP signer | Active (19 tests) |
| [docs/](./docs) | Infrastructure, handover, inception | Complete |

## Mainnet Addresses (v4)

| Entity | Address |
|--------|---------|
| Package | `package_rdx1phm53al5ztrfw8k5wa3qc5pllwfyeqgl4spjcy83ymgw8jhngx7vu3` |
| BadgeFactory | `component_rdx1cqxdsz6d3zjsjx7shk2fgg8dazmrknygvqsa4943yw0yz4e69taxhg` |
| Guild Member Manager | `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva` |
| Member Badge NFT | `resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl` |

## Deploy Your Own

See [docs/INCEPTION.md](./docs/INCEPTION.md) for a complete step-by-step guide to deploy your own Guild from scratch.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, code style, and how to earn XP.

## Test Coverage

- **19 pipeline tests** — API, dashboard, Gateway, data integrity
- **11 Scrypto tests** — factory, manager, mint, validation, duplicate prevention

```bash
node scripts/pipeline-test.js    # Integration tests
cargo test                        # Scrypto tests (VPS/Linux only)
```

## License

MIT
