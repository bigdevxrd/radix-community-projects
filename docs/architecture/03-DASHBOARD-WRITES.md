I now have a complete picture. Here is the full architecture plan.

---

## Dashboard Write Operations System -- Architecture Specification

### 1. Current State Summary

The system today consists of:
- A **Next.js guild-app** that is almost entirely read-only. The only write operations are CV2 temperature check creation/voting (on-chain TX manifests via `rdt.walletApi.sendTransaction`) and bounty creation (unauthenticated POST to `/api/bounties` which hardcodes an admin TG ID).
- A **Node.js bot API** (`bot/services/api.js`) that serves JSON over HTTP, allows `GET` plus a handful of `POST` routes (game board, feedback, bounties, group join/leave). None of the POST routes authenticate the caller's identity -- they accept a raw `address` in the body or use a hardcoded admin TG ID.
- A **SQLite database** (`bot/db.js`) where all entities (users, proposals, votes, bounties) are keyed by `tg_id`. The `users` table maps `tg_id` to `radix_address`.
- An **on-chain TaskEscrow** Scrypto component on mainnet (`component_rdx1cp8mw...`) with `create_task`, `claim_task`, `submit_task`, `release_task` methods. It issues receipt NFTs, requires guild badge proofs for claiming/submitting, and fees are taken on release.
- A **trust score system** computing Bronze/Silver/Gold tiers from activity metrics, currently keyed by `tg_id`.

Key gap: the dashboard has no authenticated session. Users connect a wallet via `RadixDappToolkit` but cannot prove ownership of that address to the backend. All governance write actions are deferred to the Telegram bot (`@rad_gov`).

---

### 2. Authentication Flow -- ROLA Sessions with JWT

#### 2.1 ROLA Challenge-Response (prerequisite, implemented first)

ROLA (Radix Off-Ledger Authentication) lets the dashboard prove a user owns a particular Radix account address. The flow:

```
Browser                      API Server
  |                              |
  |-- GET /api/auth/challenge -->|  returns { challenge: <random>, expires: <ts> }
  |                              |  server stores challenge in memory/redis
  |                              |
  |-- [wallet signs challenge]   |
  |                              |
  |-- POST /api/auth/verify ---->|  body: { address, challenge, signedChallenge }
  |   server validates:          |
  |   1. challenge exists & not expired
  |   2. signature valid for address (via Radix gateway entity metadata)
  |   3. address holds guild badge NFT (existing hasBadge check)
  |                              |
  |<-- { jwt, expiresAt } ------|  JWT payload: { address, badgeId, tier, iat, exp }
  |                              |
  |-- All subsequent POSTs ----->|  Authorization: Bearer <jwt>
  |   include JWT header         |
```

#### 2.2 JWT Payload Structure

```
{
  sub: "account_rdx1...",         // Radix address (primary identity)
  badge_id: "#123#",              // NFT local ID from guild badge
  tier: "contributor",            // Badge tier from on-chain data
  trust_tier: "silver",           // Trust tier (bronze/silver/gold)
  tg_id: 12345 | null,           // Linked TG ID if found in users table
  iat: 1713000000,
  exp: 1713086400                 // 24h expiry
}
```

#### 2.3 User Identity Bridging

The current database keys everything by `tg_id`. Dashboard users authenticate by Radix address. Resolution strategy:

1. On ROLA verify, look up `users` table by `radix_address` to find matching `tg_id`.
2. If found: JWT includes `tg_id`, all existing db functions work unchanged.
3. If not found: create a new user record with `tg_id = 0` (web-only user) or a negative synthetic ID (e.g., `-Date.now()`). Add a new `web_users` table or add a `radix_address` index to `users` for direct lookups.
4. Long-term: add `radix_address` as primary lookup, keep `tg_id` as optional link.

**New db migration needed:**
- `CREATE INDEX idx_users_address ON users(radix_address)`
- `ALTER TABLE users ADD COLUMN auth_source TEXT DEFAULT 'telegram'` -- track origin
- New function: `getUserByAddress(address)` returns user row or null

#### 2.4 Trust Tier Calculation for Web Users

Current `getTrustScore` at line 1186 of `bot/db.js` is keyed by `tg_id`. For dashboard auth:
- Add `getTrustScoreByAddress(address)` that first resolves address to tg_id via the users table, then delegates to existing function.
- For web-only users without a tg_id link, compute a minimal score (badge age only, no vote/proposal history until linked).
- Tier thresholds remain: Bronze (0+), Silver (50+), Gold (200+).

---

### 3. New API Endpoints

All write endpoints require `Authorization: Bearer <jwt>` header. The API server extracts and validates the JWT, then resolves the user identity.

#### 3.1 Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/challenge` | None | Generate ROLA challenge |
| POST | `/api/auth/verify` | None | Verify signed challenge, return JWT |
| GET | `/api/auth/me` | JWT | Return current session info (address, tier, trust) |
| POST | `/api/auth/refresh` | JWT | Refresh expiring JWT |

#### 3.2 Proposal Endpoints

| Method | Path | Auth | Trust Gate | Description |
|--------|------|------|------------|-------------|
| POST | `/api/proposals` | JWT | Silver | Create off-chain proposal |
| POST | `/api/proposals/:id/vote` | JWT | Bronze | Cast vote on proposal |
| GET | `/api/proposals/:id/my-vote` | JWT | Bronze | Check if current user voted |

**POST /api/proposals** request body:
```
{
  title: string (max 200 chars),
  type: "yesno" | "poll" | "temp",
  options: string[] | null,        // for poll type
  days_active: 3 | 5 | 7,         // constrained choices
  charter_param: string | null,    // if this resolves a charter param
  category: string | null
}
```

Server-side: calls existing `db.createProposal(title, tgId, opts)` with the resolved tg_id from JWT. Applies content filter (`checkContent`). Returns `{ ok: true, data: { id } }`.

**POST /api/proposals/:id/vote** request body:
```
{
  vote: string    // "yes" | "no" | option name for polls
}
```

Server-side: calls `db.recordVote(proposalId, tgId, radixAddress, vote)`. The UNIQUE constraint on `(proposal_id, tg_id)` prevents double-voting. Returns `{ ok: true }` or `{ ok: false, error: "already_voted" }`.

#### 3.3 Bounty Endpoints

| Method | Path | Auth | Trust Gate | Description |
|--------|------|------|------------|-------------|
| POST | `/api/bounties` | JWT | Silver | Create bounty (upgrade existing unauthenticated route) |
| POST | `/api/bounties/:id/claim` | JWT | Bronze | Claim an open funded bounty |
| POST | `/api/bounties/:id/submit` | JWT | Bronze | Submit completed work |
| POST | `/api/bounties/:id/apply` | JWT | Bronze | Apply for high-value bounty (>100 XRD) |
| POST | `/api/bounties/:id/fund` | JWT | Bronze | Record funding TX hash after on-chain escrow deposit |

**POST /api/bounties/:id/claim** request body:
```
{
  // no body needed -- user identity comes from JWT
}
```

Server-side: calls `db.assignBounty(id, tgId, radixAddress)`. Validates bounty is open and funded. Returns the bounty detail on success.

**POST /api/bounties/:id/submit** request body:
```
{
  github_pr: string | null,
  notes: string | null (max 1000 chars)
}
```

Server-side: calls `db.submitBounty(id, githubPr)`. Validates that JWT address matches the assignee_address on the bounty.

**POST /api/bounties/:id/fund** request body:
```
{
  tx_hash: string     // on-chain transaction hash from wallet
}
```

Server-side: calls `db.fundTask(id, txHash)`. Optionally verifies the TX on-chain via `gateway.verifyEscrowTx()` before marking funded.

---

### 4. Trust Tier Gating Matrix

| Action | Min Trust Tier | Min Badge Tier | Rationale |
|--------|---------------|----------------|-----------|
| Vote on proposal | Bronze | member | Lowest bar -- anyone with a badge can vote |
| Claim bounty | Bronze | member | Open participation, escrow protects funds |
| Submit work | Bronze | member | Only assignee can subm
