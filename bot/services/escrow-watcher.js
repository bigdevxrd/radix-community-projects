/**
 * escrow-watcher.js — Auto-detect on-chain escrow events
 *
 * Polls the Radix Gateway /stream/transactions for events on the
 * TaskEscrow component. Auto-creates/updates SQLite records when
 * tasks are funded, claimed, released, or cancelled on-chain.
 *
 * Phase 0 upgrade: now syncs bounty status + sends TG notifications.
 */

const GATEWAY = process.env.RADIX_GATEWAY || "https://mainnet.radixdlt.com";
const ESCROW_COMPONENT = process.env.ESCROW_COMPONENT || "component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r";
const POLL_INTERVAL = 60 * 1000; // 60 seconds

let db = null;
let bot = null;
let dbModule = null; // reference to the db module for helper functions
let lastStateVersion = 0;
let running = false;

function init(dbInstance, botInstance, dbMod) {
  db = dbInstance;
  bot = botInstance;
  dbModule = dbMod || null;

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

// ── Helpers ────────────────────────────────────────────────

/** Find SQLite bounty linked to an on-chain task ID */
function getBountyByOnchainId(onchainTaskId) {
  try {
    return db.prepare("SELECT * FROM bounties WHERE onchain_task_id = ?").get(onchainTaskId);
  } catch (e) { return null; }
}

/** Find user by their Radix address (for TG notifications) */
function getUserByAddress(address) {
  try {
    return db.prepare("SELECT * FROM users WHERE radix_address = ?").get(address);
  } catch (e) { return null; }
}

/** Send a TG message to a user by tg_id (best-effort, never throws) */
async function notifyUser(tgId, message) {
  if (!bot || !tgId) return;
  try {
    await bot.api.sendMessage(tgId, message, { parse_mode: "HTML" });
  } catch (e) {
    console.error("[EscrowWatcher] TG notify error for " + tgId + ":", e.message);
  }
}

// ── Poll Loop ──────────────────────────────────────────────

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

  const maxVersion = Math.max(...items.map(t => t.state_version || 0));
  if (maxVersion <= lastStateVersion) return;

  for (const tx of items) {
    if (tx.transaction_status !== "CommittedSuccess") continue;

    const stateVersion = tx.state_version || 0;
    if (stateVersion <= lastStateVersion) continue;
    const txHash = tx.intent_hash || "";
    const events = tx.receipt?.events || [];

    for (const event of events) {
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

    if (stateVersion > lastStateVersion) {
      lastStateVersion = stateVersion;
      try {
        db.prepare("INSERT OR REPLACE INTO watcher_state (key, value) VALUES ('escrow_last_version', ?)").run(String(stateVersion));
      } catch (e) {
        console.error("[EscrowWatcher] Failed to save state version:", e.message);
      }
    }
  }

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

// ── Event Handlers ─────────────────────────────────────────

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

  // Sync bounty status: mark as funded if we can find the linked bounty
  const bounty = getBountyByOnchainId(taskId);
  if (bounty && !bounty.funded) {
    try {
      const now = Math.floor(Date.now() / 1000);
      db.prepare("UPDATE bounties SET funded = 1, escrow_verified = 1 WHERE id = ?").run(bounty.id);
      console.log("[EscrowWatcher] Bounty #" + bounty.id + " auto-marked funded via on-chain event");

      // Notify creator
      await notifyUser(bounty.creator_tg_id,
        "✅ <b>Task #" + bounty.id + " funded on-chain</b>\n" +
        amount + " XRD deposited into escrow.\n" +
        "Workers can now claim this task."
      );
    } catch (e) {
      console.error("[EscrowWatcher] Bounty sync error:", e.message);
    }
  }
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

  // Sync bounty status to 'assigned'
  const bounty = getBountyByOnchainId(taskId);
  if (bounty && bounty.status === "open") {
    try {
      const now = Math.floor(Date.now() / 1000);
      db.prepare("UPDATE bounties SET status = 'assigned', assignee_address = ?, assigned_at = ? WHERE id = ? AND status = 'open'")
        .run(worker, now, bounty.id);
      console.log("[EscrowWatcher] Bounty #" + bounty.id + " auto-assigned via on-chain claim");

      // Notify creator
      await notifyUser(bounty.creator_tg_id,
        "🔔 <b>Task #" + bounty.id + " claimed</b>\n" +
        "\"" + (bounty.title || "").slice(0, 60) + "\"\n" +
        "Worker: <code>" + worker.slice(0, 20) + "...</code>"
      );

      // Notify worker (if we can find them by address)
      const workerUser = getUserByAddress(worker);
      if (workerUser) {
        await notifyUser(workerUser.tg_id,
          "✅ <b>You claimed Task #" + bounty.id + "</b>\n" +
          "\"" + (bounty.title || "").slice(0, 60) + "\"\n" +
          "Reward: " + bounty.reward_xrd + " XRD\n" +
          "Submit your work with: /bounty submit " + bounty.id + " <url>"
        );
      }
    } catch (e) {
      console.error("[EscrowWatcher] Bounty assign sync error:", e.message);
    }
  }
}

async function handleTaskReleased(fields, txHash) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const worker = fields[1]?.value || "";
  const payout = fields[2]?.value || "0";
  const fee = fields[3]?.value || "0";
  // V3 also has resource at index 4, but we don't need it for now

  console.log("[EscrowWatcher] TaskReleased: #" + taskId + " | " + payout + " XRD to " + worker.slice(0, 25) + "... | fee: " + fee);

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'release', ?, ?, ?, 1, ?)"
    ).run(taskId, parseFloat(payout), txHash, "Escrow released on-chain. Fee: " + fee + " XRD", taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }

  // Sync bounty status to 'paid' + track fees
  const bounty = getBountyByOnchainId(taskId);
  if (bounty && bounty.status !== "paid") {
    try {
      const now = Math.floor(Date.now() / 1000);
      db.prepare("UPDATE bounties SET status = 'paid', paid_at = ?, paid_tx = ? WHERE id = ?")
        .run(now, txHash, bounty.id);

      // Record fee tracking (Phase 0.6)
      if (dbModule && dbModule.recordEscrowRelease) {
        dbModule.recordEscrowRelease(bounty.id, parseFloat(payout), parseFloat(fee), txHash);
      } else {
        // Fallback: direct update
        db.prepare("UPDATE bounties SET fee_collected_xrd = ? WHERE id = ?").run(parseFloat(fee), bounty.id);
        db.prepare("UPDATE escrow_wallet SET total_released_xrd = total_released_xrd + ?, total_fees_collected_xrd = total_fees_collected_xrd + ? WHERE id = 1")
          .run(parseFloat(payout) + parseFloat(fee), parseFloat(fee));
      }

      console.log("[EscrowWatcher] Bounty #" + bounty.id + " auto-marked paid via on-chain release");

      // Queue XP reward for the assignee
      // Note: requires xp.js to be available — best-effort
      try {
        const { queueXpReward } = require("./xp.js");
        if (bounty.assignee_address && queueXpReward) {
          queueXpReward(bounty.assignee_address, "bounty_complete");
        }
      } catch (_) {
        // XP service may not be loaded yet
      }

      // Notify assignee
      const workerUser = getUserByAddress(worker) ||
        (bounty.assignee_tg_id ? { tg_id: bounty.assignee_tg_id } : null);
      if (workerUser) {
        await notifyUser(workerUser.tg_id,
          "💰 <b>Payment received for Task #" + bounty.id + "</b>\n" +
          "\"" + (bounty.title || "").slice(0, 60) + "\"\n" +
          "Payout: " + payout + " XRD (fee: " + fee + " XRD)\n" +
          "TX: <code>" + txHash.slice(0, 20) + "...</code>"
        );
      }

      // Notify creator
      await notifyUser(bounty.creator_tg_id,
        "✅ <b>Task #" + bounty.id + " completed & paid</b>\n" +
        "\"" + (bounty.title || "").slice(0, 60) + "\"\n" +
        "Paid: " + payout + " XRD to worker\n" +
        "Fee: " + fee + " XRD collected"
      );
    } catch (e) {
      console.error("[EscrowWatcher] Bounty release sync error:", e.message);
    }
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

  // Sync bounty status to 'cancelled'
  const bounty = getBountyByOnchainId(taskId);
  if (bounty && bounty.status !== "cancelled" && bounty.status !== "paid") {
    try {
      const now = Math.floor(Date.now() / 1000);
      db.prepare("UPDATE bounties SET status = 'cancelled', cancelled_at = ?, cancel_reason = 'on_chain_cancel' WHERE id = ?")
        .run(now, bounty.id);
      console.log("[EscrowWatcher] Bounty #" + bounty.id + " auto-cancelled via on-chain event");

      // Notify creator
      await notifyUser(bounty.creator_tg_id,
        "🔔 <b>Task #" + bounty.id + " cancelled</b>\n" +
        "\"" + (bounty.title || "").slice(0, 60) + "\"\n" +
        "Refunded: " + refunded + " XRD"
      );
    } catch (e) {
      console.error("[EscrowWatcher] Bounty cancel sync error:", e.message);
    }
  }
}

module.exports = { init };
