# Contributing to Radix Community Projects

Thanks for your interest in contributing to the Radix Guild. This guide covers everything you need to get started.

## Quick Start

```bash
git clone https://github.com/bigdevxrd/radix-community-projects.git
cd radix-community-projects
```

The monorepo has four main areas:

| Directory | What | Tech |
|-----------|------|------|
| `bot/` | TG governance bot | Node.js, Grammy, SQLite |
| `guild-app/` | Dashboard | Next.js 16, React 19, RDT |
| `badge-manager/` | Scrypto blueprints | Rust, Scrypto 1.3.1 |
| `scripts/` | Tooling + tests | Node.js |

## Running Locally

### TG Bot

```bash
cd bot
cp .env.example .env  # Add your TG_BOT_TOKEN
npm install
node index.js
```

Requires: Node.js 20+, a Telegram bot token from [@BotFather](https://t.me/BotFather).

### Dashboard

The dashboard requires the [Radix dApp Toolkit](https://www.npmjs.com/package/@radixdlt/radix-dapp-toolkit) and connects to Radix Mainnet.

```bash
cd guild-app
npm install
npm run dev
```

Open `http://localhost:3000/guild`. Wallet connect requires a Radix Wallet (browser extension or mobile).

### Scrypto (Badge Manager)

Scrypto builds require Linux (the `blst` crate doesn't compile on Mac with Apple Clang). Use the VPS or a Linux VM.

```bash
cd badge-manager/scrypto/radix-badge-manager
scrypto build
```

Requires: Rust, [Scrypto toolchain](https://docs.radixdlt.com/docs/getting-rust-scrypto).

### Pipeline Tests

```bash
node scripts/pipeline-test.js
```

Runs 75 tests against the live API, dashboard, Gateway, escrow on-chain, data integrity, charter, bounties, game, CV2, and feedback. No local services needed.

## How to Contribute

### 1. Find an Issue

Browse [open issues](https://github.com/bigdevxrd/radix-community-projects/issues). Look for:
- `good first issue` — small, self-contained tasks
- `help-wanted` — community contributions welcome
- `community-proposal` — needs governance vote before building

### 2. Fork and Branch

```bash
git checkout -b feature/your-feature
```

### 3. Make Your Changes

- Follow existing code patterns (shadcn/ui components, Tailwind CSS for styling)
- Keep it minimal — don't add features beyond the issue scope
- Run `node scripts/pipeline-test.js` before submitting

### 4. Submit a PR

- Reference the issue number in your PR title (e.g., "fix: badge lookup error #42")
- Describe what changed and why
- Include before/after screenshots for UI changes

## Code Style

- **Bot**: CommonJS (`require`), async/await, SQLite parameterized queries
- **Dashboard**: TypeScript, React hooks, shadcn/ui + Tailwind CSS, dark/light mode
- **Scrypto**: Standard Rust, primitives-only function params across blueprint boundaries

## Proposing Features

Use the TG bot `/propose` command in the governance group to propose new features. Badge holders vote on proposals. Approved proposals get an issue created here.

Issues labeled `community-proposal` require a governance vote before implementation begins.

## Earning XP

Contributing earns XP on your Guild badge:
- Voting on proposals: 10 XP
- Creating a proposal: 25 XP
- Code contributions: awarded by admin based on scope

## Questions?

- [Telegram Group](https://t.me/rad_gov) — governance + discussion
- [GitHub Issues](https://github.com/bigdevxrd/radix-community-projects/issues) — bugs and features
- [RadixTalk](https://radixtalk.com) — longer-form discussion

## License

MIT — see [LICENSE](LICENSE).
