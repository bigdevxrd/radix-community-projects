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

// ── CV2 Governance Manifests ──────────────────────────────

export function makeTemperatureCheckManifest(
  component: string,
  account: string,
  title: string,
  shortDescription: string,
  description: string,
  options: string[],
): string {
  const c = validateAddress(component, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const t = sanitize(title);
  const sd = sanitize(shortDescription);
  const desc = sanitize(description);
  const opts = options.map(o => `Tuple("${sanitize(o)}")`).join(", ");
  return `CALL_METHOD
  Address("${c}")
  "make_temperature_check"
  Address("${a}")
  Tuple(
    "${t}",
    "${sd}",
    "${desc}",
    Array<Tuple>(${opts}),
    Array<String>(),
    Enum<0u8>()
  )
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function voteOnTemperatureCheckManifest(
  component: string,
  account: string,
  temperatureCheckId: number,
  vote: "for" | "against",
): string {
  const c = validateAddress(component, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const voteEnum = vote === "for" ? "Enum<0u8>()" : "Enum<1u8>()";
  return `CALL_METHOD
  Address("${c}")
  "vote_on_temperature_check"
  Address("${a}")
  ${temperatureCheckId}u64
  ${voteEnum}
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
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
