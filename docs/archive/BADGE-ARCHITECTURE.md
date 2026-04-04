# Radix Guild Badge Architecture

## Version: 0.1 DRAFT
## Author: Big Dev
## Date: April 3, 2026

---

## 1. What Is the Badge?

The Guild Badge is a **governance token**. It's your vote.

- Hold a badge → you can vote on proposals
- No badge → you're a visitor (can view, can't participate)
- Your tier determines your voting weight
- XP tracks your contributions
- Transferable but XP resets on transfer (semi-bound)

## 2. Badge Data Model

```rust
#[derive(ScryptoSbor, NonFungibleData)]
pub struct GuildBadge {
    // Immutable (set at mint)
    pub issued_at: i64,           // when minted
    pub schema: String,           // "guild_member", "guild_dev", etc.

    // Mutable (updated by manager)
    #[mutable] pub tier: String,          // member/contributor/builder/steward/elder
    #[mutable] pub xp: u64,              // experience points
    #[mutable] pub status: String,        // active/suspended/revoked
    #[mutable] pub last_active: i64,      // last XP update timestamp
    #[mutable] pub votes_cast: u64,       // total votes
    #[mutable] pub tasks_completed: u64,  // total tasks done
    #[mutable] pub extra: String,         // JSON extension field
}
```

**Why no `issued_to` field?** The badge is semi-bound. If transferred, the new holder IS the badge holder. The wallet address is the identity, not a string field.

**Why no `level` field?** Level = tier. Calculated from XP thresholds. Stored as `tier` on the badge. Updated when XP crosses a threshold.

## 3. Tiers & Voting Weight

| Tier | XP Required | Voting Weight | Unlocks |
|------|------------|---------------|---------|
| Member | 0 | 1x | Vote on proposals |
| Contributor | 100 | 2x | Claim bounties, submit proposals |
| Builder | 500 | 3x | Create tasks, mentor |
| Steward | 2,000 | 5x | Verify work, treasury proposals |
| Elder | 10,000 | 10x | Run for council, create DAOs |

**Voting weight matters.** An Elder's vote counts 10x a Member's. This rewards sustained contribution. You can't buy your way to Elder — you have to DO the work.

## 4. Semi-Bound: Transfer Resets XP

When a badge is transferred:
- The badge itself moves to the new wallet
- XP resets to 0
- Tier resets to Member
- votes_cast and tasks_completed reset to 0
- status stays "active"
- issued_at stays (proves the badge's age)

**Implementation:** The manager has a `reset_on_transfer` method called after detecting a transfer (via events or a transfer hook). OR: the badge resource is configured with a custom deposit rule that triggers a reset.

**Alternative (simpler):** Don't enforce reset on-chain. Check XP at vote time — if the badge is in a different account than last_active was recorded for, treat it as a fresh Member. Off-chain verification is simpler and doesn't require complex Scrypto hooks.

## 5. Free Mint (Onboarding)

Anyone can get a badge for free:
- `public_mint()` is PUBLIC — no admin badge required
- New badge starts as Member, 0 XP
- One badge per schema per wallet (enforced by ID format)
- Cost: just gas (~0.1 XRD)

**ID Format:** `<guild_member_{next_id}>` — sequential, human-readable

## 6. XP Accrual

| Action | XP Earned |
|--------|----------|
| Mint badge (join) | 0 (start at zero) |
| Vote on proposal | 10 |
| Complete a bounty | 50-500 (depends on bounty) |
| Submit accepted proposal | 100 |
| Verify someone's work | 25 |
| Refer someone who joins | 15 |
| Daily check-in (future) | 5 |

XP is updated by the manager admin (or by authorized components like a TaskManager or VoteManager). Only verified actions earn XP — no self-reporting.

## 7. Blueprint Interface

```
GuildBadgeManager

  // Public
  public_mint() -> Bucket                     // free badge for anyone
  get_badge(id) -> GuildBadge                 // read badge data
  get_badge_resource() -> ResourceAddress       // badge NFT address
  get_tier_thresholds() -> Vec<(String, u64)>  // tier name → min XP

  // Admin (badge-gated)
  add_xp(badge_id, amount, reason)             // increment XP, auto-upgrade tier
  set_tier(badge_id, tier)                     // manual tier override
  suspend(badge_id)                            // suspend badge (still held, can't vote)
  revoke(badge_id)                             // mark as revoked
  reactivate(badge_id)                         // un-suspend

  // Factory
  BadgeFactory::create_manager(schema, tiers, dapp_def) -> (Manager, AdminBadge)
```

## 8. What We DON'T Build

- ❌ Dynamic schema system (over-engineered, YAGNI)
- ❌ On-chain voting (use CrumbsUp or Consultation v2)
- ❌ On-chain escrow (use manual escrow for MVP)
- ❌ Grid game (gamification comes after governance works)
- ❌ Agent manager (AI agents come later)
- ❌ Custom portal (fix the existing one or use governance dashboard)

## 9. What We DO Build

1. **GuildBadgeManager** — Scrypto blueprint (one file, proven pattern)
2. **Badge minting** — from a WORKING interface (governance dashboard page, or direct manifest)
3. **Badge reading** — Gateway API queries (already works in the portal)
4. **XP updates** — admin method called by VPS signer
5. **Integration with CrumbsUp** — badge resource as governance token (already done)

## 10. Next Steps

1. **Fix the mint** — either fix the portal or add a mint page to the governance dashboard
2. **Verify badge reading** — confirm the dashboard shows badge data after mint
3. **Test voting on CrumbsUp** — confirm badge holders can vote
4. **Add XP update script** — VPS signer script to award XP for verified actions
5. **Document everything** — so others can use the blueprint

## 11. Architecture Diagram

```
USER
  |
  +-- Connect Wallet (Radix Wallet)
  |
  +-- Mint Badge (free, public_mint on GuildBadgeManager)
  |     → Badge NFT appears in wallet
  |     → CrumbsUp recognises badge as governance token
  |
  +-- Vote (on CrumbsUp, badge = voting power)
  |     → Tier determines weight
  |
  +-- Complete Tasks (bounties on CrumbsUp or GitHub)
  |     → Admin awards XP via add_xp()
  |     → Badge tier auto-upgrades when XP threshold crossed
  |
  +-- Transfer Badge (optional)
        → XP resets to 0
        → New holder starts as Member
```

---

*The badge is the vote. The vote is the badge. Everything else is UX.*
