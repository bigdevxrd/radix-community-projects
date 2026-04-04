# Radix Guild — Handover Guide

This document covers everything needed to transfer operational control of the Radix Guild to a new custodian or committee.

## What Gets Transferred

| Asset | Where | How |
|-------|-------|-----|
| VPS access | Hostinger hpanel | Transfer account or share SSH key |
| TG bot token | `/opt/guild/bot/.env` | BotFather → revoke + reissue |
| GitHub repo | github.com/bigdevxrd/radix-community-projects | Transfer ownership or add admin |
| Radix wallets | Radix Wallet app | Export + import mnemonic/keys |
| Domain (when added) | Registrar | Transfer domain |

## VPS Access

**Provider:** Hostinger (hpanel.hostinger.com)
**SSH:** `ssh -p 2222 guild@VPS_IP`
**Key:** `~/.ssh/id_ed25519_guild` (ed25519)

The VPS runs Ubuntu with:
- **Caddy** (ports 80/443) — reverse proxy, auto TLS
- **PM2** — process manager for bot + dashboard
- **UFW** — firewall (only 2222, 80, 443 open)
- **fail2ban** — SSH brute force protection

## Services

| Service | Path | PM2 Name | Port |
|---------|------|----------|------|
| TG Bot + API | /opt/guild/bot/ | guild-bot | 3003 (localhost) |
| Dashboard | /opt/guild/dashboard/ | guild-app | 3002 (localhost) |

**Start all:** `pm2 start /opt/guild/ecosystem.config.js`
**Restart:** `pm2 restart all`
**Logs:** `pm2 logs guild-bot --lines 50`
**Monitor:** `pm2 monit`

## Environment Variables

### Bot (`/opt/guild/bot/.env`)
```
TG_BOT_TOKEN=...          # From BotFather
BADGE_NFT=resource_rdx1...  # Badge NFT resource address
API_HOST=127.0.0.1        # Bind to localhost (Caddy proxies)
API_PORT=3003
DISCOURSE_URL=https://radix-guild.discourse.group
DISCOURSE_API_KEY=         # Empty until Pro plan
```

### Dashboard (`/opt/guild/dashboard/.env.local`)
```
NEXT_PUBLIC_DAPP_DEF=account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq
NEXT_PUBLIC_RADIX_NETWORK=mainnet
NEXT_PUBLIC_MANAGER=component_rdx1cz0fkhg86y33afk5jztxeqdxjz6hhzexla7u8fkrwfx5ekn3xdlf3u
NEXT_PUBLIC_BADGE_NFT=resource_rdx1ntxy3j2zclysyr99h3ayrvh92h0rhy3tmmwst9j4r8akeaj4u0qcn4
```

## On-Chain Addresses

| Entity | Address |
|--------|---------|
| Package (v3) | `package_rdx1p5cs9vt3skd6zyvld9xfe54fqhshnu6zt5demv09l0prrvlqjwzvwu` |
| BadgeFactory | `component_rdx1crtr4uccyeaccunvyw8nqf6unk2eknkhju4nh00re4mse93l22frmk` |
| Guild Member Manager | `component_rdx1cz0fkhg86y33afk5jztxeqdxjz6hhzexla7u8fkrwfx5ekn3xdlf3u` |
| Member Badge NFT | `resource_rdx1ntxy3j2zclysyr99h3ayrvh92h0rhy3tmmwst9j4r8akeaj4u0qcn4` |
| Admin Badge | `resource_rdx1t4qyd9hwyk6rpt4006fysaw68lkuy7almctwppvw7j9m8cqvzgn6ea` |
| Factory Owner Badge | `resource_rdx1tkqdakq9szr569urg42rh9p2matythftz8fm4yg9gwqvr69hlvlrhs` |
| dApp Definition | `account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq` |

**Important:** The admin badge and factory owner badge are held in the dApp definition wallet. Whoever controls this wallet controls badge minting, tier updates, and XP awards.

## Deploy Workflow

```bash
# From local machine (after cloning the repo)
./scripts/deploy.sh all      # Sync bot + dashboard, build, restart
./scripts/deploy.sh bot       # Bot only
./scripts/deploy.sh dashboard # Dashboard only
```

Requires SSH config entry `guild-vps`:
```
Host guild-vps
    HostName VPS_IP
    User guild
    Port 2222
    IdentityFile ~/.ssh/id_ed25519_guild
```

## Backups

**Location:** `/opt/guild/backups/`
**Schedule:** Daily at 3am UTC (cron)
**Retention:** 7 days
**What's backed up:** SQLite database, .env files

**Restore from backup:**
```bash
pm2 stop guild-bot
cp /opt/guild/backups/rad-dao-YYYYMMDD.db /opt/guild/bot/rad-dao.db
pm2 start guild-bot
```

## Verification

After any transfer, run the pipeline test to confirm everything works:

```bash
node scripts/pipeline-test.js
```

Expected: 19/19 tests passing.

Also verify manually:
- [ ] TG bot responds to /help in group
- [ ] Dashboard loads (connect wallet, see badge)
- [ ] /guild/mint page works
- [ ] /guild/admin badge lookup works
- [ ] Badge API: `curl https://DOMAIN/api/badge/ACCOUNT/verify`

## Emergency Procedures

**Bot unresponsive:**
```bash
ssh guild-vps "pm2 restart guild-bot && pm2 logs guild-bot --lines 20"
```

**Dashboard down:**
```bash
ssh guild-vps "pm2 restart guild-app && pm2 logs guild-app --lines 20"
```

**Full restart:**
```bash
ssh guild-vps "pm2 restart all"
```

**Rollback code:**
```bash
ssh guild-vps "cd /opt/guild/bot && git log --oneline -5"  # find good commit
ssh guild-vps "cd /opt/guild/bot && git checkout COMMIT_HASH"
ssh guild-vps "pm2 restart guild-bot"
```

**TG bot token compromised:**
1. Message @BotFather → /revoke
2. Generate new token → /token
3. Update `/opt/guild/bot/.env`
4. `pm2 restart guild-bot`

## Transfer Checklist

### Before Transfer
- [ ] All 19 pipeline tests pass
- [ ] Backups are running (check `/opt/guild/backups/`)
- [ ] New custodian has Hostinger account access
- [ ] New custodian has SSH key added to VPS
- [ ] New custodian has GitHub repo admin access

### During Transfer
- [ ] Share Radix wallet mnemonic/keys (dApp def + agent wallets)
- [ ] Transfer TG bot token (revoke old, issue new, update .env)
- [ ] Transfer domain registrar access (when applicable)
- [ ] New custodian runs pipeline test from their machine

### After Transfer
- [ ] Old custodian removes SSH keys from VPS
- [ ] Old custodian deletes local wallet keys
- [ ] Community publishes transfer announcement
- [ ] Monitor 24h for stability

## Monthly Costs

| Item | Cost |
|------|------|
| VPS (Hostinger) | ~$7/month |
| Domain (when added) | ~$12/year |
| **Total** | **~$8/month** |
