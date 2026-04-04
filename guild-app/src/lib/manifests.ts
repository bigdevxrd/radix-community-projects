export function publicMintManifest(
  manager: string,
  username: string,
  account: string
): string {
  return `CALL_METHOD
  Address("${manager}")
  "public_mint"
  "${username}"
;
CALL_METHOD
  Address("${account}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function adminMintManifest(
  manager: string,
  adminBadge: string,
  username: string,
  tier: string,
  account: string
): string {
  return `CALL_METHOD
  Address("${account}")
  "create_proof_of_amount"
  Address("${adminBadge}")
  Decimal("1")
;
CALL_METHOD
  Address("${manager}")
  "mint_badge"
  "${username}"
  "${tier}"
;
CALL_METHOD
  Address("${account}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function updateTierManifest(
  manager: string,
  adminBadge: string,
  badgeId: string,
  newTier: string,
  account: string
): string {
  return `CALL_METHOD
  Address("${account}")
  "create_proof_of_amount"
  Address("${adminBadge}")
  Decimal("1")
;
CALL_METHOD
  Address("${manager}")
  "update_tier"
  NonFungibleLocalId("${badgeId}")
  "${newTier}"
;`;
}

export function updateXpManifest(
  manager: string,
  adminBadge: string,
  badgeId: string,
  newXp: number,
  account: string
): string {
  return `CALL_METHOD
  Address("${account}")
  "create_proof_of_amount"
  Address("${adminBadge}")
  Decimal("1")
;
CALL_METHOD
  Address("${manager}")
  "update_xp"
  NonFungibleLocalId("${badgeId}")
  ${newXp}u64
;`;
}

export function revokeBadgeManifest(
  manager: string,
  adminBadge: string,
  badgeId: string,
  reason: string,
  account: string
): string {
  return `CALL_METHOD
  Address("${account}")
  "create_proof_of_amount"
  Address("${adminBadge}")
  Decimal("1")
;
CALL_METHOD
  Address("${manager}")
  "revoke_badge"
  NonFungibleLocalId("${badgeId}")
  "${reason}"
;`;
}

export function updateExtraDataManifest(
  manager: string,
  adminBadge: string,
  badgeId: string,
  extraData: string,
  account: string
): string {
  return `CALL_METHOD
  Address("${account}")
  "create_proof_of_amount"
  Address("${adminBadge}")
  Decimal("1")
;
CALL_METHOD
  Address("${manager}")
  "update_extra_data"
  NonFungibleLocalId("${badgeId}")
  "${extraData}"
;`;
}
