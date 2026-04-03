# Radix Community Projects

Community governance infrastructure for Radix. Open source, modular, composable.

**One badge. All DAOs. One dashboard.**

## Projects

| Project | Status | Description |
|---------|--------|-------------|
| [badge-manager](./badge-manager) | **Live on Mainnet** | Identity layer. Mint, manage, and track badges across DAOs |
| [dao-manager](./dao-manager) | Design | Multi-DAO registry. Join, view, and manage DAOs from one place |
| [grid-game](./grid-game) | Design | Gamified onboarding. Complete tasks, roll dice, earn XP, level up |
| [portal](./portal) | Design | Web3 dashboard. Connect wallet, see everything, contribute anywhere |
| [manager-spec](./manager-spec) | Draft | Shared interface spec. How managers discover and compose |

## Architecture

```
badge-manager (identity layer — LIVE on mainnet)
    |
    +-- dao-manager (multi-DAO aggregation)
    +-- grid-game (gamified engagement)
    +-- portal (unified web3 dashboard)
    +-- manager-spec (shared interfaces)
    |
    +-- [future] task-manager, rewards-manager, verification-manager
    +-- [future] security-manager, audit-manager, agent-manager
```

## Mainnet

Badge Manager is deployed on Radix mainnet. See [badge-manager/README.md](./badge-manager/README.md) for addresses.

## Contributing

Every project is open for contributions. Check the [issues board](https://github.com/bigdevxrd/radix-community-projects/issues) for tasks.

## License

MIT
