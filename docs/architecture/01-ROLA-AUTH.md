# 01 — ROLA Integration (Cryptographic Wallet Auth)

> Prerequisite for all dashboard write operations
> Effort: 1-2 sessions | Impact: High

## Summary

Replace "connect and trust" with cryptographic proof of wallet ownership. Backend verifies signed challenges against on-chain `owner_keys` via `@radixdlt/rola`.

## Current Vulnerability

Any client can POST to `/api/groups/1/join` with someone else's address. Game board endpoints embed the address in the URL path with no ownership verification. All POST endpoints trust the `address` field in the request body.

## Architecture

```
Browser                     API Server                  Radix Gateway
  |                              |                           |
  |--POST /api/auth/challenge-->|                           |
  |<--{challenge, expiresAt}----|                           |
  |                              |                           |
  |--wallet signs challenge      |                           |
  |<--{signedChallenge}          |                           |
  |                              |                           |
  |--POST /api/auth/verify----->|--@radixdlt/rola verify-->|
  |                              |<--owner_keys verified-----|
  |                              |--sign JWT (jose, HS256)   |
  |<--Set-Cookie: HttpOnly JWT---|                           |
```

## New Dependencies

- `@radixdlt/rola` — official ROLA verification
- `jose` — lightweight JWT (zero native deps)

## New Files

### `bot/services/auth.js`
- `generateChallenge(origin)` → 32-byte hex, 5-min TTL, stored in-memory Map
- `verifyAndCreateSession(signedChallenge, origin)` → verify via ROLA, fetch badge + trust, sign JWT
- `extractSession(req)` → verify JWT from cookie or Authorization header
- `refreshSession(token)` → re-fetch badge/trust data, issue new JWT

### `guild-app/src/lib/api.ts`
- `authFetch(path, options)` → fetch wrapper with `credentials: 'include'`

## New Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/challenge` | None | Generate ROLA challenge (5/min rate limit) |
| POST | `/api/auth/verify` | None | Verify signed challenge, issue JWT cookie |
| POST | `/api/auth/refresh` | Cookie | Refresh session with fresh badge/trust data |
| POST | `/api/auth/logout` | Cookie | Clear session cookie |

## JWT Claims

```
{
  sub: "account_rdx1...",     // verified wallet address
  badge_tier: "member",       // from on-chain badge
  trust_tier: "silver",       // from trust score system
  tg_id: 6102618406,          // linked TG ID (if any)
  iat: 1234567890,
  exp: 1234571490              // 1 hour
}
```

## Cookie Security

- `HttpOnly` — not readable by JavaScript
- `Secure` — HTTPS only
- `SameSite=Strict` — no cross-origin
- `Path=/api` — only sent to API endpoints
- `Max-Age=3600` — matches JWT expiry

## Frontend Changes (useWallet.tsx)

New state: `authenticated`, `session`, `login()`, `logout()`

Login flow:
1. Fetch challenge from `/api/auth/challenge`
2. `rdt.walletApi.sendOneTimeRequest(accounts().atLeast(1), config({ challenge }))`
3. POST signed challenge to `/api/auth/verify`
4. Cookie set automatically, session stored in React state

Wallet connection and ROLA session are INDEPENDENT. Connect = browse. Verify = authenticate.

## Protected Endpoints (Phase 1)

Game board, group join/leave, feedback, bounty creation — all require `extractSession(req)` check. Return 401 if no session, 403 if address mismatch.

All GET endpoints remain unauthenticated.

## Trust Score Bridge

New `address_links` table maps wallet address → tg_id. Auto-populated from existing `users` table. JWT carries trust tier so every authenticated request knows the user's trust level without extra DB lookups.

## Rollback

Set `ROLA_REQUIRED=false` env var → skips signature verification, issues JWT from wallet address alone. Degrades to current trust model but keeps session infrastructure.

## Implementation Order

1. `bot/services/auth.js` — challenge + JWT (unit testable)
2. `bot/services/api.js` — 4 auth endpoints + CORS update
3. `bot/db.js` — address_links migration
4. `guild-app/src/lib/api.ts` — auth fetch wrapper
5. `guild-app/src/hooks/useWallet.tsx` — login/logout/session
6. UI — Verify button, protected action gates
7. Protect POST endpoints — extractSession checks

## Environment Variables

- `JWT_SECRET` — required, min 32 bytes (fatal if missing)
- `SESSION_TTL_SEC` — default 3600
- `CHALLENGE_TTL_SEC` — default 300
