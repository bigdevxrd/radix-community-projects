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
| [badge-manager/](./badge-manager) | Scrypto smart contracts | Live on Mainnet (v3) |
| [bot/](./bot) | Telegram governance bot | Active (20+ commands) |
| [guild-app/](./guild-app) | Next.js dashboard | Active (4 pages) |
| [scripts/](./scripts) | Pipeline tests, deploy, XP signer | Active (19 tests) |
| [docs/](./docs) | Infrastructure, handover, inception | Complete |

## Mainnet Addresses (v3)

| Entity | Address |
|--------|---------|
| Package | `package_rdx1p5cs9vt3skd6zyvld9xfe54fqhshnu6zt5demv09l0prrvlqjwzvwu` |
| BadgeFactory | `component_rdx1crtr4uccyeaccunvyw8nqf6unk2eknkhju4nh00re4mse93l22frmk` |
| Guild Member Manager | `component_rdx1cz0fkhg86y33afk5jztxeqdxjz6hhzexla7u8fkrwfx5ekn3xdlf3u` |
| Member Badge NFT | `resource_rdx1ntxy3j2zclysyr99h3ayrvh92h0rhy3tmmwst9j4r8akeaj4u0qcn4` |

## Deploy Your Own

See [docs/INCEPTION.md](./docs/INCEPTION.md) for a complete step-by-step guide to deploy your own Guild from scratch.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, code style, and how to earn XP.

## Test Coverage

- **19 pipeline tests** — API, dashboard, Gateway, data integrity
- **9 Scrypto tests** — factory, manager, mint, validation

```bash
node scripts/pipeline-test.js    # Integration tests
cargo test                        # Scrypto tests (VPS/Linux only)
```

## License

MIT
