#!/usr/bin/env node
/**
 * xp-batch-signer.js — Reads pending XP from bot API, writes to on-chain badges
 * Run via cron or manually: node scripts/xp-batch-signer.js
 */

/**
 * SETUP REQUIRED:
 * 1. The signer account must hold the v3 admin badge:
 *    resource_rdx1t4qyd9hwyk6rpt4006fysaw68lkuy7almctwppvw7j9m8cqvzgn6ea
 *    Transfer it from the dApp def account via Radix Dashboard.
 * 2. The .env must have RADIX_ACCOUNT_ADDRESS set to the signer account.
 */

require("dotenv").config({ path: process.env.SIGNER_ENV || "/opt/sats/engine/.env" });
const { signAndSubmit, waitForCommit } = require(process.env.SIGNER_MODULE || "/opt/sats/engine/src/radix/signer");

const API_URL = process.env.BOT_API_URL || "http://localhost:3003";
const MANAGER = "component_rdx1cz0fkhg86y33afk5jztxeqdxjz6hhzexla7u8fkrwfx5ekn3xdlf3u";
const BADGE_NFT = "resource_rdx1ntxy3j2zclysyr99h3ayrvh92h0rhy3tmmwst9j4r8akeaj4u0qcn4";
const ADMIN_BADGE = "resource_rdx1t4qyd9hwyk6rpt4006fysaw68lkuy7almctwppvw7j9m8cqvzgn6ea";
const ACCOUNT = process.env.RADIX_ACCOUNT_ADDRESS;
const GATEWAY = "https://mainnet.radixdlt.com";

async function getBadgeNfId(radixAddress) {
  const resp = await fetch(GATEWAY + "/state/entity/details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addresses: [radixAddress],
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

async function getCurrentXp(nfId) {
  const resp = await fetch(GATEWAY + "/state/non-fungible/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource_address: BADGE_NFT, non_fungible_ids: [nfId] }),
  });
  const data = await resp.json();
  const fields = data.non_fungible_ids?.[0]?.data?.programmatic_json?.fields;
  if (!fields) return 0;
  return parseInt(fields[6]?.value || "0") || 0;
}

async function main() {
  console.log("\n  XP Batch Signer");
  console.log("  Account:", ACCOUNT?.slice(0, 30) + "...");

  // Get pending XP from bot API
  const resp = await fetch(API_URL + "/api/xp-queue");
  if (!resp.ok) { console.log("  Error fetching XP queue:", resp.status); return; }
  const { data: queue } = await resp.json();

  if (!queue || queue.length === 0) {
    console.log("  No pending XP rewards.");
    return;
  }

  console.log("  Pending:", queue.length, "addresses\n");

  for (const entry of queue) {
    const { address, pendingXp } = entry;
    console.log("  Processing:", address.slice(0, 25) + "... (+" + pendingXp + " XP)");

    // Get badge NFT ID
    const nfId = await getBadgeNfId(address);
    if (!nfId) {
      console.log("    No badge found — skipping");
      continue;
    }

    // Get current XP
    const currentXp = await getCurrentXp(nfId);
    const newXp = currentXp + pendingXp;

    console.log("    Badge:", nfId);
    console.log("    Current XP:", currentXp, "→ New XP:", newXp);

    // Build and submit TX
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
      '  "update_xp"',
      '  NonFungibleLocalId("' + nfId + '")',
      '  ' + newXp + 'u64',
      ';',
    ].join('\n');

    try {
      const { intentHash } = await signAndSubmit(manifest);
      console.log("    TX:", intentHash);
      const result = await waitForCommit(intentHash, 90000);
      console.log("    Status:", result.success ? "SUCCESS" : "FAILED");
    } catch (e) {
      console.log("    Error:", e.message);
    }
  }

  console.log("\n  Done.");
}

main().catch(e => console.log("Error:", e.message));
