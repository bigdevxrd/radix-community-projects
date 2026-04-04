// HTTP API for proposal data + badge verification — consumed by portal and external dApps
const http = require("http");
const db = require("../db");
const { hasBadge, getBadgeData } = require("./gateway");

const API_PORT = parseInt(process.env.API_PORT || "3003");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; if (data.length > 8192) req.destroy(); });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function isAdmin(req) {
  if (!ADMIN_KEY) return false;
  return req.headers["x-admin-key"] === ADMIN_KEY;
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

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

    // ── Bounty Endpoints ────────────────────────────────────

    // GET /api/bounties/admin/escrow-balance — admin dashboard
    if (url.pathname === "/api/bounties/admin/escrow-balance" && req.method === "GET") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      const balance = db.getEscrowBalance();
      const pending = db.getBountyQueuePending();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { ...balance, pending_payment: pending } }));
    }

    // GET /api/bounties — list bounties (public)
    if (url.pathname === "/api/bounties" && req.method === "GET") {
      db.expireBounties();
      const status = url.searchParams.get("status") || "open";
      const category = url.searchParams.get("category") || undefined;
      const limit = url.searchParams.get("limit");
      const page = url.searchParams.get("page");
      const result = db.getBounties({ status, category, limit, page });
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result.bounties, page: result.page, limit: result.limit, total: result.total }));
    }

    // GET /api/bounties/:id — single bounty (public)
    const bountyIdMatch = url.pathname.match(/^\/api\/bounties\/(\d+)$/);
    if (bountyIdMatch && req.method === "GET") {
      const bounty = db.getBounty(parseInt(bountyIdMatch[1]));
      if (!bounty) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: bounty }));
    }

    // POST /api/bounties — create bounty (admin only)
    if (url.pathname === "/api/bounties" && req.method === "POST") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      let body;
      try { body = await readBody(req); } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
      }
      const { title, description, category, reward_xrd, days_active, creator_address } = body;
      if (!title || title.length > 500) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "title_invalid" }));
      }
      if (description && description.length > 2000) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "description_too_long" }));
      }
      if (!reward_xrd || reward_xrd <= 0) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "reward_invalid" }));
      }
      const validCats = db.VALID_CATEGORIES || ["tutorial", "design", "social", "bug", "translation", "other"];
      if (category && !validCats.includes(category)) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "category_invalid" }));
      }
      if (!days_active || days_active <= 0) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "days_active_invalid" }));
      }
      const result = db.createBounty(title, description, category || "other", reward_xrd, creator_address || "admin", days_active);
      const created = db.getBounty(result.id);
      res.writeHead(201);
      return res.end(JSON.stringify({ ok: true, id: result.id, status: "open", created_at: created.created_at }));
    }

    // POST /api/bounties/:id/claim — claim a bounty (badge required)
    const claimMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/claim$/);
    if (claimMatch && req.method === "POST") {
      let body;
      try { body = await readBody(req); } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
      }
      const { address } = body;
      if (!address) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "address_required" }));
      }
      const has = await hasBadge(address);
      if (!has) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "badge_required" }));
      }
      const result = db.claimBounty(parseInt(claimMatch[1]), address);
      if (!result.ok) {
        res.writeHead(400);
        return res.end(JSON.stringify(result));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ...result, crumbsup_claim_url: null }));
    }

    // POST /api/bounties/:id/submit — submit work (badge required, must be claimer)
    const submitMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/submit$/);
    if (submitMatch && req.method === "POST") {
      let body;
      try { body = await readBody(req); } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
      }
      const { address } = body;
      if (!address) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "address_required" }));
      }
      const bounty = db.getBounty(parseInt(submitMatch[1]));
      if (!bounty) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      if (bounty.claimed_by_address !== address) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "not_claimer" }));
      }
      const result = db.submitBountyWork(parseInt(submitMatch[1]));
      if (!result.ok) {
        res.writeHead(400);
        return res.end(JSON.stringify(result));
      }
      res.writeHead(200);
      return res.end(JSON.stringify(result));
    }

    // POST /api/bounties/:id/approve — approve bounty (admin only)
    const approveMatch = url.pathname.match(/^\/api\/bounties\/(\d+)\/approve$/);
    if (approveMatch && req.method === "POST") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      let body;
      try { body = await readBody(req); } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
      }
      const { crumbsup_id } = body;
      const result = db.approveBountyPayment(parseInt(approveMatch[1]), crumbsup_id);
      if (!result.ok) {
        res.writeHead(400);
        return res.end(JSON.stringify(result));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ...result, queued_for_payment: true }));
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
