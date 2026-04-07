# CV2 Integration — Weekly Plan

## Week Overview

Deploy Consultation v2 governance to Radix mainnet and integrate with the Guild bot. By end of week: on-chain voting works alongside off-chain TG voting.

## Prerequisites

- [ ] Get CV2 mainnet component address (post on RadixTalk/Discord) OR deploy our own
- [ ] Ensure guild VPS has Docker installed for vote-collector

## Day 1-2: Scrypto Deployment

### Option A: Use existing Foundation deployment
If we get the component address from RadixTalk/Discord:
```
1. Update consultation_v2/packages/shared/src/governance/config.ts
2. Set MainnetLive addresses
3. Test reading state via Gateway API
4. Skip to Day 3
```

### Option B: Deploy our own (if Foundation doesn't share)
```
1. Clone fork: git clone bigdevxrd/consultation_v2
2. Build Scrypto on guild VPS:
   cd scrypto && scrypto build
3. Upload WASM+RPD via Radix Dashboard
4. Instantiate Governance component:
   - owner_badge: new fungible (1 supply)
   - governance_parameters:
     temperature_check_days: 3
     temperature_check_quorum: 1000
     temperature_check_approval_threshold: 0.5
     proposal_length_days: 7
     proposal_quorum: 5000
     proposal_approval_threshold: 0.5
5. Instantiate VoteDelegation component
6. Record all addresses
7. Update config.ts with real addresses
8. Test: create temp check, cast vote, read state
```

## Day 3: Vote Collector Setup

```
1. Install Docker on guild VPS:
   ssh guild-vps "apt install docker.io docker-compose -y"

2. Configure .env for vote-collector:
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/consultation
   NETWORK_ID=1
   VITE_PUBLIC_DAPP_DEFINITION_ADDRESS=<governance_component>

3. Start PostgreSQL + vote-collector:
   docker-compose -f docker-compose.yml up -d postgres vote-collector

4. Run migrations:
   docker-compose exec vote-collector pnpm db:migrate

5. Verify polling:
   docker-compose logs -f vote-collector

6. Test API:
   curl http://localhost:3001/vote-results?entityType=temperature_check&entityId=0
```

## Day 4: Bot Integration

### Create bot/services/consultation.js
```javascript
// Feature-flagged: CV2_ENABLED=true in .env
const CV2_ENABLED = process.env.CV2_ENABLED === "true";
const CV2_API = process.env.CV2_API_URL || "http://localhost:3001";

async function getCV2Proposals() { /* fetch from vote-collector API */ }
async function getCV2VoteResults(id) { /* fetch tallied results */ }

module.exports = { CV2_ENABLED, getCV2Proposals, getCV2VoteResults };
```

### Add /cv2 bot commands
```
/cv2           — list active network consultations
/cv2 <id>      — detail + current vote counts
/cv2 status    — sync health
```

### Add /api/cv2/* endpoints
```
GET /api/cv2/proposals      — list synced proposals
GET /api/cv2/proposals/:id  — detail + votes
GET /api/cv2/status         — health check
```

## Day 5: Dashboard + Testing

### Dashboard "Network Governance" section
On /guild/proposals page, add section showing CV2 proposals with:
- Clear label: "Network Vote (on-chain, XRD-weighted)"
- Link to CV2 frontend for voting
- Vote results bar chart

### End-to-end test
```
1. Create temperature check via CV2 frontend
2. Vote with Radix Wallet
3. Vote-collector picks it up (1 min polling)
4. Bot /cv2 shows the proposal
5. Dashboard shows it alongside Guild proposals
6. Verify vote weights include badge tier data
```

### Update Caddy routing
```
/gov/*     → localhost:3000 (CV2 frontend)
/gov-api/* → localhost:3001 (vote collector)
```

## Checklist

### Scrypto (Day 1-2)
- [ ] Get or deploy governance component address
- [ ] Get or deploy vote delegation component address
- [ ] Owner badge secured
- [ ] GovernanceParameters set
- [ ] Test temp check created on-chain
- [ ] Test vote recorded on-chain

### Infrastructure (Day 3)
- [ ] Docker installed on guild VPS
- [ ] PostgreSQL running
- [ ] Vote-collector running and polling
- [ ] Vote-collector API responding

### Bot (Day 4)
- [ ] consultation.js service created (behind CV2_ENABLED)
- [ ] /cv2 commands working
- [ ] /api/cv2/* endpoints working
- [ ] Existing bot unaffected when CV2_ENABLED=false

### Dashboard (Day 5)
- [ ] Network Governance section on proposals page
- [ ] Caddy routes for CV2 frontend
- [ ] End-to-end test passed
- [ ] Documentation updated

## Effort Estimate

| Task | Hours |
|------|-------|
| Scrypto deploy (Option A) | 2 |
| Scrypto deploy (Option B) | 8 |
| Docker + vote-collector | 4 |
| Bot integration | 4 |
| Dashboard section | 3 |
| Testing + docs | 3 |
| **Total** | **16-24 hours** |

## Risk Mitigation

- **Can't get Foundation address?** → Deploy our own (Option B)
- **Scrypto won't build?** → Same blst issue as BadgeManager — build on VPS only
- **Docker resource constraints?** → PostgreSQL needs ~200MB RAM, VPS has plenty
- **Vote-collector fails?** → It's behind CV2_ENABLED flag, core bot unaffected
