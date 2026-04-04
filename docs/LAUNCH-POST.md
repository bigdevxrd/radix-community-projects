# Radix Guild — Community Governance Infrastructure

**TL;DR:** Free on-chain badges, badge-gated voting via Telegram, open source dashboard. Join the Guild.

---

## What Is This?

Radix Guild is community governance infrastructure — a framework for making decisions together on Radix.

- **Badge** = your membership. Free to mint, lives in your wallet as an NFT.
- **Bot** = your voice. Propose ideas, vote on them, earn XP — all in Telegram.
- **Dashboard** = your view. See proposals, check your badge, manage tiers.

No token. No fundraise. Just tools for coordination.

## How It Works

1. **Connect** your Radix Wallet at the dashboard
2. **Mint** a free Guild badge (on-chain NFT)
3. **Register** your wallet with the TG bot (`/register`)
4. **Propose** ideas (`/propose`), **vote** on them (inline buttons)
5. **Earn XP** — voting, proposing, contributing. XP determines your tier and voting weight.

Tiers: Member (1x) → Contributor (2x) → Builder (3x) → Steward (5x) → Elder (10x)

## What's Live

| Component | Status |
|-----------|--------|
| Badge Manager (Scrypto, mainnet) | Live |
| Telegram Bot (@radix_guild_bot) | Live |
| Dashboard (mint, proposals, admin) | Live |
| Badge API (public REST) | Live |
| CrumbsUp DAO | Active |

## What's Next (Community Decides)

These are the first real governance proposals:
- Voting duration: 48h / 72h / 7 days?
- Minimum quorum for proposals?
- Should we bid on the Gateway RFP?
- Custom domain?
- Validator node?

## Open Source

Everything is MIT licensed. PRs welcome.

- **GitHub:** github.com/bigdevxrd/radix-community-projects
- **CONTRIBUTING.md:** Setup guide, code style, how to earn XP

## Bounties

Looking for community help with:
- Record a 2-3 min demo video (10 XP)
- Design a Guild logo/icon (25 XP)
- Test the mint flow and report bugs (10 XP)

## Tech Stack

- **Smart Contracts:** Scrypto 1.3.1 (BadgeFactory + BadgeManager)
- **Bot:** Grammy (Telegram), SQLite, Node.js
- **Dashboard:** Next.js 16, React 19, Tailwind CSS v4, Radix dApp Toolkit
- **Infrastructure:** Caddy, PM2, automated backups

## Links

- Bot: @radix_guild_bot
- CrumbsUp DAO: crumbsup.io (search "Guild")
- GitHub: github.com/bigdevxrd/radix-community-projects

---

*Built by Big Dev. Hosted for 12 months. Open to all.*
