# API Reference

REST API for the Radix Guild governance system. Provides read-only access to proposals, badges, bounties, escrow, charter status, gamification, and XP data.

## Base URL

```
https://radixguild.com/api
```

Override via the `API_URL` environment variable. The server binds to the host/port defined by `API_HOST` (default `127.0.0.1`) and `API_PORT` (default `3003`).

## Conventions

All responses use a standard JSON envelope:

```json
{ "ok": true, "data": { ... } }
```

Error responses:

```json
{ "ok": false, "error": "error_code" }
```

Only `GET` requests are supported. `OPTIONS` requests return `200` for CORS preflight.

## Rate Limiting

- **60 requests per minute** per IP address (based on `X-Forwarded-For` or socket address).
- Exceeding the limit returns HTTP `429`:

```json
{ "ok": false, "error": "rate_limit_exceeded" }
```

The bucket resets automatically after 60 seconds of inactivity.

## CORS

Allowed origins are configured via the `CORS_ORIGINS` environment variable (comma-separated list). When no origins are configured, the API falls back to `Access-Control-Allow-Origin: *` for development.

---

## Endpoints

### GET /api/stats

Platform-wide summary statistics.

**Parameters:** None

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "total_proposals": 42,
    "total_voters": 18,
    "active_proposals": 3,
    "pending_xp_rewards": 5,
    "xp": {
      "total_awarded": 12400,
      "unique_earners": 15
    }
  }
}
```

---

### GET /api/proposals

Paginated list of proposals with vote counts.

**Query Parameters:**

| Parameter | Type   | Default | Description                                      |
|-----------|--------|---------|--------------------------------------------------|
| `status`  | string | `all`   | Filter by status. Use `active` for open proposals. Any other value returns full history. |
| `page`    | int    | `1`     | Page number (minimum 1).                         |
| `limit`   | int    | `50`    | Results per page (1--100).                       |

**Response (200):**

```json
{
  "ok": true,
  "data": [
    {
      "id": 7,
      "title": "Fund community translation bounty",
      "description": "Allocate 500 XRD to translate docs into Spanish and French.",
      "type": "standard",
      "status": "active",
      "created_by": "account_rdx1qsp5...a3k9",
      "created_at": "2026-03-15T10:30:00.000Z",
      "expires_at": "2026-03-22T10:30:00.000Z",
      "counts": { "for": 12, "against": 3, "abstain": 1 },
      "total_votes": 16
    }
  ],
  "page": 1,
  "limit": 50
}
```

---

### GET /api/proposals/:id

Full detail for a single proposal, including amendments.

**Path Parameters:**

| Parameter | Type | Description          |
|-----------|------|----------------------|
| `id`      | int  | Proposal numeric ID. |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "id": 7,
    "title": "Fund community translation bounty",
    "description": "Allocate 500 XRD to translate docs into Spanish and French.",
    "type": "standard",
    "status": "active",
    "created_by": "account_rdx1qsp5...a3k9",
    "created_at": "2026-03-15T10:30:00.000Z",
    "expires_at": "2026-03-22T10:30:00.000Z",
    "counts": { "for": 12, "against": 3, "abstain": 1 },
    "amendments": [
      {
        "id": 1,
        "proposal_id": 7,
        "text": "Include Portuguese as a third language.",
        "proposed_by": "account_rdx1qsp8...b2m4",
        "created_at": "2026-03-16T08:00:00.000Z"
      }
    ]
  }
}
```

**Error (404):**

```json
{ "ok": false, "error": "not_found" }
```

---

### GET /api/charter

Current charter parameter status, including ratification readiness.

**Parameters:** None

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "status": "draft",
    "params": {
      "quorum_percent": 20,
      "approval_threshold": 60,
      "voting_period_days": 7,
      "cooldown_hours": 24
    },
    "ready": ["quorum_percent", "approval_threshold"]
  }
}
```

---

### GET /api/bounties

All bounties and aggregate statistics.

**Parameters:** None

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "bounties": [
      {
        "id": 1,
        "title": "Build Discord integration",
        "reward_xrd": 1000,
        "status": "open",
        "created_at": "2026-03-01T12:00:00.000Z",
        "claimed_by": null
      },
      {
        "id": 2,
        "title": "Write onboarding guide",
        "reward_xrd": 250,
        "status": "completed",
        "created_at": "2026-02-20T09:00:00.000Z",
        "claimed_by": "account_rdx1qsp8...b2m4"
      }
    ],
    "stats": {
      "total": 2,
      "open": 1,
      "completed": 1,
      "total_xrd_allocated": 1250
    }
  }
}
```

---

### GET /api/escrow

Escrow balance and transaction history for bounty payouts.

**Parameters:** None

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "balance": {
      "xrd": 3500,
      "locked": 1000
    },
    "transactions": [
      {
        "id": 1,
        "type": "deposit",
        "amount_xrd": 5000,
        "timestamp": "2026-02-15T00:00:00.000Z",
        "note": "Initial escrow funding"
      },
      {
        "id": 2,
        "type": "payout",
        "amount_xrd": 250,
        "bounty_id": 2,
        "recipient": "account_rdx1qsp8...b2m4",
        "timestamp": "2026-03-10T14:00:00.000Z"
      }
    ]
  }
}
```

---

### GET /api/game/:address

Gamification state for a specific wallet address.

**Path Parameters:**

| Parameter  | Type   | Description                                          |
|------------|--------|------------------------------------------------------|
| `address`  | string | Radix account address (`account_rdx1` prefix required). |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "address": "account_rdx1qsp5...a3k9",
    "level": 4,
    "xp": 820,
    "xp_to_next": 1000,
    "streak": 7,
    "achievements": ["first_vote", "proposal_author", "week_streak"]
  }
}
```

Returns `null` for `data` if the address has no game state.

---

### GET /api/leaderboard

Top 20 players by gamification score.

**Parameters:** None

**Response (200):**

```json
{
  "ok": true,
  "data": [
    {
      "address": "account_rdx1qsp5...a3k9",
      "level": 4,
      "xp": 820,
      "streak": 7
    },
    {
      "address": "account_rdx1qsp8...b2m4",
      "level": 3,
      "xp": 540,
      "streak": 2
    }
  ]
}
```

---

### GET /api/badge/:address

Full on-ledger badge data for a wallet address. Calls the Radix Gateway API.

**Path Parameters:**

| Parameter  | Type   | Description                                          |
|------------|--------|------------------------------------------------------|
| `address`  | string | Radix account address (`account_rdx1` prefix required). |

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "address": "account_rdx1qsp5...a3k9",
    "badge_id": "#1#",
    "username": "bigdevxrd",
    "role": "builder",
    "xp": 820,
    "joined_at": "2026-01-10T00:00:00.000Z"
  }
}
```

**Error -- no badge (404):**

```json
{ "ok": false, "error": "no_badge", "address": "account_rdx1qsp5...a3k9" }
```

**Error -- gateway failure (500):**

```json
{ "ok": false, "error": "gateway_error" }
```

---

### GET /api/badge/:address/verify

Lightweight boolean check for badge ownership. Faster than the full badge endpoint.

**Path Parameters:**

| Parameter  | Type   | Description                                          |
|------------|--------|------------------------------------------------------|
| `address`  | string | Radix account address (`account_rdx1` prefix required). |

**Response (200):**

```json
{ "ok": true, "hasBadge": true, "address": "account_rdx1qsp5...a3k9" }
```

```json
{ "ok": true, "hasBadge": false, "address": "account_rdx1qsp9...c7n2" }
```

**Error -- gateway failure (500):**

```json
{ "ok": false, "error": "gateway_error" }
```

---

### GET /api/xp-queue

Pending XP reward queue awaiting on-ledger settlement.

**Parameters:** None

**Response (200):**

```json
{
  "ok": true,
  "data": [
    {
      "address": "account_rdx1qsp5...a3k9",
      "amount": 50,
      "reason": "proposal_vote",
      "queued_at": "2026-03-20T11:00:00.000Z"
    },
    {
      "address": "account_rdx1qsp8...b2m4",
      "amount": 100,
      "reason": "bounty_completed",
      "queued_at": "2026-03-20T12:30:00.000Z"
    }
  ]
}
```

Returns an empty array when no rewards are pending.

---

## Error Reference

| HTTP Code | `error` value          | Description                              |
|-----------|------------------------|------------------------------------------|
| 404       | `not_found`            | Endpoint or resource does not exist.     |
| 404       | `no_badge`             | Address has no guild badge on-ledger.    |
| 429       | `rate_limit_exceeded`  | Too many requests. Wait and retry.       |
| 500       | `gateway_error`        | Radix Gateway API call failed.           |
