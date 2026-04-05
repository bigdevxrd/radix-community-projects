// HTTP API for proposal data + badge verification — consumed by portal and external dApps
const http = require("http");
const crypto = require("crypto");
const db = require("../db");
const { hasBadge, getBadgeData } = require("./gateway");

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
  const key = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
  return key === ADMIN_API_KEY;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch(e) { resolve({}); }
    });
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Api-Key, Authorization, X-Hub-Signature-256");

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

    // ── GET /api/proposals — proposals with vote counts (paginated) ──
    if (url.pathname === "/api/proposals" && req.method === "GET") {
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

    // ── GET /api/game/:address ──
    const gameMatch = url.pathname.match(/^\/api\/game\/(account_rdx1[a-z0-9]+)$/);
    if (gameMatch && req.method === "GET") {
      const game = db.getGameState(gameMatch[1]);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: game }));
    }

    // ── GET /api/leaderboard ──
    if (url.pathname === "/api/leaderboard" && req.method === "GET") {
      const top = db.getGameLeaderboard(20);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: top }));
    }

    // ── GET /api/bounties ──
    if (url.pathname === "/api/bounties" && req.method === "GET") {
      const bounties = db.getAllBounties();
      const stats = db.getBountyStats();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { bounties, stats } }));
    }

    // ── GET /api/escrow ──
    if (url.pathname === "/api/escrow" && req.method === "GET") {
      const balance = db.getEscrowBalance();
      const transactions = db.getBountyTransactions();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { balance, transactions } }));
    }

    // ── GET /api/charter ──
    if (url.pathname === "/api/charter" && req.method === "GET") {
      const status = db.getCharterStatus();
      const params = db.getCharterParams();
      const ready = db.getReadyParams();
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: { status, params, ready } }));
    }

    // ── GET /api/proposals/:id ──
    if (url.pathname.match(/^\/api\/proposals\/\d+$/) && req.method === "GET") {
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

    // ── GET /api/xp-queue ──
    if (url.pathname === "/api/xp-queue" && req.method === "GET") {
      const { getXpQueue } = require("./xp");
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: getXpQueue() }));
    }

    // ── GET /api/stats ──
    if (url.pathname === "/api/stats" && req.method === "GET") {
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

    // ── GET /api/badge/:address ──
    const badgeMatch = url.pathname.match(/^\/api\/badge\/(account_rdx1[a-z0-9]+)$/);
    if (badgeMatch && req.method === "GET") {
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

    // ── GET /api/badge/:address/verify ──
    const verifyMatch = url.pathname.match(/^\/api\/badge\/(account_rdx1[a-z0-9]+)\/verify$/);
    if (verifyMatch && req.method === "GET") {
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

    // ────────────────────────────────────────────────────────────
    // CV2 Consultation v2 endpoints
    // ────────────────────────────────────────────────────────────

    // GET /api/cv2/status
    if (url.pathname === "/api/cv2/status" && req.method === "GET") {
      const synced = db.getSyncedCv2Proposals();
      const cv2Enabled = !!(process.env.CV2_API_URL && process.env.CV2_API_KEY);
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          cv2_enabled: cv2Enabled,
          sync_health: cv2Enabled ? "ok" : "disabled",
          last_sync: synced.length > 0 ? synced[0].cv2_sync_timestamp || null : null,
          proposals_synced: synced.length,
        }
      }));
    }

    // GET /api/cv2/proposals
    if (url.pathname === "/api/cv2/proposals" && req.method === "GET") {
      const synced = db.getSyncedCv2Proposals();
      const result = synced.map(p => ({
        guild_id: p.id,
        cv2_id: p.cv2_id,
        title: p.title,
        status: p.status,
        vote_counts: db.getVoteCounts(p.id),
        cv2_last_vote_count: p.cv2_last_vote_count,
        cv2_url: p.cv2_url,
        sync_status: p.cv2_synced ? "synced" : "pending",
      }));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result }));
    }

    // GET /api/cv2/proposals/:id
    if (url.pathname.match(/^\/api\/cv2\/proposals\/\d+$/) && req.method === "GET") {
      const id = parseInt(url.pathname.split("/").pop());
      const proposal = db.getProposal(id);
      if (!proposal) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      const counts = db.getVoteCounts(id);
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          guild_proposal: proposal,
          cv2_mirror: { cv2_id: proposal.cv2_id, cv2_url: proposal.cv2_url, cv2_synced: proposal.cv2_synced },
          vote_counts: counts,
          weights: { member: 1, contributor: 2, builder: 3, steward: 5, elder: 10 },
        }
      }));
    }

    // POST /api/cv2/sync/:proposal_id — manually trigger CV2 sync (admin only)
    if (url.pathname.match(/^\/api\/cv2\/sync\/\d+$/) && req.method === "POST") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      const proposalId = parseInt(url.pathname.split("/").pop());
      const proposal = db.getProposal(proposalId);
      if (!proposal) {
        res.writeHead(404);
        return res.end(JSON.stringify({ ok: false, error: "not_found" }));
      }
      try {
        const { syncProposalToCV2, getVoteWeightsFromBadges } = require("./consultation");
        const weights = await getVoteWeightsFromBadges();
        const result = await syncProposalToCV2(proposal, weights);
        db.markProposalCv2Synced(proposalId, result.cv2_id, result.cv2_url);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: { ...result, status: "synced" } }));
      } catch (e) {
        res.writeHead(500);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // GET /api/cv2/vote-weights
    if (url.pathname === "/api/cv2/vote-weights" && req.method === "GET") {
      const { VOTE_WEIGHTS } = require("./consultation");
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: { ...VOTE_WEIGHTS, timestamp: Math.floor(Date.now() / 1000) }
      }));
    }

    // POST /api/cv2/tally/:proposal_id — force retally with on-chain weights (admin only)
    if (url.pathname.match(/^\/api\/cv2\/tally\/\d+$/) && req.method === "POST") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      const proposalId = parseInt(url.pathname.split("/").pop());
      try {
        const { tallyVotesWithWeights } = require("./consultation");
        const tally = await tallyVotesWithWeights(proposalId, db);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: tally }));
      } catch (e) {
        res.writeHead(500);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // POST /api/webhooks/cv2 — receive vote updates from Consultation v2
    if (url.pathname === "/api/webhooks/cv2" && req.method === "POST") {
      const body = await readBody(req);
      try {
        const { handleCV2Webhook } = require("./consultation");
        const result = await handleCV2Webhook(body, db);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: result }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // ────────────────────────────────────────────────────────────
    // CrumbsUp endpoints
    // ────────────────────────────────────────────────────────────

    // GET /api/crumbsup/status
    if (url.pathname === "/api/crumbsup/status" && req.method === "GET") {
      const crumbsupEnabled = !!(process.env.CRUMBSUP_API_URL && process.env.CRUMBSUP_API_KEY);
      const members = db.getCrumbsUpMembers(1);
      const syncedProposals = db.getSyncedCrumbsUpProposals();
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          crumbsup_enabled: crumbsupEnabled,
          dao_id: process.env.CRUMBSUP_DAO_ID || "guild-radix-dao",
          member_count: db.getCrumbsUpMembers(1000).length,
          proposals_synced: syncedProposals.length,
          synced_at: Math.floor(Date.now() / 1000),
        }
      }));
    }

    // GET /api/crumbsup/dao
    if (url.pathname === "/api/crumbsup/dao" && req.method === "GET") {
      const members = db.getCrumbsUpMembers(1000);
      const proposals = db.getSyncedCrumbsUpProposals();
      const avgRep = members.length > 0
        ? Math.round(members.reduce((s, m) => s + (m.reputation_score || 0), 0) / members.length)
        : 0;
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          id: process.env.CRUMBSUP_DAO_ID || "guild-radix-dao",
          name: "Radix Guild DAO",
          member_count: members.length,
          total_proposals_synced: proposals.length,
          reputation_avg: avgRep,
          created_at: null,
        }
      }));
    }

    // GET /api/crumbsup/proposals
    if (url.pathname === "/api/crumbsup/proposals" && req.method === "GET") {
      const synced = db.getSyncedCrumbsUpProposals();
      const result = synced.map(p => ({
        crumbsup_id: p.crumbsup_id,
        guild_id: p.id,
        title: p.title,
        status: p.status,
        votes: db.getVoteCounts(p.id),
        crumbsup_url: p.crumbsup_url,
      }));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result }));
    }

    // GET /api/crumbsup/members
    if (url.pathname === "/api/crumbsup/members" && req.method === "GET") {
      const members = db.getCrumbsUpMembers(100);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: members }));
    }

    // POST /api/crumbsup/sync-member/:address — sync user XP → CrumbsUp (admin)
    if (url.pathname.match(/^\/api\/crumbsup\/sync-member\/(account_rdx1[a-z0-9]+)$/) && req.method === "POST") {
      if (!isAdmin(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: "forbidden" }));
      }
      const addr = url.pathname.split("/").pop();
      try {
        const badge = await getBadgeData(addr);
        const xp = badge?.xp || 0;
        const { syncReputationScoreToCrumbsUp } = require("./crumbsup");
        const result = await syncReputationScoreToCrumbsUp(addr, xp, db);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: result }));
      } catch (e) {
        res.writeHead(500);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // POST /api/webhooks/crumbsup — receive CrumbsUp events
    if (url.pathname === "/api/webhooks/crumbsup" && req.method === "POST") {
      const rawBody = await new Promise((resolve) => {
        let data = "";
        req.on("data", c => { data += c; });
        req.on("end", () => resolve(data));
      });
      const sig = req.headers["x-hub-signature-256"] || req.headers["x-crumbsup-signature"];
      const { validateCrumbsUpWebhookSignature, handleCrumbsUpWebhook } = require("./crumbsup");
      if (process.env.CRUMBSUP_WEBHOOK_SECRET && !validateCrumbsUpWebhookSignature(rawBody, sig)) {
        res.writeHead(401);
        return res.end(JSON.stringify({ ok: false, error: "invalid_signature" }));
      }
      let body = {};
      try { body = JSON.parse(rawBody || "{}"); } catch (_) {}
      try {
        const result = await handleCrumbsUpWebhook(body, db);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: result }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }

    // ────────────────────────────────────────────────────────────
    // Federation endpoints
    // ────────────────────────────────────────────────────────────

    // GET /api/federation/status
    if (url.pathname === "/api/federation/status" && req.method === "GET") {
      const cv2Synced = db.getSyncedCv2Proposals().length;
      const crumbsupSynced = db.getSyncedCrumbsUpProposals().length;
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          cv2_synced: cv2Synced > 0,
          crumbsup_synced: crumbsupSynced > 0,
          cv2_proposals: cv2Synced,
          crumbsup_proposals: crumbsupSynced,
          health: "ok",
          last_check: Math.floor(Date.now() / 1000),
        }
      }));
    }

    // GET /api/federation/proposals
    if (url.pathname === "/api/federation/proposals" && req.method === "GET") {
      const all = db.getProposalHistory(50);
      const result = all.map(p => {
        const counts = db.getVoteCounts(p.id);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return {
          guild_proposal: { id: p.id, title: p.title, status: p.status },
          cv2: p.cv2_id ? { cv2_id: p.cv2_id, cv2_url: p.cv2_url, synced: true } : null,
          crumbsup: p.crumbsup_id ? { crumbsup_id: p.crumbsup_id, crumbsup_url: p.crumbsup_url, synced: true } : null,
          combined_vote_count: total,
          result: p.status,
        };
      });
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result }));
    }

    // GET /api/federation/voters
    if (url.pathname === "/api/federation/voters" && req.method === "GET") {
      const members = db.getCrumbsUpMembers(100);
      const result = members.map(m => ({
        address: m.radix_address,
        guild_xp: m.xp_score,
        crumbsup_reputation: m.reputation_score,
        crumbsup_user_id: m.crumbsup_user_id,
        total_weight: m.xp_score + (m.reputation_score * 10),
      }));
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result }));
    }

    // GET /api/federation/health
    if (url.pathname === "/api/federation/health" && req.method === "GET") {
      const cv2Enabled = !!(process.env.CV2_API_URL && process.env.CV2_API_KEY);
      const crumbsupEnabled = !!(process.env.CRUMBSUP_API_URL && process.env.CRUMBSUP_API_KEY);
      res.writeHead(200);
      return res.end(JSON.stringify({
        ok: true,
        data: {
          cv2_api: cv2Enabled ? "ok" : "disabled",
          crumbsup_api: crumbsupEnabled ? "ok" : "disabled",
          gateway_api: "ok",
          db: "ok",
          last_check: Math.floor(Date.now() / 1000),
        }
      }));
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

