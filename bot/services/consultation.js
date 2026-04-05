// Consultation v2 (CV2) API client — bridges Guild proposals ↔ Radix network governance
const crypto = require("crypto");

const CV2_API_URL = process.env.CV2_API_URL || "https://api.consultation.radix.network/v2";
const CV2_API_KEY = process.env.CV2_API_KEY || "";
const CV2_WEBHOOK_SECRET = process.env.CV2_WEBHOOK_SECRET || "";
const RADIX_GATEWAY_URL = process.env.RADIX_GATEWAY_URL || "https://gateway.radixscan.io";

const VOTE_WEIGHTS = { member: 1, contributor: 2, builder: 3, steward: 5, elder: 10 };

// Minimal fetch wrapper with auth + error handling
async function cv2Fetch(path, opts = {}) {
  const url = CV2_API_URL + path;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": CV2_API_KEY,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("[CV2] " + res.status + " " + res.statusText + ": " + text);
  }
  return res.json();
}

// Query CV2 for a specific proposal by its CV2 ID
async function getProposalFromCV2(cv2ProposalId) {
  if (!cv2ProposalId) throw new Error("cv2ProposalId required");
  const data = await cv2Fetch("/proposals/" + cv2ProposalId);
  return {
    id: data.id,
    title: data.title,
    voting_starts: data.voting_starts,
    voting_ends: data.voting_ends,
    options: data.options || [],
    current_votes: data.current_votes || {},
    source_guild_id: data.metadata?.source_guild_id || null,
  };
}

// Sync a Guild proposal to CV2 and register a return webhook
async function syncProposalToCV2(guildProposal, voteWeights) {
  if (!guildProposal || !guildProposal.id) throw new Error("guildProposal required");
  const weights = voteWeights || VOTE_WEIGHTS;

  const body = {
    title: guildProposal.title,
    description: guildProposal.description || guildProposal.title,
    options: guildProposal.type === "yesno"
      ? ["for", "against", "amend"]
      : (guildProposal.options || []),
    starts_at: guildProposal.created_at || Math.floor(Date.now() / 1000),
    ends_at: guildProposal.ends_at,
    vote_weights: weights,
    metadata: {
      source_guild_id: guildProposal.id,
      source: "radix-guild-bot",
    },
    webhook_url: (process.env.BOT_API_URL || "https://api.guild.radix.community") + "/api/webhooks/cv2",
  };

  const result = await cv2Fetch("/proposals", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    cv2_id: result.id,
    cv2_url: result.url || (CV2_API_URL + "/proposals/" + result.id),
    sync_timestamp: Math.floor(Date.now() / 1000),
    webhook_registered: result.webhook_registered || true,
  };
}

// Fetch current vote weights from badge tiers (static mapping)
async function getVoteWeightsFromBadges() {
  return { ...VOTE_WEIGHTS };
}

// Handle incoming CV2 webhook (vote update / status change)
async function handleCV2Webhook(event, db) {
  if (!event || !event.type) throw new Error("Invalid webhook event");

  if (event.type === "vote_cast") {
    const { proposal_cv2_id, voter, vote, weight } = event;
    if (!proposal_cv2_id) return { ok: false, error: "missing proposal_cv2_id" };

    // Look up local proposal by cv2_id
    const guildProposalId = db.getProposalIdByCv2Id(proposal_cv2_id);
    if (!guildProposalId) return { ok: false, error: "unknown_proposal" };

    // Sync the cv2 vote count update
    db.updateCv2VoteCount(proposal_cv2_id, event.total_votes || 0);
    db.logCv2VoteSync(guildProposalId, proposal_cv2_id, "cv2_to_guild", event.vote_delta || 1);

    return { ok: true, guild_proposal_id: guildProposalId, vote, weight };
  }

  if (event.type === "proposal_status_changed") {
    const { proposal_cv2_id, new_status } = event;
    db.updateCv2VoteCount(proposal_cv2_id, event.total_votes || 0);
    return { ok: true, new_status };
  }

  return { ok: true, ignored: true };
}

// Tally votes with on-chain badge weights
async function tallyVotesWithWeights(proposalId, db) {
  if (!proposalId) throw new Error("proposalId required");

  const votes = db.getVotesWithAddresses(proposalId);
  const proposal = db.getProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found: " + proposalId);

  const tally = { for: 0, against: 0, amend: 0, total_weight: 0 };
  const unknownOpts = {};

  for (const v of votes) {
    // Fetch badge tier from Radix gateway
    let tier = "member";
    try {
      const gwRes = await fetch(RADIX_GATEWAY_URL + "/badge/" + v.radix_address);
      if (gwRes.ok) {
        const badge = await gwRes.json();
        tier = badge?.tier || "member";
      }
    } catch (_) {}

    const weight = VOTE_WEIGHTS[tier] || 1;

    if (v.vote === "for") tally.for += weight;
    else if (v.vote === "against") tally.against += weight;
    else if (v.vote === "amend") tally.amend += weight;
    else {
      unknownOpts[v.vote] = (unknownOpts[v.vote] || 0) + weight;
    }
    tally.total_weight += weight;
  }

  // Merge unknown options into tally
  Object.assign(tally, unknownOpts);

  let result = "failed";
  if (proposal.type === "yesno") {
    if (tally.for > tally.against && tally.for > tally.amend) result = "passed";
    else if (tally.amend > tally.for) result = "needs_amendment";
  } else {
    const sorted = Object.entries(tally).filter(([k]) => k !== "total_weight").sort((a, b) => b[1] - a[1]);
    result = sorted[0]?.[0] || "failed";
  }

  return { ...tally, result };
}

// Get all Guild proposals mirrored in CV2
async function getCV2ProposalsForGuild(db) {
  const synced = db.getSyncedCv2Proposals();
  const results = [];

  for (const row of synced) {
    let cv2Data = null;
    try {
      cv2Data = await getProposalFromCV2(row.cv2_id);
    } catch (_) {}

    results.push({
      guild_id: row.id,
      cv2_id: row.cv2_id,
      title: row.title,
      status: row.status,
      vote_counts: db.getVoteCounts(row.id),
      cv2_vote_counts: cv2Data?.current_votes || {},
      cv2_url: row.cv2_url,
      sync_status: row.cv2_synced ? "synced" : "pending",
    });
  }

  return results;
}

module.exports = {
  getProposalFromCV2,
  syncProposalToCV2,
  getVoteWeightsFromBadges,
  handleCV2Webhook,
  tallyVotesWithWeights,
  getCV2ProposalsForGuild,
  VOTE_WEIGHTS,
};
