# Task Matrix — Full Project Budget

Everything that needs doing, what it costs, who does it, and what the guild earns.

**Last updated:** April 7, 2026

---

## Phase 1: Immediate (Self-Funded / Crowdfunded)

These tasks get the guild operational. Fund with personal XRD or small community contributions.

### Content & Marketing (Get the word out)

| ID | Task | Difficulty | XRD | USD* | Est Hours | Status |
|----|------|-----------|-----|------|-----------|--------|
| T1 | Record demo video: wallet → mint → vote → game | Medium | 50 | $3 | 2h | Open |
| T2 | Write RadixTalk forum post announcing the guild | Easy | 25 | $1.50 | 1h | Open |
| T3 | Create 3 Twitter/X posts with screenshots | Easy | 25 | $1.50 | 1h | Open |
| T4 | Write "Getting Started" blog post for beginners | Easy | 25 | $1.50 | 2h | Open |
| T5 | Create 1-page pitch deck (PDF) for DeFi projects | Medium | 75 | $4.50 | 3h | Open |
| | **Subtotal** | | **200** | **$12** | **9h** | |

### Testing & Security (Prove it works)

| ID | Task | Difficulty | XRD | USD* | Est Hours | Status |
|----|------|-----------|-----|------|-----------|--------|
| T6 | Mobile responsiveness testing + bug report | Medium | 50 | $3 | 2h | Open |
| T7 | Security review: bot commands + API endpoints | Hard | 100 | $6 | 4h | Open |
| T8 | Cross-browser testing (Safari, Firefox, Chrome) | Easy | 25 | $1.50 | 1h | Open |
| T9 | Load test: 100 concurrent API requests report | Medium | 50 | $3 | 2h | Open |
| | **Subtotal** | | **225** | **$13.50** | **9h** | |

### Design (Make it beautiful)

| ID | Task | Difficulty | XRD | USD* | Est Hours | Status |
|----|------|-----------|-----|------|-----------|--------|
| T10 | Infographic: task marketplace flow | Medium | 50 | $3 | 3h | Open |
| T11 | Infographic: how governance + marketplace connect | Medium | 50 | $3 | 3h | Open |
| T12 | OG image redesign (social preview) | Easy | 25 | $1.50 | 1h | Open |
| | **Subtotal** | | **125** | **$7.50** | **7h** | |

### Infrastructure (Keep it running)

| ID | Task | Difficulty | XRD | USD* | Est Hours | Status |
|----|------|-----------|-----|------|-----------|--------|
| T13 | Set up monitoring/alerting (uptime, errors) | Medium | 75 | $4.50 | 3h | Open |
| T14 | Automated backup script for SQLite DB | Medium | 50 | $3 | 2h | Open |
| T15 | Set up Discord server + webhook integration | Easy | 25 | $1.50 | 1h | Open |
| T16 | VPS hardening review (firewall, SSH, ports) | Hard | 100 | $6 | 3h | Open |
| | **Subtotal** | | **250** | **$15** | **9h** | |

---

## Phase 2: Development (DAO-Funded after Phase 1)

These require dev skills. Funded from Phase 1 revenue + crowdfunding.

### GitHub Issues → Bounties

| Issue | Task | Difficulty | XRD | USD* | Est Hours |
|-------|------|-----------|-----|------|-----------|
| #36 | Demo video (wallet → mint → vote → admin) | Medium | 50 | $3 | 2h |
| #58 | CV2 self-host: Docker dApp + vote-collector | Expert | 300 | $18 | 15h |
| #44 | CrumbsUp proposal sync pipeline | Hard | 150 | $9 | 8h |
| #34 | On-chain proposal outcomes (permanent results) | Hard | 200 | $12 | 10h |
| #33 | Vote delegation to stewards | Hard | 150 | $9 | 8h |
| #32 | Multi-DAO badge federation | Expert | 300 | $18 | 15h |
| #9 | Manager Registry Scrypto component | Expert | 400 | $24 | 20h |
| #8 | DAO Manager Scrypto blueprint | Expert | 400 | $24 | 20h |
| | **Subtotal** | | **1,950** | **$117** | **98h** |

### Marketplace Development

| Task | Difficulty | XRD | USD* | Est Hours |
|------|-----------|-----|------|-----------|
| TaskEscrow Scrypto component (on-chain escrow) | Expert | 500 | $30 | 25h |
| TaskEscrowFactory (multi-tenant deployment) | Expert | 300 | $18 | 15h |
| Dashboard /bounties/create (web task creation) | Hard | 150 | $9 | 8h |
| Worker/client profiles + ratings | Hard | 200 | $12 | 10h |
| Marketplace discovery page + search | Hard | 150 | $9 | 8h |
| Notification system (bot + dashboard) | Medium | 100 | $6 | 5h |
| **Subtotal** | | **1,400** | **$84** | **71h** |

### AI & Revenue Features

| Task | Difficulty | XRD | USD* | Est Hours |
|------|-----------|-----|------|-----------|
| AI assistant: /assist endpoint + credits system | Hard | 200 | $12 | 10h |
| AI assistant: dashboard /assist page | Medium | 100 | $6 | 5h |
| Membership system: $10 join + dept allocation | Hard | 150 | $9 | 8h |
| Treasury dashboard: balance, spending, reporting | Medium | 100 | $6 | 5h |
| Royalty claim script + dashboard display | Medium | 75 | $4.50 | 3h |
| **Subtotal** | | **625** | **$37.50** | **31h** |

---

## Summary

### Total Budget

| Phase | Tasks | Total XRD | Total USD* | Est Hours |
|-------|-------|-----------|-----------|-----------|
| **Phase 1: Immediate** | 16 tasks | 800 XRD | $48 | 34h |
| **Phase 2: Development** | 19 tasks | 3,975 XRD | $238.50 | 200h |
| **Grand Total** | **35 tasks** | **4,775 XRD** | **$286.50** | **234h** |

### Platform Revenue from These Tasks

| Metric | Value |
|--------|-------|
| Total task value | 4,775 XRD |
| Platform fee (2.5%) | 119 XRD to guild treasury |
| Component royalties (est) | ~50 XRD from on-chain operations |
| **Total guild revenue** | **~169 XRD** |

### Crowdfunding Target

| Goal | Amount | What It Covers |
|------|--------|----------------|
| **Minimum viable** | 200 XRD ($12) | Phase 1 content + testing (T1-T9) |
| **Operational** | 800 XRD ($48) | All Phase 1 tasks |
| **Full development** | 4,775 XRD ($287) | Everything through marketplace + AI |

### How Crowdfunding Works

1. Contributors send XRD to guild treasury wallet
2. Admin records via `/bounty fund <amount> <tx_hash>`
3. Tasks are funded from escrow
4. Workers claim, deliver, get paid
5. 2.5% fee returns to treasury
6. Royalties compound on every on-chain operation

### Self-Sustaining Threshold

Once the marketplace is live with on-chain escrow:
- 25 tasks/month × 50 XRD avg = 1,250 XRD throughput
- Platform fee: 31 XRD/month
- Component royalties: ~19 XRD/month
- **Monthly revenue: ~50 XRD ($3)**
- **Monthly costs: ~133 XRD ($8)**
- **Break-even: ~67 tasks/month**

At scale with 5 SaaS tenants:
- 150 tasks/month × 50 XRD = 7,500 XRD throughput
- Platform fee: 188 XRD/month
- Royalties: 113 XRD/month
- Hosting: 90 XRD/month
- **Monthly revenue: 391 XRD ($23)**
- **Monthly costs: 133 XRD ($8)**
- **Profit: 258 XRD/month ($15)**

---

## Pricing Reference

| Difficulty | Range | Typical Tasks |
|-----------|-------|---------------|
| Easy | 10-50 XRD | Posts, docs, basic testing, simple design |
| Medium | 50-100 XRD | Feature dev, infographics, security review, integrations |
| Hard | 100-200 XRD | Complex features, Scrypto work, architecture |
| Expert | 200-500 XRD | Core infrastructure, multi-tenant, on-chain systems |

*USD estimates at $0.06/XRD (April 2026). Actual value fluctuates.*

---

## How to Contribute

**As a worker:** Browse tasks at [radixguild.com/bounties](https://radixguild.com/bounties) or `/bounty list` in Telegram. Claim what matches your skills.

**As a funder:** Send XRD to the guild treasury. Every XRD funds development that produces royalty-earning code. Your contribution compounds.

**As a voter:** Vote on charter parameters (`/charter guide`). Your votes shape how the guild operates, what gets funded, and where fees go.
