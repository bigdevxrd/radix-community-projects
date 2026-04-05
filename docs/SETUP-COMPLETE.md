# SETUP-COMPLETE.md — Radix Community Governance

Single reference for getting the full stack running, verifying it works, and troubleshooting the most common problems.

---

## Quick Start (Docker — recommended)

```bash
# 1. Clone
git clone https://github.com/bigdevxrd/radix-community-projects.git
cd radix-community-projects

# 2. Copy and fill env
cp bot/.env.example bot/.env
cp guild-app/.env.example guild-app/.env.local
# → edit both files (see Env Vars Checklist below)

# 3. Start everything
docker compose up -d

# 4. Verify
curl http://localhost:3003/api/stats
# → {"ok":true,"data":{...}}
```

> **No Docker?** See the Manual Setup section below.

---

## Manual Setup (npm)

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 9 | `npm -v` |

### Bot

```bash
cd bot
npm install
cp .env.example .env
# edit .env (required: BOT_TOKEN, GUILD_CHAT_ID)
node index.js
# → [BOT] Bot started   [API] running on 127.0.0.1:3003
```

### Dashboard (guild-app)

```bash
cd guild-app
npm install
cp .env.example .env.local
# edit .env.local (required: NEXT_PUBLIC_API_URL)
npm run dev
# → Ready on http://localhost:3000
```

---

## Env Vars Checklist

### Bot (`bot/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `BOT_TOKEN` | ✅ | Telegram bot token from @BotFather | `1234567890:AAF...` |
| `GUILD_CHAT_ID` | ✅ | Telegram chat/group ID where bot posts | `-1001234567890` |
| `API_PORT` | optional | Port for HTTP API (default: 3003) | `3003` |
| `API_HOST` | optional | Bind address (default: 127.0.0.1) | `0.0.0.0` |
| `CORS_ORIGINS` | optional | Comma-separated allowed origins (empty = `*`) | `https://yourdomain.com` |
| `BOT_DB_PATH` | optional | SQLite file path (default: `./guild.db`) | `/data/guild.db` |
| `ADMIN_ADDRESSES` | optional | Comma-separated admin Radix addresses | `account_rdx1...` |
| `BOUNTY_NOTIFY_CHAT_ID` | optional | Chat ID for daily bounty summary (9 UTC) | `-1001234567890` |

### Dashboard (`guild-app/.env.local`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | Full URL to bot API | `https://yourdomain.com/api` |
| `NEXT_PUBLIC_DAPP_DEF` | optional | dApp definition address | `account_rdx1...` |
| `NEXT_PUBLIC_MANAGER` | optional | Badge manager component address | `component_rdx1...` |
| `NEXT_PUBLIC_BADGE_NFT` | optional | Badge NFT resource address | `resource_rdx1...` |
| `NEXT_PUBLIC_ADMIN_BADGE` | optional | Admin badge resource address | `resource_rdx1...` |

---

## Verification Checklist

After startup, confirm each component is working:

### 1. Bot is Running

```bash
# Check process
ps aux | grep "node index.js"

# Or PM2 (if using ecosystem.config.js)
pm2 status

# Tail logs
pm2 logs bot --lines 20
```

Expected output: `[BOT] Bot started` and `[API] Proposals API running on ...`

### 2. API Endpoints Respond

```bash
BASE=http://localhost:3003

# Health / stats
curl -s $BASE/api/stats | jq .ok
# → true

# Proposals
curl -s "$BASE/api/proposals" | jq '.data | length'
# → (number of proposals, 0 is fine on fresh install)

# Leaderboard
curl -s "$BASE/api/leaderboard" | jq .ok
# → true

# Charter
curl -s "$BASE/api/charter" | jq '.data.status'
# → {"total":32,"resolved":0,"voting":0,"tbd":32}
```

### 3. Bot Commands Work (Telegram)

Send these messages to your bot or the guild chat:

| Command | Expected response |
|---------|-------------------|
| `/start` | Welcome message + register prompt |
| `/charter` | Charter progress bar |
| `/game` | Your roll stats (or prompt to register) |
| `/bounties` | Open bounties list |
| `/proposals` | Active proposals |

### 4. Dashboard Loads

```bash
# If running locally
open http://localhost:3000

# Check API connection (browser console should show no CORS errors)
# → Dashboard shows Proposals, Charter Progress, Bounty Board sections
```

### 5. Badge Verification Works

```bash
# Replace with a real address that holds the badge NFT
curl -s "http://localhost:3003/api/badge/account_rdx1YOUR_ADDRESS/verify" | jq .
# → {"ok":true,"hasBadge":true,"address":"account_rdx1..."}
```

---

## Troubleshooting

### Bot won't start

**Symptom:** `Error: Telegram Bot Token is required` or process exits immediately.

**Fix:**
1. Check `BOT_TOKEN` is set in `bot/.env` and is valid (test with `curl https://api.telegram.org/bot<TOKEN>/getMe`)
2. Check Node.js ≥ 18: `node -v`
3. Run `npm install` in the `bot/` directory
4. Check for port conflict: `lsof -i :3003` — kill conflicting process or change `API_PORT`

---

**Symptom:** Bot starts but doesn't respond to commands.

**Fix:**
1. Verify `GUILD_CHAT_ID` matches your group. Get it by forwarding a group message to @userinfobot.
2. Ensure the bot is an admin in the group (needed to post results).
3. Check bot wasn't blocked: send `/start` directly to the bot in a private chat.

---

### Dashboard can't connect to API

**Symptom:** Dashboard loads but all sections show loading spinners forever, or browser console shows CORS errors.

**Fix:**
1. Verify `NEXT_PUBLIC_API_URL` is set correctly in `guild-app/.env.local` (no trailing slash).
2. If running behind a reverse proxy, ensure `/api/*` paths are proxied to port 3003.
3. Set `CORS_ORIGINS` in `bot/.env` to your dashboard's origin, e.g. `https://yourdomain.com`.
4. Test the API directly: `curl http://localhost:3003/api/stats` — if this fails, the bot isn't running.

---

### Badge verification fails

**Symptom:** `/api/badge/:address` returns `{"ok":false,"error":"gateway_error"}`.

**Fix:**
1. The Radix Gateway at `https://mainnet.radixdlt.com` may be temporarily unreachable. Retry in a few minutes.
2. Verify the address format: must start with `account_rdx1`.
3. Check `NEXT_PUBLIC_BADGE_NFT` matches the deployed badge NFT resource address.
4. If using a custom gateway, update `guild-app/src/lib/constants.ts` → `GATEWAY`.

---

### SQLite locked / database errors

**Symptom:** `SQLITE_BUSY: database is locked` errors in bot logs.

**Fix:**
1. The DB uses WAL mode (set in `db.js`) which allows concurrent reads. This error usually means a second bot instance is running.
2. Check for duplicate processes: `ps aux | grep "node index.js"`
3. Kill the extra process and restart: `pm2 restart bot`

---

### XP rewards not being processed

**Symptom:** `/api/xp-queue` shows a growing queue that never empties.

**Fix:**
1. The XP batch signer (`scripts/xp-batch-signer.js`) must be run manually or scheduled.
2. Run it: `cd scripts && node xp-batch-signer.js`
3. Requires a valid admin Radix account with XRD for transaction fees.
4. See `scripts/REDEPLOY-V3.md` for the full signing workflow.
