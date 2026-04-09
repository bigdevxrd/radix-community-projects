# Proposal: Community Infrastructure Contractor — bigdev
> Draft for RadixTalk posting | April 2026

## Who I Am

**bigdev** (@bigdev_xrd on Telegram, @bigdevxrd on GitHub)

Independent Radix developer and community contributor since late 2025. I build and maintain open-source governance infrastructure, DeFi tools, and AI-assisted development systems on Radix.

## What I've Built (Proof of Work)

### Radix Guild — radixguild.com
Live governance platform for the Radix community:
- 14-page Next.js dashboard with Radix Wallet Connect
- Telegram bot (@rad_gov) with 37+ commands
- 33 API endpoints, 110+ passing tests
- On-chain NFT badge system (BadgeManager + BadgeFactory, mainnet deployed)
- Two-tier voting: off-chain (TG) + on-chain (CV2 integration)
- Task marketplace with on-chain escrow (TaskEscrow v2, mainnet)
- Trust scoring system (Bronze/Silver/Gold)
- Working groups for community coordination
- Content moderation, FAQ system, support tickets
- MIT licensed, fully open source

### Hyperscale-RS Contributions
Contributing to the Hyperscale consensus protocol:
- Posted security audit identifying 17 unbounded data structures (3 critical DoS vectors)
- First PR merged: bounded mempool pool eviction
- Contribution plan: 6 PRs covering memory safety, benchmarks, test suites

### Sats Trading Platform
Production DeFi trading engine on Radix mainnet:
- TradingView signal → on-chain execution pipeline
- BertPool AMM (constant-product DEX, deployed on stokenet)
- Radix Wallet Manager (wallet registry, health monitoring, recovery scanner)

### AI Agent Infrastructure
- Autonomous agent system with budget-controlled LLM access
- Cost tracking, model failover, project-scoped task dispatch
- Uptime monitoring across all services (Uptime Kuma)

## What I'm Proposing

**Full-time Radix community infrastructure contractor for 12 months.**

### Services

1. **Governance Infrastructure**
   - Operate and maintain the Guild platform (radixguild.com)
   - Working groups coordination — give community members a place to organize
   - RadixTalk integration — bridge forum discussions with on-chain governance
   - Conviction voting component (Scrypto) — time-weighted anti-sybil voting
   - ROLA authentication — cryptographic wallet verification for all guild services

2. **Foundation P3 Service Transition Support**
   - Ready to take over and maintain community-facing services
   - Dev console, dashboard, consultation dApp — experienced with the full stack
   - Can provide cost estimates for any P3 service the community wants maintained

3. **Scrypto Development**
   - BadgeFactory available for any DAO or project that needs NFT membership badges
   - TaskEscrow available for task marketplace infrastructure
   - Conviction voting component for fund allocation decisions
   - Smart contract auditing (proven methodology — audited 4 blueprints, 55K LOC Rust codebase)

4. **Hyperscale-RS Contributions**
   - Ongoing security hardening (memory safety, bounded data structures)
   - Test suite expansion
   - Benchmarking infrastructure

5. **AI-Assisted Development Tools**
   - Agent infrastructure available as template for other Radix projects
   - Automated monitoring, health checks, deployment pipelines

### Rate

**$1,100 USD per week ($57,200/year)**

This covers:
- 40+ hours/week dedicated to Radix community infrastructure
- VPS hosting costs ($14/month across 2 servers)
- AI/LLM costs for development agents ($35/month)
- Domain maintenance (radixguild.com)

### Accountability

- Weekly progress reports posted to RadixTalk
- All code open source (MIT licensed)
- Monthly deliverables tied to roadmap milestones
- Community can review, fork, or replace any component
- Transparent cost tracking — every dollar accounted for

## Why This Matters Now

The Foundation is transitioning services to the community in 2026. Someone needs to:
1. **Build the coordination tools** — working groups, governance apps, task management
2. **Maintain infrastructure** — the P3 services need operators, not just goodwill
3. **Bridge the gap** — between Foundation-run and community-run means someone fills that role

This isn't a grant request for a speculative project. The infrastructure exists, is deployed, and is being used. This proposal funds continued operation and expansion.

## Immediate Next Steps (If Approved)

| Week | Deliverable |
|------|------------|
| 1 | Working groups feature launch — community members can form teams |
| 2 | RadixTalk API integration — forum discussions linked to governance |
| 3 | ROLA authentication — cryptographic wallet verification |
| 4 | Escrow V3 — multi-token task funding (XRD, fUSD, hUSDC) |
| 5-6 | Dashboard write operations — full governance from web UI |
| 7-8 | Conviction voting component — on-chain, time-weighted |
| 9-10 | P3 service transition — first Foundation service adopted |
| 11-12 | MIDAO integration — guild tools adapted for DAO LLC structure |

## Business Model (Long-Term Sustainability)

The guild infrastructure has a built-in revenue model:
- 2.5% platform fee on task marketplace payouts
- Badge minting royalties (currently waived for beta)
- SaaS licensing for other DAOs that want to use the toolkit
- Potential: AI-assisted governance services ($10/month per DAO)

Goal: self-sustaining within 12 months, no longer dependent on community funding.

## Contact

- Telegram: @bigdev_xrd
- GitHub: @bigdevxrd
- Guild: https://radixguild.com
- Dashboard: https://radixguild.com/about (full transparency page)
