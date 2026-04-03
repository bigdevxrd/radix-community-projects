const GATEWAY = "https://mainnet.radixdlt.com";
const BADGE_NFT = process.env.BADGE_NFT || "resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6";

async function hasBadge(radixAddress) {
  try {
    const resp = await fetch(`${GATEWAY}/state/entity/details`, {
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
    return nfResources.some((r) => r.resource_address === BADGE_NFT);
  } catch (e) {
    console.error("[Gateway] hasBadge error:", e.message);
    return false;
  }
}

async function getBadgeData(radixAddress) {
  try {
    const resp = await fetch(`${GATEWAY}/state/entity/details`, {
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
    const badgeRes = nfResources.find((r) => r.resource_address === BADGE_NFT);
    if (!badgeRes) return null;

    const nfIds = badgeRes.vaults?.items?.[0]?.items || [];
    if (nfIds.length === 0) return null;

    const badgeResp = await fetch(`${GATEWAY}/state/non-fungible/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_address: BADGE_NFT,
        non_fungible_ids: [nfIds[0]],
      }),
    });
    const badgeData = await badgeResp.json();
    const nft = badgeData.non_fungible_ids?.[0];
    if (!nft?.data?.programmatic_json?.fields) return null;

    const f = nft.data.programmatic_json.fields;
    const g = (i) => f[i]?.value || f[i]?.fields?.[0]?.value || "-";

    return {
      id: nfIds[0],
      issued_to: g(0),
      schema: g(1),
      tier: g(3),
      status: g(4),
      xp: parseInt(g(6)) || 0,
      level: g(7),
    };
  } catch (e) {
    console.error("[Gateway] getBadgeData error:", e.message);
    return null;
  }
}

module.exports = { hasBadge, getBadgeData };
