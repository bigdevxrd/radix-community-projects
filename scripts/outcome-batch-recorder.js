#!/usr/bin/env node
/**
 * outcome-batch-recorder.js — Records proposal outcomes on-chain
 * Reads pending outcomes from bot API, writes result JSON to badge extra_data
 * Run via cron or manually: node scripts/outcome-batch-recorder.js
 */

/**
 * SETUP REQUIRED:
 * 1. The signer account must hold the v4 admin badge:
 *    resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe
 *    Transfer it from the dApp def account via Radix Dashboard.
 * 2. The .env must have RADIX_ACCOUNT_ADDRESS set to the signer account.
 */

require("dotenv").config({ path: process.env.SIGNER_ENV || "/opt/guild/signer/.env" });
const { signAndSubmit, waitForCommit } = require(process.env.SIGNER_MODULE || "/opt/guild/signer/src/radix/signer");

const API_URL = process.env.BOT_API_URL || "http://localhost:3003";
const MANAGER = "component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva";
const ADMIN_BADGE = "resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe";
const ACCOUNT = process.env.RADIX_ACCOUNT_ADDRESS;

async function recordOutcomeOnChain(proposalId, outcomeJson) {
  const outcomeStr = JSON.stringify(outcomeJson).replace(/"/g, '\\"');
  const nfId = "guild_proposal_" + proposalId;

  const manifest = [
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
    '  NonFungibleLocalId("' + nfId + '")',
    '  "' + outcomeStr + '"',
    ';',
  ].join('\n');

  const { intentHash } = await signAndSubmit(manifest);
  console.log("    TX:", intentHash);
  const result = await waitForCommit(intentHash, 90000);
  console.log("    Status:", result.success ? "SUCCESS" : "FAILED");
  return { success: result.success, txHash: intentHash };
}

async function markOutcomeRecorded(proposalId, txHash, outcomeJson) {
  const resp = await fetch(API_URL + "/api/outcomes/" + proposalId + "/recorded", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx_hash: txHash, outcome: outcomeJson }),
  });
  if (!resp.ok) {
    console.log("    Warning: failed to mark outcome recorded:", resp.status);
  }
}

async function main() {
  console.log("\n  Outcome Batch Recorder");

  // Get pending outcomes from bot API
  const resp = await fetch(API_URL + "/api/outcomes-pending");
  if (!resp.ok) { console.log("  Error fetching pending outcomes:", resp.status); return; }
  const { data: pending } = await resp.json();

  if (!pending || pending.length === 0) {
    console.log("  No pending outcomes to record.");
    return;
  }

  console.log("  Pending:", pending.length, "proposals\n");

  for (const outcome of pending) {
    console.log("  Recording #" + outcome.id + " (" + outcome.status + "): " + outcome.title.slice(0, 50));

    const outcomeJson = {
      proposal_id: outcome.id,
      title: outcome.title,
      result: outcome.status,
      total_votes: outcome.total_votes,
      votes: outcome.counts,
      recorded_at: Math.floor(Date.now() / 1000),
    };

    try {
      const { success, txHash } = await recordOutcomeOnChain(outcome.id, outcomeJson);
      if (success) {
        await markOutcomeRecorded(outcome.id, txHash, outcomeJson);
      }
    } catch (e) {
      console.log("    Error:", e.message);
    }
  }

  console.log("\n  Done.");
}

main().catch(e => console.log("Error:", e.message));
