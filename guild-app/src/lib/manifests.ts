// Sanitize string values to prevent manifest injection
function sanitize(val: string): string {
  return val.replace(/["\\\n\r;]/g, "");
}

// Validate Radix address format
function validateAddress(addr: string, prefix: string): string {
  if (!addr.match(new RegExp(`^${prefix}[a-z0-9]{20,}`))) {
    throw new Error(`Invalid ${prefix} address`);
  }
  return addr;
}

export function publicMintManifest(
  manager: string,
  username: string,
  account: string
): string {
  const m = validateAddress(manager, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const u = sanitize(username);
  return `CALL_METHOD
  Address("${m}")
  "public_mint"
  "${u}"
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function adminMintManifest(
  manager: string, adminBadge: string, username: string, tier: string, account: string
): string {
  const a = validateAddress(account, "account_rdx");
  const ab = validateAddress(adminBadge, "resource_rdx");
  const m = validateAddress(manager, "component_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_amount"
  Address("${ab}")
  Decimal("1")
;
CALL_METHOD
  Address("${m}")
  "mint_badge"
  "${sanitize(username)}"
  "${sanitize(tier)}"
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function updateTierManifest(
  manager: string, adminBadge: string, badgeId: string, newTier: string, account: string
): string {
  const a = validateAddress(account, "account_rdx");
  const ab = validateAddress(adminBadge, "resource_rdx");
  const m = validateAddress(manager, "component_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_amount"
  Address("${ab}")
  Decimal("1")
;
CALL_METHOD
  Address("${m}")
  "update_tier"
  NonFungibleLocalId("${sanitize(badgeId)}")
  "${sanitize(newTier)}"
;`;
}

export function updateXpManifest(
  manager: string, adminBadge: string, badgeId: string, newXp: number, account: string
): string {
  const a = validateAddress(account, "account_rdx");
  const ab = validateAddress(adminBadge, "resource_rdx");
  const m = validateAddress(manager, "component_rdx");
  const xp = Math.max(0, Math.floor(newXp));
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_amount"
  Address("${ab}")
  Decimal("1")
;
CALL_METHOD
  Address("${m}")
  "update_xp"
  NonFungibleLocalId("${sanitize(badgeId)}")
  ${xp}u64
;`;
}

export function revokeBadgeManifest(
  manager: string, adminBadge: string, badgeId: string, reason: string, account: string
): string {
  const a = validateAddress(account, "account_rdx");
  const ab = validateAddress(adminBadge, "resource_rdx");
  const m = validateAddress(manager, "component_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_amount"
  Address("${ab}")
  Decimal("1")
;
CALL_METHOD
  Address("${m}")
  "revoke_badge"
  NonFungibleLocalId("${sanitize(badgeId)}")
  "${sanitize(reason)}"
;`;
}

export function updateExtraDataManifest(
  manager: string, adminBadge: string, badgeId: string, extraData: string, account: string
): string {
  const a = validateAddress(account, "account_rdx");
  const ab = validateAddress(adminBadge, "resource_rdx");
  const m = validateAddress(manager, "component_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_amount"
  Address("${ab}")
  Decimal("1")
;
CALL_METHOD
  Address("${m}")
  "update_extra_data"
  NonFungibleLocalId("${sanitize(badgeId)}")
  "${sanitize(extraData)}"
;`;
}

export interface OutcomeData {
  proposal_id: number;
  winner: string | null;
  result: string;
  total_votes: number;
  timestamp: number;
}

export function updateOutcomeManifest(
  manager: string,
  adminBadge: string,
  badgeId: string,
  outcome: OutcomeData,
  account: string
): string {
  const a = validateAddress(account, "account_rdx");
  const ab = validateAddress(adminBadge, "resource_rdx");
  const m = validateAddress(manager, "component_rdx");
  const outcomeJson = sanitize(JSON.stringify(outcome));
  return `CALL_METHOD
  Address("${a}")
  "lock_fee"
  Decimal("10")
;
CALL_METHOD
  Address("${a}")
  "create_proof_of_amount"
  Address("${ab}")
  Decimal("1")
;
CALL_METHOD
  Address("${m}")
  "update_extra_data"
  NonFungibleLocalId("${sanitize(badgeId)}")
  "${outcomeJson}"
;`;
}
