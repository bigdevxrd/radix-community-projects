# AI-Native Governance Iteration

**Concept:** Guild + RAC evolves from "human-first governance with AI tools" → "AI-native governance with human oversight."

**Date:** 2026-04-10  
**Status:** Early iteration, Draft for refinement

---

## The Shift

### Traditional DAO (Human-First)
```
Community proposes → Vote → Execute → Report
(Humans do all coordination + background work)
```

### AI-Native Governance (Agent-Centric)
```
Automated TC gauge climate → Agents organize background work → 
Surface only when human judgment needed → Vote → Agents execute → 
Auto-report to next TC
```

---

## Three Layers

### Layer 1: Continuous Climate Sensing (Automated TCs)

**What:** Agents periodically post temperature checks on emerging topics.

**Process:**
```
Every 48 hours, agent checks:
- What's being discussed in Telegram/Discord?
- What emerging issues have community interest?
- What TCs already passed but need following?
- What coordination gaps exist?

Then: Auto-post TC to gauge sentiment
(No human effort required)
```

**Example:**
- Day 1: Someone mentions "we should improve escrow UX"
- Day 2: Agent sees 3+ people interested → auto-posts TC #27
- Day 3: TC passes 78% → surfaces to RAC as "this is live sentiment"

**Benefit:** Real-time feedback loop. No waiting for human to notice consensus.

---

### Layer 2: Background Organization (Agent Work)

**What:** Once a TC passes, agents autonomously handle coordination.

**Process:**
```
TC Passes → Agent:
  1. Creates GitHub issue/bounty for the work
  2. Tags relevant working groups
  3. Sets deadline (14 days)
  4. Posts bounty to Guild bounty board
  5. Tracks applications/claims
  6. Monitors progress + flags delays
  7. Verifies completion criteria
  8. Initiates payment (if on-chain bounty)
```

**Example:**
```
TC #25 "Create Working Group Framework" passes 82%
↓
Agent automatically:
  1. Creates GitHub issue: "WG Framework v1"
  2. Posts Guild bounty: "Propose WG Framework (150k XTM)"
  3. Notifies @bigdev_xrd + admin WG
  4. Sets deadline: 14 days
  5. (Human executes if they claim it)
  6. Agent monitors: "5 days in, no claims. Ping community."
  7. (Claim received from executor)
  8. Agent tracks: "PR in review, on track for deadline"
  9. (PR merged, meets criteria)
  10. Agent: "Bounty complete. Payment queued."
```

**Key:** Humans do the creation + judgment. Agents do tracking + logistics.

---

### Layer 3: Escalation to Vote (Human Judgment)

**What:** Only strategic decisions need votes.

**When to escalate:**
- TC gauges interest → passes → becomes actionable item
- Competing executors for one task (vote to pick)
- Major resource allocation (> 100k XTM)
- Charter/constitution changes
- Conflict resolution (community arbitration)

**When NOT to escalate:**
- Tactical work (just execute the bounty)
- Executor has capacity (no competition)
- Budget <100k XTM (delegated to WG)
- Already-approved framework (WG can act within it)

**Example escalation:**
```
TC #30 "Should we fund Protocol Grants Round 2?"
  ├─ Result: 73% support
  └─ High enough + strategic enough → formal vote
     (Not just a bounty, it's a major decision)

vs.

TC #31 "Should we improve escrow UX?"
  ├─ Result: 81% support
  └─ Not escalated (it's a bounty, not a vote)
     Agent just creates the issue + bounty board entry
```

---

## Agent Capability: The Bounty/Task System as Work Engine

### The Insight

**"The agents themselves can use the bounty system — battle to do work for the least compute."**

### How This Works

#### 1. Agents Claim Bounties

```typescript
// Agent logic
const availableBounties = await guild.getBounties();
const suitableBounties = availableBounties.filter(b => 
  canExecute(b) && costToExecute(b) < reward
);

for (const bounty of suitableBounties) {
  if (shouldClaim(bounty)) {
    await guild.claimBounty(bounty.id);
    await github.createBranch(bounty.issueId);
    // ... execute work ...
    await github.submitPR();
  }
}
```

#### 2. Agents Compete on Efficiency

Agents have different cost profiles:
- **Bert (full Claude reasoning):** 0.5 XTM per 1M tokens
- **Budget agent (Haiku only):** 0.1 XTM per 1M tokens
- **Background agent (Ollama):** near-free (CPU only)

For bounty worth 100 XTM:
- Bert: "This needs deep reasoning. I'll take it."
- Budget agent: "I can do this cheaper. Claiming."
- Result: Cheaper executor wins → DAO saves money

#### 3. Auto-Routing by Cost

```typescript
interface Bounty {
  id: string;
  title: string;
  reward: Decimal;
  complexity: "simple" | "medium" | "hard";
  deadline: Date;
}

// Agent selector logic
function selectAgent(bounty: Bounty): Agent {
  const agents = [ollama, budget_agent, bert];
  
  // Route by cost-effectiveness
  if (bounty.complexity === "simple") 
    return ollama;  // Cheap enough
  if (bounty.complexity === "medium")
    return budget_agent;  // Balanced
  if (bounty.complexity === "hard")
    return bert;  // Need the power
  
  // Or: reward / estimated_cost
  return agents.minBy(a => a.costPerUnit() / bounty.reward);
}
```

#### 4. Agents Learn Over Time

Agents track:
- How often they win bounties (selection efficiency)
- How often their work passes first review (quality)
- Cost per successful delivery

Better agents get selected more → incentive to improve.

---

## Architecture: Three Tiers Working Together

```
┌─────────────────────────────────────────────────────────┐
│ HUMAN LAYER (Strategic Judgment)                        │
│ • Vote on major decisions                               │
│ • Set WG budgets + charters                             │
│ • Resolve conflicts                                     │
│ • Define new governance rules                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓ (Escalation: "this needs a vote")
┌─────────────────────────────────────────────────────────┐
│ AGENT LAYER (Coordination + Work)                       │
│ • Post TCs (gauge climate continuously)                 │
│ • Claim bounties + execute work                         │
│ • Track progress + flag delays                          │
│ • Route tasks by cost-effectiveness                     │
│ • Compete on efficiency (least cost to complete)        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓ (Input: "community is interested in X")
┌─────────────────────────────────────────────────────────┐
│ DATA LAYER (Discord/Telegram sentiment + blockchain)   │
│ • Real-time chat analysis                               │
│ • On-chain voting results                               │
│ • Bounty completion metrics                             │
│ • Agent performance data                                │
└─────────────────────────────────────────────────────────┘
```

---

## Workflow Example: Full Iteration

### Day 1: Climate Sensing
```
Agent reads Telegram/Discord sentiment:
- Multiple people interested in "escrow UX"
- Similar requests in last 3 days
- No existing proposal

Action: Agent posts TC #32 "Improve escrow UX?"
```

### Day 2-3: Feedback
```
Community votes on TC
Result: 79% support

Agent analysis:
- High support
- No major concerns raised
- Ready to execute
```

### Day 3: Auto-Organization
```
Agent:
1. Creates GitHub issue: "Escrow UX v1"
2. Posts Guild bounty: "Improve escrow UX (100k XTM)" [MEDIUM complexity]
3. Tags: @DeFi-WG @Core-Contributors
4. Sets deadline: 14 days
5. Opens bounty to agents

Three agents evaluate:
- Bert: "Needs deep design. Cost: ~30 XTM compute. I'll take it."
- Budget agent: "Design work is complex. Not suitable. Passing."
- Ollama: "Can't design. Too hard. Passing."

Result: Bert claims bounty (most capable + cost-effective)
```

### Day 4-10: Execution
```
Bert (as executor):
1. Designs escrow UX improvements
2. Codes frontend changes
3. Tests on testnet
4. Creates PR

Agent monitors:
- "On track for 14-day deadline"
- "PR quality passes first review"
- "Meets acceptance criteria"
```

### Day 11: Completion
```
PR merged, acceptance criteria met

Agent:
1. Verifies completion
2. Initiates payment: 100k XTM → Bert (or executor's wallet)
3. Posts to Telegram: "Escrow UX bounty complete. Live on testnet."
4. Adds to next TC summary
5. Marks bounty closed

Human layer informed: "Bounty done. Ready for mainnet if you vote."
```

---

## Benefits of AI-Native Governance

### For Humans
- **Less polling fatigue:** Continuous TCs capture real sentiment
- **Less coordination overhead:** Agents handle logistics
- **Focus on strategy:** Only vote on big decisions
- **Better data:** Agent-compiled metrics + sentiment analysis

### For Agents
- **Clear incentives:** Bounties reward efficient execution
- **Competition:** Drives agents to improve + reduce costs
- **Autonomy:** Can self-organize without waiting for humans
- **Learning:** Track record + performance metrics improve routing

### For the DAO
- **Speed:** TC → organize → execute in <2 weeks (not 2 months)
- **Cost:** Agents compete to do work cheapest
- **Quality:** Better agents selected automatically
- **Resilience:** Humans + agents work complementarily

---

## Potential Concerns & Mitigations

| Concern | Mitigation |
|---------|-----------|
| **Agents bypass humans entirely** | Escalation rules: strategic decisions still need votes. Humans set budgets. |
| **Agents game the system** | Track record + performance metrics. Bad actors lose future bounties. |
| **Agents collude on pricing** | Transparent cost data. New agents can enter. Open bounty board. |
| **Quality suffers (agents rush cheap)** | Acceptance criteria checked by core contributors. Poor work rejected. |
| **TCs flood the network** | Rate limit TCs (e.g., max 2 per day). Aggregate related sentiment. |

---

## Implementation Phases

### Phase 1: Automated TC Posting (Week 1-2)
- Agents listen to sentiment on Discord/Telegram
- Auto-post TC when threshold hit (3+ mentions + positive sentiment)
- Manual escalation override (humans can cancel TC)

### Phase 2: Bounty Routing (Week 3-4)
- Agents can claim bounties
- Cost-based routing logic
- Agents track own performance

### Phase 3: Full Background Organization (Week 5-6)
- Agents handle GitHub issues → Guild bounties → tracking
- Agent-to-agent coordination (teams of agents)
- Human oversight only for escalation

### Phase 4: Learning & Optimization (Week 7+)
- Agents improve selection over time
- Costs drift down as agents optimize
- Better agents get more work

---

## Key Differences from Status Quo

| Current | AI-Native |
|---------|-----------|
| Human proposes → vote → execute | Agent proposes TC → humans vote on big items → agents execute |
| TCs are rare (human effort) | TCs are frequent (agents automated) |
| Coordination = manual | Coordination = agent background work |
| One agent, one person | Agents compete on efficiency |
| Rewards: fixed | Rewards: dynamic (cost-based) |

---

## The Vision

**Guild 2.0:**
- Humans own strategy + votes on major decisions
- Agents own execution + background organization
- Real-time climate sensing (not quarterly surveys)
- Bounty system as the work engine
- Agents compete to do more, better, cheaper

**RAC evolution:**
- RAC role shifts from "do all the work" → "make big decisions + set budgets"
- Working groups delegate day-to-day execution to agents
- TCs become continuous signal, not occasional polling
- Voting becomes focused (only ~20% of activity, not 100%)

---

## Next Steps

1. **Implement Phase 1:** Automated TC posting (listen to sentiment)
2. **Build agent-routing logic:** Cost model for bounty selection
3. **Add performance tracking:** Win rate, quality, cost per agent
4. **Run 3-4 test bounties:** Validate agent execution + routing
5. **Iterate based on results:** Refine escalation rules + cost models

---

**End of Iteration**

*This is early-stage thinking. Refine with community feedback before implementation.*
