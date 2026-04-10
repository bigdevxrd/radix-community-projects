# 10-Day Development Sprint — April 10-20, 2026
> All projects, prioritised by impact

## Overview

| Day | Focus | Project | Deliverable |
|-----|-------|---------|-------------|
| **1 (Apr 10)** | Guild hardening | Guild | Working groups v2 + RadixTalk research |
| **2 (Apr 11)** | Proposal + RadixTalk | Guild + Proposal | Draft proposal posted to RadixTalk |
| **3 (Apr 12)** | ROLA auth | Guild | Cryptographic wallet verification |
| **4 (Apr 13)** | ROLA + Escrow V3 | Guild | ROLA complete, Escrow V3 started |
| **5 (Apr 14)** | Escrow V3 | Guild (Scrypto) | Multi-token escrow deployed to stokenet |
| **6 (Apr 15)** | Dashboard writes | Guild | Vote + create proposal from web UI |
| **7 (Apr 16)** | Dashboard writes | Guild | Claim/fund/submit from web UI |
| **8 (Apr 17)** | Hyperscale-RS | HSRS | PR #2 livelock tombstone cleanup |
| **9 (Apr 18)** | Sats + Agents | Sats/Agents | Trade monitoring hardening, agent refinement |
| **10 (Apr 19-20)** | Polish + Proposal | All | Final testing, proposal refinement, community outreach |

---

## Day 1 — Thursday Apr 10: Guild Hardening

**Morning: Working Groups v2**
- [ ] Upgrade working groups: invite links, group chat integration
- [ ] Add "Join a Working Group" prominent CTA on homepage
- [ ] Create 3 seed working groups: Governance, Development, Outreach
- [ ] Each group gets a purpose statement + coordinator role

**Afternoon: RadixTalk Integration Research**
- [ ] Test RadixTalk Discourse API (it's Discourse-based)
- [ ] Prototype: pull latest governance topics into guild dashboard
- [ ] Plan: temp check flow — post on RadixTalk → shows in guild → vote via TG

**Evening: Fix Kuma reds + commit**
- [ ] Verify all Kuma monitors green on both VPS
- [ ] Fix Guild Bot API + Dashboard if still red

---

## Day 2 — Friday Apr 11: Proposal + Community

**Morning: Finalize Proposal**
- [ ] Review PROPOSAL-DRAFT.md — tighten language, add specifics
- [ ] Create funding breakdown (weekly cost justification)
- [ ] Add portfolio screenshots/links as proof of work

**Afternoon: Post to RadixTalk**
- [ ] Create account if needed
- [ ] Post in Governance category
- [ ] Title: "RFC: Community Infrastructure Contractor — bigdev"
- [ ] Cross-post summary to Radix TG groups
- [ ] Share in Discord #developers

**Evening: Respond to initial feedback**
- [ ] Monitor RadixTalk replies
- [ ] Address questions, refine proposal based on feedback

---

## Day 3 — Saturday Apr 12: ROLA Authentication

**Full day: Guild ROLA integration**
- [ ] `npm install @radixdlt/rola` in bot
- [ ] `GET /api/challenge` — generate 32-byte challenge, 5-min TTL
- [ ] `POST /api/verify` — verify signed challenge, issue JWT
- [ ] Update `useWallet.tsx` — `DataRequestBuilder.persona().withProof()`
- [ ] Session management — JWT in httpOnly cookie
- [ ] Trust score auto-loaded on authenticated sessions
- [ ] Test: full auth flow end-to-end

---

## Day 4 — Sunday Apr 13: ROLA Complete + Escrow V3 Start

**Morning: ROLA polish**
- [ ] Edge cases: expired challenges, invalid signatures
- [ ] Add auth middleware to protected API routes
- [ ] Update tests (pipeline-test.js)

**Afternoon: Escrow V3 Scrypto**
- [ ] `accepted_tokens: KeyValueStore<ResourceAddress, bool>`
- [ ] `min_deposits: KeyValueStore<ResourceAddress, Decimal>`
- [ ] `fee_vaults: KeyValueStore<ResourceAddress, Vault>`
- [ ] Admin: `add_accepted_token()`, `update_token_min_deposit()`
- [ ] Tests for multi-token support

---

## Day 5 — Monday Apr 14: Escrow V3 Deploy

**Morning: Escrow V3 complete**
- [ ] Build on VPS (Mac can't build WASM)
- [ ] Deploy to stokenet
- [ ] Test: fund with XRD, fUSD, hUSDC
- [ ] Test: claim + verify + release + fee collection

**Afternoon: Wire into guild**
- [ ] Update bot: `/bounty fund` supports token selection
- [ ] Update dashboard: fund button with token dropdown
- [ ] Update constants.ts with V3 component address
- [ ] Update manifests for each token type

---

## Day 6 — Tuesday Apr 15: Dashboard Writes (Part 1)

**Full day: Governance from web UI**
- [ ] Vote from dashboard — TX manifest or API call
- [ ] Create proposal from dashboard — form → API POST
- [ ] Requires ROLA auth (Day 3-4)
- [ ] Real-time vote count updates
- [ ] Test: create proposal from dashboard, vote from TG, verify counts match

---

## Day 7 — Wednesday Apr 16: Dashboard Writes (Part 2)

**Full day: Task marketplace from web UI**
- [ ] Claim task from dashboard — "Claim" button with wallet proof
- [ ] Fund task from dashboard — TX manifest for escrow deposit
- [ ] Submit work from dashboard — form with URL/description
- [ ] All actions require ROLA auth
- [ ] Test: full bounty lifecycle from dashboard only

---

## Day 8 — Thursday Apr 17: Hyperscale-RS

**Full day: PR #2 + PR #3**
- [ ] Pull latest main (codebase moves fast)
- [ ] PR #2: Livelock tombstone cleanup (2-3 hours)
  - Add `cleanup_tombstones(committed_height)`
  - Match pattern from mempool cleanup
  - Tests + metric gauge
- [ ] PR #3: Execution early state cleanup (4-6 hours)
  - Age-based cleanup for `early_provisioning_complete`, `early_certificates`, `early_votes`
  - Orphaned block cleanup in `prune_execution_state()`
  - Tests for cleanup behavior
- [ ] Submit both PRs

---

## Day 9 — Friday Apr 18: Sats + Agents

**Morning: Sats trading hardening**
- [ ] Review the 72h+ stuck trade — close or fix strategy
- [ ] Watchdog: smarter alerts (don't spam, escalate severity over time)
- [ ] Re-enable watchdog with refined thresholds
- [ ] Review trade P&L since deployment

**Afternoon: Agent refinement**
- [ ] Set up Bert GitHub PAT (push to bert/* branches)
- [ ] Test Bert → agent dispatch via TG
- [ ] Run researcher agent on guild codebase for improvement suggestions
- [ ] Update agent profiles for new guild features

---

## Day 10 — Weekend Apr 19-20: Polish + Outreach

**Saturday: Integration testing**
- [ ] Full pipeline tests on all guild features
- [ ] Kuma all green
- [ ] Demo video (#36) — 2-minute walkthrough of guild features
- [ ] Screenshot deck for proposal

**Sunday: Community outreach**
- [ ] Refine proposal based on week's feedback
- [ ] Post progress update to RadixTalk
- [ ] DM 10-20 Radix OGs with guild invite
- [ ] Prepare week 2 plan based on community response

---

## Parallel Tracks (Throughout Sprint)

### Monitoring (Automated)
- trade-monitor: every 4h
- scrypto-health: every 12h
- guild-health: every 6h
- daily-digest: 8am
- Kuma: 18 monitors across 2 VPS

### Community (Daily)
- Check RadixTalk for proposal replies
- Check TG for guild feedback
- Check `/adminfeedback` for support tickets
- Monitor Bert's /usage costs

### Hyperscale-RS (Opportunistic)
- Check for maintainer response on #22
- Check for new issues/PRs
- Review any merged changes that affect our contribution areas

---

## Success Criteria (End of Sprint)

- [ ] Proposal posted on RadixTalk with initial community response
- [ ] ROLA auth live on guild dashboard
- [ ] Escrow V3 deployed (multi-token)
- [ ] Dashboard write operations working (vote, propose, claim, fund)
- [ ] 2+ hyperscale-rs PRs submitted
- [ ] All Kuma monitors green
- [ ] Working groups active with at least 1 real community member
- [ ] Demo video recorded
- [ ] Sats trade monitoring stable (no spam alerts)
