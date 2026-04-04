// PM2 Ecosystem File — start all Guild services
// Usage: pm2 start ecosystem.config.js
// Save: pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: "guild-bot",
      cwd: "/opt/guild/bot",
      script: "index.js",
      env: { NODE_ENV: "production" },
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "guild-app",
      cwd: "/opt/guild/dashboard",
      script: "node_modules/.bin/next",
      args: "start --hostname 127.0.0.1 --port 3002",
      env: { NODE_ENV: "production" },
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
