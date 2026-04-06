# Radix Guild — Full Roadmap & Monetization Plan

## Context

Radix Guild v1.0.0 is live at radixguild.com with 39/39 tests passing, custom domain, 12 dashboard pages, TG bot with 22+ commands, on-chain badges, two-tier governance, bounties, gamification, and a transparency page. The open source repo is the sales demo. The private guild-saas repo is the revenue engine.

**Goal:** Turn this world-class dApp into a sustainable business while growing the Radix community.

**First target customer:** Radix Foundation / RAC — if they adopt it, the ecosystem follows.

**Timeline:** Monthly milestones. No rush. Planning makes perfect.

---

## PHASE 1: BUILD (Apr 3-5) — DONE
## PHASE 2: POLISH + DOMAIN (Apr 6) — DONE

---

## PHASE 3: BETA + COMMUNITY (April 7-30)

**Goal:** Get 20-50 real users. Collect feedback. Prove the system works with real governance.

### Week 1 (Apr 7-13): Beta Launch
- [ ] Announce radixguild.com in Radix TG groups
- [ ] Post on RadixTalk forum (TESTER-INVITE.md is ready)
- [ ] Post in Radix Discord #developers
- [ ] DM 10-20 Radix OGs personally
- [ ] Monitor bot logs daily, fix bugs within 24h
- [ ] Fund bot signer account (5 XRD)
- [ ] Test full mint → vote → XP flow on production

### Week 2 (Apr 14-20): Respond to Feedback
- [ ] Fix reported bugs (prioritize by user impact)
- [ ] Process Charter foundation votes (6 live proposals)
- [ ] Track: how many badges minted, votes cast, proposals created
- [ ] Identify friction points in onboarding
- [ ] Review open PRs (#48, #50, #51, #39, #37)

### Week 3 (Apr 21-27): Polish Round 2
- [ ] "New to Radix?" onboarding card (#71)
- [ ] Dashboard home cleanup (#70)
- [ ] Charter guided wizard (#69)
- [ ] Any UX fixes from beta feedback
- [ ] Update docs based on real user questions

### Week 4 (Apr 28-30): Metrics & Assessment
- [ ] Compile beta metrics: users, badges, votes, proposals, bounties
- [ ] Write "State of the Guild" post for community
- [ ] Identify which Phase 4 features users actually want
- [ ] Decision: is Stage 2 (working groups) needed yet?

**Success criteria:** 20+ badges minted, 50+ votes cast, 3+ community-created proposals, zero critical bugs for 7 days.

---

## ON-CHAIN ROYALTIES (Ongoing — Already Live)

The Badge Manager Scrypto components have royalties configured on mainnet. These accrue automatically on every method call and can be claimed by the component owner at any time.

### Current Royalty Schedule

| Component | Method | Royalty | Status |
|-----------|--------|---------|--------|
| BadgeFactory | `create_manager` | 5 XRD | Live (updatable) |
| BadgeManager | `public_mint` | 1 XRD | **Waived (free mint ON for beta)** |
| BadgeManager | `revoke` | 0.5 XRD | Live |
| BadgeManager | `update_tier` | 0.25 XRD | Live |
| BadgeManager | `update_xp` | 0.1 XRD | Live |
| BadgeManager | `update_extra_data` | 0.1 XRD | Live |
| BadgeManager | Reads | Free | Locked (always free) |

### Royalty Strategy

**Phase 3 (Beta — April):**
- Keep free mint ON — zero friction for onboarding
- XP/tier update royalties are already accruing from batch signer operations
- [ ] Write a `claim-royalties.js` script to withdraw accrued royalties from components
- [ ] Check current royalty balance on BadgeFactory + BadgeManager
- [ ] Claim any accrued royalties to the agent wallet

**Phase 4+ (Post-Beta):**
- [ ] Decision: when to turn off free mint (Charter vote? After 100 badges? After first customer?)
- [ ] Consider: keep mint free for Radix Guild, charge for SaaS tenants
- [ ] Each SaaS tenant gets their own BadgeManager with configurable royalties
- [ ] Royalties flow to tenant's component owner (Big Dev for managed, customer for self-hosted)

**Phase 7 (Scale):**
- Every SaaS tenant deployment creates a new BadgeManager = new royalty stream
- 10 tenants x 100 mints each x 1 XRD = 1,000 XRD passive income
- Component royalties are automatic, on-chain, no invoicing needed
- This is the moat — the more badges minted, the more royalties flow

### On-Chain Addresses (for claiming)

| Component | Address |
|-----------|---------|
| BadgeFactory | `component_rdx1cqxdsz6d3zjsjx7shk2fgg8dazmrknygvqsa4943yw0yz4e69taxhg` |
| BadgeManager | `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva` |
| Owner Badge | `resource_rdx1t4nl08p3x3m4y2c9hn97957cvuxh0rgcl92gkur9ffc3duj90rsjvg` |
| Agent Wallet | `account_rdx128lggt503h7m2dhzqnrkkqv4zklxcjmdggr8xxtqy8e47p7fkmd8cx` |

To claim: present Owner Badge, call `claim_royalties()` on each component. Royalties withdraw to the caller's wallet.

---

## PHASE 4: SAAS CONFIG LAYER (May 2026)

**Goal:** Make the codebase deployable for any DAO, not just Radix Guild. This is the revenue foundation.

### Architecture: Tenant Config

Create a single `tenant.config.js` that defines everything unique to a deployment:

```
tenant.config.js
├── identity (DAO name, description, logo URL)
├── branding (colors, theme, favicon, OG image)
├── radix (dApp def, manager, badge NFT, admin badge, CV2 component)
├── telegram (bot token, group ID, bot username)
├── governance (proposal duration, quorum, voting model)
├── gamification (XP rewards, tier thresholds, tier names)
├── ecosystem (external links, resources, partners)
├── features (CV2 enabled, bounties enabled, game enabled)
└── royalties (mint cost, tier update cost, XP update cost)
```

Both bot and dashboard read from this config. Environment variables override for secrets (tokens, keys). Everything else is in the config file.

### Week 1 (May 4-10): Config Layer
- [ ] Design TenantConfig TypeScript interface
- [ ] Create tenant.config.js for Radix Guild (extract all hardcoded values)
- [ ] Update bot/index.js to read from config (DAO name, links, durations)
- [ ] Update guild-app constants.ts to read from config
- [ ] Update AppShell, layout.tsx to use config branding
- [ ] Update ecosystem links, quick actions, resources from config
- [ ] All existing tests still pass with config layer

### Week 2 (May 11-17): Multi-Instance Deployment
- [ ] Create deploy script that takes a tenant config as input
- [ ] Create ecosystem.config.js template (PM2 per tenant)
- [ ] Create Caddyfile template (domain per tenant)
- [ ] Document: "Deploy a new DAO in 30 minutes" guide
- [ ] Test: deploy a second instance locally with different config
- [ ] Merge recent main commits into guild-saas repo

### Week 3 (May 18-24): Badge Factory Per Tenant
- [ ] Script: deploy new BadgeManager for a tenant (create_manager call)
- [ ] Script: configure royalties per tenant
- [ ] Script: set up dApp definition account per tenant
- [ ] Document: on-chain setup checklist for new tenants
- [ ] Test: full flow with a "demo-dao" tenant config

### Week 4 (May 25-31): Testing + Documentation
- [ ] Pipeline test suite works with any tenant config
- [ ] Security audit on config layer (no secret leakage)
- [ ] Create pitch deck / one-pager for potential customers
- [ ] Write pricing page content
- [ ] Record demo video showing multi-tenant capability

**Success criteria:** Can deploy a new DAO instance in <30 minutes with a different config file. Radix Guild still works perfectly. One "demo-dao" instance running locally.

---

## PHASE 5: PITCH + FIRST CUSTOMER (June 2026)

**Goal:** Get Radix Foundation or one DeFi project to adopt the platform.

### The Pitch to Radix Foundation

**Why they should care:**
- Community governance is their stated priority (RAC exists but has no tooling)
- 18K TG users with no structured way to make decisions
- radixguild.com proves it works — live, tested, open source
- Zero cost to them — it's already running
- They just need to endorse it / point people to it

**What you're offering:**
- Free tier: open source, self-hosted, community maintains it
- Managed tier: Big Dev hosts, maintains, and supports it
- The DAO Charter already has their governance framework built in

**The ask:** "Adopt Radix Guild as the community governance platform. We'll run it, maintain it, and train RAC members to use it."

### The Pitch to DeFi Projects

**Why they should care:**
- Their community needs governance (token votes, treasury decisions)
- Building governance tooling is expensive and not their core business
- Radix Guild is turnkey — badge, bot, dashboard, bounties in one package
- On-chain badges = portable identity across the ecosystem

**What you're offering:**
- Setup: 50-100 XRD (one-time) — custom badge schema, branding, TG bot
- Hosting: 20-50 XRD/mo — VPS, maintenance, updates, support
- Royalties: 1-5 XRD per badge mint (on-chain, automatic, passive)

### Schedule
- [ ] Week 1 (Jun 1-7): Finalize pitch deck + pricing
- [ ] Week 2 (Jun 8-14): Approach Radix Foundation (forum post, direct contact)
- [ ] Week 3 (Jun 15-21): Approach 3-5 DeFi projects (DM founders)
- [ ] Week 4 (Jun 22-30): Onboard first paying customer (if any)
- [ ] Ongoing: Iterate based on feedback

**Success criteria:** One signed customer OR Radix Foundation endorsement.

---

## PHASE 6: REVENUE FEATURES (July-August 2026)

**Goal:** Build features that generate ongoing revenue.

### Governance Assistant (Pay-Per-Use)
- LLM-powered proposal drafting ("help me write a proposal about X")
- POST /api/assist endpoint (badge-gated, rate limited)
- 0.5 XRD per assist → guild treasury
- SaaS markup: 1 XRD per assist (0.5 to DAO, 0.5 to platform)
- Cost: ~$0.002 per API call. Revenue: ~$0.03 per call. 15x margin.

### Working Groups (Stage 2)
- Only build when Charter Phase 1 votes complete
- working_groups + members tables
- /groups, /group join, /group create bot commands
- Dashboard /groups page
- Group leads can create bounties, tag proposals

### Achievement NFTs
- Milestone badges minted on-chain (5th grid completion, 100th vote, etc.)
- Achievement badge schema deployed via create_manager
- Batch signer writes game data to badge extra_data
- Collectible, visible in Radix Wallet

### RAC Elections (Stage 2b)
- Nomination → discussion → CV2 on-chain vote
- Winners get steward/elder tier badges
- Admin badge transfer to elected RAC (the endgame)

### Treasury Dashboard
- Multi-sig treasury with RAC member badges as signers
- Balance, pending, history views
- /treasury bot command

---

## PHASE 7: SCALE (September+ 2026)

**Goal:** Multiple customers, passive revenue, community-maintained.

### Revenue Targets

| Month | Customers | Monthly Revenue | Cumulative |
|-------|-----------|----------------|------------|
| Jun | 1 (Foundation) | 0 XRD (free tier) | 0 |
| Jul | 2 (+ 1 DeFi) | 50 XRD/mo | 50 |
| Aug | 3 | 100 XRD/mo | 150 |
| Sep | 5 | 200 XRD/mo | 350 |
| Dec | 10 | 500 XRD/mo | 1,350 |

Plus passive royalties: 1 XRD per badge mint across all tenants.
Plus assist fees: 0.5 XRD per governance assist across all tenants.

### Scaling Checklist
- [ ] PostgreSQL migration (SQLite won't scale past ~1000 concurrent users)
- [ ] Monitoring / alerting (uptime, error rates, API latency)
- [ ] Automated tenant provisioning (CLI tool or web form)
- [ ] Pricing page on radixguild.com
- [ ] Customer success: onboarding docs, video tutorials, support channel
- [ ] Consider: shared multi-tenant deployment (reduces ops, increases margin)

---

## PRICING MODEL (Draft)

### Open Source (Free)
- Self-hosted, self-maintained
- All core features (badges, voting, bounties, game)
- Community support (GitHub issues)
- MIT license

### Managed Hosting (Paid)
- Big Dev hosts and maintains
- Custom domain, branding, badge schema
- Dedicated TG bot instance
- Priority support (TG DM / email)
- **Setup:** 50-100 XRD one-time
- **Monthly:** 20-50 XRD/mo
- **Royalties:** 1-5 XRD per badge mint (on-chain, automatic)

### Enterprise (Custom)
- Custom features, integrations, workflows
- Multi-sig treasury setup
- Custom voting models
- Dedicated infrastructure
- **Pricing:** Project-based, negotiated

---

## CURRENT COSTS vs PROJECTED REVENUE

### Costs (Fixed)
| Item | Monthly | Annual |
|------|---------|--------|
| Guild VPS | $7 | $84 |
| Domain | $0.83 | $10 |
| **Total** | **$7.83** | **$94** |

### Revenue (Conservative, by December 2026)
| Source | Monthly | Annual |
|--------|---------|--------|
| 5 managed customers @ 30 XRD | 150 XRD (~$9) | $108 |
| Badge royalties (~200 mints) | 200 XRD (~$12) | $144 |
| Assist fees (~100 uses) | 50 XRD (~$3) | $36 |
| **Total** | **~$24/mo** | **~$288** |

Break-even at ~3 managed customers. Not getting rich, but self-sustaining and growing. The real value is in the network effect — more DAOs = more badges = more royalties = more gravity.

At $0.06/XRD (current). If XRD reaches $0.50 (previous ATH territory), that same 400 XRD/mo = $200/mo.

---

## WHAT TO DO RIGHT NOW

1. **Don't build SaaS yet.** Focus on beta testing (Phase 3)
2. **Let the community validate the product** before adding complexity
3. **The open source repo is your pitch deck** — every user is a testimonial
4. **Track metrics** — badges minted, votes cast, proposals created
5. **When someone says "I want this for my project"** — that's when you build the config layer

---

## KEY FILES FOR SAAS CONFIG LAYER (When Ready)

| File | What Changes |
|------|-------------|
| `tenant.config.js` (NEW) | All DAO-specific values in one place |
| `bot/index.js` | Read DAO name, links, durations from config |
| `guild-app/src/lib/constants.ts` | Read addresses, links, branding from config |
| `guild-app/src/components/AppShell.tsx` | DAO name, branding from config |
| `guild-app/src/app/layout.tsx` | SEO metadata from config |
| `guild-app/src/hooks/useWallet.tsx` | RDT app name from config |
| `scripts/deploy.sh` | Accept tenant config as parameter |
| `ecosystem.config.js` | Template for per-tenant PM2 config |

## VERIFICATION

Before any SaaS work begins:
- Phase 3 (Beta) success criteria met
- At least one person has asked "can I use this for my project?"
- All open bugs from beta are resolved
- Charter Phase 1 votes are progressing
