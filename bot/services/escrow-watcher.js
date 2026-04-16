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
const ESCROW_V3_COMPONENT = process.env.ESCROW_V3_COMPONENT || "component_rdx1czcjn322rhzvu4gwkculx6qvguv2erqu38mschwqkjyqtdpvpcex9s";
const WATCHED_COMPONENTS = [ESCROW_COMPONENT, ESCROW_V3_COMPONENT].filter(Boolean);
const POLL_INTERVAL = 60 * 1000; // 60 seconds

let db = null;
let bot = null;
let dbModule = null; // reference to the db module for helper functions
let lastStateVersion = 0;
let running = false;
let xpService = null; // lazy-loaded once

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
  let totalProcessed = 0;
  let hasMore = true;

  // Pagination loop — fetch all pages to prevent sync loss on >50 TX bursts
  while (hasMore) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s fetch timeout

    let resp;
    try {
      resp = await fetch(GATEWAY + "/stream/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          affected_global_entities_filter: WATCHED_COMPONENTS,
          from_state_version: lastStateVersion > 0 ? lastStateVersion + 1 : undefined,
          limit_per_page: 50,
          order: "asc",
          opt_ins: {
            receipt_events: true,
            affected_global_entities: true,
          },
        }),
      });
    } catch (e) {
      console.error("[EscrowWatcher] Gateway fetch error:", e.message);
      return;
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error("[EscrowWatcher] Gateway HTTP", resp.status, body.slice(0, 200));
      return;
    }

    const data = await resp.json();
    const items = data.items || [];

    if (items.length === 0) break;

    for (const tx of items) {
      if (tx.transaction_status !== "CommittedSuccess") continue;

      const stateVersion = tx.state_version || 0;
      if (stateVersion <= lastStateVersion) continue;
      const txHash = tx.intent_hash || "";
      const events = tx.receipt?.events || [];

      for (const event of events) {
        const emitter = event.emitter?.entity?.entity_address;
        if (!WATCHED_COMPONENTS.includes(emitter)) continue;

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
          } else if (name === "TaskSubmittedEvent") {
            await handleTaskSubmitted(fields, txHash);
          }
        } catch (e) {
          console.error("[EscrowWatcher] Error processing " + name + ":", e.message);
        }
      }

      // Save state version after each TX for crash recovery
      if (stateVersion > lastStateVersion) {
        lastStateVersion = stateVersion;
        try {
          db.prepare("INSERT OR REPLACE INTO watcher_state (key, value) VALUES ('escrow_last_version', ?)").run(String(stateVersion));
        } catch (e) {
          console.error("[EscrowWatcher] Failed to save state version:", e.message);
        }
      }

      totalProcessed++;
    }

    // Continue pagination if we got a full page (may have more)
    hasMore = items.length >= 50;
  }

  if (totalProcessed > 0) {
    console.log("[EscrowWatcher] Processed " + totalProcessed + " TX(s). State version: " + lastStateVersion);
  }
}

// ── Event Handlers ─────────────────────────────────────────

async function handleTaskCreated(fields, txHash, stateVersion) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const amount = fields[1]?.value || "0";
  // V3 field order: task_id, amount, resource, creator (resource at index 2, creator at index 3)
  const resource = fields[2]?.value || "";
  const creator = fields[3]?.value || fields[2]?.value || ""; // fallback for V1 (no resource field)
  const tokenLabel = resource.includes("radxrd") ? "XRD" : resource.includes("usdc") ? "xUSDC" : resource.includes("usdt") ? "xUSDT" : "XRD";

  console.log("[EscrowWatcher] TaskCreated: #" + taskId + " | " + amount + " " + tokenLabel + " | creator: " + creator.slice(0, 25) + "...");

  // Find linked bounty first — use bounty.id (SQLite FK) not taskId (on-chain ID)
  const bounty = getBountyByOnchainId(taskId);
  const bountyIdForLog = bounty ? bounty.id : null;

  // Log to audit trail
  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'deposit', ?, ?, ?, 1, ?)"
    ).run(bountyIdForLog, parseFloat(amount), txHash, "Auto-detected by gateway watcher", taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }

  // Sync bounty status: mark as funded if we can find the linked bounty
  if (bounty && !bounty.funded) {
    try {
      db.prepare("UPDATE bounties SET funded = 1, escrow_verified = 1 WHERE id = ?").run(bounty.id);
      console.log("[EscrowWatcher] Bounty #" + bounty.id + " auto-marked funded via on-chain event");

      // Notify creator
      await notifyUser(bounty.creator_tg_id,
        "✅ <b>Task #" + bounty.id + " funded on-chain</b>\n" +
        amount + " " + tokenLabel + " deposited into escrow.\n" +
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

  const bounty = getBountyByOnchainId(taskId);
  const bountyIdForLog = bounty ? bounty.id : null;

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'claim', 0, ?, ?, 1, ?)"
    ).run(bountyIdForLog, txHash, "Task claimed on-chain. Worker: " + worker.slice(0, 30), taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }

  // Sync bounty status to 'assigned'
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
  // V3 field order: task_id, worker, payout, fee, resource
  const resource = fields[4]?.value || "";
  const tokenLabel = resource.includes("usdc") ? "xUSDC" : resource.includes("usdt") ? "xUSDT" : "XRD";

  console.log("[EscrowWatcher] TaskReleased: #" + taskId + " | " + payout + " " + tokenLabel + " to " + worker.slice(0, 25) + "... | fee: " + fee);

  const bounty = getBountyByOnchainId(taskId);
  const bountyIdForLog = bounty ? bounty.id : null;

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'release', ?, ?, ?, 1, ?)"
    ).run(bountyIdForLog, parseFloat(payout), txHash, "Escrow released on-chain. Fee: " + fee + " " + tokenLabel, taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }

  // Sync bounty status to 'paid' + track fees
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

      // Queue XP reward for the assignee (lazy-load xp service once)
      try {
        if (!xpService) xpService = require("./xp.js");
        if (bounty.assignee_address && xpService.queueXpReward) {
          xpService.queueXpReward(bounty.assignee_address, "bounty_complete");
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

async function handleTaskSubmitted(fields, txHash) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const worker = fields[1]?.value || "";

  console.log("[EscrowWatcher] TaskSubmitted: #" + taskId + " | worker: " + worker.slice(0, 25) + "...");

  const bounty = getBountyByOnchainId(taskId);
  const bountyIdForLog = bounty ? bounty.id : null;

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'submit', 0, ?, ?, 1, ?)"
    ).run(bountyIdForLog, txHash, "Work submitted on-chain. Worker: " + worker.slice(0, 30), taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }

  if (bounty && bounty.status === "assigned") {
    try {
      const now = Math.floor(Date.now() / 1000);
      db.prepare("UPDATE bounties SET status = 'submitted', submitted_at = ? WHERE id = ? AND status = 'assigned'")
        .run(now, bounty.id);
      console.log("[EscrowWatcher] Bounty #" + bounty.id + " auto-marked submitted via on-chain event");

      await notifyUser(bounty.creator_tg_id,
        "🔔 <b>Work submitted for Task #" + bounty.id + "</b>\n" +
        "\"" + (bounty.title || "").slice(0, 60) + "\"\n" +
        "Review and verify with: /bounty verify " + bounty.id
      );
    } catch (e) {
      console.error("[EscrowWatcher] Bounty submit sync error:", e.message);
    }
  }
}

async function handleTaskCancelled(fields, txHash) {
  const taskId = parseInt(fields[0]?.value) || 0;
  const refunded = fields[1]?.value || "0";
  // V3: task_id, refunded, resource
  const resource = fields[2]?.value || "";
  const tokenLabel = resource.includes("usdc") ? "xUSDC" : resource.includes("usdt") ? "xUSDT" : "XRD";

  console.log("[EscrowWatcher] TaskCancelled: #" + taskId + " | refunded: " + refunded + " " + tokenLabel);

  const bounty = getBountyByOnchainId(taskId);
  const bountyIdForLog = bounty ? bounty.id : null;

  try {
    db.prepare(
      "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain, onchain_task_id) VALUES (?, 'cancel', ?, ?, ?, 1, ?)"
    ).run(bountyIdForLog, parseFloat(refunded), txHash, "Task cancelled on-chain. Refunded: " + refunded + " " + tokenLabel, taskId);
  } catch (e) {
    console.error("[EscrowWatcher] DB log error:", e.message);
  }

  // Sync bounty status to 'cancelled'
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
