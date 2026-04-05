# INCIDENTS.md — Failure Scenarios & Recovery

Quick reference for the most common failure modes. For each: root cause, how to confirm, and recovery steps.

---

## Incident 1: Bot Crash / Won't Respond

### Symptoms
- No response to Telegram commands
- PM2 shows `bot` process as `errored` or `stopped`
- API endpoints return connection refused

### Root Causes
- Unhandled JavaScript exception (check logs)
- `BOT_TOKEN` invalid or revoked
- Out of memory on VPS
- SQLite file permissions changed

### Diagnosis

```bash
pm2 status          # Is bot running?
pm2 logs bot --lines 50  # What's the last error?
```

### Recovery

```bash
# 1. Check the error
pm2 logs bot --lines 100 | grep -i "error\|exception\|fatal"

# 2. Restart
pm2 restart bot

# 3. If it keeps crashing — check token
curl "https://api.telegram.org/bot${BOT_TOKEN}/getMe"
# → Should return {"ok":true,...}

# 4. If token is invalid — get new token from @BotFather
# Update BOT_TOKEN in bot/.env, then:
pm2 restart bot
```

**If memory is the issue:**
```bash
free -h              # Check available memory
pm2 restart bot      # Clears memory leak
# Long-term: upgrade VPS or add swap
```

---

## Incident 2: Database Corruption

### Symptoms
- `SQLITE_CORRUPT: file is not a database`
- `SQLITE_BUSY: database is locked` repeatedly
- Bot starts but commands fail with DB errors

### Root Causes
- Server crashed mid-write (power loss, OOM kill)
- Two bot instances writing simultaneously
- Disk full during write

### Diagnosis

```bash
sqlite3 bot/guild.db "PRAGMA integrity_check;"
# → "ok" means healthy; any other output = corruption

# Check for duplicate processes
ps aux | grep "node index.js"
```

### Recovery

**If WAL file recoverable:**
```bash
pm2 stop bot
sqlite3 bot/guild.db "PRAGMA wal_checkpoint(TRUNCATE);"
sqlite3 bot/guild.db "PRAGMA integrity_check;"
pm2 start bot
```

**If corrupted — restore from backup:**
```bash
pm2 stop bot

# List backups
ls -lht bot/guild.db.bak-*

# Restore most recent
cp bot/guild.db.bak-YYYYMMDD-HHMMSS bot/guild.db

pm2 start bot

# Verify
curl http://localhost:3003/api/stats
```

**If no backup exists:**
> ⚠️ Data loss is likely. You can recreate the schema (tables only) by deleting `guild.db` and restarting the bot. Proposal history and votes will be lost. Users will need to re-register with `/start`.

```bash
pm2 stop bot
rm bot/guild.db
pm2 start bot
# → bot re-creates all tables from init()
```

**Prevent recurrence:** Set up automated daily backups:
```bash
# Add to crontab: crontab -e
0 3 * * * cp /path/to/bot/guild.db /path/to/bot/backups/guild.db.$(date +\%Y\%m\%d) && find /path/to/bot/backups -name "*.db.*" -mtime +7 -delete
```

---

## Incident 3: API Down (Dashboard Shows No Data)

### Symptoms
- Dashboard loads but all sections are empty or show loading spinners
- Browser console shows `fetch failed` or CORS errors
- `curl http://localhost:3003/api/stats` times out

### Root Causes
- Bot process not running (API is embedded in the bot)
- Reverse proxy (nginx/Caddy) misconfigured
- `API_HOST` set to `127.0.0.1` but accessed externally

### Diagnosis

```bash
# Is the API port open?
lsof -i :3003

# Is the bot process running?
pm2 status

# Can it be reached locally?
curl http://127.0.0.1:3003/api/stats
```

### Recovery

```bash
# Restart bot (API is part of the same process)
pm2 restart bot

# If API needs to be externally accessible:
# Set API_HOST=0.0.0.0 in bot/.env, then restart
pm2 restart bot

# If behind nginx: check proxy config
grep -A5 "location /api" /etc/nginx/sites-enabled/*
# Should proxy_pass to http://127.0.0.1:3003;
```

**If CORS errors only:**
```bash
# Add dashboard domain to bot/.env
CORS_ORIGINS=https://yourdomain.com
pm2 restart bot
```

---

## Incident 4: XP Signer Fails / Queue Builds Up

### Symptoms
- `/api/xp-queue` returns a growing list of pending rewards
- Community members complain their XP isn't updating on-chain

### Root Causes
- `scripts/xp-batch-signer.js` hasn't been run
- Admin Radix account has insufficient XRD for fees
- Network congestion on Radix mainnet

### Diagnosis

```bash
# Check queue size
curl http://localhost:3003/api/xp-queue | jq '.data | length'
# → Should be 0; anything >10 needs attention

# Check signer logs (if scheduled)
cat /var/log/xp-signer.log
```

### Recovery

```bash
# Run the batch signer manually
cd scripts
node xp-batch-signer.js

# If account has insufficient XRD:
# → Top up the admin account with XRD for transaction fees
# → Then re-run the signer

# If Radix network is congested:
# → Wait and retry; rewards are not lost, just delayed
```

**Long-term fix:** Schedule the signer via cron:
```bash
# Run XP signer daily at 08:00 UTC
0 8 * * * cd /path/to/scripts && node xp-batch-signer.js >> /var/log/xp-signer.log 2>&1
```

---

## Monitoring Hints

### What to Watch

| Signal | Threshold | Action |
|--------|-----------|--------|
| Bot process uptime | < 24h since restart | Investigate crash logs |
| API response time | > 2s consistently | Check DB size, add indexes |
| XP queue depth | > 20 pending | Run `xp-batch-signer.js` |
| DB file size | > 100MB | Analyze with `sqlite3 guild.db ".dbinfo"` |
| Disk space | < 10% free | Clean logs, old backups |

### Quick Health Script

```bash
#!/bin/bash
# save as scripts/healthcheck.sh

BASE=http://localhost:3003
OK=0

check() {
  result=$(curl -s "$BASE/$1" | grep -c '"ok":true')
  if [ "$result" = "1" ]; then
    echo "✅ $1"
  else
    echo "❌ $1 — FAILED"
    OK=1
  fi
}

check "api/stats"
check "api/proposals"
check "api/leaderboard"
check "api/charter"

# XP queue depth
depth=$(curl -s "$BASE/api/xp-queue" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))" 2>/dev/null)
echo "📬 XP queue depth: ${depth:-unknown}"

exit $OK
```

```bash
chmod +x scripts/healthcheck.sh
bash scripts/healthcheck.sh
```

### Recommended Monitoring Setup

- **PM2**: `pm2 monit` for live CPU/memory
- **UptimeRobot** (free): ping `/api/stats` every 5 min, alert on failure
- **Telegram alert**: add a `sendMessage` call to the healthcheck script for on-call paging
