#!/usr/bin/env node
/**
 * pipeline-test.js — Programmatic test of the full Guild pipeline
 * Run: node scripts/pipeline-test.js
 */

const API = process.env.API_URL || "https://156-67-219-105.sslip.io/api";
const GUILD = process.env.GUILD_URL || "https://156-67-219-105.sslip.io/guild";
const GATEWAY = "https://mainnet.radixdlt.com";
const BADGE_NFT = "resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl";
const MANAGER = "component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva";
const TEST_ACCOUNT = "account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log("  ✅ " + name);
    passed++;
  } catch (e) {
    console.log("  ❌ " + name + " — " + e.message);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

async function fetchJson(url, opts) {
  const resp = await fetch(url, opts);
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return resp.json();
}

async function main() {
  console.log("\n  Radix Governance Pipeline Test\n");

  // ── API Tests ──────────────────────────────────────

  console.log("  API:");

  await test("GET /api/stats returns ok", async () => {
    const data = await fetchJson(API + "/stats");
    assert(data.ok === true, "ok should be true");
    assert(typeof data.data.total_proposals === "number", "total_proposals should be number");
    assert(typeof data.data.total_voters === "number", "total_voters should be number");
    assert(typeof data.data.active_proposals === "number", "active_proposals should be number");
  });

  await test("GET /api/proposals returns array", async () => {
    const data = await fetchJson(API + "/proposals");
    assert(data.ok === true, "ok should be true");
    assert(Array.isArray(data.data), "data should be array");
    assert(data.data.length > 0, "should have proposals");
  });

  await test("GET /api/proposals?status=active filters correctly", async () => {
    const data = await fetchJson(API + "/proposals?status=active");
    assert(data.ok === true);
    data.data.forEach(p => assert(p.status === "active", "all should be active"));
  });

  await test("GET /api/proposals/999 returns 404", async () => {
    const resp = await fetch(API + "/proposals/999");
    assert(resp.status === 404, "should be 404");
  });

  await test("GET /api/xp-queue returns array", async () => {
    const data = await fetchJson(API + "/xp-queue");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("GET /api/unknown returns 404", async () => {
    const resp = await fetch(API + "/unknown");
    assert(resp.status === 404);
  });

  await test("GET /api/badge/:address returns badge data", async () => {
    const data = await fetchJson(API + "/badge/" + TEST_ACCOUNT);
    assert(data.ok === true, "ok should be true");
    assert(data.data.tier, "should have tier");
    assert(data.data.issued_to, "should have issued_to");
  });

  await test("GET /api/badge/:address/verify returns hasBadge", async () => {
    const data = await fetchJson(API + "/badge/" + TEST_ACCOUNT + "/verify");
    assert(data.ok === true, "ok should be true");
    assert(data.hasBadge === true, "test account should have badge");
  });

  await test("GET /api/badge/account_rdx1invalid/verify returns false", async () => {
    const resp = await fetch(API + "/badge/account_rdx1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/verify");
    const data = await resp.json();
    assert(data.ok === true);
    assert(data.hasBadge === false, "fake address should have no badge");
  });

  // ── Dashboard Tests ────────────────────────────────

  console.log("\n  Dashboard:");

  await test("GET /guild returns 200", async () => {
    const resp = await fetch(GUILD);
    assert(resp.ok, "should be 200");
    const html = await resp.text();
    assert(html.includes("Radix Governance"), "should contain title");
  });

  await test("GET /guild/proposals returns 200", async () => {
    const resp = await fetch(GUILD + "/proposals");
    assert(resp.ok, "should be 200");
  });

  await test("GET /guild/admin returns 200", async () => {
    const resp = await fetch(GUILD + "/admin");
    assert(resp.ok, "should be 200");
  });

  await test("GET /guild/mint returns 200", async () => {
    const resp = await fetch(GUILD + "/mint");
    assert(resp.ok, "should be 200");
  });

  // ── Radix Gateway Tests ────────────────────────────

  console.log("\n  Radix Gateway:");

  await test("Gateway API reachable", async () => {
    const data = await fetchJson(GATEWAY + "/status/gateway-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert(data.ledger_state, "should have ledger_state");
  });

  await test("Badge Manager component exists on-chain", async () => {
    const data = await fetchJson(GATEWAY + "/state/entity/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: [MANAGER] }),
    });
    assert(data.items && data.items.length > 0, "component should exist");
    assert(data.items[0].details.type === "Component", "should be Component");
  });

  await test("Badge NFT resource exists on-chain", async () => {
    const data = await fetchJson(GATEWAY + "/state/entity/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: [BADGE_NFT] }),
    });
    assert(data.items && data.items.length > 0, "resource should exist");
  });

  // ── Proposal Data Integrity ────────────────────────

  console.log("\n  Data Integrity:");

  await test("All active proposals have valid fields", async () => {
    const data = await fetchJson(API + "/proposals?status=active");
    data.data.forEach(p => {
      assert(p.id > 0, "id should be positive");
      assert(p.title && p.title.length > 0, "title should exist");
      assert(p.status === "active", "status should be active");
      assert(p.ends_at > 0, "ends_at should be set");
      assert(p.created_at > 0, "created_at should be set");
      assert(typeof p.counts === "object", "counts should be object");
    });
  });

  await test("Vote counts are consistent", async () => {
    const data = await fetchJson(API + "/proposals");
    data.data.forEach(p => {
      const counted = Object.values(p.counts).reduce((a, b) => a + b, 0);
      assert(counted === p.total_votes, "vote count mismatch on #" + p.id);
    });
  });

  await test("Stats totals are consistent", async () => {
    const stats = await fetchJson(API + "/stats");
    const proposals = await fetchJson(API + "/proposals");
    assert(stats.data.total_proposals === proposals.data.length, "proposal count mismatch");
  });

  // ── Summary ────────────────────────────────────────

  console.log("\n  Results: " + passed + " passed, " + failed + " failed");
  console.log("  " + (failed === 0 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"));
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("Test runner error:", e.message);
  process.exit(1);
});
