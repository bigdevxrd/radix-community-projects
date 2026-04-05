# Radix Governance — Badge Schemas

Badges are on-chain NFTs that represent identity, contribution, and authority within the governance system. Each schema is a separate BadgeManager created from the shared BadgeFactory.

## Active Schemas

### 1. Guild Member (`guild_member`) — LIVE
**Purpose:** Core governance identity. Required to vote.
**Tiers:** member → contributor → builder → steward → elder
**Voting weight:** 1x → 2x → 3x → 5x → 10x
**Mint:** Free public mint
**Progression:** XP-based (automatic tier upgrade via batch signer)

### 2. Guild Role (`guild_role`) — LIVE
**Purpose:** Operational roles within the Guild.
**Tiers:** contributor → moderator → admin
**Mint:** Admin-only
**Use:** Access control for admin functions

## Proposed Schemas (community can create via factory)

### 3. Contributor (`guild_contributor`)
**Purpose:** Recognizes code, docs, and content contributions.
**Tiers:** helper → contributor → core contributor → maintainer
**Earned by:** Merged PRs, completed bounties, documentation
**Auto-mint trigger:** First bounty paid → helper badge auto-minted
**XP source:** Bounty XP + roll bonuses

### 4. Voter (`guild_voter`)
**Purpose:** Recognizes governance participation.
**Tiers:** casual → engaged → dedicated → delegate
**Earned by:** Voting on proposals consistently
**Auto-mint trigger:** 10th vote → casual badge auto-minted
**XP source:** Vote XP + streak bonuses

### 5. Steward (`guild_steward`)
**Purpose:** Trusted community members who verify work and manage operations.
**Tiers:** reviewer → verifier → steward → council
**Earned by:** Verifying bounties, reviewing PRs, moderating
**Mint:** Admin nominates, community votes to confirm
**Authority:** Can verify bounties, moderate proposals

### 6. Builder (`guild_builder`)
**Purpose:** Technical contributors who build infrastructure.
**Tiers:** learner → builder → architect → lead
**Earned by:** Scrypto deployments, tool creation, infrastructure work
**Mint:** Peer-nominated, admin-confirmed

## How Badges Work Together

```
User Profile (one wallet):
├── guild_member    → member (1x vote) — everyone starts here
├── guild_voter     → dedicated — earned through consistent voting
├── guild_contributor → core contributor — earned through bounties
└── guild_builder   → architect — earned through code contributions

Combined voting weight: base tier × role multipliers
Dashboard shows: all badges stacked on profile
Bot /badge shows: primary badge + earned badges list
```

## Badge Lifecycle

```
Action taken → Check thresholds → Auto-mint if earned → Announce in TG
  vote ────→ 10 votes? ────→ guild_voter (casual)
  bounty ──→ 1st bounty? ──→ guild_contributor (helper)
  PR ──────→ 1st merge? ───→ guild_builder (learner)
```

## Creating a New Schema

Anyone can create a schema via the BadgeFactory (costs 5 XRD royalty):

```
CALL_METHOD Address("<factory>") "create_manager"
  "my_dao_badges"
  Array<String>("bronze", "silver", "gold", "platinum")
  "bronze"
  true
  "My DAO Badge"
  "Description"
  Address("<dapp_def>")
```

The factory is permissionless — any Radix dApp can use it.

## Implementation Status

| Schema | Status | Manager | Auto-mint |
|--------|--------|---------|-----------|
| guild_member | LIVE | v4 mainnet | On mint page |
| guild_role | LIVE | v4 mainnet | Admin only |
| guild_contributor | PLANNED | — | On first bounty paid |
| guild_voter | PLANNED | — | On 10th vote |
| guild_steward | PLANNED | — | Admin + community vote |
| guild_builder | PLANNED | — | Peer nomination |

## Auto-Mint Thresholds (for bot implementation)

```javascript
const AUTO_MINT_THRESHOLDS = {
  guild_voter: { action: "vote", count: 10, tier: "casual" },
  guild_contributor: { action: "bounty_paid", count: 1, tier: "helper" },
  guild_builder: { action: "pr_merged", count: 1, tier: "learner" },
};
```

When a user crosses a threshold, the bot announces:
"Congratulations! You earned a Voter badge (casual tier)! Check /badges"
