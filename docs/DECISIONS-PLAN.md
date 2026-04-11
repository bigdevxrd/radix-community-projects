# Decisions Page — Plan

## What We're Building

A `/decisions` page on radixguild.com that surfaces the real governance decisions happening NOW — from RadixTalk threads, guild temp checks, and charter votes — as simple voteable cards.

**User flow:**
```
Arrive → See "X decisions need input" → Read 2-sentence summary → Vote → Done
```

No forum reading. No TG required. Just vote.

## Data Sources

### 1. RadixTalk Discourse API (LIVE — no key needed)
- Endpoint: `https://radixtalk.com/c/governance/46.json`
- 30 governance topics available
- Can pull: title, summary, replies, views, date, author
- Can link back to full discussion

### 2. Guild API (existing)
- 42 proposals already seeded (charter params, temp checks)
- Some need cleanup — 12 [TEST] proposals from pipeline tests

### 3. Bert's Research
- DAO governance knowledge base (22KB)
- Decision tree mapped from community discussions

## Immediate Seed: 7 Active Decisions

These are the real issues being discussed RIGHT NOW:

| # | Decision | Source | Type | Depends On |
|---|----------|--------|------|------------|
| 1 | **Adopt the Charter** | RadixTalk + Guild #27 | Yes/No | Nothing |
| 2 | **RAC Seat Count** | Guild #28 | Poll (3/5/7/9) | #1 |
| 3 | **Standard Quorum %** | Guild #29 | Poll (20/33/50%) | #1 |
| 4 | **Default Voting Period** | Guild #30 | Poll (48h/72h/7d) | #1 |
| 5 | **Approval Threshold** | Guild #31 | Poll (>50/>60/>67%) | #1 |
| 6 | **MIDAO LLC Formation** | RadixTalk RFC | Yes/No | #1 |
| 7 | **Working Group Framework** | Guild TC #25 + RadixTalk | Yes/No | #1 |

### Decision Tree

```
Charter Adopted? (#1)
  ├── YES → Unlock all parameter votes (#2-#5)
  │   ├── RAC seats decided (#2)
  │   ├── Quorum set (#3)
  │   ├── Voting period set (#4)
  │   └── Threshold set (#5)
  │       └── All params set → MIDAO LLC vote (#6)
  │           └── LLC formed → WG Framework vote (#7)
  │               └── Framework adopted → First WGs created
  └── NO → Re-draft charter → New temp check
```

### Phase 2 Decisions (Queue After Phase 1)

| # | Decision | Source | Type |
|---|----------|--------|------|
| 8 | RAC multi-sig threshold | Guild #7 | Poll |
| 9 | RAC meeting frequency | Guild #8 | Poll |
| 10 | Missed meetings penalty | Guild #9 | Poll |
| 11 | Amendment vote duration | Guild #10 | Poll |
| 12 | Emergency vote duration | Guild #11 | Poll |
| 13 | P3 Services: which to adopt | RadixTalk | Multi-select |
| 14 | Strategic Council structure | Phil's RFC | Yes/No |
| 15 | Treasury storage | RadixTalk TC | Poll |

## Dashboard UX

### `/decisions` Page Layout

```
┌─────────────────────────────────────────────┐
│ DECISIONS                    7 need input   │
├─────────────────────────────────────────────┤
│                                             │
│ [PHASE 1: FOUNDATION]                       │
│                                             │
│ ┌─────────────────────┐ ┌────────────────┐  │
│ │ 🗳 Adopt Charter    │ │ 🗳 RAC Seats   │  │
│ │ Yes / No            │ │ 3 / 5 / 7 / 9  │  │
│ │ 0 votes · ends 48h  │ │ locked until #1 │  │
│ │ [VOTE]              │ │ [LOCKED]        │  │
│ └─────────────────────┘ └────────────────┘  │
│                                             │
│ ┌─────────────────────┐ ┌────────────────┐  │
│ │ 🗳 Quorum %         │ │ 🗳 Vote Period │  │
│ │ 20 / 33 / 50%       │ │ 48h / 72h / 7d │  │
│ │ locked until #1     │ │ locked until #1 │  │
│ │ [LOCKED]            │ │ [LOCKED]        │  │
│ └─────────────────────┘ └────────────────┘  │
│                                             │
│ [PHASE 2: STRUCTURE]                        │
│ ┌─────────────────────┐ ┌────────────────┐  │
│ │ 🗳 MIDAO LLC        │ │ 🗳 WG Framework│  │
│ │ Yes / No            │ │ Yes / No       │  │
│ │ locked until #1-5   │ │ locked until #6│  │
│ └─────────────────────┘ └────────────────┘  │
│                                             │
│ [RADIXTALK DISCUSSIONS]                     │
│ Live threads linked — read context before   │
│ voting on formal proposals                  │
└─────────────────────────────────────────────┘
```

### Decision Card Component

Each card shows:
- Title (2-3 words)
- Type badge (Yes/No, Poll, Temp Check)
- Options (buttons)
- Vote count + time remaining
- Dependencies (locked/unlocked)
- Link to RadixTalk thread for context
- Link to guild proposal for voting

## RadixTalk Integration

### Phase 1: Read-Only (NOW)
- Pull governance topics via Discourse API
- Display as "context cards" on `/decisions` page
- Link to full thread on RadixTalk
- No API key needed — public JSON endpoints

### Phase 2: Sync (LATER)
- Create guild temp checks from RadixTalk topics
- Post guild results back to RadixTalk as comments
- Bridge: forum discussion ↔ guild voting

### API Endpoints Needed

```
GET /api/decisions              — all decisions with dependencies + status
GET /api/decisions/radixtalk    — pull governance topics from RadixTalk
POST /api/decisions/:id/vote    — cast vote (existing proposal vote API)
```

## Cleanup Needed

- Delete 12 [TEST] proposals (#33-45) — pipeline test artifacts
- Re-activate pending proposals (#7-#20) — Phase 2 charter params
- Link guild proposals to RadixTalk threads where they exist

## Build Order

1. Clean up test proposals
2. Create `/decisions` page with phased card layout
3. Wire existing guild proposals as voteable cards
4. Add RadixTalk topic cards (read-only, linked)
5. Add dependency locking (Phase 2 cards locked until Phase 1 complete)
6. Add vote counts + time remaining
7. Test full flow: arrive → vote → see result
