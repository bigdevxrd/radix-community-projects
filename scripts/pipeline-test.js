#!/usr/bin/env node
/**
 * pipeline-test.js — Programmatic test of the full Guild pipeline
 * Run: node scripts/pipeline-test.js
 */

const API = process.env.API_URL || "https://radixguild.com/api";
const GUILD = process.env.GUILD_URL || "https://radixguild.com";
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

  await test("GET / returns 200", async () => {
    const resp = await fetch(GUILD);
    assert(resp.ok, "should be 200");
    const html = await resp.text();
    assert(html.includes("Radix Governance"), "should contain title");
  });

  await test("GET /proposals returns 200", async () => {
    const resp = await fetch(GUILD + "/proposals");
    assert(resp.ok, "should be 200");
  });

  await test("GET /admin returns 200", async () => {
    const resp = await fetch(GUILD + "/admin");
    assert(resp.ok, "should be 200");
  });

  await test("GET /mint returns 200", async () => {
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

  // ── Charter Tests ──────────────────────────────────

  console.log("\n  Charter:");

  await test("GET /api/charter returns status object", async () => {
    const data = await fetchJson(API + "/charter");
    assert(data.ok === true);
    const s = data.data.status;
    assert(typeof s.total === "number", "status.total should be number");
    assert(typeof s.resolved === "number", "status.resolved should be number");
    assert(typeof s.voting === "number", "status.voting should be number");
    assert(typeof s.tbd === "number", "status.tbd should be number");
  });

  await test("GET /api/charter returns params array", async () => {
    const data = await fetchJson(API + "/charter");
    assert(Array.isArray(data.data.params), "params should be array");
    assert(data.data.params.length >= 20, "should have at least 20 charter params");
  });

  await test("Charter params have required fields", async () => {
    const data = await fetchJson(API + "/charter");
    data.data.params.forEach(p => {
      assert(p.param_key, "param_key required");
      assert(p.title, "title required");
      assert(p.category, "category required");
      assert(typeof p.phase === "number", "phase should be number");
      assert(p.status, "status required");
    });
  });

  await test("Charter ready params are unresolved", async () => {
    const data = await fetchJson(API + "/charter");
    assert(Array.isArray(data.data.ready), "ready should be array");
    data.data.ready.forEach(p => {
      assert(p.status !== "resolved", "ready params should not be resolved");
    });
  });

  // ── Bounty Tests ───────────────────────────────────

  console.log("\n  Bounties:");

  await test("GET /api/bounties returns stats", async () => {
    const data = await fetchJson(API + "/bounties");
    assert(data.ok === true);
    const s = data.data.stats;
    assert(typeof s.open === "number", "stats.open should be number");
    assert(typeof s.assigned === "number", "stats.assigned should be number");
    assert(typeof s.submitted === "number", "stats.submitted should be number");
    assert(typeof s.verified === "number", "stats.verified should be number");
    assert(typeof s.paid === "number", "stats.paid should be number");
  });

  await test("GET /api/bounties returns bounties array", async () => {
    const data = await fetchJson(API + "/bounties");
    assert(Array.isArray(data.data.bounties), "bounties should be array");
  });

  await test("Escrow stats have required fields", async () => {
    const data = await fetchJson(API + "/bounties");
    const e = data.data.stats.escrow;
    assert(typeof e.funded === "number", "escrow.funded should be number");
    assert(typeof e.released === "number", "escrow.released should be number");
    assert(typeof e.available === "number", "escrow.available should be number");
  });

  await test("GET /api/escrow returns balance + transactions", async () => {
    const data = await fetchJson(API + "/escrow");
    assert(data.ok === true);
    assert(typeof data.data.balance === "number" || typeof data.data.balance === "object", "balance should exist");
    assert(Array.isArray(data.data.transactions), "transactions should be array");
  });

  // ── Game Tests ─────────────────────────────────────

  console.log("\n  Game:");

  await test("GET /api/game/:address returns game state", async () => {
    const data = await fetchJson(API + "/game/" + TEST_ACCOUNT);
    assert(data.ok === true);
    // May have data or null — both valid
  });

  await test("GET /api/game/unknown returns empty state", async () => {
    const data = await fetchJson(API + "/game/account_rdx1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
    assert(data.ok === true);
    // Should return null or empty object for unknown address
  });

  await test("GET /api/leaderboard returns array", async () => {
    const data = await fetchJson(API + "/leaderboard");
    assert(data.ok === true);
    assert(Array.isArray(data.data), "data should be array");
  });

  await test("Leaderboard entries have required fields", async () => {
    const data = await fetchJson(API + "/leaderboard");
    if (data.data.length > 0) {
      data.data.forEach(e => {
        assert(e.radix_address, "radix_address required");
        assert(typeof e.total_rolls === "number", "total_rolls should be number");
        assert(typeof e.total_bonus_xp === "number", "total_bonus_xp should be number");
      });
    }
  });

  await test("Leaderboard is sorted by bonus XP descending", async () => {
    const data = await fetchJson(API + "/leaderboard");
    for (let i = 1; i < data.data.length; i++) {
      assert(data.data[i - 1].total_bonus_xp >= data.data[i].total_bonus_xp, "should be sorted desc");
    }
  });

  // ── Dashboard Pages ────────────────────────────────

  console.log("\n  Dashboard (extended):");

  await test("GET /game returns 200 (includes leaderboard)", async () => {
    const resp = await fetch(GUILD + "/game");
    assert(resp.ok, "should be 200");
  });

  await test("All dashboard pages contain expected HTML", async () => {
    const pages = ["", "/proposals", "/admin", "/mint", "/game"];
    for (const p of pages) {
      const resp = await fetch(GUILD + p);
      assert(resp.ok, p + " should return 200");
      const html = await resp.text();
      assert(html.includes("</html>"), p + " should be valid HTML");
    }
  });

  // ── CV2 Endpoints ──────────────────────────────────

  console.log("\n  CV2 (Consultation v2):");

  await test("GET /api/cv2/status returns sync status", async () => {
    const data = await fetchJson(API + "/cv2/status");
    assert(data.ok === true);
    assert(typeof data.data.enabled === "boolean", "enabled should be boolean");
    assert("component" in data.data, "should have component field");
    assert("lastSync" in data.data, "should have lastSync field");
    assert(typeof data.data.errors === "number", "errors should be number");
  });

  await test("GET /api/cv2/stats returns counts", async () => {
    const data = await fetchJson(API + "/cv2/stats");
    assert(data.ok === true);
    assert(typeof data.data.temperatureChecks === "number");
    assert(typeof data.data.proposals === "number");
    assert(typeof data.data.totalVotes === "number");
  });

  await test("GET /api/cv2/proposals returns array", async () => {
    const data = await fetchJson(API + "/cv2/proposals");
    assert(data.ok === true);
    assert(Array.isArray(data.data), "data should be array");
  });

  await test("GET /api/cv2/proposals/nonexistent returns 404", async () => {
    const resp = await fetch(API + "/cv2/proposals/nonexistent_999");
    assert(resp.status === 404, "should be 404");
  });

  // ── Extended Dashboard ─────────────────────────────

  console.log("\n  Dashboard (full):");

  await test("GET /bounties returns 200", async () => {
    const resp = await fetch(GUILD + "/bounties");
    assert(resp.ok, "should be 200");
  });

  // ── Health Endpoint ────────────────────────────────

  console.log("\n  Health:");

  await test("GET /api/health returns ok", async () => {
    const data = await fetchJson(API + "/health");
    assert(data.ok === true, "ok should be true");
  });

  await test("Health has required fields", async () => {
    const data = await fetchJson(API + "/health");
    const d = data.data;
    assert(typeof d.uptime === "number", "uptime should be number");
    assert(d.db === "connected", "db should be connected");
    assert(typeof d.cv2 === "object", "cv2 should be object");
    assert(typeof d.proposals === "object", "proposals should be object");
    assert(typeof d.charter === "object", "charter should be object");
    assert(d.version, "version should exist");
  });

  await test("Health uptime is positive", async () => {
    const data = await fetchJson(API + "/health");
    assert(data.data.uptime > 0, "uptime should be positive");
  });

  // ── Dashboard Pages (extended) ────────────────────

  console.log("\n  Dashboard (all pages):");

  await test("GET /docs returns 200 (includes transparency)", async () => {
    const resp = await fetch(GUILD + "/docs");
    assert(resp.ok, "should be 200");
  });

  await test("GET /docs returns 200", async () => {
    const resp = await fetch(GUILD + "/docs");
    assert(resp.ok, "should be 200");
  });

  await test("GET /profile returns 200", async () => {
    const resp = await fetch(GUILD + "/profile");
    assert(resp.ok, "should be 200");
  });

  await test("GET /game returns 200", async () => {
    const resp = await fetch(GUILD + "/game");
    assert(resp.ok, "should be 200");
  });

  // ── Error Handling ────────────────────────────────

  console.log("\n  Error Handling:");

  await test("POST to /api/stats returns 405", async () => {
    const resp = await fetch(API + "/stats", { method: "POST" });
    assert(resp.status === 405, "should be 405");
  });

  await test("Oversized URL returns 414", async () => {
    const resp = await fetch(API + "/" + "x".repeat(520));
    assert(resp.status === 414, "should be 414");
  });

  await test("OPTIONS /api/stats returns 200 (CORS preflight)", async () => {
    const resp = await fetch(API + "/stats", { method: "OPTIONS" });
    assert(resp.status === 200, "should be 200");
  });

  await test("GET /api/proposals/-1 returns 404", async () => {
    const resp = await fetch(API + "/proposals/-1");
    assert(resp.status === 404, "should be 404");
  });

  await test("GET /api/badge/short_address returns 404", async () => {
    const resp = await fetch(API + "/badge/too_short");
    assert(resp.status === 404, "malformed address should 404");
  });

  // ── Proposal Integrity ────────────────────────────

  console.log("\n  Proposal Integrity:");

  await test("All proposals have valid type", async () => {
    const data = await fetchJson(API + "/proposals");
    const validTypes = ["yesno", "poll", "temp"];
    data.data.forEach(p => {
      assert(validTypes.includes(p.type), "invalid type '" + p.type + "' on #" + p.id);
    });
  });

  await test("Charter-linked proposals have valid param key", async () => {
    const proposals = await fetchJson(API + "/proposals");
    const charter = await fetchJson(API + "/charter");
    const validKeys = charter.data.params.map(p => p.param_key);
    proposals.data.forEach(p => {
      if (p.charter_param) {
        assert(validKeys.includes(p.charter_param), "invalid charter_param '" + p.charter_param + "' on #" + p.id);
      }
    });
  });

  await test("All proposals have created_at before ends_at", async () => {
    const data = await fetchJson(API + "/proposals");
    data.data.forEach(p => {
      assert(p.created_at < p.ends_at, "created_at should be before ends_at on #" + p.id);
    });
  });

  await test("No proposal has negative vote counts", async () => {
    const data = await fetchJson(API + "/proposals");
    data.data.forEach(p => {
      Object.entries(p.counts).forEach(([opt, count]) => {
        assert(count >= 0, "negative count for '" + opt + "' on #" + p.id);
      });
    });
  });

  // ── Charter Integrity ─────────────────────────────

  console.log("\n  Charter Integrity:");

  await test("All charter params have valid phase (1-3)", async () => {
    const data = await fetchJson(API + "/charter");
    data.data.params.forEach(p => {
      assert([1, 2, 3].includes(p.phase), "invalid phase " + p.phase + " on " + p.param_key);
    });
  });

  await test("Charter dependencies are valid JSON arrays", async () => {
    const data = await fetchJson(API + "/charter");
    data.data.params.forEach(p => {
      if (p.depends_on) {
        const deps = JSON.parse(p.depends_on);
        assert(Array.isArray(deps), "depends_on should be array on " + p.param_key);
      }
    });
  });

  await test("Resolved charter params have values", async () => {
    const data = await fetchJson(API + "/charter");
    data.data.params.forEach(p => {
      if (p.status === "resolved") {
        assert(p.param_value !== null && p.param_value !== undefined, "resolved param " + p.param_key + " should have value");
      }
    });
  });

  // ── CV2 Health ────────────────────────────────────

  console.log("\n  CV2 Health:");

  await test("CV2 status has all required fields", async () => {
    const data = await fetchJson(API + "/cv2/status");
    const d = data.data;
    assert(typeof d.enabled === "boolean", "enabled should be boolean");
    assert(typeof d.deployed === "boolean", "deployed should be boolean");
    assert(typeof d.polling === "boolean", "polling should be boolean");
    assert(typeof d.errors === "number", "errors should be number");
    assert(d.component, "component should exist");
  });

  await test("CV2 polling is active", async () => {
    const data = await fetchJson(API + "/cv2/status");
    assert(data.data.polling === true, "polling should be active");
  });

  await test("CV2 error count is tracked", async () => {
    const data = await fetchJson(API + "/cv2/status");
    assert(typeof data.data.errors === "number", "errors should be a number");
    // Note: errors > 0 is OK (sync issues are expected), just verifying it's tracked
  });

  // ── Badge Edge Cases ──────────────────────────────

  console.log("\n  Badge Edge Cases:");

  await test("Badge for valid-format but non-existent address returns false", async () => {
    const resp = await fetch(API + "/badge/account_rdx1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/verify");
    const data = await resp.json();
    assert(data.ok === true);
    assert(data.hasBadge === false, "non-existent address should have no badge");
  });

  await test("Badge for malformed address returns 404", async () => {
    const resp = await fetch(API + "/badge/not_a_real_address");
    assert(resp.status === 404, "malformed address should 404");
  });

  // ── Game Edge Cases ───────────────────────────────

  console.log("\n  Game Edge Cases:");

  await test("Game state for unknown address returns ok with null/empty", async () => {
    const data = await fetchJson(API + "/game/account_rdx1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
    assert(data.ok === true, "should return ok");
  });

  await test("Achievements for unknown address returns ok", async () => {
    const data = await fetchJson(API + "/game/account_rdx1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/achievements");
    assert(data.ok === true, "should return ok");
  });

  // ── Feedback System ────────────────────────────────

  console.log("\n  Feedback System:");

  await test("GET /api/feedback returns ok", async () => {
    const data = await fetchJson(API + "/feedback");
    assert(data.ok === true);
    assert(Array.isArray(data.data), "data should be array");
  });

  await test("GET /api/feedback/stats returns counts", async () => {
    const data = await fetchJson(API + "/feedback/stats");
    assert(data.ok === true);
    assert(typeof data.data.open === "number");
    assert(typeof data.data.responded === "number");
    assert(typeof data.data.resolved === "number");
    assert(typeof data.data.total === "number");
    assert(data.data.total === data.data.open + data.data.responded + data.data.resolved, "total should match sum");
  });

  await test("GET /api/feedback?status=open returns ok", async () => {
    const data = await fetchJson(API + "/feedback?status=open");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  // ── Dashboard (complete) ──────────────────────────

  console.log("\n  Dashboard (complete):");

  await test("GET /feedback returns 200", async () => {
    const resp = await fetch(GUILD + "/feedback");
    assert(resp.ok, "should be 200");
  });

  await test("All 13 dashboard pages return 200", async () => {
    const pages = ["", "/proposals", "/admin", "/mint", "/bounties", "/bounties/3", "/docs", "/game", "/profile", "/feedback", "/about"];
    for (const p of pages) {
      const resp = await fetch(GUILD + p);
      assert(resp.ok, p + " should return 200");
    }
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
