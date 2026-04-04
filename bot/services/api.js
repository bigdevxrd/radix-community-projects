// HTTP API for proposal data + badge verification — consumed by portal and external dApps
const http = require("http");
const db = require("../db");
const { hasBadge, getBadgeData } = require("./gateway");

const API_PORT = parseInt(process.env.API_PORT || "3003");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES || "").split(",").map(s => s.trim()).filter(Boolean);

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

// Read JSON body from a POST request
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; if (data.length > 1e6) { req.destroy(); reject(new Error("body_too_large")); } });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch (e) { reject(new Error("invalid_json")); }
    });
    req.on("error", reject);
  });
}

function isAdmin(address) {
  return ADMIN_ADDRESSES.length > 0 && ADMIN_ADDRESSES.includes(address);
}

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

    // Rate limiting
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress;
    if (!rateLimit(clientIp)) {
      res.writeHead(429);
      return res.end(JSON.stringify({ ok: false, error: "rate_limit_exceeded" }));
    }

    const url = new URL(req.url, "http://localhost");

    // GET /api/proposals — proposals with vote counts (paginated)
    if (url.pathname === "/api/proposals") {
      db.closeExpiredProposals();
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
    const badgeMatch = url.pathname.match(/^\/api\/badge\/(account_rdx1[a-z0-9]+)$/);
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
    const verifyMatch = url.pathname.match(/^\/api\/badge\/(account_rdx1[a-z0-9]+)\/verify$/);
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

    // ── Bounty endpoints ────────────────────────────────────

    // GET /api/bounties/pending-payment — admin dashboard
    if (url.pathname === "/api/bounties/pending-payment" && req.method === "GET") {
      const address = url.searchParams.get("address");
      if (!address || !isAdmin(address)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "admin_required" }));
      }
      const data = db.getBountiesPendingApproval();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data }));
    }

    // GET /api/bounties — list bounties with filters
    if (url.pathname === "/api/bounties" && req.method === "GET") {
      const status = url.searchParams.get("status");
      const category = url.searchParams.get("category");
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
      const offset = (page - 1) * limit;

      const bounties = status
        ? db.getAllBounties({ status, category, limit, offset })
        : db.getActiveBounties({ category, limit, offset });

      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: bounties, page, limit }));
    }

    // POST /api/bounties — create a new bounty (admin only)
    if (url.pathname === "/api/bounties" && req.method === "POST") {
      let body;
      try { body = await readBody(req); }
      catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      const { address, title, description, category, reward_xrd, days_active } = body;
      if (!address || !isAdmin(address)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "admin_required" }));
      }
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "title_required" }));
      }
      if (!reward_xrd || typeof reward_xrd !== "number" || reward_xrd <= 0) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "reward_xrd_must_be_positive_number" }));
      }
      const days = parseInt(days_active) || 7;
      const id = db.createBounty(title.trim(), description || null, category || "general", reward_xrd, address, days);
      const bounty = db.getBounty(id);
      res.writeHead(201);
      return res.end(JSON.stringify({ ok: true, id, status: bounty.status, created_at: bounty.created_at }));
    }

    // POST /api/bounties/:id/claim — claim a bounty
    const claimMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/claim$/);
    if (claimMatch && req.method === "POST") {
      let body;
      try { body = await readBody(req); }
      catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      const bountyId = parseInt(claimMatch[1]);
      const { address } = body;
      if (!address) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "address_required" }));
      }
      // Require Guild badge to claim
      let hasBadgeResult;
      try { hasBadgeResult = await hasBadge(address); }
      catch (e) { hasBadgeResult = false; }
      if (!hasBadgeResult) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "guild_badge_required" }));
      }
      const result = db.claimBounty(bountyId, address);
      if (!result.ok) {
        const statusCode = result.error === "not_found" ? 404 : 400;
        res.writeHead(statusCode);
        return res.end(JSON.stringify(result));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        bounty_id: result.bounty_id,
        claimed_by: result.claimer,
        crumbsup_claim_url: process.env.CRUMBSUP_URL || null,
      }));
    }

    // POST /api/bounties/:id/submit — submit work for a bounty
    const submitMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/submit$/);
    if (submitMatch && req.method === "POST") {
      let body;
      try { body = await readBody(req); }
      catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      const bountyId = parseInt(submitMatch[1]);
      const { address } = body;
      if (!address) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "address_required" }));
      }
      const result = db.submitBountyWork(bountyId, address);
      if (!result.ok) {
        const statusCode = result.error === "not_found" ? 404 : 400;
        res.writeHead(statusCode);
        return res.end(JSON.stringify(result));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, bounty_id: result.bounty_id, status: "submitted" }));
    }

    // GET /api/bounties/:id — single bounty detail
    const bountyDetailMatch = url.pathname.match(/^\/api\/bounties\/(\d+)$/);
    if (bountyDetailMatch && req.method === "GET") {
      const bountyId = parseInt(bountyDetailMatch[1]);
      const bounty = db.getBounty(bountyId);
      if (!bounty) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: bounty }));
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
