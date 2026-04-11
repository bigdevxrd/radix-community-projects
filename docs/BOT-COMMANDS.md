# Bot Command Reference

**Bot:** [@rad_gov](https://t.me/rad_gov)
**Governance Group:** [t.me/rad_gov](https://t.me/rad_gov)

This document covers every command, wizard flow, and callback interaction supported by the Radix Governance Telegram bot.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Wallet and Badge Commands](#wallet-and-badge-commands)
3. [Governance Commands](#governance-commands)
4. [Proposal Wizard (Guided)](#proposal-wizard-guided)
5. [Quick Proposal Commands](#quick-proposal-commands)
6. [Viewing and Managing Proposals](#viewing-and-managing-proposals)
7. [Bounty System](#bounty-system)
8. [Working Groups](#working-groups)
9. [Feedback and Support](#feedback-and-support)
10. [Conviction Voting (CV3)](#conviction-voting-cv3)
10. [Game and Leaderboard](#game-and-leaderboard)
11. [Charter](#charter)
12. [Help and Resources](#help-and-resources)
13. [Admin Commands](#admin-commands)
14. [Callback Queries and Inline Buttons](#callback-queries-and-inline-buttons)
15. [Welcome Message](#welcome-message)
16. [Background Processes](#background-processes)

---

## Getting Started

### `/start`

**Who can use it:** Everyone

Behavior differs depending on where you run it.

**In a private DM with the bot:**

Launches the guided onboarding wizard. The bot checks whether you have already registered a wallet and shows the appropriate step.

If you have NOT registered:

```
Welcome to Radix Governance

Propose ideas, vote on them, earn XP -- all from Telegram.

Your badge is a free on-chain NFT that gives you voting power.

Follow the steps below to get started.

[ Step 1: Link Wallet ]
[ View Proposals      ]
```

If you HAVE registered:

```
Welcome to Radix Governance

...
Wallet linked: account_rdx1abc12...

[ Step 2: Mint Badge ]
[ View Proposals     ]
```

The onboarding wizard then proceeds through three guided steps with inline buttons (see [Onboarding Wizard](#onboarding-wizard) below).

**In a group chat:**

Returns a short message directing users to the DM:

```
Radix Governance

DM me to get started: @rad_gov
Or: /register <account_rdx1...> then /proposals

/help for commands | /faq for questions
```

---

## Wallet and Badge Commands

### `/register <address>`

**Who can use it:** Everyone
**Syntax:** `/register account_rdx1...`

Links your Radix Wallet address to your Telegram account. The address must match the pattern `account_rdx1` followed by 40-60 lowercase alphanumeric characters.

**Example:**

```
/register account_rdx1q0gk7t4dez0sqzfp36hy8x7xgr0p5ktwm4c5z23hvdxq
```

**Response:**

```
Wallet linked.

Voting is FREE -- no XRD required. You can /proposals and vote right away.

Want to earn XP and level up? Mint a free badge:
https://.../guild/mint

After minting, wait ~30s then /badge to check.
Questions? /faq
```

**Validation:** If the address format is invalid, the bot replies with usage instructions.

---

### `/badge`

**Who can use it:** Registered users
**Syntax:** `/badge`

Looks up your on-chain badge NFT and displays your governance identity.

**Response (badge found):**

```
Your Guild Badge

Name: bigdev
Tier: builder (vote weight: 3x)
XP: 250 / Level: 5
Status: active
ID: #badge_username_bigdev#

Earn XP: vote (+10), propose (+25), poll (+25), temp check (+10)
```

**Response (no badge):**

```
No badge found for this wallet.

If you just minted, wait ~30 seconds for the blockchain to confirm, then try /badge again.

Haven't minted yet? Go to:
https://.../guild/mint
```

---

### `/badges`

**Who can use it:** Registered users
**Syntax:** `/badges`

Shows your full badge profile including achievement progress and game stats.

**Response:**

```
Your Badge Profile

Guild Member: builder (3x vote)
XP: 250 | Level: 5
ID: #badge_username_bigdev#

Achievement Progress:
  Voter: 7/10 votes
  Dice Roller: 12 rolls, 1 jackpots

Planned badges: Contributor, Voter, Steward, Builder
See /faq for details.
```

---

### `/wallet`

**Who can use it:** Registered users
**Syntax:** `/wallet`

Shows your linked wallet address and badge details together.

**Response:**

```
Wallet: account_rdx1q0gk7t4dez0...

Badge: #badge_username_bigdev#
Name: bigdev
Tier: builder (3x vote weight)
XP: 250 | Level: 5
Status: active

Voting is free -- no XRD required.
Your badge is an on-chain NFT in your Radix Wallet.
```

---

### `/trust`

**Who can use it:** Registered users
**Syntax:** `/trust`

Shows your trust score and tier (Bronze/Silver/Gold). Score is calculated from on-chain activity: account age, votes cast, proposals created, tasks completed, groups joined, feedback submitted.

**Response:**

```
Trust Score: 50 (SILVER)

Account age: 3 days (+1)
Votes cast: 7 (+14)
Proposals created: 1 (+10)
Tasks completed: 0 (+0)
Groups joined: 5 (+25)
Feedback submitted: 0 (+0)

Tiers: Bronze (0+) → Silver (50+) → Gold (200+)
Higher tiers unlock more actions. Earn trust through participation.
```

---

### `/mint`

**Who can use it:** Everyone
**Syntax:** `/mint`

Provides instructions and a link to mint your free Guild badge NFT.

**Response:**

```
Mint your free Guild badge:
https://.../guild/mint

1. Connect your Radix Wallet
2. Enter a username (your governance identity)
3. Confirm the transaction (0 XRD cost)

After minting, wait ~30 seconds then /badge to verify.
Then /proposals to see what to vote on.
```

---

## Governance Commands

All governance commands that create proposals or cast votes require a Guild badge. If you are not registered, the bot tells you to `/register`. If you are registered but have no badge, it links you to the mint page.

---

## Proposal Wizard (Guided)

### `/propose` (no arguments) or `/new`

**Who can use it:** Badge holders
**Syntax:** `/propose` or `/new`

Launches the 4-step guided proposal creation wizard.

#### Step 1 -- Choose Type

```
Create a Proposal

Step 1/4: What type?

[ Yes / No    ] [ Multi-choice ]
[ Temp Check  ] [ Cancel       ]
```

- **Yes / No** -- Standard governance vote with For / Against / Amend options
- **Multi-choice** -- Poll with 2-6 custom options
- **Temp Check** -- Non-binding, 24-hour interest gauge (min 1 vote)

#### Step 2 -- Enter Title

```
Create a Proposal (Yes/No/Amend)

Step 2/4: Enter the title.
Just type it as a message.
```

You reply with your proposal title as a plain text message (max 500 characters).

#### Step 3 -- Description or Options

**For Yes/No and Temp Check:**

```
Step 3/4: Add a description (or skip)

Give context -- why should people vote yes?

[ Skip description ]
```

You can type a description or press "Skip description" to proceed without one.

**For Multi-choice:**

```
Step 3/4: Enter the options (separated by | )

Example: Option A | Option B | Option C
```

Type 2-6 options separated by the pipe character `|`.

#### Step 4 -- Choose Duration

```
Step 4/4: How long should voting last?

[ 24h ] [ 48h ] [ 72h ] [ 7 days ]
```

#### Confirmation

```
Create a Proposal -- Confirm

Type: Yes/No/Amend
Title: Fund community meetup
Description: Monthly Radix meetup in Berlin...
Duration: 72 hours
Min votes: 3

[ Submit ] [ Cancel ]
```

Pressing **Submit** creates the proposal, posts it with vote buttons, and awards +25 XP. Pressing **Cancel** discards the draft.

---

## Quick Proposal Commands

These commands skip the wizard and create a proposal in one message.

### `/propose <title>`

**Who can use it:** Badge holders
**Syntax:** `/propose Fund a community meetup in Berlin`

Creates a Yes/No/Amend proposal that lasts 72 hours.

**Response:**

```
Proposal #42

Fund a community meetup in Berlin

By: @bigdev_xrd
Ends: 2026-04-09 12:00 UTC (72h)
Type: Yes/No/Amend

[ For (0) ] [ Against (0) ]
[       Amend (0)         ]
```

**Validation:** Title is required, max 500 characters.

---

### `/poll <question> | <option1> | <option2> [| ...]`

**Who can use it:** Badge holders
**Syntax:** `/poll Best meeting day | Monday | Wednesday | Friday`

Creates a multi-choice poll. Requires at least 3 pipe-separated parts (question + 2 options). Maximum 6 options. Lasts 72 hours.

**Response:**

```
Poll #43

Best meeting day

By: @bigdev_xrd
Ends: 2026-04-09 12:00 UTC (72h)
Type: Multi-choice (pick one)

[ Monday (0)    ] [ Wednesday (0) ]
[ Friday (0)    ]
```

---

### `/temp <question>`

**Who can use it:** Badge holders
**Syntax:** `/temp Should we create a grants committee?`

Creates a non-binding temperature check. Lasts 24 hours. Minimum 1 vote. Options are always: Yes! / Maybe / No.

**Response:**

```
Temperature Check #44

Should we create a grants committee?

By: @bigdev_xrd
Ends: 2026-04-07 12:00 UTC (24h)
Non-binding -- just gauging interest

[ Yes! (0) ] [ Maybe (0) ]
[ No (0)   ]
```

---

### `/amend <proposal_id> <refined text>`

**Who can use it:** Badge holders
**Syntax:** `/amend 42 Fund a community meetup with a 500 XRD budget`

Creates an amendment (a new Yes/No/Amend proposal) linked to an existing proposal. Tracks amendment rounds (R2, R3, etc.).

**Response:**

```
Amendment R2 (of #42)
Proposal #45

Fund a community meetup with a 500 XRD budget

Original: Fund a community meetup in Berlin
By: @bigdev_xrd
Ends: 2026-04-09 12:00 UTC (72h)

[ For (0) ] [ Against (0) ]
[       Amend (0)         ]
```

---

## Viewing and Managing Proposals

### `/proposals`

**Who can use it:** Everyone
**Syntax:** `/proposals`

Lists all currently active proposals with vote counts and end times. Auto-closes any expired proposals before listing.

**Response:**

```
Active Proposals:

#42 [Vote] Fund a community meetup in Berlin
  for:3 | against:1 | amend:0 | Ends: 2026-04-09 12:00
  Vote: /vote 42

#43 [Poll] Best meeting day
  Monday:2 | Wednesday:5 | Friday:1 | Ends: 2026-04-09 12:00
  Vote: /vote 43

Tap /vote <id> to open vote buttons for any proposal.
```

---

### `/vote <id>`

**Who can use it:** Everyone
**Syntax:** `/vote 42`

Re-posts a specific proposal with fresh inline vote buttons. Useful for surfacing a buried proposal in an active chat.

---

### `/results <id>`

**Who can use it:** Everyone
**Syntax:** `/results 42`

Shows the full vote breakdown for any proposal (active or closed), including percentages and any amendments.

**Response:**

```
Proposal #42
Fund a community meetup in Berlin

Status: passed
Type: yesno

for: 5 (63%)
against: 2 (25%)
amend: 1 (13%)

Total: 8 votes | Min: 3

Amendments:
  R2 #45: Fund a community meetup with a 500 XRD bud...
```

---

### `/history`

**Who can use it:** Everyone
**Syntax:** `/history`

Shows the 10 most recent proposals of any status.

---

### `/cancel <id>`

**Who can use it:** Proposal author only
**Syntax:** `/cancel 42`

Cancels your own proposal. You can only cancel proposals you created.

---

### `/stats`

**Who can use it:** Everyone
**Syntax:** `/stats`

Shows aggregate bot statistics.

**Response:**

```
Guild Stats

Total proposals: 42
Active now: 3
Unique voters: 18
```

---

## Bounty System

### `/bounty` (no arguments)

**Who can use it:** Everyone
**Syntax:** `/bounty`

Opens the guided bounty menu with inline buttons showing current stats.

**Response:**

```
Bounty Board

Open: 3 | In Progress: 1 | Paid: 5
Escrow: 500 XRD available

[ View Bounties (3 open) ]
[ Create Bounty ] [ Claim Bounty ]
```

- **View Bounties** -- Lists all open bounties with status, reward, and title
- **Create Bounty** -- Starts the 3-step bounty creation wizard (badge required)
- **Claim Bounty** -- Shows claimable bounties as inline buttons

#### Bounty Creation Wizard

Triggered by the "Create Bounty" button.

**Step 1/3:** Enter the XRD reward amount (type a number).
**Step 2/3:** Enter the bounty title (one line, max 500 characters).
**Step 3/3:** Confirm or cancel.

```
Create Bounty -- Confirm

Title: Write a tutorial on badge minting
Reward: 50 XRD

Submit?

[ Create Bounty ] [ Cancel ]
```

#### Bounty Claim Flow

Triggered by the "Claim Bounty" button. Shows up to 5 open bounties as inline buttons:

```
Claim a Bounty

Select one:

[ #7 50 XRD -- Write a tutorial on ba... ]
[ #9 25 XRD -- Fix mobile layout issu... ]
[ Cancel ]
```

Tapping a bounty assigns it to you.

---

### `/bounty list`

**Who can use it:** Everyone
**Syntax:** `/bounty list`

Lists all open bounties with ID, status, reward, and title.

---

### `/bounty stats`

**Who can use it:** Everyone
**Syntax:** `/bounty stats`

Shows bounty statistics and escrow balance.

**Response:**

```
Bounty Stats

Open: 3 | Assigned: 1 | Submitted: 0
Verified: 0 | Paid: 5
Total paid: 250 XRD

Escrow: 500 XRD available (750 funded, 250 released)
```

---

### `/bounty create <xrd> <title>`

**Who can use it:** Badge holders
**Syntax:** `/bounty create 50 Write a tutorial on badge minting`

Creates a bounty directly (skip the wizard). Awards +25 XP.

---

### `/bounty claim <id>`

**Who can use it:** Badge holders
**Syntax:** `/bounty claim 7`

Claims an open bounty. The bounty is assigned to you. Complete the task, then submit.

---

### `/bounty submit <id> <github_pr_url>`

**Who can use it:** Bounty assignee
**Syntax:** `/bounty submit 7 https://github.com/bigdevxrd/radix-community-projects/pull/15`

Submits your completed bounty work for review. The bounty moves to "submitted" status and awaits admin verification.

---

## Working Groups

### `/groups`

**Who can use it:** Everyone
**Syntax:** `/groups`

Lists all working groups with member counts.

---

### `/group <name>`

**Who can use it:** Everyone
**Syntax:** `/group Guild`

View group detail including description, lead, and member list.

---

### `/group join <name>`

**Who can use it:** Badge holders
**Syntax:** `/group join Guild`

Join a working group. You must have a badge. Current groups: Guild, DAO, Radix Infrastructure, Business Development, Marketing.

---

### `/group leave <name>`

**Who can use it:** Group members
**Syntax:** `/group leave Marketing`

Leave a working group. Group leads cannot leave (transfer lead role first).

---

## Feedback and Support

### `/feedback <message>`

**Who can use it:** Everyone
**Syntax:** `/feedback The mint page doesn't load on mobile`

Submit a support ticket. Tracked with status (open/in-progress/resolved). Before creating a ticket, the bot checks if your question matches an existing FAQ entry and suggests the answer.

---

### `/mystatus`

**Who can use it:** Everyone
**Syntax:** `/mystatus`

Check your open support tickets and their current status.

---

### `/adminfeedback`

**Who can use it:** Admins
**Syntax:** `/adminfeedback`

List all open support tickets with IDs and status.

---

### `/adminfeedback respond <id> <message>`

**Who can use it:** Admins
**Syntax:** `/adminfeedback respond 5 Fixed in the latest deploy`

Respond to a support ticket. The user is notified.

---

### `/adminfeedback resolve <id>`

**Who can use it:** Admins
**Syntax:** `/adminfeedback resolve 5`

Close a support ticket.

---

## Game and Leaderboard

### `/game`

**Who can use it:** Registered users
**Syntax:** `/game`

Shows your dice game statistics. Every governance action (vote, propose, poll, temp check) triggers a dice roll that can award bonus XP.

**Response:**

```
Grid Game Stats

Total rolls: 12
Bonus XP earned: 85
Streak: 3 days
Jackpots: 1
Last roll: 5 (Epic)

Every governance action = 1 dice roll.
Roll 1: +0 | Roll 2: +5 | Roll 3: +10
Roll 4: +25 | Roll 5: +50 | Roll 6: +100 (JACKPOT!)
```

---

### `/leaderboard`

**Who can use it:** Everyone
**Syntax:** `/leaderboard`

Shows the top 10 users ranked by bonus XP from dice rolls.

**Response:**

```
Leaderboard -- Top Bonus XP

1. account_rdx1q0gk7t4d... -- 350 XP (45 rolls, 2 jackpots)
2. account_rdx1abc12345... -- 200 XP (30 rolls, 1 jackpots)
...
```

---

## Charter

### `/charter`

**Who can use it:** Everyone
**Syntax:** `/charter`

Shows the current status of the Radix DAO Charter -- how many parameters have been resolved, are being voted on, or are still pending.

**Response:**

```
Radix DAO Charter Status

Total parameters: 32
Resolved: 8
Voting: 2
Pending: 22

Ready to vote (5):
  voting_period -- Default voting period
  quorum -- Minimum votes to pass
  ...

Resolved:
  badge_cost = 0 XRD
  min_votes = 3

Full charter: radix.wiki/ideas/radix-network-dao-charter
```

---

### `/charter guide`

**Who can use it:** Badge holders
**Syntax:** `/charter guide`

Launches the interactive charter voting wizard. Walks you through unresolved charter parameters one at a time with inline buttons to create proposals for each.

---

## Help and Resources

### `/help`

**Who can use it:** Everyone
**Syntax:** `/help`

Shows the full command reference organized by category: Getting Started, Governance, View + Manage, Bounties, Help + Resources.

---

### `/faq`

**Who can use it:** Everyone
**Syntax:** `/faq`

Answers common questions: what is Radix Governance vs Radix Guild, do you need XRD to vote (no), what badges are, how XP works, tier vote weights, and more.

---

### `/readme`

**Who can use it:** Everyone
**Syntax:** `/readme`

Shows a project overview with links to the GitHub repo, dashboard, and charter.

---

### `/support`

**Who can use it:** Everyone
**Syntax:** `/support`

Shows how to get help: links to `/faq`, `/help`, `/readme`, the GitHub issues page, and the developer contact (@bigdev_xrd).

---

### `/dao`

**Who can use it:** Everyone
**Syntax:** `/dao`

Links to the CrumbsUp DAO page.

---

### `/source`

**Who can use it:** Everyone
**Syntax:** `/source`

Links to the GitHub repository.

---

### `/mvd`

**Who can use it:** Everyone
**Syntax:** `/mvd`

Links to the Minimum Viable DAO discussion on RadixTalk.

---

### `/wiki`

**Who can use it:** Everyone
**Syntax:** `/wiki`

Links to the Radix Wiki ecosystem page.

---

### `/talk`

**Who can use it:** Everyone
**Syntax:** `/talk`

Links to the RadixTalk forum.

---

## Admin Commands

### `/welcome`

**Who can use it:** Group admins (anyone can run it, but pinning requires admin rights)
**Syntax:** `/welcome`

Posts a pinnable welcome/onboarding message in the group and attempts to pin it automatically. Useful for setting up a new governance group.

**Posted message:**

```
Welcome to the Radix Guild Governance!

This is where the Radix community makes decisions together.

Get started in 3 steps:
1. /register <your account_rdx1... address>
2. Mint your free badge: https://.../guild
3. Come back here and vote on proposals!

Commands: /help
Charter: radix.wiki/ideas/radix-network-dao-charter
MVD: radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258
Source: https://github.com/bigdevxrd/radix-community-projects
```

---

### `/bounty apply <id> [pitch]`

**Who can use it:** Badge holders
**Syntax:** `/bounty apply 7 I have experience with React and can deliver in 3 days`

Applies for a task worth >100 XRD. Creator reviews applications and approves one.

---

### `/bounty approve <app_id>`

**Who can use it:** Task creator
**Syntax:** `/bounty approve 3`

Approves an applicant for a high-value task.

---

### `/bounty cancel <id>`

**Who can use it:** Task creator
**Syntax:** `/bounty cancel 7`

Cancels your own open task (must be unfunded and unclaimed).

---

### `/bounty categories`

**Who can use it:** Everyone
**Syntax:** `/bounty categories`

Lists the 6 task categories: Development, Design, Documentation, Community, Research, Infrastructure.

---

### `/bounty fund <id> <tx_hash>`

**Who can use it:** Badge holders
**Syntax:** `/bounty fund 7 txid_rdx1abc123...`

Verifies that a transaction deposited XRD into the on-chain TaskEscrow component. The bot checks the TX against the Radix Gateway — confirms the escrow component was involved and a TaskCreatedEvent was emitted. Only then is the task marked as funded.

You can also fund directly from the dashboard at radixguild.com/bounties — the "Fund" button builds the TX manifest and opens your Radix Wallet.

---

### `/bounty verify <id>`

**Who can use it:** Admins
**Syntax:** `/bounty verify 7`

Marks a submitted bounty as verified. Confirms work is complete and ready for payment.

---

### `/bounty pay <id> <tx_hash>`

**Who can use it:** Admins
**Syntax:** `/bounty pay 7 txid_rdx1abc123...`

Records a bounty payment. Logs the transaction hash, marks the bounty as paid, and awards XP to the assignee.

---

## Callback Queries and Inline Buttons

The bot uses Telegram inline keyboards extensively. Here is a reference of all callback query handlers.

### Vote Buttons

| Callback Data | Action |
|---|---|
| `vote_<id>_for` | Cast a "For" vote on proposal `<id>` |
| `vote_<id>_against` | Cast an "Against" vote on proposal `<id>` |
| `vote_<id>_amend` | Cast an "Amend" vote on proposal `<id>` |
| `vote_<id>_<option>` | Cast a vote for a specific poll option |

When a vote is cast:
- The bot checks registration and badge ownership
- Duplicate votes are rejected ("Already voted on this one")
- The vote counts on the message are updated in real time
- A dice roll triggers, with bonus XP shown in the confirmation popup

### Onboarding Wizard Buttons

| Callback Data | Action |
|---|---|
| `onboard_register` | Start Step 1: prompts user to paste their Radix address |
| `onboard_mint` | Start Step 2: shows mint page link and a "check badge" button |
| `onboard_check_badge` | Queries the blockchain for the user's badge |
| `onboard_proposals` | Shows active proposals as the final onboarding step |

### Proposal Wizard Buttons

| Callback Data | Action |
|---|---|
| `wizard_type_yesno` | Select Yes/No/Amend proposal type |
| `wizard_type_poll` | Select Multi-choice proposal type |
| `wizard_type_temp` | Select Temperature Check type |
| `wizard_cancel` | Cancel during type selection |
| `wizard_skip_desc` | Skip the description step |
| `wizard_duration_24` | Set 24-hour voting duration |
| `wizard_duration_48` | Set 48-hour voting duration |
| `wizard_duration_72` | Set 72-hour voting duration |
| `wizard_duration_168` | Set 7-day voting duration |
| `wizard_submit` | Confirm and create the proposal |
| `wizard_cancel_final` | Cancel at the confirmation step |

### Bounty Wizard Buttons

| Callback Data | Action |
|---|---|
| `bounty_view_start` | List all open bounties |
| `bounty_create_start` | Start the bounty creation wizard |
| `bounty_claim_start` | Show claimable bounties |
| `bounty_claim_<id>` | Claim a specific bounty |
| `bounty_create_confirm` | Confirm and create the bounty |
| `bounty_cancel` | Cancel the bounty wizard |

---

## Welcome Message

When a new (non-bot) member joins the governance group, the bot automatically sends:

```
Welcome <name>!

Radix Governance -- propose ideas, vote, earn XP.

Get started:
1. /register <your_account_rdx1...>
2. Mint free badge: https://.../guild/mint
3. /proposals to vote

/help for commands | /faq for questions
```

---

## Background Processes

### Auto-Close Expired Proposals

Every 5 minutes, the bot checks for proposals past their end time and:

1. Calculates the result based on vote counts and minimum vote threshold
2. Closes the proposal with a status: `passed`, `failed`, `needs_amendment`, `completed`, or `expired`
3. Announces the result in the original chat with a full vote breakdown
4. Posts the result to RadixTalk (if the API key is configured)
5. If the proposal is linked to a charter parameter and passes, resolves that charter parameter automatically

**Possible outcomes for Yes/No proposals:**
- **passed** -- "For" has the most votes and minimum votes met
- **failed** -- "Against" has the most votes
- **needs_amendment** -- "Amend" has the most votes (users are prompted to `/amend`)
- **expired** -- Minimum vote count not reached

**Possible outcomes for polls and temp checks:**
- **completed** -- Minimum vote count reached
- **expired** -- Minimum vote count not reached

### XP Rewards

XP is queued when users take governance actions and written on-chain periodically:

| Action | XP |
|---|---|
| Vote | +10 |
| Propose (Yes/No) | +25 |
| Create Poll | +25 |
| Temperature Check | +10 |
| Amend | +15 |
| Bounty creation | +25 |

Each action also triggers a dice roll for bonus XP:

| Roll | Bonus XP |
|---|---|
| 1 | +0 |
| 2 | +5 |
| 3 | +10 |
| 4 | +25 |
| 5 | +50 |
| 6 (JACKPOT) | +100 |

### Tier Progression

| Tier | XP Threshold |
|---|---|
| Member | 0 |
| Contributor | 100 |
| Builder | 500 |
| Steward | 2,000 |
| Elder | 10,000 |

Tiers reflect game progression. Voting weights are decided by charter vote (TBD).

### Gateway Event Watcher

The bot polls the Radix Gateway API every 60 seconds for new transactions on the TaskEscrow component. When a deposit, claim, release, or cancellation event is detected, the bot auto-creates/updates the SQLite record and logs it to the audit trail. This means tasks funded from the dashboard are detected automatically — no `/bounty fund` command needed.

### PR Merge Watcher

Every 5 minutes, the bot checks submitted bounties with `approval_type = 'pr_merged'`. For each, it calls the GitHub API to check if the linked PR is merged. On merge detection, the bot auto-verifies the task and logs the event. The escrow release is then queued for the verifier.

### Trust Score Recalculation

Trust scores are calculated on-demand from: account age, votes cast, proposals created, tasks completed, groups joined, feedback submitted. Tiers: Bronze (0+), Silver (50+), Gold (200+). Check with `/trust`.

---

## Conviction Voting (CV3)

> **BETA / Experimental.** Parameters subject to community charter vote. Deployed on Radix mainnet.

Conviction voting lets the community stake XRD on proposals to signal which work should be funded. Conviction grows over time — when threshold is met, funds auto-release from a shared pool.

### Commands

| Command | Description |
|---------|-------------|
| `/cv3` | List active conviction proposals with conviction bars |
| `/cv3 <id>` | Proposal detail — conviction %, stakers, threshold progress |
| `/cv3 status` | Sync health, pool balance, component address |
| `/cv3 pool` | Shared funding pool balance + active proposal count |

### How It Works

1. A proposal is created on-chain (requesting X XRD from the shared pool)
2. Community members stake XRD on proposals they support
3. Conviction score grows each hour: `y(t+1) = 0.9904 * y(t) + weighted_stake`
4. Badge tier multipliers amplify your stake: Member 1x, Contributor 1.5x, Builder+ 2x
5. When conviction exceeds `requested_amount * 10`, funds auto-release to the beneficiary
6. Stakes are returned after execution

### Beta Parameters

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Alpha (decay) | 0.9904 | 3-day half-life — conviction fades if stake removed |
| Threshold | 10x requested | Prevents lone-wolf proposals, rewards group support |
| Time step | 1 hour | Responsive but not spammy |
| Tier multipliers | 1x / 1.5x / 2x | Earned trust > wealth |

### Task Integration

Conviction proposals can be linked to bounties. When a linked proposal executes, the bounty is auto-funded from the pool. This means the community decides which tasks get funded — not individual sponsors.

### CV3 Watcher

The bot polls the Radix Gateway every 60 seconds for ConvictionVoting events: ProposalCreated, StakeAdded, StakeRemoved, ConvictionUpdated, ProposalExecuted, PoolFunded. All state is cached in SQLite for fast API reads.

### Dashboard

Conviction proposals appear on the [Proposals page](https://radixguild.com/proposals) with conviction progress bars, staker counts, and inline stake forms. Full explanation at [radixguild.com/docs](https://radixguild.com/docs).

**Component:** `component_rdx1cz97d534phmngxhal9l87a2p63c97n6tr6q3j6l290ckjnlhya0cvf`
