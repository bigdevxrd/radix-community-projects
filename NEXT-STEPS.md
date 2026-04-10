# Next Steps — Radix Guild

> Updated: 2026-04-10 | Community activation phase
> Context: MIDAO legal progressing, RAC elected, WG framework proposed by Daffy,
> Strategic Council RFC by Phil. The guild is positioning as coordination infrastructure.

---

## Where We Are

**Live on mainnet:** Badge Manager v4, TaskEscrow v2 (200 XRD min, 2.5% fee on release)
**Live on VPS:** Bot v5 (37 commands), Dashboard (14 pages), 34 API endpoints, 75 tests
**Live services:** Gateway event watcher (60s), PR merge watcher (5min), trust scores
**Community:** 4 TG users, 8+ wallet connects, guild posted in main Radix channels
**Ecosystem position:** Only task marketplace, only on-chain escrow, only work-coordination DAO on Radix

---

## Priority 1: Working Group Charter (THIS WEEK)

The community is forming governance structures NOW. Daffy published a full WG framework with 6 groups defined. Phil proposed a Strategic Council. The RAC is elected. MIDAO legal is in progress.

**Action: Submit the first operational Working Group charter.**

- [ ] Draft charter using Daffy's template (Strategic Development WG)
- [ ] Lead: bigdev | Budget: $4k USD/month (hybrid) | Sunset: 6 months
- [ ] Scope: architecture, infrastructure, maintenance, coordination tooling
- [ ] Deliverables: stand up next 3 WGs, connect guild tooling to WG framework
- [ ] Submit as PR to github.com/Shadaffy/radix-dao (collaborative, not fork)
- [ ] Post formal proposal on RadixTalk
- [ ] Run the WG through guild infrastructure (proving it works)

**Rules (from best practices research):**
- Every charter has a sunset date (default 6 months)
- Budget is time-boxed, never perpetual
- Max 7 members per group
- Reports to RAC monthly (structured: delivered / next / blocked / spent)
- Lead is named and accountable
- Closure = success (mission complete, not failure)

---

## Priority 2: User Profile Page (THIS WEEK)

People are joining. They need to see their stuff in one place.

- [ ] `GET /api/profile/:address` — aggregation endpoint (resolve wallet → tg_id → all activity)
- [ ] Tabbed profile: Badge | Tasks | Votes | Groups | Escrow | PRs
- [ ] Trust score breakdown visible on profile
- [ ] Works for wallet-only users (no TG required)
- [ ] Spec: docs/architecture/10-USER-PROFILE-UX.md

---

## Priority 3: Dashboard Write Operations (NEXT 2 WEEKS)

The biggest UX gap. People who don't use TG can't participate.

- [ ] Vote from dashboard (off-chain proposals)
- [ ] Create proposal from dashboard (Silver+ trust gate)
- [ ] Fund task from dashboard (fund button already built, needs ROLA for auth)
- [ ] Claim task from dashboard
- [ ] Submit work from dashboard

**Note:** CV2 pattern proves ROLA isn't strictly needed — the TX itself is auth. But for off-chain actions (voting, proposing), we need session auth. Simplest path: TX-based auth for on-chain actions, lightweight session for off-chain.

---

## Priority 4: Escrow V3 Multi-Token (NEXT 2 WEEKS)

- [ ] Accept XRD + xUSDC + xUSDT
- [ ] Per-token minimum deposits ($5 stablecoin = stable)
- [ ] Fee vaults per token
- [ ] Deploy as new component (V2 stays for existing tasks)
- [ ] Spec: docs/architecture/02-ESCROW-V3.md
- [ ] Token addresses confirmed: xUSDC and xUSDT (Instabridge)

---

## Priority 5: Conviction Voting (MONTH 2)

- [ ] Scrypto ConvictionVoting component
- [ ] Mathematical model: y(t+1) = α·y(t) + S(t), 3-day half-life
- [ ] Badge tier multipliers (Bronze 1x, Silver 1.5x, Gold 2x)
- [ ] Fund allocation proposals competing for shared pool
- [ ] Spec: docs/architecture/04-CONVICTION-VOTING.md
- [ ] This IS CV3 — governance that executes, not just votes

---

## Priority 6: WG Infrastructure (MONTH 2-3)

As working groups form, they need tooling:

- [ ] WG dashboard page — members, tasks, proposals, reports per group
- [ ] Budget tracking per WG (time-boxed, variance alerts)
- [ ] Biweekly report template (bot command: `/wg report`)
- [ ] Charter status tracking (active, sunset approaching, expired)
- [ ] Multi-sig integration when Radix tooling ships

---

## Architecture Specs (12 docs in docs/architecture/)

| # | Spec | Status |
|---|------|--------|
| 01 | ROLA Auth | Designed (parked — CV2 pattern may suffice) |
| 02 | Escrow V3 Multi-Token | Designed, ready to build |
| 03 | Dashboard Writes | Designed, 5-phase rollout |
| 04 | Conviction Voting | Designed, full math model |
| 05 | Verification System | Designed, PR merged MVP live |
| 06 | CV3 Evolution | Designed, roadmap mapped |
| 07 | Gateway Watcher | **Built and deployed** |
| 08 | GitHub PR Watcher | **Built and deployed** |
| 09 | Agent Orchestration | Designed, 4 agent modes |
| 10 | User Profile UX | Designed, ready to build |
| 11 | WG Charter Analysis | Research complete (Daffy's 6 WGs mapped) |
| 12 | WG Best Practices | Research complete (IETF, Maker, ENS, Gitcoin, Apache) |

---

## What's Deployed (reference)

- TaskEscrow: `component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r`
- Badge Manager: `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva`
- CV2 Governance: `component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2`
- Dashboard: radixguild.com
- Bot: @rad_gov
- 75/75 pipeline tests passing
