# Issue #36 — Record Demo Video

> Wallet connect → mint → vote → admin (2-3 min walkthrough)

## Problem Analysis

There's no demo video showing the complete Guild flow. This is needed for:
- RadixTalk launch post
- CrumbsUp DAO governance proposal
- Community invitations and onboarding
- Developer documentation / contributor guides

## Solution Design

### Pre-Recording Checklist

Before recording, ensure the environment is clean and representative:

| Item | Status | Action Needed |
|------|--------|---------------|
| Dashboard deployed and responsive | Verify | Test all pages load on radixguild.com |
| Radix Wallet extension installed | Verify | Chrome or Firefox with Radix Wallet |
| Test account with XRD (for minting fee) | Prepare | Fund account with ~5 XRD |
| At least 2-3 active proposals visible | Seed | Create test proposals via bot if needed |
| At least 2-3 bounties visible | Seed | Use `scripts/seed-tasks.js` or create via bot |
| Admin badge in wallet | Verify | Need admin_badge resource for admin panel |
| Screen recording software | Install | OBS Studio (free) or similar |
| Browser clean (no unrelated tabs/extensions) | Prepare | Use dedicated Chrome profile |

### Video Script (2-3 Minutes)

#### Scene 1: Introduction (15 sec)
- Show Guild dashboard homepage (`/`)
- Brief text overlay: "Radix Guild — Decentralised DAO Toolkit"
- Pan through: stats cards, infographic gallery, ecosystem links

#### Scene 2: Connect Wallet (20 sec)
- Click "Connect Wallet" button in the header
- Radix Wallet extension opens → approve connection
- Dashboard updates: wallet address appears, badge loading indicator
- Show: address displayed in header, badge tier shown

#### Scene 3: Mint a Badge (30 sec)
- Navigate to `/mint`
- Show: minting form, badge preview, tier information
- Click "Mint Badge" → wallet prompts TX approval
- Approve TX → badge minted confirmation
- Show: badge appears in profile, tier = "member", XP = 0

#### Scene 4: Browse Dashboard (20 sec)
- Navigate to `/proposals` — show active proposals with vote counts
- Navigate to `/bounties` — show bounty board with stats
- Navigate to `/leaderboard` — show game leaderboard
- Navigate to `/groups` — show working groups

#### Scene 5: Vote on a Proposal (30 sec)
- On proposals page, find an active proposal
- Show: proposal details, current vote tally, countdown timer
- Click "Vote" (if CV2 temperature check: wallet signs TX)
- Show: vote recorded, tally updated
- *If off-chain vote via TG bot:* show bot voting in split-screen

#### Scene 6: Admin Panel (30 sec)
- Navigate to `/admin`
- Show: admin dashboard with system stats
- Demonstrate: badge lookup by address
- Show: `/admin/health` — system health monitoring
- Show: XP queue, feedback management

#### Scene 7: Telegram Bot (15 sec)
- Quick switch to Telegram
- Show: `/help` command output
- Show: `/propose` or `/bounty` command in action
- Show: bot response with inline keyboard

#### Scene 8: Closing (10 sec)
- Return to dashboard
- Text overlay: "Join the Guild" with links
- Show: Telegram bot link, GitHub repo link, CrumbsUp DAO link

### Recording Specifications

| Setting | Value |
|---------|-------|
| Resolution | 1920×1080 (1080p) |
| Frame rate | 30 fps |
| Format | MP4 (H.264) |
| Audio | Optional narration or text overlays only |
| Browser zoom | 100% or 110% for readability |
| Cursor highlight | Yes (highlight clicks for visibility) |
| Duration target | 2:00-3:00 |

### Post-Recording

1. **Edit:** Trim dead time, add transitions between scenes
2. **Add text overlays:** Scene titles, keyboard shortcuts, URLs
3. **Add background music:** Subtle, royalty-free (Kevin MacLeod or similar)
4. **Export:** MP4 1080p for YouTube, WebM for direct embedding
5. **Upload to:**
   - YouTube (unlisted or public)
   - Guild website (embed on homepage or `/about`)
   - RadixTalk forum post
   - CrumbsUp proposal attachment

### Repository Integration

After recording:
- Add video embed to `README.md` (YouTube link)
- Add to dashboard homepage (`guild-app/src/app/page.tsx`) as a "Watch Demo" section
- Add to `/about` page
- Reference in CrumbsUp governance proposal

### Alternative: Automated Screen Recording

If manual recording is difficult, consider:
- **Playwright script** — automated browser walkthrough with `page.screenshot()`/`page.video()`
- **Loom** — quick browser-based recording
- **GitHub Actions** — CI pipeline that generates screenshots for each page

## Effort Estimate

- Preparation + seeding: 0.5 session
- Recording (multiple takes): 0.5-1 session
- Editing + post-production: 0.5 session
- Publishing + embedding: 0.5 session
- **Total: 2-3 sessions**

## Dependencies

- Working dashboard deployment (all pages functional)
- Radix Wallet extension
- Test account with XRD
- Screen recording software (OBS Studio recommended)
- Video editing software (DaVinci Resolve free or similar)

## Notes

- This is a **manual task** — no code changes required (except embedding the final video)
- Good first issue for a community contributor familiar with video production
- Priority: launch material needed before public announcement
