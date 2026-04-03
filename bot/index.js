require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const db = require("./db");
const { hasBadge, getBadgeData } = require("./services/gateway");

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) { console.error("Set TG_BOT_TOKEN in .env"); process.exit(1); }

// Init database
db.init();

const bot = new Bot(TOKEN);

const PORTAL = "https://156-67-219-105.sslip.io/dao";
const DAO_URL = "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0";
const GITHUB = "https://github.com/bigdevxrd/radix-community-projects";

// ── /start ──────────────────────────────────────────────

bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome to the Radix Guild!\n\n" +
    "One badge. All DAOs. Governed from Telegram.\n\n" +
    "Get started:\n" +
    "1. /register <your_account_rdx1...>\n" +
    "2. Mint your badge: " + PORTAL + "\n" +
    "3. /propose and /vote on proposals\n\n" +
    "Commands: /help"
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Radix Guild Bot\n\n" +
    "/register <address> - Link your Radix wallet\n" +
    "/badge - Check your badge (tier, XP)\n" +
    "/propose <title> - Create a proposal (badge required)\n" +
    "/proposals - List active proposals\n" +
    "/results <id> - Vote counts for a proposal\n" +
    "/mint - Get a free Guild badge\n" +
    "/dao - Open Guild DAO\n" +
    "/help - This message"
  );
});

// ── /register ───────────────────────────────────────────

bot.command("register", (ctx) => {
  const parts = ctx.message.text.split(" ");
  const address = parts[1];
  if (!address || !address.startsWith("account_rdx")) {
    return ctx.reply("Usage: /register account_rdx1...");
  }
  db.registerUser(ctx.from.id, address, ctx.from.username || ctx.from.first_name);
  ctx.reply(
    "Registered!\n\n" +
    "Address: " + address.slice(0, 30) + "...\n\n" +
    "Now mint your badge: " + PORTAL + "\n" +
    "Then try /badge to check it."
  );
});

// ── /badge ──────────────────────────────────────────────

bot.command("badge", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");

  const badge = await getBadgeData(user.radix_address);
  if (!badge) {
    return ctx.reply("No Guild badge found.\nMint one: " + PORTAL);
  }

  ctx.reply(
    "Your Guild Badge\n\n" +
    "Name: " + badge.issued_to + "\n" +
    "Tier: " + badge.tier + "\n" +
    "XP: " + badge.xp + "\n" +
    "Level: " + badge.level + "\n" +
    "Status: " + badge.status + "\n" +
    "ID: " + badge.id
  );
});

// ── /propose ────────────────────────────────────────────

bot.command("propose", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");

  const has = await hasBadge(user.radix_address);
  if (!has) return ctx.reply("You need a Guild badge to propose.\nMint one: " + PORTAL);

  const title = ctx.message.text.replace(/^\/propose\s*/, "").trim();
  if (!title) return ctx.reply("Usage: /propose Your proposal title here");

  const proposalId = db.createProposal(title, ctx.from.id, 7, 3);
  const counts = db.getVoteCounts(proposalId);

  const keyboard = new InlineKeyboard()
    .text("For (" + counts.for + ")", "vote_" + proposalId + "_for")
    .text("Against (" + counts.against + ")", "vote_" + proposalId + "_against");

  const endsDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const msg = await ctx.reply(
    "Proposal #" + proposalId + "\n\n" +
    title + "\n\n" +
    "By: @" + (ctx.from.username || ctx.from.first_name) + "\n" +
    "Ends: " + endsDate + "\n" +
    "Min votes: 3",
    { reply_markup: keyboard }
  );

  db.updateProposalMessage(proposalId, msg.message_id, ctx.chat.id);
});

// ── Inline vote handler ─────────────────────────────────

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("vote_")) return;

  const parts = data.split("_");
  const proposalId = parseInt(parts[1]);
  const voteChoice = parts[2]; // "for" or "against"

  // Check user registered
  const user = db.getUser(ctx.from.id);
  if (!user) {
    return ctx.answerCallbackQuery({ text: "Register first: /register <account_rdx1...>", show_alert: true });
  }

  // Check proposal exists and is active
  const proposal = db.getProposal(proposalId);
  if (!proposal || proposal.status !== "active") {
    return ctx.answerCallbackQuery({ text: "Proposal is not active.", show_alert: true });
  }

  // Check expiry
  if (Date.now() / 1000 > proposal.ends_at) {
    db.closeProposal(proposalId, "expired");
    return ctx.answerCallbackQuery({ text: "Voting has ended.", show_alert: true });
  }

  // Check badge
  const has = await hasBadge(user.radix_address);
  if (!has) {
    return ctx.answerCallbackQuery({ text: "You need a Guild badge to vote. Mint one at " + PORTAL, show_alert: true });
  }

  // Record vote
  const result = db.recordVote(proposalId, ctx.from.id, user.radix_address, voteChoice);
  if (!result.ok) {
    if (result.error === "already_voted") {
      return ctx.answerCallbackQuery({ text: "You already voted on this proposal.", show_alert: true });
    }
    return ctx.answerCallbackQuery({ text: "Error: " + result.error, show_alert: true });
  }

  // Update vote counts in the message
  const counts = db.getVoteCounts(proposalId);
  const keyboard = new InlineKeyboard()
    .text("For (" + counts.for + ")", "vote_" + proposalId + "_for")
    .text("Against (" + counts.against + ")", "vote_" + proposalId + "_against");

  try {
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  } catch (e) {
    // Message might not be editable (e.g. in forwarded context)
  }

  ctx.answerCallbackQuery({ text: "Vote recorded: " + voteChoice });
});

// ── /proposals ──────────────────────────────────────────

bot.command("proposals", (ctx) => {
  db.closeExpiredProposals();
  const active = db.getActiveProposals();
  if (active.length === 0) {
    return ctx.reply("No active proposals.\n\nCreate one: /propose Your idea here");
  }

  let text = "Active Proposals:\n\n";
  active.forEach((p) => {
    const counts = db.getVoteCounts(p.id);
    const ends = new Date(p.ends_at * 1000).toISOString().slice(0, 10);
    text += "#" + p.id + " " + p.title + "\n";
    text += "  For: " + counts.for + " | Against: " + counts.against + " | Ends: " + ends + "\n\n";
  });

  ctx.reply(text);
});

// ── /results ────────────────────────────────────────────

bot.command("results", (ctx) => {
  const parts = ctx.message.text.split(" ");
  const id = parseInt(parts[1]);
  if (!id) return ctx.reply("Usage: /results <proposal_id>");

  const proposal = db.getProposal(id);
  if (!proposal) return ctx.reply("Proposal not found.");

  const counts = db.getVoteCounts(id);
  const total = counts.for + counts.against;
  const pctFor = total > 0 ? Math.round((counts.for / total) * 100) : 0;

  ctx.reply(
    "Proposal #" + id + ": " + proposal.title + "\n\n" +
    "Status: " + proposal.status + "\n" +
    "For: " + counts.for + " (" + pctFor + "%)\n" +
    "Against: " + counts.against + " (" + (100 - pctFor) + "%)\n" +
    "Total votes: " + total + "\n" +
    "Min required: " + proposal.min_votes
  );
});

// ── /mint ───────────────────────────────────────────────

bot.command("mint", (ctx) => {
  ctx.reply("Mint your free Guild badge:\n" + PORTAL);
});

// ── /dao ────────────────────────────────────────────────

bot.command("dao", (ctx) => ctx.reply("Guild DAO:\n" + DAO_URL));

// ── /source ─────────────────────────────────────────────

bot.command("source", (ctx) => ctx.reply("Source:\n" + GITHUB));

// ── Unknown commands ────────────────────────────────────

bot.on("message:text", (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    ctx.reply("Unknown command. Try /help");
  }
});

// ── Start ───────────────────────────────────────────────

bot.start();
console.log("Radix Guild Bot v2 running! (SQLite + proposals + voting)");
