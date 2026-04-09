Now I have a comprehensive picture. Here is the full agent orchestration plan.

---

## Agent Orchestration Plan for bigdev Projects

### Landscape Summary

There are four key repos and two runtimes:

- **bigdev-agents/** -- Centralized agent infrastructure with 4 agents (bert, scrypto, researcher, builder), 4 profiles (sats, guild, hyperscale, wallet-manager), and an OMX/OmO/Clawhip core extracted from agent-tools.
- **openclaw-bert/** -- Bert v3.2 running on Sats VPS (156.67.219.105) via PM2 as `sats-bert`. Uses OpenClaw gateway with Telegram channel to Dai. Has `run-tasks.sh` for cron-driven task execution and a `watchdog.sh` that runs every 5 minutes.
- **radix-community-projects/** -- The guild repo containing `bot/` (grammy Telegram bot with DB, gateway, cv2-bridge, discourse, consultation services) and `agent-tools/` (the original OMX/OmO/Clawhip toolkit).
- **auto-trader-xrd/** -- Sats trading engine with signal receiver, trade manager, Radix TX executor, circuit breaker, and strategy engine.

The existing execution model is: shell scripts do the deterministic work (cron, git pull, task parsing, git push), and the LLM is only called for judgment tasks. This is the right pattern and should be preserved across all agents.

---

### AGENT 1: Guild Bot Agent

**Where it runs:** Guild VPS (72.62.195.141) alongside the existing guild Telegram bot

**Current state:** The guild bot (`bot/index.js`) already has services for cv2-bridge, gateway, discourse, consultation, content-filter, faq-matcher, xp, and an API. The `agent-tools/` Clawhip module already has a GitHub webhook listener that routes issues and PRs. No automated agent daemon exists for the guild yet.

#### Task 1.1: Gateway Event Watcher (Escrow Events)

- **Trigger:** Cron every 2 minutes (poll) OR webhook from Radix Gateway stream subscription
- **Action:** Query Radix Gateway API for new transactions on the guild escrow component address. When a deposit or release event is detected, parse the receipt, extract the task ID and amount, and upsert a row in the guild DB.
- **Output:** DB record in the guild bot's SQLite database (the same `bot/db.js`). Telegram notification to the guild admin channel.
- **Error handling:** If the Gateway API is unreachable 3 times in a row, send a Telegram alert to Dai. Store the last-processed state epoch in OmO state so the poller can resume without gaps.
- **Resources:** Zero LLM cost. Pure shell/JS polling script. Uses `bot/services/gateway.js` which already exists.

#### Task 1.2: GitHub PR Watcher (Merged PR -> Release Escrow)

- **Trigger:** GitHub webhook (already supported by Clawhip `github.js` -- just add `pull_request.closed + merged` handling to `routeEvent`)
- **Action:** On PR merge to main, look up the associated task in the guild DB. If the task has funded escrow and the PR references a task ID (convention: `task-123` in PR body), mark the task as "completed" and queue an escrow release transaction.
- **Output:** DB status update. Escrow release TX manifest queued for Dai's approval (never auto-execute financial TXs). Telegram message to Dai with the TX manifest for review.
- **Error handling:** If no matching task is found, log and notify. If the PR body does not contain a task reference, skip silently. Human approval is required before any on-chain escrow release.
- **Resources:** Zero LLM cost for the matching. The Clawhip GitHub listener is already built and handles webhook signature verification.

#### Task 1.3: Charter Proposal Auto-Advance

- **Trigger:** Cron daily at 06:00 UTC
- **Action:** Query the guild DB for charter proposals in "pending-dependencies" status. For each, check if all dependency tasks are now "completed". If so, advance the proposal to "vote-ready" status.
- **Output:** DB status update. Telegram notification to relevant guild members.
- **Error handling:** If any dependency check fails (e.g., referenced task does not exist), flag the proposal as "broken-dependency" and notify.
- **Resources:** Zero LLM cost. Pure DB queries.

#### Task 1.4: Stale Task Cleanup

- **Trigger:** Cron weekly, Sunday 03:00 UTC
- **Action:** Query guild DB for tasks with status "open" and no funding for 30+ days. Move them to "archived" status. Also flag tasks that have been "in-progress" for 14+ days with no PR activity.
- **Output:** DB status updates. Summary Telegram message listing all archived tasks.
- **Error handling:** Dry-run mode by default -- list what would be archived and wait for Dai's `/approve-cleanup` command before actually changing status.
- **Resources:** Zero LLM cost.

#### Task 1.5: Trust Score Recalculation

- **Trigger:** Cron daily at 04:00 UTC
- **Action:** For each guild member, recalculate trust score based on: completed tasks (weighted by escrow amount), PR merge rate, proposal participation, time since last contribution. Write scores to the guild DB `members` table.
- **Output:** DB updates. Weekly summary posted to the guild Telegram channel (only on Mondays).
- **Error handling:** If the calculation encounters missing data, use the previous score and flag the member for review.
- **Resources:** Zero LLM cost. Deterministic formula.

#### Task 1.6: CV2 Sync Health Monitor

- **Trigger:** Cron every 10 minutes
- **Action:** Check if `bot/services/cv2-bridge.js` has successfully synced in the last 30 minutes. Check the cv2 endpoint health. Count consecutive failures.
- **Output:** On 3 consecutive failures: Telegram alert to Dai. On recovery: Telegram "all clear" message. State tracked in OmO state file.
- **Error handling:** After 3 failures, escalate. After 10 failures, mark the cv2 bridge as "degraded" in the bot's status endpoint.
- **Resources:** Zero LLM cost. Pure HTTP health check.

---

### AGENT 2: Bert Agent (Overnight Watchdog)

**Where it runs:** Sats VPS (156.67.219.105) as PM2 process `sats-bert`

**Current state:** Bert is already operational. Runs as an OpenClaw gateway with Telegram integration. Has a `run-tasks.sh` cron script that pulls from git, parses `tasks.json`, runs up to 3 pending tasks via `openclaw agent`, writes output, and pushes back to git. A separate `watchdog.sh` runs every 5 minutes for basic health checks. Bert has 4 sub-agents: main (Haiku orchestrator), scrypto (Sonnet), researcher (Haiku), builder (Sonnet). Budget: $1/day Anthropic, $1/day OpenRouter, $25/month total.

#### Task 2.1: Guild Health Monitor (New Capability)

- **Trigger:** Cron every 6 hours (aligned with Bert's existing heartbeat schedule in `openclaw.config.json` which already has `"every": "6h"` and `"activeHours": {"start": "21:00", "end": "09:00"}`)
- **Action:** SSH to guild VPS (72.62.195.141) and check: (a) guild bot PM2 process status, (b) cv2-bridge last-sync timestamp, (c) disk usage, (d) pending task count in guild DB. Compile a status line.
- **Output:** Append to `/opt/sats/.openclaw/workspace/output/guild-health-YYYYMMDD.md`. Send summary to Dai via Telegram. Format: one line per check, pass/fail.
- **Error handling:** If SSH to guild VPS fails, report that immediately via Telegram rather than silently failing. Use Bert's existing conflict resolution (retry -> replan -> decompose -> escalate).
- **Resources:** Uses `ollama/llama3.2:3b` for formatting the report (free, local). No API cost for the health check itself.

#### Task 2.2: GitHub Issue Creation from Community Feedback

- **Trigger:** Telegram command from Dai: `/issue <repo> <title>` or when Bert's researcher sub-agent identifies actionable feedback in guild Discourse posts (via `bot/services/discourse.js`)
- **Action:** Bert's researcher sub-agent reviews the feedback/request, drafts an issue body with: problem statement, reproduction steps if applicable, suggested labels. Then creates a GitHub issue via `gh` CLI or GitHub API.
- **Output:** GitHub issue URL sent back to Telegram. Issue number logged in Bert's task history.
- **Error handling:** Draft the issue body and show it to Dai in Telegram first. Only create the issue after Dai confirms with `/approve`. Never auto-create issues without human review.
- **Resources:** Researcher sub-agent uses Haiku ($0.001/1k tokens). Typical issue draft costs under $0.01.

#### Task 2.3: Overnight Backtest Runner (Existing, Extend)

- **Trigger:** Already in `run-tasks.sh` -- runs pending tasks from `tasks.json`
- **Action:** Keep the existing flow. Add a new task type `"action": "backtest"` that runs the strategy backtester against latest data and produces a performance report.
- **Output:** Written to `/opt/sats/.openclaw/workspace/output/backtest-YYYYMMDD.md`. Delivered to Dai via Telegram (first 40 lines per existing rules).
- **Error handling:** Existing: mark as `needs-review` or `blocked`. No change needed.
- **Resources:** Uses Bert's budget-constrained model chain.

#### Task 2.4: Cross-Project Status Roll-Up

- **Trigger:** Cron daily at 08:00 UTC (before Dai wakes up)
- **Action:** Compile a status report across all projects: (a) guild -- pending proposals, open tasks, trust score changes, (b) sats -- last 24h trade P&L, open positions, circuit breaker status, (c) hyperscale -- issue triage status, (d) any blocked Bert tasks.
- **Output:** Single Telegram message to Dai. One section per project, 3-4 bullet points each.
- **Error handling:** If any project's data is unavailable, report "data unavailable" for that section rather than failing the whole report.
- **Resources:** Uses local Ollama for formatting (free). Data collection is pure shell/SQL.

---

### AGENT 3: Sats/AutoFi Agent (Trading Engine Automation)

**Where it runs:** Sats VPS (156.67.219.105) alongside the existing `sats-receiver` PM2 process

**Current state:** The trading engine (`auto-trader-xrd/`) has: signal-receiver.js (TV webhook endpoint, port 18795), strategy-engine.js, circuit-breaker.js, tx-retry.js, executor.js (Radix TX submission), scaled-exit.js, yield-agent.js, and atr-stop.js. DB is at `/opt/sats/data/ma-trader.db`. Bert already has read-only access to this DB.

#### Task 3.1: Signal Monitor & Alert

- **Trigger:** Continuous (part of `sats-receiver` process) + cron every 5 minutes for gap detection
- **Action:** The signal receiver already handles TV webhooks. The new cron task checks: (a) time since last signal received -- if over 2 hours during active market hours, alert, (b) signal rejection rate in last hour -- if over 50%, alert, (c) duplicate signal detection.
- **Output:** Telegram alert to Dai via `src/ui/telegram.js`. DB log entry in the `signals` table.
- **Error handling:** If the receiver process is down (checked by the existing `watchdog.sh`), PM2 auto-restarts. If PM2 restart fails 3 times, Telegram alert escalation.
- **Resources:** Zero LLM cost. Pure SQL and process monitoring.

#### Task 3.2: Position Manager

- **Trigger:** Cron every 1 minute (the existing trade manager loop)
- **Action:** For each open position: (a) check if SL/TP has been hit based on latest price, (b) if using ATR stops (atr-stop.js), recalculate trailing stop, (c) if using scaled exits (scaled-exit.js), check if next exit level is reached. When exit conditions are met, close the paper trade and queue the Radix TX.
- **Output:** Trade close record in DB. Telegram notification with P&L. Radix TX manifest queued (for mainnet, requires Dai's approval).
- **Error handling:** Circuit breaker (`circuit-breaker.js`) already exists. If max drawdown is hit, halt all new trades and alert. TX retry logic (`tx-retry.js`) handles Radix submission failures with exponential backoff.
- **Resources:** Zero LLM cost for position management. The strategy engine is deterministic.

#### Task 3.3: Portfolio Rebalancer

- **Trigger:** Cron daily at 00:00 UTC or on-demand via Telegram command `/rebalance`
- **Action:** (a) Read current token balances from Radix Gateway, (b) compare to target allocation percentages from strategy config, (c) if any position deviates by more than the threshold (e.g., 5%), calculate the rebalance trades needed, (d) gene
