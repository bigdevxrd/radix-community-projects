module.exports = {
  apps: [
    {
      name: "meme-grid-server",
      script: "server/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 4100,
        CORS_ORIGINS: "http://localhost:3001,https://memegrid.radixguild.com",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
    },
    {
      name: "meme-grid-web",
      script: "node_modules/.bin/next",
      args: "start --port 3001",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};
