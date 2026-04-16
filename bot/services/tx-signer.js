/**
 * TX Signing Service — Phase 7
 *
 * Wraps the existing scripts/signer.js with safety guards:
 * - Rate limiting (per-hour, per-day, per-TX value)
 * - Kill switch (instant disable via TG or API)
 * - Audit logging (every attempt, success or failure)
 * - Balance monitoring
 *
 * Supported actions: RELEASE_TASK, FORCE_CANCEL, EXPIRE_TASK, UPDATE_XP, PAY_ARBITER
 *
 * Required env:
 *   BOT_PRIVATE_KEY — ed25519 hex (or SIGNER_KEY_FILE + SIGNER_PASSPHRASE for encrypted)
 *   RADIX_ACCOUNT_ADDRESS — signer account address
 *   RADIX_GATEWAY_URL — gateway (defaults to mainnet)
 */

const path = require("path");

// Lazy-load the core signer (it loads radix-engine-toolkit which is heavy)
let coreSigner = null;
function getSigner() {
  if (!coreSigner) coreSigner = require("../../scripts/signer");
  return coreSigner;
}

// Component addresses (from CLAUDE.md / env)
const ESCROW_COMPONENT = process.env.ESCROW_COMPONENT || "component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r";
const BADGE_MANAGER = process.env.BADGE_MANAGER || "component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva";
const ADMIN_BADGE = process.env.ADMIN_BADGE || "resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe";
const BADGE_NFT = process.env.BADGE_NFT || "resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl";
const ACCOUNT = process.env.RADIX_ACCOUNT_ADDRESS;
const GATEWAY_URL = process.env.RADIX_GATEWAY_URL || "https://mainnet.radixdlt.com";

let db;
let notifyAdmin = null; // injected callback for TG alerts

function init(dbModule, adminNotifier) {
  db = dbModule;
  if (adminNotifier) notifyAdmin = adminNotifier;
}

function raw() {
  if (!db) throw new Error("TX signer not initialized — call init(db) first");
  return db._raw();
}

// ── Safety guards ──

function isEnabled() {
  const config = db.getPlatformConfig();
  return config.signer_enabled === "true";
}

function checkRateLimits(action, valueXrd) {
  const d = raw();
  const config = db.getPlatformConfig();
  const now = Math.floor(Date.now() / 1000);
  const hourAgo = now - 3600;
  const dayAgo = now - 86400;

  // Per-TX value limit
  const maxPerTx = parseFloat(config.signer_max_xrd_per_tx || "1000");
  if (valueXrd && valueXrd > maxPerTx) {
    return { allowed: false, reason: "tx_value_exceeds_limit", limit: maxPerTx, value: valueXrd };
  }

  // Per-hour release count
  if (action === "RELEASE_TASK" || action === "FORCE_CANCEL") {
    const maxPerHour = parseInt(config.signer_max_release_per_hour || "10");
    const hourCount = d.prepare(
      "SELECT COUNT(*) as c FROM signer_audit WHERE action IN ('RELEASE_TASK','FORCE_CANCEL') AND status = 'success' AND created_at > ?"
    ).get(hourAgo).c;
    if (hourCount >= maxPerHour) {
      return { allowed: false, reason: "hourly_limit_reached", limit: maxPerHour, current: hourCount };
    }
  }

  // Per-day release count
  const maxPerDay = parseInt(config.signer_max_release_per_day || "50");
  const dayCount = d.prepare(
    "SELECT COUNT(*) as c FROM signer_audit WHERE action IN ('RELEASE_TASK','FORCE_CANCEL') AND status = 'success' AND created_at > ?"
  ).get(dayAgo).c;
  if (dayCount >= maxPerDay) {
    return { allowed: false, reason: "daily_limit_reached", limit: maxPerDay, current: dayCount };
  }

  // Per-day XRD value
  const maxXrdPerDay = parseFloat(config.signer_max_xrd_per_day || "5000");
  const dayValue = d.prepare(
    "SELECT COALESCE(SUM(value_xrd), 0) as total FROM signer_audit WHERE status = 'success' AND created_at > ?"
  ).get(dayAgo).total;
  if (dayValue + (valueXrd || 0) > maxXrdPerDay) {
    return { allowed: false, reason: "daily_value_limit_reached", limit: maxXrdPerDay, current: dayValue };
  }

  return { allowed: true };
}

function logAudit(action, params, status, txHash, errorMessage, valueXrd, triggeredBy, bountyId, disputeId) {
  try {
    raw().prepare(
      "INSERT INTO signer_audit (action, params, tx_hash, status, error_message, value_xrd, triggered_by, bounty_id, dispute_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(action, JSON.stringify(params), txHash || null, status, errorMessage || null, valueXrd || null, triggeredBy || null, bountyId || null, disputeId || null);
  } catch (e) {
    console.error("[Signer] Audit log failed:", e.message);
  }
}

// ── Kill switch ──

function disableSigner(reason) {
  const d = raw();
  const now = Math.floor(Date.now() / 1000);
  d.prepare("UPDATE platform_config SET value = 'false', updated_at = ? WHERE key = 'signer_enabled'").run(now);
  d.prepare("UPDATE platform_config SET value = ?, updated_at = ? WHERE key = 'signer_last_disabled_at'").run(String(now), now);
  logAudit("KILL_SWITCH", { reason }, "disabled", null, reason, null, "admin");
  if (notifyAdmin) notifyAdmin("TX signer DISABLED: " + reason);
  return { ok: true };
}

function enableSigner() {
  const now = Math.floor(Date.now() / 1000);
  raw().prepare("UPDATE platform_config SET value = 'true', updated_at = ? WHERE key = 'signer_enabled'").run(now);
  logAudit("KILL_SWITCH", {}, "enabled", null, null, null, "admin");
  if (notifyAdmin) notifyAdmin("TX signer re-enabled");
  return { ok: true };
}

// ── Manifest builders ──

function buildManifest(action, params) {
  if (!ACCOUNT) throw new Error("RADIX_ACCOUNT_ADDRESS not set");

  switch (action) {
    case "RELEASE_TASK":
      return [
        'CALL_METHOD',
        '  Address("' + ACCOUNT + '")',
        '  "create_proof_of_amount"',
        '  Address("' + ADMIN_BADGE + '")',
        '  Decimal("1")',
        ';',
        'CALL_METHOD',
        '  Address("' + ESCROW_COMPONENT + '")',
        '  "release_task"',
        '  ' + params.taskId + 'u64',
        ';',
      ].join("\n");

    case "FORCE_CANCEL":
      return [
        'CALL_METHOD',
        '  Address("' + ACCOUNT + '")',
        '  "create_proof_of_amount"',
        '  Address("' + ADMIN_BADGE + '")',
        '  Decimal("1")',
        ';',
        'CALL_METHOD',
        '  Address("' + ESCROW_COMPONENT + '")',
        '  "force_cancel"',
        '  ' + params.taskId + 'u64',
        ';',
      ].join("\n");

    case "EXPIRE_TASK":
      return [
        'CALL_METHOD',
        '  Address("' + ACCOUNT + '")',
        '  "create_proof_of_amount"',
        '  Address("' + ADMIN_BADGE + '")',
        '  Decimal("1")',
        ';',
        'CALL_METHOD',
        '  Address("' + ESCROW_COMPONENT + '")',
        '  "expire_task"',
        '  ' + params.taskId + 'u64',
        ';',
      ].join("\n");

    case "UPDATE_XP":
      return [
        'CALL_METHOD',
        '  Address("' + ACCOUNT + '")',
        '  "create_proof_of_amount"',
        '  Address("' + ADMIN_BADGE + '")',
        '  Decimal("1")',
        ';',
        'CALL_METHOD',
        '  Address("' + BADGE_MANAGER + '")',
        '  "update_xp"',
        '  NonFungibleLocalId("' + params.badgeId + '")',
        '  ' + params.newXp + 'u64',
        ';',
      ].join("\n");

    case "TRANSFER_XRD":
      return [
        'CALL_METHOD',
        '  Address("' + ACCOUNT + '")',
        '  "withdraw"',
        '  Address("resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd")',
        '  Decimal("' + params.amount + '")',
        ';',
        'TAKE_ALL_FROM_WORKTOP',
        '  Address("resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd")',
        '  Bucket("xrd")',
        ';',
        'CALL_METHOD',
        '  Address("' + params.recipientAddress + '")',
        '  "try_deposit_or_abort"',
        '  Bucket("xrd")',
        '  None',
        ';',
      ].join("\n");

    default:
      throw new Error("Unknown action: " + action);
  }
}

// ── Core sign + submit ──

async function signAndSubmit(action, params, metadata = {}) {
  // Guard: kill switch
  if (!isEnabled()) {
    logAudit(action, params, "rejected_kill_switch", null, "Signer disabled", metadata.valueXrd, metadata.triggeredBy, metadata.bountyId, metadata.disputeId);
    return { error: "signer_disabled" };
  }

  // Guard: rate limits
  const rateCheck = checkRateLimits(action, metadata.valueXrd);
  if (!rateCheck.allowed) {
    logAudit(action, params, "rejected_rate_limit", null, rateCheck.reason, metadata.valueXrd, metadata.triggeredBy, metadata.bountyId, metadata.disputeId);
    return { error: "rate_limited", detail: rateCheck.reason, limit: rateCheck.limit };
  }

  // Guard: env vars
  if (!process.env.BOT_PRIVATE_KEY) {
    logAudit(action, params, "rejected_no_key", null, "BOT_PRIVATE_KEY not set", metadata.valueXrd, metadata.triggeredBy, metadata.bountyId, metadata.disputeId);
    return { error: "no_signing_key", detail: "BOT_PRIVATE_KEY environment variable not set" };
  }

  // Build manifest
  let manifest;
  try {
    manifest = buildManifest(action, params);
  } catch (e) {
    logAudit(action, params, "failed", null, "Manifest build: " + e.message, metadata.valueXrd, metadata.triggeredBy, metadata.bountyId, metadata.disputeId);
    return { error: "manifest_error", detail: e.message };
  }

  // Sign and submit
  try {
    const signer = getSigner();
    const { intentHash } = await signer.signAndSubmit(manifest);
    const result = await signer.waitForCommit(intentHash, 90000);

    if (result.success) {
      logAudit(action, params, "success", intentHash, null, metadata.valueXrd, metadata.triggeredBy, metadata.bountyId, metadata.disputeId);
      return { ok: true, txHash: intentHash };
    } else {
      const errMsg = result.status?.status || "unknown failure";
      logAudit(action, params, "failed", intentHash, errMsg, metadata.valueXrd, metadata.triggeredBy, metadata.bountyId, metadata.disputeId);
      if (notifyAdmin) notifyAdmin("TX failed: " + action + " — " + errMsg + " — " + intentHash);
      return { error: "tx_failed", txHash: intentHash, detail: errMsg };
    }
  } catch (e) {
    logAudit(action, params, "failed", null, e.message, metadata.valueXrd, metadata.triggeredBy, metadata.bountyId, metadata.disputeId);
    if (notifyAdmin) notifyAdmin("TX error: " + action + " — " + e.message);
    return { error: "signing_error", detail: e.message };
  }
}

// ── Convenience wrappers ──

async function releaseTask(onchainTaskId, bountyId) {
  const bounty = db.getBounty(bountyId);
  return signAndSubmit("RELEASE_TASK", { taskId: onchainTaskId }, {
    valueXrd: bounty?.reward_xrd || 0,
    triggeredBy: "bounty_verify",
    bountyId,
  });
}

async function forceCancel(onchainTaskId, bountyId) {
  const bounty = db.getBounty(bountyId);
  return signAndSubmit("FORCE_CANCEL", { taskId: onchainTaskId }, {
    valueXrd: bounty?.reward_xrd || 0,
    triggeredBy: "bounty_cancel",
    bountyId,
  });
}

async function expireTask(onchainTaskId, bountyId) {
  return signAndSubmit("EXPIRE_TASK", { taskId: onchainTaskId }, {
    triggeredBy: "task_expiry",
    bountyId,
  });
}

async function updateXp(badgeId, newXp, reason) {
  return signAndSubmit("UPDATE_XP", { badgeId, newXp }, {
    triggeredBy: reason || "xp_update",
  });
}

async function payArbiter(disputeId, arbiterAddress, amount) {
  return signAndSubmit("TRANSFER_XRD", { recipientAddress: arbiterAddress, amount }, {
    valueXrd: amount,
    triggeredBy: "dispute_resolve",
    disputeId,
  });
}

// ── Status + audit queries ──

function getSignerStatus() {
  const config = db.getPlatformConfig();
  const d = raw();
  const now = Math.floor(Date.now() / 1000);
  const hourAgo = now - 3600;
  const dayAgo = now - 86400;

  const todayCount = d.prepare(
    "SELECT COUNT(*) as c FROM signer_audit WHERE status = 'success' AND created_at > ?"
  ).get(dayAgo).c;
  const todayValue = d.prepare(
    "SELECT COALESCE(SUM(value_xrd), 0) as total FROM signer_audit WHERE status = 'success' AND created_at > ?"
  ).get(dayAgo).total;
  const hourCount = d.prepare(
    "SELECT COUNT(*) as c FROM signer_audit WHERE status = 'success' AND created_at > ?"
  ).get(hourAgo).c;
  const totalTx = d.prepare("SELECT COUNT(*) as c FROM signer_audit WHERE status = 'success'").get().c;
  const failedToday = d.prepare(
    "SELECT COUNT(*) as c FROM signer_audit WHERE status != 'success' AND created_at > ?"
  ).get(dayAgo).c;

  return {
    enabled: config.signer_enabled === "true",
    account: ACCOUNT ? ACCOUNT.slice(0, 20) + "..." : "not set",
    last_disabled_at: parseInt(config.signer_last_disabled_at || "0"),
    today: { count: todayCount, value_xrd: todayValue, failed: failedToday },
    this_hour: { count: hourCount },
    total_tx: totalTx,
    limits: {
      max_per_hour: config.signer_max_release_per_hour,
      max_per_day: config.signer_max_release_per_day,
      max_xrd_per_tx: config.signer_max_xrd_per_tx,
      max_xrd_per_day: config.signer_max_xrd_per_day,
    },
  };
}

function getAuditLog(limit = 20) {
  return raw().prepare(
    "SELECT * FROM signer_audit ORDER BY created_at DESC LIMIT ?"
  ).all(Math.min(limit, 100));
}

async function checkBalance() {
  try {
    if (!ACCOUNT) return { error: "no_account" };
    const resp = await fetch(GATEWAY_URL + "/state/entity/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: [ACCOUNT], aggregation_level: "Vault" }),
    });
    const data = await resp.json();
    const fungibles = data.items?.[0]?.fungible_resources?.items || [];
    const xrd = fungibles.find(r => r.resource_address?.includes("radxrd"));
    const balance = parseFloat(xrd?.vaults?.items?.[0]?.amount || "0");

    const config = db.getPlatformConfig();
    const alertThreshold = parseFloat(config.signer_alert_balance_xrd || "10");

    if (balance < alertThreshold && notifyAdmin) {
      notifyAdmin("Signer wallet LOW BALANCE: " + balance.toFixed(2) + " XRD (threshold: " + alertThreshold + ")");
    }
    if (balance < 1) {
      disableSigner("Wallet balance too low: " + balance.toFixed(2) + " XRD");
    }

    return { ok: true, balance, alert: balance < alertThreshold };
  } catch (e) {
    return { error: "balance_check_failed", detail: e.message };
  }
}

module.exports = {
  init,
  signAndSubmit,
  releaseTask,
  forceCancel,
  expireTask,
  updateXp,
  payArbiter,
  disableSigner,
  enableSigner,
  isEnabled,
  getSignerStatus,
  getAuditLog,
  checkBalance,
};
