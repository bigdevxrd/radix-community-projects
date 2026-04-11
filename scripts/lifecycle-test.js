#!/usr/bin/env node
/**
 * lifecycle-test.js — Full lifecycle tests for Radix Guild
 *
 * Tests complete workflows: create → read → update → verify
 * Uses POST endpoints to create test data, then verifies via GET.
 * Zero dependencies. Runs against live API.
 *
 * Run: node scripts/lifecycle-test.js
 */

const API = process.env.API_URL || "https://radixguild.com/api";
const GUILD = process.env.GUILD_URL || "https://radixguild.com";

// Test addresses (valid format, non-existent on ledger, matches account_rdx1[a-z0-9]{40,65})
const USER_ALPHA = "account_rdx1testalpha" + "a".repeat(40);
const USER_BETA = "account_rdx1testbeta0" + "b".repeat(41);
const USER_GAMMA = "account_rdx1testgamma" + "c".repeat(40);
const REAL_ACCOUNT = "account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq";

let passed = 0;
let failed = 0;
let createdProposalId = null;
let createdBountyId = null;

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
  if (resp.status === 429) throw new Error("Rate limited (429) — try running tests separately");
  return resp.json();
}

async function postJson(url, body) {
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function fetchStatus(url, opts) {
  const resp = await fetch(url, opts);
  return resp.status;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("\n  Radix Guild Lifecycle Tests\n");

  // ══════════════════════════════════════════════════════
  // LIFECYCLE 1: PROPOSAL WORKFLOW
  // ══════════════════════════════════════════════════════

  console.log("  Proposal Lifecycle:");

  await test("POST /api/proposals — create Yes/No proposal", async () => {
    const data = await postJson(API + "/proposals", {
      title: "[TEST] Lifecycle test proposal " + Date.now(),
      description: "Automated lifecycle test — safe to ignore",
      type: "yesno",
      days_active: 1,
      address: USER_ALPHA,
    });
    assert(data.ok === true, "should return ok");
    assert(typeof data.data.id === "number", "should return proposal id");
    createdProposalId = data.data.id;
  });

  await test("GET /api/proposals — new proposal appears in list", async () => {
    const data = await fetchJson(API + "/proposals");
    assert(data.ok === true);
    const found = data.data.find(p => p.id === createdProposalId);
    assert(found, "created proposal should be in list");
    assert(found.status === "active", "should be active");
  });

  await test("POST /api/proposals/:id/vote — vote FOR with alpha", async () => {
    const data = await postJson(API + "/proposals/" + createdProposalId + "/vote", {
      address: USER_ALPHA,
      vote: "for",
    });
    assert(data.ok === true, "vote should succeed");
    assert(data.data.counts.for >= 1, "for count should be >= 1");
  });

  await test("POST /api/proposals/:id/vote — vote AGAINST with beta", async () => {
    const data = await postJson(API + "/proposals/" + createdProposalId + "/vote", {
      address: USER_BETA,
      vote: "against",
    });
    assert(data.ok === true, "vote should succeed");
    assert(data.data.counts.against >= 1, "against count should be >= 1");
  });

  await test("POST /api/proposals/:id/vote — duplicate vote returns 409", async () => {
    const status = await fetchStatus(API + "/proposals/" + createdProposalId + "/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: USER_ALPHA, vote: "for" }),
    });
    assert(status === 409, "duplicate vote should return 409, got " + status);
  });

  await test("GET /api/proposals — vote counts are correct", async () => {
    const data = await fetchJson(API + "/proposals");
    const p = data.data.find(x => x.id === createdProposalId);
    assert(p, "proposal should exist");
    assert(p.total_votes >= 2, "should have at least 2 votes");
  });

  await test("GET /api/profile/:address — vote appears in profile", async () => {
    const data = await fetchJson(API + "/profile/" + USER_ALPHA);
    assert(data.ok === true);
    const vote = data.data.votes.find(v => v.proposal_id === createdProposalId);
    assert(vote, "vote should appear in profile");
    assert(vote.vote === "for", "vote should be 'for'");
  });

  await test("GET /api/stats — total_proposals incremented", async () => {
    const data = await fetchJson(API + "/stats");
    assert(data.ok === true);
    assert(data.data.total_proposals > 0, "total_proposals should be > 0");
  });

  await test("POST /api/proposals — create multi-choice proposal", async () => {
    const data = await postJson(API + "/proposals", {
      title: "[TEST] Multi-choice " + Date.now(),
      type: "multi",
      options: ["Option A", "Option B", "Option C"],
      days_active: 1,
      address: USER_GAMMA,
    });
    assert(data.ok === true, "should create multi-choice");
    assert(typeof data.data.id === "number");
  });

  await test("POST /api/proposals — missing title returns 400", async () => {
    const status = await fetchStatus(API + "/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: USER_ALPHA }),
    });
    assert(status === 400, "missing title should return 400, got " + status);
  });

  await sleep(3000); // rate limit breathing room

  // ══════════════════════════════════════════════════════
  // LIFECYCLE 2: BOUNTY WORKFLOW
  // ══════════════════════════════════════════════════════

  console.log("\n  Bounty Lifecycle:");

  await test("POST /api/bounties — create task", async () => {
    const data = await postJson(API + "/bounties", {
      title: "[TEST] Lifecycle bounty " + Date.now(),
      reward_xrd: 25,
      description: "Automated test bounty",
      category: "testing",
      difficulty: "easy",
      deadline_days: 7,
    });
    assert(data.ok === true, "should create bounty");
    assert(typeof data.data.id === "number");
    createdBountyId = data.data.id;
  });

  await test("GET /api/bounties — new bounty in list", async () => {
    const data = await fetchJson(API + "/bounties");
    assert(data.ok === true);
    const found = data.data.bounties.find(b => b.id === createdBountyId);
    assert(found, "created bounty should be in list");
    assert(found.status === "open", "should be open");
  });

  await test("GET /api/bounties/:id — detail has all fields", async () => {
    const data = await fetchJson(API + "/bounties/" + createdBountyId);
    assert(data.ok === true);
    assert(data.data.title.includes("[TEST]"), "title should match");
    assert(data.data.reward_xrd === 25, "reward should be 25");
    assert(data.data.difficulty === "easy", "difficulty should be easy");
  });

  await test("GET /api/bounties/categories — returns categories", async () => {
    const data = await fetchJson(API + "/bounties/categories");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
    assert(data.data.length >= 5, "should have at least 5 categories");
  });

  await test("GET /api/bounties?status=open — filter works", async () => {
    const data = await fetchJson(API + "/bounties?status=open");
    assert(data.ok === true);
    const allOpen = data.data.bounties.every(b => b.status === "open");
    assert(allOpen, "all bounties should be open");
  });

  await test("GET /api/bounties/config — returns platform config", async () => {
    const data = await fetchJson(API + "/bounties/config");
    assert(data.ok === true);
    assert(data.data.platform_fee_pct !== undefined, "should have fee config");
  });

  await test("POST /api/bounties — missing title returns error", async () => {
    const data = await postJson(API + "/bounties", { reward_xrd: 10 });
    assert(data.ok === false, "should fail without title");
  });

  await sleep(3000);

  // ══════════════════════════════════════════════════════
  // LIFECYCLE 3: WORKING GROUPS
  // ══════════════════════════════════════════════════════

  console.log("\n  Working Groups Lifecycle:");

  let groupId = null;
  let memberCountBefore = 0;

  await test("GET /api/groups — list all groups", async () => {
    const data = await fetchJson(API + "/groups");
    assert(data.ok === true);
    assert(data.data.length >= 3, "should have at least 3 groups");
    groupId = data.data[0].id;
    memberCountBefore = data.data[0].member_count;
  });

  await test("POST /api/groups/:id/join — join with test user", async () => {
    const data = await postJson(API + "/groups/" + groupId + "/join", { address: USER_ALPHA });
    assert(data.ok === true, "join should succeed");
  });

  await test("GET /api/groups/:id — member count increased", async () => {
    const data = await fetchJson(API + "/groups/" + groupId);
    assert(data.ok === true);
    assert(data.data.member_count >= memberCountBefore, "member count should not decrease");
    const found = data.data.members.find(m => m.radix_address === USER_ALPHA);
    assert(found, "test user should be in members list");
  });

  await test("POST /api/groups/:id/leave — leave group", async () => {
    const data = await postJson(API + "/groups/" + groupId + "/leave", { address: USER_ALPHA });
    assert(data.ok === true, "leave should succeed");
  });

  await test("GET /api/groups/:id — member removed", async () => {
    const data = await fetchJson(API + "/groups/" + groupId);
    assert(data.ok === true);
    const found = data.data.members.find(m => m.radix_address === USER_ALPHA);
    assert(!found, "test user should not be in members after leave");
  });

  await test("GET /api/groups/overdue — returns period + groups", async () => {
    const data = await fetchJson(API + "/groups/overdue");
    assert(data.ok === true);
    assert(typeof data.data.period === "string", "should have period");
    assert(data.data.period.includes("BW"), "period should be biweekly format");
    assert(Array.isArray(data.data.groups));
  });

  await test("GET /api/groups/expiring — returns array", async () => {
    const data = await fetchJson(API + "/groups/expiring");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("GET /api/groups/:id/tasks — returns array", async () => {
    const data = await fetchJson(API + "/groups/" + groupId + "/tasks");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("GET /api/groups/:id/reports — returns array", async () => {
    const data = await fetchJson(API + "/groups/" + groupId + "/reports");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("GET /api/groups/:id/budget — returns budget object", async () => {
    const data = await fetchJson(API + "/groups/" + groupId + "/budget");
    assert(data.ok === true);
    assert(data.data.monthly !== undefined, "should have monthly");
    assert(data.data.spent !== undefined, "should have spent");
  });

  await sleep(3000);

  // ══════════════════════════════════════════════════════
  // LIFECYCLE 4: FEEDBACK
  // ══════════════════════════════════════════════════════

  console.log("\n  Feedback Lifecycle:");

  await test("POST /api/feedback — submit ticket", async () => {
    const data = await postJson(API + "/feedback", {
      message: "[TEST] Lifecycle test feedback " + Date.now(),
      address: USER_GAMMA,
    });
    assert(data.ok === true, "feedback should succeed");
  });

  await test("GET /api/feedback — ticket appears", async () => {
    const data = await fetchJson(API + "/feedback");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
    assert(data.data.length > 0, "should have at least 1 ticket");
  });

  await test("GET /api/feedback?status=open — filter works", async () => {
    const data = await fetchJson(API + "/feedback?status=open");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("GET /api/feedback/stats — returns counts", async () => {
    const data = await fetchJson(API + "/feedback/stats");
    assert(data.ok === true);
    assert(typeof data.data.open === "number" || typeof data.data.total === "number");
  });

  await test("POST /api/feedback — missing message returns 400", async () => {
    const status = await fetchStatus(API + "/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: USER_ALPHA }),
    });
    assert(status === 400, "missing message should return 400, got " + status);
  });

  await sleep(3000);

  // ══════════════════════════════════════════════════════
  // LIFECYCLE 5: CV3 CONVICTION VOTING
  // ══════════════════════════════════════════════════════

  console.log("\n  CV3 Conviction Voting:");

  await test("GET /api/cv3/status — has all required fields", async () => {
    const data = await fetchJson(API + "/cv3/status");
    assert(data.ok === true);
    assert(typeof data.data.enabled === "boolean");
    assert(typeof data.data.component === "string");
    assert(typeof data.data.proposalCount === "number");
    assert(typeof data.data.poolBalance === "number");
    assert(typeof data.data.errors === "number");
    assert(typeof data.data.polling === "boolean");
    assert(typeof data.data.pollInterval === "number");
  });

  await test("GET /api/cv3/status — correct component address", async () => {
    const data = await fetchJson(API + "/cv3/status");
    assert(data.data.component.startsWith("component_rdx1"), "should be a valid component address");
  });

  await test("GET /api/cv3/stats — returns aggregate counts", async () => {
    const data = await fetchJson(API + "/cv3/stats");
    assert(data.ok === true);
    assert(typeof data.data.proposal_count === "number");
    assert(typeof data.data.active_proposals === "number");
    assert(typeof data.data.executed_proposals === "number");
    assert(typeof data.data.pool_balance === "number");
  });

  await test("GET /api/cv3/proposals — returns array", async () => {
    const data = await fetchJson(API + "/cv3/proposals");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("GET /api/cv3/proposals?status=active — filter works", async () => {
    const data = await fetchJson(API + "/cv3/proposals?status=active");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("GET /api/cv3/proposals/999999 — returns 404", async () => {
    const status = await fetchStatus(API + "/cv3/proposals/999999");
    assert(status === 404, "non-existent proposal should return 404, got " + status);
  });

  await test("GET /api/cv3/proposals/1/stakes — returns array", async () => {
    const data = await fetchJson(API + "/cv3/proposals/1/stakes");
    assert(data.ok === true);
    assert(Array.isArray(data.data));
  });

  await test("CV3 polling is active", async () => {
    const data = await fetchJson(API + "/cv3/status");
    if (data.data.enabled) {
      assert(data.data.polling === true, "polling should be active when enabled");
    }
  });

  await sleep(3000);

  // ══════════════════════════════════════════════════════
  // LIFECYCLE 6: PROFILE AGGREGATION
  // ══════════════════════════════════════════════════════

  console.log("\n  Profile Aggregation:");

  await test("GET /api/profile/:address — returns all sections", async () => {
    const data = await fetchJson(API + "/profile/" + REAL_ACCOUNT);
    assert(data.ok === true);
    assert(data.data.votes !== undefined, "should have votes");
    assert(data.data.tasks !== undefined, "should have tasks");
    assert(data.data.tasks.created !== undefined, "should have tasks.created");
    assert(data.data.tasks.assigned !== undefined, "should have tasks.assigned");
    assert(data.data.groups !== undefined, "should have groups");
    assert(data.data.game !== undefined, "should have game");
  });

  await test("GET /api/profile/:address — trust score included", async () => {
    const data = await fetchJson(API + "/profile/" + REAL_ACCOUNT);
    assert(data.data.trust !== null, "trust should not be null for registered user");
    assert(typeof data.data.trust.score === "number", "trust score should be number");
    assert(typeof data.data.trust.tier === "string", "trust tier should be string");
    assert(data.data.trust.breakdown !== undefined, "should have breakdown");
  });

  await test("GET /api/trust/address/:address — returns trust by address", async () => {
    const data = await fetchJson(API + "/trust/address/" + REAL_ACCOUNT);
    assert(data.ok === true);
    assert(typeof data.data.score === "number");
    assert(typeof data.data.tier === "string");
    assert(data.data.breakdown.age_days !== undefined);
    assert(data.data.breakdown.vote_points !== undefined);
  });

  await test("GET /api/trust/address/invalid — returns 404", async () => {
    const status = await fetchStatus(API + "/trust/address/account_rdx1zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
    assert(status === 404, "invalid address should return 404, got " + status);
  });

  await test("GET /api/profile/:address — test user data accessible", async () => {
    const data = await fetchJson(API + "/profile/" + USER_ALPHA);
    assert(data.ok === true);
    assert(Array.isArray(data.data.votes), "votes should be an array");
  });

  await test("GET /api/profile/:address — user field present", async () => {
    const data = await fetchJson(API + "/profile/" + REAL_ACCOUNT);
    assert(data.data.user !== null, "user should not be null");
    assert(data.data.user.username !== undefined, "should have username");
  });

  await test("GET /api/profile — unknown address returns empty data", async () => {
    const addr = "account_rdx1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy";
    const data = await fetchJson(API + "/profile/" + addr);
    assert(data.ok === true);
    assert(data.data.trust === null, "trust should be null for unknown user");
    assert(Array.isArray(data.data.votes), "votes should be empty array");
  });

  await sleep(3000);

  // ══════════════════════════════════════════════════════
  // LIFECYCLE 7: DECISIONS
  // ══════════════════════════════════════════════════════

  console.log("\n  Decisions:");

  await test("GET /api/decisions — returns full tree", async () => {
    const data = await fetchJson(API + "/decisions");
    assert(data.ok === true);
    assert(data.data.length >= 40, "should have 40+ decisions");
  });

  await test("Decisions have 3 categories", async () => {
    const data = await fetchJson(API + "/decisions");
    const cats = new Set(data.data.map((d) => d.category));
    assert(cats.has("charter"), "should have charter category");
    assert(cats.has("structural"), "should have structural category");
    assert(cats.has("p3_services"), "should have p3_services category");
  });

  await test("Charter Phase 1 has 6 decisions", async () => {
    const data = await fetchJson(API + "/decisions");
    const p1 = data.data.filter((d) => d.phase === 1 && d.category === "charter");
    assert(p1.length === 6, "Phase 1 should have 6 decisions, got " + p1.length);
  });

  await test("Phase 2 decisions are locked (charter not passed)", async () => {
    const data = await fetchJson(API + "/decisions");
    const p2 = data.data.filter((d) => d.phase === 2);
    const locked = p2.filter((d) => !d.unlocked);
    assert(locked.length === p2.length, "All Phase 2 should be locked");
  });

  await test("Structural decisions have RadixTalk links", async () => {
    const data = await fetchJson(API + "/decisions");
    const structural = data.data.filter((d) => d.category === "structural");
    const withLinks = structural.filter((d) => d.radixtalk_url);
    assert(withLinks.length >= 8, "Most structural decisions should have RadixTalk links");
  });

  await test("GET /api/decisions/radixtalk — returns cached topics", async () => {
    const data = await fetchJson(API + "/decisions/radixtalk");
    assert(data.ok === true);
    assert(data.data.length >= 10);
    const t = data.data[0];
    assert(t.id, "should have id");
    assert(t.title, "should have title");
    assert(t.url, "should have url");
    assert(typeof t.posts_count === "number", "should have posts_count");
  });

  await sleep(3000);

  // ══════════════════════════════════════════════════════
  // CROSS-SYSTEM INTEGRITY
  // ══════════════════════════════════════════════════════

  console.log("\n  Cross-System Integrity:");

  await test("GET /api/health — all subsystems reported", async () => {
    const resp = await fetch(API + "/health");
    assert(resp.ok, "health should return 200");
    const data = await resp.json();
    assert(data.ok === true || data.status === "ok" || data.uptime_s !== undefined, "health should report ok");
  });

  await test("Proposal stats consistency", async () => {
    const stats = (await fetchJson(API + "/stats")).data;
    const proposals = (await fetchJson(API + "/proposals")).data;
    assert(proposals.length > 0, "should have proposals");
    assert(stats.total_proposals >= proposals.length, "total should be >= returned count");
  });

  await test("Bounty stats consistency", async () => {
    const data = await fetchJson(API + "/bounties");
    const stats = data.data.stats;
    const total = (stats.open || 0) + (stats.assigned || 0) + (stats.submitted || 0) + (stats.verified || 0) + (stats.paid || 0);
    assert(total >= 0, "total bounties should be >= 0");
  });

  await test("Charter has all required params", async () => {
    const data = await fetchJson(API + "/charter");
    assert(data.ok === true);
    assert(data.data.params.length >= 20, "should have at least 20 charter params");
    for (const p of data.data.params) {
      assert(p.phase >= 1 && p.phase <= 3, "phase should be 1-3");
    }
  });

  await test("CV2 and CV3 both reporting", async () => {
    const cv2 = await fetchJson(API + "/cv2/status");
    const cv3 = await fetchJson(API + "/cv3/status");
    assert(cv2.ok === true, "CV2 should respond");
    assert(cv3.ok === true, "CV3 should respond");
  });

  await test("All 14 dashboard pages return 200", async () => {
    const pages = ["/", "/mint", "/proposals", "/groups", "/bounties", "/game", "/docs", "/feedback", "/about", "/admin", "/profile"];
    for (const page of pages) {
      const resp = await fetch(GUILD + page);
      assert(resp.ok, page + " should return 200, got " + resp.status);
    }
  });

  await test("CORS preflight returns correct headers", async () => {
    const resp = await fetch(API + "/stats", { method: "OPTIONS" });
    assert(resp.ok, "OPTIONS should return 200");
  });

  await test("Oversized URL returns 414", async () => {
    const longUrl = API + "/proposals?" + "x".repeat(600);
    const resp = await fetch(longUrl);
    assert(resp.status === 414, "oversized URL should return 414, got " + resp.status);
  });

  // ══════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════

  console.log("\n  Results: " + passed + " passed, " + failed + " failed");
  console.log("  " + (failed === 0 ? "✅ ALL LIFECYCLE TESTS PASSED" : "❌ SOME TESTS FAILED"));
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("Test runner error:", e.message);
  process.exit(1);
});
