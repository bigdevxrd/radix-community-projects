#!/bin/bash
# deploy.sh — Sync code to VPS and restart services
# Usage: ./scripts/deploy.sh [bot|dashboard|all]
#
# Requires SSH config entry "guild-vps" or set GUILD_VPS env var

set -euo pipefail

VPS="${GUILD_VPS:-guild-vps}"
REMOTE_BASE="/opt/guild"
LOCAL_BASE="$(cd "$(dirname "$0")/.." && pwd)"

TARGET="${1:-all}"

echo "=== Radix Guild Deploy ==="
echo "Target: $TARGET"
echo "VPS:    $VPS"
echo ""

deploy_bot() {
  echo "[bot] Syncing..."
  rsync -avz --delete \
    --exclude node_modules \
    --exclude guild.db \
    --exclude guild.db-shm \
    --exclude guild.db-wal \
    --exclude .env \
    --exclude backups \
    -e ssh \
    "$LOCAL_BASE/bot/" "$VPS:$REMOTE_BASE/bot/"

  echo "[bot] Installing deps..."
  ssh "$VPS" "cd $REMOTE_BASE/bot && npm install --production --silent"

  echo "[bot] Restarting..."
  ssh "$VPS" "pm2 restart guild-bot --update-env"
  echo "[bot] Done"
}

deploy_dashboard() {
  echo "[dashboard] Syncing..."
  rsync -avz --delete \
    --exclude node_modules \
    --exclude .next \
    --exclude .env.local \
    -e ssh \
    "$LOCAL_BASE/guild-app/" "$VPS:$REMOTE_BASE/dashboard/"

  echo "[dashboard] Installing deps..."
  ssh "$VPS" "cd $REMOTE_BASE/dashboard && npm install --production --silent"

  echo "[dashboard] Building..."
  ssh "$VPS" "cd $REMOTE_BASE/dashboard && npm run build"

  echo "[dashboard] Restarting..."
  ssh "$VPS" "pm2 restart guild-app --update-env"
  echo "[dashboard] Done"
}

case "$TARGET" in
  bot)       deploy_bot ;;
  dashboard) deploy_dashboard ;;
  all)       deploy_bot; echo ""; deploy_dashboard ;;
  *)         echo "Usage: $0 [bot|dashboard|all]"; exit 1 ;;
esac

echo ""
echo "=== Deploy Complete ==="
echo "Run: node scripts/pipeline-test.js  (to verify)"
