# Outcome Recorder — Setup Guide

The **outcome-batch-recorder** script reads finalized proposal outcomes from the bot API and writes them permanently to on-chain badge metadata using the `update_extra_data()` method on the deployed `BadgeManager` component.

## Why This Matters

- **Permanent**: Governance history survives database failures — stored on Radix mainnet.
- **Verifiable**: Anyone can query the badge NFT and see all proposal outcomes.
- **Trustless**: Radix blockchain is the source of truth, not just a database.
- **Audit Trail**: Every recorded outcome has a transaction hash stored for reference.

## Architecture

```
Proposal closes (bot)
        │
        ▼
Bot DB: status = passed/failed/...
        │
        ▼
outcome-batch-recorder.js polls /api/outcomes-queue
        │
        ▼
Builds manifest → calls update_extra_data() on BadgeManager
        │
        ▼
Signs with admin badge via VPS signer
        │
        ▼
Submits TX to Radix mainnet
        │
        ▼
Marks recorded via POST /api/outcomes-queue/:id/mark-recorded
        │
        ▼
Bot DB: recorded_on_chain = true, on_chain_tx = <txid>
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `RADIX_ACCOUNT_ADDRESS` | ✅ | The signer account address (must hold admin badge) |
| `BOT_API_URL` | ✅ | URL of the bot API server (default: `http://localhost:3003`) |
| `SIGNER_ENV` | optional | Path to `.env` file for the signer (default: `/opt/guild/signer/.env`) |
| `SIGNER_MODULE` | optional | Path to the signer module (default: `/opt/guild/signer/src/radix/signer`) |
| `GOVERNANCE_BADGE_NFT_ID` | optional | NFT ID of the badge to write outcome data to. If unset, the script looks up the first Guild badge held by the signer account. |

## Running the Recorder

### Manual run

```bash
export RADIX_ACCOUNT_ADDRESS=account_rdx1...
export BOT_API_URL=http://localhost:3003
export SIGNER_ENV=/opt/guild/signer/.env
export SIGNER_MODULE=/opt/guild/signer/src/radix/signer

node scripts/outcome-batch-recorder.js
```

### Cron (recommended)

Run every 10 minutes to catch outcomes shortly after proposals close:

```cron
*/10 * * * * cd /opt/guild && node scripts/outcome-batch-recorder.js >> /var/log/guild-outcomes.log 2>&1
```

### PM2

```bash
pm2 start scripts/outcome-batch-recorder.js --name guild-outcome-recorder --cron "*/10 * * * *"
pm2 save
```

## How Outcomes Are Stored in Badge Extra Data

Outcomes are stored as JSON in the `extra_data` field of the governance badge NFT. The JSON structure is:

```json
{
  "proposal_id": 5,
  "winner": "for",
  "result": "passed",
  "total_votes": 14,
  "timestamp": 1712345678
}
```

| Field | Description |
|---|---|
| `proposal_id` | ID of the proposal in the bot database |
| `winner` | The vote option that received the most votes (e.g. `"for"`, `"against"`, `"option_a"`) |
| `result` | Final proposal status: `passed`, `failed`, `needs_amendment`, or `completed` |
| `total_votes` | Total number of votes cast |
| `timestamp` | Unix timestamp when the outcome was recorded on-chain |

## API Endpoints

### `GET /api/outcomes-queue`

Returns all closed proposals that have not yet been recorded on-chain.

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 5,
      "title": "Deploy Guild on mainnet",
      "status": "passed",
      "ends_at": 1712300000,
      "counts": { "for": 12, "against": 2 },
      "outcome_data": {
        "winner": "for",
        "result": "passed",
        "total_votes": 14
      }
    }
  ]
}
```

### `POST /api/outcomes-queue/:id/mark-recorded`

Marks a proposal's outcome as recorded on-chain. Called automatically by the recorder script after a successful transaction.

**Request body:**
```json
{
  "tx_hash": "txid_rdx1...",
  "outcome_data": {
    "winner": "for",
    "result": "passed",
    "total_votes": 14
  }
}
```

**Response:**
```json
{
  "ok": true,
  "id": 5,
  "tx_hash": "txid_rdx1..."
}
```

## Database Schema Changes

Three columns are added to the `proposals` table (via safe migration):

| Column | Type | Description |
|---|---|---|
| `recorded_on_chain` | INTEGER (boolean) | `1` if outcome has been written to chain |
| `on_chain_tx` | TEXT | Transaction hash of the recording TX |
| `on_chain_outcome_json` | TEXT | JSON outcome data written on-chain |

## How the Dashboard Reads Historical Proposals

The `updateOutcomeManifest()` function in `guild-app/src/lib/manifests.ts` builds a complete Scrypto transaction manifest that writes an `OutcomeData` object to a badge's `extra_data` field. Dashboard components can read and display this data by querying badge NFT state from the Radix Gateway API.

Example outcome data structure used by the manifest builder:

```typescript
const outcome: OutcomeData = {
  proposal_id: 5,
  winner: "for",
  result: "passed",
  total_votes: 14,
  timestamp: Math.floor(Date.now() / 1000),
};
```

## Troubleshooting

### "No governance badge NFT found for account"

The signer account does not hold a Guild badge NFT. Either:
1. Transfer the admin badge to the signer account, or
2. Set `GOVERNANCE_BADGE_NFT_ID` explicitly to the target badge NFT ID.

### "Error fetching outcomes queue: 404"

The bot API is not running or `BOT_API_URL` is wrong. Start the bot or verify the URL.

### TX fails with "insufficient funds"

The signer account needs XRD to pay the 10 XRD lock fee. Top it up from the Radix Dashboard.

### TX fails with "authorization failed"

The signer account does not hold the admin badge required to call `update_extra_data()`. Transfer the admin badge to the signer account.

### Outcome recorded but not showing on dashboard

Check that the badge NFT ID used matches the badge being displayed in the dashboard. If using `GOVERNANCE_BADGE_NFT_ID`, ensure it points to the correct NFT.
