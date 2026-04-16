// HTTP API for proposal data + badge verification — consumed by portal and external dApps
const http = require("http");
const db = require("../db");
const { hasBadge, getBadgeData } = require("./gateway");
const cv2 = require("./consultation");
const cv3 = require("./conviction-watcher");
const { checkContent } = require("./content-filter");
const insurance = require("./insurance");
const disputeService = require("./dispute");
const arbiterService = require("./arbiter");

const API_PORT = parseInt(process.env.API_PORT || "3003");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
if (ALLOWED_ORIGINS.length === 0) {
  console.warn("[API] WARNING: CORS_ORIGINS not set — defaulting to wildcard (*). Set CORS_ORIGINS=https://radixguild.com in production.");
}
const ADMIN_TG_IDS = (process.env.ADMIN_TG_IDS || "6102618406").split(",").map(Number);

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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

    // Allow GET + POST for game board routes, feedback, bounties, milestones, disputes, XP; GET only for everything else
    const isGamePost = req.method === "POST" && url.pathname.includes("/board/");
    const isFeedbackPost = req.method === "POST" && url.pathname === "/api/feedback";
    const isBountyPost = req.method === "POST" && url.pathname === "/api/bounties";
    const isGroupPost = req.method === "POST" && url.pathname.match(/^\/api\/groups\/\d+\/(join|leave)$/);
    const isVotePost = req.method === "POST" && url.pathname.match(/^\/api\/proposals\/\d+\/vote$/);
    const isProposalPost = req.method === "POST" && url.pathname === "/api/proposals";
    const isMilestoneWrite = (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") && url.pathname.match(/^\/api\/(bounties\/\d+\/milestones|milestones\/\d+)$/);
    const isXpPost = req.method === "POST" && url.pathname === "/api/xp/mark-applied";
    const isDisputeEvidencePost = req.method === "POST" && url.pathname.match(/^\/api\/disputes\/\d+\/evidence$/);
    if (req.method !== "GET" && !isGamePost && !isFeedbackPost && !isBountyPost && !isGroupPost && !isVotePost && !isProposalPost && !isMilestoneWrite && !isXpPost && !isDisputeEvidencePost) {
      res.writeHead(405);
      return res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    }

    // Rate limiting — use last X-Forwarded-For hop (Caddy appends trusted IP last)
    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIps = forwardedFor ? forwardedFor.split(",").map(s => s.trim()) : [];
    const clientIp = forwardedIps[forwardedIps.length - 1] || req.socket.remoteAddress;
    const isWritePost = isBountyPost || isVotePost || isProposalPost || isMilestoneWrite || isXpPost || isDisputeEvidencePost;
    if (!rateLimit(clientIp, isGamePost ? 10 : isWritePost ? 20 : 200)) {
      res.writeHead(429);
      return res.end(JSON.stringify({ ok: false, error: "rate_limit_exceeded" }));
    }

    // ── Top-level try/catch — prevents unhandled errors from crashing the server ──
    try {

    // GET /api/health — system health check
    if (url.pathname === "/api/health") {
      const { getXpQueue } = require("./xp");
      const { getEscrowStats } = require("./gateway");
      const cv2Status = cv2.getSyncStatus();
      const activeProposals = db.getActiveProposals();
      const charterStatus = db.getCharterStatus();
      let escrow = null;
      try { escrow = await getEscrowStats(); } catch (e) { console.error("[Health] escrow stats:", e.message); }
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          uptime: Math.floor(process.uptime()),
          db: "connected",
          cv2: { enabled: cv2Status.enabled, lastSync: cv2Status.lastSync, errors: cv2Status.errors },
          proposals: { active: activeProposals.length, total: db.getTotalProposals() },
          charter: { resolved: charterStatus.resolved, total: charterStatus.total },
          escrow: escrow ? { tasks: escrow.total_tasks, escrowed: escrow.total_escrowed, completed: escrow.total_completed, source: "on-chain" } : { source: "unavailable" },
          xpQueue: getXpQueue().length,
          memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
          version: "1.2.0",
        }
      }));
    }

    // GET /api/proposals — proposals with vote counts (paginated)
    if (url.pathname === "/api/proposals" && req.method === "GET") {
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

    // POST /api/proposals — create proposal from dashboard
    if (url.pathname === "/api/proposals" && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.title || !body.title.trim()) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "title_required" }));
        }
        if (!body.address) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "address_required" }));
        }
        const hasBadgeResult = await hasBadge(body.address);
        if (!hasBadgeResult) {
          res.writeHead(403);
          return res.end(JSON.stringify({ ok: false, error: "badge_required" }));
        }
        const text = body.title + " " + (body.description || "");
        const filterCheck = checkContent(text);
        if (filterCheck.blocked) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "content_not_allowed" }));
        }
        let user = db.getUserByAddress(body.address);
        let tgId = user ? user.tg_id : -Math.floor(Date.now() / 1000);
        if (!user) {
          try { db.registerUser(tgId, body.address, "web-user"); } catch (e) { /* ignore */ }
        }
        const id = db.createProposal(body.title.trim().slice(0, 500), tgId, {
          type: body.type || "yesno",
          options: body.options || null,
          daysActive: Math.min(parseInt(body.days_active) || 3, 14),
          minVotes: parseInt(body.min_votes) || 3,
          description: (body.description || "").trim().slice(0, 2000),
        });
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { id } }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_body" }));
      }
    }

    // ── Game Board Endpoints (before general game route) ──

    // Helper: read POST body
    function readBody(req) {
      return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => { body += chunk; if (body.length > 8192) { reject(new Error("too_large")); req.destroy(); } });
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

    // POST /api/bounties — create task from dashboard
    if (url.pathname === "/api/bounties" && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.title || !body.reward_xrd || !body.address) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "title, reward_xrd, and address required" }));
        }
        const hasBadgeResult = await hasBadge(body.address);
        if (!hasBadgeResult) {
          res.writeHead(403);
          return res.end(JSON.stringify({ ok: false, error: "badge_required" }));
        }
        const reward = parseFloat(body.reward_xrd);
        if (!isFinite(reward) || reward <= 0) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "invalid_reward_xrd" }));
        }
        const filterCheck = checkContent(body.title + " " + (body.description || ""));
        if (filterCheck.blocked) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "content_not_allowed" }));
        }
        const deadlineSec = body.deadline_days ? Math.floor(Date.now() / 1000) + body.deadline_days * 86400 : null;
        // Resolve creator TG ID from address; fall back to admin sentinel for web-only users
        const creator = db.getUserByAddress(body.address);
        const creatorTgId = creator ? creator.tg_id : ADMIN_TG_IDS[0];
        const id = db.createBounty(body.title.slice(0, 500), reward, creatorTgId, {
          description: body.description || null,
          category: body.category || "general",
          difficulty: body.difficulty || "medium",
          deadline: deadlineSec,
          skills: body.skills_required || null,
          criteria: body.acceptance_criteria || null,
          tags: body.tags || null,
          priority: body.priority || "normal",
        });
        const insFee = insurance.calculateInsuranceFee(reward);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { id, insurance: insFee } }));
      } catch (e) {
        console.error("[API] POST /api/bounties error:", e.message);
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message || "invalid_body" }));
      }
    }

    // GET /api/bounties — bounty list + stats (with filters)
    if (url.pathname === "/api/bounties") {
      const category = url.searchParams.get("category");
      const status = url.searchParams.get("status");
      const difficulty = url.searchParams.get("difficulty");
      const sort = url.searchParams.get("sort");
      const skills = url.searchParams.get("skills");
      const bounties = (category || status || difficulty || sort || skills)
        ? db.getFilteredBounties({ category, status, difficulty, sort, skills })
        : db.getAllBounties();
      const stats = db.getBountyStats();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { bounties, stats } }));
    }

    // GET /api/bounties/categories — list categories
    if (url.pathname === "/api/bounties/categories") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: db.getCategories() }));
    }

    // GET /api/bounties/config — platform configuration
    if (url.pathname === "/api/bounties/config") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: db.getPlatformConfig() }));
    }

    // GET /api/bounties/:id — single bounty detail with milestones + applications
    const bountyDetailMatch = url.pathname.match(/^\/api\/bounties\/(\d+)$/);
    if (bountyDetailMatch) {
      const detail = db.getBountyDetail(parseInt(bountyDetailMatch[1]));
      if (!detail) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: detail }));
    }

    // GET /api/bounties/:id/milestones — milestone list + progress
    const msMatcher = url.pathname.match(/^\/api\/bounties\/(\d+)\/milestones$/);
    if (msMatcher) {
      const bountyId = parseInt(msMatcher[1]);
      const milestones = db.getMilestones(bountyId);
      const progress = db.getMilestoneProgress(bountyId);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { milestones, progress } }));
    }

    // POST /api/bounties/:id/milestones — create milestone
    const msCreateMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/milestones$/);
    if (msCreateMatch && req.method === "POST") {
      try {
        const body = await readBody(req);
        const bountyId = parseInt(msCreateMatch[1]);
        if (!body.title || !body.percentage) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "title and percentage required" }));
        }
        // Badge check
        if (body.address) {
          const hasBadgeResult = await hasBadge(body.address);
          if (!hasBadgeResult) {
            res.writeHead(403);
            return res.end(JSON.stringify({ ok: false, error: "badge_required" }));
          }
        }
        const result = db.addMilestone(bountyId, body.title, body.description || null, parseInt(body.percentage));
        if (result.error) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: result.error, detail: result.detail }));
        }
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: result }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // PUT /api/milestones/:id — update milestone status
    const msUpdateMatch = url.pathname.match(/^\/api\/milestones\/(\d+)$/);
    if (msUpdateMatch && req.method === "PUT") {
      try {
        const body = await readBody(req);
        const msId = parseInt(msUpdateMatch[1]);
        let result;
        if (body.status === "submitted" && body.tg_id) {
          result = db.submitMilestone(msId, body.tg_id);
        } else if (body.status === "verified" && body.tg_id) {
          result = db.verifyMilestone(msId, body.tg_id);
        } else if (body.status === "paid" && body.tx_hash) {
          result = db.payMilestone(msId, body.tx_hash);
        } else {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "invalid status or missing params" }));
        }
        if (result.error) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: result.error, detail: result.detail }));
        }
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: result }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // DELETE /api/milestones/:id — remove pending milestone
    if (msUpdateMatch && req.method === "DELETE") {
      const msId = parseInt(msUpdateMatch[1]);
      const result = db.removeMilestone(msId);
      if (result.error) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: result.error, detail: result.detail }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result }));
    }

    // GET /api/escrow — escrow balance + transactions + on-chain stats
    if (url.pathname === "/api/escrow") {
      const balance = db.getEscrowBalance();
      const transactions = db.getBountyTransactions();
      // Try to fetch on-chain truth (non-blocking — falls back to SQLite)
      let onchain = null;
      try {
        const { getEscrowStats } = require("./gateway");
        onchain = await getEscrowStats();
      } catch (e) {
        console.error("[API] getEscrowStats error:", e.message);
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { balance, transactions, onchain } }));
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
      const { getXpQueue, getXpStats } = require("./xp");
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: getXpQueue(), stats: getXpStats() }));
    }

    // POST /api/xp/mark-applied — mark XP as applied on-chain (called by batch signer)
    if (url.pathname === "/api/xp/mark-applied" && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.address) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "address required" }));
        }
        const { markXpApplied } = require("./xp");
        markXpApplied(body.address);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, marked: body.address }));
      } catch (e) {
        res.writeHead(500);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
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

    // ── Working Groups Endpoints ──────────────────────────

    // GET /api/groups — all groups with member counts
    if (url.pathname === "/api/groups") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: db.getGroups() }));
    }

    // GET /api/groups/overdue — groups with no report this period
    if (url.pathname === "/api/groups/overdue") {
      const overdue = db.getOverdueReports();
      const period = db.getCurrentPeriod();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { period, groups: overdue } }));
    }

    // GET /api/groups/expiring — groups with sunset in next 30 days
    if (url.pathname === "/api/groups/expiring") {
      const days = parseInt(url.searchParams.get("days") || "30");
      const expiring = db.getGroupsSunsetSoon(days);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: expiring.map(g => ({
        ...g, days_remaining: Math.round(g.days_remaining / 86400),
      })) }));
    }

    // GET /api/groups/:id/tasks — tasks linked to a working group
    const groupTasksMatch = url.pathname.match(/^\/api\/groups\/(\d+)\/tasks$/);
    if (groupTasksMatch) {
      const tasks = db.getGroupTasks(parseInt(groupTasksMatch[1]));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: tasks }));
    }

    // GET /api/groups/:id/reports — WG reports
    const groupReportsMatch = url.pathname.match(/^\/api\/groups\/(\d+)\/reports$/);
    if (groupReportsMatch) {
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));
      const reports = db.getWGReports(parseInt(groupReportsMatch[1]), limit);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: reports }));
    }

    // GET /api/groups/:id/budget — budget status for a working group
    const groupBudgetMatch = url.pathname.match(/^\/api\/groups\/(\d+)\/budget$/);
    if (groupBudgetMatch) {
      const budget = db.getGroupBudgetStatus(parseInt(groupBudgetMatch[1]));
      if (!budget) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: budget }));
    }

    // GET /api/groups/:id — group detail with members + linked tasks/proposals + budget + latest report
    const groupMatch = url.pathname.match(/^\/api\/groups\/(\d+)$/);
    if (groupMatch) {
      const groupId = parseInt(groupMatch[1]);
      const detail = db.getGroupDetail(groupId);
      if (!detail) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      // Enrich with task count, budget status, and latest report
      const tasks = db.getGroupTasks(groupId);
      const budget = db.getGroupBudgetStatus(groupId);
      const reports = db.getWGReports(groupId, 1);
      detail.tasks_count = tasks.length;
      detail.budget = budget;
      detail.latest_report = reports.length > 0 ? reports[0] : null;
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: detail }));
    }

    // POST /api/groups/:id/join — join a group from dashboard
    const groupJoinMatch = url.pathname.match(/^\/api\/groups\/(\d+)\/join$/);
    if (groupJoinMatch && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.address) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "address_required" }));
        }
        const result = db.joinGroup(parseInt(groupJoinMatch[1]), 0, body.address);
        res.writeHead(result.ok ? 200 : 400);
        return res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // POST /api/groups/:id/leave — leave a group from dashboard
    const groupLeaveMatch = url.pathname.match(/^\/api\/groups\/(\d+)\/leave$/);
    if (groupLeaveMatch && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.address) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "address_required" }));
        }
        const result = db.leaveGroup(parseInt(groupLeaveMatch[1]), body.address);
        res.writeHead(result.ok ? 200 : 400);
        return res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // ── Feedback Endpoints ────────────────────────────────

    // POST /api/feedback — create ticket from dashboard
    if (url.pathname === "/api/feedback" && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.message || !body.message.trim()) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "message_required" }));
        }
        const id = db.createFeedback(
          0, // tg_id = 0 for web submissions
          body.username || "web-user",
          body.message.trim().slice(0, 1000),
          body.category || "general",
          body.address || null
        );
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { id } }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_body" }));
      }
    }

    // GET /api/feedback — all tickets or filtered by address
    if (url.pathname === "/api/feedback") {
      const status = url.searchParams.get("status");
      const address = url.searchParams.get("address");
      let tickets;
      if (address) {
        tickets = db.getFeedbackByAddress(address);
      } else if (status === "open") {
        tickets = db.getOpenFeedback(50);
      } else {
        tickets = db.getAllFeedback(50);
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: tickets }));
    }

    // GET /api/votes/my/:address — voting history for a wallet address
    const myVotesMatch = url.pathname.match(/^\/api\/votes\/my\/(account_rdx1[a-z0-9]{40,65})$/);
    if (myVotesMatch) {
      const votes = db.getVotesByAddress(myVotesMatch[1]);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: votes }));
    }

    // GET /api/bounties/my/:address — tasks where user is creator or assignee
    const myBountiesMatch = url.pathname.match(/^\/api\/bounties\/my\/(account_rdx1[a-z0-9]{40,65})$/);
    if (myBountiesMatch) {
      const addr = myBountiesMatch[1];
      const user = db.getUserByAddress(addr);
      const tgId = user ? user.tg_id : -1;
      try {
        const created = db.prepare("SELECT * FROM bounties WHERE creator_tg_id = ? ORDER BY created_at DESC").all(tgId);
        const assigned = db.prepare("SELECT * FROM bounties WHERE assignee_address = ? ORDER BY assigned_at DESC").all(addr);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { created, assigned, address: addr } }));
      } catch (e) {
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { created: [], assigned: [], address: addr } }));
      }
    }

    // POST /api/proposals/:id/vote — vote from dashboard
    const voteMatch = url.pathname.match(/^\/api\/proposals\/(\d+)\/vote$/);
    if (voteMatch && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.address || !body.vote) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "address and vote required" }));
        }
        const hasBadgeResult = await hasBadge(body.address);
        if (!hasBadgeResult) {
          res.writeHead(403);
          return res.end(JSON.stringify({ ok: false, error: "badge_required" }));
        }
        const proposalId = parseInt(voteMatch[1]);
        const proposal = db.getProposal(proposalId);
        if (!proposal) {
          res.writeHead(404);
          return res.end(JSON.stringify({ ok: false, error: "proposal_not_found" }));
        }
        if (proposal.status !== "active") {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: "proposal_not_active" }));
        }
        // Resolve address to tg_id
        const user = db.getUserByAddress(body.address);
        const tgId = user ? user.tg_id : 0; // 0 for web-only voters
        // If tg_id is 0, create a temporary user record for web voters
        if (!user) {
          try { db.prepare("INSERT OR IGNORE INTO users (tg_id, radix_address, username) VALUES (?, ?, ?)").run(-Math.floor(Date.now() / 1000), body.address, "web-voter"); } catch(e) {}
        }
        const resolvedTgId = user ? user.tg_id : -Math.floor(Date.now() / 1000);
        const result = db.recordVote(proposalId, resolvedTgId, body.address, body.vote);
        if (!result.ok) {
          res.writeHead(409);
          return res.end(JSON.stringify({ ok: false, error: result.error }));
        }
        // Return updated counts
        const counts = db.getVoteCounts(proposalId);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { counts, vote: body.vote } }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_body" }));
      }
    }

    // GET /api/trust/:tg_id — trust score for a user
    const trustMatch = url.pathname.match(/^\/api\/trust\/(\d+)$/);
    if (trustMatch) {
      const score = db.getTrustScore(parseInt(trustMatch[1]));
      if (!score) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "user_not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: score }));
    }

    // GET /api/trust/address/:address — trust score by wallet address
    const trustAddrMatch = url.pathname.match(/^\/api\/trust\/address\/(account_rdx1[a-z0-9]{40,65})$/);
    if (trustAddrMatch) {
      const user = db.getUserByAddress(trustAddrMatch[1]);
      if (!user) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "user_not_found" }));
      }
      const score = db.getTrustScore(user.tg_id);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: score || { score: 0, tier: "none", breakdown: {} } }));
    }

    // GET /api/profile/:address — consolidated profile data
    const profileMatch = url.pathname.match(/^\/api\/profile\/(account_rdx1[a-z0-9]{40,65})$/);
    if (profileMatch) {
      const addr = profileMatch[1];
      const user = db.getUserByAddress(addr);
      const tgId = user ? user.tg_id : -1;

      const trust = tgId > 0 ? db.getTrustScore(tgId) : null;
      const votes = db.getVotesByAddress(addr);
      const groups = db.getGroupsForMember(addr);
      const game = db.getGameState(addr);
      const achievements = db.getAchievementSummary(addr);

      let created = [], assigned = [];
      try {
        created = db.prepare("SELECT * FROM bounties WHERE creator_tg_id = ? ORDER BY created_at DESC").all(tgId);
        assigned = db.prepare("SELECT * FROM bounties WHERE assignee_address = ? ORDER BY assigned_at DESC").all(addr);
      } catch (e) { /* no bounties */ }

      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          trust,
          votes,
          tasks: { created, assigned },
          groups,
          game,
          achievements,
          user: user ? { username: user.username, registered_at: user.registered_at } : null,
        },
      }));
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

    // ── Decisions Endpoints ────

    // GET /api/decisions — all decisions with dependencies + status
    if (url.pathname === "/api/decisions") {
      const decisions = db.getDecisions();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: decisions }));
    }

    // GET /api/decisions/radixtalk — proxy RadixTalk governance topics (cached 5min)
    if (url.pathname === "/api/decisions/radixtalk") {
      try {
        // Simple in-memory cache
        const now = Date.now();
        if (!global._rtCache || now - global._rtCache.at > 300000) {
          const resp = await fetch("https://radixtalk.com/c/governance/46.json");
          const data = await resp.json();
          const topics = (data.topic_list?.topics || []).map(t => ({
            id: t.id, title: t.title, posts_count: t.posts_count,
            views: t.views, created_at: t.created_at, url: "https://radixtalk.com/t/" + t.slug + "/" + t.id,
          }));
          global._rtCache = { at: now, topics };
        }
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: global._rtCache.topics }));
      } catch (e) {
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: [], error: "radixtalk_unavailable" }));
      }
    }

    // ── CV3 Conviction Voting Endpoints ────

    // GET /api/cv3/status — sync health + pool balance
    if (url.pathname === "/api/cv3/status") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: cv3.getSyncStatus() }));
    }

    // GET /api/cv3/stats — counts
    if (url.pathname === "/api/cv3/stats") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: cv3.getStats() }));
    }

    // GET /api/cv3/proposals — list with conviction scores
    if (url.pathname === "/api/cv3/proposals") {
      const status = url.searchParams.get("status");
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: cv3.getProposals(status) }));
    }

    // GET /api/cv3/proposals/:id — detail with stakes
    const cv3Match = url.pathname.match(/^\/api\/cv3\/proposals\/(\d+)$/);
    if (cv3Match) {
      const proposal = cv3.getProposal(parseInt(cv3Match[1]));
      if (!proposal) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      const stakes = cv3.getStakes(proposal.id);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { ...proposal, stakes } }));
    }

    // GET /api/cv3/proposals/:id/stakes — staker breakdown
    const cv3StakesMatch = url.pathname.match(/^\/api\/cv3\/proposals\/(\d+)\/stakes$/);
    if (cv3StakesMatch) {
      const stakes = cv3.getStakes(parseInt(cv3StakesMatch[1]));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: stakes }));
    }

    // ── Dispute Resolution Endpoints ──

    // GET /api/disputes — list disputes (with optional status filter)
    if (url.pathname === "/api/disputes" && req.method === "GET") {
      const status = url.searchParams.get("status");
      const bountyId = url.searchParams.get("bounty_id");
      if (bountyId) {
        const disputes = disputeService.getDisputesByBounty(parseInt(bountyId));
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: disputes }));
      }
      if (status === "open") {
        const disputes = disputeService.getOpenDisputes();
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: disputes }));
      }
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const disputes = disputeService.getAllDisputes(Math.min(limit, 200));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: disputes }));
    }

    // GET /api/disputes/stats — global dispute statistics
    if (url.pathname === "/api/disputes/stats" && req.method === "GET") {
      const stats = disputeService.getDisputeStats();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: stats }));
    }

    // GET /api/disputes/:id — full dispute detail with evidence + timeline
    const disputeDetailMatch = url.pathname.match(/^\/api\/disputes\/(\d+)$/);
    if (disputeDetailMatch && req.method === "GET") {
      const detail = disputeService.getDisputeDetail(parseInt(disputeDetailMatch[1]));
      if (!detail) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: detail }));
    }

    // GET /api/disputes/:id/evidence — evidence list
    const evidenceMatch = url.pathname.match(/^\/api\/disputes\/(\d+)\/evidence$/);
    if (evidenceMatch && req.method === "GET") {
      const evidence = disputeService.getDisputeEvidence(parseInt(evidenceMatch[1]));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: evidence }));
    }

    // POST /api/disputes/:id/evidence — submit evidence (badge required)
    const evidencePostMatch = url.pathname.match(/^\/api\/disputes\/(\d+)\/evidence$/);
    if (evidencePostMatch && req.method === "POST") {
      const body = await readBody(req);
      if (!body.address || !body.content) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "address and content required" }));
      }
      // Verify badge ownership
      const badge = await hasBadge(body.address);
      if (!badge) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "badge_required" }));
      }
      const user = db.getUserByAddress(body.address);
      if (!user) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "not_registered" }));
      }
      const result = disputeService.addEvidence(
        parseInt(evidencePostMatch[1]),
        user.tg_id,
        body.evidence_type || "text",
        body.content,
        body.description || null
      );
      res.writeHead(result.error ? 400 : 200);
      return res.end(JSON.stringify(result.error ? { ok: false, error: result.error, detail: result.detail } : { ok: true, data: result }));
    }

    // GET /api/arbiters — arbiter pool
    if (url.pathname === "/api/arbiters" && req.method === "GET") {
      const pool = arbiterService.getArbiterPool();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: pool }));
    }

    // GET /api/arbiters/:tg_id — arbiter detail + stats
    const arbiterMatch = url.pathname.match(/^\/api\/arbiters\/(\d+)$/);
    if (arbiterMatch && req.method === "GET") {
      const stats = arbiterService.getArbiterStats(parseInt(arbiterMatch[1]));
      if (!stats) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: stats }));
    }

    // ── Task Market Endpoints (Phase 5) ──

    // GET /api/bounties/match?skills=scrypto,frontend — skill-based matching
    if (url.pathname === "/api/bounties/match" && req.method === "GET") {
      const skillsParam = url.searchParams.get("skills") || "";
      const userSkills = skillsParam.split(",").map(s => s.trim()).filter(Boolean);
      const opts = {};
      if (url.searchParams.get("max_reward")) opts.maxReward = parseFloat(url.searchParams.get("max_reward"));
      if (url.searchParams.get("min_reward")) opts.minReward = parseFloat(url.searchParams.get("min_reward"));
      if (url.searchParams.get("difficulty")) opts.difficulty = url.searchParams.get("difficulty");
      const results = db.matchBounties(userSkills, opts);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: results }));
    }

    // GET /api/bounties/blocked — blocked tasks
    if (url.pathname === "/api/bounties/blocked" && req.method === "GET") {
      const blocked = db.getBlockedBounties();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: blocked }));
    }

    // GET /api/bounties/:id/deps — dependency info
    const depsMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/deps$/);
    if (depsMatch && req.method === "GET") {
      const info = db.getDependencyInfo(parseInt(depsMatch[1]));
      if (!info) { res.writeHead(404); return res.end(JSON.stringify({ ok: false, error: "not_found" })); }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: info }));
    }

    // GET /api/projects/:id — project progress
    const projectMatch = url.pathname.match(/^\/api\/projects\/(\d+)$/);
    if (projectMatch && req.method === "GET") {
      const groupId = parseInt(projectMatch[1]);
      const progress = db.getProjectProgress(groupId);
      const tasks = db.getProjectBounties(groupId);
      if (!progress) { res.writeHead(404); return res.end(JSON.stringify({ ok: false, error: "no_tasks" })); }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { ...progress, tasks } }));
    }

    // GET /api/templates — task templates
    if (url.pathname === "/api/templates" && req.method === "GET") {
      const templates = db.getTemplates();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: templates }));
    }

    // ── Insurance Pool Endpoints ──

    // GET /api/insurance — pool stats
    if (url.pathname === "/api/insurance" && req.method === "GET") {
      const stats = insurance.getPoolStats();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: stats }));
    }

    // GET /api/insurance/history — pool transaction history
    if (url.pathname === "/api/insurance/history" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const history = insurance.getPoolHistory(Math.min(limit, 200));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: history }));
    }

    // GET /api/insurance/calculate?amount=300 — preview fee for an amount
    if (url.pathname === "/api/insurance/calculate" && req.method === "GET") {
      const amount = parseFloat(url.searchParams.get("amount") || "0");
      if (!amount || amount <= 0) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_amount" }));
      }
      const fee = insurance.calculateInsuranceFee(amount);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: fee }));
    }

    // GET /api/bounties/:id/insurance — insurance details for specific bounty
    const insMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/insurance$/);
    if (insMatch && req.method === "GET") {
      const bountyId = parseInt(insMatch[1]);
      const records = insurance.getInsuranceForBounty(bountyId);
      const bounty = db.getBounty(bountyId);
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          bounty_id: bountyId,
          insurance_fee_xrd: bounty?.insurance_fee_xrd || 0,
          insurance_fee_pct: bounty?.insurance_fee_pct || 0,
          insurance_status: bounty?.insurance_status || "none",
          records,
        },
      }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: "not_found" }));

    } catch (e) {
      console.error("[API] Unhandled error on " + req.method + " " + req.url + ":", e.message);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: "internal_error" }));
      }
    }
  });

  const API_HOST = process.env.API_HOST || "127.0.0.1";
  server.listen(API_PORT, API_HOST, () => {
    console.log("[API] Proposals API running on " + API_HOST + ":" + API_PORT);
  });
}

module.exports = { startApi };
