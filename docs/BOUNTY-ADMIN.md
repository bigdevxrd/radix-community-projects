# Bounty Admin Guide

How to create and manage bounties for the Radix Guild.

## Setup

Set your admin address in the bot's `.env` file:

```
ADMIN_ADDRESSES=account_rdx1your_address_here,account_rdx1another_admin
BOUNTY_NOTIFY_CHAT_ID=-1001234567890
```

`BOUNTY_NOTIFY_CHAT_ID` is the Telegram chat/channel ID that receives daily bounty summary notifications.

## Lifecycle Overview

```
createBounty() → status: 'draft'
     ↓ (manually set to open or use future CrumbsUp integration)
status: 'open'   ← community can now claim
     ↓ claimBounty()
status: 'claimed'
     ↓ submitBountyWork()
status: 'submitted'
     ↓ approveBountyPayment()
status: 'approved'
     ↓ markBountyPaid()
status: 'paid'
```

## Creating a Bounty (API)

```bash
curl -X POST https://guild.example.com/api/bounties \
  -H "Content-Type: application/json" \
  -d '{
    "address": "account_rdx1your_admin_address",
    "title": "Write a tutorial",
    "description": "Teach the Guild architecture to new members",
    "category": "tutorial",
    "reward_xrd": 50,
    "days_active": 14
  }'
```

Response:
```json
{ "ok": true, "id": 1, "status": "draft", "created_at": 1712345678 }
```

**Note:** New bounties start in `draft` status. You must manually update them to `open` via direct DB or a future admin UI. Phase 2 will integrate CrumbsUp for auto-publishing.

## Updating Bounty Status to Open

Via SQLite directly:
```sql
UPDATE bounties SET status = 'open' WHERE id = 1;
```

## Reviewing Submissions

Check bounties awaiting payment:

```bash
curl "https://guild.example.com/api/bounties/pending-payment?address=account_rdx1your_admin_address"
```

Response:
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "title": "Write a tutorial",
      "claimed_by": "account_rdx1claimer...",
      "reward_xrd": 50,
      "approved_at": null,
      "crumbsup_id": null
    }
  ]
}
```

## Approving a Submission

Use the DB functions directly (admin script or future UI):

```javascript
const db = require("./bot/db");
db.init();

// Approve bounty #1
db.approveBountyPayment(1, "optional-crumbsup-id");
```

## Marking a Bounty as Paid

After the XRD transaction is signed and broadcast:

```javascript
db.markBountyPaid(1, "txid_abc123...");
```

## Bounty Categories

Suggested categories (free text field):

| Category | Examples |
|----------|---------|
| `tutorial` | Guides, how-tos, explainers |
| `design` | Banners, icons, UI mockups |
| `development` | Code, scripts, integrations |
| `content` | Blog posts, social media |
| `research` | Analysis, reports |
| `community` | Events, outreach |
| `general` | Anything else |

## Daily Notifications

The bot automatically sends a daily summary at 09:00 UTC to `BOUNTY_NOTIFY_CHAT_ID` if:
- There are open bounties, OR
- There are bounties pending payment approval

## Escrow Wallet

Funds are held in an escrow wallet before distribution. See [BOUNTY-ESCROW.md](BOUNTY-ESCROW.md) for the security model.

## Database Audit Trail

Every status change is logged in `bounty_transactions`:

```sql
SELECT * FROM bounty_transactions WHERE bounty_id = 1 ORDER BY created_at;
```

| action | meaning |
|--------|---------|
| `created` | Bounty was created |
| `claimed` | Community member claimed it |
| `submitted` | Work was submitted |
| `approved` | Admin approved the work |
| `paid` | XRD payment sent |
