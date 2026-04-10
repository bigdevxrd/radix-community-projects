# External Scrypto Repositories, Knowledge Bases & Resources

> Comprehensive catalog of **all** Scrypto knowledge — official repos, SDKs, community DeFi codebases, developer tooling, learning resources, and documentation.
> Agents should use this as a first-hand reference to the broader Scrypto ecosystem.

---

## 1. Official Knowledge Bases & Documentation

### Developer Portals

| Resource | URL | What You'll Find |
|----------|-----|-----------------|
| **Radix Developer Hub** | https://developers.radixdlt.com | Central dev portal — getting started, guides, toolkits, community links |
| **Radix Technical Docs** | https://docs.radixdlt.com/docs | Full Scrypto docs, RTM spec, SBOR, Gateway API, security practices |
| **Radix Wiki — Dev Resources** | https://radix.wiki/contents/resources/radix-developer-resources | Aggregated setup guides, APIs, SDKs, grants, toolkits |
| **Learning Step-by-Step** | https://docs.radixdlt.com/docs/learning-step-by-step | Guided walk-through from setup → first blueprint → deployment |

### Specific Documentation Sections

| Topic | URL | Use When |
|-------|-----|----------|
| **Scrypto Language** | https://docs.radixdlt.com/docs/scrypto | Writing blueprints — types, macros, resource model |
| **Transaction Manifests (RTM)** | https://docs.radixdlt.com/docs/transaction-manifest | Building manifests for frontend → on-chain calls |
| **SBOR Encoding** | https://docs.radixdlt.com/docs/sbor | Scrypto Binary Object Representation — serialization format |
| **Gateway API** | https://docs.radixdlt.com/docs/gateway-api | Reading on-chain state via REST (what our `gateway.js` uses) |
| **Radix Engine** | https://docs.radixdlt.com/docs/radix-engine | How the VM works — auth, asset model, component lifecycle |

### Community Knowledge

| Resource | URL | What You'll Find |
|----------|-----|-----------------|
| **RadixTalk Forum** | https://radixtalk.com | Community Q&A, architecture discussions, MVD threads |
| **Radix Discord (Dev Channel)** | https://discord.gg/radixdlt | Real-time developer support, #scrypto channel |
| **Radix Booster Grants** | https://www.radixdlt.com/grants | Funding for early-stage projects |
| **Radix Dashboard** | https://dashboard.radixdlt.com | Deploy packages, send transactions, inspect state |
| **RadixScan Explorer** | https://radixscan.io | View on-chain entities, transactions, events |

---

## 2. Official Radix Repositories (radixdlt/)

### Core — The Scrypto Language & Engine

| Repository | Stars | Description | Why It Matters |
|-----------|-------|-------------|----------------|
| [radixdlt/radixdlt-scrypto](https://github.com/radixdlt/radixdlt-scrypto) | 411 ⭐ | **The Scrypto language itself** — compiler, runtime, standard library | This is where `scrypto::prelude::*` comes from. Browse `scrypto/`, `radix-engine/`, `scrypto-test/` crates. |
| [radixdlt/babylon-node](https://github.com/radixdlt/babylon-node) | 31 ⭐ | Radix node software (embeds Radix Engine) | Understand how the engine executes your blueprints |
| [radixdlt/babylon-gateway](https://github.com/radixdlt/babylon-gateway) | 17 ⭐ | The Gateway API server (C#) | Understand the REST API our bot reads from |

### SDKs & Developer Toolkits

| Repository | Stars | Language | Description |
|-----------|-------|----------|-------------|
| [radixdlt/radix-dapp-toolkit](https://github.com/radixdlt/radix-dapp-toolkit) | 33 ⭐ | TypeScript | **Radix dApp Toolkit + √ Connect Button** — what our frontend uses to send transactions. Mono-repo. |
| [radixdlt/radix-engine-toolkit](https://github.com/radixdlt/radix-engine-toolkit) | 23 ⭐ | Rust | Rust library for building manifests, signing transactions, working with addresses offline |
| [radixdlt/typescript-radix-engine-toolkit](https://github.com/radixdlt/typescript-radix-engine-toolkit) | 14 ⭐ | TypeScript | TypeScript wrapper for the Radix Engine Toolkit — idiomatic TS API |
| [radixdlt/sargon](https://github.com/radixdlt/sargon) | 12 ⭐ | Rust | Shared library used by iOS & Android wallets — key management, account derivation |
| [radixdlt/wallet-compatible-derivation](https://github.com/radixdlt/wallet-compatible-derivation) | 5 ⭐ | Rust | CLI tool for generating Babylon-compatible accounts from mnemonics |
| [radixdlt/connector-extension](https://github.com/radixdlt/connector-extension) | 7 ⭐ | TypeScript | Browser extension linking wallet to dApps |
| [radixdlt/swift-engine-toolkit](https://github.com/radixdlt/swift-engine-toolkit) | 4 ⭐ | Swift | Swift wrapper for Radix Engine Toolkit |

### Wallet Implementations

| Repository | Stars | Platform | Description |
|-----------|-------|----------|-------------|
| [radixdlt/babylon-wallet-ios](https://github.com/radixdlt/babylon-wallet-ios) | 39 ⭐ | iOS (Swift) | Official iOS wallet — ROLA, dApp interaction, account management |
| [radixdlt/babylon-wallet-android](https://github.com/radixdlt/babylon-wallet-android) | 16 ⭐ | Android (Kotlin) | Official Android wallet |

### Examples, Tutorials & Learning

| Repository | Stars | Description | Best For |
|-----------|-------|-------------|----------|
| [radixdlt/community-scrypto-examples](https://github.com/radixdlt/community-scrypto-examples) | 95 ⭐ | **Community-contributed examples** — DeFi, NFT, DAO, game blueprints | Browse `basic/`, `defi/`, `nft/` folders for patterns |
| [radixdlt/scrypto-challenges](https://github.com/radixdlt/scrypto-challenges) | 67 ⭐ | Competition entries from 7+ Scrypto challenges | Real-world blueprints with creative solutions |
| [radixdlt/scrypto-examples](https://github.com/radixdlt/scrypto-examples) | 59 ⭐ | Official example blueprints (Hello Token, Radiswap, etc.) | Clean reference implementations |
| [radixdlt/official-examples](https://github.com/radixdlt/official-examples) | 9 ⭐ | Officially maintained full-stack examples | Up-to-date patterns for any part of the stack |
| [radixdlt/experimental-examples](https://github.com/radixdlt/experimental-examples) | 7 ⭐ | Snippets and proof-of-concept implementations | Experimental patterns, not production-ready |
| [radixdlt/gumball-club](https://github.com/radixdlt/gumball-club) | 7 ⭐ | Tutorial dApp — Gumball Club | End-to-end dApp example (frontend + Scrypto) |
| [radixdlt/create-radix-app](https://github.com/radixdlt/create-radix-app) | 5 ⭐ | Starter template — vanilla JS + Scrypto | Scaffold a new project fast |
| [radixdlt/scrypto-starter](https://github.com/radixdlt/scrypto-starter) | 0 ⭐ | Minimal starter template | Bare-bones starting point |
| [radixdlt/scrypto_tutorial](https://github.com/radixdlt/scrypto_tutorial) | 9 ⭐ | Tutorial code from dev events (archived) | Step-by-step learning |
| [radixdlt/scrypto-demos](https://github.com/radixdlt/scrypto-demos) | 3 ⭐ | Webinar demo code (archived) | Live-coded examples |
| [radixdlt/rola-examples](https://github.com/radixdlt/rola-examples) | 3 ⭐ | ROLA (Radix Off-Ledger Auth) examples (archived) | Authentication patterns |

### On-Chain Programs & Protocols

| Repository | Stars | Description | Key Content |
|-----------|-------|-------------|-------------|
| [radixdlt/Ignition](https://github.com/radixdlt/Ignition) | 10 ⭐ | Radix Ignition liquidity incentives | Production Scrypto for incentive distribution |
| [radixdlt/consultation_v2](https://github.com/radixdlt/consultation_v2) | 5 ⭐ | **CV2 Governance** — on-chain proposals + voting | What our CV2 integration reads from. Scrypto + React + Hono. |
| [radixdlt/layerzero](https://github.com/radixdlt/layerzero) | 0 ⭐ | LayerZero protocol in Scrypto | Cross-chain messaging patterns |

---

## 3. Community DeFi Projects — Open Source Scrypto Code

### DEX & AMM

| Repository | Stars | Project | What You Can Learn |
|-----------|-------|---------|-------------------|
| [ociswap/scrypto-math](https://github.com/ociswap/scrypto-math) | 11 ⭐ | **Ociswap** | Fixed-point math library for DeFi — reusable in any blueprint |
| [ociswap/radix-event-stream](https://github.com/ociswap/radix-event-stream) | 9 ⭐ | Ociswap | Rust library for handling Radix on-chain events — event indexing patterns |
| [ociswap/radix-client](https://github.com/ociswap/radix-client) | 6 ⭐ | Ociswap | Rust Gateway API client — alternative to our JS gateway.js |
| [ociswap/scrypto-avltree](https://github.com/ociswap/scrypto-avltree) | 6 ⭐ | Ociswap | AVL tree data structure for Scrypto — on-chain sorted collections |
| [ociswap/scrypto-testenv](https://github.com/ociswap/scrypto-testenv) | 5 ⭐ | Ociswap | Test environment utilities — testing patterns |
| [ociswap/pool](https://github.com/ociswap/pool) | 0 ⭐ | Ociswap | AMM pool blueprints |
| [ociswap/precision-pool](https://github.com/ociswap/precision-pool) | 0 ⭐ | Ociswap | Concentrated liquidity pool blueprints |
| [ociswap/oracle](https://github.com/ociswap/oracle) | 1 ⭐ | Ociswap | On-chain price oracle blueprint |
| [caviarnine/caviarnine-scrypto](https://github.com/caviarnine/caviarnine-scrypto) | 5 ⭐ | **CaviarNine** | CLMM (concentrated liquidity) blueprints |
| [caviarnine/cantex_sdk](https://github.com/caviarnine/cantex_sdk) | 20 ⭐ | CaviarNine | Cantex DEX SDK (Python) |

### Lending & DeFi Infrastructure

| Repository | Stars | Project | What You Can Learn |
|-----------|-------|---------|-------------------|
| [Lattic3-RDX/scrypto-packages](https://github.com/Lattic3-RDX/scrypto-packages) | 3 ⭐ | **Lattic3** | Multi-collateral lending platform blueprints |
| [Lattic3-RDX/lending-dapp](https://github.com/Lattic3-RDX/lending-dapp) | 2 ⭐ | Lattic3 | Full lending dApp (TypeScript frontend + Scrypto) |
| [root-finance/smart_contracts](https://github.com/root-finance/smart_contracts) | 1 ⭐ | **Root Finance** | Lending/borrowing smart contracts |
| [WeftFinance/blueprint-utils](https://github.com/WeftFinance/blueprint-utils) | 0 ⭐ | **Weft Finance** | Blueprint utility patterns |
| [WeftFinance/scrypto-builder](https://github.com/WeftFinance/scrypto-builder) | 0 ⭐ | Weft Finance | Docker image for Scrypto CI builds |
| [WeftFinance/test-engine](https://github.com/WeftFinance/test-engine) | 0 ⭐ | Weft Finance | Test engine utilities |

### Stablecoins, Staking & Protocols

| Repository | Stars | Project | What You Can Learn |
|-----------|-------|---------|-------------------|
| [Stabilis-Labs/DAOpensource](https://github.com/Stabilis-Labs/DAOpensource) | 3 ⭐ | **Stabilis Labs** | DAO governance blueprints |
| [Stabilis-Labs/STAB-Protocol](https://github.com/Stabilis-Labs/STAB-Protocol) | 2 ⭐ | Stabilis Labs | Stablecoin protocol blueprints |
| [Stabilis-Labs/flux-protocol](https://github.com/Stabilis-Labs/flux-protocol) | 2 ⭐ | Stabilis Labs | Flux protocol — DeFi infrastructure |
| [Stabilis-Labs/scrypto-advanced-staking](https://github.com/Stabilis-Labs/scrypto-advanced-staking) | 0 ⭐ | Stabilis Labs | Advanced staking blueprint for any fungible token |
| [Stabilis-Labs/STAB-oracle](https://github.com/Stabilis-Labs/STAB-oracle) | 0 ⭐ | Stabilis Labs | Price oracle blueprint |
| [Stabilis-Labs/metadata-setter-blueprint](https://github.com/Stabilis-Labs/metadata-setter-blueprint) | 1 ⭐ | Stabilis Labs | Metadata management pattern |

### NFT, Marketplace & Gaming

| Repository | Stars | Project | What You Can Learn |
|-----------|-------|---------|-------------------|
| [ripsource/OpenTrade](https://github.com/ripsource/OpenTrade) | 4 ⭐ | **Ripsource/Trove** | Decentralised NFT marketplace — royalty-enforced NFTs |
| [ripsource/soulstore](https://github.com/ripsource/soulstore) | 3 ⭐ | Ripsource | Soulbound proxy accounts linked to NFTs — novel ownership pattern |
| [ripsource/Outpost](https://github.com/ripsource/Outpost) | 2 ⭐ | Ripsource | Decentralised NFT ownership + peer-to-peer exchange suite |
| [Trove-Tools/Outpost](https://github.com/Trove-Tools/Outpost) | 0 ⭐ | Trove Tools | Open source NFT ownership/exchange blueprints |
| [ripsource/vote-on-ledger](https://github.com/ripsource/vote-on-ledger) | 1 ⭐ | Ripsource | On-ledger voting weighted by token holdings |

### DAO & Governance

| Repository | Stars | Project | What You Can Learn |
|-----------|-------|---------|-------------------|
| [EtherealDAO/ethereal-contracts](https://github.com/EtherealDAO/ethereal-contracts) | 8 ⭐ | **EtherealDAO** | DAO protocol Scrypto contracts |
| [ArcaneLabyrinth/arcane-blueprint](https://github.com/ArcaneLabyrinth/arcane-blueprint) | — | ArcaneLabyrinth | Secure decentralised voting system |

### Cross-Chain & Bridging

| Repository | Stars | Project | What You Can Learn |
|-----------|-------|---------|-------------------|
| [hyperlane-xyz/hyperlane-radix](https://github.com/hyperlane-xyz/hyperlane-radix) | 8 ⭐ | **Hyperlane** | Cross-chain messaging protocol in Scrypto |
| [Morpher-io/radix-oracle-contracts](https://github.com/Morpher-io/radix-oracle-contracts) | — | Morpher | Oracle contracts for external data feeds |
| [redstone-finance/radix-connector-demo](https://github.com/redstone-finance/radix-connector-demo) | — | RedStone | Oracle data feed connector demo |

### Token Launches & Utilities

| Repository | Stars | Project | What You Can Learn |
|-----------|-------|---------|-------------------|
| [nemster/radix_pump](https://github.com/nemster/radix_pump) | 0 ⭐ | nemster | Token marketplace (create, buy, sell) — bonding curve patterns |
| [nemster/flash_loan](https://github.com/nemster/flash_loan) | 1 ⭐ | nemster | Flash loan blueprint — atomic borrow/repay pattern |
| [nemster/fomo_staking](https://github.com/nemster/fomo_staking) | 1 ⭐ | nemster | Staking component for a fungible token |
| [nemster/tmbuilder](https://github.com/nemster/tmbuilder) | 1 ⭐ | nemster | Tool for building complex multi-step transaction manifests |
| [nemster/fund_manager](https://github.com/nemster/fund_manager) | 0 ⭐ | nemster | Fund management blueprint |
| [nemster/candy_dispenser](https://github.com/nemster/candy_dispenser) | 0 ⭐ | nemster | Token dispenser pattern |

---

## 4. Developer Tooling & Libraries

| Repository | Stars | Type | Description |
|-----------|-------|------|-------------|
| [ociswap/scrypto-math](https://github.com/ociswap/scrypto-math) | 11 ⭐ | Library | Fixed-point math library for Scrypto DeFi |
| [ociswap/radix-event-stream](https://github.com/ociswap/radix-event-stream) | 9 ⭐ | Library | Ergonomic Rust event handler for Radix on-chain events |
| [ociswap/radix-client](https://github.com/ociswap/radix-client) | 6 ⭐ | Library | Rust Gateway API client |
| [ociswap/scrypto-avltree](https://github.com/ociswap/scrypto-avltree) | 6 ⭐ | Library | AVL tree for on-chain sorted collections |
| [ociswap/scrypto-testenv](https://github.com/ociswap/scrypto-testenv) | 5 ⭐ | Testing | Test environment helpers for Scrypto |
| [ripsource/scrypto-dev-cli](https://github.com/ripsource/scrypto-dev-cli) | 1 ⭐ | CLI | Dev CLI — accounts, deployments, TS type generation |
| [WeftFinance/scrypto-builder](https://github.com/WeftFinance/scrypto-builder) | 0 ⭐ | CI/CD | Docker image for Scrypto package CI builds |
| [devmannic/scrypto_statictypes](https://github.com/devmannic/scrypto_statictypes) | 9 ⭐ | Library | Explicit container types for Scrypto — type safety |
| [pavlovanika/radix-zk-soundness-vault](https://github.com/pavlovanika/radix-zk-soundness-vault) | 18 ⭐ | Research | ZK-proof vault blueprint — privacy patterns |
| [ociswap/radix-verifiable-random-number](https://github.com/ociswap/radix-verifiable-random-number) | 0 ⭐ | Library | Verifiable random number generation for Radix |

---

## 5. Learning & Tutorials

| Repository / Resource | Stars | Description | Best For |
|----------------------|-------|-------------|----------|
| [klembee/Scrypto-Advent-Calendar](https://github.com/klembee/Scrypto-Advent-Calendar) | 28 ⭐ | **Scrypto Advent Calendar** — daily lessons building DeFi apps | Progressive learning: day 1 = basics, day 25 = complex DeFi |
| [klembee/Scrypto-Documentation](https://github.com/klembee/Scrypto-Documentation) | 6 ⭐ | Community Scrypto tutorial documentation | Accessible intro for non-Rustaceans |
| [radixdlt/gumball-club](https://github.com/radixdlt/gumball-club) | 7 ⭐ | End-to-end tutorial dApp | How to connect frontend to Scrypto |
| [radixdlt/official-examples](https://github.com/radixdlt/official-examples) | 9 ⭐ | Officially maintained examples | Guaranteed up-to-date patterns |
| [radixdlt/experimental-examples](https://github.com/radixdlt/experimental-examples) | 7 ⭐ | Experimental snippets and POCs | Cutting-edge patterns, may not be production-ready |
| [radixdlt/rola-examples](https://github.com/radixdlt/rola-examples) | 3 ⭐ | ROLA authentication examples | Wallet authentication integration |
| [hknio/l1-fuzzing-workshop](https://github.com/hknio/l1-fuzzing-workshop) | — | Layer 1 fuzzing workshop for Scrypto | Security testing and fuzzing techniques |

---

## 6. GitHub Search Queries for Finding More Scrypto Code

```bash
# Find all repos using Scrypto
GitHub: language:rust "use scrypto::prelude"

# Find blueprint definitions
GitHub: language:rust "#[blueprint]"

# Find NFT data patterns
GitHub: language:rust "ScryptoSbor" "NonFungibleData"

# Find on-chain storage patterns
GitHub: language:rust "KeyValueStore" "scrypto"

# Find event emission patterns
GitHub: language:rust "ScryptoEvent" "Runtime::emit_event"

# Find vault patterns
GitHub: language:rust "Vault::with_bucket" "scrypto"

# Find role-based auth patterns
GitHub: language:rust "enable_method_auth" "restrict_to"

# Find all Radix org repos
GitHub: org:radixdlt

# Find community projects using Scrypto
GitHub: topic:scrypto
```

---

## 7. Version Compatibility Notes

| Scrypto Version | Network | Notes |
|----------------|---------|-------|
| 1.3.x | Mainnet (current) | Our production code targets this |
| 1.2.x | Mainnet (compatible) | Previous stable, still works |
| 1.1.x | Mainnet (compatible) | Earlier Babylon release |
| 0.x | Olympia (deprecated) | Pre-Babylon, completely different API — do NOT reference |

> **Important**: Always check which Scrypto version external code targets. Pre-Babylon (0.x) code uses an entirely different API and is incompatible with current Radix Engine. Repos marked "archived" by radixdlt may target older versions.

---

## 8. Ecosystem at a Glance

```
Official (radixdlt/)
├── Core: radixdlt-scrypto (411⭐), babylon-node, babylon-gateway
├── SDKs: radix-dapp-toolkit (33⭐), radix-engine-toolkit (23⭐), typescript-ret (14⭐)
├── Wallets: babylon-wallet-ios (39⭐), babylon-wallet-android (16⭐)
├── Examples: community-scrypto-examples (95⭐), scrypto-challenges (67⭐), scrypto-examples (59⭐)
├── Protocols: Ignition (10⭐), consultation_v2 (5⭐), layerzero
└── Tools: create-radix-app, connector-extension, sargon

Community DeFi
├── DEX: Ociswap (11 repos), CaviarNine (2 repos)
├── Lending: Lattic3 (3 repos), Weft Finance (8 repos), Root Finance
├── Stablecoins: Stabilis Labs (10 repos) — STAB, Flux, DAOpensource
├── NFT: Ripsource (22 repos) — OpenTrade, Soulstore, Outpost
├── DAO: EtherealDAO (8⭐), ArcaneLabyrinth
├── Cross-chain: Hyperlane (8⭐), Morpher, RedStone
└── Utilities: nemster (14 repos) — flash loans, staking, pump, tmbuilder

Learning
├── Scrypto Advent Calendar (28⭐)
├── Klembee Scrypto Documentation (6⭐)
├── Gumball Club tutorial (7⭐)
└── Official + experimental examples (16⭐ combined)
```
