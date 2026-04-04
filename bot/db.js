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

    CREATE TABLE IF NOT EXISTS bounties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'other',
      reward_xrd REAL NOT NULL,
      status TEXT DEFAULT 'open',
      creator_address TEXT NOT NULL,
      claimed_by_address TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      ends_at INTEGER NOT NULL,
      claimed_at INTEGER,
      submitted_at INTEGER,
      approved_at INTEGER,
      crumbsup_id TEXT,
      paid_tx_hash TEXT,
      paid_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS bounty_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bounty_id INTEGER UNIQUE NOT NULL,
      claimed_by_address TEXT NOT NULL,
      reward_xrd REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      processed_at INTEGER,
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    );

    CREATE TABLE IF NOT EXISTS escrow_wallet (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_deposited_xrd REAL DEFAULT 0,
      total_released_xrd REAL DEFAULT 0,
      last_updated INTEGER DEFAULT (strftime('%s','now')),
      notes TEXT
    );
  `);

  // Migration: add columns if they don't exist (safe for existing DBs)
  try { db.exec("ALTER TABLE proposals ADD COLUMN type TEXT DEFAULT 'yesno'"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN options TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN parent_id INTEGER"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN round INTEGER DEFAULT 1"); } catch(e) {}

  // Ensure escrow singleton row exists
  db.prepare(
    "INSERT OR IGNORE INTO escrow_wallet (id, total_deposited_xrd, total_released_xrd) VALUES (1, 0, 0)"
  ).run();

  // Indexes for 20k+ scale
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_address ON users(radix_address);
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status, ends_at);
    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
    CREATE INDEX IF NOT EXISTS idx_bounties_claimer ON bounties(claimed_by_address);
    CREATE INDEX IF NOT EXISTS idx_bounties_ends_at ON bounties(ends_at);
    CREATE INDEX IF NOT EXISTS idx_bounty_queue_status ON bounty_queue(status);
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

module.exports = {
  init,
  getUser, registerUser,
  createProposal, updateProposalMessage, getProposal,
  getActiveProposals, closeExpiredProposals, closeProposal, getAmendments,
  recordVote, getVoteCounts, hasVoted,
  getTotalVoters, getTotalProposals,
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

// ── Bounty Functions ─────────────────────────────────────

const VALID_CATEGORIES = ["tutorial", "design", "social", "bug", "translation", "other"];

function createBounty(title, description, category, rewardXrd, creatorAddress, daysActive) {
  const endsAt = Math.floor(Date.now() / 1000) + (daysActive || 7) * 86400;
  const result = db.prepare(
    "INSERT INTO bounties (title, description, category, reward_xrd, creator_address, ends_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(title, description || null, category || "other", rewardXrd, creatorAddress, endsAt);
  return { ok: true, id: result.lastInsertRowid, status: "open" };
}

function claimBounty(bountyId, claimerAddress) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  if (bounty.status !== "open") return { ok: false, error: "not_open" };
  const now = Math.floor(Date.now() / 1000);
  if (bounty.ends_at < now) return { ok: false, error: "expired" };
  if (bounty.creator_address === claimerAddress) return { ok: false, error: "cannot_claim_own" };
  db.prepare(
    "UPDATE bounties SET claimed_by_address = ?, claimed_at = ?, status = 'claimed' WHERE id = ?"
  ).run(claimerAddress, now, bountyId);
  return { ok: true, bounty_id: bountyId, claimed_by: claimerAddress };
}

function submitBountyWork(bountyId) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  if (bounty.status !== "claimed") return { ok: false, error: "not_claimed" };
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE bounties SET submitted_at = ?, status = 'submitted' WHERE id = ?"
  ).run(now, bountyId);
  db.prepare(
    "INSERT OR IGNORE INTO bounty_queue (bounty_id, claimed_by_address, reward_xrd, status) VALUES (?, ?, ?, 'pending')"
  ).run(bountyId, bounty.claimed_by_address, bounty.reward_xrd);
  return { ok: true, bounty_id: bountyId, status: "submitted" };
}

function approveBountyPayment(bountyId, crumbsupId) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  if (bounty.status !== "submitted") return { ok: false, error: "not_submitted" };
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE bounties SET approved_at = ?, status = 'approved', crumbsup_id = ? WHERE id = ?"
  ).run(now, crumbsupId || null, bountyId);
  return { ok: true, bounty_id: bountyId, status: "approved" };
}

function markBountyPaid(bountyId, txHash) {
  const bounty = db.prepare("SELECT * FROM bounties WHERE id = ?").get(bountyId);
  if (!bounty) return { ok: false, error: "not_found" };
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE bounties SET paid_tx_hash = ?, paid_at = ?, status = 'paid' WHERE id = ?"
  ).run(txHash, now, bountyId);
  db.prepare(
    "UPDATE bounty_queue SET status = 'paid', processed_at = ? WHERE bounty_id = ?"
  ).run(now, bountyId);
  return { ok: true, bounty_id: bountyId, tx_hash: txHash };
}

function getBountyQueuePending() {
  return db.prepare(
    "SELECT * FROM bounty_queue WHERE status = 'pending'"
  ).all();
}

function expireBounties() {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(
    "UPDATE bounties SET status = 'expired' WHERE status = 'open' AND ends_at < ?"
  ).run(now);
  return { expired_count: result.changes };
}

function getOpenBounties(limit, page) {
  const lim = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const pg = Math.max(1, parseInt(page) || 1);
  const offset = (pg - 1) * lim;
  const now = Math.floor(Date.now() / 1000);
  const rows = db.prepare(
    "SELECT * FROM bounties WHERE status = 'open' AND ends_at > ? ORDER BY ends_at ASC LIMIT ? OFFSET ?"
  ).all(now, lim, offset);
  const total = db.prepare(
    "SELECT COUNT(*) as c FROM bounties WHERE status = 'open' AND ends_at > ?"
  ).get(now);
  return { bounties: rows, total: total ? total.c : 0, page: pg, limit: lim };
}

function getBounty(id) {
  return db.prepare("SELECT * FROM bounties WHERE id = ?").get(id);
}

function getMyBounties(address) {
  return db.prepare(
    "SELECT * FROM bounties WHERE claimed_by_address = ? ORDER BY created_at DESC"
  ).all(address);
}

function getBounties(opts) {
  const { status, category, limit, page } = opts || {};
  const lim = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const pg = Math.max(1, parseInt(page) || 1);
  const offset = (pg - 1) * lim;

  let query = "SELECT * FROM bounties WHERE 1=1";
  const params = [];
  if (status && status !== "all") { query += " AND status = ?"; params.push(status); }
  if (category) { query += " AND category = ?"; params.push(category); }
  query += " ORDER BY ends_at ASC LIMIT ? OFFSET ?";
  params.push(lim, offset);

  const rows = db.prepare(query).all(...params);

  let countQuery = "SELECT COUNT(*) as c FROM bounties WHERE 1=1";
  const countParams = [];
  if (status && status !== "all") { countQuery += " AND status = ?"; countParams.push(status); }
  if (category) { countQuery += " AND category = ?"; countParams.push(category); }
  const total = db.prepare(countQuery).get(...countParams);

  return { bounties: rows, total: total ? total.c : 0, page: pg, limit: lim };
}

// ── Escrow Functions ─────────────────────────────────────

function depositToEscrow(amountXrd) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE escrow_wallet SET total_deposited_xrd = total_deposited_xrd + ?, last_updated = ? WHERE id = 1"
  ).run(amountXrd, now);
  return getEscrowBalance();
}

function trackEscrowRelease(amountXrd) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE escrow_wallet SET total_released_xrd = total_released_xrd + ?, last_updated = ? WHERE id = 1"
  ).run(amountXrd, now);
  return getEscrowBalance();
}

function getEscrowBalance() {
  const row = db.prepare("SELECT * FROM escrow_wallet WHERE id = 1").get();
  if (!row) return { total_deposited: 0, total_released: 0, available: 0 };
  const pending = db.prepare(
    "SELECT COALESCE(SUM(b.reward_xrd), 0) as t FROM bounty_queue bq JOIN bounties b ON b.id = bq.bounty_id WHERE bq.status = 'pending'"
  ).get();
  const available = (row.total_deposited_xrd || 0) - (row.total_released_xrd || 0);
  return {
    total_deposited: row.total_deposited_xrd || 0,
    total_released: row.total_released_xrd || 0,
    available,
    pending: pending ? pending.t : 0,
  };
}

module.exports.createBounty = createBounty;
module.exports.claimBounty = claimBounty;
module.exports.submitBountyWork = submitBountyWork;
module.exports.approveBountyPayment = approveBountyPayment;
module.exports.markBountyPaid = markBountyPaid;
module.exports.getBountyQueuePending = getBountyQueuePending;
module.exports.expireBounties = expireBounties;
module.exports.getOpenBounties = getOpenBounties;
module.exports.getBounty = getBounty;
module.exports.getBounties = getBounties;
module.exports.getMyBounties = getMyBounties;
module.exports.depositToEscrow = depositToEscrow;
module.exports.trackEscrowRelease = trackEscrowRelease;
module.exports.getEscrowBalance = getEscrowBalance;
module.exports.VALID_CATEGORIES = VALID_CATEGORIES;
