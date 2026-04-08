# Radix Guild — Roles & Badges

## Overview

Two badge types. Simple. Clear. No overlap.

**Member Badges** = participation + reputation (earned via XP)
**Role Badges** = operational access (assigned by admin)

Both are on-chain NFTs. Both are verifiable. Both are separate.

---

## Member Badges (guild_member schema)

Anyone can get one. Free. Your vote.

| Tier | XP | Recognition Level |
|------|-----|------------------|
| Initiate | 0+ | New member, can vote |
| Contributor | 100+ | Active participant |
| Builder | 500+ | Regular contributor |
| Architect | 2,000+ | Experienced governance participant |
| Elder | 10,000+ | Long-term community pillar |

**Note:** XP and tiers are participation trackers, not voting power. Whether tiers affect vote weight is a charter decision the community will make in Phase 2.

**How to get one:** `/register` your wallet in TG, then mint at the portal.
**How to level up:** Vote, complete tasks, propose, contribute. XP is earned, not bought.
**Transferable:** Yes, but XP resets (semi-bound).

---

## Role Badges (guild_role schema)

Assigned by admin. Operational access. Not earned via XP.

| Role | Who Gets It | What It Enables |
|------|------------|----------------|
| Host | Infrastructure operators (bigdev for 12 months) | Deploy code, manage VPS/nodes, mint role badges, emergency access |
| Moderator | Community-elected via proposal vote | Moderate TG group, review proposals, verify bounty completion |
| Contributor | Active developers, content creators | Recognized builder status, access to working group tasks |

**Host ≠ Leader.** The Host keeps infrastructure running. The community leads through proposals and votes. Moderators are the community's chosen representatives, not the Host's appointees.

**How to get one:** Admin mints it to your wallet via `/dao/admin` page.
**Transferable:** Yes (roles can be passed to successors).
**Who assigns initially:** bigdev (custodian) until RAC takes over.

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

ROLE: HOST (infrastructure)
  - Deploy code, manage VPS/nodes
  - Mint role badges
  - Update XP on any badge
  - Access /guild/admin page
  - Emergency response
  - NOT governance decisions

ROLE: MODERATOR (community-elected)
  - All member abilities
  - Verify bounty completions
  - Flag/remove proposals (future)
  - Represent community interests
```

---

## bigdev's Role: Infrastructure Host

bigdev is **back of house** — keeps the lights on, not the face of the Guild.

**Commits to:**
- 12 months hosting (VPS, nodes, bot, dashboard)
- Uptime monitoring and incident response
- Code deployments and updates
- Database backups
- NOT a community representative or RAC contact
- NOT making governance decisions
- Available to support but not to lead

**Think of it as:** The chef keeps the kitchen running. The community decides the menu.

---

## Handover Plan

### Phase 1: Now (bigdev hosts)
- bigdev holds Admin role badge (infrastructure access only)
- bigdev manages VPS, bot, deployments
- Community members get Member badges
- Community appoints Moderators via proposal vote

### Phase 2: Community Leads Formed
- Community-elected leads receive Moderator role badges
- bigdev retains Admin for infrastructure only
- Leads manage proposals, bounties, community engagement
- RAC approves new Moderators
- Community votes on operational decisions

### Phase 3: Full Handover
- VPS access transferred to DAO entity
- Admin badges transferred to DAO multi-sig (if available)
- bigdev becomes regular Member/Elder
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
