// CrumbsUp DAO integration — post bounties + handle approval webhooks
const CRUMBSUP_BASE = "https://crumbsup.io/api";
const GUILD_DAO_ID = process.env.CRUMBSUP_DAO_ID || "4db790d7-4d75-49ed-a2e0-3514743809e0";

function getApiKey() {
  return process.env.CRUMBSUP_API_KEY || "";
}

// POST a new bounty to CrumbsUp DAO
async function postBountyToCrumbsUp(bounty) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[CrumbsUp] CRUMBSUP_API_KEY not set — skipping CrumbsUp post");
    return null;
  }

  const payload = {
    dao_id: GUILD_DAO_ID,
    title: bounty.title,
    description: bounty.description || "",
    reward_xrd: bounty.reward_xrd,
    deadline: new Date(bounty.ends_at * 1000).toISOString(),
    category: bounty.category || "other",
  };

  try {
    const response = await fetch(CRUMBSUP_BASE + "/bounties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[CrumbsUp] POST /bounties failed:", response.status, text);
      return null;
    }

    const data = await response.json();
    console.log("[CrumbsUp] Bounty posted:", data.id);
    return data;
  } catch (e) {
    console.error("[CrumbsUp] Error posting bounty:", e.message);
    return null;
  }
}

// Fetch current status of a bounty from CrumbsUp
async function fetchBountyStatus(crumbsupId) {
  const apiKey = getApiKey();
  if (!apiKey || !crumbsupId) return null;

  try {
    const response = await fetch(CRUMBSUP_BASE + "/bounties/" + crumbsupId, {
      headers: { "Authorization": "Bearer " + apiKey },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error("[CrumbsUp] Error fetching bounty status:", e.message);
    return null;
  }
}

// Validate an incoming CrumbsUp webhook signature
// Returns true if valid (or if no secret is configured — dev fallback)
function validateWebhookSignature(body, signatureHeader) {
  const secret = process.env.CRUMBSUP_WEBHOOK_SECRET;
  if (!secret) return true; // dev fallback: allow all

  try {
    const crypto = require("crypto");
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    return signatureHeader === "sha256=" + expected;
  } catch (e) {
    return false;
  }
}

module.exports = { postBountyToCrumbsUp, fetchBountyStatus, validateWebhookSignature };
