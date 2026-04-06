# DAO Tooling & Governance-as-a-Service Market Analysis

**Last updated:** 2026-04-06
**Purpose:** Factual competitive landscape for project positioning. No hype.

---

## 1. Market Size & Key Stats

| Metric | Value | Source / Date |
|--------|-------|---------------|
| Total DAOs established globally | ~13,000+ | CoinLaw 2025 |
| DAOs with regular activity | ~6,000 | CoinLaw 2025 |
| Total DAO treasury value (liquid) | ~$21-24.5B | CoinLaw / PatentPC 2025 |
| Average DAO treasury size | ~$1.2M | CoinLaw 2025 |
| Governance token holders | 6.5-11.1M addresses | CoinLaw 2025 |
| DAO treasury management market | $1.25B (2024), projected $5.38B by 2033 | Dataintelo |
| DAO CAGR (2021-2024) | ~30% | PatentPC |
| Treasury management CAGR | 19.7% (2025-2033) | Dataintelo |

---

## 2. Governance Participation (The Core Problem)

- **Average voter turnout: <10% of token holders** across most DAOs
- Some sources cite ~17% for larger DAOs; typical proposal attracts 350-500 voters
- Uniswap: 1M+ token holders, typical vote gets a few hundred participants
- **Top 0.1% of holders control ~90% of voting power** (top 10% hold 76.2%)
- Most proposals fail to reach quorum
- Rational apathy: gas costs, technical complexity, near-zero individual impact

**Delegate incentive experiments:**
- Uniswap: $540K delegate reward program (March 2025), up to $6K/month per delegate, requires 80% voting participation. 99% community approval.
- Arbitrum: introduced staking rewards to combat voter apathy

---

## 3. Major Governance Platforms

### Active

| Platform | Status | Chains | Pricing | Notes |
|----------|--------|--------|---------|-------|
| **Aragon** | Active, 3,000+ DAOs | Ethereum, Polygon, Arbitrum, Optimism, Base, Celo, Peaq, zkSync, Gnosis (9 chains) | Free (open source, gas only) | Modular, supports Safe multisigs as governing bodies. L2 gas savings up to 90% |
| **Snapshot** | Active, dominant for off-chain voting | Starknet, Ethereum, Optimism, Polygon, Arbitrum | Free (gasless off-chain voting) | Snapshot X launched for on-chain voting via Starknet. Most widely used governance voting tool |
| **Commonwealth** | Active | Multi-chain | Free tier available | Discussion + governance forum. Used by NEAR, Cosmos ecosystem. Less data available on current scale |
| **CharmVerse** | Active, 10 employees (NYC) | EVM chains | Community-based pricing via $DEV tokens (introduced June 2025) | All-in-one DAO ops: onboarding, bounties, proposals, project tracking. Used by Optimism Grants |
| **Colony** | Active | EVM chains | No-code toolkit, pricing unclear | Founded by Jack du Rose. Focused on contributor management |

### Shut Down / Inactive

| Platform | Status | Notes |
|----------|--------|-------|
| **Tally** | **Shut down March 2026** | Supported 500+ DAOs including Uniswap, Arbitrum, ENS. CEO cited no viable venture-backed business in governance tooling. Trump admin's permissive stance reduced demand for decentralized governance. Users migrating to Snapshot/Aragon |
| **DAOstack** | **Shut down 2022** | Raised ~$30M, ran out of funds. GEN token dropped 99.99%. Harvard case study written on its failure |
| **Utopia Labs** | **Likely inactive** | Laid off staff October 2023, pivoted away from DAO payroll product. No recent activity found |

### Tally Shutdown Context (March 2026)

This is a significant market signal. Key quotes from coverage:
- CEO Dennison Bertram stated the market is "not ready" for venture-backed governance tooling
- The Biden-era SEC had effectively forced decentralization through legal risk; the Trump admin removed that pressure
- Industry rotating toward products with clear cash flows, regulatory compatibility, or RWA adjacency
- Tally's wind-down period allows migration but many smaller DAOs are hard to contact

---

## 4. Work-to-Earn / Bounty / Quest Platforms

| Platform | Status | Users / Scale | How It Works | Pricing |
|----------|--------|---------------|--------------|---------|
| **Gitcoin** | Active | $4.29M+ distributed in 2025 across 3 major OSS rounds | Quadratic Funding + retroactive funding for mature projects. Grants Stack on Allo Protocol | Community rounds: $130K/round. Open source infrastructure |
| **DeWork** | Active (acquired by Thrive Protocol, Aug 2025) | 15,000+ Discord members, $1.2M+ bounty payouts in 2025 | Web3-native task management + bounty board + crypto payments | Pricing not public. Free tier likely |
| **Zealy** | Active | 700K monthly active users, 100M+ completed quests | Quest platform, customizable campaigns, detailed analytics | Pricing not publicly listed. Cost measured in "cost per engaged member" |
| **Galxe** | Active | 26M+ users, cross-chain | Quest, Starboard, Earndrop products. On-chain credential verification | Pay-to-play model; free basic campaigns, Business+ tier for analytics/Sybil protection. Specific pricing not public |
| **Layer3** | Active | Quests across 25 blockchains | On-chain task completion, low cost | Requires staking 150K L3 tokens to publish tasks |

**What's working:** Quest platforms (Galxe, Zealy, Layer3) have found product-market fit for user acquisition and engagement. Gitcoin's QF model is proven for public goods funding. DeWork is the closest to a "DAO project management" tool.

**What's not working:** Many quest completions are low-quality/bot-driven. Galxe's gas costs deter smaller ecosystems. Layer3/TaskOn better for cost-effectiveness on-chain.

---

## 5. Treasury Management

| Platform | Status | Scale | Notes |
|----------|--------|-------|-------|
| **Safe (formerly Gnosis Safe)** | Active, market dominant | $60B+ secured, 4.3M accounts, 200+ major projects, $10M+ annualized revenue (2025) | De facto standard for DAO treasury custody. Used by Uniswap DAO, Worldcoin, Morpho Labs |
| **Coinshift** | Active | Undisclosed | Cash/asset/risk management, mass payouts, onchain accounting. Built on top of Safe |
| **Parcel** | Active | Undisclosed | Mass payouts, payroll, treasury tracking. Interface layer on Gnosis Safe |
| **Llama** | Active | Undisclosed | On-chain governance + treasury automation. Specializes in decision-making workflows |

**Market reality:** Safe dominates. Everything else is a layer on top of Safe or a niche tool. The $1.25B treasury management market is growing at ~20% CAGR but Safe captures the majority of mindshare.

---

## 6. Gamification in Governance

This is an emerging but under-served area.

| Project / Approach | What They Do |
|-------------------|--------------|
| **Aavegotchi** | XP rewards for governance votes and tasks. "Dig" mechanics drove 400% ETH staked growth (2023). Most cited example of gamified governance |
| **Blast, friend.tech, Jupiter** | Points-based systems tracking user actions, retroactive token rewards. Leaderboards and tier systems |
| **Optimism RPGF** | Retroactive Public Goods Funding -- rewards past contributions, not promises |
| **General trend** | DAOs experimenting with reputation tokens, contributor XP, NFT credentials, leaderboards. No dominant platform exists for this |

**Key insight:** Gamification for governance participation is widely discussed as a solution to voter apathy but **no platform has made it their core product**. Most implementations are custom-built by individual DAOs. This is a gap in the market.

---

## 7. Key Problems in the Space

### Voter Apathy
- <10% turnout is the norm, not the exception
- Gas costs and proposal complexity are barriers
- Rational apathy: individual vote impact approaches zero
- Delegation helps but concentrates power further

### Proposal Quality
- Most proposals lack technical rigor
- No standardized frameworks for evaluating proposals
- Committee-based models emerging but centralization concerns

### Contributor Retention
- Talent shortages persist across DAOs
- Token-weighted voting disempowers domain experts
- Contributors with niche knowledge feel unable to impact outcomes
- Compensation inconsistency across DAOs

### Treasury Mismanagement
- Concentration risk (most treasuries are >80% native token)
- Diversification proposals are politically contentious
- Lack of professional treasury management practices
- Few DAOs have formal financial reporting

### Power Concentration
- Top 0.1% holders control ~90% of voting power
- Delegation systems help voter convenience but can worsen concentration
- Whale dominance undermines democratic legitimacy

---

## 8. Radix-Specific Landscape

### Governance Infrastructure

**Consultation v2** (official Radix community governance)
- Replaces Foundation-dependent v1 before 2026 wind-down
- Built with TanStack Start (web app) + Node.js CLI vote collector
- Two-phase voting: Temperature Checks (binary For/Against) -> Requests for Proposals (multiple options)
- Voting power based on Liquid Staking Unit (LSU) holdings converted to XRD
- Immutable votes: one vote per account, no changes after casting
- Results calculated from on-ledger data, stored in PostgreSQL
- Out of scope: delegation, real-time updates, vote changes

**Radix Accountability Council (RAC)**
- Proposed to guide Foundation -> community transition
- Strong mandate: 1.34B XRD from 1,151 unique accounts participated in consultation
- Members facilitate (not control) governance; subservient to community votes

**RadixTalk**
- Community-run forum (Discourse-based) where proposals are discussed
- Primary venue for governance discussion currently

### Competing/Adjacent Tools on Radix

| Tool | Status | What It Does |
|------|--------|--------------|
| **CrumbsUp** | Active | DAO governance platform on Radix. Quadratic voting. Uses $CRUMB token. Free to use (gas only). Requires $CRUMB to create a DAO and release proposals. Community voting is free |
| **Muan** | No data found | Could not find any web presence or documentation. May be defunct, renamed, or too early-stage to have public info |

### Radix 2026 Transition Context

The Radix Foundation is proactively transitioning to a community-led RFP model in three phases:
1. **Phase 1 (current):** Foundation requests RFPs for critical activities (gateway endpoints, signaling service, code maintenance). Non-binding community signaling.
2. **Phase 2 (transitional):** Community-initiated RFPs (marketing, partnerships, integrations, incentives).
3. **Phase 3 (decentralized):** Full community control of funding, core codebase, website.

**Implication:** This creates real demand for governance tooling on Radix. The Foundation wind-down is a forcing function -- the community needs tools to self-govern, and the existing infrastructure (Consultation v2 + RadixTalk + CrumbsUp) is minimal compared to EVM ecosystem tooling.

---

## 9. Competitive Positioning Summary

### What the market has (EVM)
- Mature voting (Snapshot, Aragon)
- Treasury management (Safe dominance)
- Quest/bounty platforms (Galxe, Zealy, Gitcoin)
- Discussion forums (Commonwealth, RadixTalk equivalents)

### What the market lacks
- **Integrated gamified governance** (XP, reputation, contributor progression as a core product)
- **Contributor journey management** (onboarding -> contribution -> reward -> retention as a single flow)
- **Non-EVM governance tooling** (Radix, Sui, Aptos have minimal governance infrastructure)
- **Sustainable business models** for governance tooling (Tally's shutdown confirms this)

### What Radix specifically lacks
- No equivalent to Snapshot (gasless off-chain voting)
- No equivalent to Safe (multi-sig treasury management)
- No bounty/quest platform native to Radix
- No integrated contributor reputation system
- CrumbsUp exists but limited in scope compared to EVM alternatives
- Consultation v2 is governance-focused only, no contributor management

---

## 10. Data Gaps

The following information was not available or verifiable through web search:

- Exact revenue/pricing for most governance platforms (many are free/open-source)
- Precise number of active users for most tools (only Galxe and Zealy publish figures)
- Commonwealth.im's current scale and 2025-2026 developments (limited recent data)
- Muan on Radix (no web presence found)
- Colony, Coordinape specific 2025-2026 financials or user counts
- Charmverse scale beyond employee count
- DeWork and Zealy specific pricing tiers
- Wonderverse current status (listed in directories but no recent news)

---

*This document reflects publicly available information as of April 2026. Market conditions in crypto governance tooling are volatile -- Tally's March 2026 shutdown demonstrates that even well-funded platforms can fail. Numbers should be verified before use in external communications.*
