import { CONFIG } from '../config'
import type { BadgeData } from '../types'

const GATEWAY = CONFIG.gatewayUrl

export async function loadBadgesForAccount(accountAddr: string): Promise<BadgeData[]> {
  const resp = await fetch(`${GATEWAY}/state/entity/details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses: [accountAddr],
      aggregation_level: 'Vault',
      opt_ins: { non_fungible_include_nfids: true },
    }),
  })
  const data = await resp.json()
  const nfResources = data.items?.[0]?.non_fungible_resources?.items || []
  const badgeResource = nfResources.find(
    (r: any) => r.resource_address === CONFIG.badgeNftResource
  )
  if (!badgeResource) return []

  const nfIds: string[] = badgeResource.vaults?.items?.[0]?.items || []
  const badges: BadgeData[] = []
  for (const nfId of nfIds) {
    const badge = await lookupBadgeById(CONFIG.badgeNftResource, nfId)
    if (badge) badges.push(badge)
  }
  return badges
}

export async function lookupBadgeById(resourceAddr: string, nfId: string): Promise<BadgeData | null> {
  try {
    const resp = await fetch(`${GATEWAY}/state/non-fungible/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource_address: resourceAddr,
        non_fungible_ids: [nfId],
      }),
    })
    const data = await resp.json()
    const nft = data.non_fungible_ids?.[0]
    if (!nft?.data?.programmatic_json?.fields) return null

    const fields = nft.data.programmatic_json.fields
    const get = (i: number) => fields[i]?.value ?? fields[i]?.fields?.[0]?.value ?? ''

    return {
      id: nfId,
      issued_to: get(0),
      schema_name: get(1),
      issued_at: get(2),
      tier: get(3),
      status: get(4),
      xp: parseInt(get(6)) || 0,
      level: get(7),
      extra_data: get(8),
    }
  } catch {
    return null
  }
}
