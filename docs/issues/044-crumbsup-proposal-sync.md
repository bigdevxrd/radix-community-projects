# Issue #44 — CrumbsUp Proposal Sync

> Formal ratification pipeline: Guild temp check → CrumbsUp on-chain vote

## Problem Analysis

Guild governance currently operates in two layers:
1. **Off-chain (Telegram bot)** — temp checks, polls, charter votes via `/propose` command
2. **On-chain (CV2 component)** — temperature checks and formal proposals via Radix transactions

There's no automated pipeline connecting these layers. When a Guild proposal passes in Telegram, someone must manually create a matching CrumbsUp DAO proposal for formal on-chain ratification. This manual step creates friction and risks proposals being approved off-chain but never ratified on-chain.

### Current Flow (Manual)

```
1. Member creates proposal in TG bot (/propose)
2. Badge holders vote in TG (off-chain, SQLite)
3. Proposal passes → bot announces result
4. ??? (Manual gap) ???
5. Someone creates proposal on CrumbsUp
6. Badge holders vote on CrumbsUp (on-chain)
7. Result recorded on-chain
```

### Target Flow (Automated)

```
1. Member creates proposal in TG bot (/propose)
2. Badge holders vote in TG (off-chain, SQLite)
3. Proposal passes → bot announces result
4. Bot auto-creates CrumbsUp proposal (TX signed by admin wallet)
5. Bot posts CrumbsUp link to TG group
6. Badge holders vote on CrumbsUp (on-chain)
7. Bot monitors CrumbsUp proposal status
8. Result announced in TG when CrumbsUp vote concludes
```

## Solution Design

### Step 1: CrumbsUp Integration Research

**Option A: CrumbsUp API (Preferred)**
- Contact CrumbsUp team for API documentation
- If REST/GraphQL API exists → direct integration
- Endpoints needed: create proposal, get proposal, get vote results

**Option B: Gateway API (Fallback)**
- Read CrumbsUp on-chain state via Radix Gateway API
- `POST /state/entity/details` on CrumbsUp component address
- Parse component state for proposals, votes, results
- Creating proposals requires building TX manifests that call CrumbsUp blueprint methods

**Option C: CV2 Component Direct (Already Partially Built)**
- The existing `bot/services/consultation.js` already polls CV2 component via Gateway
- Extend to also write proposals (not just read)
- This may be the same component CrumbsUp uses

### Step 2: Proposal Bridge Service

**New file:** `bot/services/cv2-bridge.js` (already exists — extend it)

```javascript
// Existing: consultation.js reads CV2 state
// New: cv2-bridge.js handles write operations

module.exports = {
  // Create a CrumbsUp/CV2 proposal from a passed Guild temp check
  createOnChainProposal(guildProposalId, title, options),

  // Monitor on-chain proposal status
  checkOnChainProposalStatus(onChainProposalId),

  // Map Guild proposal IDs to on-chain proposal IDs
  linkProposals(guildId, onChainId),

  // Get ratification result
  getRatificationResult(guildProposalId),
};
```

### Step 3: Auto-Sync on Proposal Pass

**Modify:** `bot/index.js` — proposal close handler

When a proposal closes with status "passed":

```
1. Check proposal type — only sync "charter_vote" and "community_vote" (not temp_check)
2. Check sync eligibility:
   - Minimum voter turnout (e.g., 5 unique voters)
   - Passed by required margin (simple majority or supermajority per charter)
3. Build CrumbsUp TX manifest:
   - Call CrumbsUp component's create_proposal method
   - Include: title, description (with Guild proposal ID reference), options, duration
4. Sign TX with admin wallet (VPS signs, same pattern as xp-batch-signer.js)
5. Submit TX to Radix network
6. Record on-chain proposal ID in `proposals` table (new column: `onchain_proposal_id`)
7. Post to TG: "Guild proposal #{id} submitted for on-chain ratification: [CrumbsUp link]"
```

### Step 4: Status Monitoring

**Extend:** `bot/services/consultation.js` polling loop

Every 5 minutes (existing poll interval):
1. Check all Guild proposals with `onchain_proposal_id IS NOT NULL` and `onchain_status != 'completed'`
2. Fetch on-chain proposal status via Gateway API
3. If status changed → update `proposals.onchain_status` and announce in TG

### Database Changes

```sql
-- Add to proposals table
ALTER TABLE proposals ADD COLUMN onchain_proposal_id TEXT;     -- CrumbsUp/CV2 proposal identifier
ALTER TABLE proposals ADD COLUMN onchain_status TEXT;           -- 'pending', 'voting', 'passed', 'failed'
ALTER TABLE proposals ADD COLUMN onchain_tx_hash TEXT;          -- TX that created the on-chain proposal
ALTER TABLE proposals ADD COLUMN onchain_synced_at TEXT;        -- timestamp of last sync
```

### Bot Commands

```
/ratify <proposal_id>     — manually trigger on-chain sync (admin only)
/ratification <proposal_id> — check on-chain ratification status
```

### Dashboard Integration

On the proposals page, for proposals with `onchain_proposal_id`:
- Show "On-Chain Ratification" section
- Display CrumbsUp vote progress (fetched via `/api/cv2/proposals/:id`)
- Link to CrumbsUp/CV2 web interface for direct voting
- Show final ratification result when complete

### TX Manifest Template

```
CALL_METHOD
  Address("${ADMIN_ACCOUNT}")
  "lock_fee"
  Decimal("10");

CALL_METHOD
  Address("${CV2_COMPONENT}")
  "create_proposal"
  "${title}"
  "${description}"
  Enum<0u8>()                    // ProposalType::Standard
  ${duration_epochs}u64;         // Duration in epochs
```

*Note: The exact manifest depends on the CrumbsUp/CV2 blueprint's `create_proposal` method signature, which needs to be determined from the component's ABI.*

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Admin wallet has insufficient XRD for TX fee | Log error, retry next cycle, alert in TG |
| CrumbsUp component is paused/unavailable | Queue proposal for retry, mark as `sync_pending` |
| Guild proposal amended after sync | Create new on-chain proposal, link to amendment |
| On-chain vote result differs from off-chain | Record both results, flag for community discussion |
| Duplicate sync attempt | Check `onchain_proposal_id` before creating — idempotent |

## Security Considerations

1. **Admin wallet signing** — only the VPS admin wallet can create on-chain proposals (same pattern as XP batch updates)
2. **No arbitrary TX creation** — only passed proposals with sufficient turnout trigger sync
3. **Title/description sanitization** — use `sanitizeManifestValue()` before embedding in TX manifest
4. **TX fee limits** — cap lock_fee at reasonable amount (10 XRD)
5. **Audit trail** — all sync actions logged to `proposals` table with TX hashes

## Implementation Order

1. **Research CrumbsUp API/ABI** — determine how to create proposals programmatically
2. **DB migration** — add `onchain_*` columns to proposals table
3. **CV2 bridge extension** — `createOnChainProposal()` function
4. **Auto-sync trigger** — hook into proposal close handler
5. **Status monitoring** — extend consultation.js polling
6. **Bot commands** — `/ratify`, `/ratification`
7. **Dashboard display** — on-chain ratification status on proposals page

## Effort Estimate

- Research + API/ABI discovery: 1 session
- Bridge service + TX signing: 1-2 sessions
- Integration + testing: 1 session
- Dashboard UI: 0.5 session
- **Total: 3.5-4.5 sessions**

## Dependencies

- CrumbsUp API documentation OR CV2 component ABI (must be obtained)
- Admin wallet keypair on VPS (already used for XP batch signing)
- `scripts/signer.js` pattern for TX construction and signing
- `bot/services/consultation.js` polling infrastructure
- Phase 4 priority (after beta feedback)

## Open Questions

1. Does CrumbsUp have a REST API, or must we use Gateway API + TX manifests?
2. What is the exact method signature for `create_proposal` on the CrumbsUp component?
3. Should the on-chain vote override or confirm the off-chain result?
4. What happens if on-chain ratification fails but off-chain passed?
5. What's the minimum voter turnout for auto-sync eligibility?
