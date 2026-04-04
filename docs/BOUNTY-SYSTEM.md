# Bounty System — Community Guide

Earn XRD by completing tasks for the Radix Guild. Browse open bounties, claim one you can deliver, submit your work, and get paid automatically once approved.

## How It Works

```
Admin posts bounty → Community discovers via /bounties or Portal
        ↓
You claim a bounty → Status changes to "claimed"
        ↓
You complete the work → Submit via /bounties or API
        ↓
Admin reviews and approves → Status changes to "approved"
        ↓
XRD released from escrow → TX hash logged, you're paid
```

## Telegram Commands

### `/bounties`
Lists all open bounties with reward amounts and due dates.

```
Active Bounties (5 open | 140 XRD pool)

💰 1. Write tutorial (50 XRD) — Due: Apr 10
   Teach the Guild architecture to new members
   [Tutorial] /bounties 1 for details

💰 2. Design banner (25 XRD) — Due: Apr 12
   Beautiful banner for Guild portal
   [Design] /bounties 2 for details

/bounties <id> for details | /my-bounties for your claims
```

### `/bounties <id>`
Shows full details for a specific bounty.

```
💰 Bounty #1 [OPEN]

Write tutorial

Teach the Guild architecture to new members — how
proposals work, how to vote, how XP is earned.

Category: tutorial
Reward: 50 XRD
Expires: 2025-04-10
```

### `/my-bounties`
Shows all bounties you've claimed and your total earnings.

```
Your Bounties

Total earned: 75 XRD

✅ #3 Design banner (25 XRD)
   Status: paid | Tx: txid_abc123...

📬 #5 Write blog post (50 XRD)
   Status: submitted
```

## Bounty Statuses

| Status | Meaning |
|--------|---------|
| `draft` | Created but not yet published |
| `open` | Available to claim |
| `claimed` | Someone is working on it |
| `submitted` | Work submitted, awaiting admin review |
| `approved` | Admin approved, payment processing |
| `paid` | XRD sent to claimer |
| `expired` | Deadline passed without completion |

## Eligibility

To claim a bounty you must:
1. Have a registered Radix wallet (`/register`)
2. Hold a Guild badge (`/mint` to get one free)
3. Not be the creator of that bounty

## Claiming via API

You can also claim bounties programmatically:

```bash
curl -X POST https://guild.example.com/api/bounties/1/claim \
  -H "Content-Type: application/json" \
  -d '{"address": "account_rdx1..."}'
```

Response:
```json
{
  "ok": true,
  "bounty_id": 1,
  "claimed_by": "account_rdx1...",
  "crumbsup_claim_url": "https://crumbsup.io/..."
}
```

## FAQ

**Can I claim multiple bounties?**  
Yes, as long as they're not the same bounty. You can have multiple active claims.

**What if someone else claims it first?**  
Bounties are first-come, first-served. Only one claimer per bounty.

**How long do I have to complete it?**  
Until the expiry date shown on the bounty. Plan accordingly.

**When do I get paid?**  
After admin approval, XRD is released from the escrow wallet. This typically happens within 24–48 hours of submission.

**What if my submission is rejected?**  
Work with the admin to address feedback. The bounty remains in `submitted` status until approved or reassigned.
