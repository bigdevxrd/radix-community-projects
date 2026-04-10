# Charter Proposals — Full Parameter Map

All governance parameters from the [Radix DAO Charter](https://radix.wiki/ideas/radix-network-dao-charter) that need community votes. Dependencies shown — a parameter can only be voted on once its dependencies are resolved.

Use `/charter` in the TG bot to see current status.

## Phase 1 — Foundation (6 votes, no dependencies)

These must pass first. They set the rules for everything else.

| Key | Title | Type | Options |
|-----|-------|------|---------|
| `charter.adoption` | Adopt the Radix DAO Charter | Yes/No | — |
| `rac.seats` | RAC seat count | Poll | 3 / 5 / 7 / 9 |
| `voting.quorum.standard` | Standard proposal quorum | Poll | 3 / 10 / 25 / 50 |
| `voting.period.standard` | Default voting period | Poll | 48h / 72h / 7 days |
| `voting.approval.standard` | Standard approval threshold | Poll | >50% / >60% / >66% |
| `voting.approval.amendment` | Amendment approval threshold | Poll | >60% / >66% / >75% |

## Phase 2 — Configuration (20 votes)

Unlocked after foundation votes resolve. Grouped by dependency.

### Depends on `rac.seats`
| Key | Title | Options |
|-----|-------|---------|
| `rac.multisig` | Multi-sig threshold | — |
| `rac.compensation` | Member compensation | — |
| `rac.meetings` | Meeting frequency | Weekly / Biweekly / Monthly |
| `rac.inactivity` | Inactivity trigger | 2 / 3 / 5 missed |

### Depends on `voting.quorum.standard`
| Key | Title | Options |
|-----|-------|---------|
| `voting.quorum.amendment` | Amendment quorum | — |
| `voting.quorum.election` | Election quorum | — |
| `voting.quorum.emergency` | Emergency quorum | — |
| `proposals.stake` | Proposal stake (XRD) | 0 / 100 / 500 / 1000 |
| `reputation.decay` | XP decay rate/month | 0% / 5% / 10% |

### Depends on `voting.period.standard`
| Key | Title | Options |
|-----|-------|---------|
| `voting.period.amendment` | Amendment voting period | 7d / 14d / 21d |
| `voting.period.election` | Election voting period | 7d / 14d |
| `voting.period.emergency` | Emergency voting period | 24h / 48h / 72h |
| `timing.forum_min` | Min forum discussion | 24h / 48h / 72h / 7d |
| `timing.execution_delay` | Execution delay | 24h / 48h / 72h |
| `timing.cooldown` | Failed proposal cooldown | 7d / 14d / 30d |

### Depends on `voting.approval.standard`
| Key | Title | Options |
|-----|-------|---------|
| `treasury.grant_limit` | Max single grant (XRD) | 5K / 10K / 25K / 50K |
| `treasury.bounty_limit` | Max single bounty (XRD) | 1K / 5K / 10K |
| `treasury.ops_limit` | Monthly ops limit (XRD) | 5K / 10K / 25K |
| `treasury.emergency_cap` | Emergency cap (XRD) | 10K / 25K / 50K |
| `enforcement.suspension` | Suspension duration | 30d / 60d / 90d |

## Phase 3 — Operational (6 votes)

Unlocked after configuration is complete.

| Key | Depends On | Title | Type |
|-----|-----------|-------|------|
| `election.nomination_period` | `voting.period.election` | Nomination period | Poll: 7d / 14d |
| `election.discussion_period` | `voting.period.election` | Discussion period | Poll: 7d / 14d |
| `election.min_activity` | `voting.quorum.election` | Min activity for eligibility | Poll |
| `rac.first_election` | All election params | Launch first RAC election | Yes/No |
| `treasury.first_fund` | Treasury limits | Establish bounty fund | Yes/No |
| `infra.hosting` | `charter.adoption` | Approve hosting arrangement | Yes/No |

## Dependency Tree

```
charter.adoption ──→ infra.hosting
rac.seats ──→ multisig, compensation, meetings, inactivity
voting.quorum.standard ──→ quorum.amendment, quorum.election, quorum.emergency
                          ──→ proposals.stake, reputation.decay
voting.period.standard ──→ period.amendment, period.election, period.emergency
                          ──→ forum_min, execution_delay, cooldown
voting.approval.standard ──→ treasury limits, enforcement
voting.period.election ──→ election params ──→ first RAC election
treasury limits ──→ first bounty fund
```

## How It Works

1. Foundation votes (Phase 1) run as temp checks in the TG bot
2. Passed temp checks escalate to formal votes
3. Resolved parameters unlock dependent votes
4. `/charter` shows real-time status of all 32 parameters
5. `/api/charter` returns the full parameter state for dashboards

## Bootstrap Rules

The first 6 foundation votes use hard-coded defaults:
- Voting period: 72 hours
- Quorum: 3 votes minimum
- Approval: simple majority (>50%)

Once F3/F4/F5 resolve, subsequent votes use community-decided values.
