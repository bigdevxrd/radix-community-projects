# 14 — Task Lifecycle UX Architecture

> The full journey: create → fund → claim → deliver → verify → pay
> Must work from dashboard AND Telegram. One source of truth.

## The Problem

The task lifecycle is fragmented across TG bot and dashboard with no unified view:

| Action | Dashboard | Telegram | On-Chain |
|--------|-----------|----------|----------|
| Create task | ❌ | `/bounty create` | ❌ |
| Fund task | Fund button (buggy) | `/bounty fund <tx_hash>` | `create_task` on escrow |
| Claim task | ❌ | `/bounty claim` | `claim_task` on escrow |
| Submit work | ❌ | `/bounty submit <pr>` | `submit_task` on escrow |
| Verify | ❌ | `/bounty verify` (admin) | — |
| Release payment | ❌ | `/bounty pay` (admin) | `release_task` on escrow |
| Cancel/refund | ❌ | `/bounty cancel` | `cancel_task` on escrow |

Users can't complete the full lifecycle from either channel alone. The dashboard is mostly read-only. The bot can't trigger wallet TXs.

## Target Architecture

### Principle: Two interfaces, one truth

The on-chain escrow component is the source of truth for funds. The SQLite DB is the source of truth for metadata (title, description, PR links, reports). Both channels (dashboard + TG) read from and write to the same backends.

### The Flow

```
                    DASHBOARD                         TELEGRAM
                    (wallet TX)                       (bot commands)
                        │                                 │
  ┌─────────────────────┼─────────────────────────────────┼──────────────┐
  │                     ▼                                 ▼              │
  │              ┌─────────────┐                  ┌─────────────┐       │
  │              │  Create &   │                  │   /bounty   │       │
  │              │  Fund Task  │                  │   create    │       │
  │              │  (one step) │                  │  (DB only)  │       │
  │              └──────┬──────┘                  └──────┬──────┘       │
  │                     │                                │              │
  │                     │  TX manifest                   │  Then fund   │
  │                     │  → wallet signs                │  separately  │
  │                     │  → escrow vault                │              │
  │                     ▼                                ▼              │
  │              ┌─────────────────────────────────────────┐            │
  │              │          ESCROW COMPONENT               │            │
  │              │     (on-chain source of truth)          │            │
  │              │                                         │            │
  │              │  Vaults: per-task XRD isolation          │            │
  │              │  Receipt NFTs: proof of creation         │            │
  │              │  Events: TaskCreated/Claimed/Released    │            │
  │              └────────────────┬────────────────────────┘            │
  │                               │                                     │
  │                     ┌─────────▼─────────┐                          │
  │                     │  GATEWAY WATCHER   │                          │
  │                     │  (every 60s)       │                          │
  │                     │  Auto-syncs events │                          │
  │                     │  to SQLite DB      │                          │
  │                     └─────────┬──────────┘                          │
  │                               │                                     │
  │                     ┌─────────▼─────────┐                          │
  │                     │   SQLite DB        │                          │
  │                     │   (metadata truth) │                          │
  │                     │   title, desc, PR  │                          │
  │                     │   status, assignee │                          │
  │                     └─────────┬──────────┘                          │
  │                               │                                     │
  │              ┌────────────────┼────────────────┐                   │
  │              ▼                                 ▼                    │
  │       ┌─────────────┐                  ┌─────────────┐             │
  │       │  Dashboard   │                  │  Bot API    │             │
  │       │  /bounties   │                  │  /api/*     │             │
  │       │  /bounties/id│                  │  TG replies │             │
  │       └─────────────┘                  └─────────────┘             │
  └────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Dashboard Fund (NOW — fix and verify)

The fund button exists. Fix the post-TX flow (done). Test with real XRD.

**Dashboard creates + funds in one step:**
1. User fills form: title, reward, description
2. Dashboard builds TX manifest: withdraw XRD → create_task on escrow
3. Wallet signs → XRD locked in vault
4. Gateway watcher detects event → creates SQLite record
5. Task appears on bounty board as "funded"

**TG creates then funds separately:**
1. `/bounty create 200 Title` → SQLite record (unfunded)
2. User funds via Radix Wallet manually
3. `/bounty fund <id> <tx_hash>` → bot verifies TX → marks funded
4. OR: gateway watcher auto-detects → marks funded

### Phase 2: Dashboard Claim + Submit (needs lightweight auth)

**Claim from dashboard:**
1. User clicks "Claim" on funded task
2. Dashboard builds TX manifest: create_proof_of_badge → claim_task on escrow
3. Wallet signs → task assigned on-chain
4. Gateway watcher syncs → SQLite updated

**Submit from dashboard:**
1. User fills form: PR URL, notes
2. Dashboard builds TX manifest: create_proof_of_badge → submit_task on escrow
3. Wallet signs → status updated on-chain
4. Gateway watcher syncs

**Key insight:** For on-chain actions (fund, claim, submit), the TX IS the authentication. No ROLA needed. The wallet signature proves ownership. Same pattern CV2 uses.

For off-chain actions (create proposal, vote off-chain, file report), we need some form of session auth. But those can wait.

### Phase 3: Verification + Release

**PR merge auto-verify (already built):**
1. Worker submits PR URL
2. PR watcher checks every 5 min
3. PR merged → task auto-verified in DB
4. Admin (or future: bot signer) calls release_task on escrow
5. XRD flows to worker

**Manual verify (current):**
1. Admin runs `/bounty verify <id>` + `/bounty pay <id> <tx_hash>`
2. Admin signs release_task TX via Radix Wallet

### Phase 4: Full Dashboard (future)

- Create task from dashboard (form → wallet TX → escrow)
- My Tasks view (created, claimed, submitted — all in one tab)
- Task lifecycle status bar (visual: funded → claimed → submitted → verified → paid)
- Escrow receipt NFT display (show what's in user's wallet)
- Budget tracking per working group

## API Endpoints Needed

### Existing (working)
- `GET /api/bounties` — list all tasks
- `GET /api/bounties/:id` — task detail
- `GET /api/escrow` — escrow stats (SQLite + on-chain)
- `GET /api/groups/:id/tasks` — tasks per working group

### Needed for Phase 2
- `POST /api/bounties/:id/claim` — record claim (after on-chain TX verified)
- `POST /api/bounties/:id/submit` — record submission (PR URL + notes)
- `GET /api/bounties/my/:address` — tasks where user is creator or assignee

### Needed for Phase 4
- `POST /api/bounties/create` — create task with metadata (before or after escrow TX)
- `GET /api/profile/:address` — all user activity (tasks, votes, groups, trust)

## TX Manifests Needed

### Existing
- `createEscrowTaskManifest` — fund a task (withdraw XRD → create_task)

### Needed
- `claimTaskManifest` — claim a task (badge proof → claim_task)
- `submitTaskManifest` — submit work (badge proof → submit_task)
- `cancelTaskManifest` — cancel and refund (receipt proof → cancel_task)
- `releaseTaskManifest` — release payment (verifier proof → release_task)

## The "My Tasks" View

Every user needs a single view showing:

```
MY TASKS
├── Created by me
│   ├── Task #1 — "Fix layout" — 200 XRD — FUNDED — 2 claims
│   └── Task #2 — "Write docs" — 50 xUSDC — UNFUNDED
│
├── Claimed by me  
│   ├── Task #5 — "API endpoint" — 300 XRD — IN PROGRESS — PR: github.com/...
│   └── Task #8 — "Design banner" — 100 XRD — SUBMITTED — awaiting verify
│
└── Completed
    ├── Task #3 — "Bug fix" — 150 XRD — PAID — TX: txid_rdx1...
    └── Task #6 — "Testing" — 75 XRD — PAID — TX: txid_rdx1...
```

This comes from `GET /api/bounties/my/:address` which resolves wallet → tg_id → all related bounties.
