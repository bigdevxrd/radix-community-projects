# Issue #32 — Multi-DAO Badge Federation

> One factory, many DAOs — shared badge infrastructure

## Problem Analysis

The Guild's BadgeFactory (`create_manager()`) already supports creating badge managers with arbitrary schemas. Currently it's used only for the Guild's own badge system. The opportunity is to let other Radix DAOs create their own badge schemas through the same factory — "one wallet, many badges, one dashboard."

### Current Infrastructure

- **BadgeFactory** — deployed on mainnet, creates BadgeManager instances
  - `create_manager(schema_name, valid_tiers, default_tier, free_mint_enabled, badge_name, badge_description, dapp_definition)`
  - Returns: `(manager_component, admin_badge_bucket)`
  - Each manager is independent: own NFT resource, own tiers, own admin badge
- **Dashboard** — `guild-app/src/lib/constants.ts` has SCHEMAS array, currently `["guild_member"]`
  - Admin page reads multiple schemas (infrastructure exists)
- **Factory stats** — `get_manager_count()`, `get_factory_info()` (paused flag)

### Community Decision Needed

1. **Open vs Gated access?** — Anyone pays royalty vs Guild approval required
2. **Revenue model?** — Keep mint royalties? Charge setup fee?
3. **Dashboard scope?** — Show all DAO badges or only Guild badges?

## Solution Design

### Architecture: Federation Model

```
                    ┌──────────────┐
                    │ BadgeFactory │  (existing, on-chain)
                    │  (Scrypto)   │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │ Guild Badge │ │ CrumbsUp    │ │ RadixTalk   │
    │ Manager     │ │ Badge Mgr   │ │ Badge Mgr   │
    │ (existing)  │ │ (new)       │ │ (new)       │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │ guild_member│ │ crumbsup_   │ │ radixtalk_  │
    │ NFT badges  │ │ contributor │ │ moderator   │
    └─────────────┘ └─────────────┘ └─────────────┘
```

### Phase 1: DAO Registry (Off-Chain)

**New database table:**

```sql
CREATE TABLE dao_registry (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL UNIQUE,           -- "CrumbsUp", "RadixTalk"
  description     TEXT,
  icon_url        TEXT,                           -- DAO logo URL
  website_url     TEXT,
  manager_component TEXT NOT NULL,                -- on-chain manager address
  badge_resource  TEXT NOT NULL,                  -- NFT resource address
  admin_address   TEXT NOT NULL,                  -- DAO admin wallet address
  schema_name     TEXT NOT NULL,                  -- e.g., "crumbsup_contributor"
  valid_tiers     TEXT,                           -- JSON array of tier names
  status          TEXT DEFAULT 'active',          -- 'pending', 'active', 'suspended'
  registered_at   TEXT DEFAULT (datetime('now')),
  approved_by     TEXT,                           -- Guild admin who approved
  approved_at     TEXT
);
```

### Phase 2: Registration Flow

**Option A: Open Registration (pay and play)**

1. DAO admin calls `BadgeFactory.create_manager()` directly on-chain (pays royalty)
2. DAO admin submits registration to Guild: `POST /api/dao/register`
3. Guild bot announces new DAO in TG channel
4. Manager auto-listed on dashboard after 24h (or immediate for factory users)

**Option B: Gated Registration (Guild approval)**

1. DAO admin submits application: `POST /api/dao/apply`
2. Guild stewards review application in admin panel
3. Vote on approval (existing governance system)
4. If approved: Guild admin calls factory, sends admin badge to DAO admin
5. DAO listed on dashboard

**Recommended: Option B for launch** (quality control), **migrate to Option A** as the ecosystem grows.

### API Endpoints

```
POST /api/dao/apply                — submit DAO registration application
  Body: { name, description, icon_url, website_url, admin_address, schema_name, valid_tiers }
  Auth: requireAuth (applicant must have Guild badge)

GET /api/dao                       — list registered DAOs
GET /api/dao/:id                   — DAO detail + badge stats

POST /api/dao/:id/approve          — approve DAO registration (requireAdmin)
POST /api/dao/:id/suspend          — suspend a DAO (requireAdmin)

GET /api/badge/:address/all        — get ALL badges for an address across all DAOs
```

### Dashboard: Multi-DAO Badge View

**Profile page enhancement:**

Currently shows only Guild badge. Enhance to show all badges:

```
┌─────────────────────────────────────┐
│ Your Badges                          │
│                                      │
│ ┌──────────┐ ┌──────────┐ ┌────────┐│
│ │ Guild    │ │ CrumbsUp │ │RadixTlk││
│ │ Steward  │ │ Core Dev │ │Moderatr││
│ │ 2450 XP  │ │ 180 XP   │ │ 50 XP  ││
│ └──────────┘ └──────────┘ └────────┘│
└─────────────────────────────────────┘
```

**Implementation:**

1. Fetch all registered DAOs from `/api/dao`
2. For each DAO, check if user's address holds that DAO's badge NFT (Gateway API)
3. Display badges with DAO branding (icon, colors from registration)
4. Cache results per-address with 5-min TTL (same pattern as current badge caching)

### Gateway Integration

**New function in `bot/services/gateway.js`:**

```javascript
async function getAllBadges(radixAddress) {
  // 1. Get all NFT resources in account
  const resources = await getAccountNFTs(radixAddress);

  // 2. Cross-reference with dao_registry badge_resource addresses
  const daos = db.getRegisteredDAOs();
  const badges = [];

  for (const dao of daos) {
    const match = resources.find(r => r.address === dao.badge_resource);
    if (match) {
      const data = await getNFTData(dao.badge_resource, match.nft_id);
      badges.push({ dao: dao.name, ...data });
    }
  }

  return badges;
}
```

### Factory Governance

**Revenue model options (community vote needed):**

| Model | Factory Royalty | Setup Fee | Ongoing | Recommended |
|-------|----------------|-----------|---------|-------------|
| A. Free | 0 XRD | 0 XRD | 0 XRD | ❌ No sustainability |
| B. Royalty-only | 1 XRD/mint | 0 XRD | Via royalties | ✅ Phase 1 |
| C. Setup fee | 1 XRD/mint | 50 XRD | Via royalties | Phase 2 |
| D. Subscription | 1 XRD/mint | 0 XRD | 10 XRD/month | Complex |

**Recommended:** Start with royalty-only (existing 1 XRD mint royalty per badge). Add setup fee if demand increases.

### Cross-DAO Features (Future)

Once multiple DAOs are registered:

| Feature | Description |
|---------|-------------|
| **Cross-DAO reputation** | XP earned in one DAO visible in another |
| **Badge stacking** | Holding badges from multiple DAOs unlocks perks |
| **Shared governance** | DAOs can reference each other's badge tiers for voting weight |
| **Unified identity** | One profile across all DAOs (ties to Issue #73) |
| **Discovery** | "DAOs you might like" based on badge portfolio |

### Phase 3: On-Chain Registry (Issue #9)

When the Manager Registry component (#9) is built, migrate `dao_registry` table to on-chain:
- Factory creates manager → auto-registers in on-chain registry
- Dashboard reads registry from chain (no SQLite dependency)
- Fully decentralised DAO discovery

## Security Considerations

1. **Gated registration** — prevent malicious/spam DAOs from listing
2. **Schema validation** — validate tier names, schema format before registration
3. **Icon/URL sanitization** — validate URLs (HTTPS only, no javascript:)
4. **Badge impersonation** — DAO name uniqueness enforced, icon review by admin
5. **Factory pause** — factory has `pause_factory()` method for emergencies
6. **Admin badge custody** — each DAO's admin badge is their responsibility
7. **Content filtering** — apply word filter to DAO name/description

## Implementation Order

1. **Community governance vote** — approve federation model and revenue approach
2. **DB table** — `dao_registry`
3. **API endpoints** — registration, listing, approval
4. **Gateway multi-badge** — `getAllBadges()` function
5. **Dashboard registry** — DAOs listing page
6. **Profile multi-badge** — show all badges on profile
7. **Admin panel** — DAO application review + approval
8. **Cross-DAO features** — reputation, stacking (future)

## Effort Estimate

- Phase 1 (Registry + API): 1-2 sessions
- Phase 2 (Dashboard multi-badge): 1-2 sessions
- Phase 3 (Cross-DAO features): 3-5 sessions (future)
- **Total Phase 1-2: 2-4 sessions**

## Dependencies

- Community governance vote to approve federation model
- BadgeFactory deployed on mainnet (already done)
- Gateway service for multi-badge reading
- ROLA authentication (for registration from dashboard)
- Issue #9 (Manager Registry) for on-chain migration
