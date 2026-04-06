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
