# Radix Guild Infrastructure

## Overview

Everything needed to run the Guild. Designed for handover — any technical person should be able to take this over from this document alone.

## Services

| Service | Location | Port | PM2 Name | Purpose |
|---------|----------|------|----------|---------|
| TG Bot (Rad-DAO) | /opt/rad-dao/bot/ | — | guild-bot | Governance bot: proposals, voting, badges |
| Next.js App | /opt/rad-dao/guild/ | 3002 | guild-app | Badge mint page + admin dashboard |
| Vite Portal | /opt/rad-dao/portal/dist/ | static | Caddy | Legacy portal (being replaced) |
| Postgres | Docker | 5432 | docker | Consultation v2 database (ready, not active) |
| Consultation v2 | /opt/rad-dao/consultation_v2/ | — | — | On-chain governance (cloned, not deployed) |

## VPS Details

| Item | Value |
|------|-------|
| Provider | Hostinger KVM2 |
| IP | 156.67.219.105 |
| SSH | Port 2222, key: id_ed25519_hostinger |
| User | sats |
| OS | Ubuntu |
| Node | v22.22.0 |
| Docker | 29.2.1 |
| Caddy | 2.6.2 |
| PM2 | Installed |
| Cost | ~$14/month |

## Caddy Routes

```
156-67-219-105.sslip.io
  /tv/webhook/*  → localhost:18795 (Sats trading)
  /dao*          → localhost:3002 (Guild Next.js app)
  /guild*        → static files /opt/rad-dao/portal/dist/ (legacy)
  /*             → localhost:3001 (Sats dashboard, basicauth)
```

## Radix Mainnet Addresses

| Entity | Address |
|--------|---------|
| Package (v2, royalties) | package_rdx1p5cs9vt3skd6zyvld9xfe54fqhshnu6zt5demv09l0prrvlqjwzvwu |
| BadgeFactory | component_rdx1crtr4uccyeaccunvyw8nqf6unk2eknkhju4nh00re4mse93l22frmk |
| Guild Member Manager | component_rdx1cz0fkhg86y33afk5jztxeqdxjz6hhzexla7u8fkrwfx5ekn3xdlf3u |
| Guild Role Manager | component_rdx1crh7qlan0yuwrf8wkq7vg7tkrc6w3ftr00qqf4auktqv2uuwwg8lut |
| Member Badge NFT | resource_rdx1ntxy3j2zclysyr99h3ayrvh92h0rhy3tmmwst9j4r8akeaj4u0qcn4 |
| Role Badge NFT | resource_rdx1ntr6ye27zlyg2m06r90cletnwlzpedcv6yl0rhve64pp8prg0tw65e |
| dApp Definition | account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq |

## Wallets

| Wallet | Address | Purpose |
|--------|---------|---------|
| Agent (signer) | account_rdx128lggt503h7m2dhzqnrkkqv4zklxcjmdggr8xxtqy8e47p7fkmd8cx | TX signing, deploys |
| dApp | account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq | dApp definition, ops |

## TG Bot

| Item | Value |
|------|-------|
| Framework | Grammy v1.41.1 |
| Database | SQLite (rad-dao.db) |
| Token | In /opt/rad-dao/bot/.env |
| Commands | /start /register /badge /propose /poll /temp /amend /proposals /results /stats /mint /dao /help |

## How To

### Restart services
```bash
pm2 restart guild-bot
pm2 restart guild-app
```

### Deploy bot update
```bash
cd /opt/rad-dao/bot
# Edit files
pm2 restart guild-bot
```

### Deploy Next.js update
```bash
cd /opt/rad-dao/guild
# Edit files
npm run build
pm2 restart guild-app
```

### Deploy portal update (legacy)
```bash
# Build locally
cd portal && npm run build
# Upload dist
scp -r dist/ sats@156.67.219.105:/opt/rad-dao/portal/dist/
```

### Mint a badge via VPS signer
```bash
cd /opt/sats/engine
node -e "
require('dotenv').config();
const { signAndSubmit, waitForCommit } = require('./src/radix/signer');
const manifest = \`
CALL_METHOD Address(\"account_rdx128lggt...\") \"lock_fee\" Decimal(\"10\");
CALL_METHOD Address(\"component_rdx1cqarn8x...\") \"public_mint\" \"username\";
CALL_METHOD Address(\"account_rdx128lggt...\") \"deposit_batch\" Expression(\"ENTIRE_WORKTOP\");
\`;
signAndSubmit(manifest).then(({intentHash}) => console.log(intentHash));
"
```

### Check bot logs
```bash
pm2 logs guild-bot --lines 50
```

### Backup bot database
```bash
cp /opt/rad-dao/bot/rad-dao.db /opt/rad-dao/bot/rad-dao.db.backup.$(date +%Y%m%d)
```

## GitHub

| Repo | URL |
|------|-----|
| Monorepo | github.com/bigdevxrd/radix-community-projects |
| Old (archived) | github.com/bigdevxrd/sats-badge-factory |

## External Services

| Service | URL | Our Relationship |
|---------|-----|-----------------|
| CrumbsUp | crumbsup.io | Guild DAO created, badge as governance token |
| RadixTalk | radixtalk.com | Discourse forum, need API key for integration |
| Radix Consultation | consultation.radixdlt.com | Foundation voting, v2 cloned locally |

## Monthly Costs

| Item | Cost |
|------|------|
| VPS (Hostinger) | $14 |
| Domain (sslip.io) | $0 |
| Postgres (Docker) | $0 (on VPS) |
| GitHub | $0 |
| **Total** | **$14/month** |

## Handover Checklist

To transfer operations to another person/entity:

- [ ] Share VPS SSH key (id_ed25519_hostinger)
- [ ] Share TG bot token (from .env)
- [ ] Transfer GitHub repo ownership (or add as admin)
- [ ] Transfer Radix Wallet access (agent + dApp wallets)
- [ ] Transfer domain (if using custom domain)
- [ ] Document any environment-specific configs
- [ ] Test all services after transfer
- [ ] Update dApp definition owner if needed
