# CV2 Integration — Technical Plan

## Current State

Consultation v2 records votes on-chain in Scrypto governance components. The Vote Collector reads them via Radix Gateway API. There is NO REST API — all data lives on the ledger.

## Integration Path: Read the Ledger

We already read on-chain state for badges. CV2 integration uses the same pattern:

```
Radix Mainnet Ledger
    │
    ├── Badge Manager (we query this for badge verification)
    │
    └── CV2 Governance Component (we'll query this for proposals/votes)
         │
         └── Gateway API: POST /state/entity/details
```

## What We Need

1. **CV2 governance component address** on mainnet
   - Not publicly documented yet
   - Options: ask Radix team, find via Radix Dashboard explorer, or check consultation.radixdlt.com network requests

2. **CV2 data structure** — what the KVStore contains
   - Proposals: title, options, voting period, status
   - Votes: voter address, choice, LSU weight
   - Source: `github.com/gguuttss/consultation-blueprint`

3. **Gateway API queries** to read CV2 state
   - `POST /state/entity/details` — get component state
   - `POST /state/key-value-store/data` — read proposal KVStore entries

## Implementation Plan

### Phase 1: Find the Component (research)
- Monitor consultation.radixdlt.com network requests for component_rdx addresses
- Or ask on RadixTalk/Discord for the deployment address
- Or search Radix Dashboard for consultation-related components

### Phase 2: Read Proposals (1 week)
```javascript
// bot/services/consultation.js
async function getCV2Proposals() {
  // Query the CV2 governance component via Gateway API
  const resp = await fetch(GATEWAY + "/state/entity/details", {
    method: "POST",
    body: JSON.stringify({ addresses: [CV2_COMPONENT] }),
  });
  // Parse the KVStore data for proposals
  // Return array of { id, title, options, votes, status }
}
```

### Phase 3: Display in Bot + Dashboard
- `/cv2` command — list network-level consultations
- Dashboard: "Network Governance" section alongside Guild proposals
- Clear labeling: "Guild Vote (off-chain)" vs "Network Vote (on-chain)"

## What Copilot Built (PR #55) — Assessment

PR #55 assumes a REST API (`CV2_API_URL`, `CV2_API_KEY`, webhooks) that doesn't exist. The federation architecture is sound but the implementation needs rewriting to use Gateway API instead.

**Useful from PR #55:** Database schema additions, dashboard components, bot command structure.
**Needs rewriting:** `consultation.js` service — replace API calls with Gateway API queries.

## Blockers

- **Component address unknown** — need to find the CV2 mainnet deployment
- **KVStore data format** — need to decode the SBOR-encoded proposal data
- **No webhook support** — we poll, not push (5-minute intervals like auto-close)

## Not Blocked

- Badge-tier weighted voting (already built)
- Dashboard components (Copilot PR #55 has these)
- Bot commands for displaying network votes
