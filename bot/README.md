# Radix Guild Telegram Bot

Primary interface for the Radix Guild. Badge management + governance from Telegram.

## Commands

| Command | What It Does |
|---------|-------------|
| /start | Welcome + quick links |
| /register \<address\> | Link Radix wallet |
| /mint | Mint free Guild badge (opens signing page) |
| /badge | View your badge (XP, tier, level) |
| /lookup \<nft_id\> | Look up any badge by ID |
| /proposals | Active proposals + vote buttons |
| /bounties | Open bounties with XRD rewards |
| /stats | Network stats (total badges, users) |
| /portal | Guild dashboard |
| /dao | CrumbsUp DAO |
| /source | GitHub repo |

## Setup

```bash
cd bot
npm install
echo "TG_BOT_TOKEN=your_token_here" > .env
node index.js
```

## Architecture

- **Grammy** framework for Telegram API
- **Gateway API** for on-chain badge reads
- **Inline buttons** link to signing page for wallet transactions
- **JSON file** persistence for user registry (survives restarts)
- Signing page handles Radix Wallet connection + TX submission
