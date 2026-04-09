# Radix Guild — Inception Guide

How to deploy your own Guild from scratch. This guide takes you from zero to a working badge-gated governance system on Radix mainnet.

## What You Get

- On-chain badge NFTs (Scrypto smart contracts)
- Telegram bot with proposal creation, badge-gated voting, XP rewards
- Web dashboard for badge minting, viewing, and admin
- Public REST API for badge verification
- Automated XP-to-chain pipeline

## Prerequisites

- Radix Wallet (browser extension or mobile)
- XRD for transaction fees (~20 XRD for full deployment)
- VPS (Ubuntu 22.04+, ~$7/month — Hostinger, Hetzner, or similar)
- Telegram bot token (from [@BotFather](https://t.me/BotFather))
- Node.js 22+
- Git

## Step 1: Clone the Repo

```bash
git clone https://github.com/bigdevxrd/radix-community-projects.git
cd radix-community-projects
```

## Step 2: Deploy Smart Contracts

### 2a. Build the WASM + RPD

Scrypto must be built on Linux (Apple Clang doesn't support wasm32 for the blst crate).

```bash
# On your VPS or Linux machine:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Install Scrypto CLI: https://docs.radixdlt.com/docs/getting-rust-scrypto

cd badge-manager/scrypto/radix-badge-manager
scrypto build
```

Output: `target/wasm32-unknown-unknown/release/radix_badge_manager.wasm` + `.rpd`

### 2b. Upload Package

1. Go to [Radix Dashboard](https://dashboard.radixdlt.com)
2. Connect your wallet
3. Deploy Package → select `.wasm` and `.rpd` files
4. Confirm transaction
5. Save the **Package Address**: `package_rdx1...`

### 2c. Instantiate Factory

Send this transaction manifest (Radix Dashboard → Send Raw Transaction):

```
CALL_FUNCTION
  Address("YOUR_PACKAGE_ADDRESS")
  "BadgeFactory"
  "instantiate"
;
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

Save: **Factory Component** + **Factory Owner Badge Resource**

### 2d. Create Badge Manager

```
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "create_proof_of_amount"
  Address("FACTORY_OWNER_BADGE_RESOURCE")
  Decimal("1")
;
CALL_METHOD
  Address("YOUR_FACTORY_COMPONENT")
  "create_manager"
  "guild_member"
  Array<String>("member", "contributor", "builder", "steward", "elder")
  "member"
  true
  "Your Badge Name"
  "Your badge description"
  Address("YOUR_DAPP_DEFINITION_ACCOUNT")
;
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

Costs 5 XRD factory royalty. Save: **Manager Component** + **Admin Badge Resource** + **Badge NFT Resource**

### 2e. Test Mint

```
CALL_METHOD
  Address("YOUR_MANAGER_COMPONENT")
  "public_mint"
  "testuser"
;
CALL_METHOD
  Address("YOUR_ACCOUNT")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
```

Verify the badge appears in your wallet.

## Step 3: Configure

### 3a. Update Addresses

Edit `guild-app/src/lib/constants.ts`:

```typescript
export const DAPP_DEF = "your_dapp_definition_account";
export const MANAGER = "your_manager_component";
export const BADGE_NFT = "your_badge_nft_resource";
export const ADMIN_BADGE = "your_admin_badge_resource";
```

Or use the address update script:

```bash
node scripts/update-addresses.js \
  --package "package_rdx1..." \
  --factory "component_rdx1..." \
  --manager "component_rdx1..." \
  --badge "resource_rdx1..."
```

### 3b. Ecosystem Links

Edit the arrays in `constants.ts` to add your own ecosystem integrations:

```typescript
export const ECOSYSTEM_LINKS: EcosystemLink[] = [
  { name: "Your Forum", desc: "Community discussion", url: "https://...", pill: "g-pill-blue", status: "Active" },
  // Add more...
];
```

## Step 4: Set Up VPS

```bash
# Bootstrap fresh VPS (Node.js, Caddy, UFW, PM2, backups)
ssh root@YOUR_VPS "bash -s" < scripts/setup-vps.sh
```

This installs everything and creates `/opt/guild/` directory structure.

## Step 5: Deploy Bot

```bash
# Copy bot code
scp -r bot/ guild@YOUR_VPS:/opt/guild/bot/

# SSH in and configure
ssh guild@YOUR_VPS
cd /opt/guild/bot
npm install

# Create .env
cat > .env << 'EOF'
TG_BOT_TOKEN=your_token_from_botfather
BADGE_NFT=your_badge_nft_resource
API_HOST=127.0.0.1
API_PORT=3003
EOF

# Start
pm2 start index.js --name guild-bot
pm2 save
```

### Bot Commands Available

| Command | Who | What |
|---------|-----|------|
| /start | Anyone | Welcome message |
| /register `<address>` | Anyone | Link wallet to TG |
| /badge | Registered | Check badge status |
| /propose | Badge holders | Create a proposal |
| /poll | Badge holders | Multi-choice poll |
| /proposals | Anyone | List active proposals |
| /results `<id>` | Anyone | Show vote counts |
| /stats | Anyone | Governance stats |
| /help | Anyone | All commands |

## Step 6: Deploy Dashboard

```bash
# Copy dashboard code
scp -r guild-app/ guild@YOUR_VPS:/opt/guild/dashboard/

# SSH in and configure
ssh guild@YOUR_VPS
cd /opt/guild/dashboard
npm install

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_DAPP_DEF=your_dapp_def
NEXT_PUBLIC_MANAGER=your_manager_component
NEXT_PUBLIC_BADGE_NFT=your_badge_nft_resource
NEXT_PUBLIC_ADMIN_BADGE=your_admin_badge_resource
NEXT_PUBLIC_API_URL=https://your-domain.com/api
EOF

# Build and start
npm run build
pm2 start node_modules/.bin/next --name guild-app -- start --hostname 127.0.0.1 --port 3002
pm2 save
```

## Step 7: Configure Caddy

Edit `/etc/caddy/Caddyfile`:

```
your-domain.com {
  handle /api/* {
    reverse_proxy localhost:3003
  }
  handle /* {
    reverse_proxy localhost:3002
  }
}
```

```bash
sudo systemctl restart caddy
```

## Step 8: Verify

```bash
# Run pipeline tests (from your local machine)
API_URL=https://your-domain.com/api \
GUILD_URL=https://your-domain.com/guild \
node scripts/pipeline-test.js
```

Expected: 19/19 passing.

## Step 9: Invite Community

1. Share the TG bot link
2. Share the dashboard URL
3. Create your first proposal via `/propose`
4. Watch the votes come in

## Architecture

```
Internet
  → Caddy (443, auto-TLS)
    → /api/*  → Bot REST API (port 3003)
    → /*      → Next.js Dashboard (port 3002)

TG Bot ← Grammy → SQLite (proposals, votes, XP)
                 → Radix Gateway API (badge verification)

Dashboard ← React → Radix dApp Toolkit (wallet connect)
                   → Radix Gateway API (badge data)
                   → Bot API (proposals, stats)

On-chain:
  BadgeFactory → creates BadgeManagers
  BadgeManager → mints/manages badge NFTs
  Badge NFT   → UniversalBadgeData (tier, XP, level, status)
```

## Costs

| Item | Cost |
|------|------|
| VPS | ~$7/month |
| Domain | ~$12/year |
| Smart contract deploy | ~20 XRD one-time |
| Badge minting | Free (public_mint) or 1 XRD (admin_mint) |
| **Total to start** | **~$10 + 20 XRD** |

## What's Next

After your Guild is running:
- Create governance proposals for your community
- Award XP for participation
- Add ecosystem integrations in constants.ts
- Customize badge tiers and schemas
- Fork and extend the Scrypto blueprints

## Support

- [GitHub Issues](https://github.com/bigdevxrd/radix-community-projects/issues)
- [CONTRIBUTING.md](../CONTRIBUTING.md) — how to contribute
- [HANDOVER.md](HANDOVER.md) — operational transfer guide
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) — current deployment details
