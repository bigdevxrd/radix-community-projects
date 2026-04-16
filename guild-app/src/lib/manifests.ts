// Sanitize string values to prevent manifest injection
function sanitize(val: string): string {
  return val.replace(/["`{}\\\n\r;<>]/g, "");
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

// ── Escrow Manifests ─────────────────────────────────────

const XRD = "resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd";

export function createEscrowTaskManifest(
  escrowComponent: string,
  badgeNft: string,
  account: string,
  amountXrd: string,
  deadline: number | null,
): string {
  const e = validateAddress(escrowComponent, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const b = validateAddress(badgeNft, "resource_rdx");
  const amt = sanitize(amountXrd);
  const deadlineArg = deadline ? `Enum<1u8>(${deadline}i64)` : "Enum<0u8>()";
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_non_fungibles"
  Address("${b}")
  Array<NonFungibleLocalId>()
;
CALL_METHOD
  Address("${a}")
  "withdraw"
  Address("${XRD}")
  Decimal("${amt}")
;
TAKE_ALL_FROM_WORKTOP
  Address("${XRD}")
  Bucket("xrd_payment")
;
CALL_METHOD
  Address("${e}")
  "create_task"
  Bucket("xrd_payment")
  Address("${a}")
  ${deadlineArg}
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function claimTaskManifest(
  escrowComponent: string,
  badgeNft: string,
  account: string,
  taskId: number,
): string {
  const e = validateAddress(escrowComponent, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const b = validateAddress(badgeNft, "resource_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_non_fungibles"
  Address("${b}")
  Array<NonFungibleLocalId>()
;
POP_FROM_AUTH_ZONE
  Proof("badge_proof")
;
CALL_METHOD
  Address("${e}")
  "claim_task"
  ${taskId}u64
  Address("${a}")
  Proof("badge_proof")
;`;
}

export function submitTaskManifest(
  escrowComponent: string,
  badgeNft: string,
  account: string,
  taskId: number,
): string {
  const e = validateAddress(escrowComponent, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const b = validateAddress(badgeNft, "resource_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_non_fungibles"
  Address("${b}")
  Array<NonFungibleLocalId>()
;
POP_FROM_AUTH_ZONE
  Proof("badge_proof")
;
CALL_METHOD
  Address("${e}")
  "submit_task"
  ${taskId}u64
  Proof("badge_proof")
;`;
}

export function cancelTaskManifest(
  escrowComponent: string,
  escrowReceipt: string,
  account: string,
  taskId: number,
): string {
  const e = validateAddress(escrowComponent, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const r = validateAddress(escrowReceipt, "resource_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_non_fungibles"
  Address("${r}")
  Array<NonFungibleLocalId>(NonFungibleLocalId("#${taskId}#"))
;
POP_FROM_AUTH_ZONE
  Proof("receipt_proof")
;
CALL_METHOD
  Address("${e}")
  "cancel_task"
  ${taskId}u64
  Proof("receipt_proof")
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

// ── CV3 Conviction Voting Manifests ──

const XRD_ADDR = "resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd";

export function createCv3ProposalManifest(
  cv3Component: string, badgeNft: string, account: string,
  title: string, description: string, requestedAmount: string, beneficiary: string
): string {
  const c = validateAddress(cv3Component, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const b = validateAddress(badgeNft, "resource_rdx");
  const ben = validateAddress(beneficiary, "component_rdx").startsWith("component_") ? beneficiary : validateAddress(beneficiary, "account_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_non_fungibles"
  Address("${b}")
  Array<NonFungibleLocalId>()
;
POP_FROM_AUTH_ZONE
  Proof("badge_proof")
;
CALL_METHOD
  Address("${c}")
  "create_proposal"
  "${sanitize(title)}"
  "${sanitize(description)}"
  Decimal("${sanitize(requestedAmount)}")
  Address("${sanitize(ben)}")
  Proof("badge_proof")
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function stakeOnCv3ProposalManifest(
  cv3Component: string, badgeNft: string, account: string, proposalId: number, amountXrd: string
): string {
  const c = validateAddress(cv3Component, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const b = validateAddress(badgeNft, "resource_rdx");
  const amt = sanitize(amountXrd);
  return `CALL_METHOD
  Address("${a}")
  "withdraw"
  Address("${XRD_ADDR}")
  Decimal("${amt}")
;
TAKE_ALL_FROM_WORKTOP
  Address("${XRD_ADDR}")
  Bucket("stake_xrd")
;
CALL_METHOD
  Address("${a}")
  "create_proof_of_non_fungibles"
  Address("${b}")
  Array<NonFungibleLocalId>()
;
POP_FROM_AUTH_ZONE
  Proof("badge_proof")
;
CALL_METHOD
  Address("${c}")
  "add_stake"
  ${proposalId}u64
  Bucket("stake_xrd")
  Proof("badge_proof")
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function unstakeFromCv3ProposalManifest(
  cv3Component: string, badgeNft: string, account: string, proposalId: number
): string {
  const c = validateAddress(cv3Component, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const b = validateAddress(badgeNft, "resource_rdx");
  return `CALL_METHOD
  Address("${a}")
  "create_proof_of_non_fungibles"
  Address("${b}")
  Array<NonFungibleLocalId>()
;
POP_FROM_AUTH_ZONE
  Proof("badge_proof")
;
CALL_METHOD
  Address("${c}")
  "remove_stake"
  ${proposalId}u64
  Proof("badge_proof")
;
CALL_METHOD
  Address("${a}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
}

export function fundCv3PoolManifest(
  cv3Component: string, account: string, amountXrd: string
): string {
  const c = validateAddress(cv3Component, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  const amt = sanitize(amountXrd);
  return `CALL_METHOD
  Address("${a}")
  "withdraw"
  Address("${XRD_ADDR}")
  Decimal("${amt}")
;
TAKE_ALL_FROM_WORKTOP
  Address("${XRD_ADDR}")
  Bucket("pool_xrd")
;
CALL_METHOD
  Address("${c}")
  "fund_pool"
  Bucket("pool_xrd")
;`;
}
