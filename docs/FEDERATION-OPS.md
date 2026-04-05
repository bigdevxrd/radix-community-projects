# Operating Federated Radix Governance

This runbook covers deployment, monitoring, and incident response for the federated Radix governance system (Guild ↔ CV2 ↔ CrumbsUp).

---

## Architecture Overview

```
Telegram Bot (grammy)
    │
    ├── SQLite DB (guild.db)
    ├── HTTP API (port 3003)
    │       ├── /api/proposals/*
    │       ├── /api/cv2/*           ← CV2 federation
    │       ├── /api/crumbsup/*      ← CrumbsUp federation
    │       ├── /api/federation/*    ← Combined health + data
    │       ├── /api/webhooks/cv2    ← Receives CV2 events
    │       └── /api/webhooks/crumbsup ← Receives CrumbsUp events
    │
    ├── bot/services/consultation.js ← CV2 API client
    └── bot/services/crumbsup.js     ← CrumbsUp API client

Next.js Dashboard
    ├── /admin/federation    ← Federation sync status (admin)
    └── /analytics/federation ← Cross-platform metrics (public)
```

---

## Pre-Deployment Checklist

- [ ] Register API keys (CV2, CrumbsUp)
- [ ] Set up VPS with SSL (required for webhook endpoints)
- [ ] Configure environment variables (see `.env.example`)
- [ ] Test webhook signatures locally
- [ ] Configure rate limits (`API_PORT`, `CORS_ORIGINS`)
- [ ] Set up database backups (`BOT_DB_PATH`)
- [ ] Configure `ADMIN_API_KEY` for protected endpoints
- [ ] Set up monitoring (see Monitoring section)
- [ ] Test bot token and Telegram chat access

---

## Deployment

### 1. Bot Service

```bash
cd bot/
npm install

# Configure environment
cp ../.env.example .env
# Edit .env: TG_BOT_TOKEN, BADGE_RESOURCE, BADGE_MANAGER, etc.

# Start with PM2 (recommended for production)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Or start directly
node index.js
```

### 2. Register Webhooks

After bot is running and API is accessible:

**CV2 webhook:**
```bash
curl -X POST https://api.consultation.radix.network/v2/webhooks \
  -H "X-Api-Key: $CV2_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-api.example.com/api/webhooks/cv2", "events": ["vote_cast", "proposal_status_changed"]}'
```

**CrumbsUp webhook:**
```bash
curl -X POST https://api.crumbsup.io/daos/$CRUMBSUP_DAO_ID/webhooks \
  -H "X-Api-Key: $CRUMBSUP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-api.example.com/api/webhooks/crumbsup", "events": ["vote_cast", "delegation_changed", "member_joined"]}'
```

### 3. Dashboard

```bash
cd guild-app/
npm install
cp .env.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL, badge addresses, etc.

# Deploy to Vercel
vercel deploy --prod

# Or build + serve manually
npm run build
npm start
```

### 4. Run Integration Tests

```bash
# Smoke test all federation endpoints
node scripts/integration-test-federation.js --api=https://your-api.example.com

# Or against local
node scripts/integration-test-federation.js --api=http://localhost:3003
```

---

## Monitoring

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| CV2 sync latency | < 30s | > 60s |
| CrumbsUp sync success rate | > 99% | < 95% |
| Vote count discrepancy | < 1% | > 2% |
| API error rate | < 0.1% | > 1% |
| API p99 response time | < 500ms | > 1000ms |
| DB size | Monitor | > 1GB |

### Health Check Endpoint

Poll `/api/federation/health` every minute:

```bash
curl https://your-api.example.com/api/federation/health
# Expected:
# {"ok":true,"data":{"cv2_api":"ok","crumbsup_api":"ok","gateway_api":"ok","db":"ok"}}
```

### Log Patterns to Watch

```bash
# CV2 sync errors
grep "\[CV2\]" /var/log/guild-bot.log | grep -v "200 OK"

# CrumbsUp errors
grep "\[CrumbsUp\]" /var/log/guild-bot.log | grep -v "200 OK"

# Webhook signature failures
grep "invalid_signature" /var/log/guild-bot.log

# Auto-close failures
grep "\[AutoClose\] Background task failed" /var/log/guild-bot.log

# DB errors
grep "SQLITE_" /var/log/guild-bot.log
```

### PM2 Monitoring

```bash
pm2 status          # Service status
pm2 logs            # Live logs
pm2 monit           # CPU + memory dashboard
```

---

## Incident Response

### CV2 Sync Stuck

**Symptoms:** Proposals not appearing in CV2, `/api/cv2/status` shows `sync_health: "degraded"`

**Diagnosis:**
```bash
# Check CV2 API connectivity
curl -H "X-Api-Key: $CV2_API_KEY" https://api.consultation.radix.network/v2/health

# Check sync log
sqlite3 bot/guild.db "SELECT * FROM cv2_vote_sync ORDER BY synced_at DESC LIMIT 10;"
```

**Recovery:**
1. If CV2 API is down — wait and retry
2. Manually re-sync specific proposals: `POST /api/cv2/sync/:id` (admin key required)
3. Use Telegram bot: `/cv2 sync <id>`
4. If persistent, escalate to CV2 team

---

### Vote Count Mismatch

**Symptoms:** Guild vote counts differ from CV2/CrumbsUp by > 1%

**Diagnosis:**
```bash
# Compare proposal vote counts
curl https://your-api.example.com/api/proposals/PROPOSAL_ID
curl https://your-api.example.com/api/cv2/proposals/PROPOSAL_ID

# Check webhook delivery
# Review CrumbsUp/CV2 webhook logs for delivery failures
```

**Recovery:**
1. Force retally: `POST /api/cv2/tally/:id` (admin key required)
2. Verify webhook is receiving updates: check `/api/webhooks/cv2` logs
3. Manual recount: query `votes` table directly

---

### Webhook Signature Invalid

**Symptoms:** Webhooks returning 401, events not processed

**Diagnosis:**
```bash
# Test webhook signature
node -e "
const crypto = require('crypto');
const secret = process.env.CRUMBSUP_WEBHOOK_SECRET;
const payload = '{\"type\":\"test\"}';
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log(sig);
"
```

**Recovery:**
1. Rotate webhook secrets in both platform dashboards and `.env`
2. Redeploy bot service: `pm2 restart guild-bot`
3. Re-register webhooks with new secrets

---

### Member Not Synced to CrumbsUp

**Symptoms:** User has XP but no CrumbsUp reputation score

**Diagnosis:**
```bash
# Check member in DB
sqlite3 bot/guild.db "SELECT * FROM crumbsup_members WHERE radix_address = 'account_rdx1...';"
```

**Recovery:**
1. Admin command: `/crumbsup sync-member <address>` (via API)
2. Or API endpoint: `POST /api/crumbsup/sync-member/:address` (admin key)
3. Check Radix gateway connectivity if badge data unavailable

---

### High API Error Rate

**Symptoms:** `/api/stats` returning errors, dashboard showing connection failures

**Diagnosis:**
```bash
pm2 logs guild-bot --lines 100
curl http://localhost:3003/api/stats
```

**Recovery:**
1. Restart bot: `pm2 restart guild-bot`
2. Check port conflicts: `lsof -i :3003`
3. Check DB file permissions: `ls -la bot/guild.db`
4. Restore from backup if DB is corrupt

---

## Database Maintenance

### Backups

Set up daily automated backups:

```bash
# Add to crontab
0 2 * * * sqlite3 /path/to/bot/guild.db ".backup /backups/guild-$(date +%Y%m%d).db"

# Rotate backups (keep 30 days)
find /backups/ -name "guild-*.db" -mtime +30 -delete
```

### Integrity Check

```bash
sqlite3 bot/guild.db "PRAGMA integrity_check;"
sqlite3 bot/guild.db "PRAGMA foreign_key_check;"
```

### Useful Queries

```sql
-- Federation sync summary
SELECT
  COUNT(*) AS total,
  SUM(cv2_synced) AS cv2_synced,
  SUM(crumbsup_synced) AS crumbsup_synced
FROM proposals;

-- Recent CV2 sync log
SELECT * FROM cv2_vote_sync ORDER BY synced_at DESC LIMIT 20;

-- Recent CrumbsUp events
SELECT * FROM crumbsup_sync_log ORDER BY synced_at DESC LIMIT 20;

-- Members with CrumbsUp accounts
SELECT radix_address, crumbsup_user_id, xp_score, reputation_score
FROM crumbsup_members ORDER BY xp_score DESC LIMIT 20;
```

---

## Scaling Notes

- **SQLite is sufficient** for up to ~10k proposals and ~50k votes
- For larger scale, migrate to PostgreSQL by swapping `better-sqlite3` for `pg`
- Rate limiter is in-memory — for multi-process deployments, use Redis
- API runs single-threaded — for high traffic, add nginx reverse proxy with clustering
- Webhook processing is synchronous — for high volume, add a job queue (Bull/BullMQ)

---

## Security Checklist

- [ ] `ADMIN_API_KEY` set and not exposed in client code
- [ ] `CV2_WEBHOOK_SECRET` set (validates incoming webhook signatures)
- [ ] `CRUMBSUP_WEBHOOK_SECRET` set (HMAC-SHA256 validation enabled)
- [ ] SSL/TLS enabled on webhook endpoint URL
- [ ] `CORS_ORIGINS` set to your dashboard domain (not `*`)
- [ ] Database file permissions restricted (`chmod 600 guild.db`)
- [ ] `.env` not committed to git (verify with `git status`)
- [ ] Bot token never logged or exposed

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `TG_BOT_TOKEN` | ✅ | Telegram bot token from @BotFather |
| `BADGE_RESOURCE` | ✅ | NFT resource address on Radix |
| `BADGE_MANAGER` | ✅ | Badge manager component address |
| `RADIX_GATEWAY_URL` | ✅ | Radix gateway URL |
| `API_PORT` | ⬜ | API port (default: 3003) |
| `ADMIN_API_KEY` | ⬜ | Key for protected admin endpoints |
| `BOT_API_URL` | ⬜ | Public URL of this API (for webhook registration) |
| `CORS_ORIGINS` | ⬜ | Comma-separated allowed CORS origins |
| `CV2_API_URL` | ⬜ | CV2 API base URL |
| `CV2_API_KEY` | ⬜ | CV2 API key |
| `CV2_WEBHOOK_SECRET` | ⬜ | CV2 webhook signature secret |
| `CRUMBSUP_API_URL` | ⬜ | CrumbsUp API base URL |
| `CRUMBSUP_API_KEY` | ⬜ | CrumbsUp API key |
| `CRUMBSUP_WEBHOOK_SECRET` | ⬜ | CrumbsUp webhook secret (HMAC-SHA256) |
| `CRUMBSUP_DAO_ID` | ⬜ | Your DAO ID on CrumbsUp |
| `PORTAL_URL` | ⬜ | Dashboard URL (shown in bot messages) |
| `BOUNTY_NOTIFY_CHAT_ID` | ⬜ | Chat for daily bounty summary |

---

*Last updated: 2026 — Radix Guild Governance v4*
