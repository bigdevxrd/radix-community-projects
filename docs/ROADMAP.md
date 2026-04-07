# Radix Guild — Full Roadmap & Monetization Plan

## Context

Radix Guild is live at radixguild.com — 14 dashboard pages, 70 pipeline tests, 22+ bot commands, on-chain badges, two-tier governance, task marketplace with categories/milestones/fees, gamification, support system, and full transparency.

**Goal:** Build the Web3 task marketplace for Radix — then for the wider ecosystem. Open source core, fees + royalties fund the guild treasury.

**Revenue model:** 2.5% platform fee on task payouts + Scrypto component royalties + SaaS hosting. All charter-voteable. A percentage of all revenue flows back to the guild treasury.

**Timeline:** Monthly milestones. Marketplace is the primary income engine.

---

## PHASE 1: BUILD (Apr 3-5) — DONE
## PHASE 2: POLISH + DOMAIN (Apr 6-7) — DONE

**Shipped in 1 day:** Custom domain, 14 pages (was 10), 70 tests (was 39), proposal classification, Vote Now hero + countdowns, support system, FAQ matcher, task marketplace Phase 1 (categories, milestones, applications, fees, detail page, wizard, cron), transparency page, docs overhaul, onboarding card, Discord webhook, economics model, strategic architecture, 14 commits.

---

## PHASE 3: BETA + COMMUNITY (April 7-30)

**Goal:** Get 20-50 real users. Collect feedback. Prove the system works with real governance.

### Week 1 (Apr 7-13): Beta Launch + Outreach
- [x] Announce radixguild.com in Radix TG groups (in progress)
- [ ] Post on RadixTalk forum (TESTER-INVITE.md ready)
- [ ] Post in Radix Discord #developers
- [ ] DM 10-20 Radix OGs personally
- [x] Fund bot signer account (5 XRD — done, wallet recovery issue noted)
- [x] 14 dashboard pages live + 70 tests passing
- [x] Support system live (/feedback + FAQ matcher)
- [x] Task marketplace Phase 1 complete (categories, fees, wizard, cron)
- [ ] Set DISCORD_WEBHOOK_URL on VPS
- [ ] Monitor P1-P6 vote results (expire ~Apr 8)

### Week 2 (Apr 14-20): Respond to Feedback
- [ ] Fix reported bugs (use /adminfeedback to track)
- [ ] Process Charter foundation votes (P1-P6 results)
- [ ] Charter guided wizard (#69)
- [ ] Track metrics via /api/health + /api/stats
- [ ] Demo video (#36) if time permits

### Week 3-4 (Apr 21-30): Assessment
- [ ] Compile beta metrics: badges minted, votes cast, proposals created
- [ ] Write "State of the Guild" post for community
- [ ] Decision: what does the community want next?

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

## STRATEGIC ARCHITECTURE: TWO PRODUCTS, ONE CODEBASE

The guild produces two products from one codebase. No fork needed — feature flags control what's enabled.

### The Two Products

| Product | Purpose | Revenue | Who Pays |
|---------|---------|---------|----------|
| **Governance** | Voting, charter, CV2, proposals, game | Free | Nobody — drives adoption |
| **Marketplace** | Tasks, bounties, escrow, profiles, matching | 2.5% fee + royalties | Task creators |

### Why Not Fork?

- **Badge is the bridge** — your identity works in both products. Free governance gets people in. Marketplace monetizes their work.
- **Shared infrastructure** — bot, dashboard, API, database. One deployment, two value streams.
- **Network effect** — governance users become marketplace users. Reputation earned voting carries over to task completion.
- **No code duplication** — one codebase to maintain, one test suite, one deploy pipeline.

### How It Works

```
tenant.config.js:
  features:
    governance: true      ← FREE (always on for community)
    marketplace: true     ← FEE-GENERATING (opt-in per deployment)
    game: true            ← ENGAGEMENT (always on)
    cv2: true             ← ON-CHAIN VOTING (opt-in)
  fees:
    platformFeePct: 2.5   ← marketplace fee (charter-voteable)
    treasurySharePct: 50  ← % of fees to guild treasury
```

### The Business Model

```
FREE: Connect wallet → mint badge → vote on proposals → earn XP → play game
  ↓
PAID: Post a task → fund escrow → worker delivers → 2.5% fee → guild treasury
  ↓
PASSIVE: Every Scrypto component call → royalty → guild treasury
  ↓
SAAS: Other communities deploy their own → hosting fee + component royalties
```

**The funnel:** Free governance attracts users. Users with badges become marketplace participants. Marketplace generates fees. Fees fund development. Development produces more royalty-earning code. The flywheel spins.

### Low Friction for Community

| Action | Cost to User | Revenue to Guild |
|--------|-------------|-----------------|
| Mint badge | Free | Component royalty (waived in beta) |
| Vote on proposal | Free | Nothing |
| Create temp check | Free | Nothing |
| Play dice game | Free | Nothing |
| Earn XP | Free | Component royalty (0.1 XRD) |
| **Post a task** | **2.5% of reward** | **Fee + component royalty** |
| **Complete a task** | **Free** | **Nothing — worker gets 100%** |

The community gets governance for free. The marketplace earns when real value moves.

---

## TASK MARKETPLACE (Primary Income Engine)

The bounty system evolves into a full task marketplace. 5 phases, detailed plan in `docs/MARKETPLACE-PLAN.md`.

### Phase 1A: Enhanced Task Board — SHIPPED (Apr 7)
- [x] 6 task categories (dev, design, content, marketing, testing, general)
- [x] Platform config: 2.5% fee, min/max XRD, deadlines (charter-voteable)
- [x] Bounty detail page (`/bounties/[id]`) with fee breakdown, criteria, milestones, applications
- [x] Filtered API (`?category=development&sort=reward_desc`)
- [x] Database: milestones, applications, categories, platform_config tables

### Phase 1B-C: Bot + Dashboard Polish (Apr 14-27)
- [ ] Bot wizard expansion: 3 → 7 steps (category, difficulty, deadline, criteria)
- [ ] Category filter pills on bounties page
- [ ] Deadline countdown on bounty cards
- [ ] Hourly cron: auto-cancel expired open tasks
- [ ] `/bounty apply`, `/bounty approve`, `/bounty cancel` commands

### Phase 2: On-Chain Escrow (May-Jun)
- [ ] TaskEscrow Scrypto component (atomic escrow → verify → pay)
- [ ] Receipt NFT pattern (creator gets non-transferable receipt)
- [ ] Royalties: create_task 0.5 XRD, verify_task 0.25 XRD
- [ ] Dashboard `/bounties/create` web form with wallet signing
- [ ] Auto-refund after deadline + grace period

### Phase 3: Marketplace UX (Jul-Aug)
- [ ] Worker/client profiles with ratings
- [ ] Skill-based matching ("recommended for you")
- [ ] Notification system (bot DMs + dashboard bell)
- [ ] `/marketplace` discovery page

### Phase 4: SaaS + Multi-Tenant (Sep-Oct)
- [ ] TaskEscrowFactory (10 XRD factory royalty per deployment)
- [ ] White-label marketplace per tenant
- [ ] Configurable fee % per tenant

### Phase 5: Wider Market (Nov+)
- [ ] Multi-currency (XRD + stablecoins)
- [ ] Cross-community federation
- [ ] External API with webhooks

### Revenue Flow — How Fees Fund the Guild

```
Task created (100 XRD)
  ├── 97.5 XRD → Escrow (held for worker)
  ├── 2.5 XRD → Platform fee vault
  │     ├── 50% → Guild treasury (community fund)
  │     └── 50% → Operations (hosting, dev, admin)
  └── 0.5 XRD → Component royalty (on-chain, automatic)
        └── 100% → Guild treasury

Task verified → 97.5 XRD released to worker
  └── 0.25 XRD → Component royalty (on-chain, automatic)

Every task funds the guild. Every component call earns royalties.
The code produces value that produces value.
```

### Revenue Split (Charter-Voteable)

| Revenue Source | Guild Treasury | Operations | Worker |
|---------------|---------------|------------|--------|
| Task reward | 0% | 0% | 100% of net |
| Platform fee (2.5%) | 50% | 50% | 0% |
| Component royalties | 100% | 0% | 0% |
| SaaS hosting fees | 50% | 50% | 0% |

All percentages adjustable by charter vote. The community decides the split.

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

## AI ASSISTANT (Pay-Per-Use Service)

### How It Works
Members deposit XRD → get AI credits. Credits power governance tools (proposal drafting, charter analysis, bounty scoping). The guild runs the LLM server-side. Members never touch an API key.

### Pricing: At-Cost + 1% Admin Fee

| What | Amount | Why |
|------|--------|-----|
| 1 AI credit | 1 XRD | Covers LLM API cost |
| Admin fee | +1% (0.01 XRD) | Covers infrastructure overhead |
| **Total per credit** | **1.01 XRD** | **Transparent, near-cost** |

This is a **service**, not a profit centre. The 1% covers server time, storage, and rate limiting. The guild doesn't mark up AI — it provides access at cost.

### Hard Numbers
- LLM cost per call: ~$0.002-0.01 (Claude Haiku for simple, Sonnet for complex)
- At $0.06/XRD: 1 XRD = $0.06 → covers the API call with margin
- At $0.50/XRD: 1 XRD = $0.50 → significant surplus flows to treasury
- The admin fee (1%) at any XRD price is negligible — it's a rounding error, not revenue
- **Real margin comes from XRD appreciation**, not from markup

### Configurable Parameters (Charter Votes)
All settings adjustable by community vote:

| Parameter | Default | Adjustable? |
|-----------|---------|-------------|
| Credit price | 1 XRD | Yes — charter vote |
| Admin fee | 1% | Yes — charter vote |
| Daily limit per user | 20 credits | Yes — charter vote |
| Model tier | Haiku (fast/cheap) | Yes — charter vote |
| Free credits for new members | 5 | Yes — charter vote |

### Implementation
- Dashboard: `/assist` page — credit balance, chat interface, usage log
- Bot: `/assist <question>` — deducts 1 credit, returns AI response
- API: `POST /api/assist` — badge-gated, credit-gated, rate-limited
- Storage: `credits` table (tg_id, balance, total_purchased, total_used)
- Payment: XRD to treasury wallet → bot confirms receipt → credits added

---

## GUILD MEMBERSHIP & TREASURY MODEL

### The Elevator Pitch (30 seconds)

> Join for $10 in XRD. Pick which department gets it.
> The guild builds Scrypto tools. Every tool earns on-chain royalties.
> Royalties fund more tools. Your $10 becomes infrastructure that pays for itself.
>
> **$10 in → tools built → royalties earned → more tools built → forever.**

### The Math (No Fluff)

**One-time membership: $10 USD equivalent in XRD**
- Member picks allocation: Development, Infrastructure, Marketing, BD, Community
- That's it. No monthly fees. No subscriptions. One payment, one vote on where it goes.

| Members | Treasury (one-time) | What It Covers |
|---------|-------------------|----------------|
| 10 | $100 | 1 year hosting + domain |
| 50 | $500 | + first dev bounties |
| 100 | $1,000 | + marketing + 10 bounties |
| 500 | $5,000 | + serious development capacity |
| 1,000 | $10,000 | + full operations for 12+ months |

**But the treasury doesn't stay at $1,000.** It grows because of the royalty flywheel:

### The Royalty Flywheel

```
Member pays $10 → Treasury funds development
    ↓
Dev builds Scrypto component → Deployed to mainnet with royalties
    ↓
Every call to that component pays XRD → Flows to guild treasury
    ↓
Treasury funds more development → More components → More royalties
    ↓
LOOP (self-sustaining after critical mass)
```

**Current royalty streams (already live):**

| Component | Method | Royalty | Calls/Year (est) | Annual XRD |
|-----------|--------|---------|-------------------|------------|
| BadgeManager | mint | 1 XRD | 200 | 200 |
| BadgeManager | update_xp | 0.1 XRD | 2,000 | 200 |
| BadgeManager | update_tier | 0.25 XRD | 100 | 25 |
| BadgeFactory | create_manager | 5 XRD | 10 | 50 |
| **Total** | | | | **475 XRD/yr** |

**With SaaS tenants (each deploys guild-built components):**

| Tenants | Mints/yr | XP updates/yr | Annual Royalties |
|---------|----------|---------------|-----------------|
| 1 (Radix Guild) | 200 | 2,000 | 475 XRD |
| 5 | 1,000 | 10,000 | 2,375 XRD |
| 10 | 2,000 | 20,000 | 4,750 XRD |
| 50 | 10,000 | 100,000 | 23,750 XRD |

**At $0.06/XRD:** 4,750 XRD = $285/yr (covers all costs at 10 tenants)
**At $0.50/XRD:** 4,750 XRD = $2,375/yr (funds serious operations)

### Self-Sustainability Threshold

| Scenario | Annual Costs | Annual Royalty Income | Sustainable? |
|----------|-------------|----------------------|-------------|
| Today (1 tenant, $0.06/XRD) | $94 | $28 | No — needs membership funds |
| 5 tenants, $0.06/XRD | $94 | $142 | **Yes — royalties > costs** |
| 10 tenants, $0.06/XRD | $150 | $285 | Yes — with surplus |
| 10 tenants, $0.50/XRD | $150 | $2,375 | Yes — significant growth capital |

**The guild becomes self-sustaining at ~5 tenants using guild-built components.** Membership fees are the bootstrap; royalties are the engine.

### Department Allocation (Community-Controlled)

Members allocate their $10 across departments. Departments and their budgets are charter parameters — the community can vote to add, remove, or rebalance at any time.

**Default departments:**

| Department | What It Funds | Example Spend |
|-----------|--------------|---------------|
| Infrastructure | Hosting, domain, monitoring, backups | $7/mo VPS, $1/mo domain |
| Development | Features, bug fixes, Scrypto components | $50-200 per bounty |
| Marketing | Content, outreach, community growth | $20-100 per campaign |
| Business Dev | SaaS sales, partnerships, integrations | Time + travel |
| Community | Bounties, grants, events, education | $25-100 per task |

**All adjustable by charter vote:**
- Add new department → charter proposal
- Change allocation limits → charter proposal
- Merge departments → charter proposal
- Remove department → charter proposal

### Transparency Rules (Non-Negotiable)

1. Every XRD received is logged on-chain (treasury wallet is public)
2. Every spend requires a passed proposal (charter-linked, binding)
3. Monthly "State of the Guild" report auto-generated from on-chain data
4. Royalty income visible in real-time on /transparency page
5. Department balances visible on dashboard
6. Anyone can audit — it's a public ledger

### Configurable Parameters (All Charter Votes)

| Parameter | Default | Who Changes It |
|-----------|---------|---------------|
| Membership fee | $10 USD equiv in XRD | Charter vote |
| Department list | 5 departments | Charter vote |
| Spending approval threshold | >60% | Charter vote |
| Max single spend without vote | 50 XRD | Charter vote |
| Monthly reporting | Required | Charter vote (can't be disabled in Y1) |
| Royalty allocation | 100% to treasury | Charter vote |
| Free badge minting | Yes (during beta) | Charter vote |

---

## COMBINED ECONOMICS (Hard Facts)

### Revenue Streams

| Stream | Type | Recurring? | Controlled By |
|--------|------|-----------|---------------|
| Membership ($10 one-off) | Bootstrap capital | No — one-time | Charter (fee amount) |
| Component royalties | On-chain, automatic | Yes — every call | Scrypto (immutable) |
| AI credits (1% admin) | Per-use | Yes — per interaction | Charter (fee %) |
| SaaS hosting fees | Per-customer | Yes — monthly | Market pricing |

### 36-Month Model

| Year | Members | Tenants | Royalties/yr | Treasury | Status |
|------|---------|---------|-------------|----------|--------|
| Y1 | 100 | 1-3 | ~500 XRD | $1,000 (membership) + $30 (royalties) | **Bootstrap** — membership funds ops |
| Y2 | 300 | 5-10 | ~3,000 XRD | Growing | **Transition** — royalties approaching costs |
| Y3 | 500+ | 10-20 | ~10,000+ XRD | Self-funding | **Sustainable** — royalties exceed all costs |

### Break-Even (The Only Number That Matters)

**Fixed costs:** $94/year ($7.83/mo)
**Royalty income at 5 tenants:** ~$142/year at $0.06/XRD
**Break-even: 5 tenants using guild-built Scrypto components.**

No token. No speculation. No donations. Just code that earns royalties.

### The Value Loop (Why It's Bulletproof)

```
$10 membership → treasury
treasury → funds Scrypto development (bounties)
Scrypto component deployed → earns royalties on every call
royalties → treasury
treasury → funds more Scrypto development
more components → more royalties → more development → more components
```

**Every dollar spent on development becomes a permanent royalty-earning asset on the Radix ledger.** The code doesn't depreciate. The royalties don't stop. The guild produces value that produces value.

---

## WHAT TO DO RIGHT NOW

1. **Don't build SaaS or AI yet.** Focus on beta testing (Phase 3)
2. **Let the community validate the product** before adding complexity
3. **The open source repo is your pitch deck** — every user is a testimonial
4. **Track metrics** — badges minted, votes cast, proposals created
5. **When someone says "I want this for my project"** — build SaaS config layer
6. **When 20+ members have badges** — launch membership + AI credits
7. **All economics are charter-voteable** — the community adjusts everything
8. **The math is on the start page** — show visitors the numbers upfront, no fluff

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
