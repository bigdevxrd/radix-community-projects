# Bounty API Reference

Base URL: `https://guild.example.com`

All responses use JSON. Authentication uses Radix wallet addresses verified against the blockchain (for claiming) or the `ADMIN_ADDRESSES` env var (for admin operations).

---

## GET /api/bounties

List bounties. Defaults to active (non-expired) bounties.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `draft`, `open`, `claimed`, `submitted`, `approved`, `paid`. Omit for all active (non-expired). |
| `category` | string | Filter by category (e.g. `tutorial`, `design`) |
| `limit` | number | Max results (1–100, default 50) |
| `page` | number | Page number (default 1) |

**Example:**
```bash
curl "https://guild.example.com/api/bounties?status=open&category=tutorial&limit=10"
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "title": "Write a tutorial",
      "description": "Teach the Guild architecture to new members",
      "category": "tutorial",
      "reward_xrd": 50,
      "creator_address": "account_rdx1...",
      "status": "open",
      "claimed_by": null,
      "claimed_at": null,
      "expires_at": 1713456789,
      "created_at": 1712345678
    }
  ],
  "page": 1,
  "limit": 10
}
```

---

## GET /api/bounties/:id

Get a single bounty by ID.

**Example:**
```bash
curl "https://guild.example.com/api/bounties/1"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "title": "Write a tutorial",
    "description": "...",
    "category": "tutorial",
    "reward_xrd": 50,
    "status": "open",
    "expires_at": 1713456789,
    "created_at": 1712345678
  }
}
```

---

## POST /api/bounties

Create a new bounty. **Admin only.**

**Body:**
```json
{
  "address": "account_rdx1your_admin_address",
  "title": "Write a tutorial",
  "description": "Optional longer description",
  "category": "tutorial",
  "reward_xrd": 50,
  "days_active": 14
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | ✅ | Admin wallet address (must be in `ADMIN_ADDRESSES`) |
| `title` | string | ✅ | Short bounty title |
| `description` | string | — | Detailed description |
| `category` | string | — | Category tag (default: `general`) |
| `reward_xrd` | number | ✅ | Reward amount in XRD (must be > 0) |
| `days_active` | number | — | Days until expiry (default: 7) |

**Response (201):**
```json
{ "ok": true, "id": 1, "status": "draft", "created_at": 1712345678 }
```

**Errors:**
- `403` — `admin_required`: address not in admin list
- `400` — `title_required`: title missing or empty
- `400` — `reward_xrd_must_be_positive_number`: invalid reward

---

## POST /api/bounties/:id/claim

Claim a bounty. Requires a Guild badge.

**Body:**
```json
{ "address": "account_rdx1claimer_address" }
```

**Response (200):**
```json
{
  "ok": true,
  "bounty_id": 1,
  "claimed_by": "account_rdx1...",
  "crumbsup_claim_url": "https://crumbsup.io/..."
}
```

**Errors:**
- `400` — `address_required`
- `400` — `not_open`: bounty is not in `open` status
- `400` — `expired`: bounty deadline passed
- `400` — `cannot_claim_own_bounty`: creator cannot claim their own bounty
- `403` — `guild_badge_required`: no Guild badge found for this address
- `404` — `not_found`

---

## POST /api/bounties/:id/submit

Submit work for a claimed bounty.

**Body:**
```json
{
  "address": "account_rdx1claimer_address",
  "submission_notes": "Optional notes about the submission"
}
```

**Response (200):**
```json
{ "ok": true, "bounty_id": 1, "status": "submitted" }
```

**Errors:**
- `400` — `address_required`
- `400` — `not_claimed`: bounty is not in `claimed` status
- `400` — `not_claimer`: address doesn't match the claimer
- `404` — `not_found`

---

## GET /api/bounties/pending-payment

List bounties approved and awaiting payment. **Admin only.**

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `address` | ✅ | Admin wallet address |

**Example:**
```bash
curl "https://guild.example.com/api/bounties/pending-payment?address=account_rdx1admin"
```

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "title": "Write a tutorial",
      "claimed_by": "account_rdx1...",
      "reward_xrd": 50,
      "approved_at": 1712400000,
      "crumbsup_id": null
    }
  ]
}
```

**Errors:**
- `403` — `admin_required`
