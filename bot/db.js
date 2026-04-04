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
      category TEXT DEFAULT 'other',
      reward_xrd REAL NOT NULL,
      status TEXT DEFAULT 'draft',
      creator_address TEXT NOT NULL,
      claimed_by_address TEXT,
      claimed_at INTEGER,
      submitted_at INTEGER,
      approved_at INTEGER,
      paid_at INTEGER,
      crumbsup_id TEXT UNIQUE,
      crumbsup_url TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      ends_at INTEGER NOT NULL,
      tx_hash_paid TEXT
    );

    CREATE TABLE IF NOT EXISTS escrow_wallet (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_funded_xrd REAL DEFAULT 0,
      total_released_xrd REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bounty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bounty_id INTEGER,
      tx_type TEXT NOT NULL,
      amount_xrd REAL NOT NULL,
      tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    );
  `);

  // Seed escrow_wallet singleton row if not present
  db.prepare("INSERT OR IGNORE INTO escrow_wallet (id) VALUES (1)").run();

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
    CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status, ends_at);
    CREATE INDEX IF NOT EXISTS idx_bounties_crumbsup ON bounties(crumbsup_id);
    CREATE INDEX IF NOT EXISTS idx_bounties_claimed_by ON bounties(claimed_by_address);
    CREATE INDEX IF NOT EXISTS idx_bounty_transactions_bounty ON bounty_transactions(bounty_id);
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

// ── Bounty functions ─────────────────────────────────────

function createBounty(title, description, category, rewardXrd, creatorAddress, daysActive) {
  const endsAt = Math.floor(Date.now() / 1000) + daysActive * 86400;
  const result = db.prepare(
    "INSERT INTO bounties (title, description, category, reward_xrd, creator_address, ends_at, status) VALUES (?, ?, ?, ?, ?, ?, 'draft')"
  ).run(title, description || null, category || "other", rewardXrd, creatorAddress, endsAt);
  return result.lastInsertRowid;
}

function getBounty(id) {
  return db.prepare("SELECT * FROM bounties WHERE id = ?").get(id);
}

function getOpenBounties(limit = 50) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(
    "SELECT * FROM bounties WHERE status = 'open' AND ends_at > ? ORDER BY created_at DESC LIMIT ?"
  ).all(now, limit);
}

function getAllBounties(limit = 100) {
  return db.prepare(
    "SELECT * FROM bounties ORDER BY created_at DESC LIMIT ?"
  ).all(limit);
}

function updateBountyStatus(id, newStatus) {
  db.prepare("UPDATE bounties SET status = ? WHERE id = ?").run(newStatus, id);
}

function claimBounty(id, claimerAddress) {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(
    "UPDATE bounties SET status = 'claimed', claimed_by_address = ?, claimed_at = ? WHERE id = ? AND status = 'open'"
  ).run(claimerAddress, now, id);
  return result.changes > 0 ? { ok: true } : { ok: false, error: "not_open_or_not_found" };
}

function submitBountyWork(id, submittedAt) {
  const ts = submittedAt || Math.floor(Date.now() / 1000);
  const result = db.prepare(
    "UPDATE bounties SET status = 'submitted', submitted_at = ? WHERE id = ? AND status = 'claimed'"
  ).run(ts, id);
  return result.changes > 0 ? { ok: true } : { ok: false, error: "not_claimed_or_not_found" };
}

function approveBountyPayment(id, approvedAt, crumbsupId) {
  const ts = approvedAt || Math.floor(Date.now() / 1000);
  const result = db.prepare(
    "UPDATE bounties SET status = 'approved', approved_at = ?, crumbsup_id = COALESCE(?, crumbsup_id) WHERE id = ? AND status = 'submitted'"
  ).run(ts, crumbsupId || null, id);
  return result.changes > 0 ? { ok: true } : { ok: false, error: "not_submitted_or_not_found" };
}

function markBountyPaid(id, txHash, paidAt) {
  const ts = paidAt || Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE bounties SET status = 'paid', tx_hash_paid = ?, paid_at = ? WHERE id = ?"
  ).run(txHash, ts, id);
}

function getBountiesPendingApproval() {
  return db.prepare(
    "SELECT * FROM bounties WHERE status = 'submitted' ORDER BY submitted_at ASC"
  ).all();
}

function getBountiesPendingPayment() {
  return db.prepare(
    "SELECT * FROM bounties WHERE status = 'approved' ORDER BY approved_at ASC"
  ).all();
}

function setBountyCrumbsUp(id, crumbsupId, crumbsupUrl) {
  db.prepare(
    "UPDATE bounties SET crumbsup_id = ?, crumbsup_url = ?, status = 'open' WHERE id = ?"
  ).run(crumbsupId, crumbsupUrl, id);
}

// ── Escrow functions ─────────────────────────────────────

function getEscrowWallet() {
  const row = db.prepare("SELECT * FROM escrow_wallet WHERE id = 1").get();
  if (!row) return { total_funded_xrd: 0, total_released_xrd: 0, available_xrd: 0 };
  return {
    total_funded_xrd: row.total_funded_xrd,
    total_released_xrd: row.total_released_xrd,
    available_xrd: row.total_funded_xrd - row.total_released_xrd,
  };
}

function recordEscrowDeposit(amountXrd) {
  db.prepare(
    "UPDATE escrow_wallet SET total_funded_xrd = total_funded_xrd + ? WHERE id = 1"
  ).run(amountXrd);
  db.prepare(
    "INSERT INTO bounty_transactions (bounty_id, tx_type, amount_xrd, status) VALUES (NULL, 'deposit', ?, 'confirmed')"
  ).run(amountXrd);
}

function recordEscrowRelease(bountyId, amountXrd, txHash) {
  db.prepare(
    "UPDATE escrow_wallet SET total_released_xrd = total_released_xrd + ? WHERE id = 1"
  ).run(amountXrd);
  db.prepare(
    "INSERT INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, status) VALUES (?, 'release', ?, ?, 'confirmed')"
  ).run(bountyId, amountXrd, txHash);
}

function getBountyTransactionHistory(bountyId) {
  return db.prepare(
    "SELECT * FROM bounty_transactions WHERE bounty_id = ? ORDER BY created_at DESC"
  ).all(bountyId);
}

module.exports = {
  init,
  getUser, registerUser,
  createProposal, updateProposalMessage, getProposal,
  getActiveProposals, closeExpiredProposals, closeProposal, getAmendments,
  recordVote, getVoteCounts, hasVoted,
  getTotalVoters, getTotalProposals,
  cancelProposal, getProposalHistory,
  // Bounty functions
  createBounty, getBounty, getOpenBounties, getAllBounties,
  updateBountyStatus, claimBounty, submitBountyWork,
  approveBountyPayment, markBountyPaid, setBountyCrumbsUp,
  getBountiesPendingApproval, getBountiesPendingPayment,
  // Escrow functions
  getEscrowWallet, recordEscrowDeposit, recordEscrowRelease,
  getBountyTransactionHistory,
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
