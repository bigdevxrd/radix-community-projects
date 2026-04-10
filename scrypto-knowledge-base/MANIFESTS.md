# Transaction Manifest Patterns

> Reference for building Radix transaction manifests (RTM format). All our manifest builders live in `guild-app/src/lib/manifests.ts`.

---

## Manifest Basics

Radix transactions are composed of manifest instructions. Each instruction is an atomic operation. The transaction either succeeds entirely or fails entirely (atomic).

Key concepts:
- **Worktop**: Temporary holding area for resources during a transaction
- **Auth Zone**: Stack of proofs used for authorization
- **Buckets**: Named resource containers created during a transaction
- **Proofs**: Cryptographic evidence of resource ownership

---

## Our Manifest Builders (manifests.ts)

### Security: Input Sanitization

All our manifest builders sanitize inputs to prevent manifest injection:

```typescript
function sanitize(val: string): string {
  return val.replace(/["\\\n\r;]/g, "");
}

function validateAddress(addr: string, prefix: string): string {
  if (!addr.match(new RegExp(`^${prefix}[a-z0-9]{20,}`))) {
    throw new Error(`Invalid ${prefix} address`);
  }
  return addr;
}
```

---

## Pattern: Simple Method Call (No Auth)

Call a public method, deposit results.

```
CALL_METHOD
  Address("<component>")
  "public_mint"
  "<username>"
;
CALL_METHOD
  Address("<account>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

**Used by**: `publicMintManifest()` — anyone can mint a badge.

---

## Pattern: Admin Proof + Method Call

Present an admin badge proof, then call a restricted method.

```
CALL_METHOD
  Address("<account>")
  "create_proof_of_amount"
  Address("<admin_badge>")
  Decimal("1")
;
CALL_METHOD
  Address("<component>")
  "mint_badge"
  "<username>"
  "<tier>"
;
CALL_METHOD
  Address("<account>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

**Used by**: `adminMintManifest()`, `updateTierManifest()`, `updateXpManifest()`, `revokeBadgeManifest()`

---

## Pattern: Withdraw + Named Bucket + Method Call

Withdraw resources, name them, pass as method argument.

```
CALL_METHOD
  Address("<account>")
  "withdraw"
  Address("<XRD>")
  Decimal("100")
;
TAKE_ALL_FROM_WORKTOP
  Address("<XRD>")
  Bucket("xrd_payment")
;
CALL_METHOD
  Address("<escrow>")
  "create_task"
  Bucket("xrd_payment")
  Address("<account>")
  Enum<0u8>()
;
CALL_METHOD
  Address("<account>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

**Used by**: `createEscrowTaskManifest()` — fund a task with XRD.

---

## Pattern: NFT Proof + POP_FROM_AUTH_ZONE

Create an NFT proof, pop it to a named variable, pass to method.

```
CALL_METHOD
  Address("<account>")
  "create_proof_of_non_fungibles"
  Address("<badge_nft>")
  Array<NonFungibleLocalId>()
;
POP_FROM_AUTH_ZONE
  Proof("badge_proof")
;
CALL_METHOD
  Address("<escrow>")
  "claim_task"
  1u64
  Address("<account>")
  Proof("badge_proof")
;
```

**Used by**: `claimTaskManifest()`, `submitTaskManifest()`

---

## Pattern: Specific NFT Proof (by ID)

Create proof of a specific NFT (e.g., receipt #1 for task cancellation).

```
CALL_METHOD
  Address("<account>")
  "create_proof_of_non_fungibles"
  Address("<receipt_resource>")
  Array<NonFungibleLocalId>(NonFungibleLocalId("#1#"))
;
POP_FROM_AUTH_ZONE
  Proof("receipt_proof")
;
CALL_METHOD
  Address("<escrow>")
  "cancel_task"
  1u64
  Proof("receipt_proof")
;
CALL_METHOD
  Address("<account>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

**Used by**: `cancelTaskManifest()`

---

## Pattern: CV2 Governance (Complex Tuple Arguments)

```
CALL_METHOD
  Address("<cv2_component>")
  "make_temperature_check"
  Address("<account>")
  Tuple(
    "<title>",
    "<short_description>",
    "<description>",
    Array<Tuple>(Tuple("<option1>"), Tuple("<option2>")),
    Array<String>(),
    Enum<0u8>()
  )
;
CALL_METHOD
  Address("<account>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

**Used by**: `makeTemperatureCheckManifest()`

---

## Pattern: CV2 Voting (Enum Arguments)

```
CALL_METHOD
  Address("<cv2_component>")
  "vote_on_temperature_check"
  Address("<account>")
  1u64
  Enum<0u8>()    // 0u8 = "for", 1u8 = "against"
;
CALL_METHOD
  Address("<account>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

**Used by**: `voteOnTemperatureCheckManifest()`

---

## RTM Type Reference

| RTM Syntax | Rust Type | Example |
|-----------|-----------|---------|
| `Address("...")` | `ComponentAddress`, `ResourceAddress`, `GlobalAddress` | `Address("component_rdx1...")` |
| `Decimal("...")` | `Decimal` | `Decimal("100.5")` |
| `"..."` | `String` | `"hello"` |
| `1u64` | `u64` | `42u64` |
| `1i64` | `i64` | `-100i64` |
| `true` / `false` | `bool` | `true` |
| `Bucket("name")` | `Bucket` | `Bucket("payment")` |
| `Proof("name")` | `Proof` | `Proof("badge_proof")` |
| `Enum<0u8>()` | Enum variant | `Enum<0u8>()` for `None`, `Enum<1u8>(value)` for `Some` |
| `Array<Type>(...)` | `Vec<Type>` | `Array<String>("a", "b")` |
| `Tuple(...)` | Struct fields | `Tuple("field1", 42u64)` |
| `NonFungibleLocalId("#1#")` | `NonFungibleLocalId` (integer) | `NonFungibleLocalId("#1#")` |
| `NonFungibleLocalId("<str>")` | `NonFungibleLocalId` (string) | `NonFungibleLocalId("<guild_alice>")` |
| `Expression("ENTIRE_WORKTOP")` | Special | Deposits everything |

---

## XRD Address Constant

```
resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd
```

This is the XRD resource address on mainnet. Used in manifests for withdraw/deposit operations.

---

## Common Instructions Reference

| Instruction | What It Does |
|------------|-------------|
| `CALL_METHOD addr "method" args...` | Call a method on a component |
| `CALL_FUNCTION pkg "Blueprint" "function" args...` | Call a blueprint function (instantiation) |
| `TAKE_ALL_FROM_WORKTOP addr Bucket("name")` | Take all of a resource from worktop into named bucket |
| `TAKE_FROM_WORKTOP addr Decimal("amt") Bucket("name")` | Take specific amount |
| `POP_FROM_AUTH_ZONE Proof("name")` | Pop top proof from auth zone into named proof |
| `CREATE_PROOF_FROM_AUTH_ZONE_OF_AMOUNT addr Decimal("1") Proof("name")` | Create proof directly |

---

## Frontend Integration (RadixDappToolkit)

```typescript
import { RadixDappToolkit } from "@radixdlt/radix-dapp-toolkit";

const rdt = RadixDappToolkit({ ... });

// Send a transaction
const result = await rdt.walletApi.sendTransaction({
  transactionManifest: publicMintManifest(MANAGER, username, account),
  version: 1,
});
```
