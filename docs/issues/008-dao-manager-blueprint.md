# Issue #8 — Build DAO Manager Blueprint

> register_dao, join_dao, list_daos, get_my_daos

## Problem Analysis

While the BadgeFactory creates badge managers and the Manager Registry (#9) tracks them, there's no component that manages DAO membership and identity at a higher level. The DAO Manager is the organisational layer — it knows which DAOs exist, who belongs to each, and enables cross-DAO operations.

### Relationship to Other Components

```
┌──────────────────────────────────────────────┐
│                 DAO Manager                   │  ← THIS ISSUE
│  register_dao, join_dao, list_daos            │
└──────────────────┬───────────────────────────┘
                   │ references
┌──────────────────▼───────────────────────────┐
│              Manager Registry (#9)            │
│  register_manager, discover, bolt_on/off      │
└──────────────────┬───────────────────────────┘
                   │ creates
┌──────────────────▼───────────────────────────┐
│              BadgeFactory (existing)           │
│  create_manager → BadgeManager instances       │
└──────────────────────────────────────────────┘
```

**DAO Manager** = organisational membership layer
**Manager Registry** = technical component registry
**BadgeFactory** = NFT badge infrastructure

## Solution Design

### Scrypto Blueprint: `DaoManager`

```rust
use scrypto::prelude::*;

#[derive(ScryptoSbor, NonFungibleData)]
struct DaoInfo {
    name: String,
    description: String,
    creator: ComponentAddress,
    manager_component: ComponentAddress,    // BadgeManager component
    badge_resource: ResourceAddress,        // Badge NFT resource
    website: String,
    icon_url: String,
    #[mutable]
    member_count: u64,
    #[mutable]
    status: String,                         // "active", "paused", "archived"
    created_at: i64,
    #[mutable]
    settings: String,                       // JSON: { open_membership, require_badge, max_members }
}

#[derive(ScryptoSbor, NonFungibleData)]
struct DaoMembership {
    dao_id: u64,
    member_address: ComponentAddress,
    joined_at: i64,
    #[mutable]
    role: String,                           // "member", "admin", "moderator"
    #[mutable]
    status: String,                         // "active", "suspended"
}

#[blueprint]
#[events(DaoRegisteredEvent, MemberJoinedEvent, MemberLeftEvent)]
mod dao_manager {
    struct DaoManager {
        daos: KeyValueStore<u64, DaoInfo>,
        dao_members: KeyValueStore<u64, Vec<ComponentAddress>>,  // dao_id → members
        member_daos: KeyValueStore<ComponentAddress, Vec<u64>>,  // address → dao_ids
        memberships: KeyValueStore<(u64, ComponentAddress), DaoMembership>,
        next_dao_id: u64,
        total_daos: u64,
        total_memberships: u64,
        admin_badge: ResourceAddress,
        registry: ComponentAddress,         // reference to ManagerRegistry
    }

    impl DaoManager {
        /// Instantiate the DAO Manager
        pub fn instantiate(
            registry_address: ComponentAddress,
            dapp_definition: ComponentAddress,
        ) -> (Global<DaoManager>, Bucket);

        // ═══════════════════════════════════════
        // DAO Registration
        // ═══════════════════════════════════════

        /// Register a new DAO
        /// Creates entry in DAO Manager + auto-registers in Manager Registry
        pub fn register_dao(
            &mut self,
            name: String,
            description: String,
            creator: ComponentAddress,
            manager_component: ComponentAddress,
            badge_resource: ResourceAddress,
            website: String,
            icon_url: String,
            settings: String,
        ) -> u64;  // returns dao_id

        /// Update DAO info (DAO admin only)
        pub fn update_dao(
            &mut self,
            dao_id: u64,
            admin_proof: Proof,
            description: String,
            website: String,
            settings: String,
        );

        /// Pause a DAO (prevents new joins)
        pub fn pause_dao(&mut self, dao_id: u64, admin_proof: Proof);

        /// Archive a DAO (soft-delete)
        pub fn archive_dao(&mut self, dao_id: u64, admin_proof: Proof);

        // ═══════════════════════════════════════
        // Membership
        // ═══════════════════════════════════════

        /// Join a DAO
        /// Validates: DAO is active, not already a member, meets requirements
        pub fn join_dao(
            &mut self,
            dao_id: u64,
            member_address: ComponentAddress,
            badge_proof: Option<Proof>,      // Some DAOs require a badge to join
        ) -> DaoMembership;

        /// Leave a DAO
        pub fn leave_dao(
            &mut self,
            dao_id: u64,
            member_address: ComponentAddress,
        );

        /// Update member role (DAO admin only)
        pub fn update_member_role(
            &mut self,
            dao_id: u64,
            member_address: ComponentAddress,
            new_role: String,
            admin_proof: Proof,
        );

        /// Suspend a member (DAO admin only)
        pub fn suspend_member(
            &mut self,
            dao_id: u64,
            member_address: ComponentAddress,
            admin_proof: Proof,
        );

        // ═══════════════════════════════════════
        // Discovery
        // ═══════════════════════════════════════

        /// List all active DAOs
        pub fn list_daos(&self) -> Vec<DaoInfo>;

        /// Get details of a specific DAO
        pub fn get_dao(&self, dao_id: u64) -> Option<DaoInfo>;

        /// Get all DAOs an address belongs to
        pub fn get_my_daos(
            &self,
            member_address: ComponentAddress,
        ) -> Vec<(u64, DaoInfo, DaoMembership)>;

        /// Get members of a DAO
        pub fn get_dao_members(
            &self,
            dao_id: u64,
        ) -> Vec<(ComponentAddress, DaoMembership)>;

        /// Check if address is a member of a DAO
        pub fn is_member(
            &self,
            dao_id: u64,
            member_address: ComponentAddress,
        ) -> bool;

        /// Get stats
        pub fn get_stats(&self) -> (u64, u64, u64);  // (total_daos, active_daos, total_memberships)
    }
}
```

### Events

```rust
#[derive(ScryptoSbor, ScryptoEvent)]
struct DaoRegisteredEvent {
    dao_id: u64,
    name: String,
    creator: ComponentAddress,
    manager_component: ComponentAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
struct MemberJoinedEvent {
    dao_id: u64,
    member_address: ComponentAddress,
    member_count: u64,
}

#[derive(ScryptoSbor, ScryptoEvent)]
struct MemberLeftEvent {
    dao_id: u64,
    member_address: ComponentAddress,
    member_count: u64,
}
```

### Membership Models

DAOs can configure their membership model via `settings` JSON:

```json
{
  "open_membership": true,           // anyone can join
  "require_badge": false,            // require existing badge to join
  "required_badge_resource": null,   // specific badge resource needed
  "required_badge_tier": null,       // minimum tier needed
  "max_members": 0,                  // 0 = unlimited
  "auto_mint_badge": true            // auto-mint DAO badge on join
}
```

| Model | open_membership | require_badge | Use Case |
|-------|----------------|---------------|----------|
| Open | true | false | Anyone can join (like Guild) |
| Badge-gated | true | true | Must hold a specific badge |
| Invite-only | false | false | Admin must add members |
| Tiered | true | true + tier | Must be steward+ to join |

### Integration with Existing Systems

#### Bot Commands

```
/dao list                    — list all registered DAOs
/dao info <id>               — DAO details + member count
/dao join <id>               — join a DAO (builds TX manifest)
/dao leave <id>              — leave a DAO
/dao my                      — list DAOs you belong to
/dao register                — start DAO registration wizard (admin only)
```

#### API Endpoints

```
GET /api/daos                 — list all DAOs (public)
GET /api/daos/:id             — DAO detail (public)
GET /api/daos/:id/members     — DAO member list (public)
POST /api/daos/:id/join       — join DAO (requireAuth)
POST /api/daos/:id/leave      — leave DAO (requireAuth)
GET /api/daos/my/:address     — DAOs for an address (public)
```

#### Dashboard Pages

**`/dao` — DAO Directory:**
- Grid of DAO cards: name, description, member count, badge icon
- Filter: open/gated, member count, activity
- "Join" button (wallet-gated, builds TX manifest)

**`/dao/:id` — DAO Detail:**
- DAO info: name, description, website, badge preview
- Member list with roles
- Activity stats
- "Join" / "Leave" button
- Bolt-ons list (from Registry #9)

**Profile page enhancement:**
- "My DAOs" section showing all memberships
- Role badges per DAO

### Relationship to Off-Chain Working Groups

The existing `working_groups` table serves a similar purpose off-chain. Migration path:

1. **Phase 1:** DAO Manager handles on-chain DAOs; working groups remain off-chain
2. **Phase 2:** Working groups become lightweight "sub-DAOs" within the Guild DAO
3. **Phase 3:** Working groups migrate to on-chain DAO Manager (each group = a sub-DAO)

### End-to-End Flow: Register a New DAO

```
1. DAO creator connects wallet to Guild dashboard
2. Navigates to /dao/register
3. Fills form: name, description, tiers, settings
4. Dashboard builds TX manifest:
   a. Call BadgeFactory.create_manager() → get manager + admin badge
   b. Call ManagerRegistry.register_manager() → register in registry
   c. Call DaoManager.register_dao() → create DAO entry
5. Wallet signs composite TX
6. All three operations execute atomically on-chain
7. DAO appears in directory immediately
8. Creator automatically becomes first member + admin
```

## Security Considerations

1. **Admin proof for DAO operations** — only DAO admin can update/pause/archive
2. **Badge proof for gated DAOs** — validate badge ownership on join
3. **String length limits** — name (100), description (1000), website (500)
4. **Re-join prevention** — check membership status before allowing join
5. **Admin escalation prevention** — only DAO creator or global admin can set other admins
6. **Spam prevention** — registration fee (e.g., 10 XRD) deducted in TX
7. **Member limit enforcement** — check `max_members` before join

## Implementation Order

1. **Scrypto blueprint** — DaoManager component
2. **Unit tests** — register, join, leave, discover
3. **Stokenet deployment** — test full lifecycle
4. **Gateway integration** — read DAO state from chain
5. **Bot commands** — `/dao` command group
6. **API endpoints** — CRUD for DAOs and memberships
7. **Dashboard pages** — DAO directory + detail
8. **BadgeFactory integration** — composite TX for one-click DAO creation
9. **Working group migration** — map existing groups to sub-DAOs
10. **Mainnet deployment**

## Effort Estimate

- Scrypto blueprint: 2-3 sessions
- Testing: 1 session
- Bot + API integration: 1-2 sessions
- Dashboard pages: 1-2 sessions
- **Total: 5-8 sessions**

## Dependencies

- Manager Registry (#9) — must be built first (DAO Manager references it)
- BadgeFactory — already deployed
- ROLA authentication (#75) — for dashboard registration/join
- Related: Issue #32 (Multi-DAO federation) — this is the technical implementation
- Community governance vote — approve DAO registration model

## Open Questions

1. Should DAO registration require a governance vote, or is it permissionless?
2. Should there be a minimum stake (XRD deposit) to register a DAO?
3. How does DAO admin rotation work? (Multi-sig? Vote?)
4. Should the DAO Manager enforce badge minting on join, or leave it to each DAO?
5. What's the relationship between DAO Manager membership and on-chain badge ownership?
