#!/usr/bin/env node
/**
 * seed-temp-checks.js — Create temp checks for all decisions
 *
 * Creates non-binding temp check proposals for every decision
 * that doesn't already have one, and links them.
 *
 * Run: node scripts/seed-temp-checks.js
 * Safe to re-run — skips decisions that already have a linked temp check.
 */

const API = process.env.API_URL || "https://radixguild.com/api";
const ADMIN_ADDR = "account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq";

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function main() {
  console.log("Fetching decisions...");
  const resp = await fetch(API + "/decisions");
  const data = await resp.json();
  const decisions = data.data;

  console.log(`Found ${decisions.length} decisions\n`);

  let created = 0;
  let skipped = 0;

  for (const d of decisions) {
    // Skip if already has an active temp check
    if (d.proposal && d.proposal.type === "temp" && d.proposal.status === "active") {
      console.log(`  SKIP #${d.id} ${d.title} — already has active temp check`);
      skipped++;
      continue;
    }

    // Create temp check
    const title = `TC: ${d.title}`;
    const result = await postJson(API + "/proposals", {
      title: title.slice(0, 200),
      description: d.summary,
      type: "temp",
      options: ["Yes!", "Maybe", "No"],
      days_active: 7,
      min_votes: 1,
      address: ADMIN_ADDR,
    });

    if (result.ok) {
      console.log(`  ✅ #${d.id} ${d.title} → proposal #${result.data.id}`);
      created++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } else {
      console.log(`  ❌ #${d.id} ${d.title} — ${result.error}`);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  console.log("\nNOTE: Run the link-decisions script on VPS to connect proposals to decisions.");
}

main().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
