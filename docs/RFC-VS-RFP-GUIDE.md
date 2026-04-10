# How to Write an RFC or RFP on Radix Talk

> **Easy as 1-2-3:** A complete guide for anyone who wants to propose, pitch, or fund something in the Radix ecosystem.

---

## Table of Contents

1. [State of Affairs — Radix Governance Today](#state-of-affairs)
2. [RFC vs RFP — What's the Difference?](#rfc-vs-rfp)
3. [The Full Governance Pipeline: RFC → TC → GP](#governance-pipeline)
4. [Step-by-Step: Write and Post an RFC](#write-an-rfc)
5. [Step-by-Step: Write and Post an RFP](#write-an-rfp)
6. [Templates](#templates)
7. [Best Practices](#best-practices)
8. [How the Guild and @rad_gov Help](#guild-and-rad-gov)
9. [Glossary](#glossary)

---

## State of Affairs

### Where We Are (April 2026)

The Radix ecosystem is in active transition from Foundation-led to community-led governance. Here's the current picture:

| Component | Status | Who Runs It |
|-----------|--------|-------------|
| **RadixTalk Forum** | Live | Community-run (Discourse) |
| **Consultation v2** | Live on mainnet | Radix Foundation + community |
| **RAC (Representative Advisory Council)** | Elected, operating | Community-elected members |
| **MIDAO Legal Entity** | In progress | Community + legal counsel |
| **Foundation RFPs** | Active (Gateway, Relay, Signalling) | Radix Foundation |
| **Working Group Framework** | Proposed (Daffy's charter structure) | Community-driven |
| **Guild Infrastructure** | Live ([radixguild.com](https://radixguild.com)) | bigdev / community |

### What's Happening Right Now

1. **The Foundation is decentralizing core infrastructure.** Three major RFPs have been issued for the Babylon Gateway, Signalling Server, and Connect Relay — these are paid contracts for qualified operators to take over services the Foundation currently runs.

2. **The RAC is elected and operating.** The Representative Advisory Council provides community oversight. There's an active proposal to revise the RAC mandate and schedule re-elections ([RadixTalk #2265](https://radixtalk.com/t/proposal-revised-rac-mandate-re-election/2265)).

3. **Consultation v2 (CV2) is the on-chain voting tool.** Community members lock XRD or LSUs (Liquid Staking Units) to obtain a voting badge and participate in binding governance votes ([RadixTalk #2193](https://radixtalk.com/t/consultation-v2-product-scope-document/2193)).

4. **RadixTalk is the governance forum.** All RFCs, RFPs, temperature checks, and governance discussions happen here. It's the public square of Radix governance ([RadixTalk Docs](https://radixtalk.com/docs)).

5. **The governance process is being formalized.** The community is actively defining the RFC → TC → GP pipeline ([RadixTalk #2153](https://radixtalk.com/t/process-for-rfc-tc-gp/2153)).

### How Do the Guild and @rad_gov Solve This?

The [Radix Guild](https://radixguild.com) and the [@rad_gov](https://t.me/rad_gov) Telegram bot provide coordination tooling that bridges RadixTalk governance with day-to-day community operations:

- **Badge Identity** — Free on-chain NFT badge that tracks your governance participation and XP
- **Off-Chain Voting** — Quick temperature checks and community polls via Telegram (1 badge = 1 vote)
- **On-Chain Voting Display** — CV2 proposals shown alongside community votes on one dashboard
- **Bounty Marketplace** — Fund and complete tasks with on-chain escrow (real XRD rewards)
- **Working Groups** — Badge-gated teams for Dev, Content, Governance, etc.
- **Charter Tracking** — 32 governance parameters tracked through a 3-phase dependency tree
- **Proposal Pipeline** — Create proposals in Telegram, discuss, vote, escalate to RadixTalk or CV2

The Guild doesn't replace RadixTalk — it helps you **prepare, discuss, and refine** proposals before you post them on the forum. Think of it as your governance workshop.

---

## RFC vs RFP

### At a Glance

| | **RFC** (Request for Comments) | **RFP** (Request for Proposal) |
|---|---|---|
| **Purpose** | Get feedback on an idea | Solicit bids for a specific job |
| **Stage** | Early — exploring, brainstorming | Late — ready to fund and execute |
| **Who writes it** | Anyone with an idea | Anyone who needs work done (or is bidding on work) |
| **Formality** | Informal to semi-formal | Formal and structured |
| **Outcome** | Community feedback, refined idea | Selected contractor/team, funded project |
| **Funding** | Usually not yet | Usually includes budget |
| **Binding** | No — it's a discussion | Can become binding after vote |
| **Example** | "Should we add stablecoin support to escrow?" | "Operate the Babylon Gateway — here are the specs, SLAs, and budget" |

### When to Use Each

**Write an RFC when you:**
- Have an idea that needs community input before you build it
- Want to propose a change to governance rules, processes, or standards
- Need to test community appetite before investing time in a full proposal
- Want to start a discussion about something that affects the ecosystem

**Write an RFP when you:**
- Need to hire someone or a team to do specific work
- Are bidding on infrastructure or services the Foundation or DAO needs
- Have a clearly scoped project with a defined budget, timeline, and deliverables
- Want the community to choose between competing proposals

### How They Connect

```
RFC (idea)                RFP (execution)
    │                         │
    │  "Should we do X?"      │  "Here's how I'll do X, for $Y, in Z months"
    │                         │
    ▼                         ▼
Community feedback  ──>  Refined scope  ──>  Formal proposal  ──>  Vote  ──>  Work begins
```

A typical journey:
1. You post an **RFC** on RadixTalk: "I think we need X"
2. The community discusses, refines, and shapes the idea
3. Once there's consensus, either:
   - **You** write an RFP to do the work yourself (pitch)
   - **The community/RAC** issues an RFP and you bid on it (bid)
4. The RFP goes through a temperature check (TC) and then a governance proposal (GP) vote
5. If it passes, work begins

---

## Governance Pipeline

The formal governance process on Radix Talk follows this pipeline:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    RFC       │────>│     TC      │────>│    GP/RIP   │
│  (Request    │     │ (Temp Check │     │ (Governance  │
│   for        │     │  — soft     │     │  Proposal    │
│   Comments)  │     │    poll)    │     │  — binding   │
│              │     │             │     │    vote)     │
│  Anyone can  │     │  Badge/LSU  │     │  RDA admins  │
│  post this   │     │  holders    │     │  escalate    │
│              │     │  vote       │     │  if TC passes│
└─────────────┘     └─────────────┘     └─────────────┘
```

### Stage 1: RFC (Request for Comments)
- **Who:** Anyone
- **Where:** RadixTalk forum, "Radix Community DAO" or "Governance" category
- **Duration:** Open-ended (typically 1-4 weeks of discussion)
- **What happens:** Community reads, comments, asks questions, suggests changes

### Stage 2: TC (Temperature Check)
- **Who:** Badge holders (XRD or LSU registered for governance)
- **Where:** RadixTalk (poll) and/or CV2 (on-chain)
- **Duration:** Defined period (typically 7 days)
- **What happens:** Non-binding vote to gauge community support. If support is strong, it moves to the next stage.

### Stage 3: GP (Governance Proposal) / RIP (Radix Improvement Proposal)
- **Who:** RAC or RDA (Radix DAO Administrators) escalate
- **Where:** CV2 on-chain vote
- **Duration:** Charter-defined voting period
- **What happens:** Binding vote. If it passes, the proposal is enacted.

> **Note:** Not every RFC needs to go through all three stages. Simple discussions may stay as RFCs forever. Only proposals that need formal community approval follow the full pipeline.

---

## Write an RFC

### Step 1: Prepare Your Idea

Before you write anything, answer these questions:

- [ ] **What problem am I solving?** (1-2 sentences)
- [ ] **Who does this affect?** (validators, dApp developers, token holders, everyone?)
- [ ] **Has this been discussed before?** (search RadixTalk first)
- [ ] **What am I asking the community to do?** (give feedback, vote, fund, build?)

### Step 2: Draft Your RFC

Use this structure:

```markdown
## Title: [RFC] Your Descriptive Title Here

**Author:** Your name / handle
**Date:** YYYY-MM-DD
**Category:** Governance / Infrastructure / Ecosystem / Technical
**Status:** Draft — seeking community feedback

---

### Summary
One paragraph: what you're proposing and why.

### Problem
What's broken, missing, or suboptimal? Be specific. Use examples.

### Proposed Solution
What do you want to happen? Describe the idea clearly.
Don't worry about implementation details — that comes later.

### Alternatives Considered
What other approaches exist? Why is your idea better?

### Impact
Who is affected? What changes for them?

### Open Questions
What do you need the community to help you figure out?

### References
Links to related discussions, docs, or prior art.
```

### Step 3: Post on RadixTalk

1. Go to [radixtalk.com](https://radixtalk.com)
2. Log in (create account if needed)
3. Click **"New Topic"**
4. Choose the appropriate category:
   - **Radix Community DAO** — for governance proposals
   - **Governance** — for process/rule changes
   - **General** — for broad ecosystem discussions
5. Prefix your title with `[RFC]` — e.g., `[RFC] Add stablecoin support to community escrow`
6. Paste your draft
7. **Tag relevant people** — mention the RAC, relevant working group leads, or known experts
8. Hit **Post**

### Step 4: Engage

- **Respond to every comment** within 48 hours
- **Update your RFC** based on feedback (edit the original post, add a changelog at the bottom)
- **Be open to pivots** — the community may shape your idea into something better
- **Don't take criticism personally** — tough feedback is a sign people care

### Step 5: Decide Next Steps

After 1-4 weeks of discussion, you'll typically know:
- **Strong support** → Move to Temperature Check (TC)
- **Mixed feedback** → Revise and re-post
- **No interest** → Shelve it (that's okay — not every idea is ready)
- **Someone else wants to lead it** → Hand off or collaborate

---

## Write an RFP

### When to Write an RFP

There are two scenarios:

**Scenario A — You're issuing an RFP** (you need work done):
- You (or the RAC, or the Foundation) have identified a need
- You've defined what you want built/operated/maintained
- You're looking for qualified teams or individuals to bid

**Scenario B — You're responding to an RFP** (you're bidding on work):
- Someone else issued the RFP
- You're proposing to do the work
- Your response is your pitch

Both follow similar structures but with different framing.

### Step 1: Define the Scope

Before writing, nail down:

- [ ] **What exactly needs to be done?** (specific deliverables)
- [ ] **What does success look like?** (measurable outcomes)
- [ ] **What's the budget?** (or budget range)
- [ ] **What's the timeline?** (start date, milestones, end date)
- [ ] **Who approves completion?** (RAC? community vote? automated verification?)
- [ ] **What are the requirements?** (technical skills, uptime SLAs, security standards)

### Step 2: Draft Your RFP

Use this structure:

```markdown
## Title: [RFP] Your Descriptive Title Here

**Author:** Your name / handle
**Date:** YYYY-MM-DD
**Category:** Infrastructure / Development / Operations / Services
**Status:** Open for proposals (or: Proposal submission)
**Budget:** X XRD / $X USD (or: To be proposed by bidders)
**Timeline:** Start date → End date

---

### Summary
One paragraph: what you need done and why.

### Background
Context: what exists today, what's missing, why this matters now.
Link to prior RFC discussion if applicable.

### Scope of Work
Detailed list of deliverables. Be specific:
- Deliverable 1: Description, acceptance criteria
- Deliverable 2: Description, acceptance criteria
- Deliverable 3: Description, acceptance criteria

### Requirements
What the bidder/contractor must have:
- Technical: languages, frameworks, infrastructure experience
- Operational: uptime guarantees, monitoring, support
- Track record: previous work, open source contributions

### Budget and Payment
- Total budget or budget range
- Payment structure: milestone-based, monthly, lump-sum
- Currency: XRD, stablecoin, fiat
- What happens if deliverables aren't met

### Timeline and Milestones
| Milestone | Deliverable | Target Date |
|-----------|------------|-------------|
| M1 | ... | ... |
| M2 | ... | ... |
| M3 | ... | ... |

### Evaluation Criteria
How proposals will be evaluated:
- Technical capability (weight: X%)
- Cost (weight: X%)
- Track record (weight: X%)
- Community involvement (weight: X%)

### Accountability
- How progress is reported (weekly/monthly updates)
- Where reports are posted (RadixTalk, GitHub, both)
- What happens if the contractor underperforms
- Sunset clause (when does this contract end?)

### How to Submit
- Where to post your proposal (reply to this thread / new topic)
- Deadline for submissions
- Required format

### References
Links to related discussions, specs, or prior art.
```

### Step 3: Post on RadixTalk

1. Go to [radixtalk.com](https://radixtalk.com)
2. Click **"New Topic"**
3. Choose **Governance** or **Radix Community DAO** category
4. Prefix your title with `[RFP]`
5. Paste your draft
6. Tag the RAC and relevant community members
7. Post

### Step 4: Manage the Process

If you **issued** the RFP:
- Set a clear deadline for responses
- Answer questions publicly (on the thread)
- Evaluate proposals against your stated criteria
- Post your recommendation with reasoning
- Escalate to TC → GP if funding requires community vote

If you **responded** to an RFP:
- Post your proposal as a reply or linked new topic
- Be specific about how you meet each requirement
- Include your track record and references
- Be transparent about costs

### Step 5: Move to Vote

Once the discussion period is complete:
1. Summarize the proposals received
2. Post a Temperature Check (TC) if needed
3. If TC passes, request GP escalation from the RAC/RDA
4. Binding on-chain vote via CV2
5. Winner announced, work begins

---

## Templates

### RFC Template (Copy-Paste Ready)

```
## [RFC] Your Title Here

**Author:** @your_handle
**Date:** YYYY-MM-DD
**Status:** Draft — seeking feedback

---

### Summary
[One paragraph: what and why]

### Problem
[What's broken or missing? Be specific.]

### Proposed Solution
[What should happen? Describe clearly.]

### Alternatives Considered
[Other approaches and why this one is better]

### Impact
[Who is affected and how]

### Open Questions
1. [Question for the community]
2. [Question for the community]

### References
- [Link to related discussion]
- [Link to prior art]
```

### RFP Template (Copy-Paste Ready)

```
## [RFP] Your Title Here

**Author:** @your_handle
**Date:** YYYY-MM-DD
**Budget:** X XRD / $X USD
**Timeline:** MM/YYYY → MM/YYYY
**Status:** Open for proposals

---

### Summary
[One paragraph: what needs to be done and why]

### Background
[Context and motivation]

### Scope of Work
1. **Deliverable 1:** [Description + acceptance criteria]
2. **Deliverable 2:** [Description + acceptance criteria]
3. **Deliverable 3:** [Description + acceptance criteria]

### Requirements
- [Technical requirement]
- [Operational requirement]
- [Experience requirement]

### Budget and Payment
- Total: [amount]
- Structure: [milestone / monthly / lump sum]
- Withholding: [what happens if deliverables aren't met]

### Milestones
| # | Deliverable | Date | Payment |
|---|------------|------|---------|
| 1 | ... | ... | ... |
| 2 | ... | ... | ... |

### Evaluation Criteria
- Technical capability: X%
- Cost: X%
- Track record: X%

### Accountability
- Reporting: [frequency and format]
- Review body: [RAC / community / working group]
- Sunset: [end date, renewal process]

### How to Respond
- Reply to this thread or post a linked topic with `[RFP Response]` prefix
- Deadline: [date]

### References
- [Links]
```

---

## Best Practices

### DO ✅

1. **Search RadixTalk first.** Your idea may already be under discussion. Join that thread instead of starting a new one.
2. **Start with an RFC.** Even if you already know what you want to build, the community discussion will make your proposal stronger.
3. **Be specific.** Vague proposals get vague feedback. "Improve governance" means nothing. "Add a 72-hour minimum discussion period before any binding vote" is actionable.
4. **Show your work.** If you're proposing to do something, demonstrate that you can. Link to your GitHub, previous projects, deployed code, or track record.
5. **Include a budget.** Don't make people guess. Even a rough range helps. "This will cost between 50K-100K XRD" is better than "funding TBD."
6. **Set a timeline.** Every proposal should have milestones and an end date. Open-ended proposals die of neglect.
7. **Name a responsible person.** Someone must be accountable. "The community will manage this" means nobody will.
8. **Respond to feedback quickly.** Engagement begets engagement. If you go dark for a week, your thread goes cold.
9. **Update your original post.** When you revise based on feedback, edit the top post and add a changelog. Don't bury changes in comment replies.
10. **Frame closure as success.** If your RFC doesn't get support, that's valuable information. Thank the community and move on.

### DON'T ❌

1. **Don't post and ghost.** If you start a discussion, you own it. Respond to every substantive comment.
2. **Don't be vague about money.** "We need funding" without a number is a red flag. Specify amounts, payment schedules, and what happens if milestones aren't met.
3. **Don't skip the RFC stage.** Jumping straight to an RFP without community discussion looks like you're trying to bypass governance.
4. **Don't duplicate efforts.** If someone is already working on something similar, collaborate instead of competing.
5. **Don't take votes personally.** A "no" vote is feedback, not an attack.
6. **Don't use jargon without explanation.** Not everyone knows what CV2, LSU, ROLA, or RAC means. Define terms or link to a glossary.
7. **Don't request perpetual funding.** Time-box everything. 6 months max, with renewal requiring a new vote.
8. **Don't self-authorize scope expansion.** If your project grows beyond the original RFP, go back to the community for approval.

### Pitching Tips

When you're trying to convince the community to support your proposal:

- **Lead with the problem, not the solution.** People fund problems they recognize, not solutions they don't understand.
- **Show, don't tell.** A working demo beats a 20-page spec. Link to live code, deployed contracts, or a prototype.
- **Be honest about risks.** "This might not work because X, and here's my contingency plan" builds trust.
- **Propose accountability.** "If I don't deliver by [date], stop payment and fork the code" shows confidence.
- **Compare to alternatives.** "Here's what other ecosystems did, here's what worked, here's what I learned from their mistakes."
- **Keep it short.** If your proposal is more than 2 pages, add a TL;DR at the top. Nobody reads 10-page proposals in full.

---

## Guild and @rad_gov

### How the Guild Helps You Write Better Proposals

The [Radix Guild](https://radixguild.com) and the [@rad_gov](https://t.me/rad_gov) Telegram bot are tools that help you prepare, test, and refine your ideas **before** you post on RadixTalk.

#### Before You Post Your RFC

1. **Mint a badge** at [radixguild.com/mint](https://radixguild.com/mint) — free, gives you governance participation rights in the Guild
2. **Join a working group** — find people interested in your topic (`/groups` in the bot)
3. **Run a temperature check in Telegram** — use `/propose "Your idea here"` to get instant community feedback
4. **Refine based on feedback** — iterate in real-time chat before committing to a formal RadixTalk post
5. **Check the charter** — use `/charter` to see which governance parameters are resolved and which need votes

#### After You Post Your RFC/RFP

1. **Cross-post to Telegram** — share the RadixTalk link in the relevant working group chat
2. **Track votes** — if your proposal advances to a vote, the Guild dashboard shows results alongside other governance activity
3. **Fund it via bounty** — if your RFP is approved, create a bounty with on-chain escrow at [radixguild.com/bounties](https://radixguild.com/bounties)
4. **Report progress** — use `/wg report` to post structured updates that the RAC can review

#### Bot Commands for Governance

| Command | What It Does |
|---------|-------------|
| `/propose "title"` | Create a community proposal (temperature check) |
| `/vote <id> yes/no` | Vote on an active proposal |
| `/proposals` | List all active proposals |
| `/charter` | See the full charter parameter status (32 decisions) |
| `/cv2` | View on-chain CV2 governance proposals |
| `/groups` | List working groups you can join |
| `/badge` | Check your badge, tier, and XP |
| `/bounty` | Browse available bounties |

### The Workflow

```
   YOUR IDEA
      │
      ▼
┌─────────────────┐
│  Guild / TG Bot  │  ◄── Test your idea here first
│  Quick feedback   │      /propose, /groups, chat
└────────┬────────┘
         │
         │  Refined idea
         ▼
┌─────────────────┐
│   RadixTalk      │  ◄── Post your formal RFC/RFP
│   [RFC] or [RFP] │      Community discussion
└────────┬────────┘
         │
         │  Community support
         ▼
┌─────────────────┐
│   TC / GP Vote   │  ◄── Temp Check → Governance Proposal
│   CV2 on-chain   │      Binding vote if needed
└────────┬────────┘
         │
         │  Approved
         ▼
┌─────────────────┐
│   Execution      │  ◄── Create bounty, fund escrow
│   Guild Bounties │      Track progress, report to RAC
└─────────────────┘
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **RFC** | Request for Comments — early-stage discussion document seeking community feedback |
| **RFP** | Request for Proposal — formal document soliciting bids for specific, usually funded work |
| **TC** | Temperature Check — non-binding community poll to gauge support |
| **GP** | Governance Proposal — formal, binding governance vote |
| **RIP** | Radix Improvement Proposal — alternate name for a formal governance proposal |
| **CV2** | Consultation v2 — on-chain governance voting mechanism on Radix mainnet |
| **RAC** | Representative Advisory Council — elected community oversight body |
| **RDA** | Radix DAO Administrator — admins who can escalate TCs to formal GPs |
| **LSU** | Liquid Staking Unit — derivative token from staking XRD to a validator |
| **XRD** | The native token of the Radix network |
| **MIDAO** | The DAO LLC legal entity being established for the Radix community |
| **ROLA** | Radix Off-Ledger Authentication — cryptographic proof of wallet control |
| **Badge** | On-chain NFT representing governance membership and participation |
| **Escrow** | On-chain smart contract that holds funds until work is verified |
| **Working Group** | Chartered team focused on a specific area (Dev, Content, Governance, etc.) |

---

## Real-World Examples

### Foundation RFPs (Live Examples)

These are the gold standard for how a professional RFP looks on Radix:

1. **[Foundation RFP: Babylon Gateway](https://radixtalk.com/t/foundation-rfp-babylon-gateway/2202)** — Operate the main API layer for wallets, explorers, and dApps. Specifies uptime SLAs, database sizes, DDoS protection requirements.

2. **[Foundation RFP: Connect Relay](https://radixtalk.com/t/foundation-rfp-connect-relay/2203)** — Operate the mobile-to-mobile connection relay for the Radix Wallet. Details message throughput, privacy requirements, and session handling.

3. **[Foundation RFP: Signalling Server](https://radixtalk.com/t/foundation-rfp-signalling-server/2204)** — Operate the WebRTC signalling service. Specifies latency requirements (<300ms), privacy-by-design, and Redis-backed stateless architecture.

> **Key takeaway:** These RFPs succeed because they are **specific** — exact uptime numbers, exact technical requirements, exact evaluation criteria. Copy this level of detail.

### Community Governance Discussions (Live Examples)

1. **[Process for: RFC → TC → GP](https://radixtalk.com/t/process-for-rfc-tc-gp/2153)** — The community discussion on formalizing the governance pipeline itself.

2. **[Consultation v2 Product Scope](https://radixtalk.com/t/consultation-v2-product-scope-document/2193)** — The scope document for the on-chain voting mechanism.

3. **[Revised RAC Mandate / Re-election](https://radixtalk.com/t/proposal-revised-rac-mandate-re-election/2265)** — Proposal to update RAC terms and schedule new elections.

---

## Quick Start Checklist

### "I have an idea" → Write an RFC

- [ ] Search RadixTalk for existing discussions
- [ ] Draft using the [RFC template](#rfc-template-copy-paste-ready)
- [ ] Test the idea in the Guild Telegram first (`/propose`)
- [ ] Post on RadixTalk with `[RFC]` prefix
- [ ] Respond to all comments within 48 hours
- [ ] Update your post based on feedback
- [ ] Decide next steps: TC, revise, or shelve

### "I want to do/fund specific work" → Write an RFP

- [ ] Ensure an RFC discussion has happened (or start one)
- [ ] Define specific deliverables, budget, and timeline
- [ ] Draft using the [RFP template](#rfp-template-copy-paste-ready)
- [ ] Include evaluation criteria and accountability measures
- [ ] Post on RadixTalk with `[RFP]` prefix
- [ ] Set a clear deadline for responses
- [ ] Evaluate proposals and post recommendation
- [ ] Escalate to TC → GP for community vote

---

*Written for the Radix community. Maintained in the [radix-community-projects](https://github.com/bigdevxrd/radix-community-projects) repo. PRs welcome.*

*Last updated: April 2026*
