# Badge Manager

Identity layer for Radix community governance. Mint, manage, and track badges across DAOs.

## Status: Phase 1 — Building

## What It Does

- **BadgeFactory** — Deploy once, create unlimited badge managers
- **ManagedBadgeManager** — Mint, revoke, update tiers, track stats
- **UniversalBadgeData** — Typed core fields + extensible extra_data JSON
- **Free mint** — Zero cost badge for every new user

## Build

```bash
cd scrypto/sats_badge_factory
scrypto build
scrypto test
```

## Demo

See `demo/index.html` — single-file dApp with Radix Wallet connect and badge explorer.
