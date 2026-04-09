# Identity & Sybil Resistance — Design Document

> No KYC. No personal data custody. No doxxing. Frictionless.
> Perfect sybil resistance without KYC does not exist. The goal is making attacks expensive enough to be impractical.

## Recommended Approach: 3 Phases

### Phase 1: Activity-Based Trust (NOW — zero friction)

Build trust scores from on-chain activity. No external dependencies.

**Trust signals (all on-chain, all verifiable):**
- Badge age (days since mint)
- Governance participation (votes cast, proposals created)
- Task completions (bounties delivered)
- Stake amount (XRD committed to guild)
- Consecutive activity streak

**Tier system:**
| Tier | Requirements | Abilities |
|------|-------------|-----------|
| Bronze | Mint badge (free) | Vote on proposals |
| Silver | 30+ days + 10+ votes + stake 100 XRD | Create proposals, claim tasks |
| Gold | 90+ days + 50+ votes + 3+ task completions + 2 vouches | Verify tasks, manage treasury |

**Why first:** Zero user friction. Uses data we already have. Scrypto-native (badge NFT metadata). Makes sybil expensive through time investment — you can't speed-run 90 days of activity.

### Phase 2: Social Verification (May — opt-in, adds trust)

Connect external accounts as composable credentials. Increases trust score.

**Integration candidates:**
- Gitcoin Passport (composable credentials — GitHub, Twitter, etc.)
- BrightID (social graph verification — friends vouch for you)
- Social vouching (existing Gold members vouch for new members)

**Architecture:** Off-ledger verification relay issues attestation badges. No personal data stored by the guild — verification is a boolean ("this person passed BrightID check"), not an identity record.

**Why second:** Adds cross-platform identity signals without centralization. BrightID is the strongest option (social graph is hard to fake). Gitcoin Passport has the most integrations.

### Phase 3: ZK Privacy (Jun+ — when Radix supports it)

Zero-knowledge proofs for anonymous voting. Prove you're unique without revealing who.

**Candidates:**
- Semaphore protocol (anonymous signaling)
- MACI (anti-collusion infrastructure)

**Why third:** Depends on ZK capabilities maturing on Radix. Phase 1 and 2 provide meaningful sybil resistance without ZK. ZK adds privacy (anti-coercion), not sybil resistance — different threat model.

---

## Voting Weight Models

### Conviction Voting (RECOMMENDED for fund allocation)

Votes accumulate weight over time. The longer you support something, the more weight your vote carries. Changing your vote resets the accumulation.

- **Sybil resistance: HIGH** — time cannot be faked, even with multiple wallets
- **Friction: LOW** — just vote and wait
- **Privacy: HIGH** — no identity needed
- **Radix feasibility: VERY HIGH** — implementable entirely in Scrypto
- **Used by:** Gitcoin, 1Hive Gardens, Commons Stack

### Token-Weighted (for protocol parameters)

Standard XRD-weighted voting via CV2. Already deployed.

- The Foundation's system handles this
- Guild displays results, doesn't compete

### Quadratic (Phase 2, requires identity layer)

Square root of tokens = votes. Reduces whale dominance.

- Requires identity to prevent splitting across wallets
- Pairs well with Phase 2 social verification
- Used by: Gitcoin Grants

---

## Anti-Sybil Cost Analysis

| Attack | Cost with Phase 1 | Cost with Phase 1+2 |
|--------|-------------------|---------------------|
| Create 10 fake badges | 10 wallets, 300+ days, 100+ votes each | + 10 BrightID verifications (near impossible) |
| Buy votes | Must stake 100+ XRD per wallet × 10 = 1000 XRD at risk | + social vouching network |
| Farm trust score | 90+ days per identity, can't parallelise time | + cross-platform identity check |

---

## Architecture

```
┌─────────────────────────────────┐
│     Verification Relay          │  (Phase 2: off-ledger)
│     - Gitcoin Passport          │
│     - BrightID                  │
│     - Activity scorer           │
└───────────────┬─────────────────┘
                │ issues attestation badges
                ▼
┌─────────────────────────────────────────────┐
│        Scrypto Identity Component            │
│                                               │
│  Badge NFT (existing) + Trust Score fields:   │
│  - activity_score: u64                        │
│  - stake_amount: Decimal                      │
│  - vouch_count: u64                           │
│  - social_verified: bool                      │
│  - tier: Bronze / Silver / Gold               │
│                                               │
│  Access Rules (Scrypto-native):               │
│  - vote() requires Bronze+                    │
│  - propose() requires Silver+                 │
│  - verify_task() requires Gold+               │
│  - conviction multiplier scales with tier     │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│        Scrypto Governance Component          │
│                                               │
│  - Conviction voting (fund allocation)        │
│  - Token-weighted (protocol params via CV2)   │
│  - Quadratic (Phase 2, with identity)         │
│  - Rage-quit (skin in the game)               │
└─────────────────────────────────────────────┘
```

---

## What We DON'T Do

- No KYC. Ever.
- No personal data storage. Ever.
- No biometric collection.
- No email/phone verification.
- No wallet tracking or profiling.
- No selling identity data.

The guild is a coordination tool. Identity is built through participation, not surveillance.

---

## Implementation Priority

| Item | Phase | Effort | Impact |
|------|-------|--------|--------|
| Trust score on badge (activity-based) | 1 | Medium | High — base sybil resistance |
| Tier-gated actions (propose, verify) | 1 | Small | High — prevents spam |
| Conviction voting component | 1 | Large | Very High — best anti-sybil voting |
| Stake-to-vouch mechanism | 1-2 | Medium | Medium — social layer |
| BrightID relay | 2 | Medium | High — cross-platform sybil check |
| Gitcoin Passport relay | 2 | Medium | Medium — composable credentials |
| Quadratic voting | 2 | Medium | Medium — whale resistance |
| ZK anonymous voting | 3 | Large | Medium — privacy, not sybil |
