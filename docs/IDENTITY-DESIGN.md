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

## Radix Native Integration

### ROLA (Radix Off-Ledger Authentication)

Cryptographic proof of wallet control. Built into `@radixdlt/rola` npm package (already in our RDT 2.2.1).

**Flow:**
1. Backend generates 32-byte challenge with 5-minute TTL
2. Frontend sends challenge to wallet via dApp Toolkit
3. Wallet signs challenge with account's private key (blake2b hash)
4. Backend verifies signature against on-chain `owner_keys` metadata
5. Session established (JWT/cookie)

**What it proves:** This user controls this wallet address right now.
**What it doesn't prove:** That this is a unique human.

**Integration plan:**
- Add `/api/challenge` endpoint (generate ROLA challenges)
- Add `/api/verify` endpoint (verify signed challenges)
- Dashboard login: wallet connect + ROLA = authenticated session
- Replace current "connect and trust" with cryptographic verification

### Radix Persona

Wallet-native identity with selective disclosure. 3 fields available today:
- Full name (given, family, nickname)
- Email addresses (array)
- Phone numbers (array)

All data stored in wallet only — never on-chain, never stored by us. User approves per-field per-dApp. Permission is remembered for ongoing sessions.

**Integration plan (Phase 2):**
- Request Persona login with `.persona().withProof()`
- For Silver tier: optionally verify email (send confirmation link)
- Never store PII — re-request from wallet when needed

### idOS Proof-of-Personhood (Phase 2-3)

Third-party identity verification on Radix. Users verify once (KYC via idOS), receive a DID badge in their wallet. W3C DID/VC standards.

**Integration plan:**
- For Gold tier: check if account holds idOS PoP badge resource
- Gateway API query: does this wallet have the PoP resource?
- No KYC by us — idOS handles verification, we check the badge

### Updated Tier Architecture

```
Frontend (dApp Toolkit)         Backend (Node)              Ledger (Scrypto)
─────────────────────          ──────────────             ─────────────────
GET /api/challenge      →  generateRolaChallenge()
                        ←  challenge (32 bytes)

Wallet signs challenge
Returns proof + persona

POST /api/verify        →  verifySignedChallenge()
                            Check owner_keys on-chain
                            Calculate trust score
                            Check idOS badge (Gold)

                        →  Issue session JWT with tier
```

### All layers are VOLUNTARY

No tier is required. Badge is the minimum. Everything else is opt-in — operators choose how much trust to build. More trust unlocks more capabilities, but nobody is forced to verify anything.

| Tier | Minimum | Optional Boosters | Unlocks |
|------|---------|-------------------|---------|
| Badge holder | Free badge mint | — | Vote, browse, join groups |
| Bronze+ | Badge + ROLA login | Activity score visible | Authenticated sessions |
| Silver+ | Badge + trust score 50+ | Persona data, email verify | + Create proposals, claim tasks |
| Gold+ | Badge + trust score 200+ | idOS PoP badge, social vouch | + Verify tasks, treasury ops |

The operator chooses their level. A badge holder who never does ROLA or shares Persona data can still vote and participate. They just can't do higher-trust actions until they earn it through activity or opt into verification.

---

## What We DON'T Do

- No KYC. Ever.
- No personal data storage. Ever.
- No biometric collection.
- No email/phone verification.
- No wallet tracking or profiling.
- No selling identity data.

The guild is a coordination tool. Identity is built through participation, not surveillance. Every layer of identity is voluntary — operators choose how much trust to build. More trust = more capabilities. Zero trust required to participate.

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
