# Deployed On-Chain Addresses

> All mainnet Radix addresses for our deployed components and resources.
> Source of truth: `guild-app/src/lib/constants.ts` and `badge-manager/README.md`

---

## Component Map

```
                    ┌────────────────────────────────────────┐
                    │           dApp Definition               │
                    │  account_rdx12yh4fwevmvnqgd3ppzau66c...│
                    └────────┬───────────────┬───────────────┘
                             │               │
              ┌──────────────▼──┐    ┌──────▼──────────────┐
              │  Badge System   │    │    Task Escrow       │
              │                 │    │                      │
              │  Factory ──┐    │    │  TaskEscrow          │
              │  Manager ──┤    │    │  component_rdx1cp8.. │
              │  Badge NFT ┘    │    │                      │
              └─────────────────┘    └──────────────────────┘
```

---

## Badge System

| Entity | Address |
|--------|---------|
| **Package** | `package_rdx1ph03wnq9x4q9z9ufc2anrrmeeu03fu92uk9wkyr8fg50rdgxut2wtd` |
| **BadgeFactory** | `component_rdx1cqlakjp65k8zkznynynsqpjcu7fwt9zcdvee358p948wp9h4n2km99` |
| **BadgeManager** (rad_dao_player) | `component_rdx1cqu2vkyhwrg6hygj8t0tveywg6qree9g3thxpfx637kshkur785gdd` |
| **BadgeManager** (guild_member) | `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva` |
| **BadgeManager** (guild_role) | `component_rdx1crh7qlan0yuwrf8wkq7vg7tkrc6w3ftr00qqf4auktqv2uuwwg8lut` |
| **Badge NFT** (guild_member) | `resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl` |
| **Badge NFT** (guild_role) | `resource_rdx1ntr6ye27zlyg2m06r90cletnwlzpedcv6yl0rhve64pp8prg0tw65e` |
| **Admin Badge** | `resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe` |
| **dApp Definition** | `account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq` |

---

## Task Escrow System

| Entity | Address |
|--------|---------|
| **Package** | `package_rdx1p5m3z284wgnck2cwqs3nayh74c4qkghjrra76mq0azphxmsnhhcvtl` |
| **TaskEscrow Component** | `component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r` |
| **Receipt NFT** | `resource_rdx1thyxus6dhqnd0zs0rvswlxrde3j9rcj8f79f0qsw9vcwf2zxgv6j2r` |

---

## CV2 Governance (Radix Foundation)

| Entity | Address |
|--------|---------|
| **CV2 Component** | `component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2` |

---

## XRD (Native Token)

| Entity | Address |
|--------|---------|
| **XRD** | `resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd` |

---

## Schema Configurations

### guild_member Schema
- **Manager**: `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva`
- **Badge**: `resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl`
- **Admin Badge**: `resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe`
- **Tiers**: member, contributor, builder, steward, elder
- **Free Mint**: ✅ enabled

### guild_role Schema
- **Manager**: `component_rdx1crh7qlan0yuwrf8wkq7vg7tkrc6w3ftr00qqf4auktqv2uuwwg8lut`
- **Badge**: `resource_rdx1ntr6ye27zlyg2m06r90cletnwlzpedcv6yl0rhve64pp8prg0tw65e`
- **Admin Badge**: (not set)
- **Tiers**: admin, moderator, contributor
- **Free Mint**: ❌ disabled

---

## Gateway API Endpoints

- **Mainnet**: `https://mainnet.radixdlt.com`
- **Stokenet (testnet)**: `https://stokenet.radixdlt.com`

### Key API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/state/entity/details` | POST | Read component state, account contents |
| `/state/non-fungible/data` | POST | Read NFT data fields |
| `/transaction/committed-details` | POST | Verify transactions, read events |
| `/state/entity/page/non-fungible-vault/ids` | POST | Paginate NFT IDs in a vault |

---

## Environment Variables

### guild-app (.env.local)
```
NEXT_PUBLIC_DAPP_DEF=account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq
NEXT_PUBLIC_MANAGER=component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva
NEXT_PUBLIC_BADGE_NFT=resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl
NEXT_PUBLIC_ADMIN_BADGE=resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe
NEXT_PUBLIC_CV2_COMPONENT=component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2
NEXT_PUBLIC_ESCROW_COMPONENT=component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r
NEXT_PUBLIC_ESCROW_RECEIPT=resource_rdx1thyxus6dhqnd0zs0rvswlxrde3j9rcj8f79f0qsw9vcwf2zxgv6j2r
NEXT_PUBLIC_ESCROW_PACKAGE=package_rdx1p5m3z284wgnck2cwqs3nayh74c4qkghjrra76mq0azphxmsnhhcvtl
```

### bot (.env)
```
BADGE_NFT=resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl
ESCROW_COMPONENT=component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r
```
