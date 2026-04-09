# Next Steps — 4 Major Builds

> Updated: 2026-04-10 | Post-escrow deployment
> Priority order: ROLA → Escrow V3 → Dashboard Writes → Conviction Voting

---

## 1. ROLA Integration (Cryptographic Wallet Auth)

**What:** Replace "connect and trust" with cryptographic proof of wallet ownership on the dashboard. Backend verifies signed challenges against on-chain owner_keys.

**Why:** Currently the dashboard trusts whatever wallet address RDT returns. ROLA adds real authentication — the user proves they control the wallet. Foundation for all identity tiers.

**Build:**
- [ ] Install `@radixdlt/rola` on bot backend
- [ ] `GET /api/challenge` — generate 32-byte challenge, store with 5-min TTL
- [ ] `POST /api/verify` — verify signed challenge, issue JWT session
- [ ] Update `useWallet.tsx` — add `DataRequestBuilder.persona().withProof()` + challenge flow
- [ ] Session management — JWT in httpOnly cookie, trust tier embedded
- [ ] Trust score auto-loaded on authenticated sessions

**Files to change:**
- `bot/services/api.js` — 2 new endpoints
- `guild-app/src/hooks/useWallet.tsx` — ROLA challenge flow
- `guild-app/src/lib/auth.ts` — new session management utility
- `package.json` — add `@radixdlt/rola` dependency

**Effort:** 1-2 sessions | **Impact:** High — enables real auth for all future features

---

## 2. Escrow V3 (Multi-Token Support)

**What:** Deploy a new TaskEscrow that accepts XRD, fUSD, hUSDC, wUSDC. Per-token minimum deposits. $5 stablecoin minimum stays stable regardless of XRD price.

**Why:** V2 is XRD-only. Task creators want to fund in stablecoins so the reward value doesn't fluctuate. This also makes the guild accessible to projects that hold stablecoins.

**Build:**
- [ ] Modify Scrypto: `accepted_tokens: KeyValueStore<ResourceAddress, bool>`
- [ ] Per-token minimums: `min_deposits: KeyValueStore<ResourceAddress, Decimal>`
- [ ] Fee vaults per token: `fee_vaults: KeyValueStore<ResourceAddress, Vault>`
- [ ] Admin methods: `add_accepted_token()`, `update_token_min_deposit()`
- [ ] Build + deploy as new package (V2 stays live for existing tasks)
- [ ] Wire bot + dashboard to V3 component address
- [ ] Update manifests for multi-token support

**Files to change:**
- `badge-manager/scrypto/task-escrow/src/lib.rs` — major rewrite
- `bot/services/gateway.js` — read V3 component state
- `bot/index.js` — `/bounty fund` points to V3
- `guild-app/src/lib/constants.ts` — V3 component address
- New TX manifests for each token type

**Effort:** 2-3 sessions | **Impact:** High — stablecoin funding, price stability

---

## 3. Dashboard Write Operations (#75)

**What:** Create proposals, vote, claim tasks, and fund escrow directly from the web dashboard — currently these all require Telegram.

**Why:** The dashboard is read-only except for minting. Contributors who don't use Telegram can't participate in governance or claim tasks. This is the biggest UX gap.

**Build (prioritised):**
- [ ] **Vote from dashboard** — TX manifest calls the off-chain vote endpoint (or builds on-chain CV2 TX)
- [ ] **Create proposal from dashboard** — form → API POST → proposal created
- [ ] **Claim task from dashboard** — "Claim" button → calls API with wallet proof
- [ ] **Fund task from dashboard** — "Fund" button → TX manifest for escrow deposit → wallet signs
- [ ] **Submit work from dashboard** — form with URL/description → API POST

**Requires:** ROLA (step 1) for authenticated sessions. Can't let anonymous users create proposals.

**Files to change:**
- `guild-app/src/app/proposals/page.tsx` — add create/vote forms
- `guild-app/src/app/bounties/[id]/page.tsx` — add claim/fund/submit buttons
- `bot/services/api.js` — new POST endpoints (proposals, votes, claims)
- `bot/db.js` — ensure all write functions accept web-originated requests

**Effort:** 3-4 sessions | **Impact:** Very high — makes dashboard a full governance tool

---

## 4. Conviction Voting Component (Scrypto)

**What:** On-chain voting where conviction accumulates over time. The longer you support a proposal, the more weight your vote carries. Changing your vote resets the accumulation.

**Why:** Anti-sybil by design — time can't be faked. No identity system needed for the base mechanism. Best for fund allocation decisions where proposals compete for a shared pool.

**Build:**
- [ ] Scrypto blueprint: `ConvictionVoting`
  - `stake(proposal_id, xrd_bucket)` — stake XRD on a proposal
  - `unstake(proposal_id)` — remove support (conviction resets)
  - `get_conviction(proposal_id)` — current conviction level
  - `check_threshold(proposal_id)` — has conviction crossed the pass threshold?
  - Conviction formula: `conviction += staked_amount * time_since_last_update`
  - Half-life curve: conviction decays if unstaked
- [ ] Integrate with badge tiers — Silver/Gold get conviction multiplier
- [ ] Dashboard display — conviction bars, time-to-threshold estimates
- [ ] Bot commands — `/conviction stake`, `/conviction status`

**Files to change:**
- `badge-manager/scrypto/conviction-voting/` — new Scrypto package
- `bot/services/gateway.js` — read conviction state from chain
- `guild-app/src/app/proposals/page.tsx` — conviction UI
- `bot/index.js` — conviction bot commands

**Effort:** 3-4 sessions | **Impact:** High — anti-sybil voting, differentiator

---

## Dependency Chain

```
ROLA (1) → Dashboard Writes (3)
              ↓
Escrow V3 (2) — independent, can parallel with ROLA
              ↓
Conviction Voting (4) — independent, can parallel with Dashboard Writes
```

ROLA first (enables auth for everything). Escrow V3 can run in parallel.
Dashboard Writes after ROLA. Conviction Voting after Writes.

---

## Current State (for reference)

- 75/75 tests passing
- 0 bounties (seed data cleaned)
- TaskEscrow v2 on mainnet (XRD only, 1 XRD min, 2.5% fee)
- Trust scores live (Bronze/Silver/Gold)
- 37 bot commands, 33 API endpoints, 14 pages
- 6 public docs + archive
- Bot hardened (global error handlers, all callbacks wrapped)
