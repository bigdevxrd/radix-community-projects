const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.BOT_DB_PATH || path.join(__dirname, "guild.db");

let db;

function init() {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      tg_id INTEGER PRIMARY KEY,
      radix_address TEXT NOT NULL,
      username TEXT,
      registered_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'yesno',
      options TEXT,
      creator_tg_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      parent_id INTEGER,
      round INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      ends_at INTEGER NOT NULL,
      min_votes INTEGER DEFAULT 3,
      tg_message_id INTEGER,
      tg_chat_id INTEGER,
      FOREIGN KEY (creator_tg_id) REFERENCES users(tg_id),
      FOREIGN KEY (parent_id) REFERENCES proposals(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      proposal_id INTEGER NOT NULL,
      tg_id INTEGER NOT NULL,
      radix_address TEXT NOT NULL,
      vote TEXT NOT NULL,
      voted_at INTEGER DEFAULT (strftime('%s','now')),
      PRIMARY KEY (proposal_id, tg_id),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );
  `);

  // Bounty system tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS bounties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      reward_xrd REAL NOT NULL,
      creator_address TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      claimed_by TEXT,
      claimed_at INTEGER,
      submitted_at INTEGER,
      approved_at INTEGER,
      paid_at INTEGER,
      crumbsup_id TEXT,
      tx_hash_paid TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS escrow_wallet (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_deposited_xrd REAL DEFAULT 0,
      total_released_xrd REAL DEFAULT 0,
      last_updated INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS bounty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bounty_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      actor_address TEXT,
      tx_hash TEXT,
      amount_xrd REAL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    );
  `);

  // Initialize escrow_wallet singleton (id=1 only, never more)
  db.prepare(
    "INSERT OR IGNORE INTO escrow_wallet (id, total_deposited_xrd, total_released_xrd) VALUES (1, 0, 0)"
  ).run();

  // Migration: add columns if they don't exist (safe for existing DBs)
  try { db.exec("ALTER TABLE proposals ADD COLUMN type TEXT DEFAULT 'yesno'"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN options TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN parent_id INTEGER"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN round INTEGER DEFAULT 1"); } catch(e) {}

  // Indexes for 20k+ scale
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_address ON users(radix_address);
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status, ends_at);
    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_bounties_claimed_by ON bounties(claimed_by);
    CREATE INDEX IF NOT EXISTS idx_bounty_tx_bounty ON bounty_transactions(bounty_id);
  `);

  return db;
}

// Users
function getUser(tgId) {
  return db.prepare("SELECT * FROM users WHERE tg_id = ?").get(tgId);
}

function registerUser(tgId, radixAddress, username) {
  return db.prepare(
    "INSERT OR REPLACE INTO users (tg_id, radix_address, username) VALUES (?, ?, ?)"
  ).run(tgId, radixAddress, username);
}

// Proposals
function createProposal(title, creatorTgId, opts = {}) {
  const {
    type = "yesno",
    options = null,
    daysActive = 3,
    minVotes = 3,
    parentId = null,
    round = 1,
  } = opts;
  const endsAt = Math.floor(Date.now() / 1000) + daysActive * 86400;
  const result = db.prepare(
    "INSERT INTO proposals (title, type, options, creator_tg_id, ends_at, min_votes, parent_id, round) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(title, type, options ? JSON.stringify(options) : null, creatorTgId, endsAt, minVotes, parentId, round);
  return result.lastInsertRowid;
}

function updateProposalMessage(proposalId, messageId, chatId) {
  db.prepare(
    "UPDATE proposals SET tg_message_id = ?, tg_chat_id = ? WHERE id = ?"
  ).run(messageId, chatId, proposalId);
}

function getProposal(id) {
  const p = db.prepare("SELECT * FROM proposals WHERE id = ?").get(id);
  if (p && p.options) p.options = JSON.parse(p.options);
  return p;
}

function getActiveProposals() {
  const now = Math.floor(Date.now() / 1000);
  const rows = db.prepare(
    "SELECT * FROM proposals WHERE status = 'active' AND ends_at > ? ORDER BY created_at DESC"
  ).all(now);
  return rows.map(p => {
    if (p.options) p.options = JSON.parse(p.options);
    return p;
  });
}

function closeExpiredProposals() {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(
    "UPDATE proposals SET status = 'expired' WHERE status = 'active' AND ends_at <= ?"
  ).run(now);
}

function closeProposal(id, status) {
  db.prepare("UPDATE proposals SET status = ? WHERE id = ?").run(status, id);
}

function getAmendments(parentId) {
  return db.prepare("SELECT * FROM proposals WHERE parent_id = ? ORDER BY round").all(parentId);
}

// Votes
function recordVote(proposalId, tgId, radixAddress, vote) {
  try {
    db.prepare(
      "INSERT INTO votes (proposal_id, tg_id, radix_address, vote) VALUES (?, ?, ?, ?)"
    ).run(proposalId, tgId, radixAddress, vote);
    return { ok: true };
  } catch (e) {
    if (e.message.includes("UNIQUE constraint")) {
      return { ok: false, error: "already_voted" };
    }
    return { ok: false, error: e.message };
  }
}

function getVoteCounts(proposalId) {
  const rows = db.prepare(
    "SELECT vote, COUNT(*) as count FROM votes WHERE proposal_id = ? GROUP BY vote"
  ).all(proposalId);
  const counts = {};
  rows.forEach((r) => { counts[r.vote] = r.count; });
  return counts;
}

function hasVoted(proposalId, tgId) {
  return !!db.prepare(
    "SELECT 1 FROM votes WHERE proposal_id = ? AND tg_id = ?"
  ).get(proposalId, tgId);
}

function getTotalVoters() {
  const r = db.prepare("SELECT COUNT(DISTINCT tg_id) as c FROM votes").get();
  return r ? r.c : 0;
}

function getTotalProposals() {
  const r = db.prepare("SELECT COUNT(*) as c FROM proposals").get();
  return r ? r.c : 0;
}

// ── Bounties ─────────────────────────────────────────────

function createBounty(title, description, category, rewardXrd, creatorAddress, daysActive = 7) {
  const expiresAt = Math.floor(Date.now() / 1000) + daysActive * 86400;
  const result = db.prepare(
    "INSERT INTO bounties (title, description, category, reward_xrd, creator_address, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(title, description || null, category || "general", rewardXrd, creatorAddress, expiresAt);
  const id = result.lastInsertRowid;
  db.prepare(
    "INSERT INTO bounty_transactions (bounty_id, action, actor_address, amount_xrd) VALUES (?, 'created', ?, ?)"
  ).run(id, creatorAddress, rewardXrd);
  return id;
}

function getBounty(id) {
  return db.prepare("SELECT * FROM bounties WHERE id = ?").get(id);
}

function getActiveBounties(opts = {}) {
  const { status, category, limit = 50, offset = 0 } = opts;
  const now = Math.floor(Date.now() / 1000);
  let query = "SELECT * FROM bounties WHERE expires_at > ?";
  const params = [now];
  if (status) { query += " AND status = ?"; params.push(status); }
  if (category) { query += " AND category = ?"; params.push(category); }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return db.prepare(query).all(...params);
}

function getAllBounties(opts = {}) {
  const { status, category, limit = 50, offset = 0 } = opts;
  let query = "SELECT * FROM bounties WHERE 1=1";
  const params = [];
  if (status) { query += " AND status = ?"; params.push(status); }
  if (category) { query += " AND category = ?"; params.push(category); }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return db.prepare(query).all(...params);
}

function claimBounty(bountyId, claimerAddress) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  if (bounty.status !== "open") return { ok: false, error: "not_open", status: bounty.status };
  const now = Math.floor(Date.now() / 1000);
  if (now > bounty.expires_at) return { ok: false, error: "expired" };
  if (bounty.creator_address === claimerAddress) return { ok: false, error: "cannot_claim_own_bounty" };

  // NOTE: Badge verification is enforced at API layer (bot/services/api.js)
  // This function assumes caller has already validated the claimer has a Guild badge

  db.prepare(
    "UPDATE bounties SET claimed_by = ?, claimed_at = ?, status = 'claimed' WHERE id = ?"
  ).run(claimerAddress, now, bountyId);
  db.prepare(
    "INSERT INTO bounty_transactions (bounty_id, action, actor_address) VALUES (?, 'claimed', ?)"
  ).run(bountyId, claimerAddress);
  return { ok: true, bounty_id: bountyId, claimer: claimerAddress };
}

function submitBountyWork(bountyId, claimerAddress) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  if (bounty.status !== "claimed") return { ok: false, error: "not_claimed", status: bounty.status };
  if (bounty.claimed_by !== claimerAddress) return { ok: false, error: "not_claimer" };

  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE bounties SET submitted_at = ?, status = 'submitted' WHERE id = ?"
  ).run(now, bountyId);
  db.prepare(
    "INSERT INTO bounty_transactions (bounty_id, action, actor_address) VALUES (?, 'submitted', ?)"
  ).run(bountyId, claimerAddress);
  return { ok: true, bounty_id: bountyId };
}

function approveBountyPayment(bountyId, crumbsupId) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  if (bounty.status !== "submitted") return { ok: false, error: "not_submitted", status: bounty.status };

  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE bounties SET approved_at = ?, crumbsup_id = ?, status = 'approved' WHERE id = ?"
  ).run(now, crumbsupId || null, bountyId);
  db.prepare(
    "INSERT INTO bounty_transactions (bounty_id, action, actor_address) VALUES (?, 'approved', ?)"
  ).run(bountyId, bounty.creator_address);
  return { ok: true, bounty_id: bountyId, ready_for_payment: true };
}

function markBountyPaid(bountyId, txHash) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  if (bounty.status !== "approved") return { ok: false, error: "not_approved", status: bounty.status };
  if (!bounty.claimed_by) return { ok: false, error: "no_claimer_recorded", bounty_id: bountyId };
  if (!txHash || typeof txHash !== "string" || txHash.length === 0) return { ok: false, error: "invalid_tx_hash" };

  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE bounties SET tx_hash_paid = ?, paid_at = ?, status = 'paid' WHERE id = ?"
  ).run(txHash, now, bountyId);
  db.prepare(
    "INSERT INTO bounty_transactions (bounty_id, action, actor_address, tx_hash, amount_xrd) VALUES (?, 'paid', ?, ?, ?)"
  ).run(bountyId, bounty.claimed_by, txHash, bounty.reward_xrd);
  return { ok: true, bounty_id: bountyId, tx_hash: txHash };
}

function getBountiesPendingApproval() {
  return db.prepare(
    "SELECT id, title, claimed_by, reward_xrd, approved_at, crumbsup_id FROM bounties WHERE status = 'approved' ORDER BY approved_at ASC"
  ).all();
}

function getBountiesByAddress(address) {
  return db.prepare(
    "SELECT * FROM bounties WHERE claimed_by = ? ORDER BY claimed_at DESC"
  ).all(address);
}

function getBountyStats() {
  const open = db.prepare("SELECT COUNT(*) as c FROM bounties WHERE status = 'open'").get();
  const total = db.prepare("SELECT COUNT(*) as c FROM bounties").get();
  const openXrdPool = db.prepare("SELECT COALESCE(SUM(reward_xrd), 0) as s FROM bounties WHERE status = 'open'").get();
  return { open: open?.c || 0, total: total?.c || 0, open_xrd_pool: openXrdPool?.s || 0 };
}

module.exports = {
  init,
  getUser, registerUser,
  createProposal, updateProposalMessage, getProposal,
  getActiveProposals, closeExpiredProposals, closeProposal, getAmendments,
  recordVote, getVoteCounts, hasVoted,
  getTotalVoters, getTotalProposals,
  // Bounties
  createBounty, getBounty, getActiveBounties, getAllBounties,
  claimBounty, submitBountyWork, approveBountyPayment, markBountyPaid,
  getBountiesPendingApproval, getBountiesByAddress, getBountyStats,
};

function cancelProposal(proposalId, tgId) {
  const p = db.prepare("SELECT * FROM proposals WHERE id = ? AND creator_tg_id = ?").get(proposalId, tgId);
  if (!p) return { ok: false, error: "not_found_or_not_owner" };
  if (p.status !== "active") return { ok: false, error: "not_active" };
  db.prepare("UPDATE proposals SET status = ? WHERE id = ?").run("cancelled", proposalId);
  return { ok: true };
}

function getProposalHistory(limit = 10) {
  return db.prepare(
    "SELECT * FROM proposals ORDER BY created_at DESC LIMIT ?"
  ).all(limit);
}

module.exports.cancelProposal = cancelProposal;
module.exports.getProposalHistory = getProposalHistory;
