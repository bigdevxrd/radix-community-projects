# Issue #73 — User-Editable Profiles

> Avatar, bio, skills, portfolio + Web3 social research

## Problem Analysis

Users currently have no way to present themselves beyond their wallet address and badge tier. The bot DB tracks users by `tg_id` while the dashboard identifies by `radix_address` — there's no unified profile that bridges these identities. The `docs/architecture/10-USER-PROFILE-UX.md` already outlines a `GET /api/profile/:address` aggregation endpoint, but no write/edit capability exists.

### Current Identity Data (Scattered)

| Source | Key | Data |
|--------|-----|------|
| `users` table | tg_id | radix_address, username, registered_at |
| `game_state` table | radix_address | total_rolls, bonus_xp, streak |
| `working_group_members` | radix_address | groups, roles |
| `votes` table | radix_address | voting history |
| `bounties` table | assignee_address | task history |
| On-chain badge | NFT ID | tier, xp, level, extra_data |
| Telegram | tg_id | username, display name |

**No dedicated profile table exists.**

## Solution Design

### Storage: SQLite `user_profiles` Table (Phase 1)

The simplest, fastest approach. On-chain storage (badge `extra_data`) is too expensive for frequent updates. IPFS can be added later as a persistence layer.

```sql
CREATE TABLE user_profiles (
  radix_address TEXT PRIMARY KEY,
  display_name  TEXT,           -- max 50 chars
  bio           TEXT,           -- max 500 chars
  avatar_url    TEXT,           -- URL to avatar image (max 500 chars)
  skills        TEXT,           -- JSON array: ["rust", "scrypto", "design"]
  portfolio_url TEXT,           -- max 500 chars
  contact_tg    TEXT,           -- Telegram handle (max 50 chars)
  available     INTEGER DEFAULT 0, -- 0=not taking work, 1=available
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
```

### API Endpoints

#### Read Profile

```
GET /api/profile/:address
Auth: None (public)
Response: {
  address, display_name, bio, avatar_url, skills, portfolio_url,
  contact_tg, available,
  // Aggregated from other tables:
  badge: { tier, xp, level },
  groups: [{ id, name, role }],
  stats: {
    proposals_created, votes_cast, bounties_completed,
    bounties_value_xrd, game_score, member_since
  }
}
```

This aggregation endpoint bridges the `tg_id` ↔ `radix_address` gap by looking up the user in the `users` table first, then joining across all activity tables.

#### Update Profile

```
POST /api/profile
Auth: requireAuth (ROLA — ensures address ownership)
Body: { display_name?, bio?, avatar_url?, skills?, portfolio_url?, contact_tg?, available? }
Validation:
  - display_name: 1-50 chars, stripped of HTML
  - bio: 0-500 chars, content-filter check
  - avatar_url: valid URL, https only, max 500 chars
  - skills: array of 0-10 strings, each 1-30 chars
  - portfolio_url: valid URL, max 500 chars
  - contact_tg: alphanumeric + underscore, 1-50 chars
  - available: boolean
Rate limit: 5 updates/hour per address
```

### DB Functions (bot/db.js)

```javascript
// New functions to add:
getProfile(radixAddress)        // → profile row or null
upsertProfile(radixAddress, fields) // → INSERT ... ON CONFLICT UPDATE
getAggregatedProfile(radixAddress)  // → joins user_profiles + users + stats
getAvailableWorkers()           // → profiles where available=1 (for marketplace)
searchProfiles(query)           // → LIKE search on display_name, skills, bio
```

### Dashboard Pages

#### Profile View: `/profile/[address]`

Already partially exists at `guild-app/src/app/profile/`. Extend to show:

- Display name + avatar (or jazzicon fallback from address)
- Bio text
- Skill tags (styled chips)
- Portfolio link
- Availability badge ("Taking Work" / "Not Available")
- Badge tier + XP progress bar (from on-chain data)
- Working groups list
- Activity stats (proposals, votes, bounties)
- Contact button (if contact_tg is set)

#### Profile Edit: `/profile/edit`

Wallet-gated (must be connected + authenticated via ROLA):

- Form fields for all profile fields
- Avatar: URL input (Phase 1), file upload (Phase 2)
- Skills: tag input with autocomplete from common skills
- Preview panel showing how profile will appear
- Save button → `POST /api/profile`

### About Page Integration

The `/about` page has an operator section. If the operator's `radix_address` is known, read their profile from the same system instead of hardcoding.

### Avatar Strategy

**Phase 1: URL-based**
- Accept any HTTPS URL (validated with URL constructor)
- Display with `<img>` tag, fallback to jazzicon/identicon
- Sanitize: no javascript: URLs, max 500 chars

**Phase 2: File Upload**
- Accept PNG/JPG/WebP, max 500KB
- Resize to 200x200 server-side (sharp library)
- Store in `guild-app/public/avatars/{address}.webp`
- Serve statically via Next.js

**Phase 3: On-Chain/IPFS**
- Pin avatar to IPFS via Pinata or web3.storage
- Store IPFS CID in badge `extra_data` field
- Truly decentralised, survives server migration

## Web3 Social Research

### Radix-Native

| Platform | Integration Potential | Status |
|----------|----------------------|--------|
| **QuackSpace** | Radix-native social. Could pull profile data if API available. | Research needed — no public API docs found |
| **Radix Name Service** | Resolve `.xrd` names to addresses for display | Does not appear to exist yet on mainnet |

### Cross-Chain Social Graphs

| Platform | Integration | Complexity | Value |
|----------|-------------|------------|-------|
| **Lens Protocol** | Pull profile from Lens handle → display on guild profile | Medium (GraphQL API) | Low — different chain |
| **Farcaster** | Link Farcaster account, display casts | Medium (Hub API) | Low — different chain |
| **CyberConnect** | Social graph connections | Medium | Low — different chain |

**Recommendation:** Focus on Radix-native identity first. Cross-chain social integrations add complexity with low value for a Radix-focused community. Revisit if QuackSpace provides an API.

### Profile Portability (Future)

When multi-DAO federation (#32) is implemented, profiles should be portable:
- Profile data stored per-address, not per-DAO
- Badge `extra_data` could store a profile CID (IPFS hash)
- Any DAO using the BadgeFactory could resolve profiles from the same system

## Security Considerations

1. **ROLA required** — only the address owner can edit their profile
2. **Content filtering** — apply `checkContent()` to display_name and bio
3. **URL sanitization** — validate URLs are HTTPS, no javascript: or data: schemes
4. **XSS prevention** — HTML-escape all profile text before rendering
5. **Avatar abuse** — consider CSP headers, lazy-load external images
6. **Rate limiting** — 5 profile updates/hour prevents spam
7. **No PII storage** — users choose what to share, no email/phone fields

## Implementation Order

1. **DB table + migration** — add `user_profiles` table
2. **API endpoints** — GET (public) + POST (auth-gated)
3. **Profile view page** — display profile + aggregated stats
4. **Profile edit page** — form + validation
5. **Avatar URL support** — external image display
6. **Marketplace listing** — "Available Workers" page for task matching
7. **About page integration** — operator profile from same system

## Effort Estimate

- Phase 1 (Table + API + View): 1-2 sessions
- Phase 2 (Edit UI + Avatar): 1-2 sessions
- Phase 3 (Marketplace + Social): 2-3 sessions
- **Total: 4-7 sessions**

## Dependencies

- ROLA authentication (#75 prerequisite) for profile editing
- Content filter (`bot/services/content-filter.js`) for text validation
- Gateway service for badge data aggregation
