# Scrypto Patterns & Best Practices

> Patterns extracted from our codebase and Radix ecosystem conventions. Use these when writing new blueprints or reviewing Scrypto code.

---

## 1. Blueprint Structure

Every blueprint in our codebase follows this structure:

```rust
use scrypto::prelude::*;

// 1. Shared types (NFT data, enums)
#[derive(ScryptoSbor, NonFungibleData, Clone)]
pub struct MyNftData { ... }

// 2. Events
#[derive(ScryptoSbor, ScryptoEvent)]
pub struct MyEvent { ... }

// 3. Blueprint
#[blueprint]
#[events(MyEvent, ...)]
mod my_blueprint {
    enable_method_auth! { ... }

    struct MyComponent { ... }

    impl MyComponent {
        pub fn instantiate(...) -> Global<MyComponent> { ... }
        // Public methods
        // Admin methods
        // Internal helpers
    }
}
```

**Conventions we follow:**
- Shared types (NFT data, structs) go ABOVE the blueprint module so they're accessible from tests
- Events are defined ABOVE the blueprint module
- `enable_method_auth!` is always present for access control
- `instantiate()` is always the first method, returns `Global<Self>`

---

## 2. Internal Minter Badge Pattern

**Problem**: Components need to mint/burn/update NFTs they manage, but we don't want external callers to have this power.

**Solution**: Create a fungible "minter badge" at instantiation, store it in a Vault, and use `authorize_with_amount` for privileged operations.

```rust
// In instantiate():
let minter_badge = ResourceBuilder::new_fungible(OwnerRole::None)
    .divisibility(DIVISIBILITY_NONE)
    .metadata(metadata!(init { "name" => "Internal Minter", locked; }))
    .mint_initial_supply(1);

let minter_address = minter_badge.resource_address();

// Create NFT resource that only the minter can mint/burn/update
let nft_resource = ResourceBuilder::new_string_non_fungible::<MyNftData>(
    OwnerRole::Updatable(rule!(require(owner_badge_address))),
)
.mint_roles(mint_roles!(
    minter => rule!(require(minter_address));
    minter_updater => rule!(deny_all);
))
.burn_roles(burn_roles!(
    burner => rule!(require(minter_address));
    burner_updater => rule!(deny_all);
))
.non_fungible_data_update_roles(non_fungible_data_update_roles!(
    non_fungible_data_updater => rule!(require(minter_address));
    non_fungible_data_updater_updater => rule!(deny_all);
))
.create_with_no_initial_supply();

// Store in struct
Self {
    minter_vault: Vault::with_bucket(minter_badge.into()),
    ...
}

// Usage — authorize privileged operations:
self.minter_vault.as_fungible().authorize_with_amount(1, || {
    self.nft_resource.mint_non_fungible(&id, data)
});
```

**Used in**: BadgeManager (badge minting/updating), TaskEscrow (receipt minting/updating)

---

## 3. Per-Entity Vault Isolation

**Problem**: A shared vault means one bad operation affects all funds.

**Solution**: Use `KeyValueStore<EntityId, Vault>` for per-entity fund isolation.

```rust
struct TaskEscrow {
    task_vaults: KeyValueStore<u64, Vault>,  // one vault per task
    fee_vault: Vault,                         // separate vault for fees
    ...
}

// Create isolated vault
self.task_vaults.insert(task_id, Vault::with_bucket(xrd_bucket));

// Access with scoped borrow (IMPORTANT: drop before using self)
let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
let funds = vault.take_all();
drop(vault);  // ← must drop before accessing other self fields
self.fee_vault.put(fee_bucket);
```

**Critical pattern**: Always `drop()` KVS borrows before accessing other `self` fields. Rust's borrow checker enforces this.

---

## 4. Receipt NFT Pattern

**Problem**: Users need proof they created a task/stake/deposit to authorize cancellation.

**Solution**: Mint an NFT receipt on creation, require a Proof of that receipt for cancellation.

```rust
// On create — mint receipt and return to caller
let receipt = self.minter_vault.as_fungible().authorize_with_amount(1, || {
    self.receipt_manager.mint_non_fungible(
        &NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id)),
        TaskReceipt { task_id, amount, created_at: now, status: "open".to_string() },
    )
});
return receipt;  // caller gets the NFT

// On cancel — verify receipt proof
pub fn cancel_task(&mut self, task_id: u64, receipt_proof: Proof) -> Bucket {
    let checked = receipt_proof.check_with_message(
        self.receipt_manager.address(), "Invalid receipt"
    );
    let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
    assert!(checked.as_non_fungible().non_fungible_local_ids().contains(&nft_id),
        "Receipt does not match task");
    checked.drop();
    // ... proceed with cancellation
}
```

**Used in**: TaskEscrow (task receipts), ConvictionVoting spec (stake receipts)

---

## 5. Badge-Gated Access

**Problem**: Certain actions should only be available to badge holders (guild members).

**Solution**: Accept a `Proof` parameter and validate it against the expected resource.

```rust
pub fn claim_task(&mut self, task_id: u64, worker: ComponentAddress, badge_proof: Proof) {
    let checked = badge_proof.check_with_message(
        self.badge_resource, "Must hold a guild badge"
    );
    checked.drop();  // must drop after checking
    // ... proceed
}
```

**In manifests** (frontend):
```
CALL_METHOD Address("<account>") "create_proof_of_non_fungibles"
    Address("<badge_nft>") Array<NonFungibleLocalId>();
POP_FROM_AUTH_ZONE Proof("badge_proof");
CALL_METHOD Address("<escrow>") "claim_task" 1u64 Address("<account>") Proof("badge_proof");
```

---

## 6. Role-Based Method Auth

**Pattern**: Use `enable_method_auth!` for declarative access control.

```rust
enable_method_auth! {
    roles {
        admin => updatable_by: [OWNER];
        verifier => updatable_by: [OWNER];
    },
    methods {
        // Public methods — anyone can call
        get_stats => PUBLIC;
        create_task => PUBLIC;
        cancel_task => PUBLIC;

        // Restricted methods — need specific role
        release_task => restrict_to: [verifier, OWNER];
        update_fee => restrict_to: [OWNER];
        mint_badge => restrict_to: [admin, OWNER];
    }
}
```

**Roles are assigned at globalize time:**
```rust
.prepare_to_globalize(OwnerRole::Fixed(rule!(require(owner_badge_address))))
.roles(roles!(
    verifier => rule!(require(verifier_badge));
))
```

---

## 7. Component Royalties

**Pattern**: Set method-level fees for sustainability.

```rust
.enable_component_royalties(component_royalties! {
    init {
        // Revenue methods — charge a fee
        create_task => Xrd(dec!("0.5")), updatable;
        mint_badge => Xrd(1.into()), updatable;

        // Read methods — always free
        get_stats => Free, locked;
        get_task_info => Free, locked;
    }
})
```

**Our convention**: Reads are `Free, locked`. Writes are `Xrd(amount), updatable`.

---

## 8. Event Emission

**Pattern**: Emit events for off-chain indexing.

```rust
#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskCreatedEvent {
    pub task_id: u64,
    pub amount: Decimal,
    pub creator: ComponentAddress,
}

// Register in blueprint
#[blueprint]
#[events(TaskCreatedEvent, TaskReleasedEvent, ...)]
mod task_escrow { ... }

// Emit
Runtime::emit_event(TaskCreatedEvent { task_id, amount, creator });
```

**Off-chain reading** (bot/services/gateway.js):
```javascript
const events = tx.receipt?.events || [];
const createEvent = events.find(e =>
    e.name === "TaskCreatedEvent" &&
    e.emitter?.entity?.entity_address === ESCROW_COMPONENT
);
```

---

## 9. NFT ID Strategies

### String IDs (BadgeManager)
Used when the ID has semantic meaning (username-based):
```rust
let sanitized = username.to_lowercase()
    .chars()
    .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
    .collect::<String>();
let id = StringNonFungibleLocalId::new(
    format!("{}_{}", self.schema_name, sanitized)
).expect("Invalid NFT ID");
let local_id = NonFungibleLocalId::String(id);
```

### Integer IDs (TaskEscrow)
Used for sequential entities:
```rust
let task_id = self.next_id;
self.next_id += 1;
let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
```

---

## 10. KVS Borrow Scoping

**Critical pattern**: Scrypto's `KeyValueStore` returns mutable references that must be dropped before accessing other `self` fields.

```rust
// ❌ BAD — borrow conflict
let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
task.status = "completed".to_string();
self.total_completed += 1;  // ERROR: self is already borrowed

// ✅ GOOD — scope the borrow
{
    let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
    task.status = "completed".to_string();
}  // task dropped here
self.total_completed += 1;  // OK — self is free
```

---

## 11. Instantiation Conventions

All our blueprints follow this instantiation pattern:

```rust
pub fn instantiate(
    // All params are primitive types — no custom structs cross the boundary
    schema_name: String,
    valid_tiers: Vec<String>,
    ...
) -> Global<Self> {
    // 1. Assertions on inputs
    assert!(!schema_name.is_empty(), "Schema name required");

    // 2. Create internal badges
    let minter_badge = ResourceBuilder::new_fungible(OwnerRole::None)...

    // 3. Create NFT resources
    let nft_resource = ResourceBuilder::new_string_non_fungible::<Data>(...)...

    // 4. Build component
    Self { ... }
    .instantiate()
    .prepare_to_globalize(OwnerRole::Fixed(rule!(require(owner_badge))))
    .metadata(metadata!(...))
    .enable_component_royalties(component_royalties!(...))
    .globalize()
}
```

**Key rule**: All instantiation parameters are primitive types (String, Vec<String>, Decimal, ResourceAddress, etc.). No custom structs cross the function boundary — this avoids SBOR encoding issues when calling from manifests.

---

## 12. Test Patterns

### LedgerSimulator tests (BadgeManager)
```rust
use scrypto_test::prelude::*;

#[test]
fn test_something() {
    let mut ledger = LedgerSimulatorBuilder::new().build();
    let (public_key, _private_key, account) = ledger.new_allocated_account();
    let package_address = ledger.compile_and_publish(this_package!());

    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_function(package_address, "BlueprintName", "instantiate", manifest_args!(...))
        .call_method(account, "deposit_batch", manifest_args!(ManifestExpression::EntireWorktop))
        .build();

    let receipt = ledger.execute_manifest(manifest, vec![NonFungibleGlobalId::from_public_key(&public_key)]);
    receipt.expect_commit_success();
}
```

### TestEnvironment tests (TaskEscrow)
```rust
use scrypto_test::prelude::*;

fn setup() -> (TestEnvironment, Global<TaskEscrow>, Bucket, ResourceAddress) {
    let mut env = TestEnvironment::new();
    let owner_badge = ResourceBuilder::new_fungible(OwnerRole::None)
        .divisibility(DIVISIBILITY_NONE)
        .mint_initial_supply(1, &mut env).unwrap();
    // ... instantiate component
    (env, escrow, owner_badge, verifier_address)
}

#[test]
fn test_something() {
    let (mut env, mut escrow, _, _) = setup();
    let xrd = BucketFactory::create_fungible_bucket(XRD, 100.into(), Mock, &mut env).unwrap();
    // ... test operations
}
```
