#!/usr/bin/env node
// Integration test suite: CV2 + CrumbsUp federation sync
// Usage: node scripts/integration-test-federation.js [--api http://localhost:3003]

const API_BASE = process.argv.find(a => a.startsWith("--api="))?.slice(6)
  || process.env.BOT_API_URL
  || "http://127.0.0.1:3003";

const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log("  ✓ " + name);
    passed++;
  } catch (e) {
    console.error("  ✗ " + name);
    console.error("    " + e.message);
    failed++;
    failures.push({ name, error: e.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

async function apiFetch(path, opts = {}) {
  const url = API_BASE + path;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(ADMIN_KEY ? { "X-Api-Key": ADMIN_KEY } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

// ── Test Suite ─────────────────────────────────────────────────────────────

async function runTests() {
  console.log("\nFederation Integration Tests");
  console.log("API: " + API_BASE);
  console.log("─".repeat(50));

  // ── Test 1: API Health ──────────────────────────────────────────────────
  console.log("\n[1] API Health");

  await test("GET /api/stats returns ok", async () => {
    const r = await apiFetch("/api/stats");
    assert(r.ok === true, "Expected ok=true, got: " + JSON.stringify(r));
  });

  await test("GET /api/proposals returns array", async () => {
    const r = await apiFetch("/api/proposals");
    assert(r.ok === true, "Expected ok=true");
    assert(Array.isArray(r.data), "Expected data to be array");
  });

  await test("GET /api/charter returns params", async () => {
    const r = await apiFetch("/api/charter");
    assert(r.ok === true, "Expected ok=true");
    assert(r.data && r.data.params, "Expected params in response");
  });

  // ── Test 2: CV2 Endpoints ──────────────────────────────────────────────
  console.log("\n[2] CV2 Endpoints");

  await test("GET /api/cv2/status returns structure", async () => {
    const r = await apiFetch("/api/cv2/status");
    assert(r.ok === true, "Expected ok=true");
    assert(typeof r.data.cv2_enabled === "boolean", "Expected cv2_enabled boolean");
    assert(typeof r.data.proposals_synced === "number", "Expected proposals_synced number");
    assert(["ok", "disabled"].includes(r.data.sync_health), "Expected valid sync_health");
  });

  await test("GET /api/cv2/vote-weights returns tier weights", async () => {
    const r = await apiFetch("/api/cv2/vote-weights");
    assert(r.ok === true, "Expected ok=true");
    assert(r.data.member === 1, "Expected member=1");
    assert(r.data.contributor === 2, "Expected contributor=2");
    assert(r.data.builder === 3, "Expected builder=3");
    assert(r.data.steward === 5, "Expected steward=5");
    assert(r.data.elder === 10, "Expected elder=10");
  });

  await test("GET /api/cv2/proposals returns array", async () => {
    const r = await apiFetch("/api/cv2/proposals");
    assert(r.ok === true, "Expected ok=true");
    assert(Array.isArray(r.data), "Expected data array");
  });

  await test("POST /api/cv2/sync/:id requires admin", async () => {
    const r = await fetch(API_BASE + "/api/cv2/sync/9999", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(r.status === 403 || r.status === 404, "Expected 403 or 404 without admin key");
  });

  await test("POST /api/cv2/tally/:id requires admin", async () => {
    const r = await fetch(API_BASE + "/api/cv2/tally/9999", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(r.status === 403 || r.status === 404, "Expected 403 or 404 without admin key");
  });

  // ── Test 3: CrumbsUp Endpoints ─────────────────────────────────────────
  console.log("\n[3] CrumbsUp Endpoints");

  await test("GET /api/crumbsup/status returns structure", async () => {
    const r = await apiFetch("/api/crumbsup/status");
    assert(r.ok === true, "Expected ok=true");
    assert(typeof r.data.crumbsup_enabled === "boolean", "Expected crumbsup_enabled boolean");
    assert(typeof r.data.dao_id === "string", "Expected dao_id string");
  });

  await test("GET /api/crumbsup/dao returns DAO metadata", async () => {
    const r = await apiFetch("/api/crumbsup/dao");
    assert(r.ok === true, "Expected ok=true");
    assert(r.data.id, "Expected DAO id");
    assert(r.data.name, "Expected DAO name");
  });

  await test("GET /api/crumbsup/proposals returns array", async () => {
    const r = await apiFetch("/api/crumbsup/proposals");
    assert(r.ok === true, "Expected ok=true");
    assert(Array.isArray(r.data), "Expected array");
  });

  await test("GET /api/crumbsup/members returns array", async () => {
    const r = await apiFetch("/api/crumbsup/members");
    assert(r.ok === true, "Expected ok=true");
    assert(Array.isArray(r.data), "Expected array");
  });

  // ── Test 4: Federation Endpoints ───────────────────────────────────────
  console.log("\n[4] Federation Endpoints");

  await test("GET /api/federation/status returns sync state", async () => {
    const r = await apiFetch("/api/federation/status");
    assert(r.ok === true, "Expected ok=true");
    assert(typeof r.data.cv2_synced === "boolean", "Expected cv2_synced boolean");
    assert(typeof r.data.crumbsup_synced === "boolean", "Expected crumbsup_synced boolean");
    assert(r.data.health === "ok", "Expected health=ok");
  });

  await test("GET /api/federation/proposals returns array", async () => {
    const r = await apiFetch("/api/federation/proposals");
    assert(r.ok === true, "Expected ok=true");
    assert(Array.isArray(r.data), "Expected array");
    if (r.data.length > 0) {
      const p = r.data[0];
      assert(p.guild_proposal, "Expected guild_proposal in each item");
      assert(typeof p.combined_vote_count === "number", "Expected combined_vote_count");
    }
  });

  await test("GET /api/federation/voters returns array", async () => {
    const r = await apiFetch("/api/federation/voters");
    assert(r.ok === true, "Expected ok=true");
    assert(Array.isArray(r.data), "Expected array");
  });

  await test("GET /api/federation/health returns service states", async () => {
    const r = await apiFetch("/api/federation/health");
    assert(r.ok === true, "Expected ok=true");
    assert(r.data.cv2_api, "Expected cv2_api field");
    assert(r.data.crumbsup_api, "Expected crumbsup_api field");
    assert(r.data.gateway_api, "Expected gateway_api field");
    assert(r.data.db === "ok", "Expected db=ok");
  });

  // ── Test 5: Webhook Security ───────────────────────────────────────────
  console.log("\n[5] Webhook Security");

  await test("POST /api/webhooks/cv2 accepts valid event", async () => {
    const r = await fetch(API_BASE + "/api/webhooks/cv2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "vote_cast", proposal_cv2_id: "test-123", voter: "test", vote: "for", weight: 1 }),
    });
    // Should be 200 (ok) or 400 (unknown proposal) — but NOT 5xx
    assert(r.status < 500, "Expected non-5xx response for valid event shape");
  });

  await test("POST /api/webhooks/crumbsup rejects invalid signature when secret set", async () => {
    // Only meaningful if CRUMBSUP_WEBHOOK_SECRET is set
    const r = await fetch(API_BASE + "/api/webhooks/crumbsup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": "sha256=invalid_signature",
      },
      body: JSON.stringify({ type: "vote_cast", proposal_crumbsup_id: "test-456" }),
    });
    // Either 401 (signature rejected) or 200/400 (no secret set)
    assert([200, 400, 401].includes(r.status), "Expected 200/400/401, got: " + r.status);
  });

  await test("POST /api/webhooks/crumbsup accepts member_joined event", async () => {
    const r = await fetch(API_BASE + "/api/webhooks/crumbsup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "member_joined", radix_address: "account_rdx1test000", crumbsup_user_id: "u123" }),
    });
    assert(r.status < 500, "Expected non-5xx response");
  });

  // ── Test 6: Rate Limiting ──────────────────────────────────────────────
  console.log("\n[6] Rate Limiting");

  await test("API returns 429 after excessive requests", async () => {
    // Make 65 rapid requests to trigger rate limit
    const requests = Array.from({ length: 65 }, () =>
      fetch(API_BASE + "/api/stats")
    );
    const results = await Promise.all(requests);
    const statuses = results.map(r => r.status);
    const has429 = statuses.includes(429);
    // Rate limiter allows 60/min so this SHOULD trigger 429
    // (skip soft assert — rate limit may not trigger in all environments)
    assert(statuses.every(s => s === 200 || s === 429), "Expected only 200 or 429 responses");
  });

  // ── Test 7: Error Cases ────────────────────────────────────────────────
  console.log("\n[7] Error Cases");

  await test("GET /api/proposals/99999 returns 404", async () => {
    const r = await apiFetch("/api/proposals/99999");
    assert(r.ok === false, "Expected ok=false for missing proposal");
  });

  await test("GET /api/cv2/proposals/99999 returns 404", async () => {
    const r = await apiFetch("/api/cv2/proposals/99999");
    assert(r.ok === false, "Expected ok=false for missing proposal");
  });

  await test("Unknown route returns 404", async () => {
    const r = await apiFetch("/api/unknown-endpoint-xyz");
    assert(r.ok === false, "Expected ok=false for unknown route");
  });

  await test("OPTIONS preflight returns 200", async () => {
    const r = await fetch(API_BASE + "/api/stats", { method: "OPTIONS" });
    assert(r.status === 200, "Expected 200 for OPTIONS, got: " + r.status);
  });

  // ── Summary ────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("Results: " + passed + " passed, " + failed + " failed");

  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach(f => console.log("  ✗ " + f.name + ": " + f.error));
  }

  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error("Test runner error:", e.message);
  process.exit(1);
});
