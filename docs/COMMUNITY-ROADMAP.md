# COMMUNITY-ROADMAP.md

Maps open GitHub issues to development phases. Flags which items need community consensus before implementation, which are pure engineering, and provides rough effort estimates.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🗳️ | Needs community vote / consensus before starting |
| 🔧 | Pure implementation — no governance needed |
| 🔬 | Research / exploration phase — outcome uncertain |
| ✅ | Complete |

---

## Phase 0: Foundation (Complete)

- ✅ SQLite database schema (users, proposals, votes, charter_params, bounties, game_state)
- ✅ Telegram bot with `/propose`, `/vote`, `/charter`, `/bounty`, `/game`
- ✅ Badge NFT on-chain (Radix mainnet)
- ✅ REST API (proposals, leaderboard, bounties, charter, badge verification)
- ✅ Next.js dashboard (proposals, badge card, tier progression, bounty board)
- ✅ Game dice system with XP rewards

---

## Phase 1: Handover & Stability (Current)

*Goal: Give the next maintainer everything they need to run, troubleshoot, and extend.*

| Issue | Type | Effort | Status |
|-------|------|--------|--------|
| Dashboard leaderboard page | 🔧 | S (2–4h) | ✅ Done (this PR) |
| SETUP-COMPLETE.md | 🔧 | S (2h) | ✅ Done (this PR) |
| API-REFERENCE.md | 🔧 | S (2h) | ✅ Done (this PR) |
| DEPLOYMENT-CHECKLIST.md | 🔧 | S (1h) | ✅ Done (this PR) |
| INCIDENTS.md | 🔧 | S (2h) | ✅ Done (this PR) |
| DECISIONS.md | 🔧 | S (1h) | ✅ Done (this PR) |
| Automated DB backup cron | 🔧 | S (1h) | ⬜ Pending |
| UptimeRobot / healthcheck setup | 🔧 | S (1h) | ⬜ Pending |

---

## Phase 2: DAO Activation

*Goal: Complete the charter voting process and make the DAO self-governing.*

| Item | Type | Effort | Notes |
|------|------|--------|-------|
| Vote on 6 foundation charter params | 🗳️ | — | Requires community, no code |
| Vote on 20 configuration charter params | 🗳️ | — | Auto-unlocks after foundation |
| First RAC election | 🗳️ M (1 week) | Needs election quorum param first |
| First bounty fund | 🗳️ | M (1 week) | Needs treasury limit params first |
| CrumbsUp proposal sync (#44) | 🗳️ 🔧 | M (1–2 days) | Needs consensus on ratification pipeline design |
| Define voting governance model (#45) | 🗳️ | — | Pure community discussion, no code |

**What needs community consensus first:**
- Should off-chain votes be binding or advisory? → Issue #45
- How does CrumbsUp integrate with on-chain proposals? → Issue #44
- What's the quorum threshold? → Charter param `quorum`

---

## Phase 3: Feature Expansion

*Goal: Add capabilities that improve participation and engagement.*

| Item | Type | Effort | Notes |
|------|------|--------|-------|
| Consultation v2 integration (#43) | 🔬 🔧 | L (1–2 weeks) | Depends on Radix Blueprint availability |
| Integrate Muan Protocol | 🔬 | L | External dependency; track their roadmap |
| Multi-sig escrow (trustless bounties) | 🗳️ 🔧 | L (1–2 weeks) | Needs community vote on escrow model |
| On-chain voting weight by XP tier | 🗳️ 🔧 | M (3–5 days) | Needs governance vote; changes power dynamics |
| Discord / forum cross-posting | 🔧 | S (1 day) | Can build anytime |
| Proposal templates (pre-filled forms) | 🔧 | S (1 day) | Low-hanging fruit for UX |
| Mobile-optimised dashboard | 🔧 | M (2–3 days) | Pure frontend work |

---

## Effort Scale

| Size | Hours |
|------|-------|
| S (small) | < 4h |
| M (medium) | 1–3 days |
| L (large) | 1–2 weeks |

---

## Contribution Guide

**Want to pick something up?**

1. Comment on the relevant GitHub issue: "I'd like to work on this"
2. For 🗳️ items: start a discussion in the guild Telegram or RadixTalk before writing code
3. For 🔧 items: fork → branch → PR → request review
4. See [CONTRIBUTING.md](../CONTRIBUTING.md) for code style and PR process

**Questions?** Ask in the [Telegram bot chat](https://t.me/radix_guild_bot) or open a GitHub Discussion.
