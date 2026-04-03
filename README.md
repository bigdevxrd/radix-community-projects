# Radix Community Projects

Community governance infrastructure for Radix. Open source, modular, composable.

**One badge. All DAOs. One dashboard.**

## Projects

| Project | Status | Description |
|---------|--------|-------------|
| [badge-manager](./badge-manager) | Phase 1 — Building | Identity layer. Mint, manage, and track badges across DAOs |
| [dao-manager](./dao-manager) | Phase 2 — Design | Multi-DAO registry. Join, view, and manage DAOs from one place |
| [grid-game](./grid-game) | Phase 3 — Design | Gamified onboarding. Complete tasks, roll dice, earn XP, level up |
| [portal](./portal) | Phase 2 — Design | Web3 dashboard. Connect wallet, see everything, contribute anywhere |
| [manager-spec](./manager-spec) | Phase 1 — Draft | Shared interface spec. How managers discover and compose |

## Architecture

```
badge-manager (identity layer — all others depend on this)
    |
    +-- dao-manager (multi-DAO aggregation)
    +-- grid-game (gamified engagement)
    +-- portal (unified web3 dashboard)
    +-- manager-spec (shared interfaces)
    |
    +-- [future] task-manager, rewards-manager, verification-manager
    +-- [future] security-manager, audit-manager, agent-manager
```

## Phases

1. **Badge Manager MVP** — Deploy to mainnet, free badge on signup
2. **DAO Manager + Portal** — Multi-DAO view, proposals, voting
3. **Grid Game** — Gamified tasks, XP, levels, achievement NFTs
4. **Public Launch** — Wild release, community contributions
5. **Organic Growth** — Self-sustaining services, node operations, community perks

## Contributing

Every project is open for contributions. Check the [issues board](https://github.com/bigdevxrd/radix-community-projects/issues) for tasks.

## License

MIT
