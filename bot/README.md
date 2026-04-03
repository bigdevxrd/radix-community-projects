# Radix Guild Telegram Bot

Governance bot for the Radix Guild. Users interact with the Guild from Telegram.

## Commands

| Command | What It Does |
|---------|-------------|
| /start | Welcome message |
| /register <address> | Link Radix wallet address |
| /mint | Get a free Guild badge |
| /badge | View badge info (XP, level, tier) |
| /proposals | Active governance proposals |
| /bounties | Open bounties with XRD rewards |
| /portal | Open Guild dashboard |
| /dao | Open CrumbsUp DAO |
| /source | GitHub repo |

## Setup

```bash
cd bot
npm install
echo "TG_BOT_TOKEN=your_token_here" > .env
node index.js
```

## Architecture

- Grammy framework for Telegram API
- Reads Gateway API for badge data
- Links to portal for wallet-connected actions
- User registry (in-memory MVP, DB later)
