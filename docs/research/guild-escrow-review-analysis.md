# Guild TaskEscrow — Code Review & Analysis

**Repo:** github.com/bigdevxrd/radix-community-projects  
**Issue:** Wallet TX error when adding escrow funds  
**Date:** 2026-04-09

---

## Code Structure Overview

### On-Chain (Scrypto)
- **TaskEscrow** (`badge-manager/scrypto/task-escrow/src/lib.rs`) — vault component
- State: task vaults, task metadata, fee vault, minter badge
- Key methods: `create_task()`, `claim_task()`, `submit_task()`, `release_task()`, `cancel_task()`

### Off-Chain (Node.js + Next.js)
- **escrow-watcher.js** — polls Gateway every 60s, auto-detects on-chain events
- **manifests.ts** — builds transaction manifests for wallet submission
- **bounties/[id]/page.tsx** — dashboard UI with "Fund" button

---

## The Fund Flow

### 1️⃣ User Clicks "Fund" Button (Dashboard)
**File:** `guild-app/src/app/bounties/[id]/page.tsx` line 57-85

```typescript
async function handleFund() {
  if (!rdt || !account || !bounty) return;
  setFunding(true);
  try {
    const manifest = createEscrowTaskManifest(
      ESCROW_COMPONENT,        // component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r
      BADGE_NFT,              // resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl
      account,                // user's account
      String(bounty.reward_xrd), // amount to fund
      null                     // no deadline
    );
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1
    });
```

### 2️⃣ Manifest is Built
**File:** `guild-app/src/lib/manifests.ts` line 240-265

```typescript
export function createEscrowTaskManifest(
  escrowComponent: string,
  badgeNft: string,
  account: string,
  amountXrd: string,
  deadline: number | null,
): string {
  // ... validation ...
  const deadlineArg = deadline ? `Enum<1u8>(${deadline}i64)` : "Enum<0u8>()";
  return `
    CALL_METHOD Address("${a}") "create_proof_of_non_fungibles"
      Address("${b}") Array<NonFungibleLocalId>()
    ;
    CALL_METHOD Address("${a}") "withdraw"
      Address("${XRD}") Decimal("${amt}")
    ;
    TAKE_ALL_FROM_WORKTOP Address("${XRD}") Bucket("xrd_payment");
    CALL_METHOD Address("${e}") "create_task"
      Bucket("xrd_payment") Address("${a}") ${deadlineArg}
    ;
    CALL_METHOD Address("${a}") "deposit_batch"
      Expression("ENTIRE_WORKTOP")
    ;`;
}
```

### 3️⃣ Wallet TX Submission
TX is sent to wallet via RadixDLT `rdt.walletApi.sendTransaction()`

### 4️⃣ Escrow Component Executes
**File:** `badge-manager/scrypto/task-escrow/src/lib.rs` line 146-176

```rust
pub fn create_task(
  &mut self,
  xrd_bucket: Bucket,
  creator: ComponentAddress,
  deadline: Option<i64>,
) -> Bucket {
  assert!(xrd_bucket.resource_address() == XRD, "Only XRD accepted");
  let amount = xrd_bucket.amount();
  assert!(amount >= self.min_deposit, "Below minimum deposit");
  
  // ... create task, emit event ...
  let receipt = self.minter_vault.as_fungible().authorize_with_amount(1, || {
    self.receipt_manager.mint_non_fungible(
      &NonFungibleLocalId::Integer(id),
      TaskReceipt { ... }
    )
  });
  // ... return receipt ...
}
```

### 5️⃣ Escrow-Watcher Detects Event
**File:** `bot/services/escrow-watcher.js` line 55-120

```javascript
async function pollEscrowEvents() {
  const resp = await fetch(GATEWAY + "/stream/transactions", {
    affected_global_entities_filter: [ESCROW_COMPONENT],
    from_state_version: lastStateVersion + 1,
    opt_ins: { receipt_events: true }
  });
  // ... process TaskCreatedEvent, update DB ...
}
```

---

## Potential Issues (Things That Could Cause TX Error)

### ❌ Issue #1: Manifest Validation/Parsing
**Where:** Line 240-265 in `manifests.ts`

**Problem:** The manifest uses `Array<NonFungibleLocalId>()` (empty array) but doesn't check if user actually HAS a badge.

```typescript
// Current code:
CALL_METHOD Address("${b}") Array<NonFungibleLocalId>()
// This creates proof of zero badges — might not be intended?
```

**Impact:** If the escrow's Scrypto blueprint expects the user to prove badge ownership BEFORE creating a task, this would fail.

**Check:** Does `create_task()` in the blueprint require a badge proof? If yes, the manifest should:
```typescript
// Better approach:
CALL_METHOD Address("${a}") "create_proof_of_non_fungibles"
  Address("${b}") 
  Array<NonFungibleLocalId>(NonFungibleLocalId("badge_id_here"))  // ← needs actual badge ID
;
```

---

### ❌ Issue #2: Decimal Formatting
**Where:** Line 253 in `manifests.ts`

```typescript
const amt = sanitize(amountXrd);  // ← amountXrd is a STRING
return `... Decimal("${amt}") ...`;
```

**Problem:** If `amountXrd` contains invalid characters after sanitization, or if it's "0" or negative, the manifest will fail.

**Check:**
1. Is `amountXrd` being validated as a positive number?
2. Does `sanitize()` strip leading zeros that break Decimal parsing?

**Example failure:**
```javascript
amountXrd = "100.5";  // Valid
amountXrd = "100..5";  // After sanitize() removes one dot → "100.5" OK
amountXrd = "100,5";   // Decimal doesn't accept commas
amountXrd = "-100";    // Negative, should reject
```

---

### ❌ Issue #3: Missing Badge Validation in Escrow Blueprint
**Where:** `badge-manager/scrypto/task-escrow/src/lib.rs` line 60-75

```rust
pub fn instantiate(
  fee_pct: Decimal,
  min_deposit: Decimal,
  verifier_badge: ResourceAddress,
  guild_badge: ResourceAddress,  // ← Stored but...
  owner_badge: ResourceAddress,
  dapp_def: GlobalAddress,
) -> Global<TaskEscrow> {
  // ... stores guild_badge in self.badge_resource ...
  // But create_task() doesn't check for badge!
}
```

Looking at line 160-165:
```rust
pub fn create_task(
  &mut self,
  xrd_bucket: Bucket,
  creator: ComponentAddress,
  deadline: Option<i64>,
) -> Bucket {
  // ← NO badge check here. Just accepts any XRD bucket.
```

**Issue:** The badge is stored in `self.badge_resource` but NEVER validated in `create_task()`. This means:
- ✅ Badge proof is unnecessary in manifest
- ❌ But why store the badge if it's not used?

---

### ❌ Issue #4: Manifest Structure Incomplete?
**Where:** `manifests.ts` line 248-265

Current flow:
1. Create proof (empty badge array) ← Suspicious
2. Withdraw XRD
3. Take from worktop
4. Call create_task()
5. Deposit batch

**Missing:** Does the manifest need to pass the badge PROOF to create_task()? 

Looking at Scrypto signature:
```rust
pub fn create_task(
  &mut self,
  xrd_bucket: Bucket,
  creator: ComponentAddress,
  deadline: Option<i64>,
) -> Bucket
```

The badge proof isn't passed! So either:
- ✅ Badge gating is off (fine for public tasks)
- ❌ Or the manifest is incomplete and should include badge in create_task call

---

## Most Likely Root Cause

Based on code analysis, **the most likely culprit is one of these:**

### 1. **Decimal Parsing (HIGH PROBABILITY)**
The wallet rejects the manifest because the amount string is malformed.

**Test:** Check what error message wallet returns. Is it:
- "Invalid Decimal syntax"?
- "Decimal("100.5.5")"? ← Double period after sanitize

**Fix:**
```typescript
function validateDecimal(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) {
    throw new Error("Amount must be positive");
  }
  // Ensure only one decimal point
  return String(Math.floor(num * 1_000_000) / 1_000_000);
}
```

### 2. **Empty Badge Array (MEDIUM PROBABILITY)**
The manifest line `Array<NonFungibleLocalId>()` is syntactically invalid.

**Test:** Try removing the badge proof step entirely:

```typescript
return `
  CALL_METHOD Address("${a}") "withdraw"
    Address("${XRD}") Decimal("${amt}")
  ;
  TAKE_ALL_FROM_WORKTOP Address("${XRD}") Bucket("xrd_payment");
  CALL_METHOD Address("${e}") "create_task"
    Bucket("xrd_payment") Address("${a}") ${deadlineArg}
  ;
  CALL_METHOD Address("${a}") "deposit_batch"
    Expression("ENTIRE_WORKTOP")
  ;`;
```

### 3. **Missing Min Deposit Check (LOW PROBABILITY)**
If `amount < self.min_deposit`, the blueprint will assert.

**Test:** What's the configured min_deposit? Is it > 0?

---

## Recommendations

### Immediate (Quick Fix)
1. **Remove the empty badge proof step** — it's not used by create_task()
2. **Add decimal validation** — ensure amount is a positive, valid Decimal
3. **Add min_deposit check** — warn user if amount is below minimum

### Code Changes

**File:** `guild-app/src/lib/manifests.ts`

```typescript
export function createEscrowTaskManifest(
  escrowComponent: string,
  badgeNft: string,
  account: string,
  amountXrd: string,
  deadline: number | null,
): string {
  const e = validateAddress(escrowComponent, "component_rdx");
  const a = validateAddress(account, "account_rdx");
  
  // ✅ Validate amount is positive decimal
  const num = parseFloat(amountXrd);
  if (isNaN(num) || num <= 0 || !Number.isFinite(num)) {
    throw new Error("Amount must be a positive number");
  }
  // Ensure proper decimal format (max 18 decimals)
  const amt = num.toFixed(18).replace(/0+$/, '').replace(/\.$/, '') || "0";
  
  const deadlineArg = deadline ? `Enum<1u8>(${deadline}i64)` : "Enum<0u8>()";
  
  // ✅ Remove unnecessary badge proof — create_task doesn't check it
  return `CALL_METHOD
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
```

### Long-Term (Architecture)
1. **Add badge validation to create_task()** — or remove it from blueprint entirely
2. **Return detailed error messages** — let wallet error bubble up to UI
3. **Test manifest against testnet first** — dry-run before sending to wallet

---

## Next Steps

To debug further, I need:

1. **Exact wallet error message** — What does the TX rejection say?
2. **TX hash** — If it submitted, I can check what failed on-chain
3. **Amounts being tested** — e.g., 100 XRD, 10 XRD, 0.1 XRD?
4. **Min deposit config** — What's the escrow's min_deposit setting?

**Can you share the error message and I'll pinpoint the exact issue?**

---

## Summary Table

| Component | File | Likely Issue | Confidence |
|-----------|------|--------------|------------|
| Manifest Decimal | manifests.ts:253 | Invalid Decimal syntax | 🔴 HIGH |
| Badge Proof | manifests.ts:248-251 | Unnecessary/empty array | 🟡 MEDIUM |
| Min Deposit | lib.rs:160 | Amount too small | 🟡 MEDIUM |
| Wallet Integration | bounties/[id]/page.tsx:65 | Error not captured | 🟢 LOW |

---

**Status:** Analysis complete. Awaiting error details for final diagnosis.
