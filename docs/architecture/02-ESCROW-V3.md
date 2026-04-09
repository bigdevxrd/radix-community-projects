Now I have a thorough understanding of all integration points. Let me compile the full design spec.

---

# TaskEscrow V3 Design Specification -- Multi-Token Support

## 1. Scrypto Struct Changes

### TaskReceipt -- add resource tracking

The existing `TaskReceipt` NFT data must record which token was escrowed so the receipt is self-documenting:

```
pub struct TaskReceipt {
    pub task_id: u64,
    pub amount: Decimal,
    pub resource: ResourceAddress,   // NEW
    pub created_at: i64,
    #[mutable]
    pub status: String,
}
```

### TaskInfo -- add resource tracking

Same addition to the off-chain queryable struct:

```
pub struct TaskInfo {
    pub creator: ComponentAddress,
    pub worker: Option<ComponentAddress>,
    pub amount: Decimal,
    pub resource: ResourceAddress,   // NEW
    pub status: String,
    pub created_at: i64,
    pub deadline: Option<i64>,
}
```

### TaskEscrow struct -- full field list

The main component struct changes from V2 in three areas: the fee vault becomes a KVS of vaults, the single `min_deposit` becomes per-token minimums with a whitelist, and the aggregate stats that were XRD-only need to become per-token or be removed.

```
struct TaskEscrow {
    // Unchanged from V2
    task_vaults: KeyValueStore<u64, Vault>,
    tasks: KeyValueStore<u64, TaskInfo>,
    minter_vault: Vault,
    receipt_manager: ResourceManager,
    badge_resource: ResourceAddress,
    next_id: u64,
    fee_pct: Decimal,
    total_tasks: u64,
    total_completed: u64,
    total_cancelled: u64,

    // CHANGED: single fee_vault -> one vault per token type
    fee_vaults: KeyValueStore<ResourceAddress, Vault>,

    // CHANGED: single min_deposit -> per-token whitelist + minimums
    accepted_tokens: KeyValueStore<ResourceAddress, Decimal>,
    // The value IS the minimum deposit. If a key exists, the token is accepted.

    // REMOVED: total_escrowed, total_released (these were XRD-denominated Decimals).
    // Replace with per-token tracking or remove entirely.
    // Recommendation: remove from on-chain state; derive from events off-chain.
    // Alternative: KeyValueStore<ResourceAddress, Decimal> for total_escrowed_by_token
    //              and total_released_by_token. But KVS entries cannot be iterated
    //              on-chain, so the get_stats method cannot sum them.
    //              Decision: KEEP simple u64 counters (total_tasks, total_completed,
    //              total_cancelled). DROP the Decimal aggregates. Off-chain indexing
    //              via events handles the rest.
}
```

**Rationale for dropping total_escrowed / total_released**: In V2 these are single Decimals denominated in XRD. With multiple tokens they become meaningless unless you track per-token, but Scrypto KVS is not iterable so `get_stats` cannot return a summary. The cleaner approach is to keep task/completion counters on-chain and derive financial totals off-chain from emitted events.

### Events -- add resource field

All financial events gain a `resource` field:

```
TaskCreatedEvent   { task_id, amount, resource, creator }
TaskReleasedEvent  { task_id, worker, payout, fee, resource }
TaskCancelledEvent { task_id, refunded, resource }
```

`TaskClaimedEvent` and `TaskSubmittedEvent` are unchanged (no financial data).

A new admin event for token whitelist changes:

```
TokenWhitelistEvent { resource, min_deposit, action: String }  // action = "added" | "removed" | "updated"
```

---

## 2. New Admin Methods

All three are `restrict_to: [OWNER]`.

### add_accepted_token(resource: ResourceAddress, min_deposit: Decimal)

- Assert `min_deposit > Decimal::ZERO`
- Assert the resource is not already accepted (check KVS `.get()`)
- Insert into `accepted_tokens` KVS
- Create a new `Vault::new(resource)` in `fee_vaults` KVS for this token
- Emit `TokenWhitelistEvent`

### update_token_min_deposit(resource: ResourceAddress, new_min: Decimal)

- Assert `new_min > Decimal::ZERO`
- Assert the resource exists in `accepted_tokens`
- Update the KVS entry
- Emit `TokenWhitelistEvent`

### remove_accepted_token(resource: ResourceAddress)

- Assert the resource exists in `accepted_tokens`
- Assert no open tasks use this token (this is complex to enforce on-chain because tasks KVS is not iterable; recommendation: skip this check and instead only prevent NEW task creation with this token; existing tasks using the removed token still complete normally)
- Remove from `accepted_tokens` KVS
- Do NOT remove the fee vault (it may still hold collected fees)
- Emit `TokenWhitelistEvent`

### get_accepted_token_min(resource: ResourceAddress) -> Option<Decimal>

- Public read method. Returns the minimum deposit for a given resource, or None if not accepted.
- This is needed because KVS is not iterable; callers must query specific tokens.

### withdraw_fees(resource: ResourceAddress) -> Bucket

- Changed from V2's parameterless version. Now takes a resource address.
- Takes all from the corresponding fee vault.
- `restrict_to: [OWNER]`

---

## 3. Modified Methods

### create_task(token_bucket: Bucket, creator: ComponentAddress, deadline: Option<i64>) -> Bucket

Changes from V2:
1. Remove `assert!(xrd_bucket.resource_address() == XRD)`.
2. Read `let resource = token_bucket.resource_address()`.
3. Look up `self.accepted_tokens.get(&resource)` -- panic if None with message "Token not accepted".
4. The returned value IS the minimum deposit for this token. Assert `amount >= min`.
5. Store `resource` in `TaskInfo`.
6. Store `resource` in `TaskReceipt` NFT data.
7. Emit `TaskCreatedEvent` with `resource` field.
8. The vault creation is already per-task (`Vault::with_bucket`), so it naturally supports any fungible. No change needed there.

### release_task(task_id: u64)

Changes from V2:
1. Read `resource` from the task's `TaskInfo`.
2. Fee calculation unchanged: `fee = amount * fee_pct / 100`.
3. Fee bucket goes into `self.fee_vaults.get_mut(&resource)` instead of `self.fee_vault`.
4. If the fee vault for this resource does not exist (edge case: token was removed from whitelist after task was created), create a new vault on the fly: `Vault::with_bucket(fee_bucket)` and insert into `fee_vaults`.
5. Remainder deposited to worker account (unchanged logic).
6. Emit event with `resource`.

### cancel_task(task_id: u64, receipt_proof: Proof) -> Bucket

Changes from V2:
1. Full refund in original token (the vault already holds the correct token, so `vault.take_all()` returns the right thing). No code change needed for the refund itself.
2. Emit event with `resource`.
3. The `total_escrowed -= refunded` line is removed (field no longer exists).

### force_cancel(task_id: u64) and expire_task(task_id: u64)

Same pattern as cancel_task. The vault already holds the correct token. Remove the `total_escrowed` bookkeeping. Add `resource` to the emitted event.

### get_stats() -> (u64, u64, u64)

Simplified return: `(total_tasks, total_completed, total_cancelled)`. Remove the Decimal fields. The bot/dashboard derive financial stats from events or their own DB.

### get_task_info(task_id: u64) -> TaskInfo

Unchanged in logic, but now returns `TaskInfo` which includes the `resource` field.

---

## 4. Fee Vault Architecture

**Decision: One vault per token type (not a single XRD vault with swap).**

Rationale:
- Swapping to XRD on-chain requires integrating a DEX (Ociswap, CaviarNine, etc.) via component calls. This adds external dependencies, slippage risk, and potential failure modes to the release_task path. A failed DEX call would block task completion.
- Per-token fee vaults are simple, deterministic, and require zero external dependencies.
- The owner can withdraw fees per token and swap off-chain at their discretion, getting better execution than on-chain AMMs for small amounts.
- The `fee_vaults: KeyValueStore<ResourceAddress, Vault>` pattern is standard in Scrypto for multi-token treasury components.

Implementation detail: Fee vaults are lazily created. When `add_accepted_token` is called, 
