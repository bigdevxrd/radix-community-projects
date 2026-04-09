# Governance Constraints — Known Unsolved Problems

> The guild is a **platform UX layer** — we read on-ledger data and provide coordination tools. We do not define governance rules. The community decides rules through charter votes. This document outlines the constraints any DAO will hit.

## 1. Identity (Sybil Resistance)

**The problem:** One person can create multiple wallets and mint multiple badges. There is no on-chain proof that one badge = one human.

**Current state:**
- Badges are free, non-transferable NFTs
- One badge per wallet address (enforced by username-based NFT ID)
- No KYC, no identity verification, no biometric check
- Nothing stops someone creating 10 wallets and minting 10 badges

**Why it matters:** Any "1 badge = 1 vote" system can be gamed by creating multiple identities. This is the fundamental sybil problem in all DAO governance.

**Possible mitigations (not implemented, charter-voteable):**
- Minimum XP threshold to vote (time investment = cost to sybil)
- Stake-weighted voting (XRD at risk = economic cost to sybil)
- Social vouching (existing members vouch for new ones)
- Radix ROLA (proof of wallet control, not proof of uniqueness)
- Third-party DID (decentralized identity) integration when available on Radix
- Trust tiers — new accounts have limited voting power until proven

**Our position:** We provide the platform. The community decides which sybil mitigations to adopt through charter votes. We will not implement KYC or collect personal data.

---

## 2. Voting Weight

**The problem:** How much should each vote count? Options are mutually exclusive and each has trade-offs.

| Model | Pros | Cons |
|-------|------|------|
| 1 badge = 1 vote | Simple, democratic | Sybil-vulnerable, no skin in the game |
| XRD-weighted | Economic alignment, harder to sybil | Plutocratic, whales dominate |
| Tier-weighted (XP) | Rewards participation | Gameable with time, favours early adopters |
| Quadratic | Balances voice vs stake | Complex, still sybil-vulnerable without identity |

**Current state:**
- Off-chain (Telegram): 1 badge = 1 vote (no weighting)
- On-chain (CV2): XRD-weighted (Foundation's system)
- Tier-based weighting: **NOT implemented** — tiers are game progression only
- Voting weights are **TBD — decided by charter vote**

**Our position:** We support multiple voting models in the platform. The community picks which model to use for which type of decision. We will not hardcode voting weights.

---

## 3. Treasury / Vault Security

**The problem:** Who controls the money? Multi-sig adds security but adds friction. Single-sig is fast but one key compromise = total loss.

**Current state:**
- No guild treasury wallet exists
- TaskEscrow v2 (Scrypto component) holds task funds in isolated vaults — no admin wallet custody
- Admin badge controls escrow verification (single key, bigdev holds it)
- No multi-sig on Radix yet (no Gnosis Safe equivalent)

**What blocks progress:**
- Radix does not have a production multi-sig component
- Multi-sig requires multiple badge holders with verified identities
- Identity problem (see above) means signers can't be verified as unique humans

**Possible mitigations (charter-voteable):**
- Time-locked withdrawals (delay between approval and execution)
- Spending limits per period (cap exposure)
- RAC (advisory council) with multiple badge holders approving large transactions
- Component-level access rules (Scrypto auth, not wallet-level)

**Our position:** The TaskEscrow component holds funds in Scrypto vaults, not in any wallet. Verification requires the admin badge. When multi-sig tooling exists on Radix, the charter can vote to adopt it.

---

## 4. Vote Validity / Quorum

**The problem:** When is a vote "valid"? Low participation makes outcomes unrepresentative. High thresholds make decisions impossible.

**Current state:**
- Off-chain: minimum 3 votes required (hardcoded, charter-voteable)
- On-chain (CV2): no minimum quorum by default
- P1-P6 charter votes expired with 1/3 participation (only 1 badge holder)
- No minimum participation percentage defined

**Real-world failure modes:**
- 2 people vote, 1 wins — is that a valid DAO decision?
- Quorum set at 50% but only 5 of 100 members are active
- Votes pass at 3am when most members are offline
- Whale votes in final minute to flip outcome

**Possible mitigations (charter-voteable):**
- Quorum as % of badge holders (e.g., 20% must vote)
- Minimum absolute vote count (e.g., 10 votes regardless of total members)
- Conviction voting (votes accumulate over time, not snapshot)
- Veto period after passing (48h window to challenge)
- Time-zone aware voting windows

**Our position:** We implement whatever quorum rules the charter defines. Default is minimum 3 votes. The community must decide what makes a vote legitimate for their context.

---

## 5. What the Platform Does vs Doesn't Do

### We provide:
- Badge minting and on-chain identity (Scrypto NFT)
- Off-chain voting infrastructure (Telegram bot)
- On-chain voting display (CV2 integration — read-only)
- Task marketplace with on-chain escrow (TaskEscrow component)
- XP tracking and tier progression (game mechanics)
- Dashboard for browsing, minting, and wallet-connected actions
- Charter tracking (32 parameters, dependency tree)
- Working groups and coordination tools

### We do NOT provide:
- Identity verification or KYC
- Voting weight decisions (charter-voteable)
- Governance rule enforcement (we display results, community enforces)
- Multi-sig treasury management (pending Radix tooling)
- Legal entity structure (the guild is not a registered entity)
- Financial advice or guarantees

### The community decides:
- Voting weights (1-badge, XRD-weighted, tier-weighted, quadratic)
- Quorum thresholds
- Sybil mitigations
- Treasury spending limits
- Fee percentages (currently 2.5%, capped at 10%)
- Role permissions and who can verify tasks
- Working group mandates and leads

---

## Summary

These are hard problems. Every DAO faces them. We don't pretend to have solved them — we provide the tools and let the community decide. The charter exists specifically to make these decisions collectively, transparently, and on-the-record.

The task marketplace and escrow can operate with two participants today. Governance rules scale as the community grows. Start small, decide as you go.
