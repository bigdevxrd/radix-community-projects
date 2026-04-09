# Weekly Status — April 7, 2026

## What Shipped Today (18 commits)

The guild went from "MVP governance bot" to "complete task marketplace with support, economics, and 35 documented tasks" in one session.

### Features Shipped
- [x] Custom domain: radixguild.com (Caddy auto-TLS, old URLs redirect)
- [x] 14 dashboard pages (was 10): + transparency, feedback, bounty detail, docs overhaul
- [x] 70 pipeline tests (was 39): health, feedback, errors, integrity, edge cases
- [x] Proposal classification: Charter Vote / Community Vote / Temp Check
- [x] Vote Now hero with live countdown timers
- [x] "How Voting Works" explainer (off-chain vs CV2)
- [x] Task marketplace Phase 1: categories, difficulty, deadlines, fees (2.5%), milestones, applications
- [x] 5-step bounty wizard: amount → title → category → difficulty → deadline → confirm with fee
- [x] /bounty apply, /bounty cancel, /bounty approve, /bounty categories commands
- [x] Deadline enforcement cron (hourly auto-cancel)
- [x] Bounty detail page (/bounties/[id]) with fee breakdown + acceptance criteria
- [x] Support system: /feedback (bot + dashboard), FAQ matcher, /adminfeedback, "My Tickets" tab
- [x] Web-based feedback submission form (POST /api/feedback)
- [x] POST /api/bounties endpoint (dashboard task creation)
- [x] Charter wizard: /charter guide (interactive guided voting)
- [x] "New to Radix?" onboarding card (wallet download, RadQuest)
- [x] Discord webhook notifications (proposal + task events)
- [x] /api/health system health endpoint
- [x] 16 Phase 1 tasks seeded (800 XRD total value, 6 categories)
- [x] Task matrix (docs/TASK-MATRIX.md): 35 tasks, 4,775 XRD total budget
- [x] Economics model: $10 membership, 1% AI fee, royalty flywheel
- [x] Strategic architecture: governance (free) + marketplace (fees)
- [x] ROADMAP + MARKETPLACE-PLAN + TASK-MATRIX docs
- [x] 12 GitHub issues closed (21 → 8 open)
- [x] 10 stale docs archived (31 → 21 active)
- [x] CV2 sync error spam silenced
- [x] Deploy script path fixed
- [x] Wallet security feedback documented

### Live Metrics
- 14 dashboard pages, all 200
- 70 pipeline tests, all passing
- 17 bounties (16 open, 1 assigned)
- 21 proposals (6 active charter votes)
- 0/32 charter params resolved (P1-P6 expiring ~Apr 8)

---

## Next Week (Apr 8-14): Community + Revenue

### Priority 1: Outreach (your moves)
- [ ] Send TESTER-INVITE.md messages to Radix TG groups
- [ ] Post on RadixTalk forum
- [ ] Post in Radix Discord #developers
- [ ] DM 10-20 OGs personally
- [ ] Tell community about 16 open tasks at radixguild.com/bounties

### Priority 2: Monitor + React
- [ ] Check /adminfeedback for support tickets daily
- [ ] Monitor /api/health for system status
- [ ] Process P1-P6 vote results (expire ~Apr 8)
- [ ] If expired: re-propose with lower min_votes or longer deadline
- [ ] Fund escrow when first task submission is verified (50-100 XRD)

### Priority 3: Quick Wins (next build session)
- [ ] Set DISCORD_WEBHOOK_URL on VPS
- [ ] Demo video (#36) — could be first completed bounty
- [ ] Any bug fixes from community feedback

---

## Schedule (Recentered)

| When | Focus | Status |
|------|-------|--------|
| Apr 3-7 | Build + polish + marketplace + support + strategy | **DONE** |
| Apr 8-14 | Outreach, monitor votes, process feedback | **NEXT** |
| Apr 15-21 | React to feedback, first task completions | Planned |
| Apr 22-30 | Beta metrics, "State of Guild" post | Planned |
| May | SaaS config layer (if demand) | Planned |
| Jun | Pitch Radix Foundation + DeFi projects | Planned |
| Jul-Aug | On-chain TaskEscrow, AI assistant | Planned |
| Sep+ | Multi-tenant, wider market | Planned |

## What's Blocking Revenue

1. **Community** — need voters + workers (outreach in progress)
2. **Escrow** — need 50-100 XRD when first task is submitted
3. **Task completion** — someone claims, delivers, gets paid
4. **Nothing technical** — everything is built and deployed

## Open Issues: 8

#58 CV2 self-host, #44 CrumbsUp, #36 demo video, #34 on-chain outcomes, #33 delegation, #32 federation, #9 registry, #8 DAO manager — all Phase 2+ roadmap items.
