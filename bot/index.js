require("dotenv").config();
const { Bot } = require("grammy");

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) {
  console.error("Set TG_BOT_TOKEN in .env");
  process.exit(1);
}

const bot = new Bot(TOKEN);

const PORTAL = "https://156-67-219-105.sslip.io/guild";
const DAO = "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0";
const GITHUB = "https://github.com/bigdevxrd/radix-community-projects";
const BADGE_NFT = "resource_rdx1ntw34axdj0thqynn6lwl97q7uedkgj964el9ut9tu65sdmpx4lfd6x";

const users = new Map();

bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome to the Radix Guild!\n\n" +
    "One badge. All DAOs. One dashboard.\n\n" +
    "Commands:\n" +
    "/register <radix_address> - Link your wallet\n" +
    "/mint - Get a free Guild badge\n" +
    "/badge - View your badge info\n" +
    "/proposals - Active proposals\n" +
    "/bounties - Earn XRD\n" +
    "/portal - Open dashboard\n" +
    "/help - Show commands"
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Radix Guild Bot:\n\n" +
    "/register <address> - Link Radix wallet\n" +
    "/mint - Free Guild badge\n" +
    "/badge - Check badge (XP, level)\n" +
    "/proposals - Active proposals + vote\n" +
    "/bounties - Open bounties\n" +
    "/portal - Guild dashboard\n" +
    "/dao - CrumbsUp DAO\n" +
    "/source - GitHub\n\n" +
    "Portal: " + PORTAL
  );
});

bot.command("register", (ctx) => {
  const parts = ctx.message.text.split(" ");
  const address = parts[1];
  if (!address || !address.startsWith("account_rdx")) {
    return ctx.reply("Usage: /register account_rdx1...");
  }
  users.set(ctx.from.id, {
    radixAddress: address,
    username: ctx.from.username || ctx.from.first_name
  });
  ctx.reply(
    "Registered!\n\n" +
    "Address: " + address.slice(0, 35) + "...\n" +
    "User: " + (ctx.from.username || ctx.from.first_name) + "\n\n" +
    "Try /mint or /badge"
  );
});

bot.command("mint", (ctx) => {
  const user = users.get(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");
  ctx.reply(
    "Mint your free Guild badge:\n\n" +
    PORTAL + "/mint\n\n" +
    "Connect wallet, click Mint. Badge appears instantly."
  );
});

bot.command("badge", async (ctx) => {
  const user = users.get(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");

  try {
    const resp = await fetch("https://mainnet.radixdlt.com/state/entity/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [user.radixAddress],
        aggregation_level: "Vault",
        opt_ins: { non_fungible_include_nfids: true },
      }),
    });
    const data = await resp.json();
    const nfResources = data.items?.[0]?.non_fungible_resources?.items || [];
    const badgeRes = nfResources.find(r => r.resource_address === BADGE_NFT);

    if (!badgeRes) return ctx.reply("No Guild badge found. Try /mint");

    const nfIds = badgeRes.vaults?.items?.[0]?.items || [];
    if (nfIds.length === 0) return ctx.reply("No Guild badge found. Try /mint");

    const badgeResp = await fetch("https://mainnet.radixdlt.com/state/non-fungible/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_address: BADGE_NFT,
        non_fungible_ids: [nfIds[0]],
      }),
    });
    const badgeData = await badgeResp.json();
    const nft = badgeData.non_fungible_ids?.[0];
    if (!nft?.data?.programmatic_json?.fields) {
      return ctx.reply("Badge found but couldn't read data.");
    }

    const f = nft.data.programmatic_json.fields;
    const g = (i) => f[i]?.value || f[i]?.fields?.[0]?.value || "-";

    ctx.reply(
      "Your Guild Badge:\n\n" +
      "Name: " + g(0) + "\n" +
      "Tier: " + g(3) + "\n" +
      "Status: " + g(4) + "\n" +
      "XP: " + g(6) + "\n" +
      "Level: " + g(7) + "\n" +
      "ID: " + nfIds[0] + "\n\n" +
      "Details: " + PORTAL + "/explorer"
    );
  } catch (e) {
    ctx.reply("Error: " + e.message);
  }
});

bot.command("proposals", (ctx) => {
  ctx.reply(
    "Active Proposals:\n\n" +
    "1. Join the Radix Guild - ACTIVE\n" +
    "   Vote: " + DAO + "\n\n" +
    "All proposals: " + PORTAL + "/proposals"
  );
});

bot.command("bounties", (ctx) => {
  ctx.reply(
    "Open Bounties:\n\n" +
    "1. Getting Started tutorial - 50 XRD\n" +
    "2. Design Guild banner - 25 XRD\n" +
    "3. Create social posts - 25 XRD\n" +
    "4. Report a bug - 10 XRD\n" +
    "5. Translate README - 30 XRD\n\n" +
    "Claim: " + PORTAL + "/bounties"
  );
});

bot.command("portal", (ctx) => ctx.reply("Guild Portal:\n" + PORTAL));
bot.command("dao", (ctx) => ctx.reply("Guild DAO:\n" + DAO));
bot.command("source", (ctx) => ctx.reply("Source:\n" + GITHUB));

bot.on("message:text", (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    ctx.reply("Unknown command. Try /help");
  }
});

bot.start();
console.log("Radix Guild Bot running!");
