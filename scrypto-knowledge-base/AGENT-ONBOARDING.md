# Scrypto Agent Onboarding

> Read this first when any task involves Scrypto, blueprints, on-chain components, manifests, or Radix smart contracts.

## What Is Scrypto?

Scrypto is the asset-oriented smart contract language for the Radix network. It compiles to WASM and runs on the Radix Engine. Key differences from Solidity/EVM:

- **Asset-oriented**: Resources (tokens, NFTs) are first-class objects, not balance mappings
- **Blueprint/Component model**: Blueprints are templates (like classes), Components are instances (like objects)
- **Rust-based**: Uses Rust syntax with Scrypto-specific macros and types
- **Auth via badges**: Role-based access control uses token proofs, not msg.sender
- **Vaults**: Resources live in Vaults, not arbitrary storage slots

## Our Codebase at a Glance

```
badge-manager/scrypto/
├── radix-badge-manager/     # BadgeFactory + BadgeManager blueprints
│   ├── src/lib.rs           # 2 blueprints, 472 lines
│   ├── tests/lib.rs         # 11 tests
│   └── Cargo.toml           # scrypto 1.3.1
└── task-escrow/             # TaskEscrow blueprint
    ├── src/lib.rs           # 1 blueprint, 401 lines
    ├── tests/escrow_test.rs # 8 tests
    ├── DEPLOY.md            # Deployment instructions
    └── Cargo.toml           # scrypto 1.3.1
```

## Essential Scrypto Types (Used In Our Code)

| Type | What It Is | Example |
|------|-----------|---------|
| `Bucket` | A container holding resources in transit | `fn create_task(&mut self, xrd_bucket: Bucket, ...)` |
| `Vault` | Permanent storage for resources in a component | `fee_vault: Vault` |
| `ResourceManager` | Handle to a resource definition (mint/burn/update) | `badge_resource: ResourceManager` |
| `ResourceAddress` | Address of a resource type | `badge_resource: ResourceAddress` |
| `ComponentAddress` | Address of a deployed component | `creator: ComponentAddress` |
| `GlobalAddress` | Address of any global entity | `dapp_definition: GlobalAddress` |
| `NonFungibleLocalId` | Unique ID within an NFT collection | `NonFungibleLocalId::String(id)` |
| `Proof` | Cryptographic proof of resource ownership | `badge_proof: Proof` |
| `Decimal` | Fixed-point decimal (192-bit) | `dec!("2.5")` |
| `KeyValueStore<K, V>` | On-ledger key-value storage (not iterable) | `tasks: KeyValueStore<u64, TaskInfo>` |

## Essential Macros (Used In Our Code)

```rust
#[blueprint]                    // Marks a module as a Scrypto blueprint
#[events(...)]                  // Registers event types for a blueprint
#[derive(ScryptoSbor)]          // SBOR serialization (Scrypto's encoding)
#[derive(NonFungibleData)]      // Marks a struct as NFT data
#[derive(ScryptoEvent)]         // Marks a struct as an emittable event
#[mutable]                      // Marks an NFT data field as updateable
enable_method_auth! { ... }     // Defines role-based access for methods
metadata! { ... }               // Defines metadata on resources/components
mint_roles! { ... }             // Controls who can mint a resource
burn_roles! { ... }             // Controls who can burn a resource
rule!(require(...))             // Auth rule requiring a badge
rule!(deny_all)                 // Auth rule blocking everyone
component_royalties! { ... }   // Sets method call fees
```

## Our Key Patterns

### 1. Internal Minter Badge
Every blueprint creates an internal fungible badge used to authorize minting/burning/updating NFTs. This badge is stored in a Vault and never leaves the component.

```rust
let minter_badge = ResourceBuilder::new_fungible(OwnerRole::None)
    .mint_initial_supply(1);
// ... later authorize:
self.minter_vault.as_fungible().authorize_with_amount(1, || {
    self.badge_resource.mint_non_fungible(&local_id, data)
});
```

### 2. Per-Entity Vaults
TaskEscrow uses one Vault per task (via KeyValueStore) for fund isolation:
```rust
task_vaults: KeyValueStore<u64, Vault>,
// ...
self.task_vaults.insert(task_id, Vault::with_bucket(xrd_bucket));
```

### 3. Receipt NFTs
Both blueprints issue NFTs as receipts/proofs. Holders use proofs to authorize actions:
```rust
// Mint receipt on create
let receipt = self.minter_vault.as_fungible().authorize_with_amount(1, || {
    self.receipt_manager.mint_non_fungible(&nft_id, receipt_data)
});
// Verify receipt on cancel
let checked = receipt_proof.check_with_message(self.receipt_manager.address(), "Invalid");
```

### 4. Badge-Gated Methods
Methods requiring membership use Proof checks:
```rust
pub fn claim_task(&mut self, task_id: u64, worker: ComponentAddress, badge_proof: Proof) {
    let checked = badge_proof.check_with_message(self.badge_resource, "Must hold guild badge");
    checked.drop();
    // ... proceed
}
```

## Transaction Manifests

Frontend talks to Scrypto via transaction manifests (RTM format). Our manifests live in `guild-app/src/lib/manifests.ts`. Key patterns:

```
// Withdraw XRD from account
CALL_METHOD Address("<account>") "withdraw" Address("<XRD>") Decimal("100");

// Put it in a named bucket
TAKE_ALL_FROM_WORKTOP Address("<XRD>") Bucket("payment");

// Call a component method
CALL_METHOD Address("<component>") "create_task" Bucket("payment") Address("<account>") Enum<0u8>();

// Deposit everything back
CALL_METHOD Address("<account>") "deposit_batch" Expression("ENTIRE_WORKTOP");
```

## On-Chain Reads (Gateway API)

Our bot reads on-chain state via the Radix Gateway API (`bot/services/gateway.js`):
- `POST /state/entity/details` — read component state fields
- `POST /state/non-fungible/data` — read NFT data
- `POST /transaction/committed-details` — verify transactions

## Next Blueprints to Build

1. **ConvictionVoting** — Full spec in `docs/architecture/04-CONVICTION-VOTING.md`
2. **TaskEscrow V3** — Multi-token support spec in `docs/architecture/02-ESCROW-V3.md`
3. **ProposalExecutor** — Bridge between governance votes and escrow funding (CV3 pipeline)

## Scrypto Version

All our code targets **Scrypto 1.3.1**. Cargo.toml:
```toml
[dependencies]
scrypto = { version = "1.3.1" }
[dev-dependencies]
scrypto-test = { version = "1.3.1" }
```
