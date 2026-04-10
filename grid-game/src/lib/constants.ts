export const DAPP_DEF = process.env.NEXT_PUBLIC_DAPP_DEF || "account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq";
export const GAME_API = process.env.NEXT_PUBLIC_GAME_API_URL || "http://localhost:4100/api";
export const NETWORK_ID = parseInt(process.env.NEXT_PUBLIC_NETWORK_ID || "1");

// Level names and XP thresholds
export const LEVELS = [
  { level: 1, name: "Normie", xp: 0, emoji: "🤷" },
  { level: 2, name: "Degen", xp: 100, emoji: "🎰" },
  { level: 3, name: "Ape", xp: 300, emoji: "🦍" },
  { level: 4, name: "Chad", xp: 600, emoji: "💪" },
  { level: 5, name: "Whale", xp: 1000, emoji: "🐋" },
  { level: 6, name: "Diamond Hands", xp: 2000, emoji: "💎" },
  { level: 7, name: "Moon Boy", xp: 4000, emoji: "🌙" },
  { level: 8, name: "Gigachad", xp: 8000, emoji: "⚡" },
  { level: 9, name: "Legendary Degen", xp: 16000, emoji: "👑" },
  { level: 10, name: "Meme Lord", xp: 32000, emoji: "🏆" },
];

export const CELL_EMOJIS: Record<string, string> = {
  normal: "⬜", double_score: "🚀", extra_turn: "🎁", wild: "🃏",
  rug_pull: "💀", pepe_bonus: "🐸", diamond: "💎", moon: "🌙",
};

export const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af", uncommon: "#22c55e", rare: "#3b82f6",
  epic: "#a855f7", legendary: "#f59e0b", mythic: "#ef4444",
};

export const COIN_RATE = 100; // 1 XRD = 100 MEME coins
export const ROLL_COST = 10;  // cost per roll
export const BOARD_COST = 50; // cost for new board
