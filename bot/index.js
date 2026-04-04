require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const db = require("./db");
const { hasBadge, getBadgeData } = require("./services/gateway");

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) { console.error("Set TG_BOT_TOKEN in .env"); process.exit(1); }

db.init();
const bot = new Bot(TOKEN);

const PORTAL = "https://156-67-219-105.sslip.io/dao";
const DAO_URL = "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0";
const GITHUB = "https://github.com/bigdevxrd/radix-community-projects";
const HOURS = 72;

// ── Helpers ─────────────────────────────────────────────

function endsLabel() {
  return new Date(Date.now() + HOURS * 3600000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function buildYesNoKeyboard(id, counts) {
  return new InlineKeyboard()
    .text("For (" + (counts.for || 0) + ")", "vote_" + id + "_for")
    .text("Against (" + (counts.against || 0) + ")", "vote_" + id + "_against")
    .row()
    .text("Amend (" + (counts.amend || 0) + ")", "vote_" + id + "_amend");
}

function buildPollKeyboard(id, options, counts) {
  const kb = new InlineKeyboard();
  options.forEach((opt, i) => {
    kb.text(opt + " (" + (counts[opt] || 0) + ")", "vote_" + id + "_" + opt);
    if (i % 2 === 1 || i === options.length - 1) kb.row();
  });
  return kb;
}

async function requireBadge(ctx) {
  const user = db.getUser(ctx.from.id);
  if (!user) {
    await ctx.reply("Register first: /register <account_rdx1...>");
    return null;
  }
  const has = await hasBadge(user.radix_address);
  if (!has) {
    await ctx.reply("You need a Guild badge to do this.\nMint one: " + PORTAL);
    return null;
  }
  return user;
}

// ── /start + /help ──────────────────────────────────────

bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome to the Radix Guild!\n\n" +
    "One badge. All DAOs. Governed from Telegram.\n\n" +
    "Get started:\n" +
    "1. /register <your_account_rdx1...>\n" +
    "2. Mint badge: " + PORTAL + "\n" +
    "3. Create proposals and vote!\n\n" +
    "/help for all commands"
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Radix Guild Bot\n\n" +
    "Basics:\n" +
    "/register <address> - Link wallet\n" +
    "/badge - Check your badge\n" +
    "/mint - Get a free badge\n\n" +
    "Governance:\n" +
    "/propose <title> - Yes/No/Amend vote\n" +
    "/poll <question> | opt1 | opt2 | opt3 - Multi-choice\n" +
    "/temp <question> - Quick temperature check\n" +
    "/amend <id> <new text> - Refine a passed proposal\n" +
    "/proposals - List active\n" +
    "/results <id> - Vote counts\n\n" +
    "Other:\n" +
    "/dao - CrumbsUp DAO\n" +
    "/stats - Bot statistics"
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
    "Registered!\nAddress: " + address.slice(0, 30) + "...\n\n" +
    "Mint badge: " + PORTAL + "\nThen /badge to check."
  );
});

// ── /badge ──────────────────────────────────────────────

bot.command("badge", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");
  const badge = await getBadgeData(user.radix_address);
  if (!badge) return ctx.reply("No Guild badge found.\nMint one: " + PORTAL);
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

// ── /propose (Yes/No/Amend) ─────────────────────────────

bot.command("propose", async (ctx) => {
  const user = await requireBadge(ctx);
  if (!user) return;

  const title = ctx.message.text.replace(/^\/propose\s*/, "").trim();
  if (!title) return ctx.reply("Usage: /propose Your proposal here");

  const id = db.createProposal(title, ctx.from.id, { type: "yesno", daysActive: 3 });
  const counts = db.getVoteCounts(id);

  const msg = await ctx.reply(
    "Proposal #" + id + "\n\n" +
    title + "\n\n" +
    "By: @" + (ctx.from.username || ctx.from.first_name) + "\n" +
    "Ends: " + endsLabel() + " (" + HOURS + "h)\n" +
    "Type: Yes/No/Amend",
    { reply_markup: buildYesNoKeyboard(id, counts) }
  );
  db.updateProposalMessage(id, msg.message_id, ctx.chat.id);
});

// ── /poll (Multi-choice) ────────────────────────────────

bot.command("poll", async (ctx) => {
  const user = await requireBadge(ctx);
  if (!user) return;

  const text = ctx.message.text.replace(/^\/poll\s*/, "").trim();
  const parts = text.split("|").map(s => s.trim()).filter(Boolean);

  if (parts.length < 3) {
    return ctx.reply("Usage: /poll Question | Option 1 | Option 2 | Option 3");
  }

  const question = parts[0];
  const options = parts.slice(1);

  if (options.length > 6) {
    return ctx.reply("Maximum 6 options.");
  }

  const id = db.createProposal(question, ctx.from.id, {
    type: "poll",
    options: options,
    daysActive: 3,
  });
  const counts = db.getVoteCounts(id);

  const msg = await ctx.reply(
    "Poll #" + id + "\n\n" +
    question + "\n\n" +
    "By: @" + (ctx.from.username || ctx.from.first_name) + "\n" +
    "Ends: " + endsLabel() + " (" + HOURS + "h)\n" +
    "Type: Multi-choice (pick one)",
    { reply_markup: buildPollKeyboard(id, options, counts) }
  );
  db.updateProposalMessage(id, msg.message_id, ctx.chat.id);
});

// ── /temp (Temperature Check) ───────────────────────────

bot.command("temp", async (ctx) => {
  const user = await requireBadge(ctx);
  if (!user) return;

  const question = ctx.message.text.replace(/^\/temp\s*/, "").trim();
  if (!question) return ctx.reply("Usage: /temp Your question here");

  const options = ["Yes!", "Maybe", "No"];
  const id = db.createProposal(question, ctx.from.id, {
    type: "temp",
    options: options,
    daysActive: 1, // 24 hours for temp checks
    minVotes: 1,
  });
  const counts = db.getVoteCounts(id);

  const msg = await ctx.reply(
    "Temperature Check #" + id + "\n\n" +
    question + "\n\n" +
    "By: @" + (ctx.from.username || ctx.from.first_name) + "\n" +
    "Ends: " + new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace("T", " ") + " UTC (24h)\n" +
    "Non-binding — just gauging interest",
    { reply_markup: buildPollKeyboard(id, options, counts) }
  );
  db.updateProposalMessage(id, msg.message_id, ctx.chat.id);
});

// ── /amend (Refine a proposal) ──────────────────────────

bot.command("amend", async (ctx) => {
  const user = await requireBadge(ctx);
  if (!user) return;

  const text = ctx.message.text.replace(/^\/amend\s*/, "").trim();
  const spaceIdx = text.indexOf(" ");
  if (spaceIdx === -1) return ctx.reply("Usage: /amend <proposal_id> New refined text");

  const parentId = parseInt(text.slice(0, spaceIdx));
  const newTitle = text.slice(spaceIdx + 1).trim();

  const parent = db.getProposal(parentId);
  if (!parent) return ctx.reply("Proposal #" + parentId + " not found.");

  const amendments = db.getAmendments(parentId);
  const round = amendments.length + 2; // parent is R1

  const id = db.createProposal(newTitle, ctx.from.id, {
    type: "yesno",
    daysActive: 3,
    parentId: parentId,
    round: round,
  });
  const counts = db.getVoteCounts(id);

  const msg = await ctx.reply(
    "Amendment R" + round + " (of #" + parentId + ")\nProposal #" + id + "\n\n" +
    newTitle + "\n\n" +
    "Original: " + parent.title + "\n" +
    "By: @" + (ctx.from.username || ctx.from.first_name) + "\n" +
    "Ends: " + endsLabel() + " (" + HOURS + "h)",
    { reply_markup: buildYesNoKeyboard(id, counts) }
  );
  db.updateProposalMessage(id, msg.message_id, ctx.chat.id);
});

// ── Inline Vote Handler ─────────────────────────────────

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("vote_")) return;

  const parts = data.split("_");
  const proposalId = parseInt(parts[1]);
  const voteChoice = parts.slice(2).join("_"); // handles options with underscores

  const user = db.getUser(ctx.from.id);
  if (!user) {
    return ctx.answerCallbackQuery({ text: "Register first: /register <account_rdx1...>", show_alert: true });
  }

  const proposal = db.getProposal(proposalId);
  if (!proposal || proposal.status !== "active") {
    return ctx.answerCallbackQuery({ text: "This vote is not active.", show_alert: true });
  }

  if (Date.now() / 1000 > proposal.ends_at) {
    db.closeProposal(proposalId, "expired");
    return ctx.answerCallbackQuery({ text: "Voting has ended.", show_alert: true });
  }

  const has = await hasBadge(user.radix_address);
  if (!has) {
    return ctx.answerCallbackQuery({ text: "You need a Guild badge to vote. Mint: " + PORTAL, show_alert: true });
  }

  const result = db.recordVote(proposalId, ctx.from.id, user.radix_address, voteChoice);
  if (!result.ok) {
    if (result.error === "already_voted") {
      return ctx.answerCallbackQuery({ text: "Already voted on this one.", show_alert: true });
    }
    return ctx.answerCallbackQuery({ text: "Error: " + result.error, show_alert: true });
  }

  const counts = db.getVoteCounts(proposalId);

  let keyboard;
  if (proposal.type === "yesno") {
    keyboard = buildYesNoKeyboard(proposalId, counts);
  } else {
    keyboard = buildPollKeyboard(proposalId, proposal.options || ["Yes!", "Maybe", "No"], counts);
  }

  try {
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  } catch (e) { /* message might not be editable */ }

  ctx.answerCallbackQuery({ text: "Vote recorded: " + voteChoice });
});

// ── /proposals ──────────────────────────────────────────

bot.command("proposals", (ctx) => {
  db.closeExpiredProposals();
  const active = db.getActiveProposals();
  if (active.length === 0) {
    return ctx.reply("No active proposals.\n\n/propose or /poll to create one.");
  }

  let text = "Active Proposals:\n\n";
  active.forEach((p) => {
    const counts = db.getVoteCounts(p.id);
    const ends = new Date(p.ends_at * 1000).toISOString().slice(0, 16).replace("T", " ");
    const type = p.type === "poll" ? "Poll" : p.type === "temp" ? "Temp" : "Vote";
    const roundLabel = p.parent_id ? " (R" + p.round + " of #" + p.parent_id + ")" : "";
    const voteStr = Object.entries(counts).map(([k, v]) => k + ":" + v).join(" | ");
    text += "#" + p.id + " [" + type + "]" + roundLabel + " " + p.title + "\n";
    text += "  " + (voteStr || "No votes yet") + " | Ends: " + ends + "\n\n";
  });
  ctx.reply(text);
});

// ── /results ────────────────────────────────────────────

bot.command("results", (ctx) => {
  const parts = ctx.message.text.split(" ");
  const id = parseInt(parts[1]);
  if (!id) return ctx.reply("Usage: /results <id>");

  const proposal = db.getProposal(id);
  if (!proposal) return ctx.reply("Not found.");

  const counts = db.getVoteCounts(id);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const roundLabel = proposal.parent_id ? " (R" + proposal.round + " of #" + proposal.parent_id + ")" : "";

  let text = "Proposal #" + id + roundLabel + "\n" + proposal.title + "\n\n";
  text += "Status: " + proposal.status + "\n";
  text += "Type: " + proposal.type + "\n\n";

  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([option, count]) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    text += option + ": " + count + " (" + pct + "%)\n";
  });

  text += "\nTotal: " + total + " votes | Min: " + proposal.min_votes;

  const amendments = db.getAmendments(id);
  if (amendments.length > 0) {
    text += "\n\nAmendments:";
    amendments.forEach(a => {
      text += "\n  R" + a.round + " #" + a.id + ": " + a.title.slice(0, 50);
    });
  }

  ctx.reply(text);
});

// ── /stats ──────────────────────────────────────────────

bot.command("stats", (ctx) => {
  const proposals = db.getTotalProposals();
  const voters = db.getTotalVoters();
  const active = db.getActiveProposals().length;
  ctx.reply(
    "Guild Stats\n\n" +
    "Total proposals: " + proposals + "\n" +
    "Active now: " + active + "\n" +
    "Unique voters: " + voters
  );
});

// ── Info commands ────────────────────────────────────────

bot.command("mint", (ctx) => ctx.reply("Mint badge:\n" + PORTAL));
bot.command("dao", (ctx) => ctx.reply("Guild DAO:\n" + DAO_URL));
bot.command("source", (ctx) => ctx.reply("Source:\n" + GITHUB));

bot.on("message:text", (ctx) => {
  if (ctx.message.text.startsWith("/")) ctx.reply("Unknown command. /help");
});

bot.start();
console.log("Radix Guild Bot v3 running! (proposals, polls, amendments, temp checks)");
