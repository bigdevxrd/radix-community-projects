require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) {
  console.error("Set TG_BOT_TOKEN in .env");
  process.exit(1);
}

const bot = new Bot(TOKEN);

// --- Config ---
const SIGN_URL = process.env.SIGN_URL || "https://156-67-219-105.sslip.io/guild/sign";
const PORTAL = "https://156-67-219-105.sslip.io/guild";
const DAO = "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0";
const GITHUB = "https://github.com/bigdevxrd/radix-community-projects";
const BADGE_NFT = "resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6";
const GATEWAY = "https://mainnet.radixdlt.com";

// --- Persistence (JSON file) ---
const USERS_FILE = path.join(__dirname, "users.json");

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error("Failed to load users:", e.message);
  }
  return new Map();
}

function saveUsers() {
  try {
    const obj = Object.fromEntries(users);
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error("Failed to save users:", e.message);
  }
}

const users = loadUsers();

// --- Helpers ---
function signUrl(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  return `${SIGN_URL}?${qs}`;
}

async function fetchBadgeData(address) {
  const resp = await fetch(`${GATEWAY}/state/entity/details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addresses: [address],
      aggregation_level: "Vault",
      opt_ins: { non_fungible_include_nfids: true },
    }),
  });
  const data = await resp.json();
  const nfResources = data.items?.[0]?.non_fungible_resources?.items || [];
  const badgeRes = nfResources.find((r) => r.resource_address === BADGE_NFT);
  if (!badgeRes) return null;

  const nfIds = badgeRes.vaults?.items?.[0]?.items || [];
  if (nfIds.length === 0) return null;

  const badgeResp = await fetch(`${GATEWAY}/state/non-fungible/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resource_address: BADGE_NFT,
      non_fungible_ids: [nfIds[0]],
    }),
  });
  const badgeData = await badgeResp.json();
  const nft = badgeData.non_fungible_ids?.[0];
  if (!nft?.data?.programmatic_json?.fields) return null;

  const f = nft.data.programmatic_json.fields;
  const g = (i) => f[i]?.value || f[i]?.fields?.[0]?.value || "-";

  return {
    id: nfIds[0],
    name: g(0),
    schema: g(1),
    tier: g(3),
    status: g(4),
    xp: g(6),
    level: g(7),
  };
}

// --- Commands ---

bot.command("start", (ctx) => {
  const kb = new InlineKeyboard()
    .url("Open Portal", PORTAL)
    .url("GitHub", GITHUB);

  ctx.reply(
    "Welcome to the Radix Guild!\n\n" +
      "One badge. All DAOs. One dashboard.\n\n" +
      "/register <address> — Link wallet\n" +
      "/mint — Get free badge\n" +
      "/badge — View your badge\n" +
      "/proposals — Active proposals\n" +
      "/bounties — Earn XRD\n" +
      "/stats — Network stats\n" +
      "/help — All commands",
    { reply_markup: kb }
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Radix Guild Bot\n\n" +
      "Badge:\n" +
      "  /register <address> — Link Radix wallet\n" +
      "  /mint — Mint free Guild badge\n" +
      "  /badge — Check badge (XP, tier, level)\n" +
      "  /lookup <nft_id> — Look up any badge\n\n" +
      "Governance:\n" +
      "  /proposals — Active proposals + vote\n" +
      "  /bounties — Open bounties\n\n" +
      "Info:\n" +
      "  /stats — Badge network stats\n" +
      "  /portal — Guild dashboard\n" +
      "  /dao — CrumbsUp DAO\n" +
      "  /source — GitHub repo"
  );
});

bot.command("register", (ctx) => {
  const parts = ctx.message.text.split(" ");
  const address = parts[1];
  if (!address || !address.startsWith("account_rdx")) {
    return ctx.reply("Usage: /register account_rdx1...");
  }
  users.set(String(ctx.from.id), {
    radixAddress: address,
    username: ctx.from.username || ctx.from.first_name,
    registeredAt: new Date().toISOString(),
  });
  saveUsers();

  const kb = new InlineKeyboard().url(
    "Mint Badge",
    signUrl("mint", { username: ctx.from.username || ctx.from.first_name })
  );

  ctx.reply(
    "Registered!\n\n" +
      `Address: ${address.slice(0, 20)}...${address.slice(-8)}\n` +
      `User: ${ctx.from.username || ctx.from.first_name}\n\n` +
      "Tap below to mint your badge, or use /badge to check status.",
    { reply_markup: kb }
  );
});

bot.command("mint", (ctx) => {
  const user = users.get(String(ctx.from.id));
  const username = user?.username || ctx.from.username || ctx.from.first_name || "guild_member";

  const kb = new InlineKeyboard().url(
    "Mint Guild Badge",
    signUrl("mint", { username })
  );

  ctx.reply(
    "Mint your free Guild badge:\n\n" +
      "1. Tap the button below\n" +
      "2. Connect your Radix Wallet\n" +
      "3. Approve the transaction\n\n" +
      "Your badge appears instantly on-chain.",
    { reply_markup: kb }
  );
});

bot.command("badge", async (ctx) => {
  const user = users.get(String(ctx.from.id));
  if (!user) return ctx.reply("Register first: /register account_rdx1...");

  try {
    const badge = await fetchBadgeData(user.radixAddress);
    if (!badge) {
      const kb = new InlineKeyboard().url(
        "Mint Badge",
        signUrl("mint", { username: user.username })
      );
      return ctx.reply("No Guild badge found.", { reply_markup: kb });
    }

    const kb = new InlineKeyboard().url(
      "View on Explorer",
      `${PORTAL}/explorer`
    );

    ctx.reply(
      "Your Guild Badge\n\n" +
        `Name: ${badge.name}\n` +
        `Tier: ${badge.tier}\n` +
        `Status: ${badge.status}\n` +
        `XP: ${badge.xp}\n` +
        `Level: ${badge.level}\n` +
        `ID: ${badge.id}`,
      { reply_markup: kb }
    );
  } catch (e) {
    ctx.reply("Error fetching badge: " + e.message);
  }
});

bot.command("lookup", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const nftId = parts[1];
  if (!nftId) return ctx.reply("Usage: /lookup #123#");

  try {
    const resp = await fetch(`${GATEWAY}/state/non-fungible/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_address: BADGE_NFT,
        non_fungible_ids: [nftId],
      }),
    });
    const data = await resp.json();
    const nft = data.non_fungible_ids?.[0];
    if (!nft?.data?.programmatic_json?.fields) {
      return ctx.reply("Badge not found.");
    }

    const f = nft.data.programmatic_json.fields;
    const g = (i) => f[i]?.value || f[i]?.fields?.[0]?.value || "-";

    ctx.reply(
      `Badge ${nftId}\n\n` +
        `Name: ${g(0)}\n` +
        `Schema: ${g(1)}\n` +
        `Tier: ${g(3)}\n` +
        `Status: ${g(4)}\n` +
        `XP: ${g(6)}\n` +
        `Level: ${g(7)}`
    );
  } catch (e) {
    ctx.reply("Error: " + e.message);
  }
});

bot.command("proposals", (ctx) => {
  const kb = new InlineKeyboard()
    .url("Vote on CrumbsUp", DAO)
    .row()
    .url("View All", `${PORTAL}/proposals`);

  // TODO: Replace with CrumbsUp API fetch
  ctx.reply(
    "Active Proposals\n\n" +
      "1. Join the Radix Guild — ACTIVE\n" +
      "   Vote via CrumbsUp DAO\n\n" +
      "Tap below to vote or view details.",
    { reply_markup: kb }
  );
});

bot.command("bounties", (ctx) => {
  const kb = new InlineKeyboard().url("View Bounties", `${PORTAL}/bounties`);

  // TODO: Replace with CrumbsUp API fetch
  ctx.reply(
    "Open Bounties\n\n" +
      "1. Getting Started tutorial — 50 XRD\n" +
      "2. Design Guild banner — 25 XRD\n" +
      "3. Create social posts — 25 XRD\n" +
      "4. Report a bug — 10 XRD\n" +
      "5. Translate README — 30 XRD\n\n" +
      "Total: 140 XRD available",
    { reply_markup: kb }
  );
});

bot.command("stats", async (ctx) => {
  try {
    const resp = await fetch(`${GATEWAY}/state/entity/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: [BADGE_NFT] }),
    });
    const data = await resp.json();
    const total = data.items?.[0]?.details?.total_supply || "?";

    ctx.reply(
      "Radix Guild Stats\n\n" +
        `Total badges minted: ${total}\n` +
        `Registered TG users: ${users.size}\n` +
        `Badge resource: ${BADGE_NFT.slice(0, 25)}...`
    );
  } catch (e) {
    ctx.reply("Error: " + e.message);
  }
});

bot.command("portal", (ctx) => {
  const kb = new InlineKeyboard().url("Open Portal", PORTAL);
  ctx.reply("Guild Portal", { reply_markup: kb });
});

bot.command("dao", (ctx) => {
  const kb = new InlineKeyboard().url("Open DAO", DAO);
  ctx.reply("Radix Guild on CrumbsUp", { reply_markup: kb });
});

bot.command("source", (ctx) => {
  const kb = new InlineKeyboard().url("GitHub", GITHUB);
  ctx.reply("Source code — MIT licensed", { reply_markup: kb });
});

bot.on("message:text", (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    ctx.reply("Unknown command. Try /help");
  }
});

bot.start();
console.log(`Radix Guild Bot running! ${users.size} users loaded.`);
