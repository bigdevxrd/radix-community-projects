# 7-Day Plan — April 7-13, 2026

## Strategy

Build open source. Fork to SaaS when Stage 2 is stable.
Community feedback drives priority. Beta testers are active.

## Day 1 (Apr 7) — Feedback + Quick Fixes

Priority: respond to what beta testers find.

- [ ] Check bot logs for errors from real users
- [ ] Check dashboard for any broken flows
- [ ] Fix any bugs reported
- [ ] Fund bot signer account (5 XRD transfer)
- [ ] Test TG→CV2 bridge with real proposal
- [ ] Monitor, respond to TG group

## Day 2 (Apr 8) — Working Groups (Stage 2a)

Design + build session. Working groups are the next structural piece.

- [ ] Design: working_groups + working_group_members tables
- [ ] Build: bot commands (/groups, /group join, /group create)
- [ ] Build: dashboard /groups page
- [ ] Build: API endpoints (GET /api/groups, GET /api/groups/:id)
- [ ] Deploy + test
- [ ] Seed 3 initial groups: Product, Ecosystem, Community

## Day 3 (Apr 9) — Polish + Achievement NFTs

- [ ] Build: achievement NFT minting script (mint-achievement.js)
- [ ] Deploy: achievement badge schema on-chain (create_manager call)
- [ ] Wire: batch signer writes game data to badge extra_data
- [ ] Test: complete a grid → achievement NFT minted to wallet
- [ ] Polish: any UI issues from Day 1-2 feedback
- [ ] Update HOW-IT-WORKS doc with working groups

## Day 4 (Apr 10) — RAC Election System (Stage 2b)

Prerequisites: Charter Phase 1 votes completed (or override for testing).

- [ ] Design: election flow (nomination → discussion → vote)
- [ ] Build: /election, /nominate, /candidates bot commands
- [ ] Build: election uses CV2 on-chain voting for binding results
- [ ] Build: dashboard election page
- [ ] Test full cycle: nominate → vote → winners announced

## Day 5 (Apr 11) — Group Proposals + Dashboard Cleanup

- [ ] Build: proposals tagged to working groups (Stage 2c)
- [ ] Build: group leads can create bounties
- [ ] Address #70: dashboard home cleanup
- [ ] Address #69: charter guided wizard
- [ ] Deploy + test

## Day 6 (Apr 12) — SaaS Fork Preparation

- [ ] Audit: what's generic vs guild-specific in the codebase
- [ ] Create: guild-saas branch or update existing guild-saas repo
- [ ] Add: config layer for multi-tenant (different badge schemas, different TG bots)
- [ ] Add: royalty/pricing model to badge minting
- [ ] Design: white-label dashboard (configurable branding)
- [ ] Document: what a "customer" deployment looks like

## Day 7 (Apr 13) — Testing + Launch Prep

- [ ] Full regression test (pipeline should be 45+ tests by now)
- [ ] Security audit on new features
- [ ] Update all docs
- [ ] Record demo video (#36)
- [ ] Prepare launch post for wider community
- [ ] Review: is Stage 2 stable enough to fork?

## Definition of Done (end of week)

- [ ] Working groups live with 3 seeded groups
- [ ] Achievement NFTs minting on grid completion
- [ ] RAC election system functional (even if no election yet)
- [ ] Group proposals working
- [ ] SaaS fork started with multi-tenant config
- [ ] 45+ pipeline tests
- [ ] Demo video recorded
- [ ] Zero critical bugs from beta feedback

## SaaS Fork Strategy

When to fork: after Day 5 (Stage 2 stable).

What's different in SaaS:
- Multi-tenant: one deployment serves multiple DAOs
- Custom branding: logo, colors, domain per DAO
- Royalties: badge minting charges XRD (configurable per DAO)
- Managed hosting: Big Dev operates the infrastructure
- Premium features: advanced analytics, custom badge schemas, priority support

What stays open source:
- All core governance logic
- Badge system (BadgeFactory + Manager)
- Voting (TG + CV2)
- Bounty + escrow
- Grid game
- All docs

Fork point: guild-saas repo gets a config layer on top of the open source base. Same code, different deployment config.

## Week 2 Plan (Apr 14-20)

### Day 8 (Apr 14) — Governance Assistant MVP

- [ ] Simplify agent-tools: strip executor, keep scan + context + LLM ask
- [ ] Build: governance-specific prompts (charter rules, proposal templates)
- [ ] Build: POST /api/assist endpoint (badge-gated, rate limited)
- [ ] Build: pay-per-use model (0.5 XRD per assist, configurable)
- [ ] Wire: XRD payment → treasury escrow on each assist call
- [ ] Test: "help me write a proposal about X" → formatted proposal draft

### Day 9 (Apr 15) — Dashboard Assistant UI

- [ ] Build: sidebar assistant component on dashboard
- [ ] Input: text field + context selector (proposal/bounty/charter/general)
- [ ] Output: formatted response with action buttons (create proposal, create bounty)
- [ ] Bot: /assist command in TG for same functionality
- [ ] Deploy + test with beta testers

### Day 10 (Apr 16) — Achievement NFT Minting

- [ ] Fund bot signer account (if not done)
- [ ] Deploy achievement badge schema on-chain (create_manager call)
- [ ] Build: mint-achievement.js script
- [ ] Wire: batch signer writes game data to badge extra_data
- [ ] Wire: milestone NFT minting on 5th/10th grid completion
- [ ] Test: complete grid → NFT appears in wallet

### Day 11 (Apr 17) — Multi-Sig Treasury Prep

- [ ] Research: Radix native access rules for M-of-N signing
- [ ] Design: treasury account with RAC member badges as signers
- [ ] Build: treasury dashboard page (balance, pending, history)
- [ ] Build: /treasury bot command
- [ ] Document: treasury management guide

### Day 12 (Apr 18) — SaaS Fork + Pricing

- [ ] Fork: create guild-saas branch from current main
- [ ] Add: config layer (tenant ID, branding, pricing)
- [ ] Add: royalty on badge minting (configurable XRD per mint)
- [ ] Add: assist API markup (SaaS takes cut of per-use fees)
- [ ] Add: white-label dashboard config (logo, colors, name)
- [ ] Document: SaaS deployment guide

### Day 13-14 (Apr 19-20) — Testing + Community

- [ ] Full regression (target 50+ pipeline tests)
- [ ] Security audit on new features
- [ ] Process beta tester feedback backlog
- [ ] Update all docs
- [ ] Community call or forum post with progress update
- [ ] Plan Week 3 based on feedback

## Revenue Model (Pay-Per-Use)

```
Badge holder uses governance assistant
  → LLM API call costs ~$0.002
  → User pays 0.5 XRD per assist
  → XRD deposited to guild treasury escrow
  → Treasury grows from real usage
  → No pre-funding needed

SaaS version:
  → Same model + platform fee
  → Host charges 1 XRD per assist (keeps 0.5, passes 0.5 to DAO)
  → Badge minting: free (open source) vs 1 XRD (SaaS hosted)
```

## Full Stage Schedule

| Stage | What | When | Status |
|-------|------|------|--------|
| 1 | Foundation (badges, voting, CV2, game) | Apr 3-6 | Done |
| 2a | Working groups | Apr 8 | Week 1 |
| 2b | RAC election | Apr 10 | Week 1 |
| 2c | Group proposals | Apr 11 | Week 1 |
| 3 | Treasury + multi-sig | Apr 17 | Week 2 |
| 4 | Legal entity + federation | TBD | Community decides |
| 5 | Governance assistant (pay-per-use) | Apr 14-15 | Week 2 |
| SaaS | Fork + pricing + white-label | Apr 18 | Week 2 |
| NFTs | Achievement minting on-chain | Apr 16 | Week 2 |
