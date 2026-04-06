/**
 * cv2-bridge.js — Bridge between TG proposals and CV2 on-chain governance
 *
 * When a proposal is created in Telegram, this optionally submits it
 * as a CV2 temperature check on-chain using the bot's signer account.
 *
 * Flow: TG proposal created → bridge submits CV2 temp check → bot syncs it back
 *
 * Feature-flagged: requires CV2_ENABLED=true AND BOT_PRIVATE_KEY set
 */

const path = require("path");
const fs = require("fs");

let signer = null;
let lastBridgeTime = 0;
const BRIDGE_COOLDOWN = 60000; // 1 minute between bridges (prevents XRD drain)

function isEnabled() {
  return process.env.CV2_ENABLED === "true" && !!process.env.BOT_PRIVATE_KEY;
}

function init() {
  if (!isEnabled()) return;
  try {
    signer = require("../../scripts/signer");
    console.log("[CV2-Bridge] Initialized — TG proposals will be bridged to CV2");
  } catch (err) {
    console.log("[CV2-Bridge] Signer not available:", err.message);
    signer = null;
  }
}

/**
 * Bridge a TG proposal to an on-chain CV2 temperature check
 * @param {string} title — proposal title
 * @param {string} description — proposal description
 * @param {string[]} options — vote options (default: ["For", "Against"])
 * @returns {Promise<{ok: boolean, txId?: string, error?: string}>}
 */
async function bridgeToChain(title, description, options = ["For", "Against"]) {
  if (!isEnabled() || !signer) {
    return { ok: false, error: "CV2 bridge not enabled" };
  }

  // Rate limit: 1 bridge per minute (prevents XRD drain from spam)
  const now = Date.now();
  if (now - lastBridgeTime < BRIDGE_COOLDOWN) {
    return { ok: false, error: "Bridge rate limited (1/min)" };
  }
  lastBridgeTime = now;

  const component = process.env.CV2_COMPONENT;
  const account = process.env.RADIX_ACCOUNT_ADDRESS;
  if (!component || !account) {
    return { ok: false, error: "CV2_COMPONENT or RADIX_ACCOUNT_ADDRESS not set" };
  }
  // Validate addresses from env
  if (!/^component_rdx1[a-z0-9]{40,65}$/.test(component)) {
    return { ok: false, error: "Invalid CV2_COMPONENT address" };
  }
  if (!/^account_rdx1[a-z0-9]{40,65}$/.test(account)) {
    return { ok: false, error: "Invalid RADIX_ACCOUNT_ADDRESS" };
  }

  // Sanitize inputs
  const clean = (s) => s.replace(/["\\\n\r;]/g, "").slice(0, 500);
  const t = clean(title);
  const desc = clean(description || title);
  const opts = options.map(o => `Tuple("${clean(o)}")`).join(", ");

  const manifest = `CALL_METHOD
  Address("${component}")
  "make_temperature_check"
  Address("${account}")
  Tuple(
    "${t}",
    "${t}",
    "${desc}",
    Array<Tuple>(${opts}),
    Array<String>(),
    Enum<0u8>()
  )
;
CALL_METHOD
  Address("${account}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;

  try {
    const result = await signer.signAndSubmit(manifest);
    console.log(`[CV2-Bridge] Bridged "${t}" to chain: ${result.txId || "submitted"}`);
    return { ok: true, txId: result.txId };
  } catch (err) {
    console.error(`[CV2-Bridge] Failed to bridge "${t}":`, err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { init, isEnabled, bridgeToChain };
