// XP rewards — awards XP on-chain after verified actions
// Uses the VPS signer to call update_xp on the badge manager

const GATEWAY = "https://mainnet.radixdlt.com";
const MANAGER = process.env.BADGE_MANAGER || "component_rdx1cqarn8x6gk0806qyc9eee4nh6arzkm90xvnk0edqgtcfgghx5m2v2w";
const BADGE_NFT = process.env.BADGE_NFT || "resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6";

// XP amounts per action
const XP_REWARDS = {
  vote: 10,
  propose: 25,
  poll: 25,
  temp: 10,
  amend: 15,
};

// Get current badge data for a wallet
async function getBadgeNfId(radixAddress) {
  try {
    const resp = await fetch(GATEWAY + "/state/entity/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [radixAddress],
        aggregation_level: "Vault",
        opt_ins: { non_fungible_include_nfids: true },
      }),
    });
    const data = await resp.json();
    const nfResources = data.items?.[0]?.non_fungible_resources?.items || [];
    const badgeRes = nfResources.find(r => r.resource_address === BADGE_NFT);
    if (!badgeRes) return null;
    const nfIds = badgeRes.vaults?.items?.[0]?.items || [];
    return nfIds[0] || null;
  } catch (e) {
    console.error("[XP] getBadgeNfId error:", e.message);
    return null;
  }
}

async function getCurrentXp(nfId) {
  try {
    const resp = await fetch(GATEWAY + "/state/non-fungible/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_address: BADGE_NFT, non_fungible_ids: [nfId] }),
    });
    const data = await resp.json();
    const fields = data.non_fungible_ids?.[0]?.data?.programmatic_json?.fields;
    if (!fields) return 0;
    return parseInt(fields[6]?.value || "0") || 0;
  } catch (e) {
    console.error("[XP] getCurrentXp error:", e.message);
    return 0;
  }
}

// Queue XP update — doesn't execute on-chain immediately
// Batches XP changes and applies them periodically via VPS signer
const xpQueue = new Map(); // radixAddress → { nfId, pendingXp }

function queueXpReward(radixAddress, action) {
  const xp = XP_REWARDS[action] || 0;
  if (xp === 0) return;

  const existing = xpQueue.get(radixAddress) || { pendingXp: 0 };
  existing.pendingXp += xp;
  xpQueue.set(radixAddress, existing);

  console.log("[XP] Queued +" + xp + " for " + radixAddress.slice(0, 20) + "... (" + action + "). Pending: " + existing.pendingXp);
}

function getXpQueue() {
  return Array.from(xpQueue.entries()).map(([addr, data]) => ({
    address: addr,
    pendingXp: data.pendingXp,
  }));
}

function clearXpQueue() {
  xpQueue.clear();
}

module.exports = { XP_REWARDS, getBadgeNfId, getCurrentXp, queueXpReward, getXpQueue, clearXpQueue };
