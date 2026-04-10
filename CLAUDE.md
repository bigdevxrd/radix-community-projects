# radix-community-projects — Radix Guild

## What This Is
Open-source DAO governance platform for the Radix community. Telegram bot (@rad_gov) + Next.js dashboard + REST API + on-chain Scrypto components.

## Critical Distinction
- **Governance** = SYSTEM (tech infrastructure, voting, on-chain)
- **Guild** = PEOPLE (members, contributions, community)
Never confuse these.

## Stack
- guild-app/: Next.js (TypeScript), port 3000 dev / 3002 prod
- bot/: Grammy TG bot + SQLite + REST API (port 3003)
- badge-manager/: Scrypto v1.3.1 (NFT badges, deployed mainnet)
- agent-tools/: OMX/OmO/Clawhip (zero-dep Node agent framework)

## Deploy
- CRITICAL: `npm run build` BEFORE `pm2 restart` for dashboard changes
- Script: `./scripts/deploy.sh [bot|dashboard|all]`

## Key Components
- 34 API endpoints (bot/services/api.js)
- CV2 on-chain governance sync (5-min poll)
- 75 automated tests (scripts/pipeline-test.js)
- Task marketplace with on-chain escrow
- Badge system, XP rewards, trust scoring, working groups

## On-Chain (Mainnet)
- Badge Manager: component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva
- TaskEscrow: component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r
- CV2 Governance: component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2
