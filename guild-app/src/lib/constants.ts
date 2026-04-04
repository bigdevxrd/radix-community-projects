// Single source of truth for all addresses and config

export const DAPP_DEF =
  process.env.NEXT_PUBLIC_DAPP_DEF ||
  "account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq";

export const GATEWAY = "https://mainnet.radixdlt.com";

export const MANAGER =
  process.env.NEXT_PUBLIC_MANAGER ||
  "component_rdx1cz0fkhg86y33afk5jztxeqdxjz6hhzexla7u8fkrwfx5ekn3xdlf3u";

export const BADGE_NFT =
  process.env.NEXT_PUBLIC_BADGE_NFT ||
  "resource_rdx1ntxy3j2zclysyr99h3ayrvh92h0rhy3tmmwst9j4r8akeaj4u0qcn4";

export const ADMIN_BADGE =
  process.env.NEXT_PUBLIC_ADMIN_BADGE ||
  "resource_rdx1t4qyd9hwyk6rpt4006fysaw68lkuy7almctwppvw7j9m8cqvzgn6ea";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://156-67-219-105.sslip.io/api";

export const SCHEMAS: Record<string, SchemaConfig> = {
  guild_member: {
    manager: MANAGER,
    badge: BADGE_NFT,
    adminBadge: ADMIN_BADGE,
    tiers: ["member", "contributor", "builder", "steward", "elder"],
    freeMint: true,
  },
  guild_role: {
    manager: "component_rdx1crh7qlan0yuwrf8wkq7vg7tkrc6w3ftr00qqf4auktqv2uuwwg8lut",
    badge: "resource_rdx1ntr6ye27zlyg2m06r90cletnwlzpedcv6yl0rhve64pp8prg0tw65e",
    adminBadge: "",
    tiers: ["admin", "moderator", "contributor"],
    freeMint: false,
  },
};

export interface SchemaConfig {
  manager: string;
  badge: string;
  adminBadge: string;
  tiers: string[];
  freeMint: boolean;
}

export const TIER_COLORS: Record<string, string> = {
  member: "var(--tier-member)",
  contributor: "var(--tier-contributor)",
  builder: "var(--tier-builder)",
  steward: "var(--tier-steward)",
  elder: "var(--tier-elder)",
  admin: "var(--tier-elder)",
  moderator: "var(--tier-steward)",
};

export const XP_THRESHOLDS: Record<string, number> = {
  member: 0,
  contributor: 100,
  builder: 500,
  steward: 2000,
  elder: 10000,
};

export const ROYALTIES = {
  mint: 1,
  revoke: 0.5,
  update_tier: 0.25,
  update_xp: 0.1,
  update_extra_data: 0.1,
};
