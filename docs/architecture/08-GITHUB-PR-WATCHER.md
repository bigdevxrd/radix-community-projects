I now have a complete picture. Here is the implementation specification.

---

## GitHub PR Watcher -- Implementation Specification

### 1. System Overview

The PR Watcher adds automated escrow release to the Radix Guild bot. When a worker submits a bounty with a GitHub PR URL, the bot polls GitHub for merge status. On merge detection, the bot constructs a Radix transaction manifest, signs it with the bot's ed25519 private key, and submits a `release_task` call to the on-chain TaskEscrow component. This eliminates the manual admin `verify` + `pay` steps for PR-based bounties.

### 2. Current Architecture (What Exists)

**Bounty lifecycle today** (all manual):
1. Creator: `/bounty create` -- creates row in SQLite, status=`open`
2. Creator funds escrow on-chain -- `fundTask()` updates `funded=1`
3. Worker: `/bounty claim` -- status=`assigned`
4. Worker: `/bounty submit <id> <pr_url>` -- stores `github_pr` column, status=`submitted`
5. Admin: `/bounty verify <id>` -- status=`verified`
6. Admin: `/bounty pay <id> <tx_hash>` -- manually calls `release_task` on-chain, records TX hash, status=`paid`

**On-chain escrow contract** (`task-escrow/src/lib.rs`):
- `release_task(task_id: u64)` is restricted to the `verifier` role or `OWNER`
- It requires the task status to be `submitted` or `claimed`
- It deducts the platform fee, deposits the payout to the worker's account, and emits `TaskReleasedEvent`

**Transaction signing** (`scripts/signer.js`):
- Already exists with `signAndSubmit(manifest)` and `waitForCommit(intentHash)`
- Uses `BOT_PRIVATE_KEY` (ed25519 hex) and `RADIX_ACCOUNT_ADDRESS` from env
- Prepends `lock_fee` if not present in manifest
- Returns `{ intentHash, duplicate }`

**Key finding**: The bot does NOT currently sign any transactions itself. The signer exists in `/scripts/signer.js` as a standalone utility, not integrated into the bot runtime. The bot only reads on-chain state via the Gateway API.

**Database columns already present on `bounties` table**:
- `github_pr TEXT` -- already stores the PR URL on submit
- `onchain_task_id INTEGER` -- already tracks the on-chain escrow task ID
- `escrow_verified INTEGER` -- already tracks on-chain verification

**Dashboard** already renders `github_pr` as a link on bounty detail and list pages.

### 3. New Components

#### 3.1 `bot/services/github.js` -- GitHub API Service

**Functions:**

`parsePRUrl(url)`:
- Input: string like `https://github.com/owner/repo/pull/123`
- Regex: `/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/`
- Returns: `{ owner, repo, number }` or `null` on invalid format
- Must reject URLs that don't match this exact structure (no query params, no fragments used as input)

`checkPRStatus(owner, repo, prNumber)`:
- Calls `GET https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}`
- Headers: `Accept: application/vnd.github.v3+json`, optionally `Authorization: Bearer {GITHUB_TOKEN}` if env var set
- Returns: `{ merged: bool, state: string, title: string, merged_at: string|null, base_branch: string, head_branch: string }`
- On HTTP error: returns `{ error: true, status: number, message: string }`

`validatePRForBounty(prUrl, allowedRepo)`:
- Parses the URL
- Checks owner/repo matches `allowedRepo` (if specified on the bounty)
- Returns `{ valid: bool, parsed: { owner, repo, number }, reason?: string }`

**Rate limiting:**
- Track remaining calls via `X-RateLimit-Remaining` response header
- If remaining < 10, skip polling cycle and log warning
- Unauthenticated: 60 req/hr. With `GITHUB_TOKEN`: 5,000 req/hr
- Store last-checked timestamp per bounty to avoid redundant calls

**Env vars:**
- `GITHUB_TOKEN` (optional) -- Personal Access Token for higher rate limits and private repo access
- No new required env vars; works without token for public repos

#### 3.2 `bot/services/tx-signer.js` -- Bot Transaction Signer

This is **not** a copy of `scripts/signer.js`. It is a lightweight wrapper that imports the signer into the bot process.

**Why a separate file**: The `scripts/signer.js` loads `.env` from multiple hardcoded paths and uses `console.log` for output. The bot needs a clean import that uses already-loaded env vars and returns structured results.

**Functions:**

`buildReleaseManifest(taskId)`:
- Constructs the transaction manifest string:
```
CALL_METHOD
  Address("{RADIX_ACCOUNT_ADDRESS}")
  "lock_fee"
  Decimal("2")
;
CALL_METHOD
  Address("{RADIX_ACCOUNT_ADDRESS}")
  "create_proof_of_amount"
  Address("{VERIFIER_BADGE_ADDRESS}")
  Decimal("1")
;
CALL_METHOD
  Address("{ESCROW_COMPONENT}")
  "release_task"
  {task_id}u64
;
```
- The bot account must hold the verifier badge. The `create_proof_of_amount` call creates an auth zone proof that satisfies the `restrict_to: [verifier]` role check on `release_task`.

`submitReleaseTx(taskId)`:
- Calls `buildReleaseManifest(taskId)`
- Uses the signer logic (TransactionBuilder, PrivateKey from `@radixdlt/radix-engine-toolkit`)
- Signs and submits the transaction
- Waits for commit (with 90s timeout)
- Returns: `{ success: bool, intentHash: string, error?: string }`

**Required env vars** (must already be set):
- `BOT_PRIVATE_KEY` -- ed25519 hex key for the bot signer account
- `RADIX_ACCOUNT_ADDRESS` -- the bot's account that holds the verifier badge
- `VERIFIER_BADGE_ADDRESS` -- the resource address of the verifier badge (new env var)
- `ESCROW_COMPONENT` -- already used in `gateway.js`

**Critical prerequisite**: The bot's `RADIX_ACCOUNT_ADDRESS` must already hold at least 1 verifier badge token on-chain. This is an operational setup step, not a code change.

#### 3.3 PR Watcher Cron (in `bot/index.js`)

**Pattern**: Follows the existing `setInterval` pattern at the bottom of index.js (lines 1613-1632).

```
setInterval(async () => {
  try {
    await checkPRMerges();
  } catch (e) {
    console.error("[PRWatcher] Background task failed:", e.message);
  }
}, 5 * 60 * 1000); // every 5 minutes
```

**`checkPRMerges()` logic:**

1. Query: `SELECT * FROM bounties WHERE status = 'submitted' AND github_pr IS NOT NULL AND approval_type = 'pr_merged'`
2. For each bounty:
   a. Parse the PR URL via `parsePRUrl(bounty.github_pr)`
   b. If parse fails, log and skip
   c. If `bounty.approval_repo` is set, validate owner/repo matches
   d. Call `checkPRStatus(owner, repo, number)`
   e. If rate limited or error, log and break the loop (don't burn remaining quota)
   f. If `merged === true`:
      - Check `base_branch` matches expected branch (default: `main` or `master`, configurable per bounty via `approval_criteria`)
      - Call `verifyBounty(bounty.id)` in db to move status to `verified`
      - Call `submitReleaseTx(bounty.onchain_task_id)` to release on-chain escrow
      - If TX succeeds: call `payBounty(bounty.id, intentHash)` to move status to `paid`
      - Record audit entry in `bounty_transactions` with `tx_type = 'auto_release'` and `description = 'PR merged: {pr_url}'`
      - Notify the worker via Telegram DM: "Your bounty #{id} has been auto-approved! PR merged. Payment TX: {intentHash}"
      - Notify Discord webhook
      - Log: `[PRWatcher] Auto-released bounty #{id} — PR merged, TX: {intentHash}`
   g. If `state === 'closed'` and `merged === false`:
      - Log warning: PR was closed without merge
      - Optionally notify worker that their PR was closed (but do NOT change bounty status -- that's a manual decision)

**Guard rails:**
- If `BOT_PRIVATE_KEY` is not set, the cron registers but logs a warning and skips every cycle
- If `onchain_task_id` is null on a bounty, skip auto-release and log (means escrow wasn't linked)
- Never auto-release if the on-chain task status doesn't match (add a Gateway check before release)
- Maximum 10 bounties processed per cycle to limit API and TX throughput

#### 3.4 Database Migrations (in `bot/db.js`)

Add to the existing migration block (safe `ALTER TABLE` with try/catch):

```
try { db.exec("ALTER TABLE bounties ADD COLUMN approval_type TEXT DEFAULT 'admin_approved'"); } catch(e) {}
try { db.exec("ALTER TABLE bounties ADD COLUMN approval_repo TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE bounties ADD COLUMN approval_criteria TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE bounties ADD COLUMN approval_branch TEXT DEFAULT 'main'"); } catch(e) {}
try { db.exec("ALTER TABLE bounties ADD COLUMN auto_released_at INTEGER"); } catch(e) {}
```

**New db functions:**

`getSubmittedPRBounties()`:
- `SELECT * FROM bounties WHERE status = 'submitted' AND github_pr IS NOT NULL AND approval_type = 'pr_merged'`

`markAutoReleased(id, txHash)`:
- Combines `verifyBounty` + `payBounty` into one atomic operation
- Sets `status = 'paid'`, `verified_at = now`, `paid_at = now`, `paid_tx = txHash`, `auto_released_at = now`
- Records in `bounty_transactions` with `tx_type = 'auto_release'`
- Updates `escrow_wallet` totals

#### 3.5 Bot Command Updates

**`/bounty create` changes:**

Currently at line ~650 in db.js (`createBounty`). Add optional parameters:
- `--approval pr_merged` sets `approval_type = 'pr_merged'`
- `--repo owner/repo` sets `approval_repo`
- `--branch main` sets `approval_branch` (defaults to `main`)

The command parsing in `index.js` (around line 660) needs to extract these flags from the message text. Follow the existing pattern where args are parsed by splitting on spaces.

**`/bounty submit` changes (line 710-717 in index.js):**

- Validate PR URL format using `parsePRUrl()` before storing
- If `bounty.approval_repo` is set, validate the PR is from that repo
- Reply message changes from "Awaiting admin verification" to either:
  - "Awaiting PR merge for auto-release" (if `approval_type = 'pr_merged'`)
  - "Awaiting admin verification" (if `approval_type = 'admin_approved'`)

**`/bounty stats` changes:**
- Add count of bounties awaiting PR merge
- Show GitHub API rate limit status if token is configured

#### 3.6 API/Dashboard Updates

**API (`bot/services/api.js`):**

The `GET /api/bounties/:id` endpoint already returns all bounty columns. Since the new columns (`approval_type`, `approval_repo`, etc.) are added to the `bounties` table, they will automatically appear in the API response because `getBountyDetail` does `SELECT *`.

No API code changes needed for data exposure.

**Dashboard (`guild-app/src/app/bounties/[id]/page.tsx`):**

Add to the Bounty type interface:
- `approval_type: string | null`
- `approval_repo: string | null`
- `approval_branch: string | null`
- `auto_released_at: number | null`

Add to the bounty detail page:
- When `approval_type === 'pr_merged'` and `status === 'submitted'`:
  - Show "Awaiting PR Merge" badge (yellow/amber) instead of "Submitted"
  - Show the linked repo as a clickable GitHub link
- When `auto_released_at` is set:
  - Show "Auto-released on PR merge" with timestamp
  - Green badge indicating automated verification

**Bounty list page (`guild-app/src/app/bounties/page.tsx`):**
- Add a small icon/indicator next to bounties with `approval_type === 'pr_merged'` to show they are auto-verified

### 4. Security Considerations

**PR URL validation:**
- Strict regex match only -- no redirects, no shorteners
- If `approval_repo` is set on the bounty, the PR must be from that exact `owner/repo`
- Reject PRs merged into unexpected branches (check `base_branch`)

**GitHub API:**
- Rate limit tracking via response headers
- Graceful degradation: if rate limited, wait until reset time (from `X-RateLimit-Reset` header)
- No sensitive data sent to GitHub -- only public reads

**Transaction signing:**
- `BOT_PRIVATE_KEY` must be kept in `.env` or secrets store, never logged
- The manifest is deterministic -- no user-supplied strings injected into it
- Lock fee of 2 XRD provides margin (normal cost ~0.5 XRD)
- Verify the on-chain task status via Gateway before submitting the release TX (defense against stale DB state)

**Race conditions:**
- The cron should use a mutex/flag to prevent overlapping cycles
- If a TX is in-flight for a bounty, skip it in the next cycle (t
