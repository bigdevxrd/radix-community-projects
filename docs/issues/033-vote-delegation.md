# Issue #33 — Vote Delegation

> Delegate voting weight to stewards

## Problem Analysis

Badge holders have different voting weights based on tier: member=1×, contributor=2×, builder=3×, steward=5×, elder=10×. Less active members may want to delegate their voting power to trusted, active stewards or elders who follow governance closely.

Currently there is no delegation mechanism — every vote requires the badge holder to personally vote (either via Telegram bot or CV2 on-chain).

### Key Design Questions (Community Decision Needed)

1. **On-chain vs off-chain delegation?**
2. **Partial delegation allowed?** (e.g., delegate 50% of weight)
3. **Time-locked or revocable anytime?**
4. **Can delegates re-delegate?** (transitive delegation)

## Solution Design

### Recommended: Off-Chain Delegation (Phase 1)

Start with off-chain (SQLite) delegation for speed and simplicity. Migrate to on-chain later if the community votes for it.

**Rationale:**
- On-chain delegation requires a new Scrypto component (weeks of development)
- Off-chain delegation can be built in 1-2 sessions with existing bot infrastructure
- The governance system is already off-chain (Telegram votes stored in SQLite)
- On-chain delegation only matters for on-chain votes (CV2/CrumbsUp) — separate concern

### Database Schema

```sql
CREATE TABLE vote_delegations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  delegator_address TEXT NOT NULL,        -- who is delegating
  delegate_address  TEXT NOT NULL,        -- who receives the delegation
  weight_pct      INTEGER DEFAULT 100,    -- 1-100: percentage of weight delegated
  status          TEXT DEFAULT 'active',  -- 'active', 'revoked'
  created_at      TEXT DEFAULT (datetime('now')),
  revoked_at      TEXT,
  UNIQUE(delegator_address)               -- one active delegation per address
);
```

**Design decisions encoded:**
- `UNIQUE(delegator_address)` — can only delegate to one address at a time
- `weight_pct` — supports partial delegation (50% delegated, 50% self-vote)
- No transitive delegation — delegate cannot re-delegate received weight
- Revocable anytime — set status to 'revoked'

### DB Functions

```javascript
// New functions in bot/db.js

// Create or update delegation
delegateVote(delegatorAddress, delegateAddress, weightPct)
  // Validation: can't delegate to yourself, weightPct 1-100
  // Replaces any existing active delegation

// Revoke delegation
revokeDelegation(delegatorAddress)
  // Sets status='revoked', revoked_at=now

// Get delegation info
getDelegation(address)
  // Returns: delegate_address, weight_pct, created_at (or null)

// Get all delegations TO an address
getDelegationsTo(address)
  // Returns: [{ delegator_address, weight_pct, badge_tier }]

// Calculate effective voting weight for an address
getEffectiveVotingWeight(address)
  // = own_weight * (1 - delegated_pct/100) + SUM(delegator_weight * their_pct/100)
```

### Voting Weight Calculation

When a delegate votes on a proposal:

```
Own weight:        badge_tier_weight * (100 - self_delegated_pct) / 100
Delegated weight:  SUM for each delegator:
                     delegator_tier_weight * delegator_weight_pct / 100
                     (only if delegator hasn't already voted themselves)

Total weight:      own_weight + delegated_weight
```

**Important rule:** If the delegator votes themselves, their delegation is ignored for that proposal. Self-voting always takes priority.

### Modified Voting Flow

Current flow in `bot/index.js` vote handler:

```
1. User votes → check badge → record vote with tier weight
```

New flow:

```
1. User votes → check badge → calculate own weight
2. Check: does this user have delegations from others?
3. For each delegator who hasn't voted on this proposal:
   a. Look up delegator's badge tier
   b. Calculate delegated weight (tier_weight * pct / 100)
   c. Add to voter's total weight
4. Record vote with total effective weight
5. Mark proposal as "delegated vote" in UI
```

### Bot Commands

```
/delegate <address>              — delegate 100% of voting weight
/delegate <address> <pct>        — delegate partial weight (e.g., /delegate addr1 50)
/undelegate                      — revoke delegation
/delegation                      — show current delegation status
/delegations                     — show who has delegated to you (stewards/elders)
```

**Example interactions:**

```
User: /delegate account_rdx1abc...xyz
Bot: ✅ You've delegated 100% of your voting weight to account_rdx1abc...xyz
     They will vote on your behalf until you /undelegate
     You can still vote directly — your personal vote overrides delegation.

User: /delegation
Bot: 📋 Your Delegation Status:
     Delegated to: account_rdx1abc...xyz (steward tier)
     Weight delegated: 100%
     Since: 2026-04-09
     To revoke: /undelegate

User: /delegations
Bot: 📋 Delegated to You:
     1. account_rdx1def... (contributor, 2×) — 100%
     2. account_rdx1ghi... (member, 1×) — 50%
     Total delegated weight: +2.5×
     Your own weight: 5× (steward)
     Effective weight: 7.5×
```

### API Endpoints

```
GET /api/delegation/:address      — get delegation info for an address
POST /api/delegate                — create delegation (requireAuth)
  Body: { delegate_address, weight_pct? }
POST /api/undelegate              — revoke delegation (requireAuth)
GET /api/delegations/:address     — get delegations TO an address (public)
```

### Dashboard Display

**Profile page:**
- "Delegation" section showing current delegation (if any)
- "Delegate" / "Undelegate" buttons (wallet-gated)
- Effective voting weight display

**Proposals page:**
- When delegate votes, show: "Voted with 7.5× weight (5× own + 2.5× delegated)"
- Delegation badge on vote indicator

**Leaderboard:**
- "Delegation Power" column — total weight including delegations
- Useful for understanding governance influence distribution

### Phase 2: On-Chain Delegation (Future)

If the community votes for on-chain delegation:

**New Scrypto component:** `DelegationRegistry`

```rust
struct Delegation {
    delegator: ComponentAddress,
    delegate: ComponentAddress,
    weight_pct: u8,
    created_at: i64,
}

struct DelegationRegistry {
    delegations: KeyValueStore<ComponentAddress, Delegation>,
    badge_resource: ResourceAddress,
}

// Methods:
delegate(delegator_proof: Proof, delegate: ComponentAddress, pct: u8)
revoke(delegator_proof: Proof)
get_delegation(delegator: ComponentAddress) -> Option<Delegation>
get_delegations_to(delegate: ComponentAddress) -> Vec<Delegation>
get_effective_weight(address: ComponentAddress, badge_tier: String) -> Decimal
```

This would make delegation transparent and verifiable on-chain, but adds significant complexity. Only worth building if on-chain voting (CV2/conviction voting) becomes the primary governance mechanism.

## Security Considerations

1. **No self-delegation** — validate delegator ≠ delegate
2. **Self-vote priority** — personal vote always overrides delegation
3. **No transitive delegation** — prevents delegation chains and accumulation attacks
4. **Single delegation** — can only delegate to one address (simplifies calculation)
5. **Weight cap** — consider a maximum effective weight (e.g., 50×) to prevent one delegate from dominating governance
6. **Badge verification** — both delegator and delegate must hold active badges
7. **Delegation visibility** — all delegations are public (transparent governance)

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Delegate's badge revoked | Delegated weight becomes 0 (badge check on vote) |
| Delegator's badge revoked | Delegation auto-invalidated |
| Delegator upgrades tier | New weight applies on next vote |
| Delegate already voted, delegator votes later | Delegator's own vote counts; delegated portion removed from delegate's total |
| Proposal created by delegate | Can still vote with delegated weight (no conflict of interest rule in V1) |

## Implementation Order

1. **Community governance vote** — proposal to approve delegation design
2. **DB table + functions** — `vote_delegations` table and helper functions
3. **Voting weight calculation** — modify vote recording logic
4. **Bot commands** — `/delegate`, `/undelegate`, `/delegation`, `/delegations`
5. **API endpoints** — for dashboard integration
6. **Dashboard display** — delegation UI on profile and proposals pages
7. **Testing** — edge cases, weight calculation verification

## Effort Estimate

- Phase 1 (Off-chain, bot commands): 1-2 sessions
- Phase 1 (Dashboard integration): 1 session
- Phase 2 (On-chain Scrypto): 2-3 sessions (future)
- **Total Phase 1: 2-3 sessions**

## Dependencies

- Community governance vote to approve delegation design
- Badge tier system (already implemented)
- Voting system in `bot/index.js` (modify weight calculation)
- ROLA authentication (for dashboard delegation, #75 prerequisite)
