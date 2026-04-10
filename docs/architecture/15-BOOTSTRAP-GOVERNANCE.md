# 15 — Bootstrap Governance (Low User Numbers)

> Design governance thresholds that work with 5-20 users
> while testing the full pipeline end-to-end.

## The Problem

With 5 registered users and 1-2 active voters, standard governance
thresholds prevent anything from passing. We need to:

1. Lower thresholds so the pipeline actually flows
2. Test every stage end-to-end (propose → vote → pass → execute)
3. Make it clear these are bootstrap settings (community adjusts later via charter)

## Bootstrap Thresholds

| Proposal Type | Current Min | Bootstrap Min | Rationale |
|--------------|-------------|---------------|-----------|
| Temperature check | 1 vote | **1 vote** | Already fine |
| Standard proposal (Yes/No) | 3 votes | **2 votes** | 2 of 5 = 40% participation |
| Multi-choice poll | 3 votes | **2 votes** | Same |
| Charter parameter vote | 3 votes | **2 votes** | Foundation decisions need some quorum but 3 is unreachable |
| Binding decision | 3 votes | **2 votes** | Revisit when 10+ members |

## Pipeline Stages to Test

```
1. TEMP CHECK → /temp "Question?" → 1 vote to complete → 24h
   Status: WORKING ✓

2. PROPOSAL → /propose "Title" → 2 votes to pass → 72h  
   Status: NEEDS THRESHOLD CHANGE (3→2)

3. CHARTER VOTE → /propose linked to charter param → 2 votes → 72h
   Status: NEEDS THRESHOLD CHANGE + RE-PROPOSAL of P1-P6

4. TASK CREATION → /bounty create → funded via escrow
   Status: WORKING ✓ (bot + dashboard)

5. TASK CLAIM → /bounty claim or dashboard button
   Status: BUILT (needs live test)

6. TASK SUBMIT → /bounty submit <pr_url> or dashboard button
   Status: BUILT (needs live test)

7. TASK VERIFY → PR merged auto-verify or admin /bounty verify
   Status: BUILT (needs live test with real PR)

8. TASK PAY → admin /bounty pay <tx_hash>
   Status: WORKING (manual until bot signer Phase 3)

9. WG REPORT → /wg report <group>
   Status: BUILT (needs first real report)
```

## Charter Re-Proposal Plan

The original P1-P6 charter votes expired with 1/3 participation.
Re-propose with bootstrap thresholds (2 votes) and shorter duration (48h).

| Param | Title | Type | Options |
|-------|-------|------|---------|
| charter.adoption | Adopt the Radix DAO Charter | Yes/No | — |
| rac.seats | RAC seat count | Poll | 3, 5, 7, 9 |
| voting.quorum.standard | Standard quorum % | Poll | 20%, 33%, 50% |
| voting.period.standard | Standard voting period | Poll | 48h, 72h, 7 days |
| voting.approval.standard | Approval threshold % | Poll | >50%, >60%, >67% |
| badge.cost | Badge minting cost | Poll | Free, 1 XRD, 5 XRD |

## Scaling Plan

| Users | Min Votes | Action |
|-------|-----------|--------|
| 1-5 | 2 | Bootstrap — test pipeline |
| 6-10 | 3 | Charter vote to confirm |
| 11-20 | 5 | Charter vote to adjust |
| 20+ | Charter-defined % | Community decides quorum |

These thresholds are explicitly temporary. The charter voting.quorum
parameter (once resolved) overrides them permanently.
