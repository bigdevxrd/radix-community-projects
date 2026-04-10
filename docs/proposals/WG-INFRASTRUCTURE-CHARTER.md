# Infrastructure & Tooling Working Group Charter

---

## 1. Purpose

This Working Group exists to build, maintain, and operate the coordination infrastructure that other Working Groups need to function. Task boards, badge-gated membership, escrow payments, trust scoring, reporting tools, and governance dashboards — the plumbing that connects decisions to execution.

---

## 2. Scope

### In Scope

* Build and maintain coordination tooling for all Working Groups (task boards, dashboards, reporting)
* Operate the Guild platform (radixguild.com) as shared infrastructure
* Maintain on-chain components (BadgeManager, TaskEscrow, future ConvictionVoting)
* Support P3 Foundation service transitions where relevant to community tooling
* Provide badge infrastructure for any WG that needs membership verification
* Per-WG budget tracking dashboards and structured reporting templates
* Contribute to Hyperscale-RS (protocol-level security hardening)

### Out of Scope

* Cannot make governance decisions — tooling serves the community's choices
* Cannot control treasury outside approved WG budget
* Cannot override other WGs' processes — provides tools, not mandates
* Does not manage community outreach or marketing (Community & Marketing WG scope)
* Does not manage legal or compliance (Governance & Legal WG scope)

---

## 3. Responsibilities

* Keep radixguild.com and @rad_gov bot operational (99%+ uptime target)
* Ship monthly feature releases aligned to community needs
* Maintain 75+ automated tests — no regressions
* Respond to community bug reports within 24 hours
* Provide technical support for other WGs using the infrastructure
* Publish all code as open source (MIT)
* Maintain documentation for all tools and APIs

---

## 4. Deliverables

### Month 1 (Foundation)
* Working group scoped task boards — tasks linked to specific WGs
* Per-WG role system (lead / steward / member / observer)
* User profile page — badge, tasks, votes, groups, trust score in one view
* Dashboard write operations — vote and propose from web UI (not just TG)

### Month 2 (Execution)
* Escrow V3 — multi-token task funding (XRD + xUSDC + xUSDT)
* Per-WG budget tracking dashboard with spend-vs-envelope view
* Monthly reporting template (bot: `/wg report`, dashboard: export)
* Conviction voting component (Scrypto) — time-weighted, badge-tier multiplied

### Month 3-6 (Scale)
* Charter lifecycle management (create → operate → sunset)
* RadixTalk API integration — bridge forum discussions with governance
* MIDAO tooling adaptation when legal entity is formed
* P3 service adoption (if community approves specific services)
* Quarterly retrospectives published publicly

---

## 5. Leadership Structure

* 1 Lead Steward (initial): **bigdev** (@bigdev_xrd)
* Up to 2 additional Stewards elected by community when membership warrants
* Term: **6 months** (renewable by community vote)
* Lead is named and accountable — not a committee hiding behind consensus

---

## 6. Steward Responsibilities

* Ship working code on schedule
* Maintain infrastructure uptime
* Report monthly: delivered / next / blocked / spent
* Escalate risks and blockers to RAC
* Ensure all work is documented and transferable
* Respond to community requests within 24 hours

---

## 7. Decision-Making

* Technical decisions: Lead Steward decides (ship fast, iterate)
* Feature prioritisation: Community input via temperature checks, Lead decides execution order
* Budget allocation within envelope: Lead Steward (tracked, reported)
* Budget changes: Require RAC approval

---

## 8. Budget

**Proposed: $4,000 USD/month (hybrid)**

| Component | Amount | Condition |
|-----------|--------|-----------|
| Base (infrastructure + maintenance) | $2,400/month | Ongoing while WG is active |
| Milestone bonus (feature delivery) | $1,600/month | Released on verified delivery |
| **Total** | **$4,000/month** | **$24,000 for 6-month term** |

**Verification:** Milestones verified by working code deployed, public on GitHub, testable at radixguild.com. If deliverables aren't met → milestone payment withheld.

**Included in base:**
* VPS hosting ($14/month across 2 servers)
* Domain maintenance (radixguild.com, exp 2029)
* AI/LLM development costs ($35/month)
* 40+ hours/week development time

**Variance rules (per Daffy's framework):**
* <5%: Disclosed in monthly report
* 5-15%: RAC notification required
* >15%: Spending freeze, RAC review

**Unspent funds:** Returned to treasury at sunset. No carry-forward.

---

## 9. Reporting

* **Biweekly:** Brief update to RadixTalk (shipped / next / blocked)
* **Monthly:** Structured report to RAC (delivered / spend / metrics / next)
* **Quarterly:** Retrospective published publicly
* **Real-time:** radixguild.com/about — live transparency page with all metrics

---

## 10. Coordination

* **RAC:** Compliance oversight, budget approval, WG sunset/renewal
* **Governance & Legal WG:** Legal entity integration when MIDAO forms
* **Product & Protocol WG:** Technical alignment, Hyperscale-RS contributions
* **Community & Marketing WG:** Onboarding flows, user feedback
* **All WGs:** Provide task boards, badge infrastructure, reporting tools

---

## 11. Renewal / Sunset

* **Term:** 6 months from approval
* **Renewal:** Community vote (temp check → proposal → vote)
* **Sunset process:**
  * 21-day wind-down period
  * All code remains MIT licensed and on GitHub
  * Documentation updated for successor
  * Unspent budget returned to treasury
  * Infrastructure transfer guide published
* **Closure = success if:** Other WGs can operate their own tooling independently

---

## 12. What Already Exists (Proof of Work)

This is not a proposal to build something new. The infrastructure is live:

| Component | Status | Verify |
|-----------|--------|--------|
| Badge Manager (Scrypto v4) | Mainnet | [on-chain](https://dashboard.radixdlt.com/component/component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva) |
| TaskEscrow v2 (200 XRD min, 2.5% fee) | Mainnet | [on-chain](https://dashboard.radixdlt.com/component/component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r) |
| Dashboard (14 pages) | Live | [radixguild.com](https://radixguild.com) |
| Telegram Bot (37 commands) | Live | [@rad_gov](https://t.me/rad_gov) |
| REST API (34 endpoints) | Live | [/api/health](https://radixguild.com/api/health) |
| Trust scoring (Bronze/Silver/Gold) | Live | Calculated from on-chain activity |
| Gateway event watcher | Live | 60-second polling |
| PR merge auto-verification | Live | GitHub webhook |
| 75 automated tests | Passing | CI pipeline |
| Source code (MIT) | Public | [GitHub](https://github.com/bigdevxrd/radix-community-projects) |

Additionally contributing to:
* **Hyperscale-RS** — security audit posted, first PR merged, 6-PR contribution plan
* **Scrypto ecosystem** — BadgeFactory, TaskEscrow, BertPool AMM, conviction voting (planned)

---

## 13. Conflict of Interest Disclosure

* bigdev operates the Sats DeFi trading platform on Radix (separate project, separate infrastructure)
* bigdev holds XRD tokens
* No financial relationship with any Radix Foundation employee or RAC member
* No financial relationship with any market maker or exchange
* Will recuse from any decision where personal financial interest conflicts with WG mandate
