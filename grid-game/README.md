# 🎲 MEME GRID — Web3 Dice Game on Radix

> Roll the dice. Collect meme NFTs. Become the Meme Lord. 💎🐸🏆

MEME GRID is a standalone Web3 meme game built on the Radix network. Buy MEME coins with XRD, roll the dice to complete an 8×8 grid, earn legendary meme NFTs, and climb the ranks from Normie to Meme Lord.

## 🎮 How It Works

1. **Connect** your Radix wallet
2. **Buy MEME coins** — 1 XRD = 100 MEME 🪙
3. **Start a board** — 50 MEME for a fresh 8×8 grid
4. **Roll the dice** — 10 MEME per roll, reveal and complete cells
5. **Collect NFTs** — Earn meme NFTs at milestones and from special cells
6. **Level up** — Progress through 10 levels from Normie to Meme Lord

## 🎯 Cell Types

| Cell | Type | Effect |
|------|------|--------|
| ⬜ | Normal | Standard points |
| 🚀 | Double Score | 2× point reward |
| 🎁 | Extra Turn | Roll refunded! |
| 🃏 | Wild | Grants a wild card to pick any cell |
| 💀 | Rug Pull | Lose coins! Watch out! |
| 🐸 | Pepe Bonus | Chance to win an NFT |
| 💎 | Diamond | JACKPOT — huge rewards |
| 🌙 | Moon | Massive XP boost |

## 🏆 Levels

| Level | Name | XP Required | Emoji |
|-------|------|-------------|-------|
| 1 | Normie | 0 | 🤷 |
| 2 | Degen | 100 | 🎰 |
| 3 | Ape | 300 | 🦍 |
| 4 | Chad | 600 | 💪 |
| 5 | Whale | 1,000 | 🐋 |
| 6 | Diamond Hands | 2,000 | 💎 |
| 7 | Moon Boy | 4,000 | 🌙 |
| 8 | Gigachad | 8,000 | ⚡ |
| 9 | Legendary Degen | 16,000 | 👑 |
| 10 | Meme Lord | 32,000 | 🏆 |

## 🖼️ NFT Collection

Earn meme NFTs by playing! Rarities: Common → Uncommon → Rare → Epic → Legendary → Mythic

Includes: Wojak, Laser Eye Pepe, Golden Pepe, Chad Thundercock, Diamond Pepe, The One Pepe, and many more!

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Development

```bash
# Install dependencies
cd grid-game
npm install
cd server && npm install && cd ..

# Start the game server (port 4100)
cd server && npm run dev

# In another terminal, start the Next.js frontend (port 3001)
cd grid-game
npm run dev
```

### Production

```bash
# Build frontend
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DAPP_DEF` | (Radix Guild) | dApp definition address |
| `NEXT_PUBLIC_GAME_API_URL` | `http://localhost:4100/api` | Game server API URL |
| `NEXT_PUBLIC_NETWORK_ID` | `1` | Radix network (1=Mainnet, 2=Stokenet) |

Server env (in `server/`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4100` | Server port |
| `CORS_ORIGINS` | `http://localhost:3001` | Allowed origins |

## 🏗️ Architecture

```
grid-game/
├── src/                  # Next.js frontend
│   ├── app/             # Pages: /, /nfts, /leaderboard, /how-to-play
│   ├── components/      # UI components with cyberpunk styling
│   ├── hooks/           # useWallet, useGame
│   └── lib/             # Constants, utilities
├── server/              # Express.js game server
│   ├── index.js         # API server with SQLite
│   └── package.json
├── ecosystem.config.cjs  # PM2 deployment config
└── README.md
```

## 🛣️ Roadmap

- [ ] On-chain MEME token (buy with XRD via Scrypto component)
- [ ] On-chain NFT minting (real Radix NFTs)
- [ ] Multiplayer grid competitions
- [ ] Daily challenges and seasonal events
- [ ] Token staking for bonus rolls
- [ ] Guild integration for team play

## 📄 License

MIT — go wild, fren 🐸
