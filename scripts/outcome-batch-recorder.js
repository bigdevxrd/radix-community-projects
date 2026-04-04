#!/usr/bin/env node
/**
 * outcome-batch-recorder.js — Reads pending proposal outcomes from bot API,
 * writes each outcome to on-chain badge extra_data via update_extra_data().
 *
 * Follows the same pattern as xp-batch-signer.js.
 * Run via cron or manually: node scripts/outcome-batch-recorder.js
 *
 * SETUP REQUIRED:
 * 1. The signer account must hold the admin badge.
 * 2. Set environment variables (see docs/OUTCOME-RECORDER.md):
 *    BOT_API_URL, RADIX_ACCOUNT_ADDRESS, SIGNER_ENV, SIGNER_MODULE
 */

require("dotenv").config({ path: process.env.SIGNER_ENV || "/opt/guild/signer/.env" });
const { signAndSubmit, waitForCommit } = require(process.env.SIGNER_MODULE || "/opt/guild/signer/src/radix/signer");

const API_URL = process.env.BOT_API_URL || "http://localhost:3003";
const MANAGER = "component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva";
const BADGE_NFT = "resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl";
const ADMIN_BADGE = "resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe";
const ACCOUNT = process.env.RADIX_ACCOUNT_ADDRESS;
const GATEWAY = "https://mainnet.radixdlt.com";

// Use a well-known governance badge NFT ID to record proposal outcomes.
// The badge that holds governance history is the DAO's admin/governance badge.
const GOVERNANCE_BADGE_ID = process.env.GOVERNANCE_BADGE_NFT_ID || null;

async function getGovernanceBadgeId() {
  if (GOVERNANCE_BADGE_ID) return GOVERNANCE_BADGE_ID;
  // Fall back: look up the first badge NFT held by the signer account
  const resp = await fetch(GATEWAY + "/state/entity/details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addresses: [ACCOUNT],
      aggregation_level: "Vault",
      opt_ins: { non_fungible_include_nfids: true },
    }),
  });
  const data = await resp.json();
  const nfRes = data.items?.[0]?.non_fungible_resources?.items || [];
  const badgeRes = nfRes.find(r => r.resource_address === BADGE_NFT);
  if (!badgeRes) return null;
  return badgeRes.vaults?.items?.[0]?.items?.[0] || null;
}

function buildOutcomeManifest(badgeNfId, outcomeJson) {
  // Escape double-quotes inside the JSON string for the manifest string literal
  const escaped = outcomeJson.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return [
    'CALL_METHOD',
    '  Address("' + ACCOUNT + '")',
    '  "lock_fee"',
    '  Decimal("10")',
    ';',
    'CALL_METHOD',
    '  Address("' + ACCOUNT + '")',
    '  "create_proof_of_amount"',
    '  Address("' + ADMIN_BADGE + '")',
    '  Decimal("1")',
    ';',
    'CALL_METHOD',
    '  Address("' + MANAGER + '")',
    '  "update_extra_data"',
    '  NonFungibleLocalId("' + badgeNfId + '")',
    '  "' + escaped + '"',
    ';',
  ].join('\n');
}

async function main() {
  console.log("\n  Outcome Batch Recorder");
  console.log("  Account:", ACCOUNT ? ACCOUNT.slice(0, 30) + "..." : "(not set)");

  if (!ACCOUNT) {
    console.log("  ERROR: RADIX_ACCOUNT_ADDRESS not set.");
    process.exit(1);
  }

  // Fetch pending outcomes from bot API
  const resp = await fetch(API_URL + "/api/outcomes-queue");
  if (!resp.ok) {
    console.log("  Error fetching outcomes queue:", resp.status);
    return;
  }
  const { data: queue } = await resp.json();

  if (!queue || queue.length === 0) {
    console.log("  No pending outcomes to record.");
    return;
  }

  console.log("  Pending:", queue.length, "outcomes\n");

  // Get governance badge NFT ID once
  const badgeNfId = await getGovernanceBadgeId();
  if (!badgeNfId) {
    console.log("  ERROR: No governance badge NFT found for account", ACCOUNT ? ACCOUNT.slice(0, 30) + "..." : "(not set)");
    return;
  }
  console.log("  Governance badge NFT ID:", badgeNfId, "\n");

  for (const entry of queue) {
    const { id, title, status, outcome_data } = entry;
    console.log("  Processing proposal #" + id + ": " + title);
    console.log("    Status:", status, "| Winner:", outcome_data.winner, "| Votes:", outcome_data.total_votes);

    const outcomeJson = JSON.stringify({
      proposal_id: id,
      winner: outcome_data.winner,
      result: outcome_data.result,
      total_votes: outcome_data.total_votes,
      timestamp: Math.floor(Date.now() / 1000),
    });

    const manifest = buildOutcomeManifest(badgeNfId, outcomeJson);

    try {
      const { intentHash } = await signAndSubmit(manifest);
      console.log("    TX:", intentHash);
      const result = await waitForCommit(intentHash, 90000);
      console.log("    Status:", result.success ? "SUCCESS" : "FAILED");

      if (result.success) {
        // Mark outcome as recorded in the bot database via API
        const markResp = await fetch(API_URL + "/api/outcomes-queue/" + id + "/mark-recorded", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tx_hash: intentHash, outcome_data }),
        });
        if (markResp.ok) {
          console.log("    Marked as recorded in database.");
        } else {
          console.log("    Warning: failed to mark as recorded:", markResp.status);
        }
      }
    } catch (e) {
      console.log("    Error:", e.message);
    }
  }

  console.log("\n  Done.");
}

main().catch(e => console.log("Error:", e.message));

