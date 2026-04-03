# Badge Manager

Identity layer for Radix community governance. Mint, manage, and track badges across DAOs.

## Status: Live on Mainnet

### Deployed Addresses

| Entity | Address |
|--------|---------|
| Package | `package_rdx1ph03wnq9x4q9z9ufc2anrrmeeu03fu92uk9wkyr8fg50rdgxut2wtd` |
| BadgeFactory | `component_rdx1cqlakjp65k8zkznynynsqpjcu7fwt9zcdvee358p948wp9h4n2km99` |
| BadgeManager (rad_dao_player) | `component_rdx1cqu2vkyhwrg6hygj8t0tveywg6qree9g3thxpfx637kshkur785gdd` |
| Badge NFT Resource | `resource_rdx1ngpcv5myfk7jt07a65tzn83v3c7g73ht4wxy7h08cdnygyg6fkxqqa` |
| dApp Definition | `account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq` |

## What It Does

- **BadgeFactory** — Deploy once, anyone can create their own badge manager
- **BadgeManager** — Mint, revoke, update tiers, track XP/levels
- **UniversalBadgeData** — Typed core fields + extensible extra_data JSON
- **Free mint** — `public_mint` lets anyone get a badge at zero cost
- **XP/Level system** — 5 levels: newcomer, contributor, builder, trusted, elder

## Build

```bash
cd scrypto/radix-badge-manager
scrypto build
scrypto test
```

Requires Scrypto 1.3.1 toolchain.

## Architecture

```
BadgeFactory (deployed once)
    |
    +-- create_manager(schema, tiers, dapp_def) --> BadgeManager + Admin Badge
                                                        |
                                                        +-- public_mint(username) --> Badge NFT
                                                        +-- mint_badge(username, tier)
                                                        +-- revoke_badge(badge_id, reason)
                                                        +-- update_tier(badge_id, new_tier)
                                                        +-- update_xp(badge_id, new_xp)
                                                        +-- update_extra_data(badge_id, json)
                                                        +-- get_badge_info(badge_id)
                                                        +-- get_badge_resource()
```

## Badge Data (UniversalBadgeData)

| Field | Type | Mutable | Purpose |
|-------|------|---------|---------|
| issued_to | String | no | Username |
| schema_name | String | no | Badge schema identifier |
| issued_at | i64 | no | Mint timestamp |
| tier | String | yes | Current tier |
| status | String | yes | active / revoked |
| last_updated | i64 | yes | Last change timestamp |
| xp | u64 | yes | Experience points |
| level | String | yes | Auto-calculated from XP |
| extra_data | String | yes | JSON for custom fields |

## Demo

See `demo/index.html` — single-file dApp with Radix Wallet connect and badge explorer.

## License

MIT
