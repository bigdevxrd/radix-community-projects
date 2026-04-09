# Issue #9 — Build Manager Registry Component

> register_manager, discover, bolt_on, bolt_off

## Problem Analysis

Currently the BadgeFactory creates BadgeManager instances, but there's no on-chain registry to discover existing managers. Each manager is an independent component — there's no way to enumerate all managers created by the factory, or to compose/extend managers with additional functionality.

The "bolt_on / bolt_off" pattern suggests a plugin architecture where managers can have optional modules attached (e.g., delegation, reputation, marketplace integration).

### Current State

- `BadgeFactory.create_manager()` → creates a new BadgeManager + admin badge
- `BadgeFactory.get_manager_count()` → returns total count (but not addresses)
- No way to list all managers or discover them by schema name
- No plugin/extension mechanism

## Solution Design

### Scrypto Blueprint: `ManagerRegistry`

```rust
use scrypto::prelude::*;

#[derive(ScryptoSbor, NonFungibleData)]
struct ManagerEntry {
    component_address: ComponentAddress,
    badge_resource: ResourceAddress,
    admin_badge_resource: ResourceAddress,
    schema_name: String,
    dao_name: String,
    description: String,
    registered_at: i64,
    #[mutable]
    status: String,                      // "active", "suspended"
    #[mutable]
    bolt_ons: Vec<String>,               // List of active bolt-on module names
    #[mutable]
    metadata: String,                    // JSON: website, icon, etc.
}

#[blueprint]
#[events(ManagerRegisteredEvent, BoltOnAttachedEvent, BoltOnDetachedEvent)]
mod manager_registry {
    struct ManagerRegistry {
        managers: KeyValueStore<ComponentAddress, ManagerEntry>,
        by_schema: KeyValueStore<String, Vec<ComponentAddress>>,  // schema → managers
        available_bolt_ons: KeyValueStore<String, ComponentAddress>, // bolt-on name → component
        manager_count: u64,
        registry_admin: ResourceAddress,
        factory_address: ComponentAddress,  // reference to BadgeFactory
    }

    impl ManagerRegistry {
        /// Instantiate a new registry
        pub fn instantiate(
            factory_address: ComponentAddress,
            dapp_definition: ComponentAddress,
        ) -> (Global<ManagerRegistry>, Bucket) {
            // Creates registry + admin badge
            // ...
        }

        // ═══════════════════════════════════════
        // Registration
        // ═══════════════════════════════════════

        /// Register a new manager in the registry
        /// Called by the manager's admin (must present admin badge proof)
        pub fn register_manager(
            &mut self,
            manager_address: ComponentAddress,
            badge_resource: ResourceAddress,
            admin_proof: Proof,
            schema_name: String,
            dao_name: String,
            description: String,
        ) -> u64;  // returns registry entry ID

        /// Update manager metadata (admin only)
        pub fn update_manager(
            &mut self,
            manager_address: ComponentAddress,
            admin_proof: Proof,
            metadata: String,
        );

        /// Suspend a manager (registry admin only)
        pub fn suspend_manager(
            &mut self,
            manager_address: ComponentAddress,
        );

        /// Reactivate a suspended manager (registry admin only)
        pub fn reactivate_manager(
            &mut self,
            manager_address: ComponentAddress,
        );

        // ═══════════════════════════════════════
        // Discovery
        // ═══════════════════════════════════════

        /// List all registered managers
        pub fn discover(&self) -> Vec<ManagerEntry>;

        /// Find managers by schema name
        pub fn discover_by_schema(&self, schema_name: String) -> Vec<ManagerEntry>;

        /// Get a specific manager entry
        pub fn get_manager(&self, manager_address: ComponentAddress) -> Option<ManagerEntry>;

        /// Get registry stats
        pub fn get_stats(&self) -> (u64, u64);  // (total_registered, total_active)

        // ═══════════════════════════════════════
        // Bolt-On System
        // ═══════════════════════════════════════

        /// Register a bolt-on module (registry admin only)
        /// Bolt-ons are optional components that extend manager functionality
        pub fn register_bolt_on(
            &mut self,
            name: String,
            component_address: ComponentAddress,
            description: String,
        );

        /// Attach a bolt-on to a manager (manager admin only)
        pub fn bolt_on(
            &mut self,
            manager_address: ComponentAddress,
            bolt_on_name: String,
            admin_proof: Proof,
        );

        /// Detach a bolt-on from a manager (manager admin only)
        pub fn bolt_off(
            &mut self,
            manager_address: ComponentAddress,
            bolt_on_name: String,
            admin_proof: Proof,
        );

        /// List available bolt-ons
        pub fn list_bolt_ons(&self) -> Vec<(String, ComponentAddress)>;

        /// Get bolt-ons attached to a manager
        pub fn get_manager_bolt_ons(
            &self,
            manager_address: ComponentAddress,
        ) -> Vec<String>;
    }
}
```

### Bolt-On Module Concept

Bolt-ons are optional Scrypto components that extend a BadgeManager's capabilities. Each bolt-on has a standard interface and can be attached/detached by the manager's admin.

**Example bolt-on modules:**

| Module | Purpose | Component |
|--------|---------|-----------|
| `delegation` | Vote delegation registry | DelegationRegistry (Issue #33) |
| `reputation` | Cross-DAO reputation scoring | ReputationEngine |
| `marketplace` | Task/bounty marketplace | TaskEscrow (existing) |
| `governance` | On-chain voting | ProposalRegistry (Issue #34) |
| `conviction` | Conviction voting | ConvictionVoting (NEXT-STEPS #4) |
| `profile` | On-chain profile storage | ProfileStore (Issue #73, future) |

**Bolt-on interface pattern:**

Each bolt-on component should implement:
- `initialize(manager_address, badge_resource)` — link to a manager
- `get_info()` → name, version, description
- Badge-gating: require proof from the linked manager's badge resource

### Events

```rust
#[derive(ScryptoSbor, ScryptoEvent)]
struct ManagerRegisteredEvent {
    manager_address: ComponentAddress,
    schema_name: String,
    dao_name: String,
    registry_id: u64,
}

#[derive(ScryptoSbor, ScryptoEvent)]
struct BoltOnAttachedEvent {
    manager_address: ComponentAddress,
    bolt_on_name: String,
    bolt_on_address: ComponentAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
struct BoltOnDetachedEvent {
    manager_address: ComponentAddress,
    bolt_on_name: String,
}
```

### Integration with Existing Components

**BadgeFactory update:**
- After `create_manager()`, auto-register the new manager in the registry
- Or: factory emits event, off-chain watcher catches and registers

**Gateway service extension:**
```javascript
// bot/services/gateway.js — new functions
async function getRegisteredManagers() {
  // Read ManagerRegistry component state via Gateway API
  // Parse managers KeyValueStore
}

async function getManagerBoltOns(managerAddress) {
  // Read bolt-on list for a specific manager
}
```

**Dashboard:**
- New `/dao` or `/federation` page listing all registered DAOs
- Each DAO card: name, description, badge count, active bolt-ons
- "Register Your DAO" button for new registrations

### Deployment

```
1. Build: cd badge-manager/scrypto/manager-registry && scrypto build
2. Deploy: resim or stokenet testing
3. Mainnet: deploy via admin wallet, record component address
4. Register existing Guild manager as first entry
5. Update constants.ts with REGISTRY_COMPONENT address
```

## Security Considerations

1. **Admin proof required** — only the manager's admin can register/update/bolt-on
2. **Registry admin** — separate admin badge for registry governance
3. **Bolt-on validation** — registry admin vets bolt-on components before listing
4. **Suspend capability** — registry admin can suspend malicious managers
5. **No storage of secrets** — all data is public on-chain
6. **Royalties** — registration fee prevents spam (e.g., 5 XRD per registration)
7. **String sanitization** — validate all string inputs (name, description) length limits

## Implementation Order

1. **Scrypto blueprint** — ManagerRegistry component
2. **Unit tests** — registration, discovery, bolt-on attach/detach
3. **Stokenet deployment** — test with Guild + test DAO
4. **Gateway integration** — read registry state
5. **Bot commands** — `/registry list`, `/registry info <address>`
6. **Dashboard page** — DAO federation listing
7. **BadgeFactory integration** — auto-register on create
8. **First bolt-on** — delegation module (Issue #33)
9. **Mainnet deployment**

## Effort Estimate

- Scrypto blueprint: 2 sessions
- Testing (unit + stokenet): 1 session
- Gateway + bot integration: 1 session
- Dashboard: 1 session
- **Total: 5 sessions**

## Dependencies

- Scrypto 1.3.x toolchain
- BadgeFactory (already deployed — needs reference)
- Admin wallet for deployment
- Related: Issue #8 (DAO Manager) provides the DAO-level management layer
- Related: Issue #32 (Multi-DAO federation) is the product vision this enables
