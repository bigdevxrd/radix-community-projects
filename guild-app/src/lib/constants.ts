// Single source of truth for all addresses, config, and ecosystem links

export const DAPP_DEF =
  process.env.NEXT_PUBLIC_DAPP_DEF ||
  "account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq";

export const GATEWAY = "https://mainnet.radixdlt.com";

export const MANAGER =
  process.env.NEXT_PUBLIC_MANAGER ||
  "component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva";

export const BADGE_NFT =
  process.env.NEXT_PUBLIC_BADGE_NFT ||
  "resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl";

export const ADMIN_BADGE =
  process.env.NEXT_PUBLIC_ADMIN_BADGE ||
  "resource_rdx1tkkzwrttvsqrsylyf4nqt2fxq6h27eva4lr4ffwad63x3f2cl43xwe";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://72-62-195-141.sslip.io/api";

// CV2 Governance Component (on-chain)
export const CV2_COMPONENT =
  process.env.NEXT_PUBLIC_CV2_COMPONENT ||
  "component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2";

// ── Schemas ──

export interface SchemaConfig {
  manager: string;
  badge: string;
  adminBadge: string;
  tiers: string[];
  freeMint: boolean;
}

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

// ── Tier Colors (CSS variable references) ──
// BUG FIX: was var(--c-tier-*), CSS defines --g-tier-*

export const TIER_COLORS: Record<string, string> = {
  member: "var(--guild-tier-member)",
  contributor: "var(--guild-tier-contributor)",
  builder: "var(--guild-tier-builder)",
  steward: "var(--guild-tier-steward)",
  elder: "var(--guild-tier-elder)",
  admin: "var(--guild-tier-elder)",
  moderator: "var(--guild-tier-steward)",
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

// ── Ecosystem Links (edit these arrays to add/remove integrations) ──

export interface EcosystemLink {
  name: string;
  desc: string;
  url: string;
  pill: string;
  status: string;
}

export const ECOSYSTEM_LINKS: EcosystemLink[] = [
  { name: "RadixTalk", desc: "Community forum", url: "https://radixtalk.com", pill: "g-pill-blue", status: "Link" },
  { name: "Radix Wiki", desc: "DAO Charter + ecosystem", url: "https://radix.wiki/ecosystem", pill: "g-pill-blue", status: "Link" },
  { name: "CrumbsUp", desc: "Guild DAO governance", url: "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0", pill: "g-pill-green", status: "Active" },
  { name: "Muan Protocol", desc: "DAO infrastructure", url: "https://muanprotocol.com", pill: "g-pill-yellow", status: "Pending" },
  { name: "Consultation v2", desc: "On-chain governance", url: "https://consultation.radixdlt.com", pill: "g-pill-yellow", status: "Planned" },
  { name: "Astra AI", desc: "Astrolescent assistant", url: "https://astrolescent.com", pill: "g-pill-purple", status: "Planned" },
];

export const QUICK_ACTIONS = [
  { label: "Vote on Proposals", href: "https://t.me/rad_gov", desc: "Open TG bot", external: true },
  { label: "View Proposals", href: "/proposals", desc: "Live results", external: false },
  { label: "Manage Badges", href: "/admin", desc: "Admin panel", external: false },
];

export const RESOURCES = [
  { name: "GitHub", url: "https://github.com/bigdevxrd/radix-community-projects", desc: "Source code (MIT)" },
  { name: "Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter", desc: "DAO Charter draft" },
  { name: "Guild Discourse", url: "https://radix-guild.discourse.group", desc: "Discussion forum" },
  { name: "MVD Discussion", url: "https://radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258", desc: "Minimum Viable DAO" },
];
