# DAO Structure — Staged Implementation Plan

Reference: DAO governance structure diagram (April 2026)

## Current State vs Target

| Component | Current | Target | Stage |
|-----------|---------|--------|-------|
| Token/Badge Holders | Badge NFTs (free mint, on-chain) | Same | Done |
| Proposal & Voting | TG bot (off-chain) + CV2 (on-chain) | Same + working group proposals | Done + Stage 2 |
| Execution & Treasury | Bounty + escrow system | Multi-sig treasury, funded working groups | Stage 3 |
| Working Groups | Not built | Product / Ecosystem / Community groups | Stage 2 |
| Strategic Coordination WG | Not built | Cross-group alignment role | Stage 3 |
| Legal Entity (DAO LLC) | Not built | Off-chain legal wrapper | Stage 4 |
| Authorized Signers | Bot signer (single key) | Multi-sig wallet, KYC verified | Stage 3 |
| Accountability Council (RAC) | Charter defines it, not elected | Elected, oversight role | Stage 2 |
| Contributors | Bounty claimants, voters | Organized into working groups | Stage 2 |

## Stage 1: FOUNDATION (Done)

What's shipped:
- On-chain badge identity (BadgeManager v4)
- Two-tier voting (TG off-chain + CV2 on-chain)
- Charter parameter system (32 decisions, dependency tracking)
- Bounty + escrow pipeline
- Grid game with achievements
- Dashboard (10 pages)
- 39 automated tests
- Security hardened, docs complete

## Stage 2: WORKING GROUPS + RAC ELECTION

Goal: Add organizational structure. People can join working groups, groups can submit proposals, RAC gets elected.

### 2a. Working Group System

Database:
- `working_groups` table: id, name, description, category (product/ecosystem/community), lead_address, status
- `working_group_members` table: group_id, radix_address, role (member/lead/coordinator), joined_at

Bot commands:
- `/groups` — list all working groups
- `/group <name>` — view group details + members
- `/group join <name>` — join a group (badge required)
- `/group leave <name>` — leave a group
- `/group create <name> <category>` — create group (admin or proposal-approved)

Dashboard:
- New `/groups` page showing all working groups
- Group detail view with members, proposals, bounties

API:
- GET /api/groups — list groups
- GET /api/groups/:id — group detail + members

### 2b. RAC Election System

Prerequisites: Charter Phase 1 complete (quorum, voting period, approval thresholds resolved)

Bot commands:
- `/election` — view current/upcoming election
- `/nominate <address>` — nominate for RAC (self or other)
- `/candidates` — view nominees

Flow:
1. Nomination period opens (charter-defined duration)
2. Badge holders nominate candidates
3. Discussion period
4. Election vote (using CV2 on-chain for formal binding)
5. Top N candidates become RAC members
6. RAC badge NFTs minted to winners

### 2c. Working Group Proposals

Working groups can submit proposals tagged to their group:
- `/propose --group product "Build feature X"` — proposal attributed to a group
- Dashboard shows proposals by group
- Group leads can create bounties directly

## Stage 3: TREASURY + MULTI-SIG

Goal: Formalize treasury management with multi-sig and authorized signers.

### 3a. Multi-Sig Treasury

- Deploy Radix native multi-sig (access rules requiring M-of-N signatures)
- RAC members are the N signers
- Threshold defined by charter param `rac.multisig`
- Treasury funds held in multi-sig account

### 3b. Authorized Signers

- RAC members get signer badges
- Treasury operations require multi-sig approval
- Bot tracks pending approvals
- Dashboard shows treasury balance + pending transactions

### 3c. Strategic Coordination

- Cross-group coordination role
- Regular sync meetings (tracked in bot)
- Quarterly reports generated from bounty/proposal/vote data

## Stage 4: LEGAL + FEDERATION

Goal: Off-chain legal structure + multi-DAO support.

### 4a. Legal Entity

- DAO LLC formation (jurisdiction TBD — community decides)
- Legal entity holds off-chain assets (domains, accounts)
- Authorized signers are KYC-verified RAC members

### 4b. Multi-DAO Federation

- BadgeFactory already supports multiple schemas
- Each working group could become its own sub-DAO
- Shared badge identity across DAOs
- Federation governance for cross-DAO decisions

## Implementation Timeline

| Stage | What | Sessions | Dependencies |
|-------|------|----------|-------------|
| 2a | Working groups (DB + bot + dashboard) | 1-2 sessions | None |
| 2b | RAC election system | 1 session | Charter Phase 1 complete |
| 2c | Working group proposals | 1 session | Stage 2a |
| 3a | Multi-sig treasury | 1 session | RAC elected (Stage 2b) |
| 3b | Authorized signers | 1 session | Stage 3a |
| 3c | Strategic coordination | 1 session | Stages 2a + 2b |
| 4a | Legal entity | Off-chain | Community decision |
| 4b | Multi-DAO federation | 2-3 sessions | Stages 2 + 3 complete |

## Design Principles

1. Each stage is independent and deployable on its own
2. Everything is feature-flagged — can be disabled without breaking existing features
3. On-chain where it matters (badges, votes, treasury), off-chain where it's practical (groups, coordination)
4. Community decides the pace — charter votes unlock each stage
5. Open source — any DAO can fork and use the same structure
