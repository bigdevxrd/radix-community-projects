// CrumbsUp API client — bidirectional sync between Guild DAO and CrumbsUp hub
const crypto = require("crypto");

const CRUMBSUP_API_URL = process.env.CRUMBSUP_API_URL || "https://api.crumbsup.io";
const CRUMBSUP_API_KEY = process.env.CRUMBSUP_API_KEY || "";
const CRUMBSUP_WEBHOOK_SECRET = process.env.CRUMBSUP_WEBHOOK_SECRET || "";
const CRUMBSUP_DAO_ID = process.env.CRUMBSUP_DAO_ID || "guild-radix-dao";

// Validate a CrumbsUp webhook signature (HMAC-SHA256)
function validateCrumbsUpWebhookSignature(payload, signature) {
  if (!CRUMBSUP_WEBHOOK_SECRET) return false;
  if (!signature) return false;
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const expected = "sha256=" + crypto.createHmac("sha256", CRUMBSUP_WEBHOOK_SECRET)
    .update(payloadStr, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  } catch (_) {
    return false;
  }
}

// Minimal fetch wrapper with auth + error handling
async function crumbsupFetch(path, opts = {}) {
  const url = CRUMBSUP_API_URL + path;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": CRUMBSUP_API_KEY,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("[CrumbsUp] " + res.status + " " + res.statusText + ": " + text);
  }
  return res.json();
}

// Create or update the Guild DAO on CrumbsUp
async function syncDAOToCrumbsUp(daoMetadata) {
  const body = {
    dao_id: CRUMBSUP_DAO_ID,
    name: daoMetadata.name || "Radix Guild DAO",
    description: daoMetadata.description || "Community governance for the Radix ecosystem",
    website: daoMetadata.website || "https://guild.radix.community",
    logo_url: daoMetadata.logo_url || "",
    member_count: daoMetadata.member_count || 0,
    metadata: { source: "radix-guild-bot", ...daoMetadata.metadata },
    webhook_url: (process.env.BOT_API_URL || "https://api.guild.radix.community") + "/api/webhooks/crumbsup",
  };

  const result = await crumbsupFetch("/daos", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    crumbsup_dao_id: result.dao_id || CRUMBSUP_DAO_ID,
    crumbsup_url: result.url || (CRUMBSUP_API_URL + "/dao/" + CRUMBSUP_DAO_ID),
    members_count: result.members_count || daoMetadata.member_count || 0,
    synced_at: Math.floor(Date.now() / 1000),
  };
}

// Sync a Guild proposal to CrumbsUp as a DAO bounty/proposal
async function syncProposalToCrumbsUp(guildProposal) {
  if (!guildProposal || !guildProposal.id) throw new Error("guildProposal required");

  const body = {
    dao_id: CRUMBSUP_DAO_ID,
    title: guildProposal.title,
    description: guildProposal.description || guildProposal.title,
    type: guildProposal.type === "yesno" ? "governance" : "poll",
    options: guildProposal.type === "yesno"
      ? ["for", "against", "amend"]
      : (guildProposal.options || []),
    starts_at: guildProposal.created_at || Math.floor(Date.now() / 1000),
    ends_at: guildProposal.ends_at,
    metadata: {
      source_guild_id: guildProposal.id,
      source: "radix-guild-bot",
    },
  };

  const result = await crumbsupFetch("/daos/" + CRUMBSUP_DAO_ID + "/proposals", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    crumbsup_id: result.id,
    crumbsup_url: result.url || (CRUMBSUP_API_URL + "/dao/" + CRUMBSUP_DAO_ID + "/proposals/" + result.id),
    sync_timestamp: Math.floor(Date.now() / 1000),
  };
}

// Handle incoming CrumbsUp webhook (vote, delegation, member event)
async function handleCrumbsUpWebhook(event, db) {
  if (!event || !event.type) throw new Error("Invalid webhook event");

  if (event.type === "vote_cast") {
    const { proposal_crumbsup_id, voter_address, vote, weight } = event;
    if (!proposal_crumbsup_id) return { ok: false, error: "missing proposal_crumbsup_id" };

    const guildProposalId = db.getProposalIdByCrumbsUpId(proposal_crumbsup_id);
    if (!guildProposalId) return { ok: false, error: "unknown_proposal" };

    db.logCrumbsUpSync(guildProposalId, proposal_crumbsup_id, "vote_cast", "crumbsup_to_guild");
    return { ok: true, guild_proposal_id: guildProposalId, vote, weight };
  }

  if (event.type === "delegation_changed") {
    const { delegator_address, delegate_address } = event;
    db.logCrumbsUpSync(null, null, "delegation_changed", "crumbsup_to_guild");
    return { ok: true, delegator_address, delegate_address };
  }

  if (event.type === "member_joined") {
    const { radix_address, crumbsup_user_id } = event;
    if (radix_address && crumbsup_user_id && db.upsertCrumbsUpMember) {
      db.upsertCrumbsUpMember(radix_address, crumbsup_user_id, 0, 0);
    }
    return { ok: true, radix_address };
  }

  if (event.type === "proposal_completed") {
    const { proposal_crumbsup_id, result, vote_counts } = event;
    db.logCrumbsUpSync(null, proposal_crumbsup_id, "proposal_completed", "crumbsup_to_guild");
    return { ok: true, proposal_crumbsup_id, result };
  }

  return { ok: true, ignored: true };
}

// Map Guild XP to CrumbsUp reputation score (100 XP = 1 reputation point)
async function syncReputationScoreToCrumbsUp(address, xp, db) {
  if (!address) throw new Error("address required");
  const reputationScore = Math.floor((xp || 0) / 100);

  const body = {
    radix_address: address,
    reputation_score: reputationScore,
    xp_score: xp || 0,
  };

  const result = await crumbsupFetch("/daos/" + CRUMBSUP_DAO_ID + "/members", {
    method: "PUT",
    body: JSON.stringify(body),
  });

  const synced_at = Math.floor(Date.now() / 1000);
  if (db && db.upsertCrumbsUpMember) {
    db.upsertCrumbsUpMember(address, result.user_id || result.crumbsup_user_id, xp || 0, reputationScore);
  }

  return {
    crumbsup_user_id: result.user_id || result.crumbsup_user_id,
    reputation_score: reputationScore,
    synced_at,
  };
}

// Fetch CrumbsUp proposals for this Guild DAO (read-only mirror)
async function getCrumbsUpProposalsForGuild(db) {
  const result = await crumbsupFetch("/daos/" + CRUMBSUP_DAO_ID + "/proposals?limit=50");
  const proposals = result.proposals || result.data || [];

  return proposals.map(p => {
    let guildId = null;
    if (db) {
      guildId = db.getProposalIdByCrumbsUpId(p.id);
    }
    return {
      crumbsup_id: p.id,
      guild_id: guildId,
      title: p.title,
      status: p.status,
      vote_counts: p.vote_counts || {},
      crumbsup_url: p.url || (CRUMBSUP_API_URL + "/dao/" + CRUMBSUP_DAO_ID + "/proposals/" + p.id),
    };
  });
}

module.exports = {
  validateCrumbsUpWebhookSignature,
  syncDAOToCrumbsUp,
  syncProposalToCrumbsUp,
  handleCrumbsUpWebhook,
  syncReputationScoreToCrumbsUp,
  getCrumbsUpProposalsForGuild,
};
