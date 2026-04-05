# DEPLOYMENT-CHECKLIST.md

Runbook for deploying the Radix Community Governance stack to production.

---

## Pre-Deployment

### 1. Test Critical Endpoints Locally

```bash
BASE=http://localhost:3003

# Core endpoints must all return ok:true
for path in /api/stats /api/proposals /api/leaderboard /api/charter /api/bounties /api/escrow; do
  echo -n "$path → "
  curl -s "$BASE$path" | grep -o '"ok":true' || echo "FAIL"
done
```

All six must print `"ok":true`. Fix any failures before proceeding.

### 2. Run Build Check (Dashboard)

```bash
cd guild-app
npm run build
# Must exit 0 with no TypeScript errors
```

### 3. Validate Environment Variables

Bot (`bot/.env`):
- [ ] `BOT_TOKEN` — test with `curl https://api.telegram.org/bot${BOT_TOKEN}/getMe`
- [ ] `GUILD_CHAT_ID` — must be a negative number (group) or positive (channel)
- [ ] `CORS_ORIGINS` — must include your dashboard production URL

Dashboard (`guild-app/.env.local` or production env):
- [ ] `NEXT_PUBLIC_API_URL` — must be the production API URL, no trailing slash
- [ ] `NEXT_PUBLIC_BADGE_NFT` — must match deployed contract address
- [ ] `NEXT_PUBLIC_MANAGER` — must match deployed badge manager address

### 4. Database Backup

```bash
# Stop the bot first to avoid WAL corruption
pm2 stop bot

# Backup
cp bot/guild.db bot/guild.db.bak-$(date +%Y%m%d-%H%M%S)

# Verify backup
sqlite3 bot/guild.db.bak-* ".tables"
# Should list: users, proposals, votes, charter_params, bounties, ...

# Restart bot
pm2 start bot
```

---

## Deployment

### Option A: PM2 (VPS)

```bash
# Pull latest
git pull origin main

# Install/update dependencies
cd bot && npm install
cd ../guild-app && npm install && npm run build

# Restart with PM2
pm2 restart ecosystem.config.js
pm2 save
```

### Option B: Docker Compose

```bash
git pull origin main
docker compose pull
docker compose up -d --build
```

### Option C: Manual

```bash
# Kill old process
kill $(lsof -ti:3003)

# Start bot
cd bot
node index.js &

# Start dashboard (Next.js standalone/export)
cd guild-app
npm run start &
```

---

## Post-Deployment Health Checks

Run these within 5 minutes of deploying:

```bash
BASE=https://yourdomain.com

# 1. API is up
curl -s $BASE/api/stats | jq .ok
# → true

# 2. Proposals load
curl -s "$BASE/api/proposals?status=active" | jq '.data | length'
# → (≥ 0)

# 3. Leaderboard is reachable
curl -s "$BASE/api/leaderboard" | jq .ok
# → true

# 4. Dashboard loads (HTTP 200)
curl -o /dev/null -s -w "%{http_code}" $BASE
# → 200

# 5. Bot is active in Telegram
# Send /charter to the bot — should reply within 5 seconds
```

Mark each step: ✅ pass / ❌ fail → rollback if any fail.

---

## Rollback Procedure

If post-deployment checks fail:

### 1. Identify the issue

```bash
pm2 logs bot --lines 50
# Look for: ERROR, SQLITE, uncaughtException
```

### 2. Revert code

```bash
git log --oneline -5
git revert HEAD --no-edit
# or: git reset --hard <previous-commit-sha>
pm2 restart bot
```

### 3. Restore database (if corrupted)

```bash
pm2 stop bot
cp bot/guild.db.bak-YYYYMMDD-HHMMSS bot/guild.db
pm2 start bot
```

### 4. Verify rollback

Repeat the Post-Deployment Health Checks above.

---

## Maintenance Windows

Recommended: **Sundays 02:00–04:00 UTC** (lowest TG activity)

During maintenance:
1. Post in guild chat: "⚠️ Brief maintenance window — back in ~30 min"
2. `pm2 stop bot` (stops both bot and API)
3. Perform work
4. `pm2 start ecosystem.config.js`
5. Run health checks
6. Post: "✅ Maintenance complete"
