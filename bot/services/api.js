// Simple HTTP API for proposal data — consumed by the portal
const http = require("http");
const db = require("../db");

const API_PORT = parseInt(process.env.API_PORT || "3003");

function startApi() {
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      return res.end();
    }

    const url = new URL(req.url, "http://localhost");

    // GET /api/proposals — all proposals with vote counts
    if (url.pathname === "/api/proposals") {
      db.closeExpiredProposals();
      const status = url.searchParams.get("status") || "all";
      let proposals;
      if (status === "active") {
        proposals = db.getActiveProposals();
      } else {
        proposals = db.getProposalHistory(50);
      }

      const result = proposals.map(p => ({
        ...p,
        counts: db.getVoteCounts(p.id),
        total_votes: Object.values(db.getVoteCounts(p.id)).reduce((a, b) => a + b, 0),
      }));

      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: result }));
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

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  server.listen(API_PORT, () => {
    console.log("[API] Proposals API running on port " + API_PORT);
  });
}

module.exports = { startApi };
