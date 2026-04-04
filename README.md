# Radix Community Projects

Community governance infrastructure for Radix. Open source, modular, composable.

**One badge. All DAOs. Manage from Telegram.**

## Architecture

```
Telegram Bot (primary UX)
  ├── READ: badge info, proposals, stats via Gateway API
  ├── WRITE: inline buttons → signing page → Radix Wallet
  └── CONFIRM: polls Gateway for TX result

Signing Page (transaction bridge)
  ├── Single HTML, no build step
  ├── Radix Dapp Toolkit
  └── Pre-built manifests (mint, vote, XP update)

Badge Manager (on-chain, Scrypto)
  ├── Live on Radix mainnet
  ├── Identity, XP, tiers, levels
  └── Component royalties enabled
```

## Projects

| Project | Status | Description |
|---------|--------|-------------|
| [badge-manager](./badge-manager) | **Live on Mainnet** | Scrypto identity layer. Mint, manage, track badges |
| [bot](./bot) | **Active** | Telegram bot. Badge management + governance from chat |
| [sign](./sign) | **Active** | Transaction signing page. Bridge between TG and Radix Wallet |
| [portal](./portal) | Minimal | Web3 dashboard. Explorer + signing support |
| [manager-spec](./manager-spec) | Draft | Shared interface spec for composable managers |
| [docs](./docs) | Reference | Architecture docs, guild proposal, business case |

## Quick Start

```bash
# Bot
cd bot && npm install
echo "TG_BOT_TOKEN=your_token" > .env
npm start

# Signing page — just serve the HTML
cd sign && python3 -m http.server 8080
```

## Mainnet Addresses

| Resource | Address |
|----------|---------|
| Package | `package_rdx1p5cs9vt3skd6zyvld9xfe54fqhshnu6zt5demv09l0prrvlqjwzvwu` |
| Manager | `component_rdx1cz0fkhg86y33afk5jztxeqdxjz6hhzexla7u8fkrwfx5ekn3xdlf3u` |
| Badge NFT | `resource_rdx1ntxy3j2zclysyr99h3ayrvh92h0rhy3tmmwst9j4r8akeaj4u0qcn4` |

## Contributing

Check the [issues board](https://github.com/bigdevxrd/radix-community-projects/issues) for tasks.

## License

MIT
