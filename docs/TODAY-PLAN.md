# Today's Build Plan — April 6, 2026

## Priority: Ship features testers will love. Maximum impact, minimum risk.

## Claude Builds (in order)

### 1. Game Stats on Dashboard (#46) — 30 min
Add game stats section to home page. Data already available via /api/game/:address.
Show: total rolls, bonus XP, streak, jackpots, last roll.
Only when wallet connected (needs address).

### 2. Leaderboard Page (#47) — 45 min
New page at /guild/leaderboard. Data from /api/leaderboard.
Table: rank, address (truncated), rolls, bonus XP, jackpots.
Highlight connected user. Add to AppShell nav.

### 3. Charter Voting from Dashboard — 1 hour
On the proposals page decision tree, make the "ready to vote" params
clickable — each opens a detail card with the options and a
"Vote in Telegram" deep link. Not actual voting from dashboard
(that stays in TG), but clear guidance on WHAT to vote for.

### 4. Mobile Polish Pass — 30 min
Quick scan of all 4 pages on mobile viewport.
Fix any overflow, truncation, or layout breaks.
Test: resize browser to 375px width.

### 5. Dashboard Error States — 30 min
Currently if APIs fail, dashboard shows nothing.
Add: "Failed to load" messages, retry buttons.
Better loading skeletons where missing.

## Copilot Issues (create for parallel work)

### Copilot Task A: API Reference Docs
"Create docs/API-REFERENCE.md documenting all REST endpoints with
request/response examples. Endpoints: /api/stats, /api/charter,
/api/bounties, /api/escrow, /api/proposals, /api/game/:address,
/api/leaderboard, /api/badge/:address, /api/badge/:address/verify"

### Copilot Task B: Bot Command Reference
"Create docs/BOT-COMMANDS.md with every bot command, usage, examples,
and which ones require a badge. Include wizard flows."

### Copilot Task C: Automated Testing Improvements
"Add tests for bounty lifecycle and charter params to
scripts/pipeline-test.js. Test: /api/bounties returns stats,
/api/charter returns 32 params, /api/game/:address returns state."

## Schedule

| Time | What | Effort |
|------|------|--------|
| Now | Game stats on dashboard (#46) | 30 min |
| +30m | Leaderboard page (#47) | 45 min |
| +1h15 | Charter voting detail cards | 1 hour |
| +2h15 | Mobile polish | 30 min |
| +2h45 | Error states | 30 min |
| +3h15 | Deploy + test everything | 15 min |
| +3h30 | Create Copilot issues | 10 min |
| +3h40 | Done — monitor beta feedback | — |

## Definition of Done
- All features deployed to guild VPS
- Pipeline 19/19 passing
- Both repos synced
- Issues closed as completed
