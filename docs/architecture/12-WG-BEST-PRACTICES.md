I now have comprehensive research across all 10 areas. Here is the full synthesis.

---

# Working Group Research: Practical Logistics for Radix Guild

## 1. How Groups Are Formed

**IETF (gold standard):** A charter is negotiated between a prospective chair and the relevant Area Director. The charter is a contract to produce specific deliverables. It is reviewed by the IAB and approved by the IESG (their steering group). Formation requires demonstrating that the problem is clear, relevant, and not already being addressed elsewhere. The bar is intentionally high.

**MakerDAO Core Units:** Required simultaneous ratification of three bundled proposals -- a Mandate (MIP39), a Budget (MIP40), and a Facilitator (MIP41). All three had to pass together as a single binary vote. Minimum 1-month feedback period, 1-week frozen period, then monthly governance cycle vote.

**ENS DAO:** Working groups were established via social proposal (EP0.4). New groups are rare -- ENS has only three (Meta-Governance, Ecosystem, Public Goods). The Community WG was dissolved in 2022 and folded into Ecosystem. Groups are structural, not project-based.

**Apache PMCs:** A project enters as an Incubator podling, graduates to Top Level Project with its own PMC when it demonstrates a healthy community. PMC members nominate and vote in new members. The Board must recognize new PMC members but does not direct technical work.

**Orca/Metropolis Pods:** Any DAO member can spin up a pod (small autonomous team of under 10 people). Pods are technically a Gnosis Safe multi-sig with membership NFTs as access tokens. Low friction to create, but constrained in what they can do by their on-chain permissions.

**Pattern that works:** A champion proposes, a governing body approves, and the charter must specify deliverables and a time horizon. The IETF model -- where a charter is a contract with an end date -- consistently outperforms open-ended mandates.

**Pattern that fails:** Letting working groups self-authorize (no external approval) leads to empire-building. MakerDAO's core units became fiefdoms before the Endgame restructuring.

---

## 2. How Groups Are Funded

**ENS DAO:** Each working group submits a budget as a Social Proposal during a defined funding window. Once social votes pass, a collective Executable Proposal distributes funds to working group multi-sigs (3-of-4 signers: 3 elected stewards + 1 secretary). Budgets were initially quarterly, later extended to annual.

**MakerDAO:** Budget proposals (MIP40) defined Dai streams. Core units had ongoing budget streams that required active offboarding to stop. This was the single biggest failure mode -- once a stream was approved, momentum and inertia made it very hard to cut. The Content Production Core Unit offboarding vote passed by only 2%.

**Gitcoin:** Workstreams had their own budgets approved per "season" (initially quarterly, moved to semi-annual). CSDO (cross-stream coordination) eventually cut spending by roughly 40%. Gitcoin ultimately abandoned the workstream model entirely in 2024, consolidating into a "Labs" structure because the fragmented model was "not conducive to stability, operations, and software development in a remote environment."

**Apache PMCs:** No direct funding. Apache projects are volunteer-driven. The Foundation provides infrastructure (CI, hosting, legal). This avoids budget capture entirely but limits what can be achieved to volunteer capacity.

**IETF:** No direct funding of working groups. Participants fund their own travel. IETF itself is funded by meeting fees and sponsorships. Working groups produce documents, not software, so the cost is participant time.

**Pattern that works:** Time-boxed budgets with mandatory renewal votes. ENS's model of a social vote followed by an executable vote is solid. Semi-annual cycles (Gitcoin's later approach) balance overhead against accountability.

**Pattern that fails:** Perpetual budget streams (MakerDAO). Once money flows, stopping it requires political will that DAOs rarely muster. Also: per-workstream budgets without cross-stream coordination lead to redundant spending (Gitcoin pre-2024).

---

## 3. How Groups Report

**ENS DAO:** Stewards are accountable to token holders through annual elections. Working groups post updates on the governance forum. Budget proposals double as reporting mechanisms -- you must justify the next period's spend by showing what the last period produced. The recent reform debate highlighted that accountability was still too soft, with proposals to replace working groups with a leaner Admin Panel (rejected, but the criticism stands).

**MakerDAO:** Core Units reported through facilitators to governance. Reports were posted on the forum. The problem: reports became performative rather than substantive. There was no standardized format and no consequence for poor reporting. The Endgame restructuring was partly a response to this.

**Apache PMCs:** PMCs report to the Board quarterly. Reports are brief and structured: what happened, what's next, any issues. The Board can ask follow-up questions. Reports are public. If a PMC fails to report, the Board notices quickly because it reviews every project every quarter on a rotating schedule.

**IETF:** Working groups track milestones (deliverable documents with target dates). The Area Director monitors progress. If milestones slip repeatedly, the AD can re-charter or close the group. Minutes from every meeting are published. The chair is personally responsible for ensuring minutes are produced.

**Pattern that works:** Structured, short, regular reports to a specific body that actually reads them. Apache's quarterly-to-the-Board model is gold. IETF's milestone tracking with AD oversight is also excellent. Key: someone specific must be responsible for reading the reports and acting on them.

**Pattern that fails:** Forum posts that nobody reads. Maker and ENS both suffered from this. If reporting is to "the community" rather than to a specific accountable body, nobody is responsible for follow-up.

---

## 4. How Groups Are Dissolved

**IETF:** Working groups are created to produce specific deliverables. When the charter is fulfilled, the group closes. Closure is considered a mark of success. If a group stalls, the Area Director can close it. Re-chartering for follow-on work is possible but requires explicit approval.

**MakerDAO:** Core Units could be offboarded via MIP39c3 subproposal. The offboarded unit had 4 months to wind down. In practice, offboarding was politically painful -- the Content Production CU offboarding barely passed and exposed financial issues (unclear post-offboarding obligations, unclear handling of remaining funds). The Endgame dissolved all core units at once, replacing them with SubDAOs.

**ENS DAO:** The Community WG was dissolved via social vote in June 2022, with its work redistributed to Ecosystem WG. The process worked but was ad hoc. Term limits for stewards (12 months) provide a natural checkpoint but do not dissolve the group itself.

**ApeCoin DAO:** AIP-466 proposed closing "non-essential" working groups entirely, suggesting that even with formal structures, groups accumulate and become hard to remove.

**Apache:** Projects can be moved to the Attic (archived) if the community becomes inactive. The Board can retire a project. PMC members can vote to self-archive. This is rare but it works.

**Pattern that works:** Sunset clauses. Every charter should have an expiration date. IETF's model where closure equals success is the healthiest framing. Apache's Attic process for inactive projects is also good.

**Pattern that fails:** Requiring an active vote to dissolve. Political inertia means groups persist long after they are useful. MakerDAO and ApeCoin both demonstrated this. The default should be dissolution; continuation should require active renewal.

---

## 5. What Went Wrong (Common Failure Modes)

**Empire Building (MakerDAO):** Core units became fiefdoms with ongoing budget streams. Facilitators accumulated power. Cross-unit coordination was poor. The Endgame was a radical response to governance ossification.

**Fragmentation (Gitcoin):** Too many workstreams, each with its own budget, leadership, tools, and processes. Kyle Weiss acknowledged it was "too fragmented, not conducive to stability." Consolidation into Labs was the fix.

**Voter Apathy (industry-wide):** Less than 10% of eligible token holders typically vote. Average large DAO sees 350-500 voters per proposal. This makes governance capture feasible -- the Compound "GoldenBoyz" attack of 2024 exploited 4-5% turnout to attempt a $25M token transfer.

**Performative Reporting:** Groups file reports that nobody reads. No specific body is tasked with review. Forum-based reporting becomes a checkbox exercise.

**Offboarding Trauma (MakerDAO):** When the Content Production CU was offboarded, the DAO discovered it had no clear process for handling remaining funds, post-offboarding obligations, or knowledge transfer. The vote passed by only 2%.

**Delegation Monopolies:** A few delegates accumulate disproportionate voting power, recreating representative democracy with less accountability.

**Scope Creep Without Re-charter:** Groups expand their mandate informally without re-authorization, consuming more resources than originally approved.

---

## 6. What Worked Well (Success Patterns)

**IETF Charter Model:** Specific deliverables, specific timelines, specific end date. The chair is personally accountable for progress. The Area Director provides oversight without micromanaging. Closure is success.

**Apache Meritocratic Ladder:** Contributor to Committer to PMC Member. Earn authority through demonstrated work. PMCs are self-governing but report to the Board quarterly. The Board provides oversight without directing technical work. Minimum 3 active PMC members required.

**ENS Steward Elections:** Annual elections with term limits (12 months) create natural renewal. Multi-sig structure (3-of-4) prevents unilateral action. The Secretary role provides continuity across terms.

**Orca Pods (Small Teams):** Groups of under 10 people with on-chain permissions scoped to their work. Low friction to create, constrained in what they can do. The key insight: anything over 10 people becomes uncoordinated. Keep groups small, compose them into larger structures.

**MakerDAO Bundled Proposals:** Requiring mandate + budget + facilitator to pass together as one vote was actually elegant. It prevented zombie groups (approved mandate, no budget) and ensured someone was named as accountable from day one.

**Gitcoin Season-based Budgets:** Time-boxing budgets to "seasons" forced periodic justification. The shift from quarterly to semi-annual reduced overhead while maintaining accountability.

---

## 7. Charter Template (Synthesized from Research)

Based on IETF RFC 2418, MakerDAO MIP39, ApeCoin AIP-239, and ENS EP0.4, a working group charter should contain:

1. **Name and Identifier** -- short name, unique ID
2. **Mission Statement** -- one paragraph on why this group exists
3. **Scope** -- what is in scope and (critically) what is explicitly out of scope
4. **Deliverables with Milestones** -- specific outputs with target dates (IETF's strongest contribution)
5. **Membership** -- who can join, how, maximum size, quorum requirements
6. **Lead/Chair** -- named individual accountable for progress (MakerDAO's Facilitator concept)
7. **Budget** -- amount, source, spending controls, multi-sig structure
8. **Reporting** -- frequency, format, to whom (must be a specific body, not "the community")
9. **Decision-making** -- how the group makes internal decisions (consensus, vote, rough consensus)
10. **Sunset Date** -- when the charter expires (IETF: mandatory; renewal requires explicit re-charter)
11. **Dissolution Criteria** -- inactivity threshold, failure conditions, fund return procedure
12. **Amendment Process** -- how the charter can be modified (should require external approval)

---

## 8. Recommended Design for Radix Guild

Based on all of the above, here is the design, sized for 5-10 people now, scalable to 50+.

### Structure: Two Tiers

**Tier 1: The Council (permanent, small)**
- 3-5 stewards elected annually (ENS model)
- Approves working group charters
- Reviews working group reports monthly
- Controls treasury multi-sig
- This is your "Strategic Development Group" that spawns everything else

**Tier 2: Working Groups (chartered, time-boxed)**
- Created by charter proposal approved by Council
- Each has a named Lead (facilitator/chair)
- Maximum 7 members per group (Orca's insight: over 10 is uncoordinated)
- Every charter has a sunset date (default: 6 months, renewable)
- Budget approved as part of charter (MakerDAO bundled approach)

### Formation Process
1. Champion drafts charter using template (above)
2. 2-week feedback period on forum/Discord
3. Council votes to approve (simple majority of stewards)
4. Charter, budget, and lead are approved as one package
5. Multi-sig created for the group (2-of-3: lead + 2 council stewards)

### Funding Model
- Working groups request budgets as part of their charter
- Budgets are time-boxed to the charter period (max 6 months)
- Renewal requires a new budget request with a report on what was delivered
- No perpetual streams (MakerDAO's biggest mistake)
- Small groups (under 3 people) can operate without budget via council discretion

### Reporting
- Monthly written update to Council (Apache-style: short, structured)
- Format: What was delivered / What is next / What is blocked / Budget spent
- Council reviews all reports in a single monthly session
- Council posts a summary to the community (one document, not per-group)
- Miss two consecutive reports = automatic review of charter status

### Dissolution
- **Default: groups expire on their sunset date.** Continuation requires active renewal.
- Council can close a group for: inactivity (no report for 2 months), failure to meet milestones, budget misuse
- Remaining funds return to treasury
- Lead produces a closing report: what was done, what remains, knowledge transfer
- Closure is framed as success (IETF model), not failure

### Scaling Path
At 5-10 people: Council is the only permanent body. 1-2 working groups max. Low overhead.

At 15-30 people: Council stays at 3-5. Working groups multiply (3-5 groups). Council's primary job becomes charter review and report oversight.

At 50+: Consider adding Area Directors (IETF model) -- one council member oversees 2-3 related working groups. Working groups can spawn sub-groups (pods) for specific tasks without full charter process. Sub-groups report to their parent WG, not to Council directly.

### Critical Anti-Patterns to Avoid
1. **No perpetual budget streams** -- every dollar is time-boxed
2. **No self-authorizing groups** -- Council must approve every charter
3. **No reporting to "the community"** -- always to a specific body that reads it
4
