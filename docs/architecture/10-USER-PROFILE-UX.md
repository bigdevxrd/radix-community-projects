Now I have a complete picture. Here is the detailed UX specification and implementation plan.

---

## Profile & Task Management Dashboard -- UX Specification

### 1. The Identity Bridge Problem

The most critical architectural issue is that the bot DB is keyed by `tg_id` (Telegram user ID), but the web dashboard identifies users by `radix_address` (wallet address). The `users` table already stores `radix_address` alongside `tg_id`, and several tables (like `votes`, `working_group_members`, `bounty_applications`) also store `radix_address`. However, key tables like `bounties.creator_tg_id`, `bounties.assignee_tg_id`, and `proposals.creator_tg_id` are keyed only by `tg_id`.

This means the API needs a resolution layer: given a `radix_address`, look up the corresponding `tg_id` from the `users` table, then query all tg_id-keyed tables using that mapping. Some data (escrow receipts, badge NFTs) lives purely on-chain and is read directly from the Radix Gateway by wallet address.

### 2. New API Endpoint: `GET /api/profile/:address`

A single aggregation endpoint that resolves the wallet address to a full profile. This is the centerpiece of the data flow.

**Resolution logic:**
1. Receive `account_rdx1...` address
2. Query `users` table: `SELECT * FROM users WHERE radix_address = ?` to get the `tg_id`
3. If no user row exists, the user is "wallet-only" -- return only on-chain data (badge NFT, escrow receipts) with empty off-chain sections
4. If user row exists, use `tg_id` to query all activity tables

**Response shape:**
```
{
  ok: true,
  data: {
    identity: { tg_id, radix_address, username, registered_at },
    trust: { score, tier, breakdown: {...} },
    tasks: {
      created: [ bounties where creator_tg_id = tg_id ],
      assigned: [ bounties where assignee_tg_id = tg_id ],
      applied: [ bounty_applications where applicant_address = address ]
    },
    votes: {
      history: [ votes joined with proposals, where votes.tg_id = tg_id ],
      count: number
    },
    proposals: {
      created: [ proposals where creator_tg_id = tg_id ]
    },
    groups: [ working_groups joined via working_group_members where radix_address = address ],
    feedback: [ feedback where tg_id = tg_id OR radix_address = address ]
  }
}
```

On-chain data (badge NFT details, escrow receipt NFTs) is NOT fetched by this endpoint. The frontend reads those directly from the Radix Gateway using the existing `gateway.ts` functions (`loadUserBadge`, `fetchEntityDetails`). This keeps the API fast and avoids making the backend a gateway proxy.

### 3. Additional API Endpoints Needed

**`GET /api/votes/by-address/:address`** -- Returns voting history for a wallet address. Internally resolves to tg_id, then queries `votes` joined with `proposals` for title, status, etc. New DB function needed: `getVotesByAddress(address)`.

**`GET /api/bounties/by-address/:address`** -- Returns bounties where the user is creator, assignee, or applicant. New DB function needed: `getBountiesByAddress(address)` which does:
- `SELECT * FROM bounties WHERE creator_tg_id = (SELECT tg_id FROM users WHERE radix_address = ?) OR assignee_address = ?`
- Plus `SELECT * FROM bounty_applications WHERE applicant_address = ?`

**`GET /api/trust/by-address/:address`** -- Trust score by wallet address instead of tg_id. Resolves address to tg_id, then calls existing `getTrustScore(tgId)`.

These can be individual endpoints or all folded into the single `/api/profile/:address` endpoint. The aggregated approach is better for the profile page (one fetch), but individual endpoints are useful for components elsewhere in the app.

### 4. On-Chain Data Reads (Frontend)

Two types of NFTs need to be read from the user's wallet using the Radix Gateway:

**Badge NFTs** -- Already implemented in `gateway.ts` via `loadUserBadge()` and `lookupAllBadges()`. The `useWallet` hook loads the primary badge on connect. No changes needed here.

**Escrow Receipt NFTs** -- New function needed in `gateway.ts`. The `ESCROW_RECEIPT` resource address is already defined in `constants.ts`. A new `loadEscrowReceipts(address)` function would:
1. Call `fetchEntityDetails(address)` (already exists)
2. Find NFTs matching `ESCROW_RECEIPT` resource address in the response
3. Fetch NFT data for each receipt using `fetchNftData()`
4. Parse fields from each receipt (task_id, amount, status, creator, deadline)

### 5. Page Layout -- Tabbed Profile Dashboard

The profile page at `/profile` should replace its current badge-only view with a tabbed dashboard. The URL structure uses hash fragments for tabs: `/profile`, `/profile#tasks`, `/profile#votes`, etc.

**Page structure:**

```
ProfilePage
  AppShell
    ProfileHeader (always visible)
      - Truncated wallet address
      - Primary badge summary (tier pill, XP, level) -- compact, one line
      - Trust score pill (bronze/silver/gold)
    TabNavigation
      - Badge | Tasks | Votes | Groups | Escrow | PRs
    TabContent (switches based on selected tab)
      - BadgeTab
      - TasksTab
      - VotesTab
      - GroupsTab
      - EscrowTab
      - PRsTab
```

### 6. Tab Specifications

**Tab 1: Badge (default)**

Reuses existing `BadgeCard` and `TierProgression` components. Adds trust score breakdown card below.

Layout:
- BadgeCard (existing component, no changes)
- TierProgression (existing component, no changes)
- Trust Score Card (new)
  - Circular or bar visual showing score out of theoretical max
  - Tier label: Bronze / Silver / Gold
  - Breakdown grid: age points, vote points, proposal points, task points, group points, feedback points
  - Each row shows the raw count and points contributed
- All Badges list (existing, for users with multiple schema badges)

Data sources: Badge from `useWallet()` hook (on-chain). Trust from `GET /api/trust/by-address/:address`.

**Tab 2: Tasks**

Three sub-sections, each a collapsible list.

Section "Created" -- Bounties I posted (as task creator):
- Each row: `#id | title | reward XRD | status pill | funded/unfunded indicator`
- For open+funded tasks: "Cancel" action button
- For open+unfunded tasks: "Fund via Escrow" button (links to escrow flow)

Section "Claimed" -- Tasks assigned to me:
- Each row: `#id | title | reward XRD | status pill | deadline countdown`
- For assigned tasks: "Submit PR" action
- For submitted tasks: "Awaiting Review" status

Section "Applied" -- Applications I submitted:
- Each row: `#id | bounty title | pitch excerpt | status (pending/accepted/rejected)`

Empty states: contextual CTAs. "No tasks created -- Browse open bounties" or "No active claims -- Find a task to work on".

Data source: `GET /api/bounties/by-address/:address`

**Tab 3: Votes**

Chronological list of every proposal the user voted on.

Each row:
- Proposal title (linked to `/proposals/:id`)
- User's vote choice (Yes/No/option text) as a colored pill
- Proposal outcome (passed/failed/active) as a secondary pill
- Date voted

Summary stats at top: Total votes cast, unique proposals voted on.

Data source: `GET /api/votes/by-address/:address`

**Tab 4: Groups**

Grid of working group cards the user belongs to.

Each card:
- Group icon + name
- User's role in group (member/lead)
- Member count
- "Leave" button (except for leads)

Below the member grid: "Browse All Groups" link to `/groups`.

Data source: The profile aggregation endpoint returns groups. Already supported by `getGroupsForMember(address)` in db.js.

**Tab 5: Escrow**

This tab combines on-chain escrow receipt NFTs with off-chain transaction history.

Top summary bar:
- "Receipt NFTs in Wallet: N"
- "Total XRD in Active Escrow: X" (sum of receipt amounts)
- "Total Released: Y"

Receipt list (from on-chain Gateway read):
- Each row: Task ID, Amount XRD, Status (active/completed/cancelled), Creator address
- For active receipts owned by the creator: "Request Refund" button (invokes Scrypto manifest)

Transaction history (from off-chain API):
- Recent escrow deposits and releases
- Links to Radix Dashboard for each tx_hash

Data sources: On-chain receipts from new `loadEscrowReceipts()` in `gateway.ts`. Transaction history from `GET /api/escrow` (already exists, but add address filtering).

**Tab 6: PRs**

GitHub pull requests linked to tasks the user is working on.

Each row:
- PR title (linked to GitHub)
- Repository name
- Merge status: open / merged / closed (with appropriate colors)
- Linked bounty ID and title

This data comes from the `bounties` table columns `github_pr` and `approval_repo`. The API endpoint for bounties-by-address already returns this. No GitHub API call needed -- just display what the bot recorded.

If no PRs exist, show: "No linked pull requests. Submit a PR link when you complete a bounty."

Data source: Derived from the Tasks data -- filter bounties where `github_pr IS NOT NULL` and user is assignee.

### 7. New DB Functions Needed

In `bot/db.js`:

**`getUserByAddress(address)`** -- `SELECT * FROM users WHERE radix_address = ?`

**`getVotesByAddress(address)`** -- Resolve to tg_id, then:
```sql
SELECT v.*, p.title, p.status as proposal_status, p.type
FROM votes v
JOIN proposals p ON v.proposal_id = p.id
JOIN users u ON v.tg_id = u.tg_id
WHERE u.radix_address = ?
ORDER BY v.voted_at DESC
```

**`getBountiesByAddress(address)`** -- Returns `{ created, assigned, applied }`:
```sql
-- Created:
SELECT * FROM bounties WHERE creator_tg_id = (SELECT tg_id FROM users WHERE radix_address = ?)

-- Assigned:
SELECT * FROM bounties WHERE assignee_address = ?

-- Applied:
SELECT ba.*, b.title as bounty_title, b.reward_xrd
FROM bounty_applications ba
JOIN bounties b ON ba.bounty_id = b.id
WHERE ba.applicant_address = ?
```

**`getProposalsByAddress(address)`** -- Proposals created by this user:
```sql
SELECT * FROM proposals
WHERE creator_tg_id = (SELECT tg_id FROM users WHERE radix_address = ?)
ORDER BY created_at DESC
```

**`getTrustScoreByAddress(address)`** -- Resolve address to tg_id, delegate to existing `getTrustScore(tgId)`.

### 8. New Frontend Functions Needed

In `guild-app/src/lib/gateway.ts`:

**`loadEscrowReceipts(address: string): Promise<EscrowReceipt[]>`** -- Follows same pattern as `lookupAllBadges`: call `fetchEntityDetails`, find NFTs matching `ESCROW_RECEIPT` resource, fetch data for each, parse fields.

New type in `guild-app/src/lib/types.ts`:
```
interface EscrowReceipt {
  id: string;
  task_id: number;
  amount: string;
  status: string;
  creator: string;
  deadline: number | null;
}
```

### 9. Component Hierarchy

New components to create:

- `guild-app/src/app/profile/page.tsx` -- Rewrite to tabbed layout
- `guild-app/src/components/profile/ProfileHeader.tsx` -- Wallet address + badge summary + trust pill
- `guild-app/src/components/profile/TabNav.tsx` -- Tab navigation bar
- `guild-app/src/components/profile/BadgeTab.tsx` -- Wraps existing BadgeCard + TierProgression + trust breakdown
- `guild-app/src/components/profile/TasksTab.tsx` -- Three-section task list
- `guild-app/src/components/profile/VotesTab.tsx` -- Vote history list
- `guild-app/src/components/profile/GroupsTab.tsx` -- Group membership grid
- `guild-app/src/components/profile/EscrowTab.tsx` -- Receipt NFTs + tx history
- `guild-app/src/components/profile/PRsTab.tsx` -- GitHub PR list

### 10. Data Flow Summary

On page load (wallet connected):
1. `useWallet()` provides `account`, `badge` (already loaded on connect)
2. Single fetch to `GET /api/profile/:address` returns all off-chain data
3. Parallel fetch to Gateway for escrow receipt NFTs via `loadEscrowReceipts()`
4. State stored in page-level `useState`, passed to tab components as props
5. Tab switching is pure client-side (no re-fetch), with hash-based URL updates

On wallet disconnect:
- Show "Connect your wallet to view your profile" (existing pattern)

### 11. Handling the "Wallet-Only" User

A user who connects their Radix Wallet but has never used the Telegram bot will have no row in the `users` table. The `/api/profile/:address` endpoint should handle this
