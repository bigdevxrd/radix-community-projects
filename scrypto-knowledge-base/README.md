# Scrypto Knowledge Base

> **Single source of truth for all Scrypto code, patterns, resources, and on-chain addresses.**

This directory compiles everything an agent (or developer) needs to be immediately productive with Scrypto in this project. Start with [INDEX.md](./INDEX.md).

## Contents

| File | Purpose | Read When |
|------|---------|-----------|
| [INDEX.md](./INDEX.md) | Master catalog — links everything | Always start here |
| [AGENT-ONBOARDING.md](./AGENT-ONBOARDING.md) | Quick-start for agents new to Scrypto | First time touching Scrypto code |
| [PATTERNS.md](./PATTERNS.md) | Scrypto idioms and best practices from our code | Writing or reviewing blueprints |
| [MANIFESTS.md](./MANIFESTS.md) | Transaction manifest patterns and examples | Working on frontend → on-chain integration |
| [DEPLOYED-ADDRESSES.md](./DEPLOYED-ADDRESSES.md) | All mainnet addresses and environment config | Deploying, configuring, or debugging |
| [EXTERNAL-REPOS.md](./EXTERNAL-REPOS.md) | Official and community Scrypto repositories | Looking for examples or patterns |
| [BLUEPRINT-CATALOG.md](./BLUEPRINT-CATALOG.md) | Full API reference for every blueprint we own | Implementing new features or integrations |

## Our Blueprints

| Blueprint | Status | Lines | Tests |
|-----------|--------|-------|-------|
| BadgeFactory + BadgeManager | ✅ Mainnet | 472 | 11 |
| TaskEscrow | ✅ Mainnet | 401 | 8 |
| ConvictionVoting | 📋 Spec only | — | — |
| TaskEscrow V3 (multi-token) | 📋 Spec only | — | — |

## Quick Links

- **Source code**: `badge-manager/scrypto/`
- **Architecture docs**: `docs/architecture/`
- **Frontend manifests**: `guild-app/src/lib/manifests.ts`
- **On-chain constants**: `guild-app/src/lib/constants.ts`
- **Gateway client**: `bot/services/gateway.js`
