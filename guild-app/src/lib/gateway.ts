import { GATEWAY, SCHEMAS } from "./constants";
import type { BadgeInfo } from "./types";

export async function fetchEntityDetails(address: string) {
  const resp = await fetch(`${GATEWAY}/state/entity/details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addresses: [address],
      aggregation_level: "Vault",
      opt_ins: { non_fungible_include_nfids: true },
    }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

export async function fetchNftData(resourceAddress: string, nfIds: string[]) {
  const resp = await fetch(`${GATEWAY}/state/non-fungible/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resource_address: resourceAddress,
      non_fungible_ids: nfIds,
    }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseBadgeFields(nfId: string, fields: any[]): BadgeInfo {
  const g = (i: number) => fields[i]?.value || fields[i]?.fields?.[0]?.value || "-";
  return {
    id: nfId,
    issued_to: g(0),
    schema_name: g(1),
    issued_at: parseInt(g(2)) || 0,
    tier: g(3),
    status: g(4),
    last_updated: parseInt(g(5)) || 0,
    xp: parseInt(g(6)) || 0,
    level: g(7),
    extra_data: g(8),
  };
}

export async function loadUserBadge(
  address: string,
  badgeResource: string
): Promise<BadgeInfo | null> {
  try {
    const data = await fetchEntityDetails(address);
    if (!data) return null;

    const nfResources = data.items?.[0]?.non_fungible_resources?.items || [];
    const badgeRes = nfResources.find(
      (r: any) => r.resource_address === badgeResource
    );
    if (!badgeRes) return null;

    const nfIds = badgeRes.vaults?.items?.[0]?.items || [];
    if (nfIds.length === 0) return null;

    const nftData = await fetchNftData(badgeResource, [nfIds[0]]);
    if (!nftData) return null;

    const nft = nftData.non_fungible_ids?.[0];
    if (!nft?.data?.programmatic_json?.fields) return null;

    return parseBadgeFields(nfIds[0], nft.data.programmatic_json.fields);
  } catch (e) {
    console.error("Badge load error:", e);
    return null;
  }
}

export async function lookupAllBadges(address: string): Promise<BadgeInfo[]> {
  try {
    const data = await fetchEntityDetails(address);
    if (!data) return [];

    const nfResources = data.items?.[0]?.non_fungible_resources?.items || [];
    const badges: BadgeInfo[] = [];

    for (const [, schema] of Object.entries(SCHEMAS)) {
      const res = nfResources.find(
        (r: any) => r.resource_address === schema.badge
      );
      if (!res) continue;

      const nfIds = res.vaults?.items?.[0]?.items || [];
      for (const nfId of nfIds) {
        const nftData = await fetchNftData(schema.badge, [nfId]);
        if (!nftData) continue;

        const nft = nftData.non_fungible_ids?.[0];
        if (!nft?.data?.programmatic_json?.fields) continue;

        badges.push(parseBadgeFields(nfId, nft.data.programmatic_json.fields));
      }
    }

    return badges;
  } catch (e) {
    console.error("Badge lookup error:", e);
    return [];
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
