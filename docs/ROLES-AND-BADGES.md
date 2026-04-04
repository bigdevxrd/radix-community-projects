# Radix Guild — Roles & Badges

## Overview

Two badge types. Simple. Clear. No overlap.

**Member Badges** = participation + reputation (earned via XP)
**Role Badges** = operational access (assigned by admin)

Both are on-chain NFTs. Both are verifiable. Both are separate.

---

## Member Badges (guild_member schema)

Anyone can get one. Free. Your vote.

| Tier | XP | Voting Weight | What You Can Do |
|------|-----|--------------|----------------|
| Member | 0+ | 1x | Vote, daily participation |
| Contributor | 100+ | 2x | Claim bounties, submit proposals |
| Builder | 500+ | 3x | Create tasks, mentor newcomers |
| Steward | 2,000+ | 5x | Verify work, propose treasury spending |
| Elder | 10,000+ | 10x | Run for council, create DAOs |

**How to get one:** `/register` your wallet in TG, then mint at the portal.
**How to level up:** Vote, complete tasks, propose, contribute. XP is earned, not bought.
**Transferable:** Yes, but XP resets (semi-bound).

---

## Role Badges (guild_role schema)

Assigned by admin. Operational access. Not earned via XP.

| Role | Who Gets It | What It Enables |
|------|------------|----------------|
| Admin | Infra custodians (Big Dev initially, RAC when formed) | Deploy code, manage VPS, mint role badges, emergency access |
| Moderator | Community-appointed TG moderators | Moderate group, review proposals, verify bounty completion |
| Contributor | Active developers, content creators | Recognized builder status, access to working group tasks |

**How to get one:** Admin mints it to your wallet via `/dao/admin` page.
**Transferable:** Yes (roles can be passed to successors).
**Who assigns initially:** Big Dev (custodian) until RAC takes over.

---

## Access Model

```
PUBLIC (no badge needed):
  - View proposals, results, history
  - Browse bounties
  - Read charter, docs, wiki links
  - /start, /help, /proposals, /stats

MEMBER BADGE (free mint):
  - Vote on proposals (/vote)
  - Create proposals (/propose, /poll, /temp)
  - Amend proposals (/amend)
  - Cancel own proposals (/cancel)
  - Check badge (/badge)

ROLE: MODERATOR
  - All member abilities
  - Verify bounty completions
  - Flag/remove proposals (future)

ROLE: ADMIN
  - All moderator abilities
  - Mint role badges to others
  - Update XP on any badge
  - Deploy code, manage infrastructure
  - Access /dao/admin page
```

---

## Handover Plan

### Phase 1: Now (Big Dev custodian)
- Big Dev holds Admin role badge
- Big Dev manages VPS, bot, deployments
- Community members get Member badges
- Big Dev appoints 1-2 Moderators as trust builds

### Phase 2: RAC Formed
- RAC members receive Admin role badges
- Big Dev retains Admin for infrastructure only
- RAC approves new Moderators
- Community votes on operational decisions

### Phase 3: Full Handover
- VPS access transferred to DAO entity
- Admin badges transferred to DAO multi-sig (if available)
- Big Dev becomes regular Member/Elder
- All operations community-run

---

## Onboarding Summary

### For a new member (2 minutes):
1. Join TG governance group
2. `/register account_rdx1...`
3. Mint badge at portal
4. `/proposals` → `/vote <id>` → participate

### For a new moderator:
1. Must already be a Member
2. Nominated by existing admin or community proposal
3. Admin mints Moderator role badge to their wallet
4. Gets TG group admin rights

### For a new admin:
1. Must be trusted by existing admins or RAC
2. Admin mints Admin role badge
3. Gets VPS access (SSH key added)
4. Reads INFRASTRUCTURE.md for full handover docs

---

## On-Chain Addresses

| Badge | Manager | NFT Resource |
|-------|---------|-------------|
| Member | component_rdx1cqarn8x... | resource_rdx1ntlzds... |
| Role | component_rdx1crh7qla... | resource_rdx1ntr6ye2... |

Both schemas deployed via BadgeFactory on mainnet.

---

## Everything is Open Source

- Bot code: github.com/bigdevxrd/radix-community-projects/bot/
- Scrypto: github.com/bigdevxrd/radix-community-projects/badge-manager/
- Docs: github.com/bigdevxrd/radix-community-projects/docs/
- License: MIT — anyone can fork, modify, redeploy
