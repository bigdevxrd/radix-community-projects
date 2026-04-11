/**
 * conviction-watcher.js — Sync ConvictionVoting (CV3) on-chain events
 *
 * Polls the Radix Gateway /stream/transactions for events on the
 * ConvictionVoting component. Tracks proposals, stakes, conviction
 * updates, and auto-executions in SQLite.
 *
 * Feature-flagged: set CV3_ENABLED=true + CV3_COMPONENT to activate.
 */

const GATEWAY = "https://mainnet.radixdlt.com";
const CV3_COMPONENT = process.env.CV3_COMPONENT || "component_rdx1cz97d534phmngxhal9l87a2p63c97n6tr6q3j6l290ckjnlhya0cvf";
const POLL_INTERVAL = 60 * 1000;
const THRESHOLD_MULTIPLIER = 10; // must match on-chain param

let db = null;
let bot = null;
let lastStateVersion = 0;
let running = false;
let errorCount = 0;

function isEnabled() {
  return process.env.CV3_ENABLED === "true" && !!CV3_COMPONENT;
}

function init(dbInstance, botInstance) {
  db = dbInstance;
  bot = botInstance;

  if (!isEnabled()) {
    console.log("[CV3Watcher] Disabled (set CV3_ENABLED=true to activate)");
    return;
  }

  // Load last state version
  try {
    db.exec("CREATE TABLE IF NOT EXISTS watcher_state (key TEXT PRIMARY KEY, value TEXT)");
    const row = db.prepare("SELECT value FROM watcher_state WHERE key = 'cv3_last_version'").get();
    if (row) lastStateVersion = parseInt(row.value) || 0;
  } catch (e) {
    console.error("[CV3Watcher] Failed to load state:", e.message);
  }

  console.log("[CV3Watcher] Initialized. Component:", CV3_COMPONENT.slice(0, 30) + "...");
  console.log("[CV3Watcher] Last state version:", lastStateVersion);

  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await pollCv3Events();
    } catch (e) {
      errorCount++;
      if (errorCount <= 3 || errorCount % 50 === 0) {
        console.error("[CV3Watcher] Poll error (" + errorCount + " total):", e.message);
      }
      try {
        db.prepare("UPDATE cv3_sync_state SET errors = ? WHERE id = 1").run(errorCount);
      } catch (_) {}
    }
    running = false;
  }, POLL_INTERVAL);

  // Initial poll after 15s
  setTimeout(() => pollCv3Events().catch(e =>
    console.error("[CV3Watcher] Initial poll error:", e.message)
  ), 15000);
}

async function pollCv3Events() {
  const resp = await fetch(GATEWAY + "/stream/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      affected_global_entities_filter: [CV3_COMPONENT],
      from_state_version: lastStateVersion > 0 ? lastStateVersion + 1 : undefined,
      limit_per_page: 50,
      order: "asc",
      opt_ins: { receipt_events: true, affected_global_entities: true },
    }),
  });

  if (!resp.ok) return;

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
      if (emitter !== CV3_COMPONENT) continue;

      const name = event.name;
      const fields = event.data?.fields || [];

      try {
        if (name === "ProposalCreatedEvent") handleProposalCreated(fields, txHash);
        else if (name === "StakeAddedEvent") handleStakeAdded(fields, txHash);
        else if (name === "StakeRemovedEvent") handleStakeRemoved(fields, txHash);
        else if (name === "ConvictionUpdatedEvent") handleConvictionUpdated(fields, txHash);
        else if (name === "ProposalExecutedEvent") handleProposalExecuted(fields, txHash);
        else if (name === "PoolFundedEvent") handlePoolFunded(fields, txHash);
      } catch (e) {
        console.error("[CV3Watcher] Error processing " + name + ":", e.message);
      }
    }
  }

  // Advance state version
  if (maxVersion > lastStateVersion) {
    lastStateVersion = maxVersion;
    try {
      db.prepare("INSERT OR REPLACE INTO watcher_state (key, value) VALUES ('cv3_last_version', ?)").run(String(maxVersion));
      db.prepare("UPDATE cv3_sync_state SET last_sync = ? WHERE id = 1").run(Math.floor(Date.now() / 1000));
    } catch (e) {
      console.error("[CV3Watcher] Failed to save state:", e.message);
    }
    console.log("[CV3Watcher] Processed " + items.length + " TX(s). State version: " + lastStateVersion);
  }
}

// ── Event Handlers ──

function handleProposalCreated(fields, txHash) {
  const proposalId = parseInt(fields[0]?.value) || 0;
  const title = fields[1]?.value || "Untitled";
  const requestedAmount = parseFloat(fields[2]?.value) || 0;
  const beneficiary = fields[3]?.value || "";
  const threshold = requestedAmount * THRESHOLD_MULTIPLIER;
  const now = Math.floor(Date.now() / 1000);

  console.log("[CV3Watcher] ProposalCreated: #" + proposalId + " | " + requestedAmount + " XRD | " + title);

  db.prepare(`
    INSERT OR REPLACE INTO cv3_proposals (id, title, requested_amount, beneficiary, threshold, conviction, status, created_at, last_updated)
    VALUES (?, ?, ?, ?, ?, 0, 'active', ?, ?)
  `).run(proposalId, title, requestedAmount, beneficiary, threshold, now, now);

  db.prepare("UPDATE cv3_sync_state SET proposal_count = (SELECT COUNT(*) FROM cv3_proposals) WHERE id = 1").run();
}

function handleStakeAdded(fields, txHash) {
  const proposalId = parseInt(fields[0]?.value) || 0;
  const stakerBadgeId = fields[1]?.value || "";
  const amount = parseFloat(fields[2]?.value) || 0;
  const weightedAmount = parseFloat(fields[3]?.value) || 0;
  const tierMultiplier = weightedAmount > 0 && amount > 0 ? weightedAmount / amount : 1;
  const now = Math.floor(Date.now() / 1000);

  console.log("[CV3Watcher] StakeAdded: proposal #" + proposalId + " | " + amount + " XRD | weighted: " + weightedAmount);

  db.prepare(`
    INSERT OR REPLACE INTO cv3_stakes (proposal_id, staker_badge_id, amount, weighted_amount, tier_multiplier, staked_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(proposalId, stakerBadgeId, amount, weightedAmount, tierMultiplier, now);

  // Recount proposal aggregates
  refreshProposalAggregates(proposalId);
}

function handleStakeRemoved(fields, txHash) {
  const proposalId = parseInt(fields[0]?.value) || 0;
  const stakerBadgeId = fields[1]?.value || "";
  const amount = parseFloat(fields[2]?.value) || 0;

  console.log("[CV3Watcher] StakeRemoved: proposal #" + proposalId + " | " + amount + " XRD");

  db.prepare("DELETE FROM cv3_stakes WHERE proposal_id = ? AND staker_badge_id = ?").run(proposalId, stakerBadgeId);
  refreshProposalAggregates(proposalId);
}

function handleConvictionUpdated(fields, txHash) {
  const proposalId = parseInt(fields[0]?.value) || 0;
  const newConviction = parseFloat(fields[2]?.value) || 0;
  const now = Math.floor(Date.now() / 1000);

  db.prepare("UPDATE cv3_proposals SET conviction = ?, last_updated = ? WHERE id = ?").run(newConviction, now, proposalId);
}

function handleProposalExecuted(fields, txHash) {
  const proposalId = parseInt(fields[0]?.value) || 0;
  const amount = parseFloat(fields[1]?.value) || 0;
  const beneficiary = fields[2]?.value || "";

  console.log("[CV3Watcher] ProposalExecuted: #" + proposalId + " | " + amount + " XRD → " + beneficiary.slice(0, 25) + "...");

  db.prepare("UPDATE cv3_proposals SET status = 'executed', executed_amount = ? WHERE id = ?").run(amount, proposalId);

  // If linked to a bounty, update it
  const proposal = db.prepare("SELECT task_bounty_id FROM cv3_proposals WHERE id = ?").get(proposalId);
  if (proposal && proposal.task_bounty_id) {
    try {
      db.prepare("UPDATE bounties SET funded = 1 WHERE id = ?").run(proposal.task_bounty_id);
      db.prepare(
        "INSERT OR IGNORE INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, verified_onchain) VALUES (?, 'cv3_fund', ?, ?, ?, 1)"
      ).run(proposal.task_bounty_id, amount, txHash, "Funded by conviction voting (CV3 proposal #" + proposalId + ")");
      console.log("[CV3Watcher] Bounty #" + proposal.task_bounty_id + " funded via CV3");
    } catch (e) {
      console.error("[CV3Watcher] Bounty link error:", e.message);
    }
  }

  // Update pool balance (decrement)
  db.prepare("UPDATE cv3_sync_state SET pool_balance = MAX(0, pool_balance - ?) WHERE id = 1").run(amount);
}

function handlePoolFunded(fields, txHash) {
  const amount = parseFloat(fields[0]?.value) || 0;
  const newBalance = parseFloat(fields[1]?.value) || 0;

  console.log("[CV3Watcher] PoolFunded: +" + amount + " XRD | balance: " + newBalance + " XRD");

  db.prepare("UPDATE cv3_sync_state SET pool_balance = ? WHERE id = 1").run(newBalance);
}

// ── Helpers ──

function refreshProposalAggregates(proposalId) {
  const agg = db.prepare(`
    SELECT COUNT(*) as staker_count, COALESCE(SUM(amount), 0) as total_staked, COALESCE(SUM(weighted_amount), 0) as weighted_staked
    FROM cv3_stakes WHERE proposal_id = ?
  `).get(proposalId);

  db.prepare(
    "UPDATE cv3_proposals SET staker_count = ?, total_staked = ?, weighted_staked = ?, last_updated = ? WHERE id = ?"
  ).run(agg.staker_count, agg.total_staked, agg.weighted_staked, Math.floor(Date.now() / 1000), proposalId);
}

// ── Read Functions (for API + bot) ──

function getSyncStatus() {
  const sync = db.prepare("SELECT * FROM cv3_sync_state WHERE id = 1").get() || {};
  return {
    enabled: isEnabled(),
    component: CV3_COMPONENT,
    lastSync: sync.last_sync || null,
    proposalCount: sync.proposal_count || 0,
    poolBalance: sync.pool_balance || 0,
    errors: sync.errors || 0,
    polling: isEnabled(),
    pollInterval: POLL_INTERVAL,
  };
}

function getProposals(status) {
  if (status) return db.prepare("SELECT * FROM cv3_proposals WHERE status = ? ORDER BY conviction DESC").all(status);
  return db.prepare("SELECT * FROM cv3_proposals ORDER BY conviction DESC").all();
}

function getProposal(id) {
  return db.prepare("SELECT * FROM cv3_proposals WHERE id = ?").get(id) || null;
}

function getActiveProposals() {
  return db.prepare("SELECT * FROM cv3_proposals WHERE status = 'active' ORDER BY conviction DESC").all();
}

function getStakes(proposalId) {
  return db.prepare("SELECT * FROM cv3_stakes WHERE proposal_id = ? ORDER BY weighted_amount DESC").all(proposalId);
}

function getStats() {
  const sync = db.prepare("SELECT * FROM cv3_sync_state WHERE id = 1").get() || {};
  const active = db.prepare("SELECT COUNT(*) as c FROM cv3_proposals WHERE status = 'active'").get();
  const executed = db.prepare("SELECT COUNT(*) as c FROM cv3_proposals WHERE status = 'executed'").get();
  return {
    proposal_count: sync.proposal_count || 0,
    active_proposals: active.c || 0,
    executed_proposals: executed.c || 0,
    pool_balance: sync.pool_balance || 0,
  };
}

module.exports = { init, isEnabled, getSyncStatus, getProposals, getProposal, getActiveProposals, getStakes, getStats };
