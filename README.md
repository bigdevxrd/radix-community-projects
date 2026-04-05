# Radix Governance

## Why This Exists

The Radix community is fragmented. Discussions happen across Telegram, Discord, RadixTalk, and CrumbsUp with no coherent thread connecting them. Ideas get debated but never decided. Decisions get made but never funded. Work gets done but never rewarded.

The Foundation is transitioning to community governance. The DAO Charter exists but has 32 undefined parameters. The Consultation v2 system handles network-level votes but there's no tooling for community-level coordination — the day-to-day decisions about how we actually organize and work together.

This is not a marketing project or a token launch. This is infrastructure. A last serious attempt at giving the Radix community a coherent way to make decisions, fund work, and hold each other accountable.

## What It Is

**Radix Governance** = the system (open source tools anyone can use)
**Radix Guild** = the first community using it

```
💡 Idea → 🗳️ Vote → ✅ Decision → 💰 Fund → 🔨 Build → ✔️ Verify → 🎁 Reward
```

## What's Built (and what actually works)

| System | What It Does | Status | Verified |
|--------|-------------|--------|----------|
| **Badges** | On-chain NFT identity (Scrypto v4, free mint) | Live on mainnet | 11 Scrypto tests |
| **Voting** | Propose + vote in Telegram (free, off-chain) | Live | Pass/fail/amend/expire tested |
| **Charter Tracking** | 32 governance decisions with dependency tree | Live | 6 ready to vote |
| **Bounties + Escrow** | Create → claim → submit → verify → pay | Live | Full cycle tested |
| **Dice Game** | Every governance action = dice roll = bonus XP | Live | Weighted distribution verified |
| **Dashboard** | Charter progress, proposals, bounty board | Live | 19 pipeline tests |
| **Badge API** | Public REST endpoints for any dApp | Live | 7 endpoints |

## What's NOT Built (honest gaps)

| Gap | What's Missing | When | Effort |
|-----|---------------|------|--------|
| **On-chain voting** | Votes stored in SQLite, not on Radix ledger | Phase 4 | 2-3 weeks |
| **CV2 integration** | Can't read Consultation v2 proposals yet (need component address) | Phase 4 | 1-2 weeks |
| **CrumbsUp sync** | No API integration (API undocumented) | Phase 4 | 2-3 weeks |
| **Custom domain** | Currently on IP-based URL (sslip.io) | Phase 3 | 1 day |
| **Multi-DAO support** | Factory supports it, UI doesn't yet | Phase 5 | 3-4 weeks |
| **Vote delegation** | Not implemented | Phase 5 | 2 weeks |

## How Voting Works (be clear about this)

| What | Cost | On-chain? | Implication |
|------|------|-----------|-------------|
| Mint a badge | Free | **Yes** — NFT in your wallet | Your identity is on-chain |
| Vote on proposals | Free | **No** — stored in bot database | Votes are fast but not on Radix ledger |
| Earn XP | Free | Written on-chain periodically | XP is real, stored in your badge NFT |
| Create bounties | Free | **No** — tracked in bot database | Bounty system is off-chain |
| Fund escrow | XRD | Tracked per-transaction | Escrow is managed, not smart contract |

**Why off-chain voting?** On-chain voting requires XRD for every transaction. That's a barrier to participation. Temperature checks and community coordination should be free. Formal ratification (binding votes with XRD-weighted stakes) will use Consultation v2 when integrated.

## The DAO Setup Plan

The [DAO Charter](https://radix.wiki/ideas/radix-network-dao-charter) has 32 parameters that need community votes. They have dependencies — some decisions must happen before others.

```
STEP 1: FOUNDATION (vote now — 6 decisions, ~1 week)
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
STEP 2: CONFIGURATION (auto-unlocks — 14 decisions, ~2-3 weeks)
┌──────────────────────────────────────────────┐
│  Treasury limits, election rules, timing,    │
│  reputation system, enforcement rules        │
│  ⚠️ Blocked until Step 1 completes          │
└──────────────────────────────────────────────┘
         │ passes
         ▼
STEP 3: OPERATIONS (~2 weeks)
┌──────────────────────────────────────────────┐
│  First RAC election, first bounty fund,      │
│  infrastructure hosting approval             │
└──────────────────────────────────────────────┘
         │ passes
         ▼
STEP 4: SELF-GOVERNING
┌──────────────────────────────────────────────┐
│  Anyone can propose, vote, build, earn.      │
│  The DAO governs itself.                     │
└──────────────────────────────────────────────┘
```

**Estimated timeline to operational DAO: 6-8 weeks** (depends on community participation)

Type `/charter` in the bot to see real-time progress.

## Roadmap (with honest timeframes)

| Phase | What | When | Status |
|-------|------|------|--------|
| **1. Build** | Bot, dashboard, contracts, bounties, game | Apr 3-5 | ✅ Done |
| **2. Beta** | 3-5 testers, fix bugs, validate flows | Apr 6-10 | ← Now |
| **3. Launch** | Public announcement, custom domain | Apr 10-14 | Next |
| **4. Integrate** | CV2 reading, on-chain outcomes, CrumbsUp | Apr 14-30 | Planned |
| **5. Scale** | Multi-DAO, delegation, badge profiles | May+ | Designed |

## What's Needed From the Community

This project has one developer (Big Dev). The infrastructure is hosted at personal expense (~$7/month). Everything is open source. For this to work:

1. **Vote on the 6 foundation proposals** — takes 5 minutes
2. **Report bugs** — DM or GitHub issues
3. **Contribute** — PRs welcome, bounties pay XP
4. **Spread the word** — if you think this is worth trying

If nobody votes, nothing happens. The system is ready. The question is whether the community wants to use it.

## Get Started (3 minutes)

```
Step 1:  Open @rad_gov in Telegram
Step 2:  /register account_rdx1...
Step 3:  Mint badge (free): dashboard link in bot
Step 4:  /proposals → vote on the 6 foundation decisions
```

Everything is free. No XRD required to participate.

## Links

| What | Where |
|------|-------|
| Telegram Bot | [@rad_gov](https://t.me/rad_gov) |
| Dashboard | [Radix Governance](https://72-62-195-141.sslip.io/guild) |
| DAO Charter | [radix.wiki](https://radix.wiki/ideas/radix-network-dao-charter) |
| CrumbsUp DAO | [Guild on CrumbsUp](https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0) |
| CV2 Integration Plan | [docs/CV2-INTEGRATION.md](./docs/CV2-INTEGRATION.md) |
| Full MVD Plan | [docs/MVD-SETUP.md](./docs/MVD-SETUP.md) |

## For Developers

### Architecture
```
Telegram Bot ──→ SQLite (proposals, votes, bounties, XP, game, charter)
     │              │
     ├── Badge API ─┤──→ Radix Gateway API ──→ On-chain badges (Scrypto v4)
     │              │
Dashboard ──────────┘──→ shadcn/ui + Next.js 16 + Radix dApp Toolkit
```

### Deploy Your Own
See [docs/INCEPTION.md](./docs/INCEPTION.md) — complete guide from zero to running governance system.

### Test Coverage
- 19 pipeline tests (API, dashboard, Gateway, data integrity)
- 11 Scrypto tests (factory, manager, mint, validation, duplicates)
- Vote cycle verified (pass/fail/amend/expire)
- Bounty cycle verified (fund → claim → submit → verify → pay)
- Dice game verified (weighted distribution)

### Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and how to earn XP.

## Transparency

- **Funding:** Self-funded by Big Dev. ~$7/month VPS. No treasury, no token, no VC.
- **Code:** MIT licensed. Everything is public. Fork it, critique it, improve it.
- **Hosting:** Big Dev hosts until the DAO forms and votes to transfer. All costs documented in [HANDOVER.md](./docs/HANDOVER.md).
- **Control:** Big Dev holds the admin badge. Transfers to elected RAC when Step 3 completes.
- **Risk:** If nobody participates, the project pauses. No obligation, no pressure.

## License

MIT — use it, fork it, build on it.
