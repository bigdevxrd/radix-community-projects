// HTTP API for proposal data + badge verification — consumed by portal and external dApps
const http = require("http");
const db = require("../db");
const { hasBadge, getBadgeData } = require("./gateway");
const cv2 = require("./consultation");

const API_PORT = parseInt(process.env.API_PORT || "3003");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);

// Simple in-memory rate limiter
const rateBuckets = new Map();
function rateLimit(ip, maxPerMin = 60) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { count: 0, reset: now + 60000 };
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + 60000; }
  bucket.count++;
  rateBuckets.set(ip, bucket);
  return bucket.count <= maxPerMin;
}
// Clean old buckets every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of rateBuckets) { if (now > b.reset + 60000) rateBuckets.delete(ip); }
}, 300000);

function startApi() {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    // CORS — allow configured origins or * in dev
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.length > 0) {
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*"); // dev fallback
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      return res.end();
    }

    // Reject oversized URLs
    if (req.url.length > 512) {
      res.writeHead(414);
      return res.end(JSON.stringify({ ok: false, error: "uri_too_long" }));
    }

    const url = new URL(req.url, "http://localhost");

    // Allow GET + POST for game board routes, GET only for everything else
    const isGamePost = req.method === "POST" && url.pathname.includes("/board/");
    if (req.method !== "GET" && !isGamePost) {
      res.writeHead(405);
      return res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    }

    // Rate limiting (stricter for POST: 10/min)
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
    if (!rateLimit(clientIp, isGamePost ? 10 : 60)) {
      res.writeHead(429);
      return res.end(JSON.stringify({ ok: false, error: "rate_limit_exceeded" }));
    }

    // GET /api/health — system health check
    if (url.pathname === "/api/health") {
      const { getXpQueue } = require("./xp");
      const cv2Status = cv2.getSyncStatus();
      const activeProposals = db.getActiveProposals();
      const charterStatus = db.getCharterStatus();
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          uptime: Math.floor(process.uptime()),
          db: "connected",
          cv2: { enabled: cv2Status.enabled, lastSync: cv2Status.lastSync, errors: cv2Status.errors },
          proposals: { active: activeProposals.length, total: db.getTotalProposals() },
          charter: { resolved: charterStatus.resolved, total: charterStatus.total },
          xpQueue: getXpQueue().length,
          memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
          version: "1.1.0",
        }
      }));
    }

    // GET /api/proposals — proposals with vote counts (paginated)
    if (url.pathname === "/api/proposals") {
      // Don't close here — let the bot's checkExpiredProposals() handle results properly
      const status = url.searchParams.get("status") || "all";
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));

      let proposals;
      if (status === "active") {
        proposals = db.getActiveProposals();
      } else {
        proposals = db.getProposalHistory(limit);
      }

      const result = proposals.map(p => {
        const counts = db.getVoteCounts(p.id);
        return {
          ...p,
          counts,
          total_votes: Object.values(counts).reduce((a, b) => a + b, 0),
        };
      });

      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result, page, limit }));
    }

    // ── Game Board Endpoints (before general game route) ──

    // Helper: read POST body
    function readBody(req) {
      return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => { body += chunk; if (body.length > 1024) { reject(new Error("too_large")); req.destroy(); } });
        req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { resolve({}); } });
        req.on("error", reject);
      });
    }

    // GET /api/game/:address/achievements — achievement summary
    const achieveMatch = url.pathname.match(/^\/api\/game\/(account_rdx1[a-z0-9]{40,65})\/achievements$/);
    if (achieveMatch && req.method === "GET") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: db.getAchievementSummary(achieveMatch[1]) }));
    }

    // GET /api/game/:address/board — current board + available rolls
    const boardGetMatch = url.pathname.match(/^\/api\/game\/(account_rdx1[a-z0-9]{40,65})\/board$/);
    if (boardGetMatch && req.method === "GET") {
      const addr = boardGetMatch[1];
      const board = db.getBoard(addr);
      const available = db.getAvailableRolls(addr);
      const stats = db.getBoardStats(addr);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { board, available_rolls: available, ...stats } }));
    }

    // POST /api/game/:address/board/new — start new board
    const boardNewMatch = url.pathname.match(/^\/api\/game\/(account_rdx1[a-z0-9]{40,65})\/board\/new$/);
    if (boardNewMatch && req.method === "POST") {
      await readBody(req); // consume body
      const result = db.createBoard(boardNewMatch[1]);
      res.writeHead(result.ok ? 200 : 400);
      return res.end(JSON.stringify(result));
    }

    // POST /api/game/:address/board/roll — spend a roll
    const boardRollMatch = url.pathname.match(/^\/api\/game\/(account_rdx1[a-z0-9]{40,65})\/board\/roll$/);
    if (boardRollMatch && req.method === "POST") {
      await readBody(req); // consume body
      const result = db.rollOnBoard(boardRollMatch[1]);
      res.writeHead(result.ok ? 200 : 400);
      return res.end(JSON.stringify(result));
    }

    // POST /api/game/:address/board/wild — use wild card
    const boardWildMatch = url.pathname.match(/^\/api\/game\/(account_rdx1[a-z0-9]{40,65})\/board\/wild$/);
    if (boardWildMatch && req.method === "POST") {
      try {
        const body = await readBody(req);
        const result = db.useWildCard(boardWildMatch[1], body.row, body.col);
        res.writeHead(result.ok ? 200 : 400);
        return res.end(JSON.stringify(result));
      } catch { res.writeHead(400); return res.end(JSON.stringify({ ok: false, error: "invalid_body" })); }
    }

    // GET /api/game/:address — game state for an address
    const gameMatch = url.pathname.match(/^\/api\/game\/(account_rdx1[a-z0-9]{40,65})$/);
    if (gameMatch) {
      const game = db.getGameState(gameMatch[1]);
      const available = db.getAvailableRolls(gameMatch[1]);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { ...game, available_rolls: available } }));
    }

    // GET /api/leaderboard — top game players
    if (url.pathname === "/api/leaderboard") {
      const top = db.getGameLeaderboard(20);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: top }));
    }

    // GET /api/bounties — bounty list + stats
    if (url.pathname === "/api/bounties") {
      const bounties = db.getAllBounties();
      const stats = db.getBountyStats();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { bounties, stats } }));
    }

    // GET /api/escrow — escrow balance + transactions
    if (url.pathname === "/api/escrow") {
      const balance = db.getEscrowBalance();
      const transactions = db.getBountyTransactions();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { balance, transactions } }));
    }

    // GET /api/charter — charter parameter status
    if (url.pathname === "/api/charter") {
      const status = db.getCharterStatus();
      const params = db.getCharterParams();
      const ready = db.getReadyParams();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { status, params, ready } }));
    }

    // GET /api/proposals/:id — single proposal detail
    if (url.pathname.match(/^\/api\/proposals\/\d+$/)) {
      const id = parseInt(url.pathname.split("/").pop());
      const proposal = db.getProposal(id);
      if (!proposal) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      const counts = db.getVoteCounts(id);
      const amendments = db.getAmendments(id);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { ...proposal, counts, amendments } }));
    }

    // GET /api/xp-queue — pending XP rewards
    if (url.pathname === "/api/xp-queue") {
      const { getXpQueue } = require("./xp");
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: getXpQueue() }));
    }

    // GET /api/stats
    if (url.pathname === "/api/stats") {
      const { getXpQueue } = require("./xp");
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          total_proposals: db.getTotalProposals(),
          total_voters: db.getTotalVoters(),
          active_proposals: db.getActiveProposals().length,
          pending_xp_rewards: getXpQueue().length,
          xp: require("./xp").getXpStats(),
        }
      }));
    }

    // GET /api/badge/:address — full badge data for an address
    const badgeMatch = url.pathname.match(/^\/api\/badge\/(account_rdx1[a-z0-9]{40,65})$/);
    if (badgeMatch) {
      const addr = badgeMatch[1];
      try {
        const data = await getBadgeData(addr);
        if (data) {
          res.writeHead(200);
          return res.end(JSON.stringify({ ok: true, data }));
        }
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "no_badge", address: addr }));
      } catch (e) {
        res.writeHead(500);
        return res.end(JSON.stringify({ ok: false, error: "gateway_error" }));
      }
    }

    // GET /api/badge/:address/verify — quick badge check (true/false)
    const verifyMatch = url.pathname.match(/^\/api\/badge\/(account_rdx1[a-z0-9]{40,65})\/verify$/);
    if (verifyMatch) {
      const addr = verifyMatch[1];
      try {
        const has = await hasBadge(addr);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, hasBadge: has, address: addr }));
      } catch (e) {
        res.writeHead(500);
        return res.end(JSON.stringify({ ok: false, error: "gateway_error" }));
      }
    }

    // ── Feedback Endpoints ────────────────────────────────

    // GET /api/feedback — all tickets
    if (url.pathname === "/api/feedback") {
      const status = url.searchParams.get("status");
      const tickets = status === "open" ? db.getOpenFeedback(50) : db.getAllFeedback(50);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: tickets }));
    }

    // GET /api/feedback/stats — ticket counts
    if (url.pathname === "/api/feedback/stats") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: db.getFeedbackStats() }));
    }

    // ── CV2 Consultation Endpoints (feature-flagged) ────

    // GET /api/cv2/status — sync health
    if (url.pathname === "/api/cv2/status") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: cv2.getSyncStatus() }));
    }

    // GET /api/cv2/stats — counts summary
    if (url.pathname === "/api/cv2/stats") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: cv2.getStats() }));
    }

    // GET /api/cv2/proposals — list all synced proposals
    if (url.pathname === "/api/cv2/proposals") {
      const type = url.searchParams.get("type"); // temperature_check or proposal
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: cv2.getProposals(type) }));
    }

    // GET /api/cv2/proposals/:id — single proposal detail
    const cv2Match = url.pathname.match(/^\/api\/cv2\/proposals\/([\w_-]+)$/);
    if (cv2Match) {
      const proposal = cv2.getProposal(cv2Match[1]);
      if (!proposal) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: proposal }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  const API_HOST = process.env.API_HOST || "127.0.0.1";
  server.listen(API_PORT, API_HOST, () => {
    console.log("[API] Proposals API running on " + API_HOST + ":" + API_PORT);
  });
}

module.exports = { startApi };
