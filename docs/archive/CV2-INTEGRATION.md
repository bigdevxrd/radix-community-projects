# CV2 Integration — Technical Plan

## Status: READY TO FORK AND DEPLOY

### Key Finding (April 5, 2026)

The Foundation's CV2 repo (`github.com/radixdlt/consultation_v2`) is **complete but NOT deployed to mainnet**. Last commit: Feb 24, 2026. Mainnet config has `TODO` addresses. No active development.

We forked it to `github.com/bigdevxrd/consultation_v2`.

### What CV2 Contains

```
scrypto/              → Governance + VoteDelegation blueprints
apps/consultation/    → React frontend (TanStack Router + Vite)
apps/vote-collector/  → Backend (Hono + Effect + SST)
packages/database/    → PostgreSQL (Drizzle ORM)
packages/shared/      → Governance config (addresses, types)
```

Tech: pnpm monorepo, turbo task runner, Docker + nginx for self-hosting.

### Integration Path

**Phase 1: Deploy Scrypto to mainnet (1 week)**
- Build CV2 governance + vote delegation blueprints
- Deploy to Radix mainnet via Dashboard
- Update `packages/shared/src/governance/config.ts` with real addresses
- Test on mainnet: create proposal, cast vote, tally

**Phase 2: Self-host the dApp (1 week)**
- Use `self-hosted` branch / docker-compose
- PostgreSQL for vote collector
- Deploy to guild VPS or separate small VPS
- Point at our mainnet governance component

**Phase 3: Bot integration (1 week)**
- Read governance component state via Gateway API
- Display CV2 proposals in bot `/cv2` command
- Show on dashboard alongside Guild proposals
- Clear labels: "Guild Vote (off-chain)" vs "Network Vote (on-chain)"

### What This Gives Us

- **On-chain voting** for formal decisions (XRD-weighted)
- **Temperature checks stay in TG** (free, fast, off-chain)
- **Two-tier governance**: community sentiment (TG) → formal ratification (CV2)
- **Composable**: any Radix dApp can read our governance state

### Resources

| Resource | URL |
|----------|-----|
| Foundation repo | github.com/radixdlt/consultation_v2 |
| Our fork | github.com/bigdevxrd/consultation_v2 |
| Scrypto blueprint | github.com/gguuttss/consultation-blueprint |
| Product scope | radixtalk.com/t/consultation-v2-product-scope-document/2193 |
