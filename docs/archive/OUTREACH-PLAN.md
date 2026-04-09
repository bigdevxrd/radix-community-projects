# Outreach Plan — April 2026

## The Core Message

Radix Guild exists to get Radix off the ground. Not with promises — with working tools.

Free badges. Free governance. Paid tasks. On-chain identity. All open source.

The community decides what gets built, who builds it, and how it gets funded. We're building the coordination layer so that when Xi'an ships and Engine hits mainnet, there's already an organized community ready to build on top of it.

---

## Key Messages (Honest, No Fluff)

### 1. What It Is
Radix Guild is a governance + task marketplace for the Radix community. Free on-chain badges, two-tier voting (Telegram + CV2 on-chain), and a bounty board where work gets funded and delivered.

### 2. Why Now
- Xi'an and Engine mainnet are coming. The ecosystem needs organized builders, not just holders.
- There's no coordination layer for Radix community work. No way to propose, vote, fund, and deliver — until now.
- The Foundation's Consultation v2 is deployed but unused. We're the first to integrate it.

### 3. What's Actually Built (Not Planned — Built)
- 14-page dashboard at radixguild.com
- 36-command Telegram bot (@rad_gov)
- 32 API endpoints
- 70 automated tests
- Badge Manager v4 on mainnet (Scrypto)
- CV2 governance integration (Foundation's own system)
- Task marketplace with on-chain escrow (Scrypto vault, no admin custody)
- 5 working groups
- Support system with FAQ matching
- All MIT licensed, all public

### 4. What We Need
- Badge holders who vote on charter decisions (5 minutes to set up)
- Developers who want to earn XRD by completing tasks
- Feedback — what's broken, what's missing, what matters

### 5. The Honest Pitch
One developer built this in a week with AI tools. $680 invested. Zero revenue. The code is open source. If I disappear, fork it. The goal isn't to build a startup — it's to build infrastructure that makes Radix work as a community.

---

## Channel Strategy

### Channel 1: OGs (DMs) — DONE
**Audience:** Known Radix community members, builders, validators
**Tone:** Personal, direct, peer-to-peer
**Message:**

> Hey — I built a governance toolkit for Radix. Free badges, voting, task board. It's live on mainnet. Would appreciate you kicking the tires.
>
> radixguild.com — connect wallet, mint badge, takes 2 minutes.
>
> @rad_gov in Telegram for proposals and voting.
>
> Open source, MIT. Feedback welcome.

### Channel 2: Vibe Coding — POSTED
**Audience:** AI-assisted builders, indie devs
**Tone:** Builder-to-builder, show the work
**Message:**

> Built an entire DAO toolkit for Radix in a week using Claude Code.
>
> 14 pages, 36 bot commands, Scrypto smart contracts, CV2 governance integration, task marketplace with escrow. All open source.
>
> Stack: Scrypto 1.3.1 + Grammy + Next.js 16 + shadcn/ui + SQLite. One VPS, $7/month.
>
> radixguild.com | github.com/bigdevxrd/radix-community-projects
>
> The AI-assisted dev meta is real. AMA about the process.

### Channel 3: Dev Channels — NEXT
**Audience:** Radix developers, Scrypto builders
**Tone:** Technical, specific, show architecture
**When:** After initial OG feedback is in (3-5 days)
**Message:**

> Radix Guild — open source governance infra
>
> What's deployed:
> - Badge Manager v4 (Scrypto 1.3.1, mainnet, royalties configured)
> - CV2 integration (first community use of Foundation's governance system)
> - 32-endpoint REST API + 36 TG bot commands
> - Task marketplace with funded/unfunded escrow tracking
>
> What we need:
> - Scrypto devs to review the Badge Manager code
> - Feedback on the CV2 integration approach
> - Contributors to claim funded tasks (16 open)
>
> Everything MIT licensed. Fork it, extend it, deploy your own.
>
> Repo: github.com/bigdevxrd/radix-community-projects
> Dashboard: radixguild.com
> Bot: @rad_gov

### Channel 4: Main Radix Channels — LATER
**Audience:** General Radix community
**Tone:** Accessible, benefit-focused, low barrier
**When:** After dev feedback + at least 10 badges minted
**Message:**

> Radix Guild is live — community governance for Radix.
>
> What you can do:
> - Mint a free badge (your on-chain identity)
> - Vote on proposals that shape how the community works
> - Browse tasks and earn XRD for contributing
> - Join a working group (Guild, DAO, Infra, BizDev, Marketing)
>
> No token. No fundraise. No fees to participate. Tasks pay 2.5% to keep the lights on.
>
> Getting ready for Xi'an and Engine mainnet — building the coordination layer now so the community is organized when it matters.
>
> Start: radixguild.com/docs
> Bot: @rad_gov

---

## Delivery Schedule

| Day | Channel | Action | Goal |
|-----|---------|--------|------|
| Apr 8 | OGs (DMs) | Personal outreach to 10-20 known builders | 5+ badge mints, initial feedback |
| Apr 8 | Vibe Coding | Posted — show the AI-assisted build | Developer interest, process discussion |
| Apr 9-11 | **BUILD** | **Scrypto TaskEscrow component (on-chain vault)** | No wallet custody before public launch |
| Apr 12-13 | OGs follow-up | Check in, gather feedback, fix issues | Iterate on UX, fix bugs |
| Apr 14-16 | **BUILD** | **Testnet escrow soak + integrate with bot/dashboard** | End-to-end funded task flow |
| Apr 17-18 | Dev channels | Technical post — escrow architecture + call for review | Scrypto review, API feedback |
| Apr 19-22 | Dev follow-up | Answer questions, merge any PRs, iterate | 10+ badges, 20+ votes |
| Apr 23-25 | Main channels | Accessible announcement — escrow live, tasks fundable | Broader community awareness |
| Apr 26-28 | All channels | "State of the Guild" update — real metrics, real feedback | Transparency, credibility |
| Apr 29-30 | Assessment | Compile metrics, plan Phase 4 (SaaS layer) | Decision: scale or pivot |

### COMPLETED: On-Chain Escrow (Deployed Apr 10)

TaskEscrow v2 is live on Radix mainnet. Component: `component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r`

**What to build:**
1. `TaskEscrow` Scrypto component — `create_task(xrd_bucket)`, `release(task_id)`, `cancel(task_id)`
2. XRD locked in KeyValueStore<u64, Vault> — one vault per task
3. Verifier role gated by guild badge proof
4. Receipt NFT for creators (authorize cancel/refund)
5. Component royalties (0.5 XRD on create, 0.25 XRD on verify)
6. 2.5% platform fee split into component vault

**Build order:**
1. Scrypto component (2-3 sessions) — follows Badge Manager patterns
2. Testnet deploy + soak test (1 session)
3. Bot integration — `/bounty fund` calls component directly (1 session)
4. Dashboard integration — fund button triggers wallet TX manifest (1 session)
5. Mainnet deploy with 100 XRD cap initially

## Success Metrics (30 days)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Badges minted | 20+ | /api/stats |
| Votes cast | 50+ | /api/stats |
| Community proposals | 3+ | Not created by bigdev |
| Tasks claimed | 5+ | /api/bounties |
| Critical bugs | 0 for 7 days | /api/health + /feedback |
| Dev channel engagement | 5+ replies | Manual tracking |

## Xi'an / Engine Alignment

Position the guild as **infrastructure that's ready when Xi'an ships**:

- "We're building the coordination layer now so the community is organized for Xi'an"
- "When Engine hits mainnet, there's already a task board, governance system, and organized working groups"
- "The Badge Manager and CV2 integration are mainnet-ready today — when Xi'an adds new capabilities, we'll integrate them"
- Don't promise Xi'an-specific features until the upgrade details are confirmed
- Track Xi'an announcements and be first to propose integration tasks on the bounty board

## What NOT to Say

- The escrow IS on-chain (Scrypto vault on mainnet) — highlight this as a key differentiator
- Don't promise revenue or returns
- Don't overstate the team size (it's one developer + AI tools)
- Don't compare to established DAOs (we're week 1 beta)
- Don't promise timeline for on-chain escrow component
- Don't mention personal identity — everything is bigdev / @bigdev_xrd
