# Manager Spec v0.1

Shared interface specification for Radix Community Projects managers.

## What Is a Manager?

A manager is a Scrypto blueprint that provides a specific governance capability. Managers are modular — DAOs bolt them on and off as needed. All managers use the Badge Manager as their shared identity/auth layer.

## Current Managers

| Manager | Status | Package |
|---------|--------|---------|
| Badge Manager | **Live on mainnet** | `package_rdx1ph03wnq9x4q9z9ufc2anrrmeeu03fu92uk9wkyr8fg50rdgxut2wtd` |
| DAO Manager | Design | — |
| Grid Game | Design | — |

## Shared Principles

### 1. Badge Is the Auth Primitive

Every manager uses Radix native badges for access control. Users present badge proofs to access gated methods.

```rust
enable_method_auth! {
    roles {
        admin => updatable_by: [OWNER];
    },
    methods {
        public_method => PUBLIC;
        admin_method => restrict_to: [admin, OWNER];
    }
}
```

### 2. Primitives-Only Cross-Blueprint Calls

When one manager calls another, use ONLY standard Scrypto types in function signatures. NEVER pass custom structs across blueprint boundaries (causes schema extraction errors in Scrypto 1.3.x).

### 3. Events for Indexing

Every state-changing method emits a `#[derive(ScryptoSbor, ScryptoEvent)]` event. Events enable off-chain indexing and the portal Viewer layer.

### 4. Public Reads, Gated Writes

Read methods are always PUBLIC. Write methods require admin or owner badge.

### 5. Single-File Blueprint Pattern

For multi-blueprint packages, put all blueprints in one `lib.rs`. Shared types outside any `mod` block.

### 6. Build on VPS Only

Mac Apple Clang doesn't support wasm32 for blst. Always build on Linux VPS with Scrypto 1.3.x.

## Badge Manager Interface (Reference Implementation)

### Factory

```
BadgeFactory::instantiate() -> (Component, OwnerBadge)
BadgeFactory::create_manager(schema_name, valid_tiers, default_tier,
    free_mint_enabled, badge_name, badge_description, dapp_definition)
    -> (BadgeManager, AdminBadge)
```

### Manager

```
public_mint(username) -> Badge NFT              [PUBLIC]
mint_badge(username, tier) -> Badge NFT         [ADMIN]
revoke_badge(badge_id, reason)                  [ADMIN]
update_tier(badge_id, new_tier)                 [ADMIN]
update_xp(badge_id, new_xp)                    [ADMIN]
update_extra_data(badge_id, json_string)        [ADMIN]
get_badge_info(badge_id) -> UniversalBadgeData  [PUBLIC]
get_badge_resource() -> ResourceAddress          [PUBLIC]
get_schema_name() -> String                      [PUBLIC]
get_valid_tiers() -> Vec<String>                 [PUBLIC]
get_stats() -> (total_minted, total_revoked)    [PUBLIC]
```

### Badge Data

| Field | Type | Mutable | Purpose |
|-------|------|---------|---------|
| issued_to | String | no | Username |
| schema_name | String | no | Badge schema ID |
| issued_at | i64 | no | Mint timestamp |
| tier | String | yes | Current tier |
| status | String | yes | active / revoked |
| last_updated | i64 | yes | Last change |
| xp | u64 | yes | Experience points |
| level | String | yes | Auto: newcomer/contributor/builder/trusted/elder |
| extra_data | String | yes | JSON for custom fields |

## Ecosystem Integration

The portal connects native managers with external Radix tools:
- [QuackSpace](https://quack.space/app/) — social financial identity
- [Miow](https://miow.me/) — web3 website builder
- [RadixTalk](https://radixtalk.com/) — community forum

## Building a New Manager

1. Follow the patterns above
2. Use `enable_method_auth!` for access control
3. Emit events for all state changes
4. Primitives-only in cross-blueprint signatures
5. Build on VPS with Scrypto 1.3.x
6. Submit a PR or create your own package

## License

MIT
