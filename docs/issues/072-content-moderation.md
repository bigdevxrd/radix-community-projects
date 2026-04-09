# Issue #72 — Content Moderation

> Word filter + community flagging for proposals/bounties

## Problem Analysis

Any badge holder can post proposals and bounties. While badge-gating is the first line of defence (users must own an NFT), there's no content filtering on proposal creation and limited filtering elsewhere. Bad actors could post offensive, misleading, or malicious content.

### Current State

- **Content filter exists:** `bot/services/content-filter.js` with a 30+ word blocklist
- **Already applied to:** Bounty creation (`POST /api/bounties`)
- **NOT applied to:** Proposal creation (bot-only, no content check), bounty claims, feedback, profile fields
- **Admin tools:** `addToBlocklist()`, `removeFromBlocklist()` functions exist but no bot command or UI to manage them
- **No flagging/reporting system** — the `/feedback` command handles support tickets but not content reports

## Solution Design

### Phase 1: Expand Word Filter Coverage

**Apply `checkContent()` to all user-generated text inputs:**

| Input | Current | Target |
|-------|---------|--------|
| Bounty title/description | ✅ Filtered | ✅ Keep |
| Proposal title | ❌ No check | ✅ Add filter |
| Proposal options | ❌ No check | ✅ Add filter |
| Bounty claim pitch | ❌ No check | ✅ Add filter |
| Profile bio/display name | N/A (not built) | ✅ Filter when built |
| Feedback message | ❌ No check | ✅ Add filter |
| Group descriptions | Admin-only | Skip (trusted) |

**Files to modify:**

| File | Change |
|------|--------|
| `bot/index.js` | Add `checkContent()` call in `/propose` and `/amendment` handlers |
| `bot/services/api.js` | Add `checkContent()` to `POST /api/proposals` (when built), `POST /api/feedback` |
| `bot/services/content-filter.js` | Add URL pattern detection, enhance with regex patterns |

**Enhanced content filter patterns:**

```javascript
// Current: simple substring matching
// Add: regex patterns for evasion detection
const PATTERNS = [
  /https?:\/\/bit\.ly\//i,         // URL shorteners (phishing)
  /https?:\/\/tinyurl\.com\//i,
  /send\s*(me\s*)?(your\s*)?seed/i, // Seed phrase scams
  /\d+x\s*profit/i,                 // "100x profit" scams
  /free\s*(airdrop|tokens|xrd)/i,   // Fake airdrops
  /dm\s*me\s*(for|to)/i,            // DM scams
];
```

### Phase 2: Admin Blocklist Management

**New bot commands:**

```
/filter list              — show current blocklist (admin only)
/filter add <word>        — add word to blocklist
/filter remove <word>     — remove word from blocklist
/filter test <text>       — test text against filter (returns blocked/clean)
```

**Implementation in `bot/index.js`:**
- Gate behind admin check (`ADMIN_TG_ID` or steward+ tier)
- Use existing `addToBlocklist()` and `removeFromBlocklist()` functions
- Add `getBlocklist()` call for listing

**Dashboard admin panel:**
- Add "Content Filter" section to `/admin` page
- Show blocklist, add/remove words
- Test input field
- API: `GET /api/admin/blocklist`, `POST /api/admin/blocklist` (requireAdmin auth)

### Phase 3: Community Flagging System

**New database table:**

```sql
CREATE TABLE content_flags (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type  TEXT NOT NULL,       -- 'proposal', 'bounty', 'profile'
  content_id    INTEGER NOT NULL,    -- proposal_id or bounty_id
  reporter_address TEXT NOT NULL,    -- radix_address of reporter
  reporter_tg_id INTEGER,           -- tg_id if reported via bot
  reason        TEXT NOT NULL,       -- 'offensive', 'spam', 'scam', 'off-topic', 'other'
  details       TEXT,                -- optional explanation (max 500 chars)
  status        TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'upheld', 'dismissed'
  admin_notes   TEXT,                -- admin resolution notes
  created_at    TEXT DEFAULT (datetime('now')),
  resolved_at   TEXT,
  resolved_by   TEXT                 -- admin tg_id or address
);

-- Prevent duplicate flags from same user on same content
CREATE UNIQUE INDEX idx_flags_unique ON content_flags(content_type, content_id, reporter_address);
```

**Bot commands:**

```
/report proposal <id> <reason>    — flag a proposal (badge holder only)
/report bounty <id> <reason>      — flag a bounty (badge holder only)
/flags                             — list pending flags (admin only)
/flag <flag_id> uphold             — uphold flag, hide content (admin only)
/flag <flag_id> dismiss            — dismiss flag (admin only)
```

**API endpoints:**

```
POST /api/flags                    — create flag (requireAuth + requireBadge)
  Body: { content_type, content_id, reason, details? }
  Validation: content exists, user hasn't already flagged it, reason in whitelist

GET /api/flags                     — list flags (requireAdmin)
  Query: ?status=pending&content_type=proposal

POST /api/flags/:id/resolve        — resolve flag (requireAdmin)
  Body: { action: "uphold"|"dismiss", notes? }
```

**Auto-moderation rules:**

| Condition | Action |
|-----------|--------|
| 3+ flags from different users | Auto-hide content, notify admins |
| Content upheld by admin | Hide permanently, notify creator |
| Content dismissed | Clear flags, no action |
| Auto-hidden → admin dismisses | Restore content |

**Content visibility:**

Add `hidden` column to `proposals` and `bounties` tables:

```sql
ALTER TABLE proposals ADD COLUMN hidden INTEGER DEFAULT 0;
ALTER TABLE bounties ADD COLUMN hidden INTEGER DEFAULT 0;
```

- Hidden content excluded from public API responses
- Visible to admins with `?include_hidden=true` query param
- Creator sees their own hidden content with a "Under Review" banner

### Phase 4: Multi-Lingual Support (Future)

When the community expands beyond English:
- Per-language blocklists (e.g., `blocklist_es.json`, `blocklist_de.json`)
- Language detection on input (basic heuristic or `franc` library)
- Community moderators per language group (role in working groups)
- Consider: machine translation of flagged content for admin review

## Dashboard Integration

**Proposals page:**
- "Report" button on each proposal card (badge-gated)
- Click → modal with reason selector + optional details
- Visual indicator if content has flags (admin view)

**Bounties page:**
- Same "Report" button pattern
- Flag count badge on admin dashboard

**Admin panel (`/admin`):**
- "Moderation Queue" tab
- List of pending flags with content preview
- One-click "Uphold" / "Dismiss" buttons
- Filter by content type, reason, date

## Security Considerations

1. **Rate limit flags** — max 10 flags/day per user to prevent flag spam
2. **Badge-gate reporting** — only badge holders can flag (prevents drive-by flagging)
3. **No self-flagging** — can't flag your own content
4. **Admin-only resolution** — only steward+ tier can resolve flags
5. **Audit trail** — all flag actions logged with timestamps and admin ID
6. **Content filter bypasses** — regex patterns catch l33tspeak and Unicode homoglyphs (Phase 2)
7. **Flag abuse** — if a user's flags are dismissed 5+ times, reduce their flag weight

## Implementation Order

1. **Expand word filter** — apply to proposals, claims, feedback
2. **Admin bot commands** — `/filter list/add/remove/test`
3. **DB table for flags** — `content_flags` table
4. **Bot flag commands** — `/report proposal/bounty`, `/flags`, `/flag resolve`
5. **API flag endpoints** — for dashboard integration
6. **Dashboard report buttons** — modal + API calls
7. **Admin moderation panel** — queue + resolution UI
8. **Auto-moderation** — 3-flag auto-hide rule

## Effort Estimate

- Phase 1 (Expand filter): 0.5 session
- Phase 2 (Admin commands): 0.5 session
- Phase 3 (Flagging system): 2-3 sessions
- Phase 4 (Multi-lingual): 1 session (future)
- **Total: 3-5 sessions**

## Dependencies

- Existing `content-filter.js` module (extend, not replace)
- ROLA authentication (for web-based flagging)
- Admin role verification (steward+ tier or ADMIN_TG_ID)
