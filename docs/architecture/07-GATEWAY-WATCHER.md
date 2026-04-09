I now have a thorough understanding of the codebase. Here is the full design specification.

---

## Gateway Event Watcher -- Design Specification

### 1. Architectural Overview

The watcher follows the same structural patterns already established in the codebase:

- **State persistence**: A singleton row in SQLite, identical to `cv2_sync_state` (line 71 of consultation.js) and `escrow_wallet` (line 106 of db.js).
- **Polling via setInterval**: Same pattern as `checkExpiredProposals` (5-min interval at index.js line 1613) and the bounty deadline checker (hourly at line 1622).
- **Notification dispatch**: Reuses the existing `notifyDiscord(content)` function (index.js line 42) and `bot.api.sendMessage(chatId, text)` for Telegram.
- **Gateway calls**: Follows the `fetch` + POST pattern in gateway.js (e.g., lines 17-27, 74-82).

The key Gateway API endpoint is `POST /stream/transactions`. It accepts `affected_global_entities_filter` to narrow results to only transactions touching the escrow component, and returns a `ledger_state.state_version` that acts as a cursor for incremental polling.

### 2. New SQLite Table: `escrow_watcher_state`

Added in db.js `init()`, right after the existing bounty migration block (around line 155).

**Schema:**

```
escrow_watcher_state
  id INTEGER PRIMARY KEY CHECK (id = 1)       -- singleton
  last_state_version INTEGER DEFAULT 0         -- cursor for /stream/transactions
  last_poll_at INTEGER                         -- unix epoch of last successful poll
  total_events_processed INTEGER DEFAULT 0     -- running count
  errors INTEGER DEFAULT 0                     -- cumulative error count
  last_error TEXT                               -- most recent error message
  last_error_at INTEGER                        -- when last error occurred
```

Seeded with `INSERT OR IGNORE INTO escrow_watcher_state (id) VALUES (1)` (same pattern as escrow_wallet at db.js line 133).

**New table for deduplication:**

```
escrow_processed_txs
  tx_hash TEXT PRIMARY KEY                     -- intent_hash_hex
  state_version INTEGER NOT NULL               -- ledger state version
  event_name TEXT NOT NULL                      -- TaskCreatedEvent, etc.
  processed_at INTEGER DEFAULT (strftime('%s','now'))
```

Index: `CREATE INDEX idx_escrow_tx_version ON escrow_processed_txs(state_version)`.

### 3. New DB Functions (added to db.js exports)

**getWatcherState()** -- Returns the singleton row from `escrow_watcher_state`. Used by the watcher on startup and after each poll cycle.

**updateWatcherState(stateVersion, eventCount)** -- Updates `last_state_version`, `last_poll_at = now`, increments `total_events_processed` by eventCount. Uses a single prepared statement.

**recordWatcherError(message)** -- Increments `errors`, sets `last_error` and `last_error_at`. Mirrors the `cv2_sync_state` error tracking pattern (consultation.js line 104).

**isTransactionProcessed(txHash)** -- Checks `escrow_processed_txs` for the given hash. Returns boolean.

**markTransactionProcessed(txHash, stateVersion, eventName)** -- Inserts into `escrow_processed_txs`. Uses `INSERT OR IGNORE` to be idempotent.

**fundTaskFromWatcher(bountyId, txHash, amount, onchainTaskId)** -- A variant of the existing `fundTask` (db.js line 627) that additionally sets `escrow_verified = 1`, `onchain_task_id`, and records the audit-trail transaction row with `verified_onchain = 1`. This avoids the watcher needing raw `db.prepare()` access (which currently only works because index.js accesses the db object directly at line 825).

**cleanOldProcessedTxs(beforeStateVersion)** -- Purges `escrow_processed_txs` rows older than a given state version. Prevents the dedup table from growing unbounded. Called periodically (e.g., prune anything more than 100,000 state versions behind current).

### 4. Watcher Service: `bot/services/escrow-watcher.js`

**Module shape:**

```
init(database, options)    -- receives the db instance + callbacks
startPolling()             -- begins the setInterval loop
stopPolling()              -- clears interval (for graceful shutdown)
pollOnce()                 -- single poll cycle (exported for testing)
getStatus()                -- returns watcher health for /api/health
```

The `options` parameter carries notification callbacks so the watcher stays decoupled from bot/Discord specifics:

```
{
  onTaskCreated: async (event) => {},
  onTaskClaimed: async (event) => {},
  onTaskReleased: async (event) => {},
  onTaskCancelled: async (event) => {},
  escrowComponent: string,    // from env or default
  pollIntervalMs: number,     // default 60000
  maxRetries: number,         // default 3
}
```

#### 4.1 `init(database, options)`

- Stores `db` reference and options.
- Runs the migration (CREATE TABLE IF NOT EXISTS for both new tables).
- Reads `getWatcherState()` to recover `last_state_version`.
- If `last_state_version === 0`, performs an initial "catch-up" by fetching the current ledger state version from `/status/gateway-status` and storing it. This avoids replaying the entire ledger history on first deploy -- the watcher starts watching from "now." If the operator wants to backfill, they can manually set `last_state_version` to an earlier value.
- Logs `[EscrowWatcher] Initialized. Resuming from state_version=<N>`.

#### 4.2 `pollOnce()`

This is the core function. Steps:

**Step 1: Call Gateway API**

```
POST /stream/transactions
{
  "from_state_version": last_state_version + 1,
  "limit_per_page": 100,
  "affected_global_entities_filter": [ESCROW_COMPONENT],
  "opt_ins": {
    "receipt_events": true,
    "affected_global_entities": true
  },
  "order": "asc"
}
```

The `from_state_version` field ensures we only get transactions newer than what we have already processed. The `order: "asc"` guarantees chronological processing, which matters for state consistency.

**Step 2: Iterate transactions**

For each transaction in the response:

1. Extract `intent_hash_hex` from the transaction object.
2. Check `isTransactionProcessed(txHash)` -- skip if true (dedup).
3. Check `transaction_status === "CommittedSuccess"` -- skip failed TXs.
4. Extract events from `receipt.events[]`.
5. For each event where `emitter.entity.entity_address === ESCROW_COMPONENT`:
   - Parse based on `event.name` (see Section 4.3).
   - Call the appropriate handler.
   - Call `markTransactionProcessed(txHash, stateVersion, eventName)`.
6. If no matching events found but the component was affected, log at debug level and still mark processed.

**Step 3: Update cursor**

After processing all transactions in the page, update `last_state_version` to the `ledger_state.state_version` from the response (this is the highest state version in the result set). Call `updateWatcherState(newStateVersion, eventsProcessed)`.

**Step 4: Pagination**

If the response contained exactly `limit_per_page` items, there may be more. Set a flag to re-poll immediately (not wait another 60s). Cap consecutive re-polls at 10 pages to avoid blocking the event loop for too long during large catch-ups.

#### 4.3 Event Parsing

Each event has `data.fields` which is an array of Scrypto programmatic JSON values. The existing `verifyEscrowTx` function (gateway.js lines 153-168) already parses `TaskCreatedEvent` with `fields[0]` as task_id, `fields[1]` as amount, `fields[2]` as creator. This is the reference pattern.

**parseTaskCreatedEvent(fields)**
- Returns: `{ task_id: int, amount: string, creator: string }`
- fields[0].value = task_id (U64)
- fields[1].value = amount (Decimal as string)
- fields[2].value = creator address (String)

**parseTaskClaimedEvent(fields)**
- Returns: `{ task_id: int, claimer: string }`
- fields[0].value = task_id
- fields[1].value = claimer address

**parseTaskReleasedEvent(fields)**
- Returns: `{ task_id: int, amount: string, recipient: string }`
- fields[0].value = task_id
- fields[1].value = released amount
- fields[2].value = recipient address

**parseTaskCancelledEvent(fields)**
- Returns: `{ task_id: int, refund_amount: string }`
- fields[0].value = task_id
- fields[1].value = refund amount

Each parser wraps in try/catch and returns `null` on failure, with a log line `[EscrowWatcher] Failed to parse <EventName>: <error>`.

#### 4.4 Event Handlers

**handleTaskCreated(parsed, txHash)**

1. Find the matching bounty in SQLite. Strategy: look up by `onchain_task_id` first (in case a bounty was pre-linked). If not found, look for an unfunded bounty whose `reward_xrd` matches `parsed.amount` (fuzzy match within 0.01 XRD tolerance) created recently (within 1 hour). If still no match, create a new bounty record with `source = 'onchain'` and `creator_tg_id` set to a system/admin ID (same pattern as the API POST /api/bounties which uses `ADMIN_TG_ID = 6102618406` at api.js line 219).
2. Call `fundTaskFromWatcher(bountyId, txHash, parsed.amount, parsed.task_id)`.
3. Invoke `options.onTaskCreated({ bountyId, taskId: parsed.task_id, amount: parsed.amount, creator: parsed.creator, txHash })`.
4. Log: `[EscrowWatcher] TaskCreated: task_id=<N>, amount=<X> XRD, bounty=#<M>`.

**handleTaskClaimed(parsed, txHash)**

1. Find the bounty by `onchain_task_id = parsed.task_id`.
2. If found and status is "open" and funded, update `assignee_address = parsed.claimer`, `status = 'assigned'`, `assigned_at = now`.
3. Invoke `options.onTaskClaimed(...)`.
4. Log the event.

**handleTaskReleased(parsed, txHash)**

1. Find the bounty by `onchain_task_id = parsed.task_id`.
2. If found, update status to "paid", set `paid_tx = txHash`, `paid_at = now`.
3. Update `escrow_wallet.total_released_xrd`.
4. Insert into `bounty_transactions` with `tx_type = 'release'` and `verified_onchain = 1`.
5. Invoke `options.onTaskReleased(...)`.

**handleTaskCancelled(parsed, txHash)**

1. Find the bounty by `onchain_task_id = parsed.task_id`.
2. If found, update status to "cancelled", set `cancelled_at = now`, `cancel_reason = 'on-chain cancellation'`.
3. Insert into `bounty_transactions` with `tx_type = 'refund'`.
4. Invoke `options.onTaskCancelled(...)`.

All handlers wrap DB writes in try/catch. On failure, log the error and the full event payload, but do NOT crash. The transaction is still marked as processed to avoid infinite retry loops on corrupt data.

#### 4.5 `getStatus()`

Returns an object for integration with the `/api/health` endpoint:

```
{
  enabled: boolean,
  last_state_version: number,
  last_poll_at: ISO string or null,
  total_events_processed: number,
  errors: number,
  last_error: string or null,
  polling: boolean (is interval active)
}
```

### 5. Integration with index.js

#### 5.1 Initialization (after line 14, near bot startup)

```
const escrowWatcher = require("./services/escrow-watcher");
```

#### 5.2 After bot.start() (around line 1641)

Initialize the watcher with notification callbacks:

```
escrowWatcher.init(dbInstance, {
  onTaskCreated: async (event) => {
    // Send TG message to the guild chat
    // bot.api.sendMessage(GUILD_CHAT_ID, formatTaskCreated(event))
    // notifyDiscord(formatTaskCreatedDiscord(event))
  },
  onTaskClaimed: async (event) => { ... },
  onTaskReleased: async (event) => { ... },
  onTaskCancelled: async (event) => { ... },
});
escrowWatcher.startPolling();
```

This follows the existing pattern where `cv2.init(dbInstance)` is called at index.js line 15.

#### 5.3 Notification Message Formats

**Task Funded (TaskCreated):**
- TG: `"Task #<id> FUNDED (auto-detected)\n<title>\nAmount: <X> XRD\nEscrow task: <onchain_id>\nTX: <hash_short>...\n\nWorkers can claim this task."`
- Discord: `"**Task #<id> funded (auto-detected)** -- <X> XRD\n<title>\nClaim: <PORTAL>/bounties/<id>"`

**Task Claimed:**
- TG: `"Task #<id> CLAIMED\n<title>\nClaimer: <address_short>..."`
- Discord: `"**Task #<id> claimed** -- <title>\nWorker: <address_short>..."`

**Payment Released:**
- TG: `"Task #<id> PAID\n<title>\nAmount: <X> XRD released to <address_short>..."`
- Discord: `"**Task #<id> payment released** -- <X> XRD\n<titl
