# 05 — Task Verification System

> Systems thinking — the UX is a side effect of solving the problem.

## The Problem

Who decides a task is complete? The person holding the admin badge is a single point of trust and a single point of failure. The guild operator (bigdev) is a temporary caretaker, not a permanent authority. The verification system must be:

1. **Neutral** — no single person is the arbiter
2. **Configurable** — the task creator defines what "done" looks like
3. **Verifiable** — completion can be checked by anyone, not just insiders
4. **Decentralisable** — starts simple, scales to multi-party consensus

## Admin Neutrality Statement

bigdev holds the admin badge and verifier role for testing and bootstrapping only. This is an interim arrangement documented in the Terms of Use. The goal is to transfer verification authority to:

1. The community (via charter vote on who verifies)
2. Automated systems (PR merged, test suite passed)
3. Multi-party consensus (multiple verifiers must agree)

The admin should never be the long-term verifier. The system must work without any single trusted party.

---

## MVP: PR Merged = Task Approved

The simplest verifiable completion signal: a GitHub pull request is merged into the target repository. This works because:

- **Deterministic** — merged or not, binary state
- **Auditable** — anyone can check the PR status
- **Third-party controlled** — the repo admin (which may not be bigdev) decides
- **Already standard** — every open source project uses this flow

### Flow

```
Task Creator                    Worker                    Repo Admin
─────────────                  ──────                    ──────────
Creates task with:
  reward: 200 XRD
  approval: "PR merged"
  repo: owner/repo
  criteria: "Fix issue #42"
                                Claims task
                                Does the work
                                Opens PR → owner/repo#15
                                /bounty submit <id> <pr_url>
                                                          Reviews PR
                                                          Merges (or rejects)
Bot detects PR merged ←────────────────────────────────── GitHub webhook / poll
Bot calls release_task on escrow
XRD released to worker automatically
```

### What the Bot Does

1. Worker submits: `/bounty submit <id> https://github.com/owner/repo/pull/15`
2. Bot stores the PR URL
3. Bot polls GitHub API (or receives webhook): `GET /repos/{owner}/{repo}/pulls/{number}`
4. When `merged: true` → bot calls `release_task` on the escrow component
5. XRD released to worker, receipt NFT updated

### What the Task Creator Specifies

When creating a task, the creator defines the **approval condition**:

```
/bounty create 200 Fix the mobile layout
  --approval pr_merged
  --repo bigdevxrd/radix-community-projects
  --criteria "Fixes #42, passes tests, no new warnings"
```

The approval condition is stored with the task. The bot enforces it.

---

## Approval Conditions (Configurable)

The creator picks one when creating the task:

| Condition | How It's Verified | Automation |
|-----------|------------------|------------|
| `pr_merged` | GitHub PR merged into target branch | Bot polls/webhook |
| `admin_approved` | Admin badge holder calls verify | Manual (current default) |
| `multi_verify` | N of M verifiers approve | Bot counts approvals |
| `test_passed` | CI pipeline passes on PR | GitHub Actions webhook |
| `deliverable_url` | URL exists and is accessible | Bot checks HTTP 200 |
| `custom` | Creator-defined criteria, manual sign-off | Manual |

### MVP ships with: `pr_merged` + `admin_approved`
### Phase 2 adds: `multi_verify` + `test_passed`
### Phase 3 adds: `custom` with dispute resolution

---

## Architecture: Multi-Layer Verification

```
Layer 1: Automated Signals
├── PR merged (GitHub API)
├── CI passed (GitHub Actions)
├── Deliverable URL accessible (HTTP check)
└── On-chain state change detected (Gateway)

Layer 2: Human Verification
├── Single verifier (admin badge) — current
├── Task creator approves
├── Working group lead approves
└── Multi-sig (2 of 3 verifiers agree)

Layer 3: Consensus (future)
├── Conviction-based approval (badge holders signal)
├── Cross-reference: multiple agents check independently
├── Dispute window (48h after submission, challenge period)
└── Arbitration (Gold-tier mediator)
```

The layers compose. A task might require:
- Layer 1: PR merged AND CI passed
- Layer 2: Working group lead approves
- Layer 3: No disputes within 48h

All three must be satisfied before escrow releases.

---

## Multi-Agent Cross-Reference (Phase 3)

For high-value tasks, multiple independent agents verify:

```
Agent 1 (Automated)     Agent 2 (Human)        Agent 3 (Community)
──────────────────     ─────────────────      ──────────────────
Checks PR is merged    Working group lead     3 badge holders
Checks CI passed       reviews deliverable    signal approval
Checks code quality    confirms criteria met  via conviction stake
        │                      │                       │
        └──────────────────────┼───────────────────────┘
                               │
                    All 3 agree? → release_task
                    Disagreement? → dispute → arbitration
```

This is the end-state. The MVP starts with Layer 1 (PR merged) + Layer 2 (single verify fallback).

---

## On-Chain vs Off-Chain Verification

| Component | On-Chain | Off-Chain |
|-----------|----------|-----------|
| Task creation | Escrow component (XRD locked) | SQLite (metadata) |
| Task claiming | Escrow component (badge proof) | SQLite (tracking) |
| Work submission | — | SQLite (PR URL stored) |
| PR merge check | — | Bot polls GitHub API |
| Verification signal | — | Bot decides based on conditions |
| Fund release | Escrow component (verifier calls release_task) | — |

The escrow component is the settlement layer. Everything else is the verification layer. The bot is the bridge — it reads off-chain signals and triggers on-chain settlement.

---

## Implementation Plan

### MVP (this week)

1. **Add `approval_type` to bounties table**
   - `ALTER TABLE bounties ADD COLUMN approval_type TEXT DEFAULT 'admin_approved'`
   - `ALTER TABLE bounties ADD COLUMN approval_repo TEXT`
   - `ALTER TABLE bounties ADD COLUMN approval_pr TEXT`
   - `ALTER TABLE bounties ADD COLUMN approval_criteria TEXT`

2. **Update `/bounty create` to accept approval type**
   - Default: `admin_approved` (current behavior)
   - Optional: `--approval pr_merged --repo owner/repo`

3. **Add GitHub PR polling**
   - New service: `bot/services/github.js`
   - `checkPRStatus(owner, repo, prNumber)` → calls GitHub API
   - Returns: `{ merged, mergeable, state, title }`

4. **Update `/bounty submit` to store PR URL**
   - Parse GitHub PR URL: `https://github.com/{owner}/{repo}/pull/{number}`
   - Store in `approval_pr` column

5. **Add PR merge watcher**
   - Background poll every 5 minutes
   - For each submitted bounty with `approval_type = 'pr_merged'`:
     - Check PR status via GitHub API
     - If merged → auto-call `release_task` on escrow
     - Log the auto-release with full audit trail

6. **Dashboard: show approval condition on task detail**
   - "Approval: PR merged in owner/repo"
   - "Approval: Admin verified"
   - Link to the PR for transparency

### Phase 2 (next month)

7. **Multi-verify**: N of M verifiers (Gold-tier badge holders)
8. **GitHub webhook** instead of polling (lower latency)
9. **CI integration**: `test_passed` condition checks GitHub Actions status
10. **Creator-specified criteria**: free-text acceptance criteria displayed to worker

### Phase 3 (later)

11. **Conviction-based approval**: badge holders stake to signal
12. **Dispute window**: 48h challenge period after submission
13. **Arbitration**: Gold-tier mediator resolves disputes
14. **Cross-agent verification**: multiple independent checkers

---

## The Principle

The task creator defines what "done" means. The system verifies it. No single person decides. The escrow releases when the conditions are met. The UX is just a window into this process.

```
Creator defines conditions → Worker delivers → System verifies → Escrow releases
```

The admin is infrastructure, not authority. The system is the authority.
