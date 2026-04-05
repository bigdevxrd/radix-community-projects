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

  // Migration: add columns if they don't exist (safe for existing DBs)
  try { db.exec("ALTER TABLE proposals ADD COLUMN type TEXT DEFAULT 'yesno'"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN options TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN parent_id INTEGER"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN round INTEGER DEFAULT 1"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN stage TEXT DEFAULT 'standalone'"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN category TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE proposals ADD COLUMN charter_param TEXT"); } catch(e) {}

  // Charter parameter tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS charter_params (
      param_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      param_value TEXT,
      resolved_by INTEGER,
      resolved_at INTEGER,
      category TEXT NOT NULL,
      depends_on TEXT DEFAULT '[]',
      status TEXT DEFAULT 'tbd',
      phase INTEGER DEFAULT 1,
      proposal_type TEXT DEFAULT 'poll',
      options TEXT,
      FOREIGN KEY (resolved_by) REFERENCES proposals(id)
    );
  `);

  // Seed charter params if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM charter_params").get();
  if (count.c === 0) seedCharterParams();

  // Bounty + escrow tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS bounties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      reward_xrd REAL NOT NULL,
      reward_xp INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      creator_tg_id INTEGER NOT NULL,
      assignee_tg_id INTEGER,
      assignee_address TEXT,
      github_issue TEXT,
      github_pr TEXT,
      proposal_id INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      assigned_at INTEGER,
      submitted_at INTEGER,
      verified_at INTEGER,
      paid_at INTEGER,
      paid_tx TEXT,
      FOREIGN KEY (creator_tg_id) REFERENCES users(tg_id),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id)
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
      description TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    );

    CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
  `);

  // Seed escrow wallet singleton
  db.prepare("INSERT OR IGNORE INTO escrow_wallet (id) VALUES (1)").run();

  // Grid game state
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_state (
      radix_address TEXT PRIMARY KEY,
      total_rolls INTEGER DEFAULT 0,
      total_bonus_xp INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      last_roll_date TEXT,
      last_roll_value INTEGER DEFAULT 0,
      jackpots INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_game_address ON game_state(radix_address);
  `);

  // Indexes for 20k+ scale
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_address ON users(radix_address);
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status, ends_at);
    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
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

// ── Charter Params ─────────────────────────────────────

function seedCharterParams() {
  const params = [
    // Phase 1 — Foundation (no dependencies)
    { key: "charter.adoption", title: "Adopt the Radix DAO Charter", cat: "foundation", phase: 1, type: "yesno", deps: "[]" },
    { key: "rac.seats", title: "RAC seat count", cat: "foundation", phase: 1, type: "poll", opts: '["3","5","7","9"]', deps: "[]" },
    { key: "voting.quorum.standard", title: "Standard proposal quorum", cat: "foundation", phase: 1, type: "poll", opts: '["3","10","25","50"]', deps: "[]" },
    { key: "voting.period.standard", title: "Default voting period", cat: "foundation", phase: 1, type: "poll", opts: '["48 hours","72 hours","7 days"]', deps: "[]" },
    { key: "voting.approval.standard", title: "Standard approval threshold", cat: "foundation", phase: 1, type: "poll", opts: '[">50%",">60%",">66%"]', deps: "[]" },
    { key: "voting.approval.amendment", title: "Amendment approval threshold", cat: "foundation", phase: 1, type: "poll", opts: '[">60%",">66%",">75%"]', deps: "[]" },

    // Phase 2 — Configuration
    { key: "rac.multisig", title: "RAC multi-sig threshold", cat: "configuration", phase: 2, type: "poll", deps: '["rac.seats"]' },
    { key: "rac.compensation", title: "RAC member compensation", cat: "configuration", phase: 2, type: "poll", deps: '["rac.seats"]' },
    { key: "rac.meetings", title: "RAC meeting frequency", cat: "configuration", phase: 2, type: "poll", opts: '["weekly","biweekly","monthly"]', deps: '["rac.seats"]' },
    { key: "rac.inactivity", title: "RAC inactivity trigger (missed meetings)", cat: "configuration", phase: 2, type: "poll", opts: '["2","3","5"]', deps: '["rac.seats"]' },
    { key: "voting.quorum.amendment", title: "Amendment vote quorum", cat: "configuration", phase: 2, type: "poll", deps: '["voting.quorum.standard"]' },
    { key: "voting.quorum.election", title: "Election vote quorum", cat: "configuration", phase: 2, type: "poll", deps: '["voting.quorum.standard"]' },
    { key: "voting.quorum.emergency", title: "Emergency vote quorum", cat: "configuration", phase: 2, type: "poll", deps: '["voting.quorum.standard"]' },
    { key: "voting.period.amendment", title: "Amendment voting period", cat: "configuration", phase: 2, type: "poll", opts: '["7 days","14 days","21 days"]', deps: '["voting.period.standard"]' },
    { key: "voting.period.election", title: "Election voting period", cat: "configuration", phase: 2, type: "poll", opts: '["7 days","14 days"]', deps: '["voting.period.standard"]' },
    { key: "voting.period.emergency", title: "Emergency voting period", cat: "configuration", phase: 2, type: "poll", opts: '["24 hours","48 hours","72 hours"]', deps: '["voting.period.standard"]' },
    { key: "timing.forum_min", title: "Min forum discussion before vote", cat: "configuration", phase: 2, type: "poll", opts: '["24 hours","48 hours","72 hours","7 days"]', deps: '["voting.period.standard"]' },
    { key: "timing.execution_delay", title: "Delay between approval and execution", cat: "configuration", phase: 2, type: "poll", opts: '["24 hours","48 hours","72 hours"]', deps: '["voting.period.standard"]' },
    { key: "timing.cooldown", title: "Cooldown for resubmitting failed proposals", cat: "configuration", phase: 2, type: "poll", opts: '["7 days","14 days","30 days"]', deps: '["voting.period.standard"]' },
    { key: "proposals.stake", title: "Proposal stake/deposit amount (XRD)", cat: "configuration", phase: 2, type: "poll", opts: '["0","100","500","1000"]', deps: '["voting.quorum.standard"]' },
    { key: "treasury.grant_limit", title: "Max single grant (XRD)", cat: "configuration", phase: 2, type: "poll", opts: '["5000","10000","25000","50000"]', deps: '["voting.approval.standard"]' },
    { key: "treasury.bounty_limit", title: "Max single bounty (XRD)", cat: "configuration", phase: 2, type: "poll", opts: '["1000","5000","10000"]', deps: '["voting.approval.standard"]' },
    { key: "treasury.ops_limit", title: "Monthly ops spending limit (XRD)", cat: "configuration", phase: 2, type: "poll", opts: '["5000","10000","25000"]', deps: '["voting.approval.standard"]' },
    { key: "treasury.emergency_cap", title: "Emergency spending cap (XRD)", cat: "configuration", phase: 2, type: "poll", opts: '["10000","25000","50000"]', deps: '["voting.approval.standard","voting.quorum.emergency"]' },
    { key: "reputation.decay", title: "XP decay rate per month", cat: "configuration", phase: 2, type: "poll", opts: '["0%","5%","10%"]', deps: '["voting.quorum.standard"]' },
    { key: "enforcement.suspension", title: "Default suspension duration", cat: "configuration", phase: 2, type: "poll", opts: '["30 days","60 days","90 days"]', deps: '["voting.approval.standard"]' },

    // Phase 3 — Operational
    { key: "election.nomination_period", title: "RAC nomination period", cat: "operational", phase: 3, type: "poll", opts: '["7 days","14 days"]', deps: '["voting.period.election"]' },
    { key: "election.discussion_period", title: "Candidate discussion period", cat: "operational", phase: 3, type: "poll", opts: '["7 days","14 days"]', deps: '["voting.period.election"]' },
    { key: "election.min_activity", title: "Min governance activity for RAC eligibility", cat: "operational", phase: 3, type: "poll", deps: '["voting.quorum.election"]' },
    { key: "rac.first_election", title: "Launch first RAC election", cat: "operational", phase: 3, type: "yesno", deps: '["election.nomination_period","election.discussion_period","election.min_activity"]' },
    { key: "treasury.first_fund", title: "Establish first bounty fund", cat: "operational", phase: 3, type: "yesno", deps: '["treasury.grant_limit","treasury.bounty_limit"]' },
    { key: "infra.hosting", title: "Approve infrastructure hosting arrangement", cat: "operational", phase: 3, type: "yesno", deps: '["charter.adoption"]' },
  ];

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO charter_params (param_key, title, category, phase, proposal_type, options, depends_on, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'tbd')"
  );
  for (const p of params) {
    stmt.run(p.key, p.title, p.cat, p.phase, p.type, p.opts || null, p.deps);
  }
}

function getCharterParams(category) {
  if (category) {
    return db.prepare("SELECT * FROM charter_params WHERE category = ? ORDER BY phase, param_key").all(category);
  }
  return db.prepare("SELECT * FROM charter_params ORDER BY phase, param_key").all();
}

function getCharterParam(key) {
  return db.prepare("SELECT * FROM charter_params WHERE param_key = ?").get(key);
}

function resolveCharterParam(key, value, proposalId) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    "UPDATE charter_params SET param_value = ?, resolved_by = ?, resolved_at = ?, status = 'resolved' WHERE param_key = ?"
  ).run(value, proposalId, now, key);
}

function getCharterStatus() {
  const total = db.prepare("SELECT COUNT(*) as c FROM charter_params").get().c;
  const resolved = db.prepare("SELECT COUNT(*) as c FROM charter_params WHERE status = 'resolved'").get().c;
  const voting = db.prepare("SELECT COUNT(*) as c FROM charter_params WHERE status = 'voting'").get().c;
  const tbd = db.prepare("SELECT COUNT(*) as c FROM charter_params WHERE status = 'tbd'").get().c;
  return { total, resolved, voting, tbd };
}

function getReadyParams() {
  // Return params whose dependencies are all resolved
  const all = db.prepare("SELECT * FROM charter_params WHERE status = 'tbd' ORDER BY phase").all();
  return all.filter(p => {
    const deps = JSON.parse(p.depends_on || "[]");
    if (deps.length === 0) return true;
    return deps.every(d => {
      const dep = db.prepare("SELECT status FROM charter_params WHERE param_key = ?").get(d);
      return dep && dep.status === "resolved";
    });
  });
}

// ── Bounties ───────────────────────────────────────────
// Lifecycle: open → assigned → submitted → verified → paid

function createBounty(title, rewardXrd, creatorTgId, opts = {}) {
  const result = db.prepare(
    "INSERT INTO bounties (title, description, reward_xrd, reward_xp, creator_tg_id, github_issue, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(title, opts.description || null, rewardXrd, opts.rewardXp || 0, creatorTgId, opts.githubIssue || null, opts.proposalId || null);
  return result.lastInsertRowid;
}

function getBounty(id) { return db.prepare("SELECT * FROM bounties WHERE id = ?").get(id); }
function getOpenBounties() { return db.prepare("SELECT * FROM bounties WHERE status IN ('open','assigned') ORDER BY created_at DESC").all(); }
function getAllBounties() { return db.prepare("SELECT * FROM bounties ORDER BY created_at DESC").all(); }

function assignBounty(id, tgId, radixAddress) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare("UPDATE bounties SET assignee_tg_id = ?, assignee_address = ?, status = 'assigned', assigned_at = ? WHERE id = ? AND status = 'open'")
    .run(tgId, radixAddress, now, id);
}

function submitBounty(id, githubPr) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare("UPDATE bounties SET github_pr = ?, status = 'submitted', submitted_at = ? WHERE id = ? AND status = 'assigned'")
    .run(githubPr, now, id);
}

function verifyBounty(id) {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare("UPDATE bounties SET status = 'verified', verified_at = ? WHERE id = ? AND status = 'submitted'")
    .run(now, id);
}

function payBounty(id, txHash) {
  const now = Math.floor(Date.now() / 1000);
  const bounty = getBounty(id);
  if (!bounty || bounty.status !== "verified") return { ok: false, error: "not_verified" };
  db.prepare("UPDATE bounties SET paid_tx = ?, status = 'paid', paid_at = ? WHERE id = ?").run(txHash, now, id);
  // Record in escrow ledger
  db.prepare("UPDATE escrow_wallet SET total_released_xrd = total_released_xrd + ? WHERE id = 1").run(bounty.reward_xrd);
  db.prepare("INSERT INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description) VALUES (?, 'release', ?, ?, ?)")
    .run(id, bounty.reward_xrd, txHash, "Bounty #" + id + " paid to " + (bounty.assignee_address || "unknown").slice(0, 20));
  return { ok: true };
}

function fundEscrow(amountXrd, txHash) {
  db.prepare("UPDATE escrow_wallet SET total_funded_xrd = total_funded_xrd + ? WHERE id = 1").run(amountXrd);
  db.prepare("INSERT INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description) VALUES (NULL, 'deposit', ?, ?, 'Escrow funded')")
    .run(amountXrd, txHash);
}

function getEscrowBalance() {
  const row = db.prepare("SELECT * FROM escrow_wallet WHERE id = 1").get();
  return {
    funded: row?.total_funded_xrd || 0,
    released: row?.total_released_xrd || 0,
    available: (row?.total_funded_xrd || 0) - (row?.total_released_xrd || 0),
  };
}

function getBountyTransactions() {
  return db.prepare("SELECT * FROM bounty_transactions ORDER BY created_at DESC LIMIT 50").all();
}

function getBountyStats() {
  const open = db.prepare("SELECT COUNT(*) as c FROM bounties WHERE status = 'open'").get().c;
  const assigned = db.prepare("SELECT COUNT(*) as c FROM bounties WHERE status = 'assigned'").get().c;
  const submitted = db.prepare("SELECT COUNT(*) as c FROM bounties WHERE status = 'submitted'").get().c;
  const verified = db.prepare("SELECT COUNT(*) as c FROM bounties WHERE status = 'verified'").get().c;
  const paid = db.prepare("SELECT COUNT(*) as c FROM bounties WHERE status = 'paid'").get().c;
  const totalPaid = db.prepare("SELECT COALESCE(SUM(reward_xrd), 0) as t FROM bounties WHERE status = 'paid'").get().t;
  const escrow = getEscrowBalance();
  return { open, assigned, submitted, verified, paid, totalPaid, escrow };
}

// ── Grid Game ──────────────────────────────────────────
// Weighted dice: 1=30%, 2=25%, 3=20%, 4=13%, 5=8%, 6=4%

const ROLL_WEIGHTS = [30, 25, 20, 13, 8, 4]; // must sum to 100
const ROLL_BONUSES = [0, 5, 10, 25, 50, 100]; // XP bonus per roll

function rollDice() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < ROLL_WEIGHTS.length; i++) {
    cumulative += ROLL_WEIGHTS[i];
    if (rand < cumulative) return i + 1; // 1-6
  }
  return 1;
}

function recordRoll(radixAddress, rollValue) {
  const bonus = ROLL_BONUSES[rollValue - 1] || 0;
  const today = new Date().toISOString().slice(0, 10);

  const existing = db.prepare("SELECT * FROM game_state WHERE radix_address = ?").get(radixAddress);
  if (!existing) {
    db.prepare(
      "INSERT INTO game_state (radix_address, total_rolls, total_bonus_xp, streak_days, last_roll_date, last_roll_value, jackpots) VALUES (?, 1, ?, 1, ?, ?, ?)"
    ).run(radixAddress, bonus, today, rollValue, rollValue === 6 ? 1 : 0);
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = existing.last_roll_date === yesterday ? existing.streak_days + 1 :
                      existing.last_roll_date === today ? existing.streak_days : 1;
    db.prepare(
      "UPDATE game_state SET total_rolls = total_rolls + 1, total_bonus_xp = total_bonus_xp + ?, streak_days = ?, last_roll_date = ?, last_roll_value = ?, jackpots = jackpots + ? WHERE radix_address = ?"
    ).run(bonus, newStreak, today, rollValue, rollValue === 6 ? 1 : 0, radixAddress);
  }

  return { roll: rollValue, bonus };
}

function getGameState(radixAddress) {
  return db.prepare("SELECT * FROM game_state WHERE radix_address = ?").get(radixAddress) || {
    total_rolls: 0, total_bonus_xp: 0, streak_days: 0, last_roll_value: 0, jackpots: 0,
  };
}

function getGameLeaderboard(limit = 10) {
  return db.prepare("SELECT * FROM game_state ORDER BY total_bonus_xp DESC LIMIT ?").all(limit);
}

module.exports = {
  init,
  getUser, registerUser,
  createProposal, updateProposalMessage, getProposal,
  getActiveProposals, closeExpiredProposals, closeProposal, getAmendments,
  recordVote, getVoteCounts, hasVoted,
  getTotalVoters, getTotalProposals,
  getCharterParams, getCharterParam, resolveCharterParam, getCharterStatus, getReadyParams,
  createBounty, getBounty, getOpenBounties, getAllBounties, assignBounty, submitBounty, verifyBounty, payBounty,
  fundEscrow, getEscrowBalance, getBountyTransactions, getBountyStats,
  rollDice, recordRoll, getGameState, getGameLeaderboard, ROLL_BONUSES,
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
