# Plan: CV2 On-Chain Governance + TG Bot Integration

## Context

The Foundation's Consultation v2 repo (`radixdlt/consultation_v2`) is complete but NOT deployed to mainnet (6 weeks dormant, addresses = `TODO`). We forked it to `bigdevxrd/consultation_v2`. This plan deploys it ourselves and integrates it with the governance bot — giving the Radix community the first operational on-chain governance system.

**What this unlocks:** Two-tier governance — fast off-chain temp checks in TG + formal on-chain voting with XRD/badge-weighted tallying. Composable with our BadgeManager.

## Architecture: 4 Separate Components (Siloed)

```
┌──────────────────────────────────────────────────────────┐
│                    RADIX LEDGER                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ BadgeManager  │  │  Governance   │  │ VoteDelegation│  │
│  │ (our v4)     │  │  (CV2 fork)   │  │ (CV2 fork)   │  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                    │                   │
         │    Gateway API     │                   │
         ▼                    ▼                   ▼
┌──────────────────────────────────────────────────────────┐
│                   GUILD VPS                              │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Guild Bot   │  │ Vote         │  │ CV2 Frontend   │  │
│  │  (Grammy)    │  │ Collector    │  │ (React/Vite)   │  │
│  │  port 3003   │  │ (Hono)       │  │ port 3000      │  │
│  │              │  │ port 3001    │  │                │  │
│  │  SQLite      │  │              │  │                │  │
│  │  (off-chain) │  │ PostgreSQL   │  │                │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│         │                │                   │           │
│         └────── Caddy (443) ─────────────────┘           │
│           /api/* → 3003                                  │
│           /gov/* → 3000 (CV2 frontend)                   │
│           /gov-api/* → 3001 (vote collector)             │
│           /guild/* → 3002 (dashboard)                    │
└──────────────────────────────────────────────────────────┘
```

## Phase 1: Deploy CV2 Scrypto to Mainnet (1 week)

### What to deploy
Two blueprints from the fork:
- **Governance** — temperature checks + proposals + on-chain vote recording
- **VoteDelegation** — delegate voting power to another account

### Steps
1. Clone fork locally, build Scrypto on VPS (blst crate needs Linux)
2. Upload WASM+RPD via Radix Dashboard
3. Instantiate Governance component (set initial GovernanceParameters)
4. Instantiate VoteDelegation component
5. Create admin/owner badge
6. Update `packages/shared/src/governance/config.ts` with real addresses
7. Test: create temp check, vote, verify on-chain

### GovernanceParameters (initial values — community can vote to change)
```
temperature_check_days: 3
temperature_check_quorum: 1000 (XRD)
temperature_check_approval_threshold: 0.5 (50%)
proposal_length_days: 7
proposal_quorum: 5000 (XRD)
proposal_approval_threshold: 0.5 (50%)
```

### Composability with BadgeManager
- CV2 votes are account-based (not badge-based)
- Off-chain vote-collector can weight votes by badge tier
- No conflicts — separate resource domains
- Integration: vote-collector reads both CV2 votes AND badge holdings

## Phase 2: Self-Host CV2 dApp (1 week)

### Docker services (on guild VPS)
```
docker-compose.production.yml:
  - consultation (React frontend, port 3000)
  - vote-collector (Hono API, port 3001)
  - postgres (PostgreSQL 17, port 5432)
  - certbot (auto SSL)
```

### Resource requirements
- PostgreSQL: ~200MB RAM, ~1GB disk
- Vote collector: ~100MB RAM, polls Gateway every 60s
- Frontend: ~50MB RAM (static after build)
- **Total additional: ~500MB RAM** (VPS has plenty at 5% disk, low load)

### Caddy routing (add to existing)
```
/gov/* → localhost:3000 (CV2 frontend)
/gov-api/* → localhost:3001 (vote collector)
```

### Database
- Separate PostgreSQL instance (Docker)
- Tables: vote_calculation_state, vote_calculation_results, vote_calculation_account_votes
- Drizzle ORM migrations run on startup

## Phase 3: Bot Integration — Pluggable Module (1 week)

### New file: bot/services/consultation.js
Feature-flagged behind `CV2_ENABLED=true` env var.

**Functions:**
- `syncFromChain()` — polls Gateway for CV2 proposals + votes (every 5 min)
- `getProposals()` — returns synced proposals from local cache
- `getVoteResults(proposalId)` — returns tallied results from vote-collector API
- `getProposalDetail(id)` — full detail with vote breakdown

**Database additions (conditional on CV2_ENABLED):**
```sql
CREATE TABLE cv2_proposals (
  id TEXT PRIMARY KEY,
  type TEXT, -- 'temperature_check' or 'proposal'
  title TEXT,
  description TEXT,
  status TEXT,
  vote_start INTEGER,
  vote_end INTEGER,
  synced_at INTEGER
);

CREATE TABLE cv2_votes (
  proposal_id TEXT,
  voter_address TEXT,
  vote TEXT,
  vote_power REAL,
  synced_at INTEGER,
  PRIMARY KEY (proposal_id, voter_address)
);
```

### Bot commands: /cv2 group
```
/cv2              — list active network consultations
/cv2 <id>         — detail + current vote counts
/cv2 vote <id>    — link to CV2 frontend for on-chain voting
/cv2 sync         — force refresh from chain (admin)
/cv2 status       — sync health + last poll time
```

### API endpoints: /api/cv2/*
```
GET /api/cv2/proposals          — list all synced proposals
GET /api/cv2/proposals/:id      — detail + vote results
GET /api/cv2/status             — sync health
```

### Dashboard integration
- New section on /guild/proposals: "Network Governance"
- Clear labels: "Guild Vote (off-chain, free)" vs "Network Vote (on-chain, XRD-weighted)"
- Link to CV2 frontend for on-chain voting

## Separation of Concerns (Siloed Architecture)

| Component | Repo | Data | Can disable? |
|-----------|------|------|-------------|
| **Guild Bot** | radix-community-projects | SQLite (proposals, votes, XP, bounties, game) | Core — always on |
| **Guild Dashboard** | radix-community-projects/guild-app | Reads bot API | Core — always on |
| **BadgeManager** | radix-community-projects/badge-manager | On-chain (Scrypto) | Core — always on |
| **CV2 Governance** | consultation_v2 (fork) | On-chain (Scrypto) | `CV2_ENABLED` flag |
| **Vote Collector** | consultation_v2 (fork) | PostgreSQL | Only if CV2 enabled |
| **CV2 Frontend** | consultation_v2 (fork) | Reads vote collector API | Only if CV2 enabled |
| **Grid Game** | radix-grid-game (separate repo) | SQLite (game_state) | `GAME_ENABLED` flag |

**Key principle:** Each component can be deployed, updated, or removed independently. The guild bot works without CV2. CV2 works without the guild bot. The grid game is a separate repo entirely.

## Handover Readiness

When the public repo is handed over:
1. **Guild bot + dashboard** — community maintains radix-community-projects
2. **CV2 fork** — community maintains consultation_v2 (or merges upstream if Foundation deploys)
3. **Grid game** — community maintains radix-grid-game
4. **Private fork** — guild-saas stays with Big Dev for SaaS development
5. **On-chain components** — admin badges transferred to elected RAC

## Implementation Order

| Week | What | Repo | Effort |
|------|------|------|--------|
| **1** | Deploy CV2 Scrypto to mainnet | consultation_v2 | Build + deploy |
| **1** | Create consultation.js service (feature-flagged) | radix-community-projects | 1 day |
| **2** | Self-host CV2 dApp (Docker) | consultation_v2 | 2 days |
| **2** | Bot /cv2 commands + /api/cv2 endpoints | radix-community-projects | 1 day |
| **2** | Dashboard "Network Governance" section | radix-community-projects | 1 day |
| **3** | Custom vote-collector with badge-tier weighting | consultation_v2 | 3 days |
| **3** | Vote delegation bot commands | radix-community-projects | 2 days |
| **3** | End-to-end testing + documentation | both repos | 2 days |

## Copilot Tasks (parallel)

1. **CV2 frontend customization** — rebrand for Guild, add badge display
2. **Dashboard /cv2 widget** — show network proposals alongside guild proposals
3. **Vote-collector badge integration** — read BadgeManager for vote weighting

## Verification

1. Create temperature check on-chain via CV2 frontend
2. Vote on it with Radix Wallet
3. Vote-collector polls and shows results
4. Bot `/cv2` command displays the proposal
5. Dashboard shows it in "Network Governance" section
6. Badge-tier weighting applies to vote tallying
7. Temperature check passes → admin elevates to formal proposal
8. Full cycle: temp check → proposal → vote → tally → result
9. Pipeline tests still 19/19 (CV2 is additive, not breaking)

## Critical Files

| File | Change |
|------|--------|
| `bot/services/consultation.js` | NEW — CV2 service module |
| `bot/db.js` | ADD cv2_proposals + cv2_votes tables (conditional) |
| `bot/index.js` | ADD /cv2 commands (conditional) |
| `bot/services/api.js` | ADD /api/cv2/* endpoints (conditional) |
| `guild-app/src/app/proposals/page.tsx` | ADD "Network Governance" section |
| `guild-app/src/lib/constants.ts` | ADD CV2 config vars |
| `consultation_v2/packages/shared/src/governance/config.ts` | UPDATE mainnet addresses |
