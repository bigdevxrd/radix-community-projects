# Complete Decision Tree — Radix Governance

> 32 charter parameters + 15 structural decisions + 10 RadixTalk RFCs = ~57 total issues
> Status: 0 resolved, 6 Phase 1 voting, 20 Phase 2 pending, 6 Phase 3 pending, 15 structural

---

## How It Works

The charter isn't one vote. It's the OUTPUT of resolving 32+ individual parameters.
Each parameter is a temp check or poll. When all params in a phase are resolved,
the next phase unlocks. When Phase 3 completes, the charter is "adopted" — meaning
every rule has been decided by the community.

```
PHASE 1: FOUNDATION (6 params — must resolve first)
  │
  ├─ charter.adoption ............... Should we even have a charter? (Yes/No)
  ├─ rac.seats ...................... How many RAC seats? (3/5/7/9)
  ├─ voting.quorum.standard ........ Min votes for validity? (3/10/25/50)
  ├─ voting.period.standard ........ How long do votes last? (48h/72h/7d)
  ├─ voting.approval.standard ...... What % to pass? (>50/>60/>67%)
  └─ voting.approval.amendment ..... What % to amend charter? (>60/>67/>75%)
      │
      ▼
PHASE 2: CONFIGURATION (20 params — unlock after Phase 1)
  │
  ├─ RAC Operations
  │   ├─ rac.multisig .............. Multi-sig threshold for RAC?
  │   ├─ rac.meetings .............. How often does RAC meet?
  │   ├─ rac.inactivity ............ Missed meetings before review?
  │   └─ rac.compensation .......... Should RAC members be paid?
  │
  ├─ Voting Rules
  │   ├─ voting.period.amendment ... How long for amendment votes?
  │   ├─ voting.period.emergency ... How long for emergency votes?
  │   ├─ voting.period.election .... How long for elections?
  │   ├─ voting.quorum.amendment ... Min votes for amendments?
  │   ├─ voting.quorum.emergency ... Min votes for emergencies?
  │   └─ voting.quorum.election .... Min votes for elections?
  │
  ├─ Timing & Process
  │   ├─ timing.forum_min .......... Min discussion before vote?
  │   ├─ timing.execution_delay .... Delay after approval?
  │   └─ timing.cooldown ........... Wait time for failed proposals?
  │
  ├─ Treasury
  │   ├─ treasury.grant_limit ...... Max single grant (XRD)?
  │   ├─ treasury.bounty_limit ..... Max single bounty (XRD)?
  │   ├─ treasury.ops_limit ........ Monthly ops budget (XRD)?
  │   └─ treasury.emergency_cap .... Emergency spend cap (XRD)?
  │
  ├─ Proposals & Reputation
  │   ├─ proposals.stake ........... Require deposit to propose?
  │   └─ reputation.decay .......... Does XP decay if inactive?
  │
  └─ Enforcement
      └─ enforcement.suspension .... Default ban duration?
          │
          ▼
PHASE 3: OPERATIONS (6 params — unlock after Phase 2)
  │
  ├─ election.nomination_period .... How long for RAC nominations?
  ├─ election.discussion_period .... Candidate discussion time?
  ├─ election.min_activity ......... Min activity for RAC eligibility?
  ├─ rac.first_election ............ Launch the first RAC election
  ├─ treasury.first_fund ........... Establish first bounty fund
  └─ infra.hosting ................. Approve hosting arrangement
      │
      ▼
CHARTER COMPLETE → All 32 params resolved → DAO operational
```

---

## Structural Decisions (Not Charter Params)

These run in parallel — not gated by charter phases:

| # | Decision | RadixTalk | Status |
|---|----------|-----------|--------|
| S1 | MIDAO LLC Formation | [RFC #2270](https://radixtalk.com/t/2270) | Active discussion (8 replies) |
| S2 | DAO Location (Marshall Islands vs Wyoming vs other) | [#2150](https://radixtalk.com/t/2150) (37 replies), [#2156](https://radixtalk.com/t/2156) (26 replies) | Hot debate |
| S3 | Strategic Council Structure | [RFC #2266](https://radixtalk.com/t/2266) (9 replies) | RFC posted |
| S4 | Working Group Framework | [RFC #2272](https://radixtalk.com/t/2272) (3 replies) | RFC posted |
| S5 | Governance Framework Repo | [RFC #2268](https://radixtalk.com/t/2268) (4 replies) | RFC posted |
| S6 | RAC Mandate Revision | [#2265](https://radixtalk.com/t/2265) (2 replies) | Proposed |
| S7 | Multi-sig Wallet Approach | [#2164](https://radixtalk.com/t/2164) (21 replies) | Active |
| S8 | XRD Treasury Storage | [TC #2242](https://radixtalk.com/t/2242) (10 replies) | Temp check |
| S9 | Proposal + Voting Framework | [RFC #2273](https://radixtalk.com/t/2273) | RFC posted |
| S10 | Community Social Accounts | [#2255](https://radixtalk.com/t/2255) (4 replies) | Proposed |

## P3 Foundation Service Transitions

| # | Service | RadixTalk | Status |
|---|---------|-----------|--------|
| P1 | Babylon Gateway | [RFP #2202](https://radixtalk.com/t/2202) (33 replies) | Active RFP |
| P2 | Dev Console + Dashboard | [#2254](https://radixtalk.com/t/2254) (4 replies) | Discussion |
| P3 | Connect Relay | [RFP #2203](https://radixtalk.com/t/2203) (2 replies) | RFP posted |
| P4 | Signalling Server | [RFP #2204](https://radixtalk.com/t/2204) (2 replies) | RFP posted |
| P5 | Stokenet | [#2246](https://radixtalk.com/t/2246) (5 replies) | Discussion |

---

## Total Issue Count

| Category | Count | Status |
|----------|-------|--------|
| Charter Phase 1 | 6 | Proposals exist, ready to vote |
| Charter Phase 2 | 20 | Proposals exist (#7-#20), pending activation |
| Charter Phase 3 | 6 | Need proposals created |
| Structural (S1-S10) | 10 | Need temp checks |
| P3 Services (P1-P5) | 5 | Need temp checks |
| **Total** | **47** | |

Plus ~10 RadixTalk threads that may generate additional decisions.

---

## What Exists vs What Needs Creating

**Already in guild as proposals:** 26 charter params (proposals #1-#20, #27-#32)
**Need creating:** 6 Phase 3 params + 10 structural + 5 P3 services = ~21 new temp checks
**Need in decisions table:** Expand from 7 to 47 decisions with full dependency tree

## Recommended Activation Order

1. **Week 1:** Phase 1 temp checks (6 params) — these are the foundation
2. **Week 2:** Structural decisions (MIDAO, WG framework, Strategic Council)
3. **Week 3:** Phase 2 params unlock (if Phase 1 resolved)
4. **Week 4+:** P3 services, Phase 3, remaining structural
