# Best Practices Guide — Radix Guild Governance System

> **For the next owner/maintainer.** This document consolidates operational wisdom, codebase conventions, and decision frameworks so you can confidently run, extend, and hand over this system.

---

## Quick Reference

| Topic | Section | Key Doc |
|-------|---------|---------|
| Git workflow | [§1](#1-code--git-workflow) | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Running tests | [§2](#2-testing--quality) | `node scripts/pipeline-test.js` |
| Writing docs | [§3](#3-documentation-maintenance) | [docs/](.) folder |
| Deploying | [§4](#4-deployment--operations) | [INFRASTRUCTURE.md](INFRASTRUCTURE.md) |
| Community comms | [§5](#5-community--collaboration) | [ONBOARDING.md](ONBOARDING.md) |
| Secrets/backups | [§6](#6-security--data) | [SECURITY-AUDIT.md](SECURITY-AUDIT.md) |
| Maintenance | [§7](#7-maintenance-windows) | [INFRASTRUCTURE.md](INFRASTRUCTURE.md) |
| Scaling | [§8](#8-performance--scaling) | [INFRASTRUCTURE.md](INFRASTRUCTURE.md) |
| Roadmap sprints | [§9](#9-roadmap-execution) | [HANDOVER.md](HANDOVER.md) |
| Long-term health | [§10](#10-long-term-sustainability) | this doc |

---

## 1. Code & Git Workflow

### Branch Naming

```
feature/<short-description>     # New functionality  e.g. feature/vote-delegation
fix/<short-description>         # Bug fixes          e.g. fix/dice-probability-weights
docs/<short-description>        # Documentation only e.g. docs/api-reference
test/<short-description>        # Tests only         e.g. test/bounty-validation
chore/<short-description>       # Tooling/config     e.g. chore/update-deps
```

> **Example from this repo:** The leaderboard and game-stats work was carried in `feature/leaderboard` and `feature/game-stats-dashboard`.

### Commit Message Standards

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add vote delegation to stewards (#33)
fix: correct dice probability weights to 60/30/10 (#46)
docs: add API reference with curl examples
test: add bounty validation unit tests
chore: bump grammy to 1.41.1
refactor: extract sanitize() into shared util
```

Rules:
- Lowercase after the colon
- Reference the issue number when one exists
- Keep the subject line under 72 characters
- Body (optional) explains *why*, not *what*

### PR Review Checklist

Before merging any PR, verify:

- [ ] Branch is up to date with `main` (`git rebase main` or `git merge main`)
- [ ] Pipeline tests pass: `node scripts/pipeline-test.js` (19 tests, all green)
- [ ] No secrets, addresses, or `.env` values committed (see `.gitignore`)
- [ ] Code follows existing style (CommonJS in `bot/`, TypeScript in `guild-app/`)
- [ ] SQLite queries are parameterized — no string concatenation in SQL
- [ ] All user inputs pass through `sanitize()` before manifests
- [ ] UI changes include before/after screenshot in PR description
- [ ] Relevant docs updated (API, INFRASTRUCTURE, ONBOARDING, etc.)
- [ ] Issue number referenced in PR title or description

### Handling Breaking Changes

A breaking change is anything that:
- Changes an existing API endpoint's response shape
- Removes or renames a bot command
- Requires a database migration
- Changes on-chain contract addresses

**Process:**
1. Label the PR `breaking-change`
2. Update `docs/INFRASTRUCTURE.md` with the new shape/behaviour
3. Add a migration note to the PR description
4. Deploy to a staging environment first
5. Announce in Telegram at least 24 hours before production deploy
6. Tag the commit with a version bump (`v1.x.0` → `v2.0.0`)

### Revert Procedure

```bash
# Identify the bad commit
git log --oneline -10

# Option A — revert (creates a new commit, preserves history)
git revert <commit-sha>
git push origin main

# Option B — emergency reset (destructive, only if nothing was deployed)
git reset --hard <last-good-sha>
git push --force-with-lease origin main

# Then restart services
pm2 restart all
pm2 logs guild-bot --lines 30  # verify clean startup
```

Always prefer Option A unless the commit introduced a secret or sensitive data.

---

## 2. Testing & Quality

### Test Matrix

| Test suite | Command | When to run |
|------------|---------|-------------|
| Pipeline (19 tests) | `node scripts/pipeline-test.js` | Before every PR merge |
| Bounty unit tests | `cd bot && node tests/bounty.test.js` | After changes to `bot/db.js` or bounty endpoints |
| Scrypto | `scrypto test` (in `badge-manager/`) | After any Scrypto change |
| Next.js lint | `cd guild-app && npm run lint` | After dashboard changes |

**Run locally before pushing.** CI catches issues too, but fast local feedback saves round-trips.

### CI vs Local

| Scenario | Run locally | Wait for CI |
|----------|-------------|-------------|
| Hot fix on `main` | ✅ Must run | ✅ Monitor |
| New feature PR | ✅ Before pushing | ✅ Required to merge |
| Docs-only PR | ❌ Skip | ✅ Will pass automatically |
| Dependency bump | ✅ Run tests | ✅ Required |

### Adding New Tests

**For bot endpoints** (`bot/tests/`):
```javascript
// Follow pattern in bot/tests/bounty.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('My Feature', () => {
  it('does the expected thing', () => {
    // Arrange
    // Act
    // Assert
    assert.strictEqual(actual, expected);
  });
});
```

**For pipeline tests** (`scripts/pipeline-test.js`):
- Add a new entry to the tests array following the existing `{ name, fn }` pattern
- Test against the live API; keep tests idempotent (read-only or clean up after themselves)

### Performance Benchmarks to Monitor

| Metric | Acceptable | Alert threshold |
|--------|-----------|-----------------|
| `/api/proposals` response | < 200 ms | > 500 ms |
| `/api/badge/:address` response | < 300 ms | > 1 s |
| `/api/leaderboard` response | < 400 ms | > 1 s |
| Dashboard cold load | < 2 s | > 5 s |
| PM2 memory (guild-bot) | < 150 MB | > 500 MB (auto-restart) |
| PM2 memory (guild-app) | < 200 MB | > 500 MB (auto-restart) |

```bash
# Quick response time check
time curl -s https://DOMAIN/api/stats > /dev/null
time curl -s https://DOMAIN/api/proposals > /dev/null
```

### Load Testing Strategy

The current stack (1 vCPU, ~$7/month VPS) handles ~200 concurrent users comfortably. If you hit scale:

1. **Identify the bottleneck first:** `pm2 monit` + `htop`
2. **SQLite read pressure?** Add indexes (see SECURITY-AUDIT.md — 5 indexes already in place); consider WAL mode (`PRAGMA journal_mode=WAL`)
3. **Gateway calls slow?** Add a Redis cache layer for `/api/badge/:address` (5-min TTL already in sessionStorage client-side)
4. **CPU saturation?** Upgrade VPS tier before rewriting anything
5. **10k+ concurrent users?** Migrate to PostgreSQL (migration scripts in `scripts/`)

### Security Checklist Before Deployment

- [ ] No `.env` values in any committed file
- [ ] `CORS_ORIGINS` set to production domain (not `*`)
- [ ] `API_HOST=127.0.0.1` (never `0.0.0.0`)
- [ ] All manifest params pass through `sanitize()` in `bot/services/api.js`
- [ ] Radix address inputs validated with `/^account_rdx1[a-z0-9]{40,60}$/`
- [ ] Rate limiting active (60 req/min per IP)
- [ ] Run `grep -r "process.env\." bot/ guild-app/src/` and confirm every referenced var is in `.env.example`

---

## 3. Documentation Maintenance

### Keep Docs in Sync

Every PR that changes behaviour **must** update the relevant doc. The rule is:

> If you change the code, update the doc in the same PR.

| Code change | Doc to update |
|-------------|---------------|
| New API endpoint | `docs/INFRASTRUCTURE.md` → API Endpoints table |
| New bot command | `docs/INFRASTRUCTURE.md` → TG Bot Commands table, `docs/ONBOARDING.md` → All Bot Commands |
| New env var | `docs/HANDOVER.md` → Environment Variables, `bot/.env.example` or `guild-app/.env.local.example` |
| New dashboard page | `docs/INFRASTRUCTURE.md` → Dashboard Pages table |
| New on-chain component | `docs/INFRASTRUCTURE.md` → Radix Mainnet Addresses |
| Architecture change | `docs/INFRASTRUCTURE.md`, `docs/INCEPTION.md` if foundational |
| New badge tier/schema | `docs/ROLES-AND-BADGES.md`, `docs/BADGE-SCHEMAS.md` |

### Documentation PR Checklist

- [ ] All tables in touched docs have the new row/column
- [ ] Code examples (curl, bash) reflect the actual current behaviour
- [ ] Links within docs still resolve (`[HANDOVER.md](HANDOVER.md)`)
- [ ] New doc added to Quick Reference table at top of `BEST-PRACTICES.md`

### docs/ Folder Organisation

```
docs/
├── BEST-PRACTICES.md       ← You are here
├── INFRASTRUCTURE.md       ← Architecture, services, addresses, ops commands
├── HANDOVER.md             ← Transfer procedure (credentials, wallets, VPS)
├── HANDOVER-COMPLETE.md    ← Transition checklist for current handover
├── ONBOARDING.md           ← User-facing: join, register, vote, earn XP
├── SECURITY-AUDIT.md       ← Vulnerability history + current posture
├── ROLES-AND-BADGES.md     ← Tier definitions, XP thresholds
├── BADGE-SCHEMAS.md        ← NFT metadata schemas per tier
├── CHARTER-PROPOSALS.md    ← Governance charter text
├── INCEPTION.md            ← Why this was built, original vision
├── BETA-CHECKLIST.md       ← Pre-launch verification list
├── MVD-SETUP.md            ← Minimum viable deployment setup
├── LAUNCH-POST.md          ← Public announcement draft
├── TG-ANNOUNCEMENT.md      ← Telegram-specific announcement
├── TG-WALLET-RESEARCH.md   ← Research notes on TG wallet integration
├── TESTER-INVITE.md        ← Beta tester recruitment message
└── archive/                ← Superseded docs (keep for context, do not delete)
```

**Rule:** Move obsolete docs to `docs/archive/` rather than deleting them. History is valuable.

### Versioning Strategy

- Docs are versioned with the code via Git — no separate versioning needed
- For major releases (v2, v3), tag the commit: `git tag -a v2.0.0 -m "Phase 2 complete"`
- Add a `## Changelog` section to `INFRASTRUCTURE.md` for significant changes

---

## 4. Deployment & Operations

### Pre-Deployment Sanity Checks

```bash
# 1. Run pipeline tests against current production
node scripts/pipeline-test.js

# 2. Confirm no uncommitted changes on the server
ssh -p 2222 guild@VPS_IP "cd /opt/guild/bot && git status"

# 3. Check PM2 health
ssh -p 2222 guild@VPS_IP "pm2 list"

# 4. Check disk space (SQLite grows; keep > 20% free)
ssh -p 2222 guild@VPS_IP "df -h /opt/guild"

# 5. Check recent error logs
ssh -p 2222 guild@VPS_IP "pm2 logs guild-bot --lines 20 --nostream"
```

### Staged Rollout

```
Local dev → staging (VPS branch deploy) → production (main branch)
```

| Stage | How | Gate |
|-------|-----|------|
| **dev** | `npm run dev` locally | Feature works end-to-end |
| **staging** | `./scripts/deploy.sh bot` targeting a `dev` branch on VPS | Pipeline tests pass |
| **prod** | `./scripts/deploy.sh all` from `main` | Manual smoke test + no errors in logs for 5 min |

For the current single-VPS setup, "staging" means deploying the branch to the same VPS but verifying before merging to `main`. When traffic grows, add a second VPS for true staging isolation.

### Deploy Steps

```bash
# From your local machine
git checkout main
git pull origin main
./scripts/deploy.sh all

# On the VPS (if SSH access needed)
ssh -p 2222 guild@VPS_IP
cd /opt/guild
./deploy.sh all        # or: pm2 restart all
pm2 logs --lines 20    # watch for startup errors
```

### Health Monitoring and Alerting

**Available now (manual):**
```bash
pm2 monit              # Live CPU/memory per process
pm2 logs guild-bot     # Stream logs
curl https://DOMAIN/api/stats  # API alive check
```

**Recommended additions (Phase 4):**
- UptimeRobot free tier — ping `https://DOMAIN/api/stats` every 5 min, email/TG alert on failure
- `pm2 save` + `pm2 startup` — ensure auto-restart after VPS reboot
- Cron health check script (see `docs/INCIDENTS.md` for `healthcheck.sh`)

### Incident Response Workflow

See `docs/INCIDENTS.md` for the full playbook. Quick summary:

```
1. Detect  → pm2 logs / UptimeRobot alert / community report
2. Triage  → Is it bot, dashboard, or VPS?
3. Contain → pm2 restart <service> or revert last deploy
4. Communicate → Post status in TG group within 15 min
5. Resolve → Fix root cause, redeploy
6. Post-mortem → Add entry to INCIDENTS.md within 24 hours
```

### Post-Deployment Verification

```bash
# 1. Services are running
pm2 list  # Both guild-bot and guild-app should show "online"

# 2. API responds
curl https://DOMAIN/api/stats
curl https://DOMAIN/api/proposals?status=active

# 3. Dashboard loads
# Open https://DOMAIN/guild in browser — badge card should render

# 4. Bot responds
# Send /stats to @rad_gov in TG — should reply with numbers

# 5. Run full pipeline
node scripts/pipeline-test.js  # All 19 tests green
```

### Rollback Decision Tree

```
Deploy went wrong?
│
├── Is production completely down?
│   ├── YES → Immediate rollback (Option A or B below)
│   └── NO  → Can you fix forward in < 30 min?
│               ├── YES → Fix forward, monitor
│               └── NO  → Rollback
│
Option A — Code rollback (most common):
  git revert HEAD && git push
  ./scripts/deploy.sh all
  pm2 logs --lines 30  # verify clean

Option B — PM2 rollback (config/env issue):
  pm2 stop all
  # Fix .env on VPS manually
  pm2 start /opt/guild/ecosystem.config.js

Option C — Database rollback (migration went wrong):
  pm2 stop guild-bot
  cp /opt/guild/backups/guild.db.YYYYMMDD /opt/guild/bot/guild.db
  pm2 start guild-bot
  # Re-run migration more carefully
```

---

## 5. Community & Collaboration

### Handling Community Issues and PRs

**Issues:**
- Label within 24 hours: `bug`, `enhancement`, `community-proposal`, `good-first-issue`, `help-wanted`
- Issues labeled `community-proposal` require a governance vote (use `/propose` in TG) before work begins
- If an issue duplicates another, close with a link and a friendly note

**PRs from community contributors:**
- Acknowledge within 48 hours even if full review takes longer
- Run `node scripts/pipeline-test.js` on the branch before approving
- Request changes via GitHub review (not TG DMs) so discussion is public
- Merge with squash for small PRs, merge commit for feature PRs with history worth keeping

### Communication Channels

| Channel | Purpose | Response time |
|---------|---------|---------------|
| **Telegram** (`@rad_gov`) | Day-to-day governance, votes, community chat | Same day |
| **GitHub Issues** | Bugs, feature requests, formal proposals | 48 hours |
| **RadixTalk** | Long-form discussion, ecosystem updates | Best effort |
| **Discord** | If/when a Guild Discord is created | TBD |

**Rule:** Technical decisions happen in GitHub. Community sentiment and informal discussion happen in TG. Anything that affects the protocol goes to a governance vote.

### Release Notes & Announcements

For every merged feature:
1. Update `INFRASTRUCTURE.md` if the public API or architecture changed
2. Write a 2–3 sentence TG announcement (see `docs/TG-ANNOUNCEMENT.md` for tone/format)
3. For significant releases, post on RadixTalk with a full changelog

For major versions (v2, v3, ...):
1. Tag the release on GitHub with full release notes
2. Post the `docs/LAUNCH-POST.md` template (customised) on RadixTalk + TG
3. Record a short demo video (see issue #36)

### When to Escalate to Community Vote

Use `/propose` in the governance TG group for:
- Adding or removing features that affect all badge holders
- Spending from a community treasury (if/when one exists)
- Changing the governance model itself (voting weights, quorum)
- Adding a new external integration (CrumbsUp, Consultation v2)
- Any decision that would affect more than one person's XP or tier

Do **not** require a vote for:
- Bug fixes
- Documentation updates
- Internal refactors with no user-facing changes
- Security patches (ship immediately, announce after)

### Onboarding New Contributors

1. Point them to `CONTRIBUTING.md` for setup + code style
2. Point them to `docs/ONBOARDING.md` for the community side (badge, TG, proposals)
3. Assign a `good-first-issue` if available
4. Award XP via admin panel after a merged contribution (Builder tier+)
5. Add them to the TG group if they want to be more involved

---

## 6. Security & Data

### Database Backup Procedures

```bash
# Manual backup (run before any risky migration)
ssh -p 2222 guild@VPS_IP
cp /opt/guild/bot/guild.db /opt/guild/backups/guild.db.$(date +%Y%m%d-%H%M%S)

# Verify automated backups are running
ls -lh /opt/guild/backups/        # Should see files dated last 7 days
crontab -l | grep backup          # Should show 3am UTC cron job
```

**Automated backup schedule:** Daily at 03:00 UTC, 7-day retention (configured by `scripts/setup-vps.sh`).

**What is backed up:** `guild.db` (all proposals, votes, XP, user registrations) + `.env` files.

**Off-site backup:** Manually copy backups to a second location (local machine, S3, etc.) at least weekly, especially before major migrations. The VPS is single-node — losing it loses everything if backups aren't off-site.

### Secrets Management

| Secret | Location | Never commit to |
|--------|----------|-----------------|
| `TG_BOT_TOKEN` | `bot/.env` | Git (guarded by `.gitignore`) |
| `ADMIN_API_KEY` | `bot/.env` | Git |
| `CRUMBSUP_API_KEY` | `bot/.env` | Git |
| `CRUMBSUP_WEBHOOK_SECRET` | `bot/.env` | Git |
| Radix wallet mnemonic | Radix Wallet app only | Anywhere digital |

**Rules:**
- `.env` files are in `.gitignore` — verify with `git status` before every commit
- Use `.env.example` with placeholder values for documentation
- Never paste secrets into GitHub issues, PRs, or TG messages

### API Key Rotation

Rotate keys when:
- A contributor leaves who had access
- A key was accidentally exposed (logs, error message, PR description)
- Routine rotation (every 6–12 months recommended)

**Process:**
1. Generate the new key in the provider's dashboard (BotFather, CrumbsUp, etc.)
2. Update `/opt/guild/bot/.env` on the VPS
3. `pm2 restart guild-bot`
4. Verify the bot responds to `/stats` in TG
5. Revoke the old key in the provider's dashboard

For the TG bot token: use BotFather → `/mybots` → `API Token` → `Revoke current token`.

### Monitoring for Suspicious Activity

```bash
# Unusual API traffic
pm2 logs guild-bot --lines 100 | grep "429\|Too Many"

# Failed auth attempts
pm2 logs guild-bot --lines 100 | grep "401\|403\|Invalid"

# Unexpected database writes (proposals created at unusual hours)
sqlite3 /opt/guild/bot/guild.db \
  "SELECT created_at, proposer_id, title FROM proposals ORDER BY id DESC LIMIT 20;"

# SSH login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20
sudo fail2ban-client status sshd   # See banned IPs
```

Alert triggers to watch for:
- More than 5 proposals created in 1 hour by one user (possible spam)
- API 4xx rate > 10% of requests
- PM2 process restarting more than twice per hour

### Data Retention Policies

| Data | Retention | Notes |
|------|-----------|-------|
| Proposals | Forever | Governance history is valuable |
| Votes | Forever | Audit trail |
| XP transactions | Forever | Badge tier depends on cumulative XP |
| User registrations | Until user requests deletion | GDPR consideration |
| Backups | 7 days on VPS | Copy off-site for longer retention |
| PM2 logs | 7 days (PM2 default) | Adjust with `pm2 set pm2:max-logs 100MB` |

### PII Handling

The system stores:
- **Telegram user ID** (numeric) — not name or username
- **Radix wallet address** — pseudonymous, public on-chain
- **XP and tier history** — governance activity, not personal data

**No email, no real names, no location data** is stored.

If a user requests data deletion:
```bash
# Find their entries
sqlite3 /opt/guild/bot/guild.db \
  "SELECT * FROM users WHERE tg_id = <their_tg_id>;"

# Delete user record (votes and proposals reference tg_id but are kept for governance integrity)
sqlite3 /opt/guild/bot/guild.db \
  "DELETE FROM users WHERE tg_id = <their_tg_id>;"
```

Consider anonymising rather than deleting proposals/votes to preserve governance record integrity.

---

## 7. Maintenance Windows

### Scheduling Maintenance

**Low-traffic window:** 02:00–05:00 UTC (lowest active users in EU/US/Asia overlap).

For planned maintenance:
1. Announce in TG group at least 24 hours before: *"The Guild bot and dashboard will be offline for ~15 minutes at 03:00 UTC tomorrow for maintenance."*
2. Set a GitHub issue to track the maintenance task
3. Do the work in the window
4. Post a follow-up message when service is restored

For emergency maintenance (security patch, data corruption): ship immediately, announce simultaneously.

### Communication Before/During/After

| Phase | Channel | Message |
|-------|---------|---------|
| **24h before** | TG group | Scheduled downtime notice + what's changing |
| **Start** | TG group | "Maintenance starting now, back in ~N min" |
| **During** | GitHub Issue | Status updates if it runs long |
| **After** | TG group | "Back online ✅ — [brief what changed]" |

### Running Health Checks

```bash
# Full health check (run after any restart)
pm2 list                          # Both processes "online"
curl -s https://DOMAIN/api/stats  # Returns JSON with counts
curl -s https://DOMAIN/api/proposals?status=active  # Returns array
node scripts/pipeline-test.js     # All 19 tests green
```

See `docs/INCIDENTS.md` for `healthcheck.sh` — a script that runs these automatically.

### Data Migration Procedures

Before any migration:
1. Manual backup: `cp guild.db guild.db.pre-migration-$(date +%Y%m%d)`
2. Test migration on a copy: `cp guild.db /tmp/guild.db.test && sqlite3 /tmp/guild.db.test < migration.sql`
3. Verify the test result with a query
4. Apply to production during maintenance window
5. Run pipeline tests immediately after

**Schema change pattern:**
```sql
-- Always additive first (add nullable column, backfill, then add NOT NULL constraint later)
ALTER TABLE proposals ADD COLUMN phase INTEGER DEFAULT 0;
UPDATE proposals SET phase = 2 WHERE created_at > '2026-01-01';
-- Later, after confirming all rows populated:
-- (SQLite doesn't support ALTER COLUMN, so recreate table if NOT NULL needed)
```

### Version Upgrades

**Node.js:** The VPS runs Node v22. Upgrade only when a dependency requires it. Test locally first (`nvm use <version>`), then upgrade on VPS.

**Next.js:** Check [Next.js upgrade guide](https://nextjs.org/docs/upgrading) for breaking changes. Run `npm run build` locally before deploying.

**Grammy (Telegram framework):** Check changelog for breaking changes to `ctx` API.

**Scrypto:** Scrypto version upgrades require recompiling and redeploying the blueprint. See `REDEPLOY-V3.md` in `scripts/` for the full procedure — this is a significant operation.

---

## 8. Performance & Scaling

### Monitoring Metrics to Track

```bash
# Process health
pm2 monit   # Real-time CPU + memory

# API latency (spot check)
for ep in /api/stats /api/proposals /api/leaderboard; do
  echo -n "$ep: "; time curl -s "https://DOMAIN$ep" > /dev/null
done

# Database size
ls -lh /opt/guild/bot/guild.db

# Disk usage
df -h /opt/guild
```

**Key numbers to know:**
- `guild.db` typically stays under 10 MB for thousands of proposals/votes
- PM2 memory for `guild-bot` should stay under 150 MB at idle
- Caddy handles TLS termination efficiently — it is rarely the bottleneck

### Scaling Indicators (When to Optimise)

| Signal | Action |
|--------|--------|
| API response > 500 ms consistently | Add DB indexes or query caching |
| `guild-bot` memory > 300 MB | Check for memory leaks; restart as interim fix |
| Disk > 80% full | Clean old PM2 logs; offload backups |
| CPU > 70% sustained | Profile: is it Caddy, bot, or app? Upgrade VPS tier |
| > 50 concurrent TG users voting | Consider read replica or caching for `/api/proposals` |
| SQLite lock errors in logs | Switch to WAL mode; if persistent, migrate to PostgreSQL |

### Caching Strategy

**Current (in place):**
- Client-side: `sessionStorage` 5-min cache for badge data in the dashboard
- HTTP cache headers: consider adding `Cache-Control: public, max-age=60` to read-only endpoints like `/api/leaderboard`

**Next level:**
- Server-side: in-memory cache (e.g., `node-cache` or a `Map` with TTL) for `/api/proposals` (changes infrequently)
- Redis: only if you reach multi-instance deployments

**Never cache:**
- `/api/badge/:address/verify` (must be real-time for access control)
- `/api/xp-queue` (admin tool)
- Any endpoint that writes data

### Database Query Optimisation

Current indexes (from SECURITY-AUDIT.md): 5 indexes on hot columns. To verify:

```sql
-- Check existing indexes
sqlite3 /opt/guild/bot/guild.db ".indexes"

-- Slow query? Use EXPLAIN QUERY PLAN
EXPLAIN QUERY PLAN SELECT * FROM proposals WHERE status = 'active' ORDER BY created_at DESC;
```

Common patterns for new queries:
- Filter by `status` and `created_at` → ensure composite index: `CREATE INDEX IF NOT EXISTS idx_proposals_status_created ON proposals(status, created_at)`
- Join `votes` to `proposals` → index `votes.proposal_id`
- Leaderboard queries on XP → index `users.xp DESC`

### Load Balancing Approach

Current stack is single-node. When scaling:

1. **Vertical first:** Upgrade VPS (cheapest, no code changes)
2. **Read replica:** PostgreSQL with read replica for dashboard queries (bot writes, dashboard reads)
3. **Horizontal (if needed):** Two bot instances behind Caddy (requires externalising session state from SQLite)
4. **CDN for dashboard:** Vercel/Cloudflare for the Next.js app (static assets + ISR)

For the governance use case, vertical scaling to a $20–30/month VPS handles thousands of active users.

---

## 9. Roadmap Execution

### Breaking Phases into Sprints

The community roadmap (see `docs/HANDOVER.md`) is organised into phases. Convert each phase into 2-week sprints:

```
Sprint planning:
1. Pick 2–4 issues from the current phase (total effort ≤ 20h)
2. Create a sprint GitHub milestone (e.g., "Phase 2 Sprint 1")
3. Assign issues to the milestone
4. At sprint end: close completed issues, move incomplete to next sprint
```

**Effort sizing:**
- **S** (< 4h): single endpoint, doc update, small UI tweak
- **M** (4–12h): new page, new bot command, integration
- **L** (12–24h): new Scrypto component, major refactor, new service

### Velocity Tracking

Keep a running note (in a GitHub milestone description) of:
- Issues completed this sprint
- Issues spilled to next sprint
- Blockers encountered

After 3 sprints, you'll have a baseline velocity. Use it to promise realistic timelines to the community.

### Risk Assessment for Phase 2 & 4

**Phase 2 (DAO on-chain):**

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Scrypto version incompatibility | Medium | Test on Radix Simulator before mainnet |
| CrumbsUp API changes | Low | Pin API version; use webhooks not polling |
| Consultation v2 parked/changed | High | Build read-only adapter; don't depend on write API |
| On-chain TX costs spike | Low | Use batch recording (see `scripts/outcome-batch-recorder.js`) |

**Phase 4 (Scaling/Federation):**

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Multi-DAO factory complexity | High | Build single DAO first; generalise in v2 |
| Vote delegation abuse | Medium | Delegate cap per steward; time-lock delegation |
| PostgreSQL migration data loss | Low | Full backup before migration; dry-run on clone |
| Community fragmentation across DAOs | Medium | Shared badge standard; cross-DAO XP visibility |

### Community Feedback Loop

1. **Monthly:** Post a summary in TG of what shipped and what's next
2. **Per feature:** After launch, watch TG for 48 hours for immediate feedback
3. **Per phase:** Open a GitHub Discussion (or `/poll` in TG) asking "What should we build next?"
4. **Quarterly:** Review open issues for community upvotes to reprioritise

### Dependency Management Between Issues

Some issues have hard dependencies:

```
#8 (DAO Manager) → depends on → #9 (Manager Registry)
#44 (CrumbsUp sync) → depends on → #43 (Consultation v2 integration)
#33 (Vote delegation) → depends on → Steward tier working correctly
#32 (Multi-DAO federation) → depends on → #8 + #9 complete
```

Visualise dependencies by adding `Depends on #X` to issue descriptions. Never start a dependent issue until the blocker is merged and deployed.

---

## 10. Long-term Sustainability

### Technical Debt Tracking

Track tech debt as GitHub issues labeled `tech-debt`. Current known items:

| Item | Priority | Notes |
|------|----------|-------|
| SQLite → PostgreSQL migration | Low (< 5k users) | Scripts ready in `scripts/` |
| Bot uses CommonJS, not ESM | Low | Grammy works fine; migrate with Node 22+ ESM support when convenient |
| No formal staging environment | Medium | Single VPS is limiting for testing migrations |
| PM2 logs not shipped off-box | Medium | Logs lost on VPS rebuild |
| No UptimeRobot / alerting | Medium | Blind to downtime unless users report it |

When a tech debt issue is blocking a feature or causing toil, resolve it first.

### Deprecation Policy

Before removing anything user-facing:
1. **Announce:** 30-day notice in TG and GitHub
2. **Deprecate:** Mark as deprecated in docs, log a warning in the bot for 2 weeks
3. **Remove:** After the notice period, remove in a minor version bump

Bot command deprecation example:
```javascript
// In bot/index.js
bot.command('oldcommand', async (ctx) => {
  await ctx.reply('⚠️ /oldcommand is deprecated. Use /newcommand instead. It will be removed on YYYY-MM-DD.');
  // still execute old behaviour for the notice period
});
```

### Backwards Compatibility Guidelines

- **API:** Never remove or rename a field in an existing endpoint response. Add new fields; deprecate old ones by documenting they will be removed in the next major version
- **Bot commands:** Never rename a command without a transition period (alias the old name)
- **Database schema:** Additive changes only (add columns, add tables); never drop columns in a patch release
- **On-chain (Scrypto):** Contracts are immutable once deployed. New functionality requires a new component version. Maintain the old address in `INFRASTRUCTURE.md` for reference

### Major Version Release Strategy

| Version bump | When | Process |
|-------------|------|---------|
| **Patch** (1.0.x) | Bug fix, doc update | Merge to main, redeploy |
| **Minor** (1.x.0) | New feature, backward-compatible | Merge to main, tag, TG announcement |
| **Major** (x.0.0) | Breaking change, new on-chain deployment | Community vote, migration guide, full announcement |

Tag releases:
```bash
git tag -a v1.2.0 -m "Phase 3 complete: leaderboard + game stats + full docs"
git push origin v1.2.0
```

### Sunset/Archival Procedures

If the project needs to wind down:

1. **Announce:** 90-day notice to the community
2. **Export:** Dump the full database to CSV and publish as a community archive
3. **Archive:** Set the GitHub repo to archived (read-only)
4. **On-chain:** The badges remain on-chain forever — document the contract addresses prominently so holders can prove membership
5. **Docs:** Move `docs/` content to a static GitHub Pages site for permanent reference
6. **Bot:** Set a final message on `/start` directing users to the archived docs

```bash
# Export all governance data before sunset
sqlite3 /opt/guild/bot/guild.db -csv "SELECT * FROM proposals;" > proposals-archive.csv
sqlite3 /opt/guild/bot/guild.db -csv "SELECT * FROM votes;" > votes-archive.csv
sqlite3 /opt/guild/bot/guild.db -csv "SELECT tg_id, wallet_address, xp, tier FROM users;" > members-archive.csv
```

---

## Checklists: Quick Reference

### ✅ Before Merging Any PR
- [ ] Pipeline tests green: `node scripts/pipeline-test.js`
- [ ] No secrets in diff: `git diff main | grep -i "token\|secret\|password\|key"`
- [ ] Relevant docs updated
- [ ] PR references issue number

### ✅ Before Deploying to Production
- [ ] Pre-deployment sanity checks complete (§4)
- [ ] Manual DB backup taken
- [ ] TG community notified (if user-facing change)
- [ ] Rollback plan identified

### ✅ After Deploying
- [ ] Post-deployment verification complete (§4)
- [ ] PM2 logs clean for 5 minutes
- [ ] TG announcement sent

### ✅ Monthly Maintenance
- [ ] Review open GitHub issues, label and triage
- [ ] Check backup integrity: `ls -lh /opt/guild/backups/`
- [ ] Review PM2 memory trends: `pm2 monit`
- [ ] Rotate API keys if approaching 6-month mark
- [ ] Post community update in TG

### ✅ New Contributor Onboarding
- [ ] Shared `CONTRIBUTING.md` link
- [ ] Shared `docs/ONBOARDING.md` link
- [ ] Assigned a `good-first-issue`
- [ ] Added to TG governance group
- [ ] Explained XP earning + badge tiers

---

*Last updated: 2026-04-05 — covers Phase 3 state (game system, leaderboard, full ops docs). Update this document with each major phase completion.*
