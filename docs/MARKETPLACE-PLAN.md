# Plan: Task Marketplace — Web3 Bounty Platform for Radix

## Context

The Radix Guild bounty system is MVP-grade (SQLite escrow tracking, admin-managed payments, no fees, no disputes, no categories). The goal is to evolve it into a world-class Web3 task marketplace — the primary income engine for Big Dev's business.

**The pitch:** Connect wallet. Post task. Fund escrow. Worker delivers. Payment releases atomically. No disputes. No middleman. 2.5% fee.

**The moat:** Radix atomic composability means escrow → verify → pay happens in ONE transaction. No intermediary can intercept. The code IS the contract. Component royalties compound across every deployment.

**Strategic separation:** Governance (voting, charter) is free and drives adoption. The marketplace (tasks, escrow, fees) is the revenue engine. Same codebase, feature-flagged — no fork needed. The badge is the bridge between both. See ROADMAP.md for the dual-product architecture.

---

## 5 Phases, 17+ Weeks

### Phase 1: Enhanced Task Board (Weeks 1-3) — Off-Chain Polish
Make the existing system production-grade. Zero on-chain changes.

**Database migrations (ALTER TABLE + new tables):**
- bounties: add category, difficulty, deadline, acceptance_criteria (JSON checklist), tags, skills_required, priority, platform_fee_pct, max_assignees, description_long
- NEW: bounty_milestones (partial delivery: title, percentage, amount, status)
- NEW: bounty_applications (apply model for >100 XRD tasks: pitch, estimated_hours, status)
- NEW: bounty_categories (admin-configurable: dev, design, content, marketing, testing, general)
- NEW: platform_config (charter-voteable: fee %, min/max XRD, deadline defaults)

**Bot wizard expansion (3 → 7 steps, smart defaults):**
1. Reward (XRD) — required
2. Title — required
3. Category — inline keyboard picker
4. Difficulty — inline keyboard (easy/medium/hard/expert)
5. Deadline — inline keyboard (1w / 2w / 1mo / none)
6. Description — optional, skip button
7. Confirm — preview with fee calculation shown

**New bot commands:**
- `/bounty apply <id> [pitch]` — for tasks >100 XRD
- `/bounty approve <id> <applicant>` — creator picks worker
- `/bounty cancel <id>` — cancel before assignment
- `/bounty categories` — list categories
- Deadline enforcement: hourly cron auto-cancels expired open tasks

**Dashboard: split into components + detail page:**
- `/bounties` — list with category/difficulty/reward filters
- `/bounties/[id]` — NEW detail page: description, acceptance criteria checklist, milestone progress, applications, timeline
- Enhanced cards: category badge, difficulty pill, deadline countdown, skills tags

**Fee tracking (off-chain for now):**
- 2.5% platform fee shown in creation wizard
- Recorded in bounty_transactions when paid
- New escrow_wallet column: total_fees_collected_xrd
- Fee is charter-voteable via platform_config table

**Files:** bot/db.js, bot/wizards.js, bot/index.js, bot/services/api.js, guild-app/src/app/bounties/page.tsx, NEW guild-app/src/app/bounties/[id]/page.tsx

---

### Phase 2: On-Chain Escrow (Weeks 4-7) — The Revenue Engine

**TaskEscrow Scrypto component:**
```
create_task(payment_bucket, metadata) → receipt_nft + task_id
  - Splits: reward → escrow vault, fee → platform vault
  - Receipt NFT authorizes cancel/refund

claim_task(badge_proof, task_id)
submit_task(badge_proof, task_id, submission_url)
verify_task(verifier_badge_proof, task_id) → releases XRD to assignee
cancel_task(receipt_proof, task_id) → returns XRD minus 1%
expire_task(task_id) → auto-refund after deadline + grace period
```

**Dispute-free by design:**
- Acceptance criteria checklist = the contract (tasks >50 XRD require it)
- Verifier checks the list. If criteria met → payment releases atomically
- Deadline + grace period → auto-refund if nobody acts
- No arbitration needed. The code decides.

**Royalties:**
- create_task: 0.5 XRD (updatable)
- verify_task: 0.25 XRD (updatable)
- cancel/expire/claim/submit/reads: Free (locked)

**Dashboard /bounties/create page:**
- Web form → store metadata → calculate fee → wallet signs create_task manifest
- Both bot and web creation coexist (hybrid: `source` column in DB)

**Files:** NEW task-escrow/scrypto/, guild-app/src/lib/manifests.ts, NEW guild-app/src/app/bounties/create/page.tsx

---

### Phase 3: Marketplace UX (Weeks 8-11) — Discovery + Profiles

**New tables:** worker_profiles, client_profiles, task_ratings, skills, notifications

**New pages:**
- `/marketplace` — search + filters + skill matching + "recommended for you"
- `/profile/[address]` — public profile: completion rate, rating, skills, history
- `/bounties/my` — my posted + claimed tasks

**Notification system:**
- Bot DMs: new task in your skill area, application accepted, deadline warning, payment received
- Dashboard bell icon with unread count

**Rating system:** Both parties rate each other (1-5 stars) after completion. Stored on badge extra_data for portable reputation.

---

### Phase 4: SaaS + Multi-Tenant (Weeks 12-16) — Scale Revenue

**TaskEscrowFactory Scrypto component:**
- Any community deploys their own task board (10 XRD factory royalty)
- Configurable fee %, categories, badge requirements per tenant
- White-label dashboard with custom branding

**Revenue per tenant:**
| Source | Amount |
|--------|--------|
| Factory creation | 10 XRD one-time |
| Platform fee | 2.5% per task |
| create_task royalty | 0.5 XRD per task |
| verify_task royalty | 0.25 XRD per task |
| SaaS hosting | 20-50 XRD/mo |

---

### Phase 5: Wider Market (Weeks 17+)

- Multi-currency (XRD + stablecoins when available)
- Cross-community federation (tasks visible across tenant marketplaces)
- Portable reputation (badge extra_data travels across guilds)
- External API with webhooks for integrations
- Beyond Radix tech tasks → design, content, marketing, products

---

## Revenue Projections

| Phase | Tasks/Mo | Throughput | Fee (2.5%) | Royalties | Hosting | Total |
|-------|----------|-----------|------------|-----------|---------|-------|
| 1 | 10 | 300 XRD | 0 | 0 | 0 | 0 (building) |
| 2 | 25 | 1,000 XRD | 25 | 19 | 0 | 44 XRD/mo |
| 3 | 50 | 2,500 XRD | 62 | 38 | 0 | 100 XRD/mo |
| 4 (3 tenants) | 150 | 7,500 XRD | 188 | 113 | 90 | 391 XRD/mo |
| 5 (10 tenants) | 500 | 25,000 XRD | 625 | 375 | 350 | 1,350 XRD/mo |

Combined with badge royalties: **2,000+ XRD/mo at scale.**

At $0.06/XRD: ~$120/mo. At $0.50/XRD: ~$1,000/mo. At $2/XRD: ~$4,000/mo.

---

## Key Design Decisions

1. **Fee on creation, not completion** — platform earns even on cancelled tasks
2. **Application model for >100 XRD** — prevents low-effort claims on high-value tasks
3. **Acceptance criteria = the contract** — dispute-free means clear specs upfront
4. **Receipt NFT for authorization** — no account addresses stored in component
5. **Metadata off-chain, escrow on-chain** — keeps tx costs low, avoids ledger bloat
6. **2.5% fee is charter-voteable** — community controls the economics
7. **Verification by tier >= contributor** — prevents bottleneck on single admin
8. **Auto-refund after deadline + grace** — no stuck funds, no manual intervention

## Risk Mitigation

- **Nobody posts tasks:** Guild dog-foods it first (fund 10-20 real tasks)
- **Disputes:** Clear acceptance criteria checklist IS the contract
- **Escrow bug:** Phase 1 is off-chain. Phase 2 starts on testnet with 2-week soak. Mainnet caps at 100 XRD initially.
- **Low volume:** SaaS model doesn't depend on one ecosystem
- **Fee too high:** 2.5% is low end of industry (2-10%). Charter-voteable.

## What to Build First (This Session)

**Phase 1A: Database migrations + bot wizard expansion + API filters.** This is the foundation everything else builds on. Ship it, test it, dog-food it with real tasks.
