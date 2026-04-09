# Guild — Next Steps & Hardening Plan
> Updated: 2026-04-09 | Phase 3: Beta + Community

## Status: Fully Operational
14 pages, 70 tests, 32 API endpoints, 28+ bot commands, on-chain badges, CV2 voting, task marketplace. Deployed at radixguild.com.

---

## Priority 1: Critical Fixes (Do First)

### 1.1 Guild Bot API + Dashboard down on Kuma
- Guild Kuma showing red for Bot API (3003) and Dashboard (3002)
- Check: `ssh guild-vps` → `pm2 status` → `pm2 restart all`
- Root cause: may need `npm run build` before restart for dashboard

### 1.2 P1-P6 Charter Votes Expired
- 6 charter votes expired ~Apr 8 with low participation
- Decision needed: re-propose with lower thresholds, or archive and move on
- Check: `GET /api/charter` for current state

### 1.3 Escrow Funding
- 17 bounties exist but none funded (all show "unfunded")
- Need: 50-100 XRD deposited to escrow contract
- Script needed: fund-escrow.js (or manual via Radix Wallet)
- **RULE: NEVER show tasks as claimable without funded escrow**

---

## Priority 2: Hardening (Stability + Trust)

### 2.1 Error Monitoring
- Add error logging to bot — currently errors are silent in TG
- Add `/health` endpoint to bot API with: uptime, DB status, CV2 sync status, last error
- Wire Kuma alerts to Telegram (notifications in Kuma settings)

### 2.2 Database Backup
- Daily backup cron exists in setup-vps.sh (3am, 7-day retention)
- Verify: `ssh guild-vps` → `ls -la /opt/rad-dao/backups/`
- If no backups: `crontab -e` and add the backup job

### 2.3 Rate Limiting Hardening
- Bot: 60 req/min default, 10/min for POST — check if sufficient
- API: rate limiter is in place — verify it's not being bypassed
- Add: IP-based blocking for repeated violations

### 2.4 Content Moderation
- Word filter exists but no admin review queue
- Add: `/adminfeedback` shows flagged content for review
- Add: auto-ban after 3 moderation flags

### 2.5 CV2 Sync Resilience
- 5-minute poll to Radix Gateway — what happens if Gateway is down?
- Add: retry with exponential backoff
- Add: alert if sync fails 3 times in a row

---

## Priority 3: Community Launch (Get Users)

### 3.1 Outreach (Manual — bigdev does this)
- [ ] Post TESTER-INVITE.md to Radix Telegram groups
- [ ] Post on RadixTalk forum (forum.radixdlt.com)
- [ ] Post in Discord #developers channel
- [ ] DM 10-20 Radix OGs personally
- [ ] Share radixguild.com link in project showcase threads

### 3.2 Onboarding Flow
- UserJourneyWidget exists (6-stage walkthrough)
- Test: first-time visitor flow — is it clear what to do?
- Add: "Getting Started" prominent CTA on homepage
- Add: video walkthrough (#36 — demo video)

### 3.3 First Real Task
- Create 1 funded bounty (50 XRD) as proof of concept
- Something achievable: "Write a guide for new members" or "Design a banner"
- This proves the escrow → claim → verify → payout cycle works

---

## Priority 4: Feature Completion (Phase 3 Goals)

### 4.1 Phase 3 Success Metrics
- [ ] 20+ badges minted
- [ ] 50+ votes cast
- [ ] 3+ community proposals
- [ ] Zero critical bugs for 7 days
- [ ] First completed bounty (paid out via escrow)

### 4.2 Open GitHub Issues (8)
| # | Issue | Priority | Effort |
|---|-------|----------|--------|
| 72 | Content moderation admin controls | Medium | S |
| 69 | Charter wizard (guided P1-P6 voting) | Medium | M |
| 58 | CV2 self-host | Low | L |
| 44 | CrumbsUp integration | Low | M |
| 36 | Demo video | High | S |
| 34 | On-chain outcomes | Medium | M |
| 33 | Delegation | Low | L |
| 32 | Federation | Low | L |

### 4.3 Quick Wins
- [ ] Set DISCORD_WEBHOOK_URL on VPS (enables Discord notifications)
- [ ] Claim accrued badge royalties (need claim-royalties.js script)
- [ ] Add badge count to homepage stats
- [ ] Add "Last active" timestamp to profile

---

## Priority 5: SaaS Preparation (Phase 4 Preview)

### What Makes This a SaaS Product
The guild infrastructure is generic — any DAO can use it:
- Configurable badge schemas (not hardcoded to Radix Guild)
- BadgeFactory creates new managers permissionlessly
- Bot commands are parameterized
- Dashboard reads from config, not hardcoded addresses

### SaaS Config Layer (Phase 4, May)
- Separate config from code: one codebase, many DAOs
- Customer onboarding: deploy BadgeManager → configure bot → launch dashboard
- Revenue: $10/mo membership + 2.5% task fee + 1% AI fee

---

## Deploy Checklist (For Any Change)

```bash
# 1. Test locally
cd guild-app && npm run dev
cd bot && node index.js

# 2. Run pipeline tests
node scripts/pipeline-test.js

# 3. Deploy
./scripts/deploy.sh all

# 4. CRITICAL: Build dashboard before restart
ssh guild-vps
cd /opt/rad-dao/dashboard && npm run build
pm2 restart all

# 5. Verify
curl https://radixguild.com
curl https://radixguild.com/api/proposals
```

---

## Architecture Reference

```
Guild VPS (72.62.195.141)
├── guild-bot (PM2, port 3003)
│   ├── index.js — Grammy TG bot (28+ commands)
│   ├── db.js — SQLite
│   └── services/ — api, cv2, xp, gateway, faq, content-filter
├── guild-app (PM2, port 3002)
│   └── Next.js dashboard (14 pages)
├── Caddy — reverse proxy + TLS
│   ├── radixguild.com → localhost:3002
│   └── /api/* → localhost:3003
└── Uptime Kuma (Docker, port 3100)
    └── guild-status.72-62-195-141.sslip.io
```

On-chain:
- Badge Manager: `component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva`
- Badge NFT: `resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl`
- CV2 Governance: `component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2`
