# Blueprint Catalog — Detailed Reference

> Complete API reference for every blueprint we own, including method signatures, data structures, and deployment status.

---

## 1. BadgeFactory

**File**: `badge-manager/scrypto/radix-badge-manager/src/lib.rs` (lines 337–472)
**Status**: ✅ Live on Mainnet
**Address**: `component_rdx1cqlakjp65k8zkznynynsqpjcu7fwt9zcdvee358p948wp9h4n2km99`

### Purpose
Deploy once, anyone can create their own BadgeManager through it. Factory pattern for permissionless badge infrastructure.

### State
```rust
struct BadgeFactory {
    managers: Vec<ComponentAddress>,  // all created managers
    total_managers: u64,              // count
    paused: bool,                     // emergency stop
}
```

### Methods

| Method | Auth | Returns | Description |
|--------|------|---------|-------------|
| `instantiate()` | — | `(Global<BadgeFactory>, Bucket)` | Deploy factory, returns component + owner badge |
| `create_manager(schema_name, valid_tiers, default_tier, free_mint_enabled, badge_name, badge_description, dapp_definition)` | PUBLIC | `(Global<BadgeManager>, Bucket)` | Create new manager + admin badge. 5 XRD royalty. |
| `get_manager_count()` | PUBLIC | `u64` | Total managers created |
| `get_factory_info()` | PUBLIC | `(u64, bool)` | (total_managers, paused) |
| `pause_factory()` | factory_admin / OWNER | — | Emergency pause |
| `unpause_factory()` | factory_admin / OWNER | — | Resume operations |

### Events
- `ManagerCreatedEvent { manager_address, schema_name, created_at }`

---

## 2. BadgeManager

**File**: `badge-manager/scrypto/radix-badge-manager/src/lib.rs` (lines 79–331)
**Status**: ✅ Live on Mainnet (multiple instances)

### Purpose
Mint, manage, and track NFT badges with tiers, XP, levels, and extensible metadata.

### NFT Data: UniversalBadgeData
```rust
pub struct UniversalBadgeData {
    pub issued_to: String,       // immutable — username
    pub schema_name: String,     // immutable — e.g. "guild_member"
    pub issued_at: i64,          // immutable — unix timestamp
    pub tier: String,            // mutable — member/contributor/builder/steward/elder
    pub status: String,          // mutable — active/revoked
    pub last_updated: i64,       // mutable — unix timestamp
    pub xp: u64,                 // mutable — experience points
    pub level: String,           // mutable — auto-calculated from XP
    pub extra_data: String,      // mutable — JSON for custom fields
}
```

### NFT ID Format
String-based: `{schema_name}_{sanitized_username}`
- Sanitization: lowercase, alphanumeric + underscore + hyphen only
- Example: `guild_member_alice`, `guild_member_bob-123`

### XP → Level Mapping
```
0–99       → member
100–499    → contributor
500–1999   → builder
2000–9999  → steward
10000+     → elder
```

### State
```rust
struct BadgeManager {
    minter_vault: Vault,
    badge_resource: ResourceManager,
    schema_name: String,
    valid_tiers: Vec<String>,
    default_tier: String,
    free_mint_enabled: bool,
    total_minted: u64,
    total_revoked: u64,
}
```

### Methods

| Method | Auth | Returns | Description |
|--------|------|---------|-------------|
| `instantiate(schema_name, valid_tiers, default_tier, free_mint_enabled, badge_name, badge_description, dapp_definition, owner_badge_address)` | — | `Global<BadgeManager>` | Create manager instance |
| `public_mint(username)` | PUBLIC | `Bucket` | Free mint (if enabled). Returns badge NFT. |
| `mint_badge(username, tier)` | admin / OWNER | `Bucket` | Admin mint with specific tier. 1 XRD royalty. |
| `revoke_badge(badge_id, reason)` | admin / OWNER | — | Set status=revoked, tier=revoked. 0.5 XRD royalty. |
| `update_tier(badge_id, new_tier)` | admin / OWNER | — | Change tier. 0.25 XRD royalty. |
| `update_xp(badge_id, new_xp)` | admin / OWNER | — | Update XP + auto-calculate level. 0.1 XRD royalty. |
| `update_extra_data(badge_id, extra_data)` | admin / OWNER | — | Update JSON metadata. 0.1 XRD royalty. |
| `get_badge_info(badge_id)` | PUBLIC | `UniversalBadgeData` | Read badge data |
| `get_badge_resource()` | PUBLIC | `ResourceAddress` | Get badge NFT resource address |
| `get_schema_name()` | PUBLIC | `String` | Get schema name |
| `get_valid_tiers()` | PUBLIC | `Vec<String>` | Get valid tier list |
| `get_stats()` | PUBLIC | `(u64, u64)` | (total_minted, total_revoked) |

### Events
- `BadgeMintedEvent { badge_id, issued_to, tier, schema_name }`
- `BadgeRevokedEvent { badge_id, reason }`
- `TierUpgradedEvent { badge_id, old_tier, new_tier }`
- `XpUpdatedEvent { badge_id, new_xp, new_level }`

---

## 3. TaskEscrow

**File**: `badge-manager/scrypto/task-escrow/src/lib.rs` (lines 45–401)
**Status**: ✅ Live on Mainnet
**Address**: `component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r`

### Purpose
On-chain escrow for task marketplace. XRD locked in per-task vaults. Badge-gated claiming. Fee on release, not deposit. Receipt NFTs for cancellation rights.

### NFT Data: TaskReceipt
```rust
pub struct TaskReceipt {
    pub task_id: u64,
    pub amount: Decimal,
    pub created_at: i64,
    pub status: String,     // mutable — open/claimed/submitted/completed/cancelled
}
```

### Task Data: TaskInfo
```rust
pub struct TaskInfo {
    pub creator: ComponentAddress,
    pub worker: Option<ComponentAddress>,
    pub amount: Decimal,
    pub status: String,     // open/claimed/submitted/completed/cancelled
    pub created_at: i64,
    pub deadline: Option<i64>,
}
```

### Task Lifecycle
```
open → claimed → submitted → completed
  |                              ↑
  └→ cancelled              (verifier releases)
       ↑
  (creator cancels with receipt OR verifier force-cancels OR expired)
```

### State
```rust
struct TaskEscrow {
    task_vaults: KeyValueStore<u64, Vault>,     // per-task XRD vault
    tasks: KeyValueStore<u64, TaskInfo>,         // task metadata
    fee_vault: Vault,                            // collected fees
    minter_vault: Vault,                         // internal minter badge
    receipt_manager: ResourceManager,            // receipt NFT manager
    badge_resource: ResourceAddress,             // guild badge for claiming
    next_id: u64,
    fee_pct: Decimal,                            // e.g. 2.5 = 2.5%
    min_deposit: Decimal,                        // minimum XRD to create task
    total_tasks: u64,
    total_completed: u64,
    total_cancelled: u64,
    total_escrowed: Decimal,
    total_released: Decimal,
}
```

### Methods

| Method | Auth | Returns | Description |
|--------|------|---------|-------------|
| `instantiate(fee_pct, min_deposit, verifier_badge, guild_badge, owner_badge, dapp_def)` | — | `Global<TaskEscrow>` | Deploy escrow |
| `create_task(xrd_bucket, creator, deadline)` | PUBLIC | `Bucket` | Fund task, get receipt NFT. 0.5 XRD royalty. |
| `claim_task(task_id, worker, badge_proof)` | PUBLIC | — | Claim open task (badge required) |
| `submit_task(task_id, badge_proof)` | PUBLIC | — | Mark task submitted (badge required) |
| `release_task(task_id)` | verifier / OWNER | — | Release funds to worker (fee deducted). 0.25 XRD royalty. |
| `cancel_task(task_id, receipt_proof)` | PUBLIC | `Bucket` | Cancel open task, get full refund (receipt required) |
| `force_cancel(task_id)` | verifier / OWNER | — | Force-cancel, refund to creator |
| `expire_task(task_id)` | verifier / OWNER | — | Expire overdue task, refund to creator |
| `get_task_info(task_id)` | PUBLIC | `TaskInfo` | Read task data |
| `get_stats()` | PUBLIC | `(u64, u64, u64, Decimal, Decimal, Decimal)` | (total, completed, cancelled, escrowed, released, fees) |
| `get_platform_fee()` | PUBLIC | `Decimal` | Current fee percentage |
| `get_receipt_resource()` | PUBLIC | `ResourceAddress` | Receipt NFT address |
| `update_fee(new_fee_pct)` | OWNER | — | Update fee (0-10% cap) |
| `update_min_deposit(new_min)` | OWNER | — | Update minimum deposit |
| `withdraw_fees()` | OWNER | `Bucket` | Withdraw collected fees |

### Events
- `TaskCreatedEvent { task_id, amount, creator }`
- `TaskClaimedEvent { task_id, worker }`
- `TaskSubmittedEvent { task_id, worker }`
- `TaskReleasedEvent { task_id, worker, payout, fee }`
- `TaskCancelledEvent { task_id, refunded }`

---

## 4. ConvictionVoting (Designed — Not Yet Implemented)

**Spec**: `docs/architecture/04-CONVICTION-VOTING.md`

### Purpose
Time-weighted staking governance. Conviction accumulates exponentially over time. Threshold scales with amount requested from shared pool. Badge tier multipliers amplify voting power.

### Key Formula
```
y(t+1) = alpha * y(t) + S(t)
threshold = (rho * effective_supply) / ((1 - alpha) * (pool_balance * beta - requested)^2)
```

### Planned Methods
- `create_proposal(title, description, requested_amount, beneficiary, badge_proof)`
- `stake(proposal_id, xrd_bucket, badge_proof)`
- `unstake(proposal_id, receipt_proof)`
- `update_conviction(proposal_id)` — anyone can trigger recalculation
- `execute_proposal(proposal_id)` — auto-executes if conviction >= threshold
- `fund_pool(xrd_bucket)` — add XRD to shared pool

---

## 5. TaskEscrow V3 (Designed — Not Yet Implemented)

**Spec**: `docs/architecture/02-ESCROW-V3.md`

### Key Changes from V2
- Accept any whitelisted fungible token (not just XRD)
- Per-token fee vaults: `KeyValueStore<ResourceAddress, Vault>`
- Per-token minimums: `KeyValueStore<ResourceAddress, Decimal>`
- New admin methods: `add_accepted_token()`, `remove_accepted_token()`, `update_token_min_deposit()`
- `withdraw_fees(resource)` takes a resource address parameter
- `get_stats()` simplified to `(u64, u64, u64)` — financial totals derived from events off-chain
