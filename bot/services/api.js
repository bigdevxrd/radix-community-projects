// HTTP API for proposal data + badge verification — consumed by portal and external dApps
const http = require("http");
const db = require("../db");
const { hasBadge, getBadgeData } = require("./gateway");
const { postBountyToCrumbsUp, validateWebhookSignature } = require("./crumbsup");

const API_PORT = parseInt(process.env.API_PORT || "3003");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

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

function isAdmin(req) {
  if (!ADMIN_API_KEY) return false;
  const auth = req.headers["authorization"] || "";
  return auth === "Bearer " + ADMIN_API_KEY;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

    // ── Bounty endpoints ─────────────────────────────────

    // GET /api/bounties — list bounties (optionally filter by status/category)
    if (req.method === "GET" && url.pathname === "/api/bounties") {
      const statusFilter = url.searchParams.get("status");
      const categoryFilter = url.searchParams.get("category");
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
      let bounties = statusFilter === "open" ? db.getOpenBounties(limit) : db.getAllBounties(limit);
      if (categoryFilter) bounties = bounties.filter(b => b.category === categoryFilter);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: bounties }));
    }

    // POST /api/bounties — create new bounty (admin only)
    if (req.method === "POST" && url.pathname === "/api/bounties") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch(e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
      }
      const { title, description, category, reward_xrd, days_active } = body;
      if (!title || !reward_xrd || !days_active) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "missing_fields" }));
      }
      const creatorAddress = body.creator_address || process.env.RADIX_ACCOUNT_ADDRESS || "";
      const id = db.createBounty(title, description, category, reward_xrd, creatorAddress, days_active);

      // Attempt to post to CrumbsUp
      const bounty = db.getBounty(id);
      const cuResult = await postBountyToCrumbsUp(bounty);
      if (cuResult && cuResult.id) {
        const cuUrl = "https://crumbsup.io/bounty/" + cuResult.id;
        db.setBountyCrumbsUp(id, cuResult.id, cuUrl);
      } else {
        db.updateBountyStatus(id, "open");
      }

      const updated = db.getBounty(id);
      res.writeHead(201);
      return res.end(JSON.stringify({
        ok: true,
        id,
        crumbsup_id: updated.crumbsup_id || null,
        crumbsup_url: updated.crumbsup_url || null,
      }));
    }

    // GET /api/bounties/pending-payment — bounties approved + awaiting XRD release
    if (req.method === "GET" && url.pathname === "/api/bounties/pending-payment") {
      const data = db.getBountiesPendingPayment();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data }));
    }

    // POST /api/bounties/release-payment — batch-release XRD to approved claimers (signer only)
    if (req.method === "POST" && url.pathname === "/api/bounties/release-payment") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      let body;
      try { body = JSON.parse(await readBody(req)); } catch(e) { body = {}; }
      const { released = [] } = body;
      for (const item of released) {
        const { bounty_id, tx_hash } = item;
        if (!bounty_id || !tx_hash) continue;
        const bounty = db.getBounty(bounty_id);
        if (bounty && bounty.status === "approved") {
          db.markBountyPaid(bounty_id, tx_hash);
          db.recordEscrowRelease(bounty_id, bounty.reward_xrd, tx_hash);
        }
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, released }));
    }

    // GET /api/bounties/:id — single bounty detail
    if (req.method === "GET" && url.pathname.match(/^\/api\/bounties\/\d+$/)) {
      const id = parseInt(url.pathname.split("/").pop());
      const bounty = db.getBounty(id);
      if (!bounty) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      const txHistory = db.getBountyTransactionHistory(id);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { ...bounty, transactions: txHistory } }));
    }

    // POST /api/bounties/:id/claim — claim bounty
    if (req.method === "POST" && url.pathname.match(/^\/api\/bounties\/\d+\/claim$/)) {
      const id = parseInt(url.pathname.split("/")[3]);
      let body;
      try { body = JSON.parse(await readBody(req)); } catch(e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
      }
      const { address } = body;
      if (!address) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "missing_address" }));
      }
      const result = db.claimBounty(id, address);
      if (!result.ok) {
        res.writeHead(409);
        return res.end(JSON.stringify({ ok: false, error: result.error }));
      }
      const bounty = db.getBounty(id);
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        bounty_id: id,
        claimed_by: address,
        crumbsup_claim_url: bounty.crumbsup_url || null,
      }));
    }

    // POST /api/bounties/:id/submit — mark bounty work as submitted
    if (req.method === "POST" && url.pathname.match(/^\/api\/bounties\/\d+\/submit$/)) {
      const id = parseInt(url.pathname.split("/")[3]);
      const result = db.submitBountyWork(id);
      if (!result.ok) {
        res.writeHead(409);
        return res.end(JSON.stringify({ ok: false, error: result.error }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, bounty_id: id, status: "submitted" }));
    }

    // POST /api/bounties/:id/approve — approve bounty for payment (admin only)
    if (req.method === "POST" && url.pathname.match(/^\/api\/bounties\/\d+\/approve$/)) {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      const id = parseInt(url.pathname.split("/")[3]);
      let body;
      try { body = JSON.parse(await readBody(req)); } catch(e) { body = {}; }
      const result = db.approveBountyPayment(id, null, body.crumbsup_id || null);
      if (!result.ok) {
        res.writeHead(409);
        return res.end(JSON.stringify({ ok: false, error: result.error }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, bounty_id: id, escrow_release_pending: true }));
    }

    // GET /api/escrow — escrow wallet state
    if (req.method === "GET" && url.pathname === "/api/escrow") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: db.getEscrowWallet() }));
    }

    // POST /api/webhooks/crumbsup — receive approval notifications from CrumbsUp
    if (req.method === "POST" && url.pathname === "/api/webhooks/crumbsup") {
      const rawBody = await readBody(req);
      const sig = req.headers["x-crumbsup-signature"] || "";
      if (!validateWebhookSignature(rawBody, sig)) {
        res.writeHead(401);
        return res.end(JSON.stringify({ ok: false, error: "invalid_signature" }));
      }
      let body;
      try { body = JSON.parse(rawBody); } catch(e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
      }
      const { crumbsup_bounty_id, claimer_address } = body;
      if (crumbsup_bounty_id) {
        // Find bounty by crumbsup_id
        const all = db.getAllBounties(1000);
        const bounty = all.find(b => b.crumbsup_id === String(crumbsup_bounty_id));
        if (bounty && bounty.status === "submitted") {
          db.approveBountyPayment(bounty.id, null, String(crumbsup_bounty_id));
          if (claimer_address && !bounty.claimed_by_address) {
            db.claimBounty(bounty.id, claimer_address);
          }
          console.log("[Webhook] CrumbsUp approved bounty #" + bounty.id);
        }
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true }));
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
