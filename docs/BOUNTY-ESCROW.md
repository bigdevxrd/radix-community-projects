# Bounty Escrow Security Model

## Overview

Bounty rewards are held in a dedicated escrow wallet on the Radix Network. Funds are locked until admin approval, ensuring fair and auditable payment flow.

## Architecture

```
Admin deposits XRD → Escrow Wallet (locked on-chain)
         ↓
Bounties created → reward_xrd tracked in DB
         ↓
Community claims & submits work
         ↓
Admin approves → status = 'approved'
         ↓
Batch payer script signs XRD release → Escrow → Claimer
         ↓
TX hash logged → status = 'paid' → TG notification
```

## Escrow Wallet Table

The `escrow_wallet` table tracks the wallet used to hold bounty funds:

```sql
CREATE TABLE escrow_wallet (
  id         INTEGER PRIMARY KEY,
  address    TEXT NOT NULL,     -- Radix wallet address
  balance_xrd REAL DEFAULT 0,  -- Total XRD deposited
  locked_xrd  REAL DEFAULT 0,  -- XRD committed to open bounties
  updated_at INTEGER
);
```

**balance_xrd** — total XRD deposited into the escrow wallet.  
**locked_xrd** — XRD committed to open/claimed bounties (should match sum of `reward_xrd` for open+claimed bounties).

The escrow address is configured by the admin and is separate from any admin personal wallet.

## Audit Trail

Every state change is recorded in `bounty_transactions`:

```sql
SELECT bt.*, b.title, b.reward_xrd
FROM bounty_transactions bt
JOIN bounties b ON bt.bounty_id = b.id
ORDER BY bt.created_at;
```

Actions logged:
| action | when |
|--------|------|
| `created` | Bounty created |
| `claimed` | Bounty claimed by community member |
| `submitted` | Work submitted |
| `approved` | Admin approved work |
| `paid` | XRD sent — includes `tx_hash` and `amount_xrd` |

## Payment Flow (Phase 3: Batch Payer)

The batch payer script (implemented in Phase 3) will:

1. Query `GET /api/bounties/pending-payment` for all approved bounties
2. Build a Radix transaction with multiple XRD transfers
3. Sign with the escrow wallet's key
4. Submit to the Radix Gateway
5. Call `markBountyPaid(id, txHash)` for each paid bounty

This keeps signing keys off the server — the batch payer runs as a separate, air-gapped or hardware-secured process.

## Security Principles

- **Separation of concerns**: Escrow wallet ≠ admin wallet ≠ bot operational wallet
- **Minimum viable trust**: Bot only records approvals; it never signs transactions in Phase 1
- **Full audit trail**: Every state change is immutable in `bounty_transactions`
- **Admin-gated approval**: Payment requires explicit admin action (`approveBountyPayment`)
- **No auto-payment**: Funds are only released after both admin approval AND manual signing (Phase 3)

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Duplicate payment | `markBountyPaid` checks `status === 'approved'` before updating |
| Claim by non-member | Guild badge verified on-chain via Radix Gateway before claim |
| Self-claim | Creator address checked against claimer address |
| Expired bounty claim | `expires_at` checked in `claimBounty()` |
| Over-commitment | Admins should verify escrow balance before creating bounties |

## Phase 2 & 3 Notes

- **Phase 2**: CrumbsUp integration — bounty creation auto-posts to CrumbsUp platform
- **Phase 3**: Batch payer script — signs and submits XRD transactions from escrow wallet
