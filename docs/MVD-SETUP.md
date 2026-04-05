# Setting Up the Minimum Viable DAO

## The Problem

The Radix community has no framework for making decisions together. Ideas get discussed in Telegram, forgotten, and nothing changes. There's no way to:
- Propose something and have people vote on it
- Know if a decision was actually made
- Track who contributed and reward them
- Move from "talking about it" to "doing it"

## The Solution

Radix Governance — a system that turns ideas into decisions into actions.

```
💡 Idea → 🗳️ Vote → ✅ Decision → 💰 Fund → 🔨 Build → ✔️ Verify → 🎁 Reward
```

## One Job: Set Up the DAO

Everything else flows from this. Here's what needs to happen, in order.

---

## Step 1: Foundation Votes (6 decisions)

These are the rules. Everything else depends on them.

```
┌─────────────────────────────────────────────────────┐
│              FOUNDATION (vote first)                │
│                                                     │
│  1. Adopt the Charter?              [YES/NO]        │
│  2. How many RAC seats?             [3/5/7/9]       │
│  3. What's the quorum?              [3/10/25/50]    │
│  4. Default voting period?          [48h/72h/7d]    │
│  5. Approval threshold?             [>50%/>60%]     │
│  6. Amendment threshold?            [>60%/>66%]     │
│                                                     │
│  ⚡ No dependencies — vote on all 6 now             │
└─────────────────────────────────────────────────────┘
                          │
                    passes ↓
```

**How to do it:** These 6 proposals are already live in the TG bot. Vote on them.

---

## Step 2: Configuration (20 decisions)

These set the operating parameters. They UNLOCK after Step 1.

```
┌─────────────────────────────────────────────────────┐
│           CONFIGURATION (unlocked by Step 1)        │
│                                                     │
│  RAC seats decided → unlock:                        │
│    ├── Multi-sig threshold                          │
│    ├── Member compensation                          │
│    ├── Meeting frequency                            │
│    └── Inactivity trigger                           │
│                                                     │
│  Quorum decided → unlock:                           │
│    ├── Amendment quorum                             │
│    ├── Election quorum                              │
│    ├── Emergency quorum                             │
│    └── Proposal stake amount                        │
│                                                     │
│  Voting period decided → unlock:                    │
│    ├── Amendment voting period                      │
│    ├── Election voting period                       │
│    ├── Emergency voting period                      │
│    ├── Forum discussion minimum                     │
│    └── Execution delay                              │
│                                                     │
│  Approval threshold decided → unlock:               │
│    ├── Treasury grant limit                         │
│    ├── Treasury bounty limit                        │
│    ├── Monthly ops limit                            │
│    └── Emergency spending cap                       │
│                                                     │
│  ⚠️ Can't vote on these until Step 1 completes     │
└─────────────────────────────────────────────────────┘
                          │
                    passes ↓
```

**How to do it:** The bot tracks dependencies. Type `/charter` to see which params are ready to vote on. When foundation votes pass, configuration votes auto-unlock.

---

## Step 3: Operations (6 decisions)

This is where the DAO starts DOING things.

```
┌─────────────────────────────────────────────────────┐
│           OPERATIONS (unlocked by Step 2)           │
│                                                     │
│  Election params decided → unlock:                  │
│    └── 🗳️ First RAC Election                       │
│                                                     │
│  Treasury limits decided → unlock:                  │
│    └── 💰 First Bounty Fund                        │
│                                                     │
│  Charter adopted → unlock:                          │
│    └── 🏗️ Infrastructure Hosting Approval          │
│                                                     │
│  ✨ After this: the DAO is operational              │
└─────────────────────────────────────────────────────┘
```

---

## Step 4: Free Reign

Once Steps 1-3 complete, the DAO is self-governing. Anyone with a badge can:
- Propose new ideas (`/propose`)
- Create bounties (`/bounty create`)
- Vote on anything (`inline buttons`)
- Earn XP and roll dice (`/game`)
- Level up their tier and voting weight

---

## The Full Decision Map

```
STEP 1: FOUNDATION (now)
├── Charter ────────────────────────────→ Infrastructure hosting
├── RAC seats ──→ Multi-sig, compensation, meetings, inactivity
├── Quorum ─────→ Amendment/election/emergency quorums, stake
├── Voting period → Amendment/election/emergency periods, delays
├── Approval ───→ Treasury limits (grant/bounty/ops/emergency)
└── Amendment threshold

STEP 2: CONFIGURATION (after Step 1)
├── 20 parameters auto-unlock based on dependencies
└── Each is a poll with predefined options

STEP 3: OPERATIONS (after Step 2)
├── First RAC election
├── First bounty fund
└── Infrastructure approval

STEP 4: FREE REIGN (after Step 3)
└── Community proposes, votes, builds, earns
```

## Progress Tracking

Type `/charter` in the TG bot to see:
```
Charter Progress: 0/32 resolved
Ready to vote: 6 foundation parameters

Resolved:
  (none yet — you're the first voters!)
```

The dashboard at `/guild` also shows charter progress with a visual progress bar.

## What You Need

1. **A Radix Wallet** (free)
2. **A Guild badge** (free — mint at the dashboard)
3. **Telegram** (join @radix_guild_bot)
4. **5 minutes** to vote on the 6 foundation proposals

That's it. Vote on 6 things and the DAO starts building itself.

## FAQ

**Q: Do I need XRD to vote?**
A: No. Voting is free. Badge minting is free. Everything is free.

**Q: What if I disagree with a vote result?**
A: Propose an amendment. The system supports multiple rounds.

**Q: What happens if nobody votes?**
A: Proposals expire. The parameter stays TBD. Try again later.

**Q: Can I change my vote?**
A: No. Votes are final. Think before you click.

**Q: Who's in charge?**
A: Nobody — that's the point. The charter defines the rules, the community votes on the parameters, and the system enforces them.
