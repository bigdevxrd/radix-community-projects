# Security Audit — Radix Guild
## Last Updated: April 5, 2026

## Status: HARDENED FOR BETA

### CRITICAL — ALL FIXED

| Issue | Fix | Status |
|-------|-----|--------|
| Manifest injection via username | `sanitize()` strips `" \ \n \r ;` from all manifest params | FIXED |
| Open CORS policy (`*`) | Configurable `CORS_ORIGINS` env var, locked in production | FIXED |
| No API rate limiting | 60 req/min per IP with auto-cleanup | FIXED |
| Postgres exposed to 0.0.0.0 | Bind to 127.0.0.1 in docker-compose | FIXED |

### HIGH — ALL FIXED

| Issue | Fix | Status |
|-------|-----|--------|
| Weak Radix address validation | Regex: `/^account_rdx1[a-z0-9]{40,60}$/` | FIXED |
| No proposal title length limit | 500 char max on /propose and /temp | FIXED |
| Username injection on mint | Client-side: `[a-zA-Z0-9_-]` only | FIXED |
| Address validation in manifests | `validateAddress()` on all manifest params | FIXED |
| XP value manipulation | Forced to non-negative integers | FIXED |
| Bot API bound to all interfaces | Binds to `127.0.0.1` via `API_HOST` env | FIXED |

### MEDIUM — ADDRESSED

| Issue | Fix | Status |
|-------|-----|--------|
| Badge loading silent failure | try/catch with graceful fallback | FIXED |
| PM2 no health checks | Memory limits (500MB), log files configured | FIXED |
| XP spam | Rate limited: 1 reward per action per address per hour | FIXED |
| No API pagination | `?page=&limit=` support on /api/proposals | FIXED |
| Badge query caching | 5-min sessionStorage cache | FIXED |
| DB indexes missing | 5 indexes on hot columns | FIXED |
| Cancelled proposals visible | Active-only default view with archive toggle | FIXED |

### LOW — ACCEPTED RISK

| Issue | Notes |
|-------|-------|
| No database encryption | SQLite plaintext — acceptable for non-sensitive governance data |
| No admin badge pre-check on dashboard | Wallet will reject invalid TX — UX issue not security |
| sslip.io URL | Works with auto-TLS, replaced when domain is set |
| No monitoring/alerting | PM2 logs available, formal monitoring in Phase 4 |

### VERIFIED CLEAN

- No secrets in git repo (scanned all files)
- `.env` files excluded via `.gitignore`
- SSH on non-standard port (2222)
- Caddy handles TLS automatically
- All services run as non-root user
- SQL injection: all queries parameterized (better-sqlite3)
- XSS: React auto-escapes, no `dangerouslySetInnerHTML`
- Scrypto contract: duplicate username prevention (v4)

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| Pipeline (API, routes, Gateway, data) | 19 | PASSING |
| Scrypto (factory, manager, mint, validation) | 11 | PASSING |
| **Total** | **30** | **ALL GREEN** |

## Backup Strategy

- Bot database: `/opt/guild/bot/guild.db`
- Automated daily backup via cron (setup-vps.sh configures this)
- 7-day retention
- Code: GitHub `main` branch + private SaaS fork

## Recommendations for Post-Beta

1. Set production `CORS_ORIGINS` when domain is configured
2. Migrate to dedicated VPS (`setup-vps.sh` ready)
3. Add formal monitoring (PM2 metrics, uptime checks)
4. PostgreSQL migration for 10k+ concurrent users
5. Multi-signer XP pool for scale
