# Weekly Status — April 7, 2026

## What Happened This Week

### Day 1-2 (Apr 6-7) — Domain + Polish + Support

**Shipped:**
- [x] Custom domain: radixguild.com (Hostinger, TLS via Caddy)
- [x] Removed /guild basePath — dashboard at root
- [x] Old sslip.io URLs redirect (301) to new domain
- [x] /transparency page (costs, revenue, on-chain proof)
- [x] Vote Now hero with live countdown timers on proposals
- [x] Proposal classification: Charter Vote / Community Vote / Temp Check
- [x] "How Voting Works" collapsible explainer (off-chain vs CV2)
- [x] /api/health system health endpoint
- [x] SEO upgrade (metadataBase, Twitter cards, OG tags)
- [x] TG_BOT_URL centralized (was hardcoded in 7 files)
- [x] Pipeline tests: 39 → 70 (health, feedback, error handling, integrity, edge cases)
- [x] Discord webhook notifications (proposal create/close/charter resolution)
- [x] Support system: /feedback, /mystatus, /adminfeedback commands
- [x] FAQ matcher: 10 entries, keyword matching, suggest before ticket creation
- [x] /feedback dashboard page for admin ticket management
- [x] "New to Radix?" onboarding card (wallet download, RadQuest, docs)
- [x] Docs page rewrite: quick start, voting guide, XP/tiers, commands, FAQ
- [x] Bounty page hardened: pipeline visualization, status bug fix
- [x] README updated with all new features
- [x] TESTER-INVITE.md refreshed for outreach
- [x] CV2 sync error spam silenced (Gateway API limitation documented)
- [x] 4 GitHub issues closed (#70, #71, #45, #68)
- [x] docs/ROADMAP.md: 7-phase plan + economics model
- [x] Deploy script fixed (/opt/rad-dao/ path)
- [x] Wallet security feedback documented

**Stats:** 13 dashboard pages, 70 pipeline tests, 20+ API endpoints, 22+ bot commands

### Active Proposals (P1-P6)
- 6 foundation charter votes live (1/3 votes each)
- Expiring ~Apr 8 — outreach in progress
- If they expire: re-propose with lessons learned

## Remaining Open Issues (9)

| # | Title | Priority |
|---|-------|----------|
| 69 | Charter guided wizard | Week 3 |
| 58 | CV2 Phase 2: Self-host dApp + vote-collector | Phase 4+ |
| 44 | CrumbsUp proposal sync | Phase 4+ |
| 36 | Record demo video | When ready |
| 34 | On-chain proposal outcomes | Phase 4+ |
| 33 | Vote delegation | Phase 4+ |
| 32 | Multi-DAO badge federation | Phase 5+ |
| 9 | Build Manager Registry | Phase 5+ |
| 8 | Build DAO Manager blueprint | Phase 5+ |

## Next Week Plan (Apr 14-20)

### If P1-P6 pass (enough votes):
- [ ] Charter Phase 1 resolves — 6 parameters set
- [ ] Phase 2 params unlock (20 configuration decisions)
- [ ] Celebrate + announce results
- [ ] Begin Phase 2 voting

### If P1-P6 expire (not enough votes):
- [ ] Analyze: why didn't people vote?
- [ ] Adjust min_votes threshold (maybe 1 instead of 3 for bootstrap)
- [ ] Re-propose with better messaging
- [ ] Consider: /vote command improvements for lower friction

### Either way:
- [ ] Process beta feedback (/adminfeedback)
- [ ] Charter guided wizard (#69)
- [ ] Monitor /api/health for issues
- [ ] Track metrics: badges minted, votes cast, proposals created
- [ ] Set up Discord webhook (need DISCORD_WEBHOOK_URL in bot .env)

## Full Schedule: docs/ROADMAP.md

| Month | Phase | Status |
|-------|-------|--------|
| Apr | Beta + Polish | **In Progress** — Week 1-2 done |
| May | SaaS Config Layer | Planned |
| Jun | Pitch + First Customer | Planned |
| Jul-Aug | Revenue Features | Planned |
| Sep+ | Scale | Planned |
