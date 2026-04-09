# API Reference

REST API for the Radix Guild governance system. 34 endpoints covering proposals, badges, bounties, escrow, charter, gamification, trust scores, working groups, feedback, and CV2 on-chain governance.

## Base URL

```
https://radixguild.com/api
```

Override via `API_HOST` (default `127.0.0.1`) and `API_PORT` (default `3003`).

## Conventions

All responses use a standard JSON envelope:

```json
{ "ok": true, "data": { ... } }
```

Error responses:

```json
{ "ok": false, "error": "error_code" }
```

Supports GET and POST (POST only on specific endpoints — game, feedback, bounties, groups).

## Rate Limiting

- **60 requests/minute** per IP for GET requests
- **10 requests/minute** per IP for POST requests (game board)
- Exceeding returns HTTP `429`: `{ "ok": false, "error": "rate_limit_exceeded" }`
- Bucket resets after 60 seconds of inactivity

## CORS

Configured via `CORS_ORIGINS` env var (comma-separated). Falls back to `Access-Control-Allow-Origin: *` when unconfigured.

---

## System

### GET /api/health

System health check. Returns uptime, DB status, CV2 sync state, memory, and version.

### GET /api/stats

Platform-wide summary: total proposals, active proposals, unique voters, pending XP rewards, XP stats.

---

## Proposals

### GET /api/proposals

Paginated list with vote counts.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `all` | `active` for open proposals |
| `page` | int | `1` | Page number |
| `limit` | int | `50` | Results per page (1-100) |

### GET /api/proposals/:id

Single proposal detail with vote counts and amendments.

---

## Charter

### GET /api/charter

Charter parameter status: resolved count, voting count, pending count, ready-to-vote parameters.

---

## Bounties

### GET /api/bounties

All bounties with aggregate stats (open, assigned, submitted, verified, paid, escrow balance). Supports filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `status` | string | Filter by status |
| `difficulty` | string | Filter by difficulty |
| `sort` | string | Sort order |

### POST /api/bounties

Create a task from the dashboard. Content-filtered.

| Body Field | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Task title (max 500 chars) |
| `reward_xrd` | number | Yes | XRD reward amount |
| `description` | string | No | Task description |
| `category` | string | No | Category (default: general) |
| `difficulty` | string | No | Difficulty (default: medium) |
| `deadline_days` | number | No | Days until deadline |

### GET /api/bounties/:id

Single bounty detail with milestones and applications.

### GET /api/bounties/categories

List of 6 task categories with counts.

### GET /api/bounties/config

Platform configuration (fee percentage, escrow settings).

### GET /api/escrow

Escrow balance and transaction history.

---

## Working Groups

### GET /api/groups

All working groups with member counts.

### GET /api/groups/:id

Group detail: description, lead, members list, linked bounties, linked proposals.

### POST /api/groups/:id/join

Join a group from the dashboard.

| Body Field | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Radix wallet address |

### POST /api/groups/:id/leave

Leave a group from the dashboard.

| Body Field | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Radix wallet address |

---

## Badges

### GET /api/badge/:address

Full on-ledger badge data. Calls the Radix Gateway API. Returns username, tier, XP, level, status.

**Errors:** `no_badge` (404), `gateway_error` (500)

### GET /api/badge/:address/verify

Lightweight boolean badge check. Returns `{ hasBadge: true/false }`.

---

## Game

### GET /api/game/:address

Game state: total rolls, bonus XP, streak, jackpots, last roll, available rolls.

### GET /api/game/:address/achievements

Achievement summary for an address.

### GET /api/game/:address/board

Current grid board state + available rolls + board stats.

### POST /api/game/:address/board/new

Start a new grid board.

### POST /api/game/:address/board/roll

Spend a roll on the current board.

### POST /api/game/:address/board/wild

Use a wild card on a specific cell.

| Body Field | Type | Required | Description |
|-----------|------|----------|-------------|
| `row` | number | Yes | Row index |
| `col` | number | Yes | Column index |

### GET /api/leaderboard

Top 20 players by bonus XP from dice rolls.

---

## Feedback

### POST /api/feedback

Create a support ticket from the dashboard.

| Body Field | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | Ticket message (max 1000 chars) |
| `username` | string | No | Username (default: web-user) |
| `category` | string | No | Category (default: general) |
| `address` | string | No | Radix wallet address |

### GET /api/feedback

List tickets. Supports filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `open` for open tickets only |
| `address` | string | Filter by wallet address |

### GET /api/feedback/stats

Ticket counts by status.

---

## CV2 (On-Chain Governance)

### GET /api/cv2/status

CV2 sync health: enabled state, last sync time, error count.

### GET /api/cv2/stats

CV2 summary counts.

### GET /api/cv2/proposals

List all synced on-chain proposals.

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `temperature_check` or `proposal` |

### GET /api/cv2/proposals/:id

Single on-chain proposal detail.

---

## Trust

### GET /api/trust/:tg_id

Trust score and tier for a user. Returns score, tier (bronze/silver/gold), and full breakdown of contributing factors.

---

## XP

### GET /api/xp-queue

Pending XP rewards awaiting on-ledger settlement.

---

## Error Reference

| HTTP Code | `error` value | Description |
|-----------|---------------|-------------|
| 400 | `title and reward_xrd required` | Missing bounty fields |
| 400 | `content_not_allowed` | Content filter blocked |
| 400 | `address_required` | Missing address for group join/leave |
| 400 | `message_required` | Missing feedback message |
| 400 | `invalid_body` | Malformed POST body |
| 404 | `not_found` | Endpoint or resource doesn't exist |
| 404 | `no_badge` | Address has no guild badge |
| 405 | `method_not_allowed` | Wrong HTTP method |
| 414 | `uri_too_long` | URL exceeds 512 characters |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `gateway_error` | Radix Gateway API failure |
