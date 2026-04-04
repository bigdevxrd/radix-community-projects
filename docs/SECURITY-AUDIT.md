# Security Audit — April 4, 2026

## Findings

### CRITICAL
- **Postgres port 5432 exposed to 0.0.0.0** — anyone can connect. Should be localhost only.
  - Fix: bind to 127.0.0.1 in docker-compose.yml
- **Caddy basicauth password hash visible** in Caddyfile — not a secret leak (bcrypt hash) but noted.

### MEDIUM
- **Port 3002 (guild-app) bound to all interfaces** — accessible without Caddy. Should be localhost.
- **Port 3003 (bot API) bound to all interfaces** — accessible without Caddy. Should be localhost.
- **Bot has restarted 26 times** — indicates instability during development. Monitor going forward.

### LOW
- **No rate limiting on API endpoints** — could be DoS'd. Add later.
- **No authentication on /api/* endpoints** — public read-only is fine for now.
- **No database encryption** — SQLite is plaintext. Acceptable for non-sensitive data.

### CLEAN
- No secrets in git repo (scanned)
- .env files contain only tokens, not in git
- SSH on non-standard port (2222)
- Caddy handles TLS automatically
- All services run as non-root user (sats)

## Immediate Fixes

### 1. Lock down Postgres
```yaml
# docker-compose.yml — change ports binding
ports:
  - "127.0.0.1:5432:5432"
```

### 2. Lock down guild-app and bot API
Both Next.js and the API server should bind to localhost. Caddy reverse-proxies to them.

## Backup Status

| Item | Location | Last Backup |
|------|----------|-------------|
| Bot database | /opt/rad-dao/bot/backups/ | 2026-04-04 |
| Bot code | GitHub (latest commit) | Current |
| Scrypto code | GitHub | Current |
| Portal code | GitHub | Current |

## Recommended: Automated Backups

Add cron job for daily database backup:
```bash
# Add to crontab
0 3 * * * cp /opt/rad-dao/bot/rad-dao.db /opt/rad-dao/bot/backups/rad-dao.db.$(date +\%Y\%m\%d)
# Keep last 7 days
0 4 * * * find /opt/rad-dao/bot/backups -name "*.db.*" -mtime +7 -delete
```
