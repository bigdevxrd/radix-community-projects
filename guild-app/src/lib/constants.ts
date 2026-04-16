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
  "https://radixguild.com/api";

export const TG_BOT_URL = "https://t.me/rad_gov";

// CV2 Governance Component (on-chain)
export const CV2_COMPONENT =
  process.env.NEXT_PUBLIC_CV2_COMPONENT ||
  "component_rdx1cqj99hx2rdx04mrdvd3am7wcenh6c26m2w5uzv8vkv9pudveqzy7d2";

// TaskEscrow (on-chain) — XRD locked in Scrypto vaults, no admin custody
export const ESCROW_COMPONENT =
  process.env.NEXT_PUBLIC_ESCROW_COMPONENT ||
  "component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r";

export const ESCROW_RECEIPT =
  process.env.NEXT_PUBLIC_ESCROW_RECEIPT ||
  "resource_rdx1thyxus6dhqnd0zs0rvswlxrde3j9rcj8f79f0qsw9vcwf2zxgv6j2r";

export const ESCROW_PACKAGE =
  process.env.NEXT_PUBLIC_ESCROW_PACKAGE ||
  "package_rdx1p5m3z284wgnck2cwqs3nayh74c4qkghjrra76mq0azphxmsnhhcvtl";

// TaskEscrow V3 (multi-token) — accepts XRD, xUSDC, xUSDT
// Legacy V3 addresses (superseded by V3-live below)
export const ESCROW_V3_LEGACY_COMPONENT = "component_rdx1cpdkaf87pdpfct4v0y85ddpylpfscq9n0ysfusfwe2k3phzsfejm5a";
export const ESCROW_V3_LEGACY_PACKAGE = "package_rdx1pkaw78wcf36838s69rzmdfq030yethlyydea0uq0p8dg60uufej3f4";

// TaskEscrow V3 — LIVE on mainnet (deployed 2026-04-16)
export const ESCROW_V3_PACKAGE =
  process.env.NEXT_PUBLIC_ESCROW_V3_PACKAGE ||
  "package_rdx1pktaswcn8dgjk8c9h56djvay2f0c95lyfepmt6q8722n4xtjt3mlda";

export const ESCROW_V3_COMPONENT =
  process.env.NEXT_PUBLIC_ESCROW_V3_COMPONENT ||
  "component_rdx1czcjn322rhzvu4gwkculx6qvguv2erqu38mschwqkjyqtdpvpcex9s";

export const ESCROW_V3_RECEIPT =
  process.env.NEXT_PUBLIC_ESCROW_V3_RECEIPT ||
  "resource_rdx1ngsnu7l5y6lc32vfg9yhrhdpftgv02c5wcuaazqd7l6zm9576hu09y";

// ConvictionVoting (CV3) — time-weighted fund allocation
export const CV3_COMPONENT =
  process.env.NEXT_PUBLIC_CV3_COMPONENT ||
  "component_rdx1cz97d534phmngxhal9l87a2p63c97n6tr6q3j6l290ckjnlhya0cvf";

export const CV3_PACKAGE =
  process.env.NEXT_PUBLIC_CV3_PACKAGE ||
  "package_rdx1phayeasgc8qujp4l380hsnqn9jrcppltp8se2g8nac32njl3029lcy";

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
  { label: "Vote on Proposals", href: TG_BOT_URL, desc: "Open TG bot", external: true },
  { label: "View Proposals", href: "/proposals", desc: "Live results", external: false },
  { label: "Manage Badges", href: "/admin", desc: "Admin panel", external: false },
];

export const RESOURCES = [
  { name: "GitHub", url: "https://github.com/bigdevxrd/radix-community-projects", desc: "Source code (MIT)" },
  { name: "Charter", url: "https://radix.wiki/ideas/radix-network-dao-charter", desc: "DAO Charter draft" },
  { name: "Guild Discourse", url: "https://radix-guild.discourse.group", desc: "Discussion forum" },
  { name: "MVD Discussion", url: "https://radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258", desc: "Minimum Viable DAO" },
];
