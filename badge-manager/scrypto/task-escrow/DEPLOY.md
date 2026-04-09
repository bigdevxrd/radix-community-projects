# TaskEscrow Deployment Guide

## Prerequisites
- WASM compiled: `target/wasm32-unknown-unknown/release/task_escrow.wasm` (428KB)
- Radix Wallet with admin badge
- Some XRD for transaction fees (~5 XRD)

## Step 1: Upload WASM Package

1. Go to https://dashboard.radixdlt.com
2. Connect your wallet (use the dApp definition account)
3. Deploy Package → select `task_escrow.wasm` from the VPS
4. **Download the WASM first:** `scp guild-vps:/opt/rad-dao/badge-manager/scrypto/task-escrow/target/wasm32-unknown-unknown/release/task_escrow.wasm .`
5. Confirm the transaction
6. Copy the **Package Address** → `package_rdx1...`

## Step 2: Instantiate TaskEscrow

Paste this manifest in Radix Dashboard → Send Raw Transaction.

Replace the placeholders:
- `{PACKAGE}` = the package address from Step 1
- `{ACCOUNT}` = your dApp definition account
- `{ADMIN_BADGE}` = resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe
- `{GUILD_BADGE}` = resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl

```
CALL_FUNCTION
    Address("{PACKAGE}")
    "TaskEscrow"
    "instantiate"
    Decimal("2.5")
    Decimal("1")
    Address("{ADMIN_BADGE}")
    Address("{GUILD_BADGE}")
    Address("{ADMIN_BADGE}")
    Address("{ACCOUNT}")
;
```

Parameters:
- `2.5` = 2.5% platform fee (taken on release, not deposit)
- `1` = minimum 1 XRD deposit (spam prevention)
- First `ADMIN_BADGE` = verifier role (who can release funds)
- `GUILD_BADGE` = required to claim tasks (membership check)
- Second `ADMIN_BADGE` = owner role (admin functions)
- `ACCOUNT` = dApp definition for metadata

## Step 3: Record Addresses

After instantiation, note:
- **TaskEscrow Component** → `component_rdx1...`
- **Receipt NFT Resource** → `resource_rdx1...` (check the transaction details)

## Step 4: Update Code

Run the address updater or manually update:

```bash
# Update constants
# guild-app/src/lib/constants.ts → add ESCROW_COMPONENT
# bot/.env → add ESCROW_COMPONENT and RECEIPT_RESOURCE
```

## Step 5: Test

Fund a small task (1-5 XRD) to verify the full cycle:
1. Create task → receipt NFT appears in your wallet
2. Check escrow stats via API
3. Claim → verify → release
4. Confirm XRD arrives at worker address minus 2.5% fee

## Current Addresses (update after deploy)

| Component | Address |
|-----------|---------|
| TaskEscrow Package | `package_rdx1p5m3z284wgnck2cwqs3nayh74c4qkghjrra76mq0azphxmsnhhcvtl` |
| TaskEscrow Component | `component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r` |
| Receipt NFT Resource | `resource_rdx1thyxus6dhqnd0zs0rvswlxrde3j9rcj8f79f0qsw9vcwf2zxgv6j2r` |
| Admin Badge | resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe |
| Guild Badge NFT | resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl |
