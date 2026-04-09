/**
 * escrow-watcher.js — Auto-detect on-chain escrow events
 *
 * Polls the Radix Gateway /stream/transactions for events on the
 * TaskEscrow component. Auto-creates/updates SQLite records when
 * tasks are funded, claimed, released, or cancelled on-chain.
 *
 * No /bounty fund <tx_hash> needed. The watcher catches everything.
 */

const GATEWAY = "https://mainnet.radixdlt.com";
const ESCROW_COMPONENT = process.env.ESCROW_COMPONENT || "component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r";
const POLL_INTERVAL = 60 * 1000; // 60 seconds

let db = null;
let bot = null;
let lastStateVersion = 0;
let running = false;

function init(dbInstance, botInstance) {
  db = dbInstance;
  bot = botInstance;

  // Load last state version from DB (survives restart)
  try {
    db.exec("CREATE TABLE IF NOT EXISTS watcher_state (key TEXT PRIMARY KEY, value TEXT)");
    const row = db.prepare("SELECT value FROM watcher_state WHERE key = 'escrow_last_version'").get();
    if (row) lastStateVersion = parseInt(row.value) || 0;
  } catch (e) {
    console.error("[EscrowWatcher] Failed to load state:", e.message);
  }

  console.log("[EscrowWatcher] Initialized. Last state version:", lastStateVersion);

  // Start polling
  setInterval(async () => {
    if (running) return; // skip if previous poll still running
    running = true;
    try {
      await pollEscrowEvents();
    } catch (e) {
      console.error("[EscrowWatcher] Poll error:", e.message);
    }
    running = false;
  }, POLL_INTERVAL);

  // Initial poll on startup (after 10s to let bot connect)
  setTimeout(() => pollEscrowEvents().catch(e => console.error("[EscrowWatcher] Initial poll error:", e.message)), 10000);
}

async function pollEscrowEvents() {
  const resp = await fetch(GATEWAY + "/stream/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      affected_global_entities_filter: [ESCROW_COMPONENT],
      from_state_version: lastStateVersion > 0 ? lastStateVersion + 1 : undefined,
      limit_per_page: 50,
      order: "asc",
      opt_ins: {
        receipt_events: true,
        affected_global_entities: true,
      },
    }),
  });

  if (!resp.ok) {
    console.error("[EscrowWatcher] Gateway HTTP", resp.status);
    return;
  }

  const data = await resp.json();
  const items = data.items || [];

  if (items.length === 0) return;

  // Check if we've already processed all these TXs (same state version = no new data)
  const maxVersion = Math.max(...items.map(t => t.state_version || 0));
  if (maxVersion <= lastStateVersion) return; // nothing new

  for (const tx of items) {
    if (tx.transaction_status !== "CommittedSuccess") continue;

    const stateVersion = tx.state_version || 0;
    if (stateVersion <= lastStateVersion) continue; // already processed
    const txHash = tx.intent_hash || "";
    const events = tx.receipt?.events || [];

    for (const event of events) {
      // Only process events from our escrow component
      const emitter = event.emitter?.entity?.entity_address;
      if (emitter !== ESCROW_COMPONENT) continue;

      const name = event.name;
      const fields = event.data?.fields || [];

      try {
        if (name === "TaskCreatedEvent") {
          await handleTaskCreated(fields, txHash, stateVersion);
        } else if (name === "TaskClaimedEvent") {
          await handleTaskClaimed(fields, txHash);
        } else if (name === "TaskReleasedEvent") {
          await handleTaskReleased(fields, txHash);
        } else if (name === "TaskCancelledEvent") {
          await handleTaskCancelled(fields, txHash);
        }
      } catch (e) {
        console.error("[EscrowWatcher] Error processing " + name + ":", e.message);
      }
    }

    // Update last state version
    if (stateVersion > lastStateVersion) {
      lastStateVersion = stateVersion;
      try {
        db.prepare("INSERT OR REPLACE INTO watcher_state (key, value) VALUES ('escrow_last_version', ?)").run(String(stateVersion));
      } catch (e) {
        console.error("[EscrowWatcher] Failed to save state version:", e.message);
      }
    }
  }

  // Always advance state version to the max in this batch
  if (maxVersion > lastStateVersion) {
    lastStateVersion = maxVersion;
    try {
      db.prepare("INSERT OR REPLACE INTO watcher_state (key, value) VALUES ('escrow_last_version', ?)").run(String(maxVersion));
    } catch (e) {
      console.error("[EscrowWatcher] Failed to save state version:", e.message);
    }
    console.log("[EscrowWatcher] Processed " + items.length + " TX(s). State version: " + lastStateVersion);
  }
}

async function handleTaskCreated(fields, txHash, stateVersion) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const amount = fields[1]?.value || "0";
  const creator = fields[2]?.value || "";

  console.log("[EscrowWatcher] TaskCreated: #" + taskId + " | " + amount + " XRD | creator: " + creator.slice(0, 25) + "...");

  // Log to audit trail
  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'deposit', ?, ?, ?, 1, ?)"
    ).run(taskId, parseFloat(amount), txHash, "Auto-detected by gateway watcher", taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }

  // Notify TG (best-effort)
  try {
    if (bot) {
      // Find an appropriate chat to announce in (use admin's chat or a group)
      console.log("[EscrowWatcher] Task #" + taskId + " funded on-chain: " + amount + " XRD");
    }
  } catch (_) {}
}

async function handleTaskClaimed(fields, txHash) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const worker = fields[1]?.value || "";

  console.log("[EscrowWatcher] TaskClaimed: #" + taskId + " | worker: " + worker.slice(0, 25) + "...");

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'claim', 0, ?, ?, 1, ?)"
    ).run(taskId, txHash, "Task claimed on-chain. Worker: " + worker.slice(0, 30), taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }
}

async function handleTaskReleased(fields, txHash) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const worker = fields[1]?.value || "";
  const payout = fields[2]?.value || "0";
  const fee = fields[3]?.value || "0";

  console.log("[EscrowWatcher] TaskReleased: #" + taskId + " | " + payout + " XRD to " + worker.slice(0, 25) + "... | fee: " + fee);

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'release', ?, ?, ?, 1, ?)"
    ).run(taskId, parseFloat(payout), txHash, "Escrow released on-chain. Fee: " + fee + " XRD", taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }
}

async function handleTaskCancelled(fields, txHash) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const refunded = fields[1]?.value || "0";

  console.log("[EscrowWatcher] TaskCancelled: #" + taskId + " | refunded: " + refunded + " XRD");

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'cancel', ?, ?, ?, 1, ?)"
    ).run(taskId, parseFloat(refunded), txHash, "Task cancelled on-chain. Refunded: " + refunded + " XRD", taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }
}

module.exports = { init };
