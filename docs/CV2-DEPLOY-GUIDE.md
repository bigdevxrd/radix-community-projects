# CV2 Governance Deployment Guide

Step-by-step guide to deploy the Consultation v2 governance system to Radix mainnet.

## DEPLOYED (April 6, 2026)

| Component | Address |
|-----------|---------|
| Package | `package_rdx1phazm0kmzcfyejp52493zn7zgr5ljymxzvv64rx2u99l93lhtk5dej` |
| Governance | `component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2` |
| Owner Badge | `resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe` |
| Temp Check KVS | `internal_keyvaluestore_rdx1kr6xzh2k70whestr54qzhf6fkxxsmdqhuwm7aenervky3ypphy2x56` |
| Proposals KVS | `internal_keyvaluestore_rdx1kp7elrlp7vfg84gk84kdnt9wem8fy05eghwlsyyz7myrvul4stxptf` |
| Package Deploy TX | `txid_rdx10wdfzwh8p0l28pqxyn4x9yrgqr8dn6lxlzfucmurfzsa8knerlxsnel6rn` |
| VoteDelegation | `component_rdx1cr877kp2s6ggdy6a7hrdczj6g2up6xhg4vd2g2mqr0qwvlrlknk6z2` |
| Instantiate TX | `txid_rdx1vxte6kpafs27w0u6kjdkur97szcgd4whumkuuk80knqjjaupd7asas25nc` |
| VoteDelegation TX | `txid_rdx1agjrq7t0309cxpfkkfz7p4xrkvscmkx8e9gu6tjzgvzau9mp43nq635ttp` |

Governance parameters: temp checks 3 days / 1000 XRD quorum / 50% threshold, proposals 7 days / 5000 XRD quorum / 50% threshold.

---

## Prerequisites (for redeployment or new instances)

- Scrypto CLI v1.3.1 installed on VPS (`scrypto --version`)
- Radix Wallet with XRD for transaction fees
- Access to Radix Dashboard (dashboard.radixdlt.com)

## Step 1: Build WASM on VPS

```bash
ssh guild-vps
cd /opt/consultation_v2/scrypto
source "$HOME/.cargo/env"
scrypto build
```

This produces:
- `target/wasm32-unknown-unknown/release/consultation_blueprint.wasm`
- `target/wasm32-unknown-unknown/release/consultation_blueprint.rpd`

## Step 2: Upload Package via Radix Dashboard

1. Open https://dashboard.radixdlt.com
2. Connect your wallet (the account that will be admin)
3. Go to **Deploy Package**
4. Upload the `.wasm` and `.rpd` files from Step 1
5. Sign the transaction
6. Note the **Package Address** (starts with `package_rdx1...`)

## Step 3: Instantiate Governance Component

Use Radix Dashboard's **Send Raw Transaction** with this manifest:

```
CALL_FUNCTION
  Address("<PACKAGE_ADDRESS>")
  "Governance"
  "instantiate"
  Decimal("3")        # temperature_check_days
  Decimal("1000")     # temperature_check_quorum (XRD)
  Decimal("0.5")      # temperature_check_approval_threshold (50%)
  Decimal("7")        # proposal_length_days
  Decimal("5000")     # proposal_quorum (XRD)
  Decimal("0.5")      # proposal_approval_threshold (50%)
;

CALL_METHOD
  Address("<YOUR_ACCOUNT>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

Note the **Component Address** and **Admin Badge Resource** from the transaction receipt.

## Step 4: Instantiate VoteDelegation Component

```
CALL_FUNCTION
  Address("<PACKAGE_ADDRESS>")
  "VoteDelegation"
  "instantiate"
;

CALL_METHOD
  Address("<YOUR_ACCOUNT>")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

Note the **VoteDelegation Component Address**.

## Step 5: Update Configuration

### Bot (.env on VPS)
```bash
# Add to /opt/rad-dao/.env
CV2_ENABLED=true
CV2_COMPONENT=component_rdx1...  # from Step 3
```

Then restart:
```bash
pm2 restart guild-bot
```

### CV2 Frontend (config.ts)
Update `packages/shared/src/governance/config.ts` in the consultation_v2 repo:
```typescript
// NETWORK_ID = 1 (mainnet)
packageAddress: "package_rdx1...",    // from Step 2
componentAddress: "component_rdx1...", // from Step 3
adminBadge: "resource_rdx1...",       // from Step 3 receipt
xrdAddress: "resource_rdx1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqqqqqatx9jy",
```

## Step 6: Verify

```bash
# Check bot sees the component
curl https://72-62-195-141.sslip.io/api/cv2/status
# Should show: enabled: true, component: "component_rdx1..."

# Force initial sync
# In Telegram: /cv2 sync

# Check sync worked
curl https://72-62-195-141.sslip.io/api/cv2/stats
```

## Step 7: Create First Temperature Check

Use the CV2 frontend or Radix Dashboard to create a temperature check:

1. Open CV2 frontend (when deployed) or use raw transaction
2. Create a temperature check: "Should the Radix Guild adopt CV2 for formal on-chain voting?"
3. Options: For / Against
4. Vote on it to verify the full pipeline

## Governance Parameters (Initial)

| Parameter | Value | Meaning |
|-----------|-------|---------|
| temperature_check_days | 3 | Temp checks run for 3 days |
| temperature_check_quorum | 1000 XRD | Min total XRD to reach quorum |
| temperature_check_approval_threshold | 0.5 | 50% approval to pass |
| proposal_length_days | 7 | Proposals run for 7 days |
| proposal_quorum | 5000 XRD | Higher quorum for formal proposals |
| proposal_approval_threshold | 0.5 | 50% approval to pass |

These can be updated later via the admin badge using `update_governance_parameters`.

## Architecture After Deployment

```
Radix Ledger
  ├── Governance Component (CV2)
  ├── VoteDelegation Component (CV2)
  └── BadgeManager Component (our v4)

Guild VPS
  ├── guild-bot (Grammy) ──reads──> Gateway API ──> CV2 state
  ├── guild-app (Next.js) ──reads──> /api/cv2/*
  └── consultation.js ──polls──> CV2 every 5 min
```

## Rollback

If anything goes wrong:
1. Set `CV2_ENABLED=false` in .env
2. `pm2 restart guild-bot`
3. CV2 tables remain in SQLite but are unused
4. Dashboard shows "On-chain governance coming soon" placeholder
5. On-chain components remain but are dormant
