/**
 * cv2-bridge.js — Bridge between TG proposals and CV2 on-chain governance
 *
 * NO AUTO-SIGNING. The bot does not hold a private key or submit transactions.
 * Users sign their own transactions through the Radix Wallet via the dashboard.
 *
 * This module tracks which TG proposals should have CV2 equivalents and
 * notifies users to create the on-chain version via the dashboard.
 *
 * Flow: TG proposal created → bot replies with dashboard link → user signs
 *       with Radix Wallet → CV2 temp check created on-chain
 */

function isEnabled() {
  return process.env.CV2_ENABLED === "true";
}

function init() {
  if (!isEnabled()) return;
  console.log("[CV2-Bridge] Initialized — dashboard link mode (no auto-signing)");
}

/**
 * Get the dashboard URL for creating an on-chain version of a TG proposal
 * @param {string} title — proposal title
 * @returns {string} dashboard URL
 */
function getDashboardLink(title) {
  const portal = process.env.PORTAL_URL || "https://radixguild.com";
  return portal + "/proposals";
}

module.exports = { init, isEnabled, getDashboardLink };
