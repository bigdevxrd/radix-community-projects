# API-REFERENCE.md — Radix Community Bot API

Base URL: `http://localhost:3003` (or your deployed URL)

All responses are JSON with `{"ok": true, "data": ...}` on success and `{"ok": false, "error": "..."}` on failure.

**Rate limit:** 60 requests per IP per minute. Exceeding returns HTTP 429.

---

## Endpoints

### GET /api/stats

Overview of system activity.

```bash
curl https://156-67-219-105.sslip.io/api/stats
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "total_proposals": 12,
    "total_voters": 5,
    "active_proposals": 3,
    "pending_xp_rewards": 7
  }
}
```

---

### GET /api/proposals

Paginated proposal list with vote counts.

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `status` | `all` | `active` for open proposals only; `all` for full history |
| `page` | `1` | Page number |
| `limit` | `50` | Max 100 |

```bash
# All proposals
curl "https://156-67-219-105.sslip.io/api/proposals"

# Active only
curl "https://156-67-219-105.sslip.io/api/proposals?status=active"
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "title": "Adopt the Charter?",
      "type": "yesno",
      "status": "active",
      "options": null,
      "creator_tg_id": 123456,
      "created_at": 1710000000,
      "ends_at": 1710259200,
      "min_votes": 3,
      "round": 1,
      "charter_param": "adopt_charter",
      "counts": { "yes": 4, "no": 1 },
      "total_votes": 5
    }
  ],
  "page": 1,
  "limit": 50
}
```

---

### GET /api/proposals/:id

Single proposal with vote counts and amendments.

```bash
curl https://156-67-219-105.sslip.io/api/proposals/1
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "title": "Adopt the Charter?",
    "type": "yesno",
    "status": "active",
    "counts": { "yes": 4, "no": 1 },
    "amendments": []
  }
}
```

**Errors:**
- `404` + `{"ok":false,"error":"not_found"}` — proposal ID doesn't exist

---

### GET /api/leaderboard

Top 20 players ranked by bonus XP.

```bash
curl https://156-67-219-105.sslip.io/api/leaderboard
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "radix_address": "account_rdx1abc...",
      "total_rolls": 42,
      "total_bonus_xp": 875,
      "streak_days": 5,
      "last_roll_date": "2026-04-05",
      "last_roll_value": 6,
      "jackpots": 3
    }
  ]
}
```

---

### GET /api/game/:address

Game stats for a specific Radix address.

```bash
curl https://156-67-219-105.sslip.io/api/game/account_rdx1abc...
```

**Response (player exists):**
```json
{
  "ok": true,
  "data": {
    "radix_address": "account_rdx1abc...",
    "total_rolls": 42,
    "total_bonus_xp": 875,
    "streak_days": 5,
    "last_roll_date": "2026-04-05",
    "last_roll_value": 6,
    "jackpots": 3
  }
}
```

**Response (no data yet):**
```json
{
  "ok": true,
  "data": {
    "total_rolls": 0,
    "total_bonus_xp": 0,
    "streak_days": 0,
    "last_roll_value": 0,
    "jackpots": 0
  }
}
```

**Address format:** Must match `account_rdx1[a-z0-9]+`
**Errors:** Returns 404 if address format doesn't match the pattern.

---

### GET /api/charter

Charter parameter status and resolution progress.

```bash
curl https://156-67-219-105.sslip.io/api/charter
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "status": {
      "total": 32,
      "resolved": 6,
      "voting": 3,
      "tbd": 23
    },
    "params": [
      {
        "param_key": "adopt_charter",
        "title": "Adopt the DAO Charter?",
        "status": "resolved",
        "param_value": "yes",
        "category": "foundation",
        "phase": 1
      }
    ],
    "ready": [
      {
        "param_key": "rac_seats",
        "title": "How many RAC seats?"
      }
    ]
  }
}
```

---

### GET /api/bounties

All bounties with aggregate stats.

```bash
curl https://156-67-219-105.sslip.io/api/bounties
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "bounties": [
      {
        "id": 1,
        "title": "Build leaderboard page",
        "description": "...",
        "reward_xrd": 50.0,
        "reward_xp": 200,
        "status": "open",
        "creator_tg_id": 123456,
        "assignee_tg_id": null,
        "assignee_address": null,
        "github_issue": "https://github.com/...",
        "github_pr": null,
        "created_at": 1710000000
      }
    ],
    "stats": {
      "open": 2,
      "assigned": 1,
      "submitted": 0,
      "verified": 0,
      "paid": 3,
      "totalPaid": 150.0,
      "escrow": {
        "funded": 500.0,
        "released": 150.0,
        "available": 350.0
      }
    }
  }
}
```

---

### GET /api/escrow

Escrow wallet balance and transaction history.

```bash
curl https://156-67-219-105.sslip.io/api/escrow
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "balance": {
      "funded": 500.0,
      "released": 150.0,
      "available": 350.0
    },
    "transactions": [
      {
        "id": 1,
        "bounty_id": 1,
        "type": "fund",
        "amount": 500.0,
        "tx_hash": "txid_...",
        "created_at": 1710000000
      }
    ]
  }
}
```

---

### GET /api/badge/:address

Full badge metadata for a Radix address (fetched live from the Radix Gateway).

```bash
curl https://156-67-219-105.sslip.io/api/badge/account_rdx1abc...
```

**Response (badge found):**
```json
{
  "ok": true,
  "data": {
    "address": "account_rdx1abc...",
    "tier": "contributor",
    "xp": 250,
    "level": 2,
    "nft_id": "#1#"
  }
}
```

**Errors:**
- `404` + `{"ok":false,"error":"no_badge"}` — address exists but holds no badge
- `500` + `{"ok":false,"error":"gateway_error"}` — Radix Gateway unreachable

---

### GET /api/badge/:address/verify

Quick boolean check — does this address hold a badge?

```bash
curl https://156-67-219-105.sslip.io/api/badge/account_rdx1abc.../verify
```

**Response:**
```json
{ "ok": true, "hasBadge": true, "address": "account_rdx1abc..." }
```

---

### GET /api/xp-queue

Pending XP reward queue (rewards waiting to be signed and submitted on-chain).

```bash
curl https://156-67-219-105.sslip.io/api/xp-queue
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "address": "account_rdx1abc...",
      "xp": 50,
      "reason": "voted on proposal #3"
    }
  ]
}
```

---

## Error Codes

| HTTP Status | `error` value | Meaning |
|-------------|--------------|---------|
| 404 | `not_found` | Resource doesn't exist |
| 404 | `no_badge` | Address has no badge NFT |
| 429 | `rate_limit_exceeded` | >60 req/min from this IP |
| 500 | `gateway_error` | Radix Gateway API failed |

---

## Rate Limits

- **60 requests per IP per minute**
- Window resets every 60 seconds
- No authentication required for read endpoints
- Admin endpoints (if any) require `ADMIN_API_KEY` header

---

## CORS

- In production: set `CORS_ORIGINS=https://yourdomain.com` in `bot/.env`
- In development: all origins are allowed (`*`)
- Only `GET` and `OPTIONS` are supported

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| All endpoints return 404 | API not running | Start bot: `node bot/index.js` |
| CORS error in browser | Origin not whitelisted | Add dashboard URL to `CORS_ORIGINS` |
| `/api/badge/*` returns 500 | Gateway down | Retry after 1-2 min; gateway is external |
| `/api/leaderboard` returns empty `[]` | No rolls yet | Use `/roll` in Telegram bot |
| Slow response on `/api/proposals` | Large DB with no index | Indexes are created automatically on `db.init()` |
