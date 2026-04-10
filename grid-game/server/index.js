'use strict';

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT, 10) || 4100;
const CORS_ORIGINS = [
  'http://localhost:3001',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
];

const MEME_COINS_PER_XRD = 100;
const MAX_COINS_PER_PURCHASE = 10_000;
const BOARD_COST = 50;
const ROLL_COST = 10;
const GRID_SIZE = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

// ---------------------------------------------------------------------------
// Level definitions
// ---------------------------------------------------------------------------

const LEVELS = [
  { level: 1, name: 'Normie', xp: 0 },
  { level: 2, name: 'Degen', xp: 100 },
  { level: 3, name: 'Ape', xp: 300 },
  { level: 4, name: 'Chad', xp: 600 },
  { level: 5, name: 'Whale', xp: 1_000 },
  { level: 6, name: 'Diamond Hands', xp: 2_000 },
  { level: 7, name: 'Moon Boy', xp: 4_000 },
  { level: 8, name: 'Gigachad', xp: 8_000 },
  { level: 9, name: 'Legendary Degen', xp: 16_000 },
  { level: 10, name: 'Meme Lord', xp: 32_000 },
];

// ---------------------------------------------------------------------------
// Cell type configuration
// ---------------------------------------------------------------------------

const CELL_TYPES = {
  normal:       { emoji: '⬜', weight: 40, threshold: 3, reward: 10,  xp: 10, desc: 'Normal cell' },
  double_score: { emoji: '🚀', weight: 15, threshold: 4, reward: 20,  xp: 10, desc: 'Double score! 2x coins' },
  extra_turn:   { emoji: '🎁', weight: 12, threshold: 3, reward: 10,  xp: 10, desc: 'Extra turn – roll refunded' },
  wild:         { emoji: '🃏', weight: 8,  threshold: 5, reward: 15,  xp: 10, desc: 'Wild card – choose a cell' },
  rug_pull:     { emoji: '💀', weight: 10, threshold: 4, reward: -20, xp: 5,  desc: 'Rug pull! Lose coins' },
  pepe_bonus:   { emoji: '🐸', weight: 8,  threshold: 4, reward: 25,  xp: 15, desc: 'Pepe bonus – NFT chance' },
  diamond:      { emoji: '💎', weight: 4,  threshold: 6, reward: 100, xp: 50, desc: 'Diamond jackpot!' },
  moon:         { emoji: '🌙', weight: 3,  threshold: 5, reward: 30,  xp: 100, desc: 'Moon – huge XP' },
};

// Pre-compute weighted pick array
const CELL_WEIGHT_POOL = [];
for (const [type, cfg] of Object.entries(CELL_TYPES)) {
  for (let i = 0; i < cfg.weight; i++) CELL_WEIGHT_POOL.push(type);
}

// ---------------------------------------------------------------------------
// NFT definitions
// ---------------------------------------------------------------------------

const NFT_CATALOG = {
  common: [
    { name: 'Wojak',           emoji: '😢', desc: 'The eternal bag holder. Feels bad man.' },
    { name: 'Stonks Arrow',    emoji: '📈', desc: 'Number go up. Always.' },
    { name: 'This Is Fine Dog', emoji: '🐕', desc: 'Everything is on fire but we vibin.' },
    { name: 'Smol Brain',      emoji: '🧠', desc: 'Bought the top, sold the bottom.' },
  ],
  uncommon: [
    { name: 'Laser Eye Pepe',      emoji: '🐸', desc: 'Laser eyes activated. Bullish.' },
    { name: 'Diamond Hands Emoji',  emoji: '💎', desc: 'These hands never sell.' },
    { name: 'To The Moon Rocket',   emoji: '🚀', desc: 'Destination: stratosphere.' },
    { name: 'Based Department',     emoji: '🏢', desc: 'Hello? Based department? Yes, this one.' },
  ],
  rare: [
    { name: 'Golden Pepe',  emoji: '🐸', desc: 'A legendary golden Pepe. Extremely rare.' },
    { name: 'Giga Chad',    emoji: '🗿', desc: 'Average hodler enjoyer.' },
    { name: 'Doge King',    emoji: '👑', desc: 'Much crown. Very royalty. Wow.' },
    { name: 'Wen Lambo',    emoji: '🏎️', desc: 'Soon™. Trust the process.' },
  ],
  epic: [
    { name: 'Rainbow Pepe',     emoji: '🌈', desc: 'The mythical rainbow Pepe blesses your portfolio.' },
    { name: 'Chad Thundercock',  emoji: '⚡', desc: 'Bought at the absolute bottom.' },
    { name: 'Shiba Supreme',    emoji: '🐕', desc: 'The goodest boi in all of crypto.' },
    { name: 'Moon Man',         emoji: '🌙', desc: 'Has been to the moon and back. Twice.' },
  ],
  legendary: [
    { name: 'Diamond Pepe',       emoji: '💎', desc: 'Forged under extreme sell pressure.' },
    { name: 'Crypto Wizard',      emoji: '🧙', desc: 'Predicted the bottom. Every single time.' },
    { name: 'Meme Lord Supreme',  emoji: '👑', desc: 'Lord of all memes. Bow down.' },
    { name: 'Galaxy Brain',       emoji: '🌌', desc: '200 IQ play. Beyond comprehension.' },
  ],
  mythic: [
    { name: 'The One Pepe',     emoji: '🐸', desc: 'There can be only one. This is it.' },
    { name: "Satoshi's Ghost",   emoji: '👻', desc: 'The spirit of Satoshi guides your rolls.' },
    { name: 'Ultimate Degen',   emoji: '🎰', desc: 'Has ascended beyond mere mortal degen status.' },
  ],
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// Rarity weights for random NFT drops at each minimum rarity tier
const RARITY_WEIGHTS = {
  common:    { common: 50, uncommon: 25, rare: 15, epic: 7, legendary: 2.5, mythic: 0.5 },
  rare:      { common: 0,  uncommon: 0,  rare: 50, epic: 30, legendary: 15, mythic: 5 },
};

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------

const DB_PATH = path.join(__dirname, 'meme-grid.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    radix_address   TEXT    UNIQUE NOT NULL,
    meme_coins      INTEGER NOT NULL DEFAULT 0,
    level           INTEGER NOT NULL DEFAULT 1,
    xp              INTEGER NOT NULL DEFAULT 0,
    total_rolls     INTEGER NOT NULL DEFAULT 0,
    total_wins      INTEGER NOT NULL DEFAULT 0,
    jackpots        INTEGER NOT NULL DEFAULT 0,
    nfts_earned     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS game_boards (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id         INTEGER NOT NULL REFERENCES players(id),
    grid              TEXT    NOT NULL,
    score             INTEGER NOT NULL DEFAULT 0,
    rolls_used        INTEGER NOT NULL DEFAULT 0,
    status            TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
    level_at_creation INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    completed_at      TEXT
  );

  CREATE TABLE IF NOT EXISTS nft_collection (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id),
    nft_type    TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    rarity      TEXT    NOT NULL CHECK(rarity IN ('common','uncommon','rare','epic','legendary','mythic')),
    image_emoji TEXT    NOT NULL,
    earned_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    metadata    TEXT    NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id),
    type        TEXT    NOT NULL CHECK(type IN ('buy_coins','roll','nft_earn','level_up')),
    amount      INTEGER NOT NULL DEFAULT 0,
    details     TEXT    NOT NULL DEFAULT '{}',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_players_address     ON players(radix_address);
  CREATE INDEX IF NOT EXISTS idx_boards_player       ON game_boards(player_id, status);
  CREATE INDEX IF NOT EXISTS idx_nfts_player         ON nft_collection(player_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);
`);

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmts = {
  getPlayerByAddress:  db.prepare('SELECT * FROM players WHERE radix_address = ?'),
  insertPlayer:        db.prepare('INSERT INTO players (radix_address) VALUES (?)'),
  updatePlayerCoins:   db.prepare('UPDATE players SET meme_coins = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  updatePlayerStats:   db.prepare(`
    UPDATE players
    SET meme_coins  = ?,
        xp          = ?,
        level       = ?,
        total_rolls = ?,
        total_wins  = ?,
        jackpots    = ?,
        nfts_earned = ?,
        updated_at  = datetime('now')
    WHERE id = ?
  `),
  getActiveBoard:      db.prepare('SELECT * FROM game_boards WHERE player_id = ? AND status = \'active\' ORDER BY id DESC LIMIT 1'),
  insertBoard:         db.prepare('INSERT INTO game_boards (player_id, grid, level_at_creation) VALUES (?, ?, ?)'),
  updateBoard:         db.prepare('UPDATE game_boards SET grid = ?, score = ?, rolls_used = ?, status = ?, completed_at = ? WHERE id = ?'),
  insertNft:           db.prepare('INSERT INTO nft_collection (player_id, nft_type, name, rarity, image_emoji, metadata) VALUES (?, ?, ?, ?, ?, ?)'),
  getPlayerNfts:       db.prepare('SELECT * FROM nft_collection WHERE player_id = ? ORDER BY earned_at DESC'),
  insertTransaction:   db.prepare('INSERT INTO transactions (player_id, type, amount, details) VALUES (?, ?, ?, ?)'),
  leaderboardScore:    db.prepare(`
    SELECT radix_address, meme_coins, level, xp, total_rolls, total_wins, jackpots, nfts_earned,
           (xp + meme_coins / 10) AS total_score
    FROM players ORDER BY total_score DESC LIMIT 50
  `),
  leaderboardNfts:     db.prepare(`
    SELECT p.radix_address, p.level, COUNT(n.id) AS nft_count
    FROM players p
    LEFT JOIN nft_collection n ON n.player_id = p.id
    GROUP BY p.id
    ORDER BY nft_count DESC
    LIMIT 50
  `),
  globalStats:         db.prepare(`
    SELECT
      COUNT(*)                AS total_players,
      COALESCE(SUM(total_rolls), 0) AS total_rolls,
      COALESCE(SUM(total_wins), 0)  AS total_wins,
      COALESCE(SUM(jackpots), 0)    AS total_jackpots,
      COALESCE(SUM(nfts_earned), 0) AS total_nfts
    FROM players
  `),
  totalBoards:         db.prepare('SELECT COUNT(*) AS count FROM game_boards'),
  totalCompletedBoards: db.prepare("SELECT COUNT(*) AS count FROM game_boards WHERE status = 'completed'"),
};

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Return a random integer in [min, max] inclusive. */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array. */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Compute the level for a given XP total. */
function computeLevel(xp) {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) result = l;
    else break;
  }
  return result;
}

/** Generate a random 8x8 grid. */
function generateGrid() {
  const grid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const type = pick(CELL_WEIGHT_POOL);
      const cfg = CELL_TYPES[type];
      cells.push({
        row,
        col,
        type,
        emoji: cfg.emoji,
        state: 'hidden',       // hidden | revealed | completed
        threshold: cfg.threshold,
        reward: cfg.reward,
        xp: cfg.xp,
      });
    }
    grid.push(cells);
  }
  return grid;
}

/** Pick a random NFT at a given minimum rarity or above. */
function rollNft(minRarity = 'common') {
  const weights = RARITY_WEIGHTS[minRarity] || RARITY_WEIGHTS.common;
  const pool = [];
  for (const [rarity, w] of Object.entries(weights)) {
    for (let i = 0; i < w * 10; i++) pool.push(rarity);
  }
  const rarity = pick(pool);
  const candidates = NFT_CATALOG[rarity];
  const template = pick(candidates);
  return {
    nft_type: template.name.toLowerCase().replace(/\s+/g, '_'),
    name: template.name,
    rarity,
    image_emoji: template.emoji,
    metadata: JSON.stringify({ description: template.desc, rarity, emoji: template.emoji }),
  };
}

/** Award an NFT to a player. Returns the NFT row. */
function awardNft(playerId, minRarity = 'common') {
  const nft = rollNft(minRarity);
  stmts.insertNft.run(playerId, nft.nft_type, nft.name, nft.rarity, nft.image_emoji, nft.metadata);
  stmts.insertTransaction.run(playerId, 'nft_earn', 0, JSON.stringify({ nft_name: nft.name, rarity: nft.rarity }));
  return nft;
}

/** Validate that a string looks like a plausible Radix address. */
function isValidAddress(addr) {
  return typeof addr === 'string' && /^account_[a-z0-9]{10,}$/i.test(addr);
}

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (per IP, sliding window)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
  }

  next();
}

// Periodically clean up stale rate-limit entries
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS * 2;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.windowStart < cutoff) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json({ limit: '4kb' }));
app.use(rateLimit);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ---------------------------------------------------------------------------
// Player routes
// ---------------------------------------------------------------------------

/** Register a new player (idempotent). */
app.post('/api/player/:address/register', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    let player = stmts.getPlayerByAddress.get(address);
    if (!player) {
      stmts.insertPlayer.run(address);
      player = stmts.getPlayerByAddress.get(address);
    }

    const levelInfo = computeLevel(player.xp);
    res.json({ player: { ...player, level_name: levelInfo.name } });
  } catch (err) {
    console.error('POST /register error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** Get player info. */
app.get('/api/player/:address', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    const player = stmts.getPlayerByAddress.get(address);
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    const levelInfo = computeLevel(player.xp);
    const nextLevel = LEVELS.find((l) => l.xp > player.xp);
    res.json({
      player: {
        ...player,
        level_name: levelInfo.name,
        next_level_xp: nextLevel ? nextLevel.xp : null,
      },
    });
  } catch (err) {
    console.error('GET /player error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** Buy MEME coins with XRD. */
app.post('/api/player/:address/buy-coins', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    const player = stmts.getPlayerByAddress.get(address);
    if (!player) return res.status(404).json({ error: 'Player not found. Register first.' });

    const xrdAmount = Number(req.body.xrd_amount);
    if (!Number.isFinite(xrdAmount) || xrdAmount <= 0) {
      return res.status(400).json({ error: 'xrd_amount must be a positive number.' });
    }

    const coins = Math.floor(xrdAmount * MEME_COINS_PER_XRD);
    if (coins <= 0) {
      return res.status(400).json({ error: 'Amount too small.' });
    }
    if (coins > MAX_COINS_PER_PURCHASE) {
      return res.status(400).json({ error: `Max ${MAX_COINS_PER_PURCHASE} MEME coins per purchase.` });
    }

    const newBalance = player.meme_coins + coins;
    stmts.updatePlayerCoins.run(newBalance, player.id);
    stmts.insertTransaction.run(player.id, 'buy_coins', coins, JSON.stringify({ xrd_amount: xrdAmount }));

    res.json({ coins_purchased: coins, new_balance: newBalance });
  } catch (err) {
    console.error('POST /buy-coins error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// Game routes
// ---------------------------------------------------------------------------

/** Create a new 8×8 board (costs BOARD_COST MEME coins). */
app.post('/api/game/:address/new-board', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    const player = stmts.getPlayerByAddress.get(address);
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    // Ensure no currently active board
    const active = stmts.getActiveBoard.get(player.id);
    if (active) {
      return res.status(409).json({ error: 'You already have an active board. Complete or abandon it first.' });
    }

    if (player.meme_coins < BOARD_COST) {
      return res.status(400).json({ error: `Not enough MEME coins. Need ${BOARD_COST}, have ${player.meme_coins}.` });
    }

    const grid = generateGrid();
    const newBalance = player.meme_coins - BOARD_COST;
    stmts.updatePlayerCoins.run(newBalance, player.id);
    stmts.insertTransaction.run(player.id, 'roll', -BOARD_COST, JSON.stringify({ action: 'new_board' }));

    const result = stmts.insertBoard.run(player.id, JSON.stringify(grid), player.level);
    const board = { id: result.lastInsertRowid, grid, score: 0, rolls_used: 0, status: 'active' };

    res.json({ board, new_balance: newBalance });
  } catch (err) {
    console.error('POST /new-board error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** Get the current active board. */
app.get('/api/game/:address/board', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    const player = stmts.getPlayerByAddress.get(address);
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    const board = stmts.getActiveBoard.get(player.id);
    if (!board) return res.status(404).json({ error: 'No active board.' });

    res.json({ board: { ...board, grid: JSON.parse(board.grid) } });
  } catch (err) {
    console.error('GET /board error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** Roll the dice on the active board. */
app.post('/api/game/:address/roll', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    const player = stmts.getPlayerByAddress.get(address);
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    const boardRow = stmts.getActiveBoard.get(player.id);
    if (!boardRow) return res.status(404).json({ error: 'No active board. Create one first.' });

    if (player.meme_coins < ROLL_COST) {
      return res.status(400).json({ error: `Not enough MEME coins. Need ${ROLL_COST}, have ${player.meme_coins}.` });
    }

    const grid = JSON.parse(boardRow.grid);

    // Gather unrevealed / revealed (not completed) cells
    const candidates = [];
    for (const row of grid) {
      for (const cell of row) {
        if (cell.state !== 'completed') candidates.push(cell);
      }
    }

    if (candidates.length === 0) {
      return res.status(400).json({ error: 'Board is fully completed.' });
    }

    // Roll the dice (1-6)
    const dice = randInt(1, 6);
    const cell = pick(candidates);
    const effectiveThreshold = cell.state === 'revealed'
      ? Math.max(1, cell.threshold - 2)
      : cell.threshold;

    let coinsDelta = -ROLL_COST;
    let xpDelta = 0;
    let rollRefunded = false;
    let nftAwarded = null;
    let jackpot = false;
    let message = '';

    const success = dice >= effectiveThreshold;

    if (success) {
      cell.state = 'completed';
      xpDelta += cell.xp;

      if (cell.type === 'double_score') {
        coinsDelta += cell.reward * 2;
        message = '🚀 Double score! Coins doubled!';
      } else if (cell.type === 'extra_turn') {
        coinsDelta += cell.reward + ROLL_COST; // Refund the roll cost
        rollRefunded = true;
        message = '🎁 Extra turn! Roll refunded!';
      } else if (cell.type === 'rug_pull') {
        coinsDelta += cell.reward; // negative reward
        message = '💀 Rug pull! You lost coins!';
      } else if (cell.type === 'pepe_bonus') {
        coinsDelta += cell.reward;
        // 30% chance of NFT
        if (Math.random() < 0.30) {
          nftAwarded = awardNft(player.id, 'common');
          player.nfts_earned += 1;
          message = '🐸 Pepe bonus! You earned an NFT!';
        } else {
          message = '🐸 Pepe bonus! Nice coins!';
        }
      } else if (cell.type === 'diamond') {
        coinsDelta += cell.reward;
        jackpot = true;
        nftAwarded = awardNft(player.id, 'rare');
        player.nfts_earned += 1;
        message = '💎 JACKPOT! Diamond cell completed!';
      } else if (cell.type === 'moon') {
        coinsDelta += cell.reward;
        message = '🌙 To the moon! Huge XP earned!';
      } else if (cell.type === 'wild') {
        coinsDelta += cell.reward;
        message = '🃏 Wild card completed!';
      } else {
        coinsDelta += cell.reward;
        message = '✅ Cell completed!';
      }
    } else {
      // Partial progress – mark as revealed so next attempt is easier
      if (cell.state === 'hidden') {
        cell.state = 'revealed';
        message = `❌ Needed ${effectiveThreshold}, rolled ${dice}. Cell revealed – easier next time!`;
      } else {
        message = `❌ Needed ${effectiveThreshold}, rolled ${dice}. Try again!`;
      }
    }

    // Update grid in the board row
    grid[cell.row][cell.col] = cell;
    const newScore = boardRow.score + Math.max(0, coinsDelta + ROLL_COST);
    const newRolls = boardRow.rolls_used + 1;

    // Check if the board is now fully completed
    let boardCompleted = true;
    for (const row of grid) {
      for (const c of row) {
        if (c.state !== 'completed') { boardCompleted = false; break; }
      }
      if (!boardCompleted) break;
    }

    let boardCompletionBonus = 0;
    let boardCompletionNft = null;

    if (boardCompleted) {
      boardCompletionBonus = player.level * 50;
      xpDelta += boardCompletionBonus;
      player.total_wins += 1;

      // Guaranteed common or better NFT on board completion
      boardCompletionNft = awardNft(player.id, 'common');
      player.nfts_earned += 1;
    }

    // Apply player updates
    const newCoins = Math.max(0, player.meme_coins + coinsDelta);
    const newXp = player.xp + xpDelta;
    const oldLevel = player.level;
    const newLevelInfo = computeLevel(newXp);
    const newLevel = newLevelInfo.level;
    player.total_rolls += 1;
    if (jackpot) player.jackpots += 1;

    // Level-up NFT
    let levelUpNft = null;
    if (newLevel > oldLevel) {
      // Map level to rarity
      const rarityIndex = Math.min(newLevel - 1, RARITY_ORDER.length - 1);
      const levelRarity = RARITY_ORDER[rarityIndex];
      levelUpNft = awardNft(player.id, levelRarity);
      player.nfts_earned += 1;
      stmts.insertTransaction.run(player.id, 'level_up', 0, JSON.stringify({ new_level: newLevel, level_name: newLevelInfo.name }));
    }

    stmts.updatePlayerStats.run(
      newCoins, newXp, newLevel,
      player.total_rolls, player.total_wins, player.jackpots, player.nfts_earned,
      player.id,
    );

    // Update board
    const boardStatus = boardCompleted ? 'completed' : 'active';
    const completedAt = boardCompleted ? new Date().toISOString() : null;
    stmts.updateBoard.run(JSON.stringify(grid), newScore, newRolls, boardStatus, completedAt, boardRow.id);

    stmts.insertTransaction.run(player.id, 'roll', coinsDelta, JSON.stringify({
      dice, cell_type: cell.type, cell_row: cell.row, cell_col: cell.col, success,
    }));

    res.json({
      dice,
      cell: { row: cell.row, col: cell.col, type: cell.type, emoji: CELL_TYPES[cell.type].emoji, state: cell.state },
      success,
      message,
      roll_refunded: rollRefunded,
      coins_delta: coinsDelta,
      xp_delta: xpDelta,
      new_balance: newCoins,
      new_xp: newXp,
      new_level: newLevel,
      level_name: newLevelInfo.name,
      leveled_up: newLevel > oldLevel,
      jackpot,
      nft_awarded: nftAwarded,
      board_completed: boardCompleted,
      board_completion_bonus: boardCompletionBonus,
      board_completion_nft: boardCompletionNft,
      level_up_nft: levelUpNft,
      board: { id: boardRow.id, score: newScore, rolls_used: newRolls, status: boardStatus },
    });
  } catch (err) {
    console.error('POST /roll error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** Use wild card to auto-complete a chosen cell. */
app.post('/api/game/:address/use-wild', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    const player = stmts.getPlayerByAddress.get(address);
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    const boardRow = stmts.getActiveBoard.get(player.id);
    if (!boardRow) return res.status(404).json({ error: 'No active board.' });

    const { row, col } = req.body;
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return res.status(400).json({ error: 'Invalid row/col. Must be integers 0-7.' });
    }

    const grid = JSON.parse(boardRow.grid);
    const targetCell = grid[row][col];

    if (targetCell.state === 'completed') {
      return res.status(400).json({ error: 'Cell is already completed.' });
    }

    // Check if any completed wild cells exist to consume
    let wildFound = false;
    for (const r of grid) {
      for (const c of r) {
        if (c.type === 'wild' && c.state === 'completed') {
          // Already used – can't re-use
          continue;
        }
        if (c.type === 'wild' && c.state !== 'completed') {
          // Consume this wild card
          c.state = 'completed';
          wildFound = true;
          break;
        }
      }
      if (wildFound) break;
    }

    if (!wildFound) {
      return res.status(400).json({ error: 'No available wild cards on the board.' });
    }

    // Auto-complete the target cell
    targetCell.state = 'completed';
    const xpDelta = targetCell.xp;
    const coinsDelta = targetCell.reward;

    grid[row][col] = targetCell;

    // Check board completion
    let boardCompleted = true;
    for (const r of grid) {
      for (const c of r) {
        if (c.state !== 'completed') { boardCompleted = false; break; }
      }
      if (!boardCompleted) break;
    }

    let boardCompletionBonus = 0;
    let boardCompletionNft = null;

    if (boardCompleted) {
      boardCompletionBonus = player.level * 50;
      player.total_wins += 1;
      boardCompletionNft = awardNft(player.id, 'common');
      player.nfts_earned += 1;
    }

    const newCoins = Math.max(0, player.meme_coins + coinsDelta);
    const newXp = player.xp + xpDelta + boardCompletionBonus;
    const oldLevel = player.level;
    const newLevelInfo = computeLevel(newXp);
    const newLevel = newLevelInfo.level;

    let levelUpNft = null;
    if (newLevel > oldLevel) {
      const rarityIndex = Math.min(newLevel - 1, RARITY_ORDER.length - 1);
      levelUpNft = awardNft(player.id, RARITY_ORDER[rarityIndex]);
      player.nfts_earned += 1;
      stmts.insertTransaction.run(player.id, 'level_up', 0, JSON.stringify({ new_level: newLevel, level_name: newLevelInfo.name }));
    }

    stmts.updatePlayerStats.run(
      newCoins, newXp, newLevel,
      player.total_rolls, player.total_wins, player.jackpots, player.nfts_earned,
      player.id,
    );

    const newScore = boardRow.score + Math.max(0, coinsDelta);
    const boardStatus = boardCompleted ? 'completed' : 'active';
    const completedAt = boardCompleted ? new Date().toISOString() : null;
    stmts.updateBoard.run(JSON.stringify(grid), newScore, boardRow.rolls_used, boardStatus, completedAt, boardRow.id);

    res.json({
      message: `🃏 Wild card used! Cell (${row},${col}) auto-completed!`,
      cell: { row, col, type: targetCell.type, emoji: CELL_TYPES[targetCell.type].emoji, state: 'completed' },
      coins_delta: coinsDelta,
      xp_delta: xpDelta + boardCompletionBonus,
      new_balance: newCoins,
      new_xp: newXp,
      new_level: newLevel,
      level_name: newLevelInfo.name,
      leveled_up: newLevel > oldLevel,
      board_completed: boardCompleted,
      board_completion_bonus: boardCompletionBonus,
      board_completion_nft: boardCompletionNft,
      level_up_nft: levelUpNft,
    });
  } catch (err) {
    console.error('POST /use-wild error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** Get player's NFT collection. */
app.get('/api/game/:address/nfts', (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid Radix address format.' });
    }

    const player = stmts.getPlayerByAddress.get(address);
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    const nfts = stmts.getPlayerNfts.all(player.id).map((n) => ({
      ...n,
      metadata: JSON.parse(n.metadata),
    }));

    res.json({ nfts, total: nfts.length });
  } catch (err) {
    console.error('GET /nfts error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// Leaderboard & stats routes
// ---------------------------------------------------------------------------

app.get('/api/leaderboard', (_req, res) => {
  try {
    const rows = stmts.leaderboardScore.all();
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error('GET /leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/leaderboard/nfts', (_req, res) => {
  try {
    const rows = stmts.leaderboardNfts.all();
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error('GET /leaderboard/nfts error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/stats', (_req, res) => {
  try {
    const stats = stmts.globalStats.get();
    const boards = stmts.totalBoards.get();
    const completed = stmts.totalCompletedBoards.get();
    res.json({
      ...stats,
      total_boards: boards.count,
      total_completed_boards: completed.count,
    });
  } catch (err) {
    console.error('GET /stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`🎮 Meme Grid server running on http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('\nShutting down…');
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
