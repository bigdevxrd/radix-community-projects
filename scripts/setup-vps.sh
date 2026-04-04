#!/bin/bash
# setup-vps.sh — Bootstrap a fresh VPS for Radix Guild
# Run as root on a fresh Ubuntu 22.04+ VPS
#
# Usage: ssh root@NEW_VPS "bash -s" < scripts/setup-vps.sh

set -euo pipefail

echo "=== Radix Guild VPS Setup ==="

# ── System Updates ────────────────────────────────────
echo "[1/8] System update..."
apt update -qq && apt upgrade -y -qq

# ── Create guild user ─────────────────────────────────
echo "[2/8] Creating guild user..."
if ! id guild &>/dev/null; then
  adduser --disabled-password --gecos "Guild Service" guild
  usermod -aG sudo guild
  # Copy root SSH keys to guild user
  mkdir -p /home/guild/.ssh
  cp /root/.ssh/authorized_keys /home/guild/.ssh/ 2>/dev/null || true
  chown -R guild:guild /home/guild/.ssh
  chmod 700 /home/guild/.ssh
  chmod 600 /home/guild/.ssh/authorized_keys 2>/dev/null || true
  echo "guild ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/guild
fi

# ── SSH Hardening ─────────────────────────────────────
echo "[3/8] SSH hardening..."
# Change SSH port to 2222
sed -i 's/^#Port 22/Port 2222/' /etc/ssh/sshd_config
sed -i 's/^Port 22$/Port 2222/' /etc/ssh/sshd_config
# Disable root login
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PermitRootLogin/PermitRootLogin/' /etc/ssh/sshd_config
systemctl restart sshd

# ── Firewall ──────────────────────────────────────────
echo "[4/8] Configuring UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

# ── Fail2ban ──────────────────────────────────────────
echo "[5/8] Installing fail2ban..."
apt install -y -qq fail2ban
cat > /etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled = true
port = 2222
maxretry = 5
bantime = 3600
JAIL
systemctl enable fail2ban
systemctl restart fail2ban

# ── Node.js 22 ────────────────────────────────────────
echo "[6/8] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y -qq nodejs
npm install -g pm2

# ── Caddy ─────────────────────────────────────────────
echo "[7/8] Installing Caddy..."
apt install -y -qq debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update -qq && apt install -y -qq caddy

# ── Guild Directory Structure ─────────────────────────
echo "[8/8] Creating directory structure..."
mkdir -p /opt/guild/{bot,dashboard,backups}
chown -R guild:guild /opt/guild

# ── Caddy Config ──────────────────────────────────────
HOSTNAME=$(hostname -I | awk '{print $1}' | tr '.' '-')
cat > /etc/caddy/Caddyfile <<CADDY
${HOSTNAME}.sslip.io {
  handle /api/* {
    reverse_proxy localhost:3003
  }
  handle /* {
    reverse_proxy localhost:3002
  }
}
CADDY
systemctl restart caddy

# ── Backup Cron ───────────────────────────────────────
cat > /opt/guild/backups/backup.sh <<'BACKUP'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
cp /opt/guild/bot/guild.db /opt/guild/backups/guild-${DATE}.db 2>/dev/null || true
cp /opt/guild/bot/.env /opt/guild/backups/bot-env-${DATE}.bak 2>/dev/null || true
# Keep 7 days
find /opt/guild/backups/ -name "*.db" -mtime +7 -delete
find /opt/guild/backups/ -name "*.bak" -mtime +7 -delete
BACKUP
chmod +x /opt/guild/backups/backup.sh
echo "0 3 * * * guild /opt/guild/backups/backup.sh" > /etc/cron.d/guild-backup

# ── PM2 Startup ──────────────────────────────────────
sudo -u guild bash -c 'pm2 startup systemd -u guild --hp /home/guild 2>/dev/null || true'

echo ""
echo "=== Setup Complete ==="
echo "SSH:      ssh -p 2222 guild@$(hostname -I | awk '{print $1}')"
echo "Web:      https://${HOSTNAME}.sslip.io"
echo "Next:     Copy bot + dashboard code, install deps, start PM2"
echo ""
