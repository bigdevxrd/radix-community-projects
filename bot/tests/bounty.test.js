// Tests for bounty database functions
// Run: npm test
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Use a single temp DB for all tests (module is cached by Node)
const tmpPath = path.join(os.tmpdir(), "bounty-test-" + Date.now() + ".db");
process.env.BOT_DB_PATH = tmpPath;

const db = require("../db");

describe("Bounty DB functions", () => {
  before(() => {
    db.init();
  });

  after(() => {
    try { fs.unlinkSync(tmpPath); } catch (e) {}
  });

  // Helper: create and open a bounty
  function createOpenBounty(title = "Test bounty", reward = 10, creator = "account_rdx1creator") {
    const id = db.createBounty(title, "desc", "general", reward, creator, 7);
    const rawDb = new Database(tmpPath);
    rawDb.prepare("UPDATE bounties SET status = 'open' WHERE id = ?").run(id);
    rawDb.close();
    return id;
  }

  test("createBounty returns a positive integer id", () => {
    const id = db.createBounty("Test bounty", "desc", "tutorial", 50, "account_rdx1creator", 7);
    assert.ok(typeof id === "number" && id > 0, "Expected positive integer id");
  });

  test("getBounty returns the created bounty with status draft", () => {
    const id = db.createBounty("Draft test", null, "general", 25, "account_rdx1creator2", 7);
    const bounty = db.getBounty(id);
    assert.equal(bounty.title, "Draft test");
    assert.equal(bounty.status, "draft");
    assert.equal(bounty.reward_xrd, 25);
    assert.equal(bounty.creator_address, "account_rdx1creator2");
  });

  test("getActiveBounties returns open bounties that are not expired", () => {
    const id = createOpenBounty("Active open bounty");
    const active = db.getActiveBounties({ status: "open" });
    assert.ok(active.some(b => b.id === id));
  });

  test("claimBounty fails if bounty is not open (draft status)", () => {
    const id = db.createBounty("Draft bounty", null, "general", 10, "account_rdx1creator", 7);
    const result = db.claimBounty(id, "account_rdx1claimer");
    assert.equal(result.ok, false);
    assert.equal(result.error, "not_open");
  });

  test("claimBounty fails if bounty does not exist", () => {
    const result = db.claimBounty(9999, "account_rdx1claimer");
    assert.equal(result.ok, false);
    assert.equal(result.error, "not_found");
  });

  test("claimBounty fails if claimer is the creator", () => {
    const id = createOpenBounty("Own bounty", 10, "account_rdx1sameowner");
    const result = db.claimBounty(id, "account_rdx1sameowner");
    assert.equal(result.ok, false);
    assert.equal(result.error, "cannot_claim_own_bounty");
  });

  test("claimBounty succeeds for open bounty with different claimer", () => {
    const id = createOpenBounty("Claimable bounty");
    const result = db.claimBounty(id, "account_rdx1goodclaimer");
    assert.equal(result.ok, true);
    assert.equal(result.bounty_id, id);
    assert.equal(result.claimer, "account_rdx1goodclaimer");

    const bounty = db.getBounty(id);
    assert.equal(bounty.status, "claimed");
    assert.equal(bounty.claimed_by, "account_rdx1goodclaimer");
  });

  test("claimBounty fails if already claimed", () => {
    const id = createOpenBounty("Already claimed bounty");
    db.claimBounty(id, "account_rdx1firstclaimer");
    const result = db.claimBounty(id, "account_rdx1secondclaimer");
    assert.equal(result.ok, false);
    assert.equal(result.error, "not_open");
  });

  test("submitBountyWork transitions to submitted status", () => {
    const id = createOpenBounty("Submittable bounty");
    db.claimBounty(id, "account_rdx1submitter");
    const result = db.submitBountyWork(id, "account_rdx1submitter");
    assert.equal(result.ok, true);

    const bounty = db.getBounty(id);
    assert.equal(bounty.status, "submitted");
    assert.ok(bounty.submitted_at > 0);
  });

  test("submitBountyWork fails if wrong claimer", () => {
    const id = createOpenBounty("Bounty for wrong claimer test");
    db.claimBounty(id, "account_rdx1realclaimer");
    const result = db.submitBountyWork(id, "account_rdx1wrongperson");
    assert.equal(result.ok, false);
    assert.equal(result.error, "not_claimer");
  });

  test("approveBountyPayment transitions to approved", () => {
    const id = createOpenBounty("Approvable bounty");
    db.claimBounty(id, "account_rdx1approvclaimer");
    db.submitBountyWork(id, "account_rdx1approvclaimer");
    const result = db.approveBountyPayment(id, "crumbsup-xyz");
    assert.equal(result.ok, true);
    assert.equal(result.ready_for_payment, true);

    const bounty = db.getBounty(id);
    assert.equal(bounty.status, "approved");
    assert.equal(bounty.crumbsup_id, "crumbsup-xyz");
  });

  test("markBountyPaid transitions to paid and records tx_hash", () => {
    const id = createOpenBounty("Payable bounty");
    db.claimBounty(id, "account_rdx1paidclaimer");
    db.submitBountyWork(id, "account_rdx1paidclaimer");
    db.approveBountyPayment(id);
    const result = db.markBountyPaid(id, "txhash_abc123");
    assert.equal(result.ok, true);
    assert.equal(result.tx_hash, "txhash_abc123");

    const bounty = db.getBounty(id);
    assert.equal(bounty.status, "paid");
    assert.equal(bounty.tx_hash_paid, "txhash_abc123");
  });

  test("getBountiesPendingApproval returns approved bounties", () => {
    const id = createOpenBounty("Pending payment bounty");
    db.claimBounty(id, "account_rdx1pendingclaimer");
    db.submitBountyWork(id, "account_rdx1pendingclaimer");
    db.approveBountyPayment(id);

    const pending = db.getBountiesPendingApproval();
    assert.ok(pending.some(b => b.id === id));
  });

  test("getBountiesByAddress returns bounties claimed by address", () => {
    const id = createOpenBounty("Address bounty");
    db.claimBounty(id, "account_rdx1addressclaimer");

    const claims = db.getBountiesByAddress("account_rdx1addressclaimer");
    assert.ok(claims.some(b => b.id === id));
    assert.equal(db.getBountiesByAddress("account_rdx1nobody").length, 0);
  });

  test("getBountyStats returns correct counts and pool", () => {
    const id1 = createOpenBounty("Stats bounty 1", 15);
    const id2 = createOpenBounty("Stats bounty 2", 20);

    const stats = db.getBountyStats();
    assert.ok(stats.open >= 2);
    assert.ok(stats.open_xrd_pool >= 35);
    assert.ok(stats.total >= 2);
  });

  test("claimBounty fails for expired bounty", () => {
    const id = db.createBounty("Expired bounty", null, "general", 10, "account_rdx1creator", 7);
    const rawDb = new Database(tmpPath);
    rawDb.prepare("UPDATE bounties SET status = 'open', expires_at = 1 WHERE id = ?").run(id);
    rawDb.close();

    const result = db.claimBounty(id, "account_rdx1lateclaimer");
    assert.equal(result.ok, false);
    assert.equal(result.error, "expired");
  });

  test("duplicate bounty creation both succeed with unique IDs", () => {
    const id1 = db.createBounty("Dup bounty", null, "general", 5, "account_rdx1creator", 7);
    const id2 = db.createBounty("Dup bounty", null, "general", 5, "account_rdx1creator", 7);
    assert.notEqual(id1, id2);
  });
});

