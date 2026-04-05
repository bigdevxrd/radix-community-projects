# Radix Governance

## The Problem

The Radix community has no way to make decisions together. Ideas float in Telegram, never get voted on, and nothing gets done. No framework, no accountability, no rewards for contributing.

## The Solution

A governance system that turns ideas into decisions into funded actions — all from Telegram.

```
💡 Idea → 🗳️ Vote → ✅ Decision → 💰 Fund → 🔨 Build → ✔️ Verify → 🎁 Reward
```

**Radix Governance** = the system (badges, voting, bounties, XP, escrow)
**Radix Guild** = the first community using it

## Get Started (3 minutes)

```
Step 1:  Open @radix_guild_bot in Telegram
Step 2:  /register account_rdx1...     ← link your wallet
Step 3:  Mint badge (free):            ← dashboard link in bot
Step 4:  /proposals                    ← vote on what matters
```

Everything is free. No XRD required to vote.

## One Job Right Now: Set Up the DAO

32 governance parameters need community votes. 6 are ready today — no dependencies, no blockers.

```
STEP 1: FOUNDATION (vote now — 6 decisions)
┌──────────────────────────────────────────────┐
│  1. Adopt the Charter?          [YES/NO]     │
│  2. RAC seat count?             [3/5/7/9]    │
│  3. Quorum minimum?             [3/10/25]    │
│  4. Voting period?              [48h/72h/7d] │
│  5. Approval threshold?         [>50%/>60%]  │
│  6. Amendment threshold?        [>60%/>66%]  │
└──────────────────────────────────────────────┘
         │ passes
         ▼
STEP 2: CONFIGURATION (20 decisions auto-unlock)
┌──────────────────────────────────────────────┐
│  Treasury limits, election rules, timing,    │
│  reputation system, enforcement rules        │
│  ⚠️ Blocked until Step 1 completes          │
└──────────────────────────────────────────────┘
         │ passes
         ▼
STEP 3: OPERATIONS (6 decisions)
┌──────────────────────────────────────────────┐
│  First RAC election, first bounty fund,      │
│  infrastructure hosting approval             │
└──────────────────────────────────────────────┘
         │ passes
         ▼
STEP 4: FREE REIGN
┌──────────────────────────────────────────────┐
│  Anyone can propose, vote, build, earn.      │
│  The DAO governs itself.                     │
└──────────────────────────────────────────────┘
```

Type `/charter` in the bot to see progress. Full details: [docs/MVD-SETUP.md](./docs/MVD-SETUP.md)

## What's Built

| System | What It Does | Status |
|--------|-------------|--------|
| **Badges** | On-chain NFT identity (free mint) | Live on mainnet |
| **Voting** | Propose + vote in Telegram (free) | Live |
| **Charter** | 32 governance decisions tracked with dependencies | Live |
| **Bounties** | Create → claim → submit → verify → pay | Live |
| **Escrow** | Treasury tracking (fund, release, audit trail) | Live |
| **Dice Game** | Every action = dice roll = bonus XP | Live |
| **Dashboard** | Badge viewer, proposals, bounties, charter progress | Live |
| **Badge API** | Public REST endpoints for any dApp | Live |

## How Voting Works

| What | Cost | On-chain? |
|------|------|-----------|
| Mint a badge | Free | Yes — NFT in your wallet |
| Vote on proposals | Free | No — off-chain (instant) |
| Earn XP | Free | Batch-written on-chain |
| Create bounties | Free | No — tracked in bot |
| Fund escrow | XRD | Tracked per-transaction |

## Tiers & Voting Weight

| Tier | XP Required | Vote Weight |
|------|-------------|-------------|
| Member | 0 | 1x |
| Contributor | 100 | 2x |
| Builder | 500 | 3x |
| Steward | 2,000 | 5x |
| Elder | 10,000 | 10x |

Every governance action earns XP + a dice roll (bonus XP: 0-100).

## Links

| What | Where |
|------|-------|
| Telegram Bot | [@radix_guild_bot](https://t.me/radix_guild_bot) |
| Dashboard | [Guild Dashboard](https://156-67-219-105.sslip.io/guild) |
| CrumbsUp DAO | [Guild on CrumbsUp](https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0) |
| DAO Charter | [radix.wiki](https://radix.wiki/ideas/radix-network-dao-charter) |

## For Developers

### Deploy Your Own
See [docs/INCEPTION.md](./docs/INCEPTION.md) — complete guide from zero to running governance system.

### Architecture
```
Telegram Bot ──→ SQLite (proposals, votes, bounties, XP, game)
     │              │
     ├── Badge API ─┤──→ Radix Gateway API ──→ On-chain badges
     │              │
Dashboard ──────────┘──→ shadcn/ui + Next.js 16
```

### Project Structure
| Directory | What |
|-----------|------|
| [badge-manager/](./badge-manager) | Scrypto smart contracts (v4, mainnet) |
| [bot/](./bot) | Telegram bot (30+ commands) |
| [guild-app/](./guild-app) | Next.js dashboard (shadcn/ui) |
| [scripts/](./scripts) | Pipeline tests, deploy, XP signer |
| [docs/](./docs) | 15 documentation files |

### Test Coverage
- 19 pipeline tests (API, dashboard, Gateway, data integrity)
- 11 Scrypto tests (factory, manager, mint, validation, duplicates)

### Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and how to earn XP.

## License

MIT — use it, fork it, build on it.
