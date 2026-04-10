Here is the full research report on real DAO working group management tools.

---

## 1. DEWORK -- Task & Bounty Management

**What it does:** Web3-native task board (like Trello/Jira for DAOs). Manages bounties, task assignments, contributor applications, and crypto payments. Integrates with Discord, GitHub, and Notion. Processed over $1.2M in bounty payouts during 2025 and supports 500+ active DAOs.

**Who uses it:** AragonDAO, CityDAO, ShapeshiftDAO, Gitcoin, and hundreds of smaller DAOs.

**Cost:** Free to use. Takes no cut of payments.

**Good at:** Bounty-first workflow. Task boards are familiar (Kanban). Multi-chain payment (20+ networks). USDC pegging for stable bounty values. GitHub integration links PRs to tasks. Q2 2025 UI overhaul improved retention by 35%.

**Bad at:** Not great for ongoing work or salaried contributors -- it is bounty/task shaped. No built-in governance or proposals. Limited reporting and analytics (mid-2026 update planned). Documentation and knowledge management are absent.

**Guild integration potential:** HIGH. The task/bounty board model is exactly what guild working groups need. Could build an equivalent directly into the dashboard with a simpler scope -- we do not need multi-chain payment since we are Radix-only.

Sources: [Dework DAO Tool Report 2025](https://daotimes.com/dework-dao-tool-report-for-2025/), [DeWork on Alchemy](https://www.alchemy.com/dapps/dework)

---

## 2. CHARMVERSE -- All-in-One DAO Operations

**What it does:** Notion-style workspace with DAO-native features: docs, task boards, bounties, proposal builder (with voting), contributor onboarding, and token-gated access. Wallet login, NFT/token gating for workspaces.

**Who uses it:** Optimism, ENS, Gitcoin, and creative/social DAOs for contributor onboarding and operations.

**Cost:** Free tier available. Moved to a community-based pricing model in June 2025 requiring $DEV token contributions. Grant programs pay 1% of total annual grants processed.

**Good at:** All-in-one: docs + tasks + proposals + votes in one place. Proposal Builder 2.0 offers step-by-step workflow with rubric or vote evaluation. Token-gated access. Familiar Notion-like interface.

**Bad at:** Jack of all trades, master of none -- each individual feature is shallower than dedicated tools. The $DEV token pricing model adds friction and crypto dependency for basic operations. Some DAOs (like 1inch) have migrated away to Discourse for forums.

**Guild integration potential:** MEDIUM. The all-in-one approach is what we are building toward with the guild dashboard. We should study their proposal workflow closely. However, building our own gives us Radix-native integration that CharmVerse cannot provide.

Sources: [CharmVerse](https://charmverse.io/), [CharmVerse Proposal Builder 2.0](https://charmverse.io/post/charmverse-proposal-builder-2-0/), [Community Pricing](https://charmverse.io/post/community-pricing/)

---

## 3. COORDINAPE -- Peer-Based Compensation

**What it does:** Gift circle mechanism for peer-to-peer compensation. Each epoch, contributors get GIVE tokens to allocate to peers based on perceived value of their contributions. At epoch end, each person's share of the budget is proportional to the GIVE they received. Emerged from Yearn Finance.

**Who uses it:** 100+ DAOs including Bankless, Index Coop, Yearn Finance, and many working-group-heavy DAOs.

**Cost:** Free and open source.

**Good at:** Solves the hard problem of "who contributed how much?" without a manager deciding. Social consensus captures value that algorithmic systems miss. Integrates with Discord, GitHub, Gnosis Safe, Notion. Great for working groups with fluid contribution patterns.

**Bad at:** No project management features -- purely compensation. Requires active participation (people must actually allocate tokens). Can become a popularity contest. Does not work well for clearly scoped bounties with fixed prices. Needs a minimum group size to be meaningful.

**Guild integration potential:** HIGH. The gift circle / peer allocation model is straightforward to implement. This could be the core mechanism for how guild working groups decide compensation internally. We could build a simplified version directly into the guild dashboard -- allocate XRD budgets via peer consensus within each working group.

Sources: [Coordinape](https://coordinape.com/post/critical-conversations-and-compensation-in-daos), [Hedgey on DAO Compensation](https://mirror.xyz/mikey333.eth/uhHkeUxAER3Vh2agaiZOgO26-VC-ZdlNRKxFC7ht4GQ)

---

## 4. WONDERVERSE -- DAO Task Management + Credentials

**What it does:** Task management platform for DAOs with built-in Web3 credentialing. Manages task workflows, permissions, contributor onboarding, and batch payments. Creates on-chain resumes for contributors. Token-gated access.

**Who uses it:** SharkDAO and other early-stage DAOs for bounty boards and guild-based project tracking.

**Cost:** Not clearly documented -- appears to have a free tier.

**Good at:** On-chain resumes and credentials for contributors. Token-gated task access. Batch payment facilitation. Good for onboarding flows.

**Bad at:** Smaller user base than Dework or CharmVerse. Less mature ecosystem. Limited recent updates (the project appears to have slowed down). Not well suited for complex project management.

**Guild integration potential:** LOW. The on-chain resume concept is interesting but premature for the guild. The core task management is weaker than Dework's. Not worth integrating or copying.

Sources: [Wonderverse on Alchemy](https://www.alchemy.com/dapps/wonderverse), [Wonderverse on DAOMasters](https://www.daomasters.xyz/tools/wonderverse)

---

## 5. COLONY -- Reputation-Based Task Management

**What it does:** Ethereum-based DAO platform with a reputation system that assigns voting power based on contributions. Task management tied to a multi-token treasury -- funds release only when work is complete. Reputation decays over time, encouraging continuous participation.

**Who uses it:** Primarily developer-heavy DAOs and protocol teams. Smaller adoption than Dework.

**Cost:** Not clearly documented. Open source on Ethereum.

**Good at:** Reputation system is genuinely innovative -- reputation is domain-specific (dev, design, etc.) and decays, so power flows to active contributors. Treasury-linked task completion (payment on delivery). Good for DAOs wanting on-chain accountability.

**Bad at:** Ethereum-only. Complex to set up. Gas costs for on-chain operations. Steeper learning curve than Dework or CharmVerse. Smaller community and fewer integrations.

**Guild integration potential:** MEDIUM. The decaying reputation model is worth stealing conceptually. We could implement a simpler version: guild members earn reputation in their working group domain, it decays if they go inactive, and it influences voting weight. We do not need Colony's full Ethereum infrastructure for this.

Sources: [Colony](https://colony.io/), [Colony Deep Dive](https://daotimes.com/a-deep-dive-into-colony-dao-understanding-its-features-and-applications/)

---

## 6. COMMONWEALTH -- Governance Forum + Voting

**What it does:** Combines Telegram-style discussions, Discourse-style forums, and Snapshot-style voting into one platform. Crypto-native community and governance tool. Wallet login, token-weighted voting, threaded discussions, and proposal management.

**Who uses it:** 300+ projects including Osmosis, Injective, dYdX, Phantom DAO. Raised $20M. Rebranded token to COMMON.

**Cost:** Free tier available. Token-based model for premium features.

**Good at:** One-stop-shop for discussion + governance. Large existing user base. Cross-chain support. Familiar forum interface. Good for long-form proposal discussion before voting.

**Bad at:** Some DAOs are migrating away (1inch moved to Discourse in Oct 2025, dYdX also moved to Discourse). Forum-centric -- not great for task management or working group operations. The COMMON token model adds complexity. No built-in treasury management or payment flows.

**Guild integration potential:** LOW for direct integration, but HIGH for learning from their design. Their proposal discussion --> vote --> execute flow is the right pattern. We should build equivalent functionality natively rather than integrate with Commonwealth, since our community is Radix-native.

Sources: [COMMON on Phemex](https://phemex.com/academy/what-is-common-dao-coordination-layer), [Commonwealth Blog](https://blog.commonwealth.im/phantom-dao-launches-governance-platform-in-collaboration-with-commonwealth/)

---

## 7. SNAPSHOT + SAFESNAP/OSNAP -- Vote Then Execute

**What it does:** Snapshot is the dominant off-chain voting platform for DAOs (gasless votes via signed messages). SafeSnap/oSnap bridges the gap to on-chain execution: once a vote passes on Snapshot, it can automatically trigger transactions on a Gnosis Safe multisig via the Reality.eth oracle. Snapshot X (2025) brings fully on-chain voting to Starknet and EVM chains at 10-50x lower cost.

**Who uses it:** Virtually every major DAO uses Snapshot for voting. Thousands of spaces. SafeSnap is used by DAOs with treasuries in Safe wallets.

**Cost:** Free and open source. Gas costs only for on-chain execution.

**Good at:** Industry standard for DAO voting. Gasless. Flexible voting strategies (token-weighted, quadratic, etc.). SafeSnap closes the "vote passes but nothing happens" gap. Massive ecosystem.

**Bad at:** Snapshot alone is just voting -- no discussion, no task management, no working group coordination. SafeSnap setup is complex. Reality.eth oracle adds a challenge/dispute layer that can delay execution. Ethereum-centric (Snapshot X helps but is still EVM). Not directly applicable to Radix.

**Guild integration potential:** CONCEPTUAL ONLY. We cannot use Snapshot directly (it is EVM). But the pattern of "off-chain vote --> on-chain execution via multisig" is exactly what we should implement for Radix. The guild dashboard should have its own voting mechanism that triggers Radix transactions via the badge system.

Sources: [Snapshot DAO Tool Report 2025](https://daotimes.com/snapshot-dao-tool-report-for-2025/), [oSnap Docs](https://docs.snapshot.org/user-guides/plugins/safesnap-osnap), [Snapshot X](https://snapshot.mirror.xyz/F0wSmh8LROHhLYGQ7VG6VEG1_L8_IQk8eC9U7gFwep0)

---

## 8. CLARITY (DAO-specific) -- Not Found

**What it does:** No DAO-specific tool called "Clarity" was found. Search results returned Clarity PPM (Broadcom enterprise software) which is entirely unrelated to DAOs. This may have been a rumored or vaporware project, or possibly confused with a different tool name.

**Guild integration potential:** N/A.

---

## 9. HATS PROTOCOL -- On-Chain Roles & Permissions

**What it does:** On-chain protocol for DAO roles represented as ERC-1155 tokens (called "hats"). Creates hierarchical role trees where each hat bundles responsibilities, permissions, and accountability. Hats are programmable, revocable, and non-transferable. The "Top Hat" (which can be a multisig or governance contract) controls the tree.

**Who uses it:** 50+ DAOs including RaidGuild. Recently added an MCP server for AI agent integration.

**Cost:** Free and open source. Non-custodial and non-upgradeable -- described as an "unstoppable public good."

**Good at:** Solves the "who has permission to do what" problem on-chain. Hierarchical structure maps well to working groups (top hat = DAO, sub-hats = working group leads, leaf hats = contributors). Revocable -- if someone goes rogue, their hat gets pulled and all downstream permissions are revoked. Integrates with Safe, Discord, GitHub, and more. Well-documented.

**Bad at:** Ethereum/EVM only. Not directly usable on Radix. Requires on-chain transactions for role changes (gas). Complex to set up initially. No task management or compensation features -- purely roles/permissions.

**Guild integration potential:** HIGH CONCEPTUALLY. This is the best model for how guild working group roles should work. We already have the badge system on Radix -- we should evolve it to support hierarchical role trees like Hats. A "Guild Working Group Lead" badge that grants specific permissions, revocable by governance vote. The Hats tree model maps perfectly to: Guild Top Hat --> Working Group Hats --> Contributor Hats.

Sources: [Hats Protocol](https://www.hatsprotocol.xyz/), [Hats Docs](https://docs.hatsprotocol.xyz/), [Hats GitHub](https://github.com/Hats-Protocol/hats-protocol), [RaidGuild Handbook](https://handbook.raidguild.org/docs/dao-operations/dao-roles)

---

## 10. GNOSIS SAFE (now Safe) -- Working Group Budget Management

**What it does:** The industry-standard multisig wallet for DAOs. Multiple signers must approve transactions. DAOs create separate Safe wallets for each working group with their own signers and budgets. Integrates with Snapshot (via SafeSnap) for vote-triggered execution.

**Who uses it:** Virtually every DAO with a treasury. Gold standard for DAO treasury management.

**Cost:** Free to use. Gas costs for transactions.

**Good at:** Battle-tested security. Granular signer control per working group. Spending limits. Transaction batching. Module system allows programmatic execution (SafeSnap, Zodiac modules). Well-audited.

**Bad at:** EVM only -- not available on Radix. Gas costs for every transaction. Complex UX for non-technical users. No built-in reporting or budget tracking. Managing many Safes across working groups becomes operationally heavy.

**Guild integration potential:** PATTERN ONLY. We cannot use Safe on Radix. But the model of "one multisig per working group with defined signers and budget limits" is exactly what we need. The Radix native token system and our badge-based access control can replicate this. Each working group gets a component/account with badge-gated access, signer thresholds, and budget caps.

Sources: [Gnosis Safe v4 Security](https://markaicode.com/dao-treasury-security-gnosis-safe-multisig/), [Multisig Best Practices](https://onchaintreasury.org/2025/09/19/best-practices-for-multisig-wallets-in-dao-treasury-management/)

---

## 11. DISCORD -- Working Group Channels & Role Management

**What it does:** Not a DAO tool per se, but the de facto communication layer for nearly every DAO. Working groups get dedicated channels, role-based access, and bot automation (MEE6, Dyno, Carl-bot for role assignment, moderation, and notifications).

**Who uses it:** Every DAO.

**Cost:** Free (Nitro for extras, but not required).

**Good at:** Everyone already uses it. Role-based channel access maps well to working groups. Bot ecosystem is mature (reaction roles, auto-moderation, notifications). Real-time communication. Voice channels for meetings.

**Bad at:** Not built for structured work -- conversations are ephemeral and unsearchable. No task tracking, no governance, no treasury management. Role management at scale is manual and messy. Knowledge gets lost in chat. Bot sprawl adds complexity. No on-chain integration by default.

**Guild integration potential:** KEEP AS COMMUNICATION LAYER. Discord should remain the chat/voice tool. The guild dashboard should be the structured layer on top -- tasks, proposals, budgets, roles. We already have the guild bot; it should bridge Discord notifications to dashboard actions (e.g., "new task assigned to you in WG-Development" pings in Discord, links to dashboard).

Sources: [Discord Roles & Permissions](https://support.discord.com/hc/en-us/articles/214836687-Discord-Roles-and-Permissions), [Discord Roles Bots Guide](https://skywork.ai/skypage/en/discord-roles-bots-ai-automation/2032411072961912832)

---

## 12. NOTION -- DAO Documentation & Knowledge Base

**What it does:** General-purpose workspace for docs, wikis, databases, and project tracking. Many DAOs use it as their knowledge base and operational documentation layer. Not crypto-native but widely adopted.

**Who uses it:** Bankless, many DAO operations teams, contributor handbooks. Often used alongside Dework/Coordinape for the documentation side.

**Cost:** Free for personal use. Team plans start at $10/member/month.

**Good at:** Excellent for documentation, wikis, and structured knowledge. Database views are powerful. Templates for onboarding, meeting notes, project specs. Everyone knows how to use it.

**Bad at:** Not crypto-native. No wallet login, no token gating (without third-party tools). No governance, voting, or treasury features. Data is centralized. Paid at scale. No contributor payment or reputation tracking.

**Guild integration potential:** LOW for direct integration. The guild dashboard should have its own docs/wiki section -- a simpler version of Notion's page system focused on working group documentation: meeting notes, proposals, specs, and handbooks. We do not need to build a full Notion clone, just enough structure to keep working group knowledge organized.

---

## SUMMARY: What to Build vs. What to Integrate

**Build into the guild dashboard (Radix-native):**
1. **Task/bounty board** (inspired by Dework) -- simple Kanban with XRD payments
2. **Peer allocation / gift circles** (inspired by Coordinape) -- for WG internal compensation
3. **Proposal --> Vote --> Execute flow** (inspired by Snapshot + SafeSnap) -- using Radix badges
4. **Hierarchical role tree** (inspired by Hats Protocol) -- guild badges with revocable permissions
5. **WG budget accounts** (inspired by Safe multisig pattern) -- badge-gated Radix accounts per WG
6. **Lightweight docs/wiki** -- for WG meeting notes and operational knowledge

**Keep as external tools:**
- **Discord** -- communication layer, bridge via guild bot
- **GitHub** -- code collaboration, link PRs to dashboard tasks

**Do not build / low priority:**
- CharmVerse-style all-in-one (too broad, we are building our own)
- Commonwealth-style forums (Discord + dashboard proposals cover this)
- Wonderverse credentials (premature for guild size)
- Colony-style on-chain reputation (interesting concept, steal the decay model, but full implementation is overkill)

The core insight: the DAO tooling landscape is fragmented. DAOs typically use 5-7 different tools stitched together (Snapshot + Safe + Discord + Dework + Notion + Coordinape). The guild dashboard opportunity is to unify the key workflows into one Radix-native surface, purpose-built for a guild of operators rather than a whale-governed protocol DAO.
