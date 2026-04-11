# How Radix Governance Works

A simple guide to how everything connects — from your first badge to running a DAO.

---

## The 5-Minute Version

```
You ──> Mint Badge ──> Vote ──> Earn XP ──> Level Up ──> Track Progress
```

1. Connect your Radix Wallet
2. Mint a free badge (on-chain NFT)
3. Link your wallet in the Telegram bot
4. Vote on proposals
5. Every vote earns XP + a dice roll for bonus XP
6. XP determines your tier (Member → Contributor → Builder → Steward → Elder)

---

## User Flow

```
┌─────────────────────────────────────────────────────────┐
│                    GETTING STARTED                       │
│                                                         │
│  1. Visit dashboard ──> Connect Wallet                  │
│  2. Go to /mint ──> Choose username ──> Sign in wallet  │
│  3. Badge appears in your Radix Wallet (free NFT)       │
│  4. Open @rad_gov in Telegram                           │
│  5. Type /register account_rdx1...                      │
│  6. Done! You can now vote.                             │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    DAILY GOVERNANCE                      │
│                                                         │
│  Vote on proposals ──> Earn 10 XP + dice roll           │
│  Create proposals  ──> Earn 25 XP + dice roll           │
│  Complete bounties ──> Earn XRD + XP + dice roll        │
│                                                         │
│  Dice: 🎲 1=Miss  2=+5  3=+10  4=+25  5=+50  6=+100   │
│                                                         │
│  XP accumulates in your on-chain badge NFT.             │
│  Higher tier = more recognition for participation.       │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    TWO WAYS TO VOTE                      │
│                                                         │
│  OFF-CHAIN (Telegram)          ON-CHAIN (Dashboard)     │
│  ─────────────────────         ────────────────────     │
│  Cost: Free                    Cost: ~0.1 XRD tx fee    │
│  Weight: 1 badge = 1 vote     Weight: XRD balance       │
│  Speed: Instant                Speed: ~5 seconds         │
│  Where: @rad_gov bot           Where: /proposals page    │
│  Good for: Day-to-day          Good for: Formal votes    │
│            coordination                  binding          │
│            temperature checks            decisions        │
└─────────────────────────────────────────────────────────┘
```

---

## What Happens When You Vote (Behind the Scenes)

```
YOU VOTE IN TELEGRAM
        │
        ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  TG Bot      │────>│  SQLite DB   │────>│  REST API    │
│  validates   │     │  records     │     │  serves to   │
│  your badge  │     │  your vote   │     │  dashboard   │
└──────────────┘     └──────────────┘     └──────────────┘
        │                                        │
        ▼                                        ▼
┌──────────────┐                         ┌──────────────┐
│  XP Reward   │                         │  Dashboard   │
│  +10 XP      │                         │  shows live  │
│  + dice roll │                         │  results     │
└──────────────┘                         └──────────────┘
        │
        ▼
┌──────────────┐     ┌──────────────┐
│  XP Batch    │────>│  Radix       │
│  Signer      │     │  Ledger      │
│  (every 6h)  │     │  updates     │
│              │     │  your badge  │
└──────────────┘     └──────────────┘


YOU VOTE ON-CHAIN (CV2)
        │
        ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Dashboard   │────>│  Radix       │────>│  CV2         │
│  builds tx   │     │  Wallet      │     │  Governance  │
│  manifest    │     │  signs tx    │     │  Component   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Bot syncs   │
                                          │  every 5 min │
                                          │  from chain  │
                                          └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Dashboard   │
                                          │  shows CV2   │
                                          │  results     │
                                          └──────────────┘
```

---

## Tier System

| Tier | XP Required | What It Means |
|------|-------------|--------------|
| **Member** | 0 | New member, just getting started |
| **Contributor** | 100 | Active participant |
| **Builder** | 500 | Regular contributor |
| **Steward** | 2000 | Experienced governance participant |
| **Elder** | 10000 | Long-term community pillar |

**XP is a participation tracker, not voting power.** It shows how active you've been in governance. Every action (vote, propose, bounty) earns base XP plus a random dice roll bonus. Tiers are recognition — they show your commitment level on your on-chain badge.

Voting weight (whether tiers affect vote power, or everyone gets equal votes, or votes are XRD-weighted) is an **unresolved charter parameter** — the community will decide this in Phase 2.

---

## Bounty Lifecycle

```
FUNDER                  CONTRIBUTOR              ADMIN
  │                         │                      │
  │  Fund escrow            │                      │
  │  (deposit XRD)          │                      │
  ▼                         │                      │
┌──────┐                    │                      │
│ Open │ ◄── Create bounty ─┘                      │
└──┬───┘    (title, XRD reward)                    │
   │                        │                      │
   │   Claim ──────────────>│                      │
   ▼                        ▼                      │
┌──────────┐          ┌──────────┐                 │
│ Assigned │          │ Working  │                 │
└──┬───────┘          └──┬───────┘                 │
   │                     │                         │
   │   Submit (PR link) ─┘                         │
   ▼                                               │
┌───────────┐                                      │
│ Submitted │ ──── Review ────────────────────────>│
└──┬────────┘                                      │
   │                                               ▼
   │                                         ┌──────────┐
   │   Verify ◄──────────────────────────────│ Verified │
   │                                         └──┬───────┘
   ▼                                             │
┌──────┐                                         │
│ Paid │ ◄── Release XRD from escrow ────────────┘
└──────┘
   │
   └──> Contributor earns: XRD reward + XP + dice roll
```

---

## Charter Decision Flow

The DAO has 32 governance decisions organized into 3 phases. Each phase unlocks when the previous one completes.

```
PHASE 1: FOUNDATION (6 decisions)
├── Adopt the Charter?              [YES/NO]
├── RAC seat count?                 [3/5/7/9]
├── Standard quorum?                [3/10/25/50]
├── Default voting period?          [48h/72h/7d]
├── Standard approval threshold?    [>50%/>60%/>66%]
└── Amendment approval threshold?   [>60%/>66%/>75%]
         │
         │ All 6 resolved
         ▼
PHASE 2: CONFIGURATION (20 decisions)
├── Treasury limits (grants, bounties, ops, emergency)
├── Election rules (nomination, discussion, eligibility)
├── Timing (forum minimum, execution delay, cooldown)
├── RAC operations (multisig, compensation, meetings)
└── Reputation + enforcement rules
         │
         │ All 20 resolved
         ▼
PHASE 3: OPERATIONS (6 decisions)
├── Launch first RAC election
├── Establish first bounty fund
└── Approve infrastructure hosting
         │
         │ All 6 resolved
         ▼
DAO IS SELF-GOVERNING
```

Type `/charter` in the bot or visit `/proposals` on the dashboard to see real-time progress.

---

## System Stewardure (Simple Version)

```
┌─────────────────────────────────────────────────────────┐
│                    YOU (the user)                        │
│                                                         │
│  Radix Wallet          Telegram            Dashboard    │
│  (badges, XRD)         (@rad_gov)          (browser)    │
└────────┬───────────────────┬───────────────────┬────────┘
         │                   │                   │
         │              ┌────┴────┐         ┌────┴────┐
         │              │ TG Bot  │────────>│ Next.js │
         │              │ (Grammy)│  API    │  App    │
         │              └────┬────┘         └─────────┘
         │                   │
         │              ┌────┴────┐
         │              │ SQLite  │  Proposals, votes,
         │              │   DB    │  XP, bounties, game
         │              └─────────┘
         │
    ┌────┴─────────────────────────────────┐
    │          RADIX LEDGER (mainnet)       │
    │                                      │
    │  BadgeManager ── your badge NFT      │
    │  CV2 Governance ── on-chain votes    │
    │  VoteDelegation ── delegate power    │
    └──────────────────────────────────────┘
```

---

## Where Everything Lives

| What | Where | URL |
|------|-------|-----|
| Dashboard | Browser | https://radixguild.com |
| Telegram Bot | Telegram | @rad_gov |
| Badge NFT | Your Radix Wallet | Visible in wallet |
| On-chain votes | Radix Ledger | Viewable on Radix Dashboard |
| Source code | GitHub | github.com/bigdevxrd/radix-community-projects |
| API | REST | /api/stats, /api/proposals, etc. |

---

## FAQ

**Do I need XRD to participate?**
No. Minting a badge is free. Voting in Telegram is free. Only on-chain CV2 votes cost a small tx fee (~0.1 XRD).

**Is my badge really on-chain?**
Yes. It's a Non-Fungible Token on the Radix mainnet. You can see it in your Radix Wallet and on the Radix Dashboard.

**What happens to my XP?**
XP is tracked in the bot database and written to your on-chain badge every 6 hours. It tracks your participation level and determines your tier. XP does not currently affect voting power — that's a charter decision the community will make.

**Can I lose my badge?**
Only if an admin revokes it (e.g., for abuse). You control it in your wallet.

**Who runs this?**
bigdev (@bigdev_xrd) built and hosts it. The plan is to transfer control to an elected Representative Advisory Council (RAC) once the charter is ratified. Everything is open source and MIT licensed.

**What if nobody votes?**
Nothing happens. The system is ready and waiting. It only works if the community uses it.
