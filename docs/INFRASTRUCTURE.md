# Radix Guild Infrastructure

## Overview

Everything needed to run the Guild. Designed for handover — any technical person should be able to take this over from this document alone. See also: [HANDOVER.md](HANDOVER.md) for the transfer procedure.

## Architecture

```
Internet → Caddy (443) → guild-bot (3003/localhost) — TG bot + REST API
                        → guild-app (3002/localhost) — Next.js dashboard
```

All services bind to localhost. Only Caddy faces the internet.

## Services

| Service | Location | Port | PM2 Name | Purpose |
|---------|----------|------|----------|---------|
| TG Bot + API | /opt/guild/bot/ | 3003 | guild-bot | Governance bot, proposals, voting, badges, Badge API |
| Next.js Dashboard | /opt/guild/dashboard/ | 3002 | guild-app | Badge mint, viewer, admin panel |

## VPS Details

| Item | Value |
|------|-------|
| Provider | Hostinger |
| SSH | Port 2222, user: guild |
| OS | Ubuntu 22.04+ |
| Node | v22 |
| Caddy | Latest stable |
| PM2 | Latest stable |
| Firewall | UFW (2222, 80, 443 only) |
| fail2ban | SSH protection |
| Cost | ~$7/month |

## Caddy Routes

```
DOMAIN.sslip.io {
  /api/*  → localhost:3003 (Bot REST API)
  /*      → localhost:3002 (Dashboard)
}
```

Domain will be added later — Caddy config is one-line change.

## Radix Mainnet Addresses (v3)

| Entity | Address |
|--------|---------|
| Package (v3) | `package_rdx1phm53al5ztrfw8k5wa3qc5pllwfyeqgl4spjcy83ymgw8jhngx7vu3` |
| BadgeFactory | `component_rdx1cqxdsz6d3zjsjx7shk2fgg8dazmrknygvqsa4943yw0yz4e69taxhg` |
| Guild Member Manager | `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva` |
| Member Badge NFT | `resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl` |
| Admin Badge | `resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe` |
| Factory Owner Badge | `resource_rdx1tkqdakq9szr569urg42rh9p2matythftz8fm4yg9gwqvr69hlvlrhs` |
| dApp Definition | `account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq` |

## Wallets

| Wallet | Address | Purpose |
|--------|---------|---------|
| Agent (signer) | `account_rdx128lggt503h7m2dhzqnrkkqv4zklxcjmdggr8xxtqy8e47p7fkmd8cx` | TX signing, deploys |
| dApp | `account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq` | dApp definition |

## TG Bot

| Item | Value |
|------|-------|
| Bot | @rad_gov |
| Framework | Grammy v1.41.1 |
| Database | SQLite (guild.db) |
| Token | In /opt/guild/bot/.env |
| Commands | /start /register /badge /propose /poll /temp /amend /cancel /proposals /results /history /stats /dao /help /source /charter /mvd /wiki /talk |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/proposals | GET | All proposals with vote counts |
| /api/proposals?status=active | GET | Active proposals only |
| /api/proposals/:id | GET | Single proposal detail |
| /api/stats | GET | Totals: proposals, voters, active, pending XP |
| /api/xp-queue | GET | Pending XP rewards |
| /api/badge/:address | GET | Full badge data for an address |
| /api/badge/:address/verify | GET | Quick hasBadge true/false |

## Dashboard Pages

| Route | Purpose |
|-------|---------|
| /guild | Dashboard — badge card, tier progression, ecosystem |
| /guild/mint | Public mint — username input, free badge |
| /guild/proposals | Live proposal viewer |
| /guild/admin | Badge lookup + admin actions (tier, XP, revoke) |

## Deploy

```bash
./scripts/deploy.sh all        # Sync + build + restart everything
./scripts/deploy.sh bot        # Bot only
./scripts/deploy.sh dashboard  # Dashboard only
```

## Common Operations

```bash
# Restart
pm2 restart all
pm2 restart guild-bot
pm2 restart guild-app

# Logs
pm2 logs guild-bot --lines 50
pm2 logs guild-app --lines 20

# Monitor
pm2 monit

# Status
pm2 list
```

## Backups

- **Location:** /opt/guild/backups/
- **Schedule:** Daily at 3am UTC
- **Retention:** 7 days
- **Contents:** SQLite database + .env files

## Pipeline Tests

```bash
node scripts/pipeline-test.js
```

19 tests covering: API endpoints, dashboard routes, Gateway on-chain checks, Badge API, data integrity.

## External Integrations

| Service | URL | Status |
|---------|-----|--------|
| CrumbsUp | crumbsup.io | Guild DAO active |
| RadixTalk | radixtalk.com | Linked (API needs Pro plan) |
| Consultation v2 | consultation.radixdlt.com | Parked |

## Monthly Costs

| Item | Cost |
|------|------|
| VPS (Hostinger) | ~$7 |
| Domain (later) | ~$1 |
| **Total** | **~$8/month** |
