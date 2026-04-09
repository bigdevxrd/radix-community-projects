I now have a thorough understanding of the entire codebase, patterns, and conviction voting mechanics. Here is the complete architectural specification.

---

# Conviction Voting Component -- Architectural Specification

## 1. Mathematical Model

### Core Formulas

Conviction voting uses a discrete-time exponential moving average. The key insight: conviction accumulates slowly when you stake, and resets instantly when you unstake. Time cannot be faked, even with multiple wallets.

**Decay parameter (alpha) derived from half-life:**

```
alpha = 2^(-1/D)
```

Where `D` is the half-life in time steps (blocks or epochs). For a 3-day half-life with 1-hour time steps: `D = 72`, so `alpha = 2^(-1/72) ~ 0.9904`.

The half-life means: if a staker removes their tokens, conviction decays to 50% of its current value after D time steps.

**Conviction accumulation (per-proposal recurrence):**

```
y(t+1) = alpha * y(t) + S(t)
```

Where:
- `y(t)` = total weighted conviction for proposal at time `t`
- `S(t)` = sum of all weighted stake amounts at time `t` (with badge multipliers applied)
- `alpha` = decay constant (0 < alpha < 1)

**Steady-state conviction** for a constant stake `S` held indefinitely:

```
y_max = S / (1 - alpha)
```

For alpha = 0.9904, `y_max ~ 104 * S`. This means the maximum conviction is about 104x the staked amount, reached asymptotically.

**Time to reach fraction `f` of maximum conviction:**

```
t(f) = -D * log2(1 - f)
```

Examples with D=72 (3-day half-life):
- 50% of max: 72 time steps (3 days)
- 75% of max: 144 time steps (6 days)
- 90% of max: ~239 time steps (10 days)
- 99% of max: ~478 time steps (20 days)

**Threshold function (trigger function):**

The threshold determines how much conviction a proposal needs to pass. It scales with the proportion of the pool being requested:

```
threshold(requested, pool_balance) = weight * effective_supply / (1 - alpha) * (requested / (pool_balance - requested))^2
```

Simplified for implementation with a configurable `rho` (weight parameter) and `beta` (max spending limit as fraction):

```
threshold = (rho * effective_supply) / ((1 - alpha) * (pool_balance * beta - requested)^2)
```

Where:
- `rho` = scale parameter (tunable, default 0.025 means 2.5% of supply needed at minimum)
- `beta` = spending limit (default 0.1, max 10% of pool per proposal)
- `effective_supply` = total staked across all proposals plus a minimum floor

A proposal passes when: `y(t) >= threshold(requested, pool_balance)`

**Minimum conviction floor:**

To prevent proposals with very small requests from passing instantly:

```
min_threshold = min_conviction_pct * effective_supply / (1 - alpha)
threshold = max(calculated_threshold, min_threshold)
```

Where `min_conviction_pct` defaults to 0.025 (2.5%).

### Badge Multiplier Integration

Weighted stake for a single staker:

```
weighted_stake(staker) = amount * tier_multiplier(badge)
```

Where tier_multiplier is:
- Bronze: 1.0x
- Silver: 1.5x
- Gold: 2.0x

This means a Gold member staking 100 XRD generates conviction equivalent to a Bronze member staking 200 XRD. The multiplier applies to the `S(t)` term in the recurrence, not to the actual tokens held.

---

## 2. Scrypto Data Structures

### Proposal Record (stored in KVS)

```
struct ProposalRecord {
    id: u64,
    title: String,                           // max 200 chars
    description: String,                     // max 1000 chars
    requested_amount: Decimal,               // XRD requested from pool
    beneficiary: ComponentAddress,           // who receives funds if passed
    creator: ComponentAddress,               // who created the proposal
    status: String,                          // "active", "executed", "cancelled"
    conviction: Decimal,                     // current accumulated conviction y(t)
    last_updated: i64,                       // unix timestamp of last conviction update
    total_staked: Decimal,                   // raw XRD staked (no multiplier)
    total_weighted_stake: Decimal,           // sum of weighted stakes S(t)
    created_at: i64,
    staker_count: u64,
}
```

### Stake Record (stored in KVS, key = composite of proposal_id + badge_id)

```
struct StakeRecord {
    staker_badge_id: NonFungibleLocalId,     // identifies the staker
    proposal_id: u64,
    amount: Decimal,                         // raw XRD amount
    tier_multiplier: Decimal,                // captured at stake time
    weighted_amount: Decimal,                // amount * tier_multiplier
    staked_at: i64,
}
```

### Component State

```
struct ConvictionVoting {
    // Data stores
    proposals: KeyValueStore<u64, ProposalRecord>,
    stake_vaults: KeyValueStore<u64, Vault>,          // per-proposal XRD vault
    stakes: KeyValueStore<String, StakeRecord>,        // key: "{proposal_id}_{badge_id}"
    
    // Funding pool
    pool_vault: Vault,                                 // shared funding pool (XRD)
    
    // Auth
    minter_vault: Vault,                               // internal auth badge
    receipt_manager: ResourceManager,                   // stake receipt NFTs
    badge_resource: ResourceAddress,                    // guild badge NFT resource
    
    // Configuration
    alpha: Decimal,                                    // decay parameter, e.g. dec!("0.9904")
    time_step_seconds: i64,                            // seconds per time step, e.g. 3600 (1 hour)
    rho: Decimal,                                      // threshold weight, e.g. dec!("0.025")
    spending_limit: Decimal,                           // max fraction of pool per proposal, e.g. dec!("0.1")
    min_conviction_pct: Decimal,                       // minimum conviction floor, e.g. dec!("0.025")
    min_stake: Decimal,                                // minimum stake amount, e.g. 10 XRD
    
    // Tier multipliers
    bronze_multiplier: Decimal,                        // dec!("1.0")
    silver_multiplier: Decimal,                        // dec!("1.5")
    gold_multiplier: Decimal,                          // dec!("2.0")
    
    // Counters
    next_proposal_id: u64,
    total_proposals: u64,
    total_executed: u64,
    total_disbursed: Decimal,
}
```

### Stake Receipt NFT

Following the TaskReceipt pattern from task-escrow:

```
struct StakeReceipt {
    proposal_id: u64,
    staker_badge_id: String,
    amount: Decimal,
    staked_at: i64,
    #[mutable]
    status: String,                                    // "active", "withdrawn"
}
```

### Events

Following the existing event pattern:

```
struct ProposalCreatedEvent { proposal_id: u64, title: String, requested_amount: Decimal, creator: ComponentAddress }
struct StakeAddedEvent { proposal_id: u64, staker: String, amount: Decimal, weighted_amount: Decimal }
struct StakeRemovedEvent { proposal_id: u64, staker: String, amount: Decimal }
struct ConvictionUpdatedEvent { proposal_id: u64, old_conviction: Decimal, new_conviction: Decimal, threshold: Decimal }
struct ProposalExecutedEvent { proposal_id: u64, amount: Decimal, beneficiary: ComponentAddress }
struct PoolFundedEvent { amount: Decimal, new_balance: Decimal }
```

---

## 3. Methods

### Instantiation

`instantiate(alpha, time_step_seconds, rho, spending_limit, min_conviction_pct, min_stake, badge_resource, owner_badge, dapp_def) -> Global<ConvictionVoting>`

Following the same pattern as TaskEscrow: all params are primitives, create internal minter badge, create receipt NFT resource, set up roles with owner_badge. Tier multipliers start at 1.0/1.5/2.0 and are configurable by OWNER.

### Public Methods

**`create_proposal(title, description, requested_amount, beneficiary, badge_proof) -> Bucket`**
- Validates badge_proof against badge_resource (must be active, not revoked)
- Validates requested_amount > 0 and <= pool_vault.amount() * spending_limit
- Creates ProposalRecord with conviction = 0, status = "active"
- Mints a receipt NFT (for cancellation rights, same pattern as TaskEscrow)
- Emits ProposalCreatedEven
