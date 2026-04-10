# External Scrypto Repositories & Resources

> Catalog of official and community Scrypto repos for reference, learning, and code reuse.

---

## Official Radix Repositories

### Core

| Repository | Stars | Description | Key Content |
|-----------|-------|-------------|-------------|
| [radixdlt/radixdlt-scrypto](https://github.com/radixdlt/radixdlt-scrypto) | 411 ⭐ | **The Scrypto language itself** — compiler, runtime, standard library | `radix-engine/`, `scrypto/`, `scrypto-test/` crates. This is where `scrypto::prelude::*` comes from. |
| [radixdlt/babylon-node](https://github.com/radixdlt/babylon-node) | 31 ⭐ | Radix node software (embeds Radix Engine) | Node operation, Gateway API implementation |

### Examples & Learning

| Repository | Stars | Description | Key Content |
|-----------|-------|-------------|-------------|
| [radixdlt/community-scrypto-examples](https://github.com/radixdlt/community-scrypto-examples) | 95 ⭐ | **Community-contributed examples** | DeFi, NFT, DAO, game blueprints. Browse `basic/`, `defi/`, `nft/` folders. |
| [radixdlt/scrypto-challenges](https://github.com/radixdlt/scrypto-challenges) | 67 ⭐ | Competition entries from Scrypto challenges | Real-world blueprints across 7+ challenges |
| [radixdlt/scrypto-examples](https://github.com/radixdlt/scrypto-examples) | 59 ⭐ | Official example blueprints | Hello Token, Radiswap, etc. |
| [radixdlt/scrypto_tutorial](https://github.com/radixdlt/scrypto_tutorial) | 9 ⭐ | Tutorial code from developer events (archived) | Step-by-step learning |
| [radixdlt/scrypto-demos](https://github.com/radixdlt/scrypto-demos) | 3 ⭐ | Webinar demo code (archived) | Live-coded examples |
| [radixdlt/scrypto-starter](https://github.com/radixdlt/scrypto-starter) | 0 ⭐ | Minimal starter template | Clean starting point for new blueprints |

### Tools & Infrastructure

| Repository | Stars | Description | Key Content |
|-----------|-------|-------------|-------------|
| [radixdlt/create-radix-app](https://github.com/radixdlt/create-radix-app) | 5 ⭐ | Starter template for JS + Scrypto dApp | Full dApp scaffold with frontend + Scrypto |
| [radixdlt/layerzero](https://github.com/radixdlt/layerzero) | 0 ⭐ | LayerZero protocol implementation in Scrypto | Cross-chain messaging patterns |

---

## Community Repositories

| Repository | Description | Key Content |
|-----------|-------------|-------------|
| [pavlovanika/radix-zk-soundness-vault](https://github.com/pavlovanika/radix-zk-soundness-vault) | ZK-proof vault blueprint (18 ⭐) | Privacy patterns, ZK integration |
| [devmannic/scrypto_statictypes](https://github.com/devmannic/scrypto_statictypes) | Static type wrappers for Scrypto (9 ⭐) | Type safety patterns |

---

## Key DeFi Projects on Radix (Scrypto-based)

These projects have published Scrypto code or are known to use it:

| Project | Type | Notes |
|---------|------|-------|
| Ociswap | DEX | AMM blueprints, LP tokens |
| CaviarNine | DEX / Concentrated Liquidity | CLMM blueprints |
| Astrolescent | Aggregator | Router blueprints |
| DefiPlaza | DEX | Multi-pair AMM |
| Weft Finance | Lending | Lending pool blueprints |
| IkiHQ | NFT Marketplace | NFT trading blueprints |
| HUG Token | Meme Token | Simple token blueprint |
| CrumbsUp | DAO Governance | DAO tooling |
| Muan Protocol | DAO Infrastructure | Governance infrastructure |

---

## Documentation Resources

| Resource | URL | Content |
|----------|-----|---------|
| **Scrypto Docs** | https://docs.radixdlt.com/docs/scrypto | Official Scrypto documentation |
| **Radix Learn** | https://learn.radixdlt.com | Tutorials and guides |
| **Radix Dashboard** | https://dashboard.radixdlt.com | Deploy packages, send transactions |
| **Radix Explorer** | https://radixscan.io | View on-chain state |
| **Gateway API Docs** | https://docs.radixdlt.com/docs/gateway-api | REST API for reading on-chain data |
| **RTM Specification** | https://docs.radixdlt.com/docs/transaction-manifest | Transaction manifest language reference |
| **SBOR Spec** | https://docs.radixdlt.com/docs/sbor | Scrypto binary object representation |
| **Radix Developer Discord** | https://discord.gg/radixdlt | Community support |
| **RadixTalk Forum** | https://radixtalk.com | Community discussion |

---

## Repos to Watch for Scrypto Code

These repositories may contain Scrypto examples or patterns worth cataloging:

```
# Search queries for finding more Scrypto code
GitHub: language:rust "use scrypto::prelude"
GitHub: language:rust "#[blueprint]"
GitHub: language:rust "ScryptoSbor" "NonFungibleData"
GitHub: language:rust "KeyValueStore" "scrypto"
```

---

## Version Compatibility Notes

| Scrypto Version | Network | Notes |
|----------------|---------|-------|
| 1.3.x | Mainnet (current) | Our production code targets this |
| 1.2.x | Mainnet (compatible) | Previous stable, still works |
| 1.1.x | Mainnet (compatible) | Earlier Babylon release |
| 0.x | Olympia (deprecated) | Pre-Babylon, completely different API |

> **Important**: Always check which Scrypto version external code targets. Pre-Babylon (0.x) code is incompatible with current Radix Engine.
