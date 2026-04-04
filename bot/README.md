# Radix Guild Telegram Bot

Governance bot for the Radix Guild. Proposals, voting, badges — all in Telegram.

## Commands

### Getting Started
| Command | Description |
|---------|-------------|
| /start | Welcome + how to join |
| /register \<address\> | Link your Radix wallet |
| /badge | Check your badge (tier, XP, level) |
| /mint | Get a free Guild member badge |

### Governance
| Command | Description |
|---------|-------------|
| /propose \<title\> | Yes/No/Amend proposal (72h, badge required) |
| /poll \<question\> \| opt1 \| opt2 \| opt3 | Multi-choice poll (up to 6 options) |
| /temp \<question\> | Temperature check (24h, non-binding) |
| /amend \<id\> \<new text\> | Refine a proposal (R2, R3...) |
| /cancel \<id\> | Cancel your own proposal |
| /proposals | List active proposals |
| /results \<id\> | Vote counts for a proposal |
| /history | Recent proposals (all statuses) |
| /stats | Bot statistics |

### Info
| Command | Description |
|---------|-------------|
| /dao | CrumbsUp DAO |
| /source | GitHub repo |
| /help | All commands |

## How Voting Works

1. Badge holder creates a proposal with `/propose` or `/poll`
2. Bot posts proposal with inline vote buttons
3. Badge holders tap buttons to vote
4. Bot checks Gateway API to verify voter has a Guild badge
5. Vote recorded in SQLite, button counts update live
6. At expiry (72h), proposal passes or fails

### Proposal Types

- **Yes/No/Amend** — For, Against, or Amend. If Amend wins, proposer refines with /amend
- **Multi-choice** — Up to 6 options, top choice wins
- **Temperature check** — 24h, non-binding, gauges interest
- **Amendments** — Linked to parent proposal with round tracking (R1 → R2 → R3)

## Setup

```bash
cd bot
npm install
echo "TG_BOT_TOKEN=your_token" > .env
node index.js          # dev
pm2 start index.js --name guild-bot  # production
```

### Group Chat Setup
1. Add bot to TG group
2. Make bot admin (for message editing)
3. Disable group privacy in @BotFather (Bot Settings → Group Privacy → Disabled)
4. **Remove and re-add bot** after changing privacy (required for change to take effect)

## Tech Stack

- **Grammy** v1.41.1 — Telegram Bot API
- **better-sqlite3** — Persistent storage
- **Radix Gateway API** — Badge verification

## Database (SQLite)

| Table | Purpose |
|-------|---------|
| users | TG user ID → Radix wallet address |
| proposals | Title, type, options, status, expiry, amendment links |
| votes | One vote per user per proposal, badge-gated |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| TG_BOT_TOKEN | Bot token from @BotFather | Required |
| BOT_DB_PATH | SQLite path | ./guild.db |
| BADGE_NFT | Badge resource address | Mainnet guild_member |

## License

MIT
