#!/usr/bin/env node
/**
 * bounty-batch-payer.js — Reads approved bounties from bot API, releases XRD from escrow wallet
 * Run via cron (every hour) or manually: node scripts/bounty-batch-payer.js
 */

/**
 * SETUP REQUIRED:
 * 1. The signer account must hold the v4 admin badge:
 *    resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe
 * 2. The escrow wallet (ESCROW_ACCOUNT_ADDRESS) must hold enough XRD to cover all bounties.
 * 3. Env: SIGNER_ENV, SIGNER_MODULE, BOT_API_URL, RADIX_ACCOUNT_ADDRESS, ESCROW_ACCOUNT_ADDRESS, ADMIN_API_KEY
 */

require("dotenv").config({ path: process.env.SIGNER_ENV || "/opt/guild/signer/.env" });
const { signAndSubmit, waitForCommit } = require(process.env.SIGNER_MODULE || "/opt/guild/signer/src/radix/signer");

const API_URL = process.env.BOT_API_URL || "http://localhost:3003";
const ADMIN_BADGE = "resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe";
const ACCOUNT = process.env.RADIX_ACCOUNT_ADDRESS;
const ESCROW_ACCOUNT = process.env.ESCROW_ACCOUNT_ADDRESS || ACCOUNT;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

async function apiGet(path) {
  const resp = await fetch(API_URL + path);
  if (!resp.ok) throw new Error("API GET " + path + " failed: " + resp.status);
  return resp.json();
}

async function apiPost(path, body) {
  const resp = await fetch(API_URL + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ADMIN_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error("API POST " + path + " failed: " + resp.status);
  return resp.json();
}

function buildXrdTransferManifest(toAddress, amountXrd) {
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
    '  Address("' + ESCROW_ACCOUNT + '")',
    '  "withdraw"',
    '  Address("resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd")',
    '  Decimal("' + amountXrd + '")',
    ';',
    'CALL_METHOD',
    '  Address("' + toAddress + '")',
    '  "try_deposit_batch_or_abort"',
    '  Expression("ENTIRE_WORKTOP")',
    '  Enum<0u8>()',
    ';',
  ].join('\n');
}

async function main() {
  console.log("\n  Bounty Batch Payer");
  console.log("  Account:", ACCOUNT?.slice(0, 30) + "...");
  console.log("  Escrow:", ESCROW_ACCOUNT?.slice(0, 30) + "...");

  if (!ACCOUNT) { console.error("  RADIX_ACCOUNT_ADDRESS not set"); return; }

  // Get approved bounties pending payment
  const { data: pending } = await apiGet("/api/bounties/pending-payment");

  if (!pending || pending.length === 0) {
    console.log("  No bounties pending payment.");
    return;
  }

  console.log("  Pending:", pending.length, "bounties\n");

  const released = [];

  for (const bounty of pending) {
    const { id, claimed_by_address, reward_xrd, title } = bounty;

    if (!claimed_by_address) {
      console.log("  #" + id + " '" + title + "' — no claimer address, skipping");
      continue;
    }

    console.log("  Processing bounty #" + id + ": " + title);
    console.log("    Claimer:", claimed_by_address.slice(0, 30) + "...");
    console.log("    Amount: " + reward_xrd + " XRD");

    const manifest = buildXrdTransferManifest(claimed_by_address, reward_xrd);

    try {
      const { intentHash } = await signAndSubmit(manifest);
      console.log("    TX submitted:", intentHash);
      const result = await waitForCommit(intentHash, 90000);
      console.log("    Status:", result.success ? "SUCCESS" : "FAILED");

      if (result.success) {
        released.push({ bounty_id: id, claimer: claimed_by_address, tx_hash: intentHash });
      }
    } catch (e) {
      console.log("    Error:", e.message);
    }
  }

  if (released.length > 0) {
    // Notify bot API of successful releases
    await apiPost("/api/bounties/release-payment", { released });
    console.log("\n  Marked " + released.length + " bounties as paid in DB.");
  }

  console.log("\n  Done. Released: " + released.length + "/" + pending.length);
}

main().catch(e => console.error("Error:", e.message));
