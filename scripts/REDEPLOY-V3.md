# Badge Manager v3 Redeployment Guide

## What Changed (v2 → v3)
- **Level names fixed**: `newcomer` → `member`, `trusted` → `steward`
- **Username validation**: empty check + 64 char max on `public_mint`
- WASM: `badge-manager/build/radix_badge_manager_v3.wasm` (232,202 bytes)

## Step 1: Upload WASM Package

Upload via **Radix Dashboard** (https://dashboard.radixdlt.com):
1. Connect wallet (use dApp def account)
2. Deploy Package → select `radix_badge_manager_v3.wasm`
3. Confirm transaction
4. Copy the new **Package Address** → `package_rdx1...`

## Step 2: Instantiate BadgeFactory

Transaction manifest (paste in Radix Dashboard → Send Raw Transaction):

```
CALL_FUNCTION
  Address("PASTE_NEW_PACKAGE_ADDRESS")
  "BadgeFactory"
  "instantiate"
;
```

This returns:
- **Factory Component** → `component_rdx1...`
- **Factory Owner Badge** → bucket deposited to your account

Save both addresses.

## Step 3: Create guild_member Manager

```
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "create_proof_of_amount"
  Address("FACTORY_OWNER_BADGE_RESOURCE")
  Decimal("1")
;
CALL_METHOD
  Address("NEW_FACTORY_COMPONENT")
  "create_manager"
  "guild_member"
  Array<String>("member", "contributor", "builder", "steward", "elder")
  "member"
  true
  "Radix Guild Badge"
  "Community membership badge for Radix Guild governance"
  Address("account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq")
;
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

Note: The factory `create_manager` costs 5 XRD royalty. Returns:
- **Manager Component** → `component_rdx1...`
- **Manager Admin Badge** → bucket deposited to your account
- The manager auto-creates the **Badge NFT Resource** → `resource_rdx1...`

Find the Badge NFT address on the Dashboard by inspecting the Manager component's state.

## Step 4: Create guild_role Manager (Optional — Phase 2)

```
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "create_proof_of_amount"
  Address("FACTORY_OWNER_BADGE_RESOURCE")
  Decimal("1")
;
CALL_METHOD
  Address("NEW_FACTORY_COMPONENT")
  "create_manager"
  "guild_role"
  Array<String>("admin", "moderator", "contributor")
  "contributor"
  false
  "Radix Guild Role"
  "Role badges for Radix Guild moderation and admin"
  Address("account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq")
;
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

## Step 5: Test Mint

```
CALL_METHOD
  Address("NEW_GUILD_MEMBER_MANAGER")
  "public_mint"
  "bigdevxrd"
;
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

## Step 6: Update Config

After deployment, run the address update script:

```bash
node scripts/update-addresses.js \
  --package "package_rdx1..." \
  --factory "component_rdx1..." \
  --manager "component_rdx1..." \
  --badge "resource_rdx1..."
```

Or manually update these files:

| File | What to update |
|------|---------------|
| `bot/services/gateway.js` | BADGE_NFT fallback |
| `guild-app/src/components/Shell.tsx` | BADGE_NFT fallback |
| `guild-app/src/app/page.tsx` | MANAGER fallback |
| `guild-app/src/app/admin/page.tsx` | manager + badge (2 places each) |
| `scripts/pipeline-test.js` | BADGE_NFT + MANAGER |
| `scripts/xp-batch-signer.js` | BADGE_NFT + MANAGER |
| `README.md` | Address table |
| `docs/INFRASTRUCTURE.md` | Address table |

VPS `.env` files:
- `/opt/rad-dao/bot/.env` → `BADGE_NFT=resource_rdx1...`
- `/opt/rad-dao/guild-app/.env.local` → `NEXT_PUBLIC_BADGE_NFT=...`, `NEXT_PUBLIC_MANAGER=...`

## Step 7: Verify

```bash
node scripts/pipeline-test.js
```

## Step 8: Tag Release

```bash
git add -A
git commit -m "deploy: badge manager v3 — fixed levels, username validation"
git tag v0.7.0
git push origin main --tags
```

## Address Tracking

Fill in after each step:

| Asset | v2 (old) | v3 (new) |
|-------|----------|----------|
| Package | `package_rdx1p4hx8r99n3fdf60sa7868tw2p8grq7nar4uycr8nup4f3c7xwy2q90` | |
| Factory | `component_rdx1cz0494dztlww72czpynshpcjvxu3hfnhvemet3ndfunum65z3ewp2h` | |
| Member Manager | `component_rdx1cqarn8x6gk0806qyc9eee4nh6arzkm90xvnk0edqgtcfgghx5m2v2w` | |
| Member Badge NFT | `resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6` | |
| Factory Owner Badge | (not tracked) | |
| Manager Admin Badge | `resource_rdx1t4v0kenpa22tdkvsfz8crmrdfnzg0ad6x2u8f9ak0wk73arlzd6c69` | |
