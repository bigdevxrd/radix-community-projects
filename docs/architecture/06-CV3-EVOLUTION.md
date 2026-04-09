I now have a thorough understanding of the entire system. Let me compile the CV3 design document.

---

# CV3 (Consultation v3) -- Product Design Document

## Executive Summary

CV2 is the Radix Foundation's on-chain governance system. It does one thing: voting. Proposals are created, votes are cast (XRD-weighted), tallied, and that is the end of it. There is no execution layer. A proposal that passes in CV2 is a signal with no mechanism to turn it into funded work, delivered output, or verified completion.

CV3 is the evolution from signal to execution. It closes the loop: governance decision becomes funded task becomes delivered work becomes verified completion becomes reputation update. The Radix Guild already has the individual pieces -- a badge system (BadgeManager), a task escrow (TaskEscrow v2/v3), a trust tier model (Bronze/Silver/Gold), a conviction voting specification, and a verification system design. CV3 is the integration architecture that connects them into a single pipeline.

The positioning: CV2 is the Foundation's voting tool. CV3 is the Guild's execution layer. They are complementary, not competitive. CV2 decides. CV3 delivers.

---

## 1. The CV2 Baseline -- What Exists Today

The Foundation's `consultation_v2` repo (forked to `github.com/bigdevxrd/consultation_v2`) contains:

- **Scrypto blueprints**: Governance + VoteDelegation components
- **React frontend**: TanStack Router + Vite consultation app
- **Vote collector backend**: Hono + Effect + SST
- **Database**: PostgreSQL via Drizzle ORM

The Guild's integration layer (`bot/services/consultation.js` and `bot/services/cv2-bridge.js`) reads CV2 component state via the Gateway API, caches proposals in SQLite, and exposes them through the bot and dashboard. The bridge is read-only and link-based -- it generates dashboard URLs for users to sign their own transactions. No auto-signing. No private key custody.

CV2 supports two proposal types: temperature checks (informal) and formal proposals (XRD-weighted). Both terminate at a tally. Neither triggers any on-chain execution.

The Guild already operates a parallel off-chain governance system in Telegram: 1-badge-1-vote proposals, charter parameter tracking (32 parameters across 3 phases), and a bounty marketplace with on-chain escrow. These two systems (CV2 on-chain + Telegram off-chain) are disconnected. CV3 unifies them.

---

## 2. The CV3 Pipeline -- From Decision to Delivery

CV3 introduces a five-stage pipeline. Each stage is an observable state transition with on-chain or off-chain verification:

```
PROPOSAL  -->  APPROVAL  -->  FUNDING  -->  DELIVERY  -->  VERIFICATION
(CV2/Conv)     (threshold)    (escrow)      (work)        (release)
```

### Stage 1: Proposal

A proposal enters the system through one of three channels:

- **CV2 formal proposal** -- XRD-weighted on-chain vote via the Foundation's governance component. The Guild reads this via the existing `consultation.js` polling service.
- **Conviction vote** -- Time-weighted staking via the new ConvictionVoting Scrypto component. For fund allocation proposals competing for a shared pool.
- **Charter vote** -- Off-chain Telegram vote for governance parameter changes. Escalates to formal on-chain ratification when quorum is met.

Each proposal type has a "proposal record" that includes an optional `execution_spec` field: what should happen if this proposal passes. For CV3, the execution spec describes a task (or set of tasks) to be created, funded, and verified.

### Stage 2: Approval

Approval criteria depend on the proposal channel:

| Channel | Approval Mechanism | Tier Gate |
|---------|-------------------|-----------|
| CV2 formal | XRD-weighted majority + quorum (Foundation rules) | Silver+ to create proposal |
| Conviction | Conviction crosses dynamic threshold (pool-proportional) | Bronze+ to stake, Silver+ to create |
| Charter | Community-decided thresholds (currently >50%, 3 vote min) | Bronze+ to vote, Silver+ to create |

The critical design decision: **approval does not auto-execute**. A passed proposal enters an "approved" state with an execution delay (a charter parameter, `timing.execution_delay`, defaulting to 48h). During this window, the community can challenge. This is the dispute window from the verification system design (doc 05).

### Stage 3: Funding

When the execution delay expires without successful challenge, the proposal's execution spec activates. For task-type proposals, this means:

- The ConvictionVoting component (or a new ProposalExecutor component) calls `create_task` on the TaskEscrow, moving XRD from the conviction voting pool vault into a per-task escrow vault.
- The task appears in the marketplace (bot + dashboard) with status "open".
- The task's `approval_type` is set based on the proposal spec (e.g., `pr_merged`, `multi_verify`).

This is where conviction voting's threshold function becomes essential. The threshold formula from doc 04 --

```
threshold = (rho * effective_supply) / ((1 - alpha) * (pool_balance * beta - requested)^2)
```

-- ensures that proposals requesting larger fractions of the pool need proportionally more conviction. This is self-regulating: the pool balance decreases as tasks are funded, raising the threshold for subsequent proposals. No external spending limit enforcement needed.

### Stage 4: Delivery

Standard task marketplace flow, already implemented in TaskEscrow v2:

1. Worker claims task (badge proof required -- currently any badge holder, CV3 gates to Silver+)
2. Worker does the work
3. Worker submits (PR URL, deliverable URL, or description)
4. Task enters "submitted" state

### Stage 5: Verification

The multi-layer verification system from doc 05:

- **Layer 1 (automated)**: PR merged check via GitHub API, CI passed, deliverable URL accessible
- **Layer 2 (human)**: Single verifier (current), task creator approves, working group lead, multi-sig (2 of 3 Gold-tier badge holders)
- **Layer 3 (consensus)**: Conviction-based approval by badge holders, dispute window, Gold-tier arbitration

When verification conditions are met, the bot (or a future keeper service) calls `release_task` on the escrow component. XRD flows to the worker minus the platform fee (currently 2.5%, charter-voteable up to 10%). The worker's badge gets XP. The task's completion feeds back into the worker's trust score, potentially enabling tier promotion (3+ task completions is a Gold requirement per the identity design).

---

## 3. Conviction Voting Integration with CV2

The key architectural question: how does conviction voting coexist with CV2's XRD-weighted voting?

**Answer: they serve different decision types.**

| Decision Type | Mechanism | Rationale |
|--------------|-----------|-----------|
| Fund allocation (grants, bounties) | Conviction voting | Time-weighted, anti-sybil, self-regulating pool |
| Protocol parameters (charter changes) | CV2 XRD-weighted | Foundation's system, already deployed |
| Elections (RAC seats) | CV2 with quorum | Discrete outcomes, time-bounded |
| Task verification (high-value) | Conviction staking | Badge holders signal completion approval |

The conviction voting component operates its own pool vault. This pool is funded by:
1. Direct deposits (anyone can fund the pool)
2. Charter-approved treasury allocations
3. Fee revenue sharing (portion of TaskEscrow platform fees recycled into the pool)

Proposals created in the conviction voting system are distinct from CV2 proposals. They do not live in the Foundation's Governance component. They live in the ConvictionVoting Scrypto component, which the Guild deploys and controls. The dashboard and bot display both CV2 proposals and conviction proposals, clearly labeled.

The bridge between CV2 and conviction voting is one-directional and human-mediated: a CV2 formal proposal can include in its description a recommendation to fund the conviction voting pool with a specific amount. If the CV2 proposal passes, a Gold-tier member (or the RAC when established) manually deposits the funds. There is no automated cross-component call between CV2 Governance and ConvictionVoting -- this is intentional, matching the Guild's position as a UX layer that does not override Foundation governance.

---

## 4. Task Marketplace Connection to Governance

The task marketplace today is disconnected from governance. Anyone with XRD can create a task. Anyone with a badge can claim it. CV3 introduces governance-originated tasks:

### Governance-Originated Tasks

When a conviction voting proposal passes its threshold, the execution flow is:

1. Bot detects `ProposalExecutedEvent` from the ConvictionVoting component (the component emits this when conviction crosses threshold and execution delay passes)
2. The event includes `proposal_id`, `amount`, and `beneficiary` (which may be a designated escrow account or the task creator's account)
3. The funds move from the conviction pool vault to the beneficiary automatically (this is the on-chain execution -- the ConvictionVoting component's `execute_proposal` method calls `try_deposit_or_abort`)
4. If the proposal specified a task structure, the bot (or a keeper service) creates the corresponding task in the escrow with the received funds

The critical distinction: **the ConvictionVoting component handles the financial execution (moving XRD from pool to beneficiary). The TaskEscrow handles the work management (claim, submit, verify, release).** These are two separate on-chain components that interact through the bot/keeper layer, not through direct component-to-component calls.

This separation is deliberate:
- The ConvictionVoting component does not need to know about TaskEscrow's interface
- TaskEscrow does not need to know about conviction voting
- The bot is the orchestration layer -- it reads events from both components and coordinates the workflow
- Either component can be upgraded independently

### Community-Originated Tasks

The existing flow remains: anyone deposits XRD directly into TaskEscrow to create a task. No governance approval needed. This is the "marketplace" side -- permissionless task creation for anyone willing to fund it.

CV3 adds a label distinction in the UI: "Governance Task" (originated from a passed proposal) vs "Community Task" (directly funded). Governance tasks may carry additional verification requirements based on their originating proposal.

---

## 5. Upgrade Path: CV2 to CV3

The upgrade must be non-breaking. CV2 continues to work exactly as it does today. CV3 layers new capabilities alongside it.

### Phase A: Foundation (no Scrypto changes needed)

1. **Label the existing system as CV2 in all UI surfaces.** The dashboard already separates "Guild Vote (off-chain)" from "Network Vote (on-chain)". Add a third category: "Fund Allocation (conviction)" -- initially empty, visible as "coming soon".

2. **Deploy the charter parameter `timing.execution_delay`** via a Phase 2 charter vote. This establishes the governance-approved delay between approval and execution. Default: 48h.

3. **Add execution spec field to off-chain proposals.** The SQLite `proposals` table gets new columns: `execution_type` (null, "task", "treasury", "parameter"), `execution_payload` (JSON), `execution_status` ("pending", "executed", "failed"). Off-chain proposals that pass can now specify what should happen next, even if execution is still manual.

### Phase B: ConvictionVoting Component (new Scrypto deployment)

4. **Deploy the ConvictionVoting Scrypto component** as specified in doc 04. This is a new package -- it does not modify CV2's Governance component or the existing TaskEscrow. Key features:
   - Pool vault funded by deposits
   - Proposals with requested amounts
   - Stake/unstake with badge proof and tier multiplier
   - Conviction accumulation with configurable half-life
   - Threshold crossing triggers execution (funds to beneficiary)
   - Stake receipt NFTs (following TaskReceipt pattern)

5. **Wire the bot to read ConvictionVotin
