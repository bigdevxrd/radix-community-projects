# Scrypto Knowledge Base — Master Index

> **Purpose**: Single source of truth for all Scrypto code, patterns, and resources.
> Agents should read this file first when any task mentions Scrypto, blueprints, or on-chain components.

## Quick Navigation

| Document | What It Covers |
|----------|---------------|
| [AGENT-ONBOARDING.md](./AGENT-ONBOARDING.md) | Start here — quick-start for agents new to Scrypto |
| [PATTERNS.md](./PATTERNS.md) | Scrypto idioms, patterns, and best practices from our codebase |
| [MANIFESTS.md](./MANIFESTS.md) | Transaction manifest patterns and examples |
| [DEPLOYED-ADDRESSES.md](./DEPLOYED-ADDRESSES.md) | All mainnet addresses and component map |
| [EXTERNAL-REPOS.md](./EXTERNAL-REPOS.md) | Official and community Scrypto repos |
| [BLUEPRINT-CATALOG.md](./BLUEPRINT-CATALOG.md) | Detailed catalog of every blueprint we own |

---

## Our Scrypto Blueprints (In-Repo)

### 1. BadgeManager + BadgeFactory
- **Location**: `badge-manager/scrypto/radix-badge-manager/`
- **Source**: `src/lib.rs` (472 lines, 2 blueprints)
- **Tests**: `tests/lib.rs` (268 lines, 11 tests)
- **Scrypto Version**: 1.3.1
- **Status**: ✅ Live on Mainnet
- **What it does**: Permissionless badge infrastructure — Factory deploys managers, managers mint/revoke/update NFT badges with XP, tiers, and extensible metadata.

### 2. TaskEscrow
- **Location**: `badge-manager/scrypto/task-escrow/`
- **Source**: `src/lib.rs` (401 lines, 1 blueprint)
- **Tests**: `tests/escrow_test.rs` (191 lines, 8 tests)
- **Deploy Guide**: `DEPLOY.md`
- **Scrypto Version**: 1.3.1
- **Status**: ✅ Live on Mainnet
- **What it does**: On-chain escrow for task marketplace. Per-task vaults, badge-gated claiming, fee-on-release, receipt NFTs for cancellation.

### 3. ConvictionVoting (Designed, Not Yet Coded)
- **Spec**: `docs/architecture/04-CONVICTION-VOTING.md`
- **Status**: 📋 Architecture complete, implementation pending
- **What it does**: Time-weighted staking governance. Conviction accumulates exponentially, threshold scales with pool request size. Badge tier multipliers.

### 4. TaskEscrow V3 — Multi-Token (Designed, Not Yet Coded)
- **Spec**: `docs/architecture/02-ESCROW-V3.md`
- **Status**: 📋 Architecture complete, implementation pending
- **What it does**: Extends TaskEscrow to accept any whitelisted fungible token, not just XRD. Per-token fee vaults, per-token minimums.

---

## Frontend Integration Points

| File | What It Does |
|------|-------------|
| `guild-app/src/lib/manifests.ts` | Transaction manifest builders (publicMint, adminMint, updateTier, updateXp, revokeBadge, CV2 governance, escrow CRUD) |
| `guild-app/src/lib/constants.ts` | All on-chain addresses, schema configs, tier colors, XP thresholds, royalties |
| `bot/services/gateway.js` | Gateway API client — hasBadge, getBadgeData, getEscrowStats, verifyEscrowTx |

---

## Architecture Documents with Scrypto Content

| Doc | Key Scrypto Content |
|-----|-------------------|
| `docs/architecture/01-ROLA-AUTH.md` | ROLA challenge-response for wallet authentication |
| `docs/architecture/02-ESCROW-V3.md` | Multi-token escrow struct changes, new admin methods, fee vault architecture |
| `docs/architecture/03-DASHBOARD-WRITES.md` | Manifest-based write operations from dashboard, trust-gated actions |
| `docs/architecture/04-CONVICTION-VOTING.md` | Full Scrypto data structures, methods, mathematical model for conviction voting |
| `docs/architecture/05-VERIFICATION-SYSTEM.md` | PR-merged verification flow, multi-party consensus design |
| `docs/architecture/06-CV3-EVOLUTION.md` | CV3 pipeline: proposal → approval → funding → delivery → verification |
| `docs/architecture/07-GATEWAY-WATCHER.md` | Gateway API polling patterns for on-chain state |

---

## Build & Test

```bash
# Badge Manager
cd badge-manager/scrypto/radix-badge-manager
scrypto build
scrypto test

# Task Escrow
cd badge-manager/scrypto/task-escrow
scrypto build
scrypto test
```

Requires: Scrypto toolchain 1.3.1 (`scrypto` CLI installed via `radixdlt/scryptoenv`).
