require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const db = require("./db");
const { hasBadge, getBadgeData } = require("./services/gateway");
const { queueXpReward, getXpQueue } = require("./services/xp");
const { setupWizard, setupSkipDesc, pendingProposals } = require("./wizard");

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) { console.error("Set TG_BOT_TOKEN in .env"); process.exit(1); }

db.init();
const bot = new Bot(TOKEN);

const PORTAL = process.env.PORTAL_URL || "https://156-67-219-105.sslip.io/guild";
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
    await ctx.reply(
      "You need a Guild badge to do this.\n\n" +
      "Mint one (free): " + PORTAL + "/mint\n" +
      "After minting, wait ~30s then try again."
    );
    return null;
  }
  return user;
}

// ── /start + /help ──────────────────────────────────────

bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome to the Radix Guild\n\n" +
    "A community governance system for Radix. Propose ideas, vote on them, earn XP — all from Telegram.\n\n" +
    "Your badge is a free on-chain NFT that gives you voting power. Higher XP = more influence.\n\n" +
    "Get started in 3 steps:\n" +
    "1. /register <your_account_rdx1...> — link your wallet\n" +
    "2. Mint a free badge: " + PORTAL + "/mint\n" +
    "   (Connect wallet → enter a username → confirm in wallet)\n" +
    "3. Come back here and /proposals to see what to vote on\n\n" +
    "/help for all commands"
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "📋 Radix Guild Bot\n\n" +
    "👤 Getting Started:\n" +
    "/register <address> - Link wallet\n" +
    "/badge - Check your badge\n" +
    "/mint - Get a free badge\n\n" +
    "🗳️ Governance:\n" +
    "/new - Guided proposal wizard (recommended)\n" +
    "/propose <title> - Quick Yes/No/Amend vote\n" +
    "/poll <question> | opt1 | opt2 | opt3 - Multi-choice\n" +
    "/temp <question> - Quick temperature check\n" +
    "/amend <id> <new text> - Refine a passed proposal\n" +
    "/proposals - List active\n" +
    "/vote <id> - Open vote buttons for a proposal\n" +
    "/results <id> - Vote counts\n\n" +
    "💰 Bounties:\n" +
    "/bounties - List open bounties + XRD pool\n" +
    "/bounties <id> - Bounty details\n" +
    "/my_bounties - Your claimed & completed bounties\n\n" +
    "📊 Info:\n" +
    "/dao - CrumbsUp DAO\n" +
    "/cancel <id> - Cancel your proposal\n" +
    "/history - Recent proposals\n" +
    "/stats - Bot statistics\n\n" +
    "Resources:\n" +
    "/charter - DAO Charter\n" +
    "/mvd - Minimum Viable DAO discussion\n" +
    "/wiki - Radix Wiki\n" +
    "/talk - RadixTalk forum"
  );
});

// ── /register ───────────────────────────────────────────

bot.command("register", (ctx) => {
  const parts = ctx.message.text.split(" ");
  const address = parts[1];
  if (!address || !/^account_rdx1[a-z0-9]{40,60}$/.test(address)) {
    return ctx.reply("Invalid address format.\nUsage: /register account_rdx1...");
  }
  db.registerUser(ctx.from.id, address, ctx.from.username || ctx.from.first_name);
  ctx.reply(
    "Registered! Wallet linked.\n\n" +
    "Next: Mint your free badge:\n" +
    PORTAL + "/mint\n\n" +
    "Connect your Radix Wallet, enter a username, and confirm the transaction. It's free.\n\n" +
    "After minting, wait ~30 seconds then /badge to verify."
  );
});

// ── /badge ──────────────────────────────────────────────

bot.command("badge", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");
  const badge = await getBadgeData(user.radix_address);
  if (!badge) return ctx.reply(
    "No badge found for this wallet.\n\n" +
    "If you just minted, wait ~30 seconds for the blockchain to confirm, then try /badge again.\n\n" +
    "Haven't minted yet? Go to:\n" + PORTAL + "/mint"
  );
  const tierWeights = { member: "1x", contributor: "2x", builder: "3x", steward: "5x", elder: "10x" };
  ctx.reply(
    "Your Guild Badge\n\n" +
    "Name: " + badge.issued_to + "\n" +
    "Tier: " + badge.tier + " (vote weight: " + (tierWeights[badge.tier] || "1x") + ")\n" +
    "XP: " + badge.xp + " / Level: " + badge.level + "\n" +
    "Status: " + badge.status + "\n" +
    "ID: " + badge.id + "\n\n" +
    "Earn XP: vote (+10), propose (+25), poll (+25), temp check (+10)"
  );
});

// ── /new (Guided proposal wizard) ────────────────────────

const handleWizardText = setupWizard(bot, db, requireBadge, buildYesNoKeyboard, buildPollKeyboard, endsLabel, queueXpReward);
setupSkipDesc(bot, pendingProposals);

// ── /propose (Yes/No/Amend) — quick mode ────────────────

bot.command("propose", async (ctx) => {
  const user = await requireBadge(ctx);
  if (!user) return;

  const title = ctx.message.text.replace(/^\/propose\s*/, "").trim();
  if (!title) return ctx.reply("Usage: /propose Your proposal here");
  if (title.length > 500) return ctx.reply("Title too long (max 500 chars, got " + title.length + ")");

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
  queueXpReward(user.radix_address, "propose");
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
  queueXpReward(user.radix_address, "poll");
});

// ── /temp (Temperature Check) ───────────────────────────

bot.command("temp", async (ctx) => {
  const user = await requireBadge(ctx);
  if (!user) return;

  const question = ctx.message.text.replace(/^\/temp\s*/, "").trim();
  if (!question) return ctx.reply("Usage: /temp Your question here");
  if (question.length > 500) return ctx.reply("Question too long (max 500 chars)");

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
  queueXpReward(user.radix_address, "temp");
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
  queueXpReward(user.radix_address, "amend");
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

  // Queue XP reward for voting
  queueXpReward(user.radix_address, "vote");

  ctx.answerCallbackQuery({ text: "Vote recorded: " + voteChoice + " (+10 XP). /badge to check your XP." });
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
    text += "  " + (voteStr || "No votes yet") + " | Ends: " + ends + "\n";
    text += "  Vote: /vote " + p.id + "\n\n";
  });
  text += "Tap /vote <id> to open vote buttons for any proposal.";
  ctx.reply(text);
});

// ── /vote (re-post a proposal with vote buttons) ────────

bot.command("vote", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const id = parseInt(parts[1]);
  if (!id) return ctx.reply("Usage: /vote <proposal_id>");

  const proposal = db.getProposal(id);
  if (!proposal) return ctx.reply("Proposal #" + id + " not found.");
  if (proposal.status !== "active") return ctx.reply("Proposal #" + id + " is " + proposal.status + ". Use /results " + id);

  const counts = db.getVoteCounts(id);
  const endsDate = new Date(proposal.ends_at * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  let keyboard;
  if (proposal.type === "yesno") {
    keyboard = buildYesNoKeyboard(id, counts);
  } else {
    keyboard = buildPollKeyboard(id, proposal.options || ["Yes!", "Maybe", "No"], counts);
  }

  const roundLabel = proposal.parent_id ? " (R" + proposal.round + " of #" + proposal.parent_id + ")" : "";
  const type = proposal.type === "poll" ? "Poll" : proposal.type === "temp" ? "Temp" : "Vote";

  const msg = await ctx.reply(
    "[" + type + "] Proposal #" + id + roundLabel + "\n\n" +
    proposal.title + "\n\n" +
    "Ends: " + endsDate,
    { reply_markup: keyboard }
  );

  db.updateProposalMessage(id, msg.message_id, ctx.chat.id);
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

// ── /cancel ─────────────────────────────────────────────

bot.command("cancel", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const id = parseInt(parts[1]);
  if (!id) return ctx.reply("Usage: /cancel <proposal_id>");
  const result = db.cancelProposal(id, ctx.from.id);
  if (!result.ok) {
    if (result.error === "not_found_or_not_owner") return ctx.reply("Not found or not your proposal.");
    return ctx.reply("Cannot cancel: " + result.error);
  }
  ctx.reply("Proposal #" + id + " cancelled.");
});

// ── /history ────────────────────────────────────────────

bot.command("history", (ctx) => {
  const all = db.getProposalHistory(10);
  if (all.length === 0) return ctx.reply("No proposals yet.");
  let text = "Recent Proposals:\n\n";
  all.forEach((p) => {
    const counts = db.getVoteCounts(p.id);
    const type = p.type === "poll" ? "Poll" : p.type === "temp" ? "Temp" : "Vote";
    const se = p.status === "active" ? "🟢" : p.status === "cancelled" ? "❌" : "⏰";
    const vs = Object.entries(counts).map(([k, v]) => k + ":" + v).join(" ") || "no votes";
    text += se + " #" + p.id + " [" + type + "] " + p.title.slice(0, 50) + "\n";
    text += "   " + vs + " | " + p.status + "\n\n";
  });
  ctx.reply(text);
});

// /welcome — post pinnable onboarding message
bot.command("welcome", async (ctx) => {
  const msg = await ctx.reply(
    "Welcome to the Radix Guild Governance!\n\n" +
    "This is where the Radix community makes decisions together.\n\n" +
    "Get started in 3 steps:\n" +
    "1. /register <your account_rdx1... address>\n" +
    "2. Mint your free badge: " + PORTAL + "\n" +
    "3. Come back here and vote on proposals!\n\n" +
    "Commands: /help\n" +
    "Charter: radix.wiki/ideas/radix-network-dao-charter\n" +
    "MVD: radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258\n" +
    "Source: " + GITHUB
  );
  try { await ctx.pinChatMessage(msg.message_id); } catch(e) {}
});

bot.command("mint", (ctx) => ctx.reply(
  "Mint your free Guild badge:\n" +
  PORTAL + "/mint\n\n" +
  "1. Connect your Radix Wallet\n" +
  "2. Enter a username (your governance identity)\n" +
  "3. Confirm the transaction (0 XRD cost)\n\n" +
  "After minting, wait ~30 seconds then /badge to verify.\n" +
  "Then /proposals to see what to vote on."
));
bot.command("dao", (ctx) => ctx.reply("Guild DAO:\n" + DAO_URL));
bot.command("source", (ctx) => ctx.reply("Source:\n" + GITHUB));
bot.command("charter", (ctx) => ctx.reply("DAO Charter:\nhttps://radix.wiki/ideas/radix-network-dao-charter"));
bot.command("mvd", (ctx) => ctx.reply("Minimum Viable DAO discussion:\nhttps://radixtalk.com/t/design-our-minimum-viable-dao-mvd/2258"));
bot.command("wiki", (ctx) => ctx.reply("Radix Wiki:\nhttps://radix.wiki/ecosystem"));
bot.command("talk", (ctx) => ctx.reply("RadixTalk forum:\nhttps://radixtalk.com"));

// ── /bounties [id] — List open bounties or view one ─────

const CATEGORY_EMOJI = { tutorial: "📚", design: "🎨", social: "📢", bug: "🐛", translation: "🌍", other: "💡" };

function formatDate(unixTs) {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

function daysLeft(endsAt) {
  const diff = endsAt - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "expired";
  const d = Math.floor(diff / 86400);
  return d + " day" + (d === 1 ? "" : "s") + " left";
}

bot.command("bounties", (ctx) => {
  const parts = ctx.message.text.split(" ");
  const idArg = parseInt(parts[1]);

  if (idArg) {
    // Single bounty detail
    const b = db.getBounty(idArg);
    if (!b) return ctx.reply("Bounty #" + idArg + " not found.");
    const emoji = CATEGORY_EMOJI[b.category] || "💡";
    let text = emoji + " Bounty #" + b.id + ": " + b.title + "\n";
    text += "Reward: " + b.reward_xrd + " XRD\n";
    text += "Status: " + b.status + "\n";
    text += "Category: " + b.category + "\n";
    text += "Due: " + formatDate(b.ends_at) + " (" + daysLeft(b.ends_at) + ")\n";
    if (b.description) text += "\n" + b.description + "\n";
    if (b.claimed_by_address) text += "\nClaimed by: " + b.claimed_by_address.slice(0, 20) + "...";
    if (b.crumbsup_url) text += "\n\nClaim on CrumbsUp:\n" + b.crumbsup_url;
    return ctx.reply(text);
  }

  // List open bounties
  const open = db.getOpenBounties(20);
  if (open.length === 0) return ctx.reply("No open bounties right now.\n\nCheck back soon or /dao to visit the Guild DAO.");

  const escrow = db.getEscrowWallet();
  let text = "Active Bounties (" + open.length + " open | " + escrow.available_xrd.toFixed(0) + " XRD pool)\n\n";

  open.forEach((b, i) => {
    const emoji = CATEGORY_EMOJI[b.category] || "💡";
    text += emoji + " " + (i + 1) + ". " + b.title + " (" + b.reward_xrd + " XRD) — Due: " + formatDate(b.ends_at) + "\n";
    if (b.description) text += "   " + b.description.slice(0, 80) + (b.description.length > 80 ? "..." : "") + "\n";
    if (b.crumbsup_url) text += "   " + b.crumbsup_url + "\n";
    text += "\n";
  });
  text += "/bounties <id> for details";
  ctx.reply(text);
});

// ── /my-bounties — Show user's claimed + completed bounties ─

bot.command("my_bounties", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");

  const all = db.getAllBounties(500);
  const mine = all.filter(b => b.claimed_by_address === user.radix_address);
  if (mine.length === 0) return ctx.reply("You haven't claimed any bounties yet.\n\n/bounties to see open bounties.");

  const active = mine.filter(b => ["claimed", "submitted", "approved"].includes(b.status));
  const completed = mine.filter(b => b.status === "paid");
  const totalEarned = completed.reduce((sum, b) => sum + b.reward_xrd, 0);

  let text = "Your Bounties:\n\n";
  if (active.length > 0) {
    text += "Active (" + active.length + "):\n";
    active.forEach(b => {
      const emoji = CATEGORY_EMOJI[b.category] || "💡";
      text += emoji + " #" + b.id + ": " + b.title + " (" + b.reward_xrd + " XRD) — " + b.status + "\n";
    });
    text += "\n";
  }
  if (completed.length > 0) {
    text += "Completed (" + completed.length + "):\n";
    completed.forEach(b => {
      const emoji = CATEGORY_EMOJI[b.category] || "💡";
      text += emoji + " #" + b.id + ": " + b.title + " (" + b.reward_xrd + " XRD) ✅ PAID";
      if (b.tx_hash_paid) text += " — TX: " + b.tx_hash_paid.slice(0, 20) + "...";
      text += "\n";
    });
    text += "\n";
  }
  text += "Earned: " + totalEarned + " XRD total";
  ctx.reply(text);
});

bot.on("message:text", (ctx) => {
  // Check if user is in wizard flow
  if (handleWizardText(ctx)) return;

  // Only respond to unknown commands in private chat, not groups
  if (ctx.message.text.startsWith("/") && ctx.chat.type === "private") {
    ctx.reply("Unknown command. /help");
  }
});

// ── Background: Auto-close expired proposals ────────────

const { postToRadixTalk, formatProposalForRT } = require("./services/discourse");

async function checkExpiredProposals() {
  const now = Math.floor(Date.now() / 1000);
  const expired = db.getActiveProposals().filter(p => now > p.ends_at);

  for (const proposal of expired) {
    const counts = db.getVoteCounts(proposal.id);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // Determine result
    let result = "expired";
    if (total >= proposal.min_votes) {
      if (proposal.type === "yesno") {
        const forVotes = counts.for || 0;
        const againstVotes = counts.against || 0;
        const amendVotes = counts.amend || 0;
        if (forVotes > againstVotes && forVotes > amendVotes) result = "passed";
        else if (amendVotes > forVotes) result = "needs_amendment";
        else result = "failed";
      } else {
        result = "completed";
      }
    }

    db.closeProposal(proposal.id, result);

    // Announce result in the original chat
    if (proposal.tg_chat_id) {
      let text = "Proposal #" + proposal.id + " — " + result.toUpperCase() + "\n\n";
      text += proposal.title + "\n\n";
      Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([opt, cnt]) => {
        const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
        text += opt + ": " + cnt + " (" + pct + "%)\n";
      });
      text += "\nTotal: " + total + " votes";

      if (result === "needs_amendment") {
        text += "\n\nAmend won — use /amend " + proposal.id + " <refined text> to submit R2";
      }

      try {
        await bot.api.sendMessage(proposal.tg_chat_id, text);
      } catch (e) {
        console.error("[AutoClose] Failed to announce:", e.message);
      }
    }

    // Post to RadixTalk (if API key configured)
    const rtTitle = "[Result] Proposal #" + proposal.id + ": " + proposal.title.slice(0, 80);
    const rtBody = formatProposalForRT(proposal, counts);
    const rtPost = await postToRadixTalk(rtTitle, rtBody);
    if (rtPost) {
      console.log("[AutoClose] Posted to RadixTalk:", rtPost.url);
    }

    console.log("[AutoClose] Proposal #" + proposal.id + " → " + result);
  }
}

// Check every 5 minutes
setInterval(async () => {
  try {
    await checkExpiredProposals();
  } catch (e) {
    console.error("[AutoClose] Background task failed:", e.message);
  }
}, 5 * 60 * 1000);

// ── Daily bounty summary (every morning at 9 UTC) ────────

const GUILD_CHAT_ID = process.env.GUILD_CHAT_ID ? parseInt(process.env.GUILD_CHAT_ID) : null;

async function postDailyBountySummary() {
  if (!GUILD_CHAT_ID) return;

  const open = db.getOpenBounties(20);
  const escrow = db.getEscrowWallet();

  // Find recently approved (paid in last 24h)
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
  const all = db.getAllBounties(200);
  const recentlyPaid = all.filter(b => b.status === "paid" && b.paid_at && b.paid_at >= oneDayAgo);

  let text = "📋 Today's Bounty Updates\n\n";

  if (recentlyPaid.length > 0) {
    recentlyPaid.forEach(b => {
      text += "✅ Approved: earned " + b.reward_xrd + " XRD for " + b.title + " #" + b.id + "\n";
    });
    text += "\n";
  }

  if (open.length > 0) {
    text += "🔓 Open Right Now (" + open.length + "):\n";
    open.forEach(b => {
      text += "  • " + b.title + " (" + b.reward_xrd + " XRD) — " + daysLeft(b.ends_at) + "\n";
    });
    text += "\nTotal: " + escrow.available_xrd.toFixed(0) + " XRD available\n";
  } else {
    text += "No open bounties right now. Stay tuned!\n";
  }

  text += "\n/bounties to claim work →";

  try {
    await bot.api.sendMessage(GUILD_CHAT_ID, text);
    console.log("[Bounty] Daily summary posted");
  } catch (e) {
    console.error("[Bounty] Failed to post daily summary:", e.message);
  }
}

// Schedule: run at 9:00 UTC daily
function scheduleDailySummary() {
  const now = new Date();
  const next9UTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0, 0));
  if (next9UTC <= now) next9UTC.setUTCDate(next9UTC.getUTCDate() + 1);
  const msUntilNext = next9UTC - now;
  setTimeout(() => {
    postDailyBountySummary().catch(e => console.error("[Bounty] Cron error:", e.message));
    setInterval(() => {
      postDailyBountySummary().catch(e => console.error("[Bounty] Cron error:", e.message));
    }, 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

scheduleDailySummary();

// ── Start ───────────────────────────────────────────────

// ── Start bot + API ─────────────────────────────────────

const { startApi } = require("./services/api");
startApi();

bot.start();
console.log("Radix Guild Bot v4 running! (proposals, polls, auto-close, API, RadixTalk ready)");
