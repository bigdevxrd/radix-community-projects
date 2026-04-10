# DAO Governance Knowledge Base

**Purpose:** Comprehensive reference for RAC/Radix DAO governance architecture, ranked-choice voting, execution frameworks, and scaling patterns.

**Last Updated:** 2026-04-10  
**Scope:** RAC governance design, Guild platform roadmap, executor accountability, best practices from leading DAOs

---

## Table of Contents

1. [RAC Governance Framework](#rac-governance-framework)
2. [Ranked-Choice Voting Architecture](#ranked-choice-voting-architecture)
3. [Executor Accountability Model](#executor-accountability-model)
4. [Governance Parameters & Tuning](#governance-parameters--tuning)
5. [Best Practices from Leading DAOs](#best-practices-from-leading-daos)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Integration Checklist](#integration-checklist)

---

## RAC Governance Framework

### Context

**Foundation Status:** Radix Foundation winding down as expected → governance transitioning to community-owned DAO.

**RAC (Radix Accountability Council):** Facilitators + execution coordinators, NOT decision-makers. Community votes; RAC coordinates delivery.

### Problem Statement

**Voting without execution = theater.**

Current bottleneck:
- Community CAN vote on anything
- But voting for "do X" without named executor = not a real proposal
- At end of day, **someone has to actually do the work**
- Without execution commitment, nothing happens

### Solution: Executor-First Proposals

Every proposal must include:
- **Who will execute** (person/team/group name)
- **What the work is** (scope, deliverables)
- **When it will be done** (timeline)
- **How success is measured** (KPIs, milestones)

Without these, proposal is **not actionable** — voting is meaningless.

### RAC Decision Checklist

Before voting on any proposal, RAC/community should verify:

```
□ Is there a named executor (person/team)?
□ Has the executor explicitly committed to this scope?
□ Are deliverables clearly defined?
□ Is timeline realistic given executor's bandwidth?
□ Are success metrics measurable?
□ Does "No action" option exist (to vote against)?
□ Has executor published a work plan publicly?
```

If any of these is NO → **proposal is not ready for voting.**

---

## Ranked-Choice Voting Architecture

### Why Ranked-Choice?

**Current system (binary TC → proposal):**
- ✅ Simple (yes/no)
- ❌ Doesn't capture preference nuance
- ❌ Can't rank competing execution teams
- ❌ "False choice" problem (spend 10M or 20M, no option for 0)

**Ranked-choice system:**
- ✅ Voters express full preference order
- ✅ Can rank competing executors by quality/trust
- ✅ Eliminates polarization (find consensus option)
- ✅ Prevents "no valid option" scenarios

### Voting Methods Comparison

| Method | How It Works | Best For | Pros | Cons |
|--------|-------------|----------|------|------|
| **Borda Count** | Points per position (1st=3pts, 2nd=2pts, 3rd=1pt) | Consensus building | Simple to tally, fair weighting | Doesn't eliminate worst option |
| **Condorcet** | Pairwise matchups (which option beats all others?) | Finding true winner | Most "fair" voting | Complex, may not converge |
| **Instant Runoff (IRV)** | Eliminate lowest, recount with 2nd choices | Single-winner elections | Intuitive, prevents vote splitting | Can be confusing at scale |
| **Approval Voting** | Vote for all acceptable options | Budget allocation | Simple, scales well | Not full ranking |

### Recommendation for RAC

**Use Instant Runoff (IRV) + Borda hybrid:**
1. **Primary tally:** IRV (find winner option)
2. **Secondary display:** Borda scores (show preference distribution)
3. **Executor ranking:** Separate Borda count for competing executor teams

**Why:**
- Easy to explain (voters understand "eliminate lowest")
- Captures full preference data (can show Borda breakdown)
- Works for both options AND executor selection
- Prevents "spoiler" scenarios (vote splitting)

### Implementation Approach

#### On-Chain (Scrypto)
```rust
// New vote struct
struct RankedVote {
    voter: ComponentAddress,
    option_rankings: Vec<(OptionId, u8)>,  // [(option_1, rank_1), (option_2, rank_2), ...]
    executor_rankings: Vec<(ExecutorId, u8)>,
    timestamp: i64,
    voting_power_xrd: Decimal,
}

// Tally method
pub fn tally_ranked_vote(vote: RankedVote) -> RankedResult {
    // Return: IRV winner + Borda scores for all options
    // Return: top 3 executors by Borda score
}
```

#### Off-Chain (Vote Collector)
```typescript
// Instant runoff elimination
function instantRunoffTally(votes: RankedVote[]): {
  winner: OptionId,
  bordaScores: Map<OptionId, number>,
  rounds: EliminationRound[]
}

// Borda count for executors
function executorRanking(votes: RankedVote[]): {
  topExecutors: ExecutorRanking[],
  scores: Map<ExecutorId, number>
}
```

#### Frontend (Consultation dApp)
```typescript
// Drag-to-rank UI
<RankingInterface
  options={proposal.options}
  executors={proposal.executors}
  onRankChange={handleRankUpdate}
/>

// Results display
<ResultsPanel
  irvWinner={result.winner}
  bordaScores={result.bordaScores}
  executorRanking={result.executors}
  eliminationRounds={result.rounds}
/>
```

---

## Executor Accountability Model

### Why This Matters

**Insight from flightofthefox:**
> "The community can't just vote to 'do another rewards season'. That's not a real proposal. If there's no names attached — it's not real."

**Translation:** Voting power without execution commitment = governance theater.

### Executor Registry

Create on-chain record of who executes what:

```typescript
interface ExecutorProfile {
  id: string;
  name: string;
  radix_address: ComponentAddress;
  bio: string;
  
  // Track record
  completed_proposals: ProposalId[];
  failed_proposals: ProposalId[];
  execution_rate: number;  // % completed on time
  
  // Trust metrics
  trust_score: "bronze" | "silver" | "gold";  // Based on history
  total_xrd_executed: Decimal;
  avg_delivery_days: number;
  
  // Current commitments
  active_proposals: ProposalId[];
  bandwidth_available: string;  // "Full-time", "Part-time", etc.
}
```

### Pre-Vote Verification

Before voting opens, system should verify:

```typescript
interface ProposalReadiness {
  id: ProposalId;
  
  // Executor validation
  executor_exists: boolean;
  executor_has_capacity: boolean;
  executor_public_commitment: boolean;  // Did they sign off?
  executor_trust_score: "bronze" | "silver" | "gold";
  
  // Scope validation
  deliverables_defined: boolean;
  timeline_realistic: boolean;
  success_metrics_measurable: boolean;
  
  // Safeguards
  no_action_option_exists: boolean;
  
  overall_readiness: "ready" | "needs_work";
}
```

### Reputation System

Track executor performance across proposals:

```typescript
interface ExecutorMetrics {
  total_proposals: number;
  on_time_delivery: number;
  under_budget: number;
  user_satisfaction: number;  // 1-5 rating from community
  
  // Penalty/reward
  missed_deadlines: number;
  failed_delivery: number;
  
  // Computed trust score
  trust_percentile: 0-100;  // Compared to other executors
}
```

**Public dashboard:** Show executor trust scores, execution history, pending commitments. Community can decide "do I trust this team to execute?"

---

## Governance Parameters & Tuning

### V2 dApp Required Decisions

From Adam (CSO, Radix Foundation):

#### 1. Governance Parameters (Tunable via component)

```typescript
interface GovernanceConfig {
  // Temperature Check phase
  temperature_check: {
    quorum_xrd: Decimal,        // Min voting XRD needed for TC to be valid
    approval_threshold_pct: u8,  // % voting "for" to advance to proposal (e.g., 50%)
    duration_minutes: u32,       // Voting window (e.g., 1440 = 1 day)
  },
  
  // Proposal phase
  proposal: {
    quorum_xrd: Decimal,        // Min voting XRD for proposal to be valid
    approval_threshold_pct: u8,  // % voting for winning option (e.g., 66%)
    duration_minutes: u32,       // Voting window (e.g., 5040 = 3.5 days)
  },
}
```

#### 2. Parameter Tuning Guidance

| Parameter | Recommended Range | Rationale |
|-----------|-------------------|-----------|
| TC quorum | 100k - 500k XRD | High enough to filter spam, low enough for grassroots proposals |
| Proposal quorum | 500k - 2M XRD | Binding decisions need higher bar than TC |
| TC threshold | 40-50% | Simple majority for early filtering |
| Proposal threshold | 60-66% | Supermajority for final execution |
| TC duration | 1-3 days | Quick sensing, not forever |
| Proposal duration | 3-7 days | Reasonable time to deliberate + vote |

**Why these ranges?**
- Too high quorum → governance paralysis
- Too low quorum → spam/frivolous proposals
- Too low threshold → tyranny of 50%+1
- Too high threshold → impossible consensus

### 3. Additional Rules (Operating Agreement)

From Adam: These are enforced **off-chain in RMI DAO LLC operating agreement**, not smart-contract rules.

**Mandatory rules:**

```
1. Every proposal MUST include "No action" option
   - Prevents false choices (forced pick between bad options)
   - Allows community to reject all options
   - Must have rank equal to other options (not hidden)

2. Every proposal MUST name an executor
   - Cannot be abstract ("community decides")
   - Must include executor's public commitment
   - Executor must have signed proposal text

3. Every proposal MUST define success metrics
   - How will we know if executed successfully?
   - What are measurable deliverables?
   - What's the timeline?

4. Every proposal MUST disclose conflicts of interest
   - Does executor have financial stake?
   - Does this benefit executor personally?
   - Must be transparent to voters

5. Ranked voting MUST eliminate worst option each round
   - Don't just count points; show elimination process
   - Helps voters understand how winner emerged
   - Builds consensus vs. polarization
```

**Optional rules RAC can add:**
- Minimum executor trust score required (e.g., must be "silver" or above)
- Budget caps per proposal type
- Veto rights for certain categories (e.g., legal matters)
- Cooling-off period between proposal submission and voting

---

## Best Practices from Leading DAOs

### Lessons from MakerDAO, Aave, Uniswap, Curve

#### 1. Multi-Sig for Execution, DAO for Direction

**Pattern:** DAO votes on direction; trusted multi-sig team executes with discretion.

**Why:** Prevents every execution detail from needing a vote (too slow).

**For RAC:**
- DAO votes "fund rewards season with $X"
- Named executor team gets allocated funds
- Multi-sig release funds to executor on milestones (not all upfront)

#### 2. Delegate Voting Power (Don't Require Everyone to Vote)

**Pattern:** Token holders delegate voting power to trusted representatives.

**Why:** Not everyone can stay informed on every proposal; allows specialization.

**For Radix DAO:**
- Implement delegation in CV2 smart contract
- Show delegate's voting record publicly (transparency)
- Voters can re-delegate anytime (not locked)

#### 3. Progressive Decentralization

**Pattern:** Start with core team making decisions, gradually hand over to DAO.

**Timeline:**
- Phase 1 (Month 1-3): Foundation makes decisions, DAO votes advisory only
- Phase 2 (Month 4-6): ~50% DAO decisions, ~50% Foundation veto power
- Phase 3 (Month 7+): Full DAO control, Foundation advisory only

**For Radix:**
- RAC starts as facilitators + execution coordinators
- Gradually RAC becomes purely execution (voting is 100% community)

#### 4. Execution Teams as Subdelegates

**Pattern:** Elected execution teams can create sub-proposals (voting not required for every detail).

**Why:** Prevents "proposal bloat" (1000 tiny votes for 1 big initiative).

**Example:**
```
Proposal: "Fund 2026 Rewards Season ($500k)"
  ├─ Vote: YES
  └─ Executor team (Octo + Stelea) can sub-allocate:
      ├─ $100k to XRD liquidity rewards
      ├─ $150k to validator rewards
      ├─ $150k to ecosystem grants
      └─ $100k to marketing
      (Details NOT voted, within approved budget)
```

#### 5. Voting Quorum ≠ Participation Floor

**Pattern:** Low quorum (e.g., 10% voting), high threshold (e.g., 66% approval).

**Why:**
- Low quorum: Enables governance even if many don't vote
- High threshold: Ensures strong majority when they DO vote
- Together: Prevents "tyranny of the few" + "apathy paralysis"

**For Radix:** Keep quorum ~1-2% of total LSU, but require 2/3 approval.

#### 6. Time-Locked Execution

**Pattern:** Proposal passes → 2-7 day delay before execution → community can veto.

**Why:** Prevents flash-loan attacks, gives community time to react.

**For Radix:** Implement in executor release (multi-sig releases funds in tranches, not lump sum).

#### 7. Budget Caps by Proposal Type

**Pattern:** Different categories have different spend limits.

**Example:**
```
Small grant: <$50k → Simplified voting (1 day, 50% quorum)
Medium grant: $50k-$500k → Standard voting (3-5 days, 1M XRD quorum)
Large grant: >$500k → Strict voting (7 days, 2M XRD quorum)
Constitutional: Governance rules → Supermajority + longer
```

#### 8. Retroactive Funding (RFRP = Requests for Retroactive Proposals)

**Pattern:** "Build first, DAO funds after" (de-risks execution uncertainty).

**Process:**
1. Team executes work with own capital or grant
2. Submits "RFRP" with results
3. Community votes to reimburse if satisfied

**For Radix:** Useful for smaller initiatives (rewards, events).

#### 9. Snapshot (Off-Chain Voting) for Sentiment, On-Chain for Binding

**Pattern:** Two-phase voting reduces governance overhead.

**Process:**
1. **Snapshot vote (free, off-chain):** Gauge community sentiment
2. **If passes Snapshot:** Advance to **on-chain vote (costs gas, binding)**

**For Radix:** Could use CV2 for both phases, but Snapshot-first pattern = faster iteration.

#### 10. Post-Mortem Reports for Failed Proposals

**Pattern:** When execution fails, executor publishes detailed report.

**Why:** Community learns what went wrong, improves future proposals.

**For Radix:** Executor reputation system should track failed proposals + public explanations.

---

## Implementation Roadmap

### Phase 1: Governance Foundation (Weeks 1-4)

**Deliverables:**
- [ ] Canonical governance component (use Timan's setup + transfer owner badge to RAC)
- [ ] Governance parameters decided + locked in component
- [ ] Operating agreement drafted (including "No action" mandate)
- [ ] Executor registry deployed (on-chain profile system)
- [ ] Trust score calculation (bronze/silver/gold based on history)

**Owners:** RAC (governance) + Timan (component)

**Votes Required:**
1. Accept canonical component address
2. Set governance parameters (quorum, thresholds, durations)
3. Approve operating agreement rules

### Phase 2: Ranked-Choice Voting (Weeks 5-8)

**Deliverables:**
- [ ] Scrypto blueprint: ranked vote struct + IRV/Borda tally
- [ ] Vote Collector: IRV elimination + Borda score calculation
- [ ] Consultation dApp: drag-to-rank UI + results visualization
- [ ] Test suite: 20+ ranked voting scenarios on testnet

**Owners:** Bert (Scrypto) + Guild team (off-chain + frontend)

**Testing:**
- Sanity checks: Single option → multi-option
- Edge cases: Tied votes, exhausted ballots
- Scale: 1k voters × 5 options (performance)

### Phase 3: Executor Accountability (Weeks 9-12)

**Deliverables:**
- [ ] Executor profile component (on-chain track record)
- [ ] Reputation dashboard (public executor scores + history)
- [ ] Proposal readiness checker (pre-vote verification)
- [ ] Milestone-based fund release (multi-sig tranches)

**Owners:** RAC (standards) + Guild team (implementation)

**Metrics:**
- Executor registration rate
- On-time delivery rate
- Community satisfaction scores

### Phase 4: Scaling & Optimization (Weeks 13-16)

**Deliverables:**
- [ ] Delegation system (vote power → trusted representatives)
- [ ] Sub-proposal framework (executor teams allocate within budget)
- [ ] Time-locked execution (2-7 day delay before funds released)
- [ ] Snapshot integration (optional: off-chain sentiment pre-voting)

**Owners:** Guild team + Radix core

**Load Testing:**
- 10k concurrent voters
- 50 proposals in flight
- Delegation chains (voter → delegate → sub-delegate)

---

## Integration Checklist

### Before Launch

#### Governance Design
- [ ] Operating agreement finalized + reviewed by legal
- [ ] Quorum/threshold parameters chosen
- [ ] "No action" option rule documented
- [ ] Executor profile standards defined
- [ ] Conflict-of-interest disclosure template created

#### Smart Contracts
- [ ] Canonical governance component deployed + tested
- [ ] Ranked vote struct implemented + audited
- [ ] IRV/Borda tally logic verified (mathematically sound)
- [ ] Executor registry live + historical data backfilled
- [ ] Trust score calculation working

#### Off-Chain Systems
- [ ] Vote Collector tally engine tested (1k+ voters)
- [ ] Proposal readiness checker integrated
- [ ] Executor metrics pipeline running
- [ ] Gateway polling confirmed stable
- [ ] Database migrations applied

#### Frontend
- [ ] Rank voting UI tested (drag, keyboard, mobile)
- [ ] Results visualization (IRV rounds, Borda breakdown)
- [ ] Executor profiles displayed with trust scores
- [ ] Proposal readiness status shown before voting
- [ ] Accessibility audit completed

#### Community
- [ ] How-to-vote guide published
- [ ] Executor registration open + promoted
- [ ] First proposals submitted (test cases)
- [ ] RAC chair + voting procedures finalized
- [ ] Community education session held

#### Monitoring
- [ ] Prometheus metrics for vote counts
- [ ] AlertManager for proposal deadlines
- [ ] Error logs for tally failures
- [ ] Dashboard for executor compliance
- [ ] Alerting if participation < quorum

#### Legal/Compliance
- [ ] DAO operating agreement signed
- [ ] RMI DAO LLC formation complete
- [ ] Tax classification confirmed
- [ ] Insurance reviewed (if applicable)
- [ ] Conflict of interest policies published

### Post-Launch (First 3 Months)

- [ ] Run 5-10 test proposals (all categories)
- [ ] Gather executor feedback + iterate
- [ ] Monitor participation rates vs. quorum
- [ ] Collect community feedback on voting UX
- [ ] Measure on-time delivery rate
- [ ] Adjust parameters if needed (via proposal)

---

## Key References

### On-Chain Governance
- **Uniswap Governance:** https://governance.uniswap.org (delegation, time-locks)
- **Aave Governance V2:** https://docs.aave.com/governance (risk frameworks, proposition power)
- **Maker Governance:** https://makerdao.com/governance (parameter tuning, risk management)

### Ranked-Choice Voting
- **Condorcet Voting:** https://en.wikipedia.org/wiki/Condorcet_method
- **Instant Runoff Voting:** https://en.wikipedia.org/wiki/Instant-runoff_voting
- **Borda Count:** https://en.wikipedia.org/wiki/Borda_count
- **The Handbook of Voting:** Academic reference on voting systems

### DAO Best Practices
- **Snapshot (Voting Platform):** https://snapshot.org (off-chain voting tool)
- **Curve DAO Governance:** https://resources.curve.fi/governance/governance-overview
- **Lido DAO:** https://lido.fi/governance (validator coordination)

### Executor Accountability
- **Gitcoin Grants:** https://grants.gitcoin.co (retroactive funding, transparent allocation)
- **Optimism RetroPGF:** https://retrofunding.optimism.io (RFRP patterns)

### Legal
- **RMI DAO LLC Formation:** https://www.rmi.org (US-based DAO legal wrapper)
- **Lexon Smart Contracts:** https://lexon.tech (smart contract language)

---

## Decision Matrix: "Should This Be On-Chain or Off-Chain?"

| Decision Type | On-Chain | Off-Chain | Why |
|---------------|----------|-----------|-----|
| Vote counting | ✅ | ❌ | Immutable, auditable, atomic |
| Voting power tracking | ✅ | ❌ | Must be source of truth |
| Parameter tuning | ✅ | ❌ | Affects smart contract behavior |
| Executor trust scores | ⚠️ | ✅ | Can recalculate off-chain from history; optional on-chain cache |
| Proposal metadata | ❌ | ✅ | Doesn't need immutability; update flexibility helps |
| Execution milestones | ⚠️ | ✅ | On-chain: auto-verify (if deterministic); off-chain: judgement (if subjective) |
| Delegation | ✅ | ❌ | Voting power transfer must be atomic |
| Proposal approval | ✅ | ⚠️ | On-chain: binding execution; off-chain: sentiment only |

---

## Quick Decision Tree

```
"Can we vote on this?"
├─ YES
│  ├─ "Is there a named executor?"
│  │  ├─ YES → "Has executor committed publicly?"
│  │  │  ├─ YES → "Is there a 'No action' option?"
│  │  │  │  ├─ YES → READY TO VOTE ✅
│  │  │  │  └─ NO → ADD NO ACTION OPTION ⚠️
│  │  │  └─ NO → REQUEST EXECUTOR COMMITMENT ⚠️
│  │  └─ NO → FIND EXECUTOR FIRST ⚠️
└─ NO (executor problem)
   └─ NOT A REAL PROPOSAL ❌ (voting theater)
```

---

## Appendix: Template Documents

### Operating Agreement Excerpt (Required Clauses)

```markdown
## Section 4: Governance Rules

### 4.1 Proposal Requirements
Every proposal submitted to the DAO MUST include:
- (a) Named executor (person or team)
- (b) Executor's public written commitment
- (c) Scope of work (deliverables)
- (d) Timeline with milestones
- (e) Success metrics (how we measure if executed well)
- (f) "No action" option (always included, ranked equally)

### 4.2 Executor Accountability
- Executors must publish delivery reports
- Community can vote to replace executor mid-proposal
- Failed proposals documented publicly
- Trust scores computed from historical data

### 4.3 Ranked Voting
- All proposals use instant runoff voting
- Worst option eliminated each round
- Community sees elimination process
- Borda scores shown for preference distribution
```

### Executor Profile Template

```json
{
  "id": "executor-octo-001",
  "name": "Octo",
  "radix_address": "account_rdx1...",
  "bio": "Radix community lead, 5+ years in DeFi governance",
  "completed_proposals": 12,
  "failed_proposals": 0,
  "execution_rate": 1.0,
  "trust_score": "gold",
  "total_xrd_executed": "2500000",
  "avg_delivery_days": 18.5,
  "active_proposals": [
    { "id": "prop-rewards-2026-001", "status": "In Progress" }
  ],
  "bandwidth_available": "Full-time"
}
```

---

## Next Steps

1. **Share with RAC:** This framework is input for RAC's first formal decisions
2. **Iterate with community:** Open feedback period on governance parameters
3. **Start Phase 1:** Canonical component + parameter setting
4. **Build Phase 2:** Ranked voting implementation
5. **Validate:** Test with 10-20 proposals before mainnet-wide rollout

---

**End of Knowledge Base**

*This document is living. Update as RAC makes decisions and Radix governance evolves.*
