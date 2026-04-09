# Issue #34 — On-Chain Proposal Outcomes

> Permanent verifiable governance results on Radix ledger

## Problem Analysis

Governance history currently lives only in SQLite (`proposals` and `votes` tables). If the database is lost or corrupted, all voting records disappear. There's no way for external parties to verify "Did this DAO actually vote on proposal X?" without trusting the Guild's centralized database.

### Current State

- Proposals stored in `proposals` table (title, type, options, status, ends_at)
- Votes stored in `votes` table (proposal_id, tg_id, radix_address, vote)
- Proposal close: `db.closeProposal(id, status)` sets status to passed/failed
- No on-chain record of outcomes
- `scripts/outcome-batch-recorder.js` exists — already has manifest building logic for recording outcomes

### Existing Infrastructure for On-Chain Writing

- `scripts/xp-batch-signer.js` — batch TX signing pattern (VPS admin wallet)
- `scripts/signer.js` — core TX signing utility
- `guild-app/src/lib/manifests.ts` — frontend manifest builders
- `BadgeManager.update_extra_data(badge_id, extra_data)` — writes arbitrary JSON to badge NFT
- `sanitizeManifestValue()` — strips injection characters from manifest strings

## Solution Design

### Option Analysis

| Approach | Pros | Cons | Recommended |
|----------|------|------|-------------|
| **A. Badge `extra_data`** | Portable (travels with badge), no new component | Per-badge cost (0.1 XRD × voters), bloats badge data, doesn't create a governance registry | ❌ |
| **B. New ProposalRegistry component** | Clean separation, dedicated query interface, permanent registry | New Scrypto component to build + deploy | ✅ **Recommended** |
| **C. Existing BadgeManager** | No new component | Overloads badge manager, `extra_data` not ideal for structured proposals | ❌ |

### Recommended: ProposalRegistry Scrypto Component

**Blueprint:** `ProposalRegistry`

```rust
struct ProposalOutcome {
    guild_proposal_id: u64,        // off-chain proposal ID
    title: String,                  // proposal title
    proposal_type: String,          // "yesno", "poll", "charter_vote", "amendment"
    result: String,                 // "passed", "failed", "expired"
    votes_for: u64,                 // total weighted votes for
    votes_against: u64,             // total weighted votes against
    total_voters: u64,              // unique voter count
    vote_breakdown: String,         // JSON: {"yes": 15, "no": 3} or {"option1": 5, "option2": 8}
    recorded_at: i64,               // unix timestamp
    recorded_by: String,            // admin address that signed
}

struct ProposalRegistry {
    outcomes: KeyValueStore<u64, ProposalOutcome>,  // guild_proposal_id → outcome
    next_id: u64,                                    // for on-chain sequence
    total_recorded: u64,
    admin_badge: ResourceAddress,                    // auth gate
}
```

**Methods:**

```rust
// Admin-only: record a finalised proposal outcome
pub fn record_outcome(
    &mut self,
    guild_proposal_id: u64,
    title: String,
    proposal_type: String,
    result: String,
    votes_for: u64,
    votes_against: u64,
    total_voters: u64,
    vote_breakdown: String,
    admin_proof: Proof,
) -> u64;  // returns on-chain record ID

// Public: read an outcome by guild proposal ID
pub fn get_outcome(&self, guild_proposal_id: u64) -> Option<ProposalOutcome>;

// Public: get registry stats
pub fn get_stats(&self) -> (u64, u64);  // (total_recorded, next_id)

// Public: check if a proposal has been recorded
pub fn is_recorded(&self, guild_proposal_id: u64) -> bool;
```

**Events:**

```rust
#[derive(ScryptoSbor, ScryptoEvent)]
struct OutcomeRecordedEvent {
    guild_proposal_id: u64,
    on_chain_id: u64,
    result: String,
    total_voters: u64,
}
```

### Auto-Recording Pipeline

**When a proposal closes in the bot:**

1. Bot closes proposal → `db.closeProposal(id, status)`
2. New: Check if proposal meets recording criteria:
   - Status is "passed" or "failed" (not "expired" with 0 votes)
   - At least 3 unique voters
   - Proposal type is "charter_vote" or "community_vote"
3. Build TX manifest:
   ```
   CALL_METHOD Address("${ADMIN_ACCOUNT}") "lock_fee" Decimal("5");
   CALL_METHOD Address("${ADMIN_ACCOUNT}") "create_proof_of_amount"
     Address("${ADMIN_BADGE}") Decimal("1");
   CALL_METHOD Address("${REGISTRY_COMPONENT}") "record_outcome"
     ${guild_proposal_id}u64
     "${sanitized_title}"
     "${proposal_type}"
     "${result}"
     ${votes_for}u64
     ${votes_against}u64
     ${total_voters}u64
     "${sanitized_breakdown}";
   ```
4. Sign with admin wallet (`scripts/signer.js` pattern)
5. Submit TX to Radix network
6. On success: update `proposals.onchain_outcome_tx` with TX hash
7. Announce in TG: "Proposal #{id} outcome recorded on-chain: [explorer link]"

### Implementation Files

| File | Changes |
|------|---------|
| `badge-manager/scrypto/proposal-registry/` | **New** — Scrypto blueprint |
| `bot/index.js` | Hook into proposal close handler |
| `bot/services/outcome-recorder.js` | **New** — builds + signs + submits outcome TX |
| `bot/services/gateway.js` | Add `getOutcome(proposalId)` to read from registry |
| `bot/db.js` | Add `onchain_outcome_tx` column to proposals |
| `scripts/outcome-batch-recorder.js` | Update to use new registry component |
| `guild-app/src/app/proposals/page.tsx` | Show on-chain verification badge |
| `guild-app/src/lib/constants.ts` | Add REGISTRY_COMPONENT address |

### Database Changes

```sql
ALTER TABLE proposals ADD COLUMN onchain_outcome_tx TEXT;     -- TX hash of on-chain recording
ALTER TABLE proposals ADD COLUMN onchain_recorded_at TEXT;     -- timestamp
```

### Dashboard Display

On each proposal card in the proposals page:

- **Recorded on-chain:** Green checkmark badge + TX hash link to Radix Explorer
- **Pending recording:** Yellow "Awaiting on-chain recording" indicator
- **Not eligible:** No indicator (temp checks with low turnout)

**Proposal detail view:**
- "On-Chain Verification" section
- Shows: TX hash, block height, recorded_at timestamp
- Link: "Verify on Radix Explorer" → opens transaction detail page
- Data: mirror of what's stored on-chain (title, result, vote counts)

### Manual Recording Command

For proposals that weren't auto-recorded:

```
/record <proposal_id>    — record a closed proposal on-chain (admin only)
/recorded <proposal_id>  — check if proposal is recorded on-chain
```

### Batch Backfill

After deploying the registry component, record all historical passed proposals:

```javascript
// scripts/outcome-batch-recorder.js (already exists — update)
const passed = db.getProposalHistory(1000).filter(p =>
  (p.status === 'passed' || p.status === 'failed') &&
  p.total_voters >= 3 &&
  !p.onchain_outcome_tx
);

for (const proposal of passed) {
  await recordOutcome(proposal);
  await sleep(5000); // Rate limit: 1 TX per 5 seconds
}
```

## Security Considerations

1. **Admin-only recording** — only the admin badge holder can write to the registry
2. **Immutable outcomes** — once recorded, outcomes cannot be modified (no update method)
3. **Sanitized strings** — all text passed through `sanitizeManifestValue()` before TX
4. **Idempotent** — check `is_recorded()` before writing (prevent duplicates)
5. **TX verification** — verify committed TX via Gateway before marking as recorded
6. **Fee management** — each recording costs ~0.5-1 XRD in fees; monitor admin wallet balance

## Effort Estimate

- Scrypto blueprint: 1 session
- Deploy + test on stokenet: 0.5 session
- Bot integration (auto-record + commands): 1 session
- Dashboard display: 0.5 session
- Batch backfill: 0.5 session
- **Total: 3.5-4 sessions**

## Dependencies

- Scrypto 1.3.x toolchain (matching existing badge-manager)
- Admin wallet with XRD on mainnet (for TX fees)
- `scripts/signer.js` TX signing infrastructure
- Gateway API for reading outcomes back
