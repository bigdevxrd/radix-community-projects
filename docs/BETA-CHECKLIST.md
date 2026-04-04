# Beta Testing Checklist — Steps to Production

## System Verification (do before inviting testers)

### On-Chain
- [ ] Badge Manager v4 live on mainnet (verified)
- [ ] Test badge minted: `<guild_member_bigdevxrd>` with 20 XP
- [ ] Admin badge in signer account (for XP batch)
- [ ] Duplicate prevention works (same username = rejected)

### Bot
- [ ] `/start` — explains Radix Governance vs Radix Guild
- [ ] `/register` — validates address format, links wallet
- [ ] `/badge` — shows tier, XP, vote weight
- [ ] `/wallet` — shows badge + "voting is free"
- [ ] `/faq` — comprehensive FAQ
- [ ] `/help` — organized command list
- [ ] `/mint` — links to dashboard with instructions
- [ ] `/propose` — creates proposal (badge required)
- [ ] `/proposals` — lists active proposals
- [ ] Vote buttons work (badge-gated, one per user)
- [ ] XP queued after vote (+10 XP)
- [ ] Rate limiting active (60 req/min API, 1 XP/action/hour)

### Dashboard
- [ ] `/guild` — hero (disconnected) or badge card (connected)
- [ ] `/guild/mint` — username input, free mint, next steps
- [ ] `/guild/proposals` — stats, proposal cards, vote bars, archive toggle
- [ ] `/guild/admin` — badge lookup, 5 admin actions
- [ ] Theme toggle works (dark/light)
- [ ] Mobile responsive

### Pipeline
- [ ] 19/19 tests passing
- [ ] 11/11 Scrypto tests passing

---

## Invite Beta Testers (2-3 people)

### Who to Invite
- Radix community members who are active in TG
- Technical enough to have a Radix Wallet
- Patient enough to give honest feedback

### What to Send
Use template in `docs/TESTER-INVITE.md` (DM version)

### What to Ask Testers
1. Did the mint work first try?
2. Could you vote on a proposal?
3. Was anything confusing?
4. What would you change?
5. Did you understand the difference between Guild (you) and Governance (the system)?

---

## During Beta (monitor)

### Daily
- [ ] Check PM2 stability: `pm2 list | grep guild` (↺ should be 0)
- [ ] Check bot logs: `pm2 logs guild-bot --lines 20`
- [ ] Run pipeline test: `node scripts/pipeline-test.js`

### After Votes
- [ ] Run XP batch signer to write XP on-chain
- [ ] Verify XP updated: `/api/badge/<address>`

### If Bugs Found
- [ ] Create GitHub issue
- [ ] Fix, deploy, test
- [ ] Notify tester

---

## After Beta (before public launch)

### Required
- [ ] All tester bugs fixed
- [ ] Clean up test proposals (cancel duplicates)
- [ ] 24h stability test passes (↺ 0)
- [ ] Security audit doc current
- [ ] CORS_ORIGINS set for production domain (when ready)

### Recommended
- [ ] Custom domain (radixguild.com or similar)
- [ ] Dedicated VPS (guild-only)
- [ ] Automated XP batch signer (cron job)
- [ ] Monitoring/alerting

### Phase 4 (post-launch, community-driven)
- [ ] Consultation v2 integration (#43)
- [ ] CrumbsUp proposal sync (#44)
- [ ] Voting governance model formalized (#45)
- [ ] Bounty escrow system (PR #39)
- [ ] On-chain proposal outcomes (PR #37)
- [ ] Multi-DAO badge federation (#32)
- [ ] Vote delegation (#33)
