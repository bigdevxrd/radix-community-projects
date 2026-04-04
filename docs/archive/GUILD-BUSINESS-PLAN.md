# Radix Guild — MVP Business Plan

## DRAFT — For Discussion and Temperature Checking

---

## What Is the Guild?

The Guild is a **builder group** — the team that creates and deploys governance infrastructure, runs nodes, and maintains tooling for the Radix community. We're not a DAO ourselves — we're the people who build DAOs for others.

Think of it as a **web3 dev shop / infrastructure provider** that happens to be open source and community-funded.

---

## What We Provide

### Infrastructure
- **Main Validator Node** — secures the Radix network, earns staking rewards
- **Backup Validator Node** — redundancy for 99.9% uptime
- **Gateway Node** — serves API requests for dApps (currently Foundation-run, transitioning to community)
- **VPS Hosting** — bot, dashboard, APIs

### Software
- **TG Governance Bot** — proposals, voting, badges
- **Badge Manager** — on-chain identity + reputation
- **Guild Dashboard** — web interface for badge management
- **Framework Spec** — open source blueprints for other builders

### Services
- **Badge-as-a-Service** — any Radix project can use our badge infrastructure
- **Governance-as-a-Service** — TG bot setup for other DAOs
- **Node Operations** — reliable validator for stakers

---

## Revenue Model

### Year 1 (Bootstrap)

| Source | Monthly | Annual | Notes |
|--------|---------|--------|-------|
| Validator staking rewards | $200-500 | $2,400-6,000 | Depends on stake attracted |
| Gateway API fees | $0 | $0 | Free in year 1 to attract usage |
| Component royalties | $5-20 | $60-240 | Badge mint/update fees |
| Grants (Booster/Foundry) | Variable | $750-7,500 | One-time applications |
| **Total** | **~$300-600** | **~$3,200-13,700** | |

### Year 2 (Growth)

| Source | Monthly | Annual | Notes |
|--------|---------|--------|-------|
| Validator rewards (more stake) | $500-1,500 | $6,000-18,000 | |
| Gateway API fees | $100-300 | $1,200-3,600 | Pay-per-use or subscription |
| Badge-as-a-Service | $50-200 | $600-2,400 | Per-project fees |
| Component royalties | $50-100 | $600-1,200 | Scales with usage |
| Dev services (consulting) | $500-2,000 | $6,000-24,000 | Custom blueprint work |
| **Total** | **~$1,200-4,100** | **~$14,400-49,200** | |

### Year 3 (Sustainable)

| Source | Monthly | Annual | Notes |
|--------|---------|--------|-------|
| Node operations (3 nodes) | $1,000-3,000 | $12,000-36,000 | |
| Gateway + API services | $300-1,000 | $3,600-12,000 | |
| Badge/governance SaaS | $200-500 | $2,400-6,000 | |
| Dev services | $1,000-3,000 | $12,000-36,000 | |
| **Total** | **~$2,500-7,500** | **~$30,000-90,000** | |

---

## Cost Structure

### Infrastructure Costs

| Item | Monthly | Annual | Notes |
|------|---------|--------|-------|
| Main Validator Node | $50-100 | $600-1,200 | Dedicated server |
| Backup Validator Node | $50-100 | $600-1,200 | Failover |
| Gateway Node | $100-200 | $1,200-2,400 | Higher spec for API serving |
| Application VPS (current) | $14 | $168 | Bot, dashboard, APIs |
| Domain | $12 | $12 | When we get a proper domain |
| **Total Infra** | **$226-426** | **$2,580-5,000** | |

### People Costs (If Funded)

| Role | Monthly | Annual | Notes |
|------|---------|--------|-------|
| Lead Dev (part-time) | $1,000-2,000 | $12,000-24,000 | Blueprint development |
| Community Manager (part-time) | $500-1,000 | $6,000-12,000 | TG moderation, onboarding |
| Node Operator (part-time) | $500 | $6,000 | Monitoring, updates |
| **Total People** | **$2,000-3,500** | **$24,000-42,000** | |

### Total Annual Cost

| Scenario | Infrastructure | People | Total |
|----------|---------------|--------|-------|
| **Lean (volunteer)** | $2,580 | $0 | **$2,580** |
| **Minimal team** | $5,000 | $24,000 | **$29,000** |
| **Full team** | $5,000 | $42,000 | **$47,000** |

---

## Break-Even Analysis

| Scenario | Annual Cost | Revenue Needed | When |
|----------|-----------|----------------|------|
| Lean (volunteer) | $2,580 | Validator rewards cover it | Month 3-6 |
| Minimal team | $29,000 | Need grants + node rewards + services | Year 2 |
| Full team | $47,000 | Need all revenue streams active | Year 2-3 |

**The lean path is self-sustaining almost immediately** — a validator node earning $200+/month covers infra.

---

## Treasury Structure

### Initial Funding Options

**Option A: Self-Funded (Minimal)**
- Big Dev covers infra ($14/month) until validator rewards cover it
- No treasury needed initially
- Grow organically from staking rewards

**Option B: Small Pool (3-5 contributors)**
- Each contributes 10,000-20,000 XRD
- Pool: 30,000-100,000 XRD
- Covers: 3 months infra + first validator stake + bounties
- Managed by multi-sig or documented shared access

**Option C: Community Grant**
- Apply for Radix Booster Grant (up to 250,000 XRD)
- Apply for Foundry Program (larger, incubation)
- Covers: 6-12 months of operations

**Option D: Hybrid (Recommended)**
- Self-funded for infra (month 1-3)
- Apply for Booster Grant (month 2)
- Launch validator node (month 3)
- Revenue from staking covers ongoing costs
- Grant covers bounties + development

---

## Token Discussion (Temperature Check)

### Does the Guild need its own token?

**Arguments FOR a Guild token:**
- Governance weight beyond just badges
- Staking/delegation mechanisms
- Treasury management token
- Alignment incentive for long-term contributors

**Arguments AGAINST:**
- XRD already exists as the network token
- Another token adds complexity and speculation
- Badge tiers already provide governance weight
- "No new token" was a founding principle

**Current Position:** No token. Use XRD for value transfer, badges for governance weight. Revisit if the community votes to change this.

### Temperature Check Proposals

```
/temp Should the Guild have its own governance token separate from XRD?
```

```
/temp Should the Guild run a Radix validator node to fund operations?
```

```
/poll How should the Guild fund initial operations? | Self-funded | Small contributor pool | Booster Grant | Hybrid (self + grant)
```

---

## Node Specifications

### Main Validator Node
- **Purpose:** Secure the network, earn staking rewards
- **Spec:** 8 CPU, 32GB RAM, 500GB SSD, dedicated server
- **Cost:** ~$50-100/month
- **Expected yield:** Depends on stake attracted

### Backup Validator Node
- **Purpose:** Failover if main goes down, 99.9% uptime
- **Spec:** Same as main
- **Cost:** ~$50-100/month
- **Location:** Different data center than main

### Gateway Node
- **Purpose:** Serve Radix Gateway API for dApps
- **Spec:** 8 CPU, 64GB RAM, 1TB SSD (API-heavy workload)
- **Cost:** ~$100-200/month
- **Note:** This is currently Foundation-run, transitioning to community via RFP

---

## Timeline

| Month | Milestone |
|-------|-----------|
| 1 (Now) | TG bot + badges live, community testing |
| 2 | Validator node launched, Booster Grant applied |
| 3 | Gateway node RFP submitted, first bounties paid |
| 4-6 | Sustainable from staking rewards, community growing |
| 7-12 | Full service offering, multiple projects using badges |

---

## This Is a Starting Point

This plan is for discussion. Every number, every decision should be voted on by badge holders. The Guild governs itself with the same tools it builds for others.

Post your thoughts. Vote on the temp checks. Shape this together.
