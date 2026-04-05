# Radix Governance Reusable DAO Kit

Deploy your own DAO governance infrastructure in under 30 minutes using this kit. Built on the Radix ledger, this toolkit provides a complete multi-platform governance stack that any Radix-based DAO can adopt.

---

## What's Included

### 1. Telegram Bot (30+ commands)

The governance bot is the community's primary interface.

**Deploy:**
```bash
cd bot/
npm install
cp ../.env.example .env   # Fill in your values
node index.js
```

**Customize `bot/config.json`:**
- Your badge NFT resource address
- Proposal types and durations
- Vote weights per badge tier
- Admin addresses
- Telegram chat ID for announcements

**Key commands:**
- `/propose`, `/poll`, `/temp` — create governance actions
- `/vote`, `/results`, `/history` — voting interface
- `/charter` — track DAO constitution parameters
- `/bounty` — manage on-chain bounties
- `/cv2`, `/crumbsup`, `/federation` — multi-platform sync
- `/syncnow` — force sync all pending proposals

---

### 2. Smart Contracts (Scrypto)

On-chain badge system for identity and voting weight.

**Deploy:**
```bash
cd badge-manager/
scrypto publish
```

**Customize `badge-manager/src/config.rs`:**
- `DAO_NAME` — your DAO's name
- `BADGE_TIERS` — tier names and XP thresholds
- `VOTE_WEIGHTS` — weight per tier (default: 1/2/3/5/10)
- `XP_PER_ACTION` — XP rewards per governance action

**Badge tier system (default):**
| Tier | Vote Weight | XP Required |
|------|------------|-------------|
| Member | 1x | 0 |
| Contributor | 2x | 100 |
| Builder | 3x | 500 |
| Steward | 5x | 2000 |
| Elder | 10x | 10000 |

---

### 3. Dashboard (Next.js)

Public-facing governance portal with admin panel.

**Deploy:**
```bash
cd guild-app/
npm install
cp .env.example .env.local   # Fill in your values
vercel deploy
```

**Pages:**
- `/` — badge overview + mint
- `/proposals` — active proposals
- `/admin` — badge management (admin only)
- `/admin/federation` — CV2 + CrumbsUp sync status
- `/analytics/federation` — cross-platform analytics

**Configure `.env.local`:**
```env
NEXT_PUBLIC_DAPP_DEF=account_rdx1...
NEXT_PUBLIC_BADGE_NFT=resource_rdx1...
NEXT_PUBLIC_MANAGER=component_rdx1...
NEXT_PUBLIC_API_URL=https://your-bot-api.example.com/api
```

---

### 4. REST API (7 core endpoints)

Exposed by the bot service on port 3003.

**Core:**
- `GET /api/proposals` — all proposals + vote counts
- `GET /api/proposals/:id` — single proposal detail
- `GET /api/stats` — governance statistics
- `GET /api/charter` — charter parameter status
- `GET /api/badge/:address` — badge data for address

**Federation:**
- `GET /api/cv2/status` — CV2 sync health
- `GET /api/cv2/proposals` — CV2-synced proposals
- `GET /api/cv2/vote-weights` — badge tier → vote multipliers
- `GET /api/crumbsup/status` — CrumbsUp sync health
- `GET /api/crumbsup/dao` — DAO metadata
- `GET /api/federation/health` — all-systems health
- `GET /api/federation/proposals` — cross-platform proposal view

---

### 5. Integration Templates

#### CV2 (Consultation v2) Integration

CV2 is the Radix network-level governance system. Connect your DAO to network-wide votes.

```javascript
// bot/services/consultation.js — plug-and-play
const { syncProposalToCV2, getVoteWeightsFromBadges } = require("./services/consultation");

// Sync a proposal to CV2
const weights = await getVoteWeightsFromBadges();
const result = await syncProposalToCV2(proposal, weights);
// result.cv2_id, result.cv2_url, result.webhook_registered

// Receive CV2 vote updates via webhook
// POST /api/webhooks/cv2 — handled automatically
```

**Required env vars:**
```
CV2_API_URL=https://api.consultation.radix.network/v2
CV2_API_KEY=your_cv2_key
CV2_WEBHOOK_SECRET=your_webhook_secret
```

#### CrumbsUp Integration

CrumbsUp is a community engagement hub. Sync your DAO reputation and proposals.

```javascript
// bot/services/crumbsup.js — plug-and-play
const { syncProposalToCrumbsUp, syncReputationScoreToCrumbsUp } = require("./services/crumbsup");

// Sync a proposal
const result = await syncProposalToCrumbsUp(proposal);
// result.crumbsup_id, result.crumbsup_url

// Sync user XP → reputation
const rep = await syncReputationScoreToCrumbsUp(address, xp, db);
// rep.reputation_score (xp / 100)

// Receive CrumbsUp events via webhook
// POST /api/webhooks/crumbsup — handled automatically (HMAC-SHA256 validated)
```

**Required env vars:**
```
CRUMBSUP_API_URL=https://api.crumbsup.io
CRUMBSUP_API_KEY=your_crumbsup_key
CRUMBSUP_WEBHOOK_SECRET=your_webhook_secret
CRUMBSUP_DAO_ID=your-dao-id
```

---

## Quick Start

### Option A: Fork This Repo

```bash
# 1. Fork on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_ORG/radix-community-projects my-dao-governance
cd my-dao-governance

# 3. Configure
cp .env.example .env
# Edit .env with your values (see section below)

# 4. Install dependencies
cd bot && npm install

# 5. Start the bot + API
node index.js

# 6. Deploy the dashboard
cd ../guild-app && npm install && vercel deploy
```

### Option B: Template Clone

```bash
git clone --template https://github.com/bigdevxrd/radix-community-projects \
  my-dao-governance
cd my-dao-governance
```

---

## Configuration Reference

### `.env` (bot service)

```env
# Telegram
TG_BOT_TOKEN=your_bot_token
GOVERNANCE_CHAT_ID=-100123456789
GUILD_CHAT_ID=-100123456789

# Radix
RADIX_GATEWAY_URL=https://gateway.radixscan.io
BADGE_RESOURCE=resource_rdx1...
BADGE_MANAGER=component_rdx1...

# Bot API
API_PORT=3003
API_HOST=127.0.0.1
ADMIN_API_KEY=your_admin_key
BOT_API_URL=https://your-api.example.com

# CV2 Integration (optional)
CV2_API_URL=https://api.consultation.radix.network/v2
CV2_API_KEY=your_cv2_key
CV2_WEBHOOK_SECRET=your_cv2_webhook_secret

# CrumbsUp Integration (optional)
CRUMBSUP_API_URL=https://api.crumbsup.io
CRUMBSUP_API_KEY=your_crumbsup_key
CRUMBSUP_WEBHOOK_SECRET=your_crumbsup_webhook_secret
CRUMBSUP_DAO_ID=your-dao-id

# Portal
PORTAL_URL=https://your-dashboard.vercel.app
```

### Vote Weights

Default badge tier → vote weight mapping (configured in `bot/services/consultation.js`):

```javascript
const VOTE_WEIGHTS = {
  member: 1,
  contributor: 2,
  builder: 3,
  steward: 5,
  elder: 10,
};
```

To use a different weighting system, update `VOTE_WEIGHTS` in `consultation.js`.

### Proposal Types

The bot supports four proposal types:

| Type | Command | Duration | Options |
|------|---------|---------|---------|
| `yesno` | `/propose` | 72h | For / Against / Amend |
| `poll` | `/poll` | 72h | Custom options (up to 6) |
| `temp` | `/temp` | 24h | Yes! / Maybe / No |
| `amendment` | `/amend` | 72h | For / Against / Amend |

---

## Database Schema

The bot uses SQLite (via `better-sqlite3`). Tables are created automatically on first run.

**Core tables:**
- `users` — Telegram ID → Radix address mapping
- `proposals` — governance proposals
- `votes` — vote records
- `charter_params` — DAO constitution parameters
- `bounties` — on-chain bounty tracking
- `escrow_wallet` — XRD escrow balance

**Federation tables (auto-created):**
- `cv2_vote_sync` — CV2 vote sync log
- `crumbsup_sync_log` — CrumbsUp event log
- `crumbsup_members` — member reputation tracking

---

## Testing

Run integration tests against a live API:

```bash
# Start the bot first
cd bot && node index.js &

# Run tests
node scripts/integration-test-federation.js --api=http://localhost:3003
```

---

## Customization Examples

### Custom Badge Tiers

```javascript
// bot/services/consultation.js
const VOTE_WEIGHTS = {
  citizen: 1,
  delegate: 3,
  council: 7,
};
```

### Custom Proposal Types

Add a new type in `bot/db.js`:
```javascript
// In createProposal, add type validation:
const VALID_TYPES = ["yesno", "poll", "temp", "ratification", "election"];
```

### Custom Webhook Endpoints

Add a handler in `bot/services/api.js`:
```javascript
if (url.pathname === "/api/webhooks/my-platform" && req.method === "POST") {
  // Your custom webhook handler
}
```

---

## Multi-DAO Federation

Once your DAO is running, you can federate with other Radix DAOs:

1. **Register your DAO on CrumbsUp** — `/api/crumbsup/dao` setup
2. **Connect to CV2** — set `CV2_API_KEY` and sync proposals
3. **Register webhooks** — post webhook URLs to each platform
4. **Monitor** — use `/admin/federation` dashboard to track sync health

---

## License

MIT — use freely, contributions welcome.

Source: https://github.com/bigdevxrd/radix-community-projects
