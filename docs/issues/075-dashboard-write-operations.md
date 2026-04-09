# Issue #75 — Dashboard Write Operations

> Make TG bot actions available on the web dashboard

## Problem Analysis

The dashboard is currently read-only for governance and task management. Users who arrive via the web can browse proposals, bounties, and groups but cannot act — all write operations (create proposals, vote, claim tasks, join groups, fund escrow) require the Telegram bot. This excludes non-Telegram users from participating.

### Current State

| Capability | Dashboard | Bot | Gap |
|------------|-----------|-----|-----|
| Browse proposals | ✅ | ✅ | None |
| Create proposal | ❌ | ✅ | **Critical** |
| Vote on proposal | CV2 only | ✅ | Off-chain voting missing |
| Browse bounties | ✅ | ✅ | None |
| Create bounty | ❌ (POST exists but no UI) | ✅ | **UI needed** |
| Claim bounty | ❌ | ✅ | **Critical** |
| Submit work | ❌ | ✅ | **Critical** |
| Join/leave group | ✅ (POST exists) | ✅ | None |
| Fund escrow | ❌ | ✅ | **Critical** |
| Play grid game | ✅ | ❌ | None |
| Submit feedback | ✅ | ✅ | None |

### Existing Infrastructure

- **API endpoints that already exist:** `POST /api/bounties`, `POST /api/groups/:id/join`, `POST /api/groups/:id/leave`, `POST /api/feedback`, game endpoints
- **API endpoints missing:** `POST /api/proposals`, `POST /api/proposals/:id/vote`, `POST /api/bounties/:id/claim`, `POST /api/bounties/:id/submit`, `POST /api/bounties/:id/fund`
- **Auth:** No wallet verification on POST endpoints — currently trusts `address` field in JSON body
- **Content filter:** `bot/services/content-filter.js` already used on bounty creation

## Solution Design

### Dependency: ROLA Authentication (Prerequisite)

All write operations require authenticated wallet sessions. The ROLA flow (documented in `docs/architecture/01-ROLA-AUTH.md`) must be implemented first:

1. `GET /api/challenge` — generate 32-byte challenge with 5-min TTL
2. `POST /api/verify` — verify signed challenge, issue JWT in httpOnly cookie
3. Middleware: `requireAuth(req)` — validates JWT, extracts `radix_address`
4. Badge-gating: `requireBadge(req)` — calls `gateway.hasBadge(address)` on authenticated address

### Phase 1: Authentication Layer

**Files to modify:**

| File | Changes |
|------|---------|
| `bot/services/api.js` | Add `GET /api/challenge`, `POST /api/verify`, `requireAuth()` middleware |
| `guild-app/src/hooks/useWallet.tsx` | Add ROLA challenge flow using `DataRequestBuilder.persona().withProof()` |
| `guild-app/src/lib/auth.ts` | New — JWT session management, cookie handling |

**Implementation:**

```
Challenge Flow:
  1. Dashboard calls GET /api/challenge → { challenge: "abc123", expires: 1234567890 }
  2. Dashboard sends challenge to wallet via RDT persona proof request
  3. Wallet signs challenge → signed_challenge returned
  4. Dashboard POSTs to /api/verify → { signed_challenge, account_address }
  5. Backend verifies signature against on-chain owner_keys via @radixdlt/rola
  6. Backend issues JWT (httpOnly cookie, 1hr TTL) containing { address, badge_tier }
  7. All subsequent POST requests include cookie → middleware extracts address
```

### Phase 2: Core Write Endpoints

**New API endpoints in `bot/services/api.js`:**

#### 2a. Create Proposal

```
POST /api/proposals
Auth: requireAuth + requireBadge
Body: { title, type: "yesno"|"poll", options?, duration_hours? }
Validation: content-filter, title 5-200 chars, type whitelist
Action: db.createProposal(title, null, { type, options, creatorAddress: req.address })
Note: creatorAddress stored instead of tg_id for web-originated proposals
```

**DB change needed:** `proposals.creator_address` column (nullable, alongside `creator_tg_id`) — web proposals have no tg_id.

#### 2b. Vote on Proposal

```
POST /api/proposals/:id/vote
Auth: requireAuth + requireBadge
Body: { vote: "yes"|"no"|option_index }
Validation: proposal active, user hasn't voted (check by address)
Action: db.recordVote(proposalId, null, req.address, vote)
Weight: look up badge tier from JWT → apply voting weight multiplier
```

**DB change needed:** Allow `votes.tg_id = NULL` for web-originated votes. Add unique constraint on `(proposal_id, radix_address)` to prevent duplicate web votes.

#### 2c. Claim Bounty

```
POST /api/bounties/:id/claim
Auth: requireAuth + requireBadge
Body: { pitch?, estimated_hours? }
Validation: bounty status=open, not already assigned, badge check
Action: db.assignBounty(id, null, req.address) for bounties ≤100 XRD
        db.applyForBounty(id, null, req.address, pitch, hours) for >100 XRD
```

#### 2d. Submit Work

```
POST /api/bounties/:id/submit
Auth: requireAuth (must be assignee)
Body: { github_pr?, description? }
Validation: bounty status=assigned, req.address === bounty.assignee_address
Action: db.submitBounty(id, github_pr)
```

#### 2e. Fund Bounty (On-Chain Transaction)

```
POST /api/bounties/:id/fund — metadata endpoint
Auth: requireAuth
Response: { manifest, bounty, escrow_component }

Actual funding happens client-side:
  1. Dashboard fetches manifest template
  2. Fills in amount + addresses
  3. Sends TX to wallet for signing
  4. Wallet submits to Radix network
  5. Dashboard calls POST /api/bounties/:id/fund/verify with tx_hash
  6. Backend verifies via gateway.verifyEscrowTx(txHash)
  7. Backend calls db.fundTask(bountyId, txHash)
```

### Phase 3: Dashboard UI Components

**New pages/components:**

| Component | Location | Purpose |
|-----------|----------|---------|
| `CreateProposalForm` | `guild-app/src/app/proposals/create/page.tsx` | Form with title, type, options, duration |
| `VoteButtons` | `guild-app/src/components/VoteButtons.tsx` | Yes/No/Option buttons (badge-gated) |
| `ClaimBountyButton` | `guild-app/src/components/ClaimBountyButton.tsx` | One-click claim or application form |
| `SubmitWorkForm` | `guild-app/src/app/bounties/[id]/submit/page.tsx` | PR link + description |
| `FundBountyButton` | `guild-app/src/components/FundBountyButton.tsx` | TX manifest → wallet sign |
| `AuthGate` | `guild-app/src/components/AuthGate.tsx` | Wrapper: "Connect wallet to act" |

### Phase 4: Admin Operations

After ROLA verification is working:

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/bounties/:id/verify` | requireAdmin | Mark work as verified |
| `POST /api/feedback/:id/respond` | requireAdmin | Respond to feedback |
| `POST /api/bounties/:id/cancel` | requireAdmin | Cancel a bounty |

`requireAdmin` = requireAuth + badge tier ≥ steward (or admin address whitelist).

## Security Considerations

1. **Never trust client-side address** — always extract from JWT after ROLA verification
2. **Badge-gate all governance actions** — even after auth, verify badge ownership
3. **Content filtering** — apply `checkContent()` to all user-generated text
4. **Rate limiting** — POST endpoints: 10 req/min/IP (already configured)
5. **Double-vote prevention** — unique constraint on (proposal_id, radix_address)
6. **Escrow funding** — verify on-chain TX hash, don't trust client-reported amounts
7. **CSRF protection** — SameSite=Strict on JWT cookies

## Migration Strategy

1. Add new columns with `ALTER TABLE` (nullable, no breaking changes)
2. Deploy API endpoints behind feature flag (check for ROLA_ENABLED env var)
3. Roll out UI incrementally: auth → voting → proposals → bounties
4. Keep bot commands working — web and bot writes coexist

## Effort Estimate

- Phase 1 (Auth): 1-2 sessions
- Phase 2 (Endpoints): 2-3 sessions
- Phase 3 (UI): 2-3 sessions
- Phase 4 (Admin): 1 session
- **Total: 6-9 sessions**

## Dependencies

- `@radixdlt/rola` npm package (for signature verification)
- ROLA architecture (docs/architecture/01-ROLA-AUTH.md) must be implemented first
- Existing `content-filter.js`, `gateway.js`, `db.js` infrastructure
