# Issue Solution Plans

> Reviewed: 2026-04-09 | All 11 open issues analysed with detailed solution designs

## Overview

Each document contains a full analysis of the problem, proposed solution architecture, implementation details, security considerations, effort estimates, and dependency mapping.

## Issue Index

| # | Issue | Priority | Effort | Dependencies | Phase |
|---|-------|----------|--------|--------------|-------|
| [#75](075-dashboard-write-operations.md) | Dashboard write operations | 🔴 Critical | 6-9 sessions | ROLA auth | Phase 2 |
| [#73](073-user-editable-profiles.md) | User-editable profiles | 🟡 Medium | 4-7 sessions | ROLA auth | Phase 3 |
| [#72](072-content-moderation.md) | Content moderation | 🟡 Medium | 3-5 sessions | Content filter (exists) | Phase 1-2 |
| [#58](058-cv2-phase2-selfhost.md) | CV2 Phase 2 self-host | 🟡 Medium | 2.5-3.5 sessions | Docker, CV2 source | Phase 2 |
| [#44](044-crumbsup-proposal-sync.md) | CrumbsUp proposal sync | 🟢 Low | 3.5-4.5 sessions | CrumbsUp API/ABI | Phase 4 |
| [#36](036-record-demo-video.md) | Record demo video | 🟡 Medium | 2-3 sessions | Working deployment | Phase 4 |
| [#34](034-onchain-proposal-outcomes.md) | On-chain proposal outcomes | 🟡 Medium | 3.5-4 sessions | Scrypto toolchain | Phase 2 |
| [#33](033-vote-delegation.md) | Vote delegation | 🟢 Low | 2-3 sessions | Community vote | Phase 3 |
| [#32](032-multi-dao-badge-federation.md) | Multi-DAO badge federation | 🟢 Low | 2-4 sessions | Community vote, #9 | Phase 3 |
| [#9](009-manager-registry-component.md) | Manager Registry component | 🟢 Low | 5 sessions | Scrypto toolchain | Phase 2 |
| [#8](008-dao-manager-blueprint.md) | DAO Manager blueprint | 🟢 Low | 5-8 sessions | #9 (Registry) | Phase 3 |

## Dependency Graph

```
ROLA Auth (prerequisite) ─────────────────────────────────┐
    │                                                      │
    ├── #75 Dashboard Writes ────────── #73 Profiles       │
    │                                                      │
    ├── #72 Content Moderation (Phase 1 independent)       │
    │                                                      │
    └── #33 Vote Delegation (dashboard UI)                 │
                                                           │
Scrypto Toolchain ─────────────────────────────────────────┤
    │                                                      │
    ├── #34 On-Chain Outcomes                              │
    │                                                      │
    ├── #9 Manager Registry ──── #8 DAO Manager            │
    │         │                                            │
    │         └── #32 Multi-DAO Federation                 │
    │                                                      │
    └── Conviction Voting (NEXT-STEPS #4)                  │
                                                           │
Independent ───────────────────────────────────────────────┘
    ├── #58 CV2 Self-Host (Docker)
    ├── #44 CrumbsUp Sync (needs API research)
    └── #36 Demo Video (manual task)
```

## Recommended Implementation Order

### Sprint 1: Foundation
1. **#72 Phase 1** — Expand word filter to proposals (0.5 session, no dependencies)
2. **ROLA Auth** — Enable wallet verification (from NEXT-STEPS.md, 1-2 sessions)

### Sprint 2: Core Governance
3. **#75** — Dashboard write operations (6-9 sessions, requires ROLA)
4. **#34** — On-chain proposal outcomes (3.5-4 sessions, parallel with #75)

### Sprint 3: Identity & Moderation
5. **#73** — User-editable profiles (4-7 sessions, requires ROLA)
6. **#72 Phase 2-3** — Community flagging (2-4 sessions)

### Sprint 4: Infrastructure
7. **#58** — CV2 self-host (2.5-3.5 sessions, independent)
8. **#9** — Manager Registry component (5 sessions, independent)

### Sprint 5: Federation & Advanced
9. **#33** — Vote delegation (2-3 sessions, requires community vote)
10. **#8** — DAO Manager blueprint (5-8 sessions, requires #9)
11. **#32** — Multi-DAO federation (2-4 sessions, requires #8)

### Sprint 6: Polish & Launch
12. **#44** — CrumbsUp sync (3.5-4.5 sessions, requires API research)
13. **#36** — Demo video (2-3 sessions, after everything works)

## Key Architectural Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Auth mechanism | ROLA (signed challenges) | Cryptographic wallet proof, not trust-the-client |
| Profile storage | SQLite first, IPFS later | Fast to build, migrate when needed |
| Vote delegation | Off-chain first | Governance is mostly off-chain; on-chain later |
| Content moderation | Blocklist + community flags | Proportionate to <100 user scale |
| DAO federation | Gated then open | Quality control at launch, permissionless growth |
| Proposal outcomes | New Scrypto component | Clean separation, dedicated registry |

## Total Estimated Effort

| Category | Sessions |
|----------|----------|
| Authentication (ROLA) | 1-2 |
| Dashboard writes (#75) | 6-9 |
| Profiles (#73) | 4-7 |
| Content moderation (#72) | 3-5 |
| CV2 self-host (#58) | 2.5-3.5 |
| CrumbsUp sync (#44) | 3.5-4.5 |
| Demo video (#36) | 2-3 |
| On-chain outcomes (#34) | 3.5-4 |
| Vote delegation (#33) | 2-3 |
| Badge federation (#32) | 2-4 |
| Manager Registry (#9) | 5 |
| DAO Manager (#8) | 5-8 |
| **Total** | **~40-58 sessions** |
