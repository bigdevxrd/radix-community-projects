# Radix Community Projects — Sweep Report
**Date:** 2026-04-15  
**Scope:** `/Users/bigdev/Projects/radix-community-projects`  
**Areas audited:** Security, Code Quality, Content/Messaging  
**Status:** Working document — DO NOT commit

---

## Executive Summary

The codebase is generally well-structured for its scale. The Next.js dashboard is a thin client that delegates all sensitive operations to the Radix ledger (Scrypto smart contracts) — which is architecturally sound. The Telegram bot + HTTP API server has more surface area and carries the majority of risk. Several **Critical** and **High** issues were found that need attention before any significant growth in users or treasury value.

---

## 1. Security Audit

---

### SEC-01: `/bounty pay` — Anyone can mark a bounty as paid
**File:** `bot/index.js:826-835`  
**Severity:** Critical  
**Issue:** The `/bounty pay <id> <tx_hash>` command has no authentication check at all — not even `requireBadge`. Any Telegram user who knows a bounty ID and can fabricate a transaction hash can run this command and trigger `db.payBounty()`, which sets `status = 'paid'` and updates the escrow ledger. The only guard is `db.payBounty` checking `status = 'verified'`, but any badge holder can call `/bounty verify` first (see SEC-02). The transaction hash is never verified on-chain for pay — only for fund.  
**Fix:** Add `ADMIN_IDS` check (same pattern as `/adminfeedback`) to both `/bounty pay` and ensure only the task creator or a hard-coded admin can trigger payment. Consider requiring on-chain verification of the payment TX via `verifyEscrowTx`.

---

### SEC-02: `/bounty verify` — Any badge holder can verify their own submission
**File:** `bot/index.js:813-823`  
**Severity:** Critical  
**Issue:** The comment says "Admin only — requires badge" but the guard is only `requireBadge` — which checks for *any* active Guild badge, not admin status. Any badge holder can call `/bounty verify <id>` on any submitted bounty, including their own submission. Combined with SEC-01, a user can: create a bounty, fund it, claim it, submit it, verify it themselves, then pay themselves.  
**Fix:** Replace `requireBadge` check with `ADMIN_IDS.includes(ctx.from.id)`. Add a check that the verifier is not the assignee.

---

### SEC-03: `/bounty approve` — Any user can approve any application
**File:** `bot/index.js:866-877`  
**Severity:** High  
**Issue:** The `/bounty approve <application_id>` command has no auth check at all. Any user (no badge required) can approve any pending application, assigning the work to any applicant. This bypasses the stated intent that only the bounty creator should approve.  
**Fix:** Add auth requiring the caller's `tg_id` to match the bounty's `creator_tg_id`.

---

### SEC-04: `/wg sunset` and `/wg renew` — No auth guard
**File:** `bot/index.js:1117-1144`  
**Severity:** High  
**Issue:** Both `/wg sunset <group> <date>` and `/wg renew <group> <months>` modify working group charter dates with no authentication check — not even `requireBadge`. Any Telegram user can set any group's charter expiry date, potentially triggering premature sunset alerts or extending a group's charter indefinitely.  
**Fix:** Add `ADMIN_IDS` check or require the caller to be the group lead (`group.lead_tg_id === ctx.from.id`).

---

### SEC-05: `/cv2 sync` — Force-sync available to anyone
**File:** `bot/index.js:1671-1678`  
**Severity:** Medium  
**Issue:** The `/cv2 sync` subcommand forces a full chain sync with no admin guard. A comment labels it "(admin)" but no code enforces it. While CV2 is currently disabled (`cv2.isEnabled()` returns false), when enabled, this creates an unauthenticated DoS vector — hammering the Radix Gateway with forced polls.  
**Fix:** Add `ADMIN_IDS` check before calling `cv2.syncFromChain()`.

---

### SEC-06: POST `/api/proposals` — Badge ownership not verified
**File:** `bot/services/api.js:132-168`  
**Severity:** High  
**Issue:** The web-facing API endpoint for creating proposals (`POST /api/proposals`) accepts a `body.address` but never calls `hasBadge(address)` to verify the submitter actually owns a Guild badge. The TG bot correctly calls `requireBadge` before creating proposals, but the HTTP API bypasses this entirely. Any address (including one with no badge) can create proposals from the dashboard.  
**Fix:** Add `await hasBadge(body.address)` check before `db.createProposal()`. Return 403 if no badge.

---

### SEC-07: POST `/api/proposals/:id/vote` — Badge ownership not verified
**File:** `bot/services/api.js:586-625`  
**Severity:** High  
**Issue:** The web voting endpoint accepts a `body.address` and records a vote, but never calls `hasBadge(body.address)`. The TG inline vote handler correctly calls `hasBadge` before recording votes, but the HTTP API endpoint skips this. Any address can vote from the dashboard without holding a badge.  
**Fix:** Add `await hasBadge(body.address)` check. Return 403 if no badge.

---

### SEC-08: POST `/api/bounties` — Badge ownership not verified, hardcoded admin TG ID
**File:** `bot/services/api.js:246-274`  
**Severity:** High  
**Issue:** Web-created bounties bypass badge verification entirely. Additionally, a hardcoded admin TG ID `6102618406` is used as the `creator_tg_id` for all web-created bounties (`const ADMIN_TG_ID = 6102618406`). This means all web-created bounties appear to be created by the admin, making it impossible to enforce creator-only cancel/approve flows on web-created tasks.  
**Fix:** (1) Add badge verification. (2) Use a sentinel value or separate field for web-created bounties rather than assigning admin's TG ID.

---

### SEC-09: Rate limiter uses wrong limit for POST `/api/proposals`
**File:** `bot/services/api.js:71`  
**Severity:** Medium  
**Issue:** The rate limiter applies `200 req/min` for all non-game POST requests: `rateLimit(clientIp, isGamePost ? 10 : 200)`. This means POST `/api/proposals`, POST `/api/bounties`, and POST voting endpoints all share the 200/min limit — which is far too permissive for state-changing operations and invites spam.  
**Fix:** Apply tighter limits to write endpoints: `isGamePost ? 10 : (isWritePost ? 20 : 200)`. Write endpoints (proposals, votes, bounties, feedback) should be ≤20/min.

---

### SEC-10: CORS defaults to wildcard `*` when `CORS_ORIGINS` env is unset
**File:** `bot/services/api.js:38-39`  
**Severity:** Medium  
**Issue:** If `CORS_ORIGINS` is not set in `.env`, the API server responds with `Access-Control-Allow-Origin: *` to all requests. In production (where the bot runs on the Sats VPS), this is likely deployed without this env variable set, meaning any origin can make credentialed cross-origin requests to the API.  
**Fix:** Set `CORS_ORIGINS=https://radixguild.com` in the production `.env`. Add a check that logs a warning if not set and falls back to a stricter default.

---

### SEC-11: X-Forwarded-For IP — Trivially spoofable rate limit bypass
**File:** `bot/services/api.js:70`  
**Severity:** Medium  
**Issue:** The rate limiter extracts the client IP from `req.headers["x-forwarded-for"]`. If Caddy is correctly configured as a reverse proxy, this is the only value available — but the `split(",")[0]` approach trusts the first value in the header, which can be appended by the client (e.g., `X-Forwarded-For: 1.2.3.4, attacker-ip`). The actual trusted IP is the *last* hop added by Caddy.  
**Fix:** Use the *last* value in `x-forwarded-for` split, or configure Caddy to set `X-Real-IP` and use that instead.

---

### SEC-12: `sanitize()` in manifests doesn't strip `{` `}` or backtick
**File:** `guild-app/src/lib/manifests.ts:3`  
**Severity:** Medium  
**Issue:** The `sanitize` function strips `"`, `\`, `\n`, `\r`, `;`. It does not strip backtick, `{`, `}`, `<`, `>`, or Unicode directional characters. While the `validateAddress` prefix checks provide a hard layer of defense for addresses, the sanitized string fields (username, title, description, badge IDs) are inserted raw into the manifest string. A username containing backticks or curly braces could cause unexpected manifest parse behavior.  
**Fix:** Add backtick and curly brace stripping: `val.replace(/["`{}\\\n\r;<>]/g, "")`. Or use a strict allowlist of `[a-zA-Z0-9 _\-]` for usernames.

---

### SEC-13: Empty-array proof in `claimTaskManifest` / `createEscrowTaskManifest`
**File:** `guild-app/src/lib/manifests.ts:198, 237`  
**Severity:** Medium  
**Issue:** Both `createEscrowTaskManifest` and `claimTaskManifest` call `create_proof_of_non_fungibles` with an empty `Array<NonFungibleLocalId>()`. This creates a proof of *any* badge (quantity ≥ 0), not a proof that the user holds *a specific badge*. Whether the Scrypto contract validates the proof contents is the real guard, but if the on-chain component relies on the proof containing actual NFT IDs to gate access, this manifest would fail.  
**Fix:** Verify the Scrypto blueprint's `claim_task` method signature. If it requires a specific NFT in the proof, pass the actual NFT local ID, not an empty array.

---

### SEC-14: Hardcoded admin TG ID in `bot/db.js` and `bot/index.js`
**File:** `bot/db.js:438`, `bot/index.js:1589`, `bot/services/api.js:260`  
**Severity:** Low  
**Issue:** The admin TG ID `6102618406` appears hardcoded in three separate files with no single source of truth. This creates a maintenance risk: adding a second admin requires editing three files.  
**Fix:** Centralize admin IDs: `const ADMIN_IDS = (process.env.ADMIN_TG_IDS || "6102618406").split(",").map(Number)`.

---

### SEC-15: Public `/api/feedback` returns all tickets without auth
**File:** `bot/services/api.js:545-558`  
**Severity:** Low  
**Issue:** `GET /api/feedback` (no address param) returns all 50 feedback tickets including usernames and message content, with no authentication. This is internal operational data.  
**Fix:** Either remove the unauthenticated list endpoint, or add a server-side secret header check for the admin route.

---

## 2. Code Quality Audit

---

### QC-01: `parseBadgeFields` uses positional index array access — fragile
**File:** `guild-app/src/lib/gateway.ts:32-45`  
**Severity:** High  
**Issue:** Badge NFT fields are accessed by positional index (`fields[0]`, `fields[3]`, etc.) with no field-name validation. If the Scrypto blueprint adds, removes, or reorders fields in a future deployment, all badge parsing silently breaks and returns `-` for all values. The `/* eslint-disable @typescript-eslint/no-explicit-any */` wrapper exists because the types can't be expressed properly.  
**Fix:** Parse fields by `field_name` property (present in programmatic JSON) rather than index. Add a type guard that checks expected field names are present.

---

### QC-02: TypeScript `any` in gateway.ts is a type hole
**File:** `guild-app/src/lib/gateway.ts:32, 58, 88`  
**Severity:** Medium  
**Issue:** `parseBadgeFields(nfId: string, fields: any[])`, and the `(r: any)` lambda in `loadUserBadge` and `lookupAllBadges` skip type checking entirely on Radix Gateway API responses. Runtime errors in this path manifest as silently returning `-` for all fields or `null` badges.  
**Fix:** Define an interface for the Gateway API response shape (can be `unknown` initially, narrowed with type guards) to catch field renames at compile time.

---

### QC-03: `db.js` init function is 450+ lines — needs decomposition
**File:** `bot/db.js:1-500` (init function)  
**Severity:** Medium  
**Issue:** The `init()` function creates all tables, runs all migrations, seeds all data, and sets all indexes in a single 450-line synchronous block. It is called once at startup but the function body is extremely hard to read and maintain. Errors in any migration are silently swallowed via bare `catch(e) {}` blocks.  
**Fix:** Split into `createTables()`, `runMigrations()`, `seedData()` sub-functions. Log migration errors instead of silently swallowing them.

---

### QC-04: `bot/services/api.js` — Single 816-line request handler
**File:** `bot/services/api.js`  
**Severity:** Medium  
**Issue:** The entire API is one `http.createServer` callback with all route matching done sequentially via `if/else` chains. The `readBody` helper is defined *inside* the request handler (line 173), meaning it is re-created on every request. The function is not testable in isolation.  
**Fix:** Extract route handlers into separate functions or modules. Move `readBody` outside the request handler. Consider using a lightweight router (e.g., `express` or `fastify`) — the codebase already bundles many Node.js modules.

---

### QC-05: `createBounty` in API doesn't validate `reward_xrd` is a number
**File:** `bot/services/api.js:261`  
**Severity:** Medium  
**Issue:** `parseFloat(body.reward_xrd)` is called without validating that `body.reward_xrd` is a positive finite number. A client can send `"Infinity"`, `"NaN"`, `"-500"`, or `"1e308"` as `reward_xrd`. SQLite will store these values and they will appear in the UI.  
**Fix:** Add validation: `const reward = parseFloat(body.reward_xrd); if (!isFinite(reward) || reward <= 0) return 400 error`.

---

### QC-06: `readBody` has 1024-byte limit but `description` allows 2000 chars
**File:** `bot/services/api.js:176`, `bot/services/api.js:161`  
**Severity:** Medium  
**Issue:** `readBody` rejects any request body over 1024 bytes. But `POST /api/proposals` accepts a `description` field of up to 2000 characters. A user submitting a proposal with a long description will hit the 1024-byte limit and receive a generic `invalid_body` error.  
**Fix:** Increase the body limit to 8192 bytes (8KB) to accommodate the described maximum payload sizes.

---

### QC-07: `WalletProvider` — RDT instance not exposed correctly (stale closure)
**File:** `guild-app/src/hooks/useWallet.tsx:96`  
**Severity:** Medium  
**Issue:** The context value is `{ ..., rdt: rdtRef.current, ... }`. React context consumers only re-render when the context value changes. Since `rdtRef.current` is a ref (not state), its initial value `null` is baked into the context on the first render and only updated when `useEffect` runs (after mount). Any consumer that reads `rdt` before the effect fires will get `null`. Components that call `rdt.walletApi.sendTransaction` without null-checking will throw.  
**Fix:** Either use `useState<RadixDappToolkit | null>(null)` for the RDT instance (so context updates when it's set), or the existing `sendAdminTx` guard `if (!rdt || !account) return` is sufficient if consistently applied across all callers.

---

### QC-08: No test coverage for bot commands or DB functions
**File:** `bot/` directory  
**Severity:** High  
**Issue:** There are zero test files for the Telegram bot (`bot/index.js`, `bot/db.js`, `bot/services/api.js`). The only test file is `agent-tools/test/basic.test.js` which tests the agent pipeline, not governance logic. Critical paths like vote deduplication, bounty state transitions, and escrow verification have no automated test coverage.  
**Fix:** At minimum, add unit tests for: `db.recordVote` (double-vote prevention), `db.assignBounty` (funded check), `db.verifyBounty` (state check), and `verifyEscrowTx` (mock responses).

---

### QC-09: `admin/page.tsx` — No client-side badge/admin check before rendering admin actions
**File:** `guild-app/src/app/admin/page.tsx`  
**Severity:** Medium  
**Issue:** The Admin page renders all action forms regardless of whether the connected wallet holds an admin badge. The comment says "Requires admin badge in connected wallet" but this is not enforced in the UI — anyone can see and interact with the forms. The actual protection is on-chain (the Scrypto manifests require admin badge proof), but a confusing UX: a non-admin gets a wallet error instead of a clear "admin access required" message.  
**Fix:** Check `badge?.schema` or use `lookupAllBadges` to verify admin badge ownership. Show an "admin badge required" guard card when not connected or no admin badge found.

---

### QC-10: `constants.ts` — addresses used as fallbacks expose mainnet addresses in bundle
**File:** `guild-app/src/lib/constants.ts:4-50`  
**Severity:** Low  
**Issue:** All `NEXT_PUBLIC_*` constants fall back to hardcoded mainnet addresses. While these are public-facing addresses (not secrets), shipping mainnet component addresses as compile-time fallbacks in a Next.js client bundle means they're visible in the browser even if the env vars aren't set. More importantly, if the app is accidentally deployed pointing at testnet env vars but the fallback kicks in, it silently points at mainnet.  
**Fix:** For production safety, remove the fallback values and throw/log a clear error if the env variable is missing. Keep the fallbacks only in `.env.example` as documentation.

---

### QC-11: `bot/index.js` — `require()` calls inside handler bodies
**File:** `bot/index.js:288, 375, 792, 899`  
**Severity:** Low  
**Issue:** Several `require()` calls are made inside command handler functions (e.g., `const bridge = require("./services/cv2-bridge")`). While Node.js caches modules, this pattern is an anti-pattern — it obscures dependencies, prevents tree-shaking, and makes the handler harder to test. It also silently swallows errors since these are inside `try/catch` blocks.  
**Fix:** Move all `require()` calls to the top of the file.

---

### QC-12: Working Groups `sunset`/`renew` use 30-day months (not calendar)
**File:** `bot/index.js:1141`  
**Severity:** Low  
**Issue:** Charter renewal uses `months * 30 * 86400` seconds, which approximates months as exactly 30 days. For a 6-month renewal, this is 180 days, not an actual 6-calendar-month extension. This creates drift in charter expiry dates.  
**Fix:** Use `Date` arithmetic: set a date, call `setMonth(d.getMonth() + months)`, convert back to unix timestamp.

---

## 3. Content / Messaging Audit

---

### CM-01: "Binding Decision" label is misleading — votes are off-chain
**File:** `guild-app/src/app/proposals/page.tsx:75`  
**Severity:** High  
**Issue:** Charter proposals are labeled "Binding Decision" with the tooltip "Results are enforced on-chain." However, the governance system is *off-chain* (SQLite in the bot). XP and tier data may be written on-chain via the badge manager, but charter votes have no on-chain enforcement mechanism. This is misleading to users who may believe their charter votes are directly binding on protocol behavior.  
**Fix:** Change label to "Charter Vote" and tooltip to "Shapes the DAO charter. Results inform on-chain configuration once the charter is ratified." This accurately reflects the current non-binding-but-formal status.

---

### CM-02: `/decisions` bot command says "47 decisions" — actual count differs
**File:** `bot/index.js:543-548`  
**Severity:** Medium  
**Issue:** The `/decisions` bot command hard-codes "47 decisions mapped" in its response text. The seeded decision tree in `db.js` seeds items up to sort_order 54 (items 40-54 in structural + P3 tracks). The hard-coded number will drift as decisions are added or removed.  
**Fix:** Replace the hard-coded "47" with `db.getDecisions().length` or `db.getCharterStatus().total` so the number is always accurate.

---

### CM-03: `/bounty create` help text shows wrong escrow minimum
**File:** `bot/index.js:768`  
**Severity:** Medium  
**Issue:** The `/bounty create` success message states "Min deposit: 200 XRD (~$5)" — this is the old minimum from a previous config. The `platform_config` table seeds `min_bounty_xrd = 5` (not 200), and the on-chain contract has its own `min_deposit` value. The hardcoded string is stale.  
**Fix:** Read the minimum from `db.getPlatformConfig()` or remove the hardcoded value and link to the dashboard for details.

---

### CM-04: `/faq` — XP reward amounts stale
**File:** `bot/index.js:1407`  
**Severity:** Low  
**Issue:** The FAQ states "amend (+15 XP)" but `XP_REWARDS` in `xp.js` defines `amend: 15`. These happen to match, but the FAQ has other actions listed where the order and formatting are inconsistent with `XP_REWARDS`. If XP values change in code, the FAQ won't update automatically.  
**Fix:** Generate XP amounts dynamically from `XP_REWARDS` constants or add a comment noting which constant to update.

---

### CM-05: Admin page says "Royalties apply" but minting is listed as 0 XRD cost in FAQ
**File:** `guild-app/src/app/admin/page.tsx:37` vs `bot/index.js:1401`  
**Severity:** Low  
**Issue:** The admin panel shows royalty costs (0.25–1 XRD) for badge operations. The FAQ says "Badge minting is free (0 XRD)." Public minting is indeed free, but admin minting costs 1 XRD in royalties. The FAQ doesn't distinguish between public and admin minting paths.  
**Fix:** Add a note to the FAQ: "Admin operations (tier updates, revoke) carry a small XRD royalty fee paid to the badge manager contract."

---

### CM-06: `/start` in groups — bot username is `@rad_gov` but handle may differ
**File:** `bot/index.js:131`  
**Severity:** Low  
**Issue:** The group `/start` response hardcodes "DM me to get started: @rad_gov". If the bot handle is changed, this will be stale. It's also missing a line break between the DM invite and the commands.  
**Fix:** Move the bot handle to a `BOT_USERNAME` env variable or constant: `const BOT_USERNAME = process.env.BOT_USERNAME || "@rad_gov"`.

---

### CM-07: Governance terminology inconsistency — "temperature check" vs "temp check" vs "Gauging Interest"
**Severity:** Low  
**Issue:** The same proposal type is called "temperature check" (in `/temp` command), "temp check" (in `/temps` list), "Temp" (in history display), and "Gauging Interest" (in the dashboard UI). The CV2 on-chain system calls them "temperature_check". No consistent term is used across bot, API, and dashboard.  
**Fix:** Pick one term — "Temperature Check" is the most formal and matches CV2. Use it consistently across all surfaces.

---

## Summary Table

| ID | Severity | Area | Description |
|----|----------|------|-------------|
| SEC-01 | Critical | Security | `/bounty pay` — no auth, any user can mark paid |
| SEC-02 | Critical | Security | `/bounty verify` — any badge holder can self-verify |
| SEC-03 | High | Security | `/bounty approve` — no auth, any user can approve applications |
| SEC-04 | High | Security | `/wg sunset` and `/wg renew` — no auth, any user can modify charter dates |
| SEC-05 | Medium | Security | `/cv2 sync` — unauthenticated force-sync (DDoS vector when CV2 enabled) |
| SEC-06 | High | Security | `POST /api/proposals` — no badge verification |
| SEC-07 | High | Security | `POST /api/proposals/:id/vote` — no badge verification |
| SEC-08 | High | Security | `POST /api/bounties` — no badge verification + hardcoded admin TG ID |
| SEC-09 | Medium | Security | Rate limit too permissive for write endpoints (200/min) |
| SEC-10 | Medium | Security | CORS defaults to `*` when env unset |
| SEC-11 | Medium | Security | Rate limit IP spoofable via `X-Forwarded-For` |
| SEC-12 | Medium | Security | `sanitize()` doesn't strip backtick, `{`, `}` in manifests |
| SEC-13 | Medium | Security | Empty NFT array in proof manifests — may not gate access |
| SEC-14 | Low | Security | Admin TG ID hardcoded in 3 files, no single source of truth |
| SEC-15 | Low | Security | `GET /api/feedback` returns all tickets unauthenticated |
| QC-01 | High | Quality | Badge fields parsed by fragile positional index, not by name |
| QC-02 | Medium | Quality | TypeScript `any` in gateway.ts creates type holes |
| QC-03 | Medium | Quality | `db.js` init function is 450+ lines, silent migration errors |
| QC-04 | Medium | Quality | API server is 816-line monolithic handler |
| QC-05 | Medium | Quality | `reward_xrd` not validated (accepts NaN/Infinity/-500) |
| QC-06 | Medium | Quality | Body size limit (1024B) too small for 2000-char description field |
| QC-07 | Medium | Quality | `rdt` exposed via ref causes stale null in context consumers |
| QC-08 | High | Quality | Zero test coverage for bot commands, DB, and API |
| QC-09 | Medium | Quality | Admin page renders without checking if wallet holds admin badge |
| QC-10 | Low | Quality | Hardcoded mainnet fallback addresses in constants.ts bundle |
| QC-11 | Low | Quality | `require()` calls inside command handlers |
| QC-12 | Low | Quality | Charter renewal uses 30-day month approximation |
| CM-01 | High | Content | "Binding Decision" label misleads users — votes are off-chain |
| CM-02 | Medium | Content | `/decisions` bot response hard-codes "47 decisions" (stale) |
| CM-03 | Medium | Content | `/bounty create` help shows stale 200 XRD minimum |
| CM-04 | Low | Content | FAQ XP amounts not dynamically sourced |
| CM-05 | Low | Content | FAQ doesn't clarify admin vs public minting royalties |
| CM-06 | Low | Content | Bot username `@rad_gov` hardcoded in `/start` response |
| CM-07 | Low | Content | "temperature check" / "temp check" / "Gauging Interest" inconsistency |

---

## Priority Action Plan

**Immediate (before any significant XRD in escrow):**
1. SEC-01: Add admin guard to `/bounty pay`
2. SEC-02: Replace `requireBadge` with `ADMIN_IDS` check in `/bounty verify`
3. SEC-03: Add creator ownership check to `/bounty approve`

**Short-term (next sprint):**
4. SEC-04: Add auth to `/wg sunset` and `/wg renew`
5. SEC-06 + SEC-07: Add badge verification to web API voting and proposal endpoints
6. SEC-08: Fix web bounty creation (badge check + remove admin TG ID assignment)
7. CM-01: Fix "Binding Decision" label to avoid misleading governance participants
8. QC-08: Write minimal test suite for vote deduplication and bounty state machine

**Medium-term:**
9. SEC-09/10/11: Tighten rate limiting and CORS config
10. QC-01/02: Improve gateway parsing robustness (field-name based, typed)
11. QC-03/04: Refactor db init and API handler into smaller units
12. SEC-14: Centralize ADMIN_IDS via env variable
