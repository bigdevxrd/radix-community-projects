# Grid Game — Full Visual Spec

## Core Concept

A grid board game where governance actions earn dice rolls. Complete cells, rows, and columns to earn XP bonuses and collectible NFTs. Each badge holder has their own persistent game board.

## How It Connects to Governance

```
Governance Action → Earn Roll → Play Grid → Win Rewards
  Vote on proposal     1 roll     Complete cells     XP bonus
  Submit PR            1 roll     Bonus cells        Extra turns
  Complete bounty      2 rolls    Wild cards         Free completions
  7-day streak         3 rolls    Full row/col       Big XP bonus
  Verify work          1 roll     Complete grid      SVGenesis NFT drop
```

## Game Mechanics (from working prototype)

### The Board
- Grid of cells (6x6 mini, 10x10 easy, 20x20 hard)
- Each cell starts EMPTY → IN_PROGRESS → COMPLETED
- Takes 2 hits to complete a cell (empty→progress, progress→complete)

### Cell Types
| Cell | Symbol | Effect |
|------|--------|--------|
| Empty | · | Normal — 2 hits to complete |
| In Progress | ◐ | One more hit to complete |
| Completed | ✓ | Done — earns points |
| Double Points | ★ | Bonus: double completion points |
| Extra Turn | ⚡ | Bonus: free roll (no point cost) |
| Wild Card | ♦ | Bonus: complete any cell of your choice |
| Penalty | ✗ | Hazard: -10 points |

### Scoring
- Starting score: 30 points (varies by difficulty)
- Each roll costs 1 point (except free turns)
- Completing a cell: +10 points
- Completing a row: bonus XP
- Completing a column: bonus XP
- Completing entire grid: massive bonus + NFT drop
- Score ≥ 100: penalty cells appear (adds risk)

### Difficulty Levels
| Level | Grid | Start Score | Bonus Frequency |
|-------|------|-------------|-----------------|
| Mini | 6×6 | 30 | 35% bonus cells |
| Easy | 10×10 | 30 | 25% bonus cells |
| Medium | 20×20 | 50 | 15% bonus cells |
| Hard | 20×20 | 30 | 3% bonus cells |

## Game State Storage

### SQLite (current — MVP)
```sql
-- Already exists:
game_state (radix_address, total_rolls, total_bonus_xp, streak, jackpots)

-- New for visual grid:
game_boards (
  radix_address TEXT,
  difficulty TEXT,
  grid TEXT,          -- JSON 2D array
  score INTEGER,
  turn_count INTEGER,
  extra_turns INTEGER,
  wild_cells INTEGER,
  status TEXT,        -- active/completed
  created_at INTEGER,
  completed_at INTEGER
)
```

### On-chain (Phase 5 — via badge extra_data)
```json
{
  "grids_completed": 3,
  "best_score": 247,
  "total_rolls": 156,
  "nfts_earned": ["svgenesis_grid_champion_001"]
}
```

## SVGenesis NFT Rewards

When a player completes an entire grid:
- Mint an SVGenesis achievement NFT via BadgeFactory
- Schema: `guild_achievement`
- Tiers based on difficulty: mini_champion / easy_champion / medium_champion / hard_champion
- Visual: generated SVG with grid pattern, player name, completion stats

## Implementation Plan

### Phase A: Game Page (Next.js) — 2-3 days
- `/guild/game` page with visual grid board
- Renders from `/api/game/board/:address`
- Click "Roll" → shows dice animation → cell highlight
- Color-coded cells (empty/progress/complete/bonus/penalty)
- Score, turns, wild cards display
- Difficulty selector

### Phase B: Game API — 1 day
- `POST /api/game/new` — create new board
- `POST /api/game/roll` — take a turn (requires auth)
- `POST /api/game/wild` — use wild card on specific cell
- `GET /api/game/board/:address` — get current board state

### Phase C: Governance Integration — 1 day
- Hook into existing `queueXpReward()` — each call = 1 game roll
- Bounty completion = 2 rolls
- Streak bonuses = extra rolls
- Track rolls earned vs rolls spent

### Phase D: NFT Rewards — 1 week
- New `guild_achievement` schema via BadgeFactory
- SVGenesis SVG generation for achievement badges
- Auto-mint on grid completion
- Display in `/badges` profile

## Architecture

```
Dashboard (/guild/game)
     │
     ├── GET /api/game/board/:address → render grid
     ├── POST /api/game/roll → take turn (costs 1 roll)
     └── POST /api/game/wild → use wild card
          │
          └── game_boards table (SQLite)
               │
               └── Rolls earned from governance actions
                    (queueXpReward already tracks this)
```

## What Copilot Can Build

1. **Game board API** — `/api/game/board`, `/api/game/roll`, `/api/game/wild`
2. **Game page component** — `/guild/game` with grid renderer
3. **SVGenesis NFT generator** — SVG template for achievements
