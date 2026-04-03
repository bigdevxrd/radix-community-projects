# Radix Guild — Transaction Signing Page

Lightweight bridge between Telegram bot and Radix Wallet. Single HTML file, no build step.

## How It Works

1. TG bot generates a URL with action params
2. User taps inline button → opens this page
3. Page connects Radix Wallet via Dapp Toolkit
4. Transaction manifest built from URL params
5. Wallet signs → TX submitted → result shown

## Supported Actions

| Action | Params | Description |
|--------|--------|-------------|
| `mint` | `username` | Mint free Guild badge |
| `vote` | `proposal`, `choice` | Vote on proposal (WIP) |
| `update_xp` | `badge_id`, `xp` | Update badge XP (admin) |
| `update_tier` | `badge_id`, `tier` | Update badge tier (admin) |

## Example URLs

```
/sign?action=mint&username=alice
/sign?action=update_xp&badge_id=%23123%23&xp=500
```

## Deploy

Copy `index.html` to VPS. No dependencies, no build step.
