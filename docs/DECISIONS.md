# DECISIONS.md — Architecture Decisions

Key design decisions made during the build of Radix Community Governance, with rationale and trade-offs. Read this before proposing significant changes.

---

## Decision 1: SQLite, not PostgreSQL

**Choice:** `better-sqlite3` with WAL mode.

**Why:**
- The expected scale is hundreds to low thousands of users — well within SQLite's capability
- Zero infrastructure: no database server to provision, monitor, or secure
- Backup is a single file copy
- `better-sqlite3` is synchronous, which simplifies bot code dramatically (no `await` chains for every query)
- WAL mode provides concurrent reads with safe writes, sufficient for the read-heavy dashboard

**Trade-offs:**
- No horizontal scaling — only one writer at a time (not an issue at current scale)
- No native replication — backups must be managed manually
- If the team grows to 10k+ active users or needs multi-region, migrate to PostgreSQL

**When to reconsider:** When DB file exceeds ~500MB or when write throughput causes visible `SQLITE_BUSY` errors in production logs.

---

## Decision 2: Off-chain voting + on-chain badges

**Choice:** Votes are stored in SQLite. Badges (membership proof) are on-chain NFTs.

**Why:**
- On-chain voting requires XRD for every vote — friction kills participation
- The Radix community is small enough that a trusted operator (the bot) recording votes off-chain is acceptable
- Badges give verifiable, wallet-held proof of membership without gas for voting
- This matches how most real DAOs work in practice: forum/Discord signals, not on-chain votes for every decision
- The charter explicitly acknowledges this as a transitional approach

**Trade-offs:**
- Votes are only as trustworthy as the bot operator — this is a trust assumption
- No cryptographic proof of individual votes (only aggregate results)
- Can't use Radix's native Consultation Blueprint until it matures

**Path to fully on-chain:** When Radix Consultation v2 (or Muan Protocol) ships a production-ready voting module, migrate proposal creation and vote tallying there. The badge system is already on-chain and doesn't need to change.

---

## Decision 3: Telegram bot as primary UX

**Choice:** Telegram bot (`grammy`) as the primary interaction surface for governance.

**Why:**
- The community already lives in Telegram — zero onboarding friction
- Inline keyboard buttons give a frictionless voting UX (tap to vote, no wallet needed)
- Telegram notifications are reliable and immediate — no email/push setup
- Bot commands are faster to build and iterate than a full web UI
- The dashboard is supplementary (read-only for most users)

**Trade-offs:**
- Telegram dependency: if TG goes down or bans the bot, governance is unavailable
- No public proposal history without the dashboard
- Users without TG are excluded (edge case for this community)
- Telegram bot API rate limits can throttle notifications during high activity

**Mitigation:** The REST API (`/api/proposals`) provides a fallback read layer. The dashboard at `/proposals` shows all history without TG.

---

## Decision 4: XP as off-chain score, not on-chain token

**Choice:** XP is a number in the SQLite `badge_xp` field, not a token or on-chain variable.

**Why:**
- Token economics add complexity and regulatory risk
- The XP system is still experimental — keeping it off-chain allows rapid changes to reward logic
- On-chain XP updates require transaction fees and admin signing each time
- The badge NFT stores XP as metadata, updated in batches via `xp-batch-signer.js`

**Trade-offs:**
- XP is not trustlessly verifiable at any point in time
- Batch updates mean on-chain XP lags behind real-time
- If the batch signer fails, XP diverges between DB and chain

**When to reconsider:** If XP is used for financial decisions (staking, voting weight), it must be on-chain and auditable.

---

## Decision 5: Single-process bot + API

**Choice:** The Telegram bot and HTTP API run in the same Node.js process.

**Why:**
- Simpler deployment — one `pm2` entry, one process to monitor
- Shared in-memory state (XP queue, rate limiter) without IPC
- Easier debugging — one log stream

**Trade-offs:**
- A bot crash takes down the API, and vice versa
- Can't scale them independently
- An expensive API request can block the event loop and delay bot responses

**When to separate:** When API traffic or bot complexity justifies it. Splitting requires extracting `db.js` into a shared module and using a message queue or shared cache.

---

## Future Concerns

1. **Bot token security:** The `BOT_TOKEN` gives full control of the bot. Rotate it immediately if compromised.
2. **Admin address list:** `ADMIN_ADDRESSES` guards admin endpoints. Keep this list minimal and reviewed.
3. **Escrow custody:** XRD in the escrow wallet is held by whoever controls the private key. There's no smart contract enforcing release conditions — this is pure trust.
4. **Charter auto-resolution:** When a proposal closes with a `charter_param`, `resolveCharterParam()` runs automatically. Review this logic before adding high-stakes parameters.
5. **Single point of failure:** Everything runs on one VPS. Add monitoring and set up a second instance for failover before the community scales.
