require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const db = require("./db");
const { hasBadge, getBadgeData } = require("./services/gateway");
const { queueXpReward, getXpQueue } = require("./services/xp");
const { setupWizard, setupSkipDesc, pendingProposals } = require("./wizard");
const { setupGuidedWizards, wizardStates } = require("./wizards");
const cv2 = require("./services/consultation");

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) { console.error("Set TG_BOT_TOKEN in .env"); process.exit(1); }

const dbInstance = db.init();
cv2.init(dbInstance);
const bot = new Bot(TOKEN);

const PORTAL = process.env.PORTAL_URL || "https://radixguild.com";
const DAO_URL = "https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0";
const GITHUB = "https://github.com/bigdevxrd/radix-community-projects";
const HOURS = 72;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL || "";

// ── Discord Webhook ───────────────────────────────────────
async function notifyDiscord(content) {
  if (!DISCORD_WEBHOOK) return;
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    console.error("[Discord] Webhook failed:", e.message);
  }
}

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
  if (ctx.chat.type === "private") {
    // Guided onboarding in DMs
    const user = db.getUser(ctx.from.id);
    const kb = new InlineKeyboard();
    if (!user) {
      kb.text("Step 1: Link Wallet", "onboard_register").row();
    } else {
      kb.text("Step 2: Mint Badge", "onboard_mint").row();
    }
    kb.text("View Proposals", "onboard_proposals");

    ctx.reply(
      "Welcome to Radix Governance\n\n" +
      "Propose ideas, vote on them, earn XP — all from Telegram.\n\n" +
      "Your badge is a free on-chain NFT that gives you voting power.\n\n" +
      (user ? "Wallet linked: " + user.radix_address.slice(0, 20) + "...\n\n" : "") +
      "Follow the steps below to get started.",
      { reply_markup: kb }
    );
  } else {
    // Simple text in groups
    ctx.reply(
      "Radix Governance\n\n" +
      "DM me to get started: @rad_gov\n" +
      "Or: /register <account_rdx1...> then /proposals\n\n" +
      "/help for commands | /faq for questions"
    );
  }
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Radix Governance Bot\n\n" +

    "Getting Started:\n" +
    "/register <address> — Link your Radix Wallet\n" +
    "/mint — Get a free badge (on-chain NFT)\n" +
    "/badge — Check your badge, tier, and XP\n" +
    "/wallet — Badge + wallet info\n\n" +

    "Governance (badge required):\n" +
    "/new — Guided proposal wizard\n" +
    "/propose <title> — Quick Yes/No/Amend vote\n" +
    "/poll <q> | opt1 | opt2 — Multi-choice\n" +
    "/temp <question> — Temperature check\n" +
    "/amend <id> <text> — Refine a passed proposal\n\n" +

    "View + Manage:\n" +
    "/proposals — Active proposals\n" +
    "/results <id> — Vote counts\n" +
    "/history — Recent proposals\n" +
    "/cancel <id> — Cancel your proposal\n" +
    "/stats — Bot statistics\n\n" +

    "Bounties:\n" +
    "/bounty list — Open bounties\n" +
    "/bounty create <xrd> <title> — Create bounty\n" +
    "/bounty claim <id> — Claim a bounty\n" +
    "/bounty stats — Stats + escrow balance\n\n" +

    "Game:\n" +
    "/game — Your dice roll stats\n" +
    "/leaderboard — Top players by bonus XP\n\n" +

    "Network Governance:\n" +
    "/cv2 — On-chain consultations (when live)\n" +
    "/cv2 status — CV2 sync health\n\n" +

    "Help + Resources:\n" +
    "/faq — Frequently asked questions\n" +
    "/readme — Project overview + links\n" +
    "/support — Get help + report bugs\n" +
    "/charter — DAO Charter progress\n" +
    "/dao — CrumbsUp DAO page\n" +
    "/source — GitHub repo\n\n" +

    "Voting is free — no XRD required."
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
    "Wallet linked.\n\n" +
    "Voting is FREE — no XRD required. You can /proposals and vote right away.\n\n" +
    "Want to earn XP and level up? Mint a free badge:\n" +
    PORTAL + "/mint\n\n" +
    "After minting, wait ~30s then /badge to check.\n" +
    "Questions? /faq"
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
const handleGuidedText = setupGuidedWizards(bot, db, PORTAL, requireBadge, queueXpReward);

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
  notifyDiscord("**New Proposal #" + id + "** — " + title + "\nType: Yes/No/Amend | Ends: " + endsLabel() + "\nVote: " + PORTAL + "/proposals/" + id);

  // Notify about on-chain option
  try {
    const bridge = require("./services/cv2-bridge");
    if (bridge.isEnabled()) {
      ctx.reply("Want this on-chain too? Create it on the dashboard: " + bridge.getDashboardLink(), { reply_to_message_id: msg.message_id });
    }
  } catch(e) {}
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
  notifyDiscord("**New Poll #" + id + "** — " + question + "\nOptions: " + options.join(", ") + " | Ends: " + endsLabel() + "\nVote: " + PORTAL + "/proposals/" + id);
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
  notifyDiscord("**Temp Check #" + id + "** — " + question + "\nNon-binding, 24h | Vote: " + PORTAL + "/proposals/" + id);

  // Notify about on-chain option
  try {
    const bridge = require("./services/cv2-bridge");
    if (bridge.isEnabled()) {
      ctx.reply("Want this on-chain too? Create it on the dashboard: " + bridge.getDashboardLink(), { reply_to_message_id: msg.message_id });
    }
  } catch(e) {}
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

  // Queue XP reward + dice roll
  const reward = queueXpReward(user.radix_address, "vote");
  const rollMsg = reward.queued && reward.roll
    ? (reward.roll === 6 ? " JACKPOT! Roll 6 (+" + reward.bonus + " bonus XP)" : " Roll " + reward.roll + (reward.bonus > 0 ? " (+" + reward.bonus + " bonus)" : ""))
    : "";

  ctx.answerCallbackQuery({ text: "Vote: " + voteChoice + " (+10 XP)" + rollMsg });
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

// ── /bounty commands ───────────────────────────────────

bot.command("bounty", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const sub = args[0];

  if (!sub) {
    // Show guided menu
    const stats = db.getBountyStats();
    const kb = new InlineKeyboard()
      .text("View Bounties (" + stats.open + " open)", "bounty_view_start")
      .row()
      .text("Create Bounty", "bounty_create_start")
      .text("Claim Bounty", "bounty_claim_start");

    return ctx.reply(
      "Bounty Board\n\n" +
      "Open: " + stats.open + " | In Progress: " + stats.assigned + " | Paid: " + stats.paid + "\n" +
      "Escrow: " + stats.escrow.available + " XRD available",
      { reply_markup: kb }
    );
  }

  if (sub === "list") {
    const bounties = db.getOpenBounties();
    if (bounties.length === 0) return ctx.reply("No open bounties. Admin: /bounty create <xrd> <title>");
    let msg = "Open Bounties:\n\n";
    bounties.forEach(b => {
      msg += "#" + b.id + " [" + b.status + "] " + b.reward_xrd + " XRD — " + b.title + "\n";
      if (b.assignee_tg_id) msg += "  Assigned to: " + (b.assignee_address?.slice(0, 20) || "?") + "...\n";
    });
    return ctx.reply(msg);
  }

  if (sub === "stats") {
    const s = db.getBountyStats();
    const e = db.getEscrowBalance();
    return ctx.reply(
      "Bounty Stats\n\n" +
      "Open: " + s.open + " | Assigned: " + s.assigned + " | Submitted: " + s.submitted + "\n" +
      "Verified: " + s.verified + " | Paid: " + s.paid + "\n" +
      "Total paid: " + s.totalPaid + " XRD\n\n" +
      "Escrow: " + e.available + " XRD available (" + e.funded + " funded, " + e.released + " released)"
    );
  }

  if (sub === "create") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const xrd = parseInt(args[1]);
    const title = args.slice(2).join(" ");
    if (!xrd || !title) return ctx.reply("Usage: /bounty create <xrd> <title>");
    if (title.length > 500) return ctx.reply("Title too long (max 500)");
    const id = db.createBounty(title, xrd, ctx.from.id);
    queueXpReward(user.radix_address, "propose");
    ctx.reply("Bounty #" + id + " created: " + xrd + " XRD\n" + title);
    return;
  }

  if (sub === "claim") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const id = parseInt(args[1]);
    if (!id) return ctx.reply("Usage: /bounty claim <id>");
    const result = db.assignBounty(id, ctx.from.id, user.radix_address);
    if (result.changes === 0) return ctx.reply("Bounty not found or already claimed.");
    ctx.reply("Bounty #" + id + " claimed! Submit your work with: /bounty submit " + id + " <github_pr_url>");
    return;
  }

  if (sub === "submit") {
    const id = parseInt(args[1]);
    const pr = args[2];
    if (!id || !pr) return ctx.reply("Usage: /bounty submit <id> <github_pr_url>");
    const result = db.submitBounty(id, pr);
    if (result.changes === 0) return ctx.reply("Bounty not found or not assigned to you.");
    ctx.reply("Bounty #" + id + " submitted for review.\nPR: " + pr + "\nAwaiting admin verification.");
    return;
  }

  if (sub === "verify") {
    // Admin only — requires badge
    const user = await requireBadge(ctx);
    if (!user) return;
    const id = parseInt(args[1]);
    if (!id) return ctx.reply("Usage: /bounty verify <id>");
    const result = db.verifyBounty(id);
    if (result.changes === 0) return ctx.reply("Bounty not found or not submitted.");
    const bounty = db.getBounty(id);
    ctx.reply("Bounty #" + id + " verified! Ready for payment: " + bounty.reward_xrd + " XRD\nAdmin: /bounty pay " + id + " <tx_hash>");
    return;
  }

  if (sub === "pay") {
    const id = parseInt(args[1]);
    const txHash = args[2];
    if (!id || !txHash) return ctx.reply("Usage: /bounty pay <id> <tx_hash>");
    const result = db.payBounty(id, txHash);
    if (!result.ok) return ctx.reply("Error: " + result.error);
    const bounty = db.getBounty(id);
    queueXpReward(bounty.assignee_address, "propose");
    ctx.reply("Bounty #" + id + " PAID! " + bounty.reward_xrd + " XRD\nTX: " + txHash.slice(0, 30) + "...\nAssignee earned XP.");
    return;
  }

  if (sub === "cancel") {
    const id = parseInt(args[1]);
    const reason = args.slice(2).join(" ") || "Cancelled by creator";
    if (!id) return ctx.reply("Usage: /bounty cancel <id> [reason]");
    const bounty = db.getBounty(id);
    if (!bounty) return ctx.reply("Bounty #" + id + " not found.");
    if (bounty.creator_tg_id !== ctx.from.id) return ctx.reply("Only the creator can cancel.");
    const ok = db.cancelBounty(id, reason);
    if (!ok) return ctx.reply("Can only cancel open bounties.");
    ctx.reply("Bounty #" + id + " cancelled.\nReason: " + reason);
    notifyDiscord("**Task #" + id + " cancelled** — " + bounty.title + "\nReason: " + reason);
    return;
  }

  if (sub === "apply") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const id = parseInt(args[1]);
    const pitch = args.slice(2).join(" ");
    if (!id) return ctx.reply("Usage: /bounty apply <id> [why you're the right person]");
    const bounty = db.getBounty(id);
    if (!bounty) return ctx.reply("Bounty #" + id + " not found.");
    if (bounty.status !== "open") return ctx.reply("Bounty is not open for applications.");
    const appId = db.createApplication(id, ctx.from.id, user.radix_address, pitch || null, null);
    ctx.reply("Applied to bounty #" + id + " (application #" + appId + ")\n\nThe creator will review and approve.\nView: " + PORTAL + "/bounties/" + id);
    return;
  }

  if (sub === "approve") {
    const appId = parseInt(args[1]);
    if (!appId) return ctx.reply("Usage: /bounty approve <application_id>");
    const result = db.approveApplication(appId);
    if (!result.ok) return ctx.reply("Error: " + result.error);
    ctx.reply("Application #" + appId + " approved! Bounty #" + result.bountyId + " assigned.");
    // Notify applicant
    try {
      await bot.api.sendMessage(result.applicant, "Your application was approved! You're assigned to bounty #" + result.bountyId + ".\nSubmit work: /bounty submit " + result.bountyId + " <pr_url>");
    } catch(e) {}
    return;
  }

  if (sub === "categories") {
    const cats = db.getCategories();
    let msg = "Task Categories:\n\n";
    cats.forEach(c => { msg += "• " + c.name + " — " + c.description + "\n"; });
    return ctx.reply(msg);
  }

  if (sub === "fund") {
    const xrd = parseFloat(args[1]);
    const txHash = args[2];
    if (!xrd || !txHash) return ctx.reply("Usage: /bounty fund <xrd_amount> <tx_hash>");
    db.fundEscrow(xrd, txHash);
    const e = db.getEscrowBalance();
    ctx.reply("Escrow funded: +" + xrd + " XRD\nAvailable: " + e.available + " XRD\nTX: " + txHash.slice(0, 30) + "...");
    return;
  }

  ctx.reply(
    "Task commands:\n\n" +
    "/bounty — guided menu\n" +
    "/bounty list — open tasks\n" +
    "/bounty stats — stats + escrow\n" +
    "/bounty create <xrd> <title> — quick create\n" +
    "/bounty claim <id> — claim a task\n" +
    "/bounty apply <id> [pitch] — apply for tasks >100 XRD\n" +
    "/bounty cancel <id> [reason] — cancel your task\n" +
    "/bounty submit <id> <pr_url> — submit work\n" +
    "/bounty categories — list categories\n" +
    "/bounty verify <id> — verify delivery (admin)\n" +
    "/bounty pay <id> <tx_hash> — release payment (admin)\n" +
    "/bounty approve <app_id> — approve applicant (creator)\n" +
    "/bounty fund <xrd> <tx_hash> — fund escrow (admin)"
  );
});

// ── /badges ────────────────────────────────────────────

bot.command("badges", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");

  const badge = await getBadgeData(user.radix_address);
  const game = db.getGameState(user.radix_address);

  let msg = "Your Badge Profile\n\n";

  if (badge) {
    const tierWeights = { member: "1x", contributor: "2x", builder: "3x", steward: "5x", elder: "10x" };
    msg += "Guild Member: " + badge.tier + " (" + (tierWeights[badge.tier] || "1x") + " vote)\n";
    msg += "XP: " + badge.xp + " | Level: " + badge.level + "\n";
    msg += "ID: " + badge.id + "\n\n";
  } else {
    msg += "Guild Member: not minted\nMint free: " + PORTAL + "/mint\n\n";
  }

  // Show achievement progress
  msg += "Achievement Progress:\n";

  // Voter badge progress
  const voteCount = db.getVoteCountForUser ? db.getVoteCountForUser(ctx.from.id) : 0;
  msg += "  Voter: " + voteCount + "/10 votes" + (voteCount >= 10 ? " (earned!)" : "") + "\n";

  // Game stats
  if (game.total_rolls > 0) {
    msg += "  Dice Roller: " + game.total_rolls + " rolls, " + game.jackpots + " jackpots\n";
  }

  msg += "\nPlanned badges: Contributor, Voter, Steward, Builder\n";
  msg += "See /faq for details.";

  ctx.reply(msg);
});

// ── /game ──────────────────────────────────────────────

bot.command("game", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");
  const game = db.getGameState(user.radix_address);
  const rollNames = ["", "Miss", "Small", "Nice", "Great", "Epic", "JACKPOT"];

  let msg = "Grid Game Stats\n\n" +
    "Total rolls: " + game.total_rolls + "\n" +
    "Bonus XP earned: " + game.total_bonus_xp + "\n" +
    "Streak: " + game.streak_days + " days\n" +
    "Jackpots: " + game.jackpots + "\n";

  if (game.last_roll_value) {
    msg += "Last roll: " + game.last_roll_value + " (" + rollNames[game.last_roll_value] + ")\n";
  }

  msg += "\nEvery governance action = 1 dice roll.\n" +
    "Roll 1: +0 | Roll 2: +5 | Roll 3: +10\n" +
    "Roll 4: +25 | Roll 5: +50 | Roll 6: +100 (JACKPOT!)";

  ctx.reply(msg);
});

bot.command("leaderboard", (ctx) => {
  const top = db.getGameLeaderboard(10);
  if (top.length === 0) return ctx.reply("No game data yet. Vote or propose to earn rolls!");
  let msg = "Leaderboard — Top Bonus XP\n\n";
  top.forEach((g, i) => {
    msg += (i + 1) + ". " + g.radix_address.slice(0, 20) + "... — " + g.total_bonus_xp + " XP (" + g.total_rolls + " rolls, " + g.jackpots + " jackpots)\n";
  });
  ctx.reply(msg);
});

// ── /charter ───────────────────────────────────────────

bot.command("charter", (ctx) => {
  const status = db.getCharterStatus();
  const ready = db.getReadyParams();

  let msg = "Radix DAO Charter Status\n\n" +
    "Total parameters: " + status.total + "\n" +
    "Resolved: " + status.resolved + "\n" +
    "Voting: " + status.voting + "\n" +
    "Pending: " + status.tbd + "\n\n";

  if (ready.length > 0) {
    msg += "Ready to vote (" + ready.length + "):\n";
    ready.slice(0, 10).forEach(p => {
      msg += "  " + p.param_key + " — " + p.title + "\n";
    });
    if (ready.length > 10) msg += "  ... and " + (ready.length - 10) + " more\n";
  }

  const resolved = db.getCharterParams().filter(p => p.status === "resolved");
  if (resolved.length > 0) {
    msg += "\nResolved:\n";
    resolved.forEach(p => {
      msg += "  " + p.param_key + " = " + p.param_value + "\n";
    });
  }

  msg += "\nFull charter: radix.wiki/ideas/radix-network-dao-charter";
  ctx.reply(msg);
});

// ── /faq ───────────────────────────────────────────────

bot.command("faq", (ctx) => ctx.reply(
  "Radix Governance — FAQ\n\n" +

  "What is this?\n" +
  "Radix Governance is the system — badges, voting, proposals, XP rewards.\n" +
  "Radix Guild is the community — the people who use it.\n" +
  "The Guild is the first community running on this governance infrastructure.\n\n" +

  "Do I need XRD to vote?\n" +
  "No. Voting is off-ledger (stored in the bot database). It's completely free.\n\n" +

  "Do I need XRD to mint a badge?\n" +
  "No. Badge minting is free (0 XRD). You just need a Radix Wallet to sign the transaction.\n\n" +

  "What's a badge?\n" +
  "An on-chain NFT in your Radix Wallet. It's your governance identity — username, tier, XP, and level stored on the Radix ledger.\n\n" +

  "How do I earn XP?\n" +
  "Vote (+10 XP), propose (+25 XP), create a poll (+25 XP), temperature check (+10 XP), amend (+15 XP). XP is written on-chain periodically.\n\n" +

  "What do tiers do?\n" +
  "Higher tier = more voting weight.\n" +
  "Member (1x) / Contributor (2x) / Builder (3x) / Steward (5x) / Elder (10x)\n\n" +

  "Can I transfer my badge?\n" +
  "The NFT is transferable, but XP won't follow — it resets on the new wallet.\n\n" +

  "What's the difference between Guild and Radix Governance?\n" +
  "Radix Governance = network-level decisions (all XRD holders vote via Consultation).\n" +
  "Radix Guild = community coordination (badge holders vote here in Telegram).\n\n" +

  "Is this open source?\n" +
  "Yes. MIT licensed: " + GITHUB
));

// ── /wallet ────────────────────────────────────────────

bot.command("wallet", async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return ctx.reply("Register first: /register <account_rdx1...>");
  const badge = await getBadgeData(user.radix_address);
  const tierWeights = { member: "1x", contributor: "2x", builder: "3x", steward: "5x", elder: "10x" };

  let msg = "Wallet: " + user.radix_address.slice(0, 25) + "...\n\n";

  if (badge) {
    msg += "Badge: " + badge.id + "\n" +
      "Name: " + badge.issued_to + "\n" +
      "Tier: " + badge.tier + " (" + (tierWeights[badge.tier] || "1x") + " vote weight)\n" +
      "XP: " + badge.xp + " | Level: " + badge.level + "\n" +
      "Status: " + badge.status + "\n\n";
  } else {
    msg += "No badge found. Mint one (free): " + PORTAL + "/mint\n\n";
  }

  msg += "Voting is free — no XRD required.\n" +
    "Your badge is an on-chain NFT in your Radix Wallet.";

  ctx.reply(msg);
});

// ── /mint + resources ──────────────────────────────────

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

bot.command("readme", (ctx) => ctx.reply(
  "Radix Governance\n\n" +
  "Governance infrastructure for the Radix community.\n\n" +
  "Radix Governance = the system (badges, voting, bounties, XP)\n" +
  "Radix Guild = the first community using it\n\n" +
  "What's live:\n" +
  "• On-chain badges (free mint)\n" +
  "• 20 governance proposals (6 active)\n" +
  "• 32 charter decisions with dependency tracking\n" +
  "• Bounty + escrow system\n" +
  "• Dashboard with decision tree\n\n" +
  "GitHub: " + GITHUB + "\n" +
  "Dashboard: " + PORTAL + "\n" +
  "Charter: radix.wiki/ideas/radix-network-dao-charter\n\n" +
  "MIT licensed. Open source. Built by Big Dev."
));

bot.command("support", (ctx) => ctx.reply(
  "Need help?\n\n" +
  "• /faq — frequently asked questions\n" +
  "• /help — all bot commands\n" +
  "• /feedback <message> — report an issue or share feedback\n" +
  "• /mystatus — check your open tickets\n\n" +
  "GitHub: " + GITHUB + "/issues\n" +
  "Contact: @bigdevxrd (Telegram DM)\n\n" +
  "This is a beta — feedback welcome!"
));

// ── Feedback / Support Tickets ─────────────────────────────

const { matchFaq } = require("./services/faq-matcher");

bot.command("feedback", async (ctx) => {
  const message = ctx.message.text.replace(/^\/feedback\s*/, "").trim();
  if (!message) return ctx.reply("Usage: /feedback <your message>\n\nDescribe the issue or share your thoughts.");
  if (message.length > 1000) return ctx.reply("Message too long (max 1000 chars). Please be concise.");

  // Check FAQ match first
  const faqResult = matchFaq(message);
  if (faqResult.match) {
    const kb = new InlineKeyboard()
      .text("This helps, thanks!", "faq_resolved_" + ctx.from.id)
      .text("Submit anyway", "faq_submit_" + ctx.from.id + "_" + encodeURIComponent(message.slice(0, 200)));

    return ctx.reply(
      "This might help:\n\n" +
      "Q: " + faqResult.entry.q + "\n" +
      "A: " + faqResult.entry.a + "\n\n" +
      "Did this answer your question?",
      { reply_markup: kb }
    );
  }

  // No FAQ match — create ticket directly
  const username = ctx.from.username || ctx.from.first_name || "anon";
  const id = db.createFeedback(ctx.from.id, username, message);
  ctx.reply("Ticket #" + id + " created. We'll review it soon.\n\nCheck status: /mystatus");
});

// FAQ callback: resolved (no ticket needed)
bot.callbackQuery(/^faq_resolved_/, (ctx) => {
  ctx.answerCallbackQuery("Glad that helped!");
  ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✓ Resolved by FAQ");
});

// FAQ callback: submit anyway (create ticket despite FAQ match)
bot.callbackQuery(/^faq_submit_/, (ctx) => {
  const parts = ctx.callbackQuery.data.split("_");
  const tgId = parseInt(parts[2]);
  const message = decodeURIComponent(parts.slice(3).join("_"));
  const username = ctx.from.username || ctx.from.first_name || "anon";
  const id = db.createFeedback(tgId, username, message || "Feedback submitted after FAQ");
  ctx.answerCallbackQuery("Ticket #" + id + " created");
  ctx.editMessageText(ctx.callbackQuery.message.text + "\n\nTicket #" + id + " created. Check status: /mystatus");
});

bot.command("mystatus", (ctx) => {
  const tickets = db.getFeedbackByUser(ctx.from.id);
  if (tickets.length === 0) return ctx.reply("No feedback tickets. Use /feedback <message> to submit one.");

  let text = "Your tickets:\n\n";
  tickets.forEach(t => {
    const date = new Date(t.created_at * 1000).toLocaleDateString();
    text += "#" + t.id + " [" + t.status + "] " + date + "\n";
    text += t.message.slice(0, 60) + (t.message.length > 60 ? "..." : "") + "\n";
    if (t.admin_response) text += "→ " + t.admin_response.slice(0, 80) + "\n";
    text += "\n";
  });
  ctx.reply(text);
});

// ── Admin Feedback Commands ────────────────────────────────

bot.command("adminfeedback", async (ctx) => {
  // Simple admin check — only creator can manage feedback
  const ADMIN_IDS = [6102618406]; // Big Dev's TG ID
  if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");

  const args = ctx.message.text.split(/\s+/).slice(1);
  const sub = args[0];

  if (!sub || sub === "list") {
    const tickets = db.getOpenFeedback(10);
    if (tickets.length === 0) return ctx.reply("No open tickets.");
    let text = "Open tickets (" + tickets.length + "):\n\n";
    tickets.forEach(t => {
      const date = new Date(t.created_at * 1000).toLocaleDateString();
      text += "#" + t.id + " @" + (t.username || "anon") + " [" + date + "]\n";
      text += t.message.slice(0, 80) + "\n\n";
    });
    return ctx.reply(text);
  }

  if (sub === "respond" && args[1]) {
    const id = parseInt(args[1]);
    const response = args.slice(2).join(" ");
    if (!response) return ctx.reply("Usage: /adminfeedback respond <id> <message>");
    const ticket = db.getFeedbackById(id);
    if (!ticket) return ctx.reply("Ticket #" + id + " not found.");
    db.respondToFeedback(id, response);
    // Notify the user
    try {
      await bot.api.sendMessage(ticket.tg_id, "Update on your ticket #" + id + ":\n\n" + response + "\n\nThank you for your feedback!");
    } catch (e) {}
    return ctx.reply("Responded to ticket #" + id);
  }

  if (sub === "resolve" && args[1]) {
    const id = parseInt(args[1]);
    const ticket = db.getFeedbackById(id);
    if (!ticket) return ctx.reply("Ticket #" + id + " not found.");
    db.resolveFeedback(id);
    try {
      await bot.api.sendMessage(ticket.tg_id, "Your ticket #" + id + " has been resolved. Thank you!");
    } catch (e) {}
    return ctx.reply("Ticket #" + id + " resolved.");
  }

  if (sub === "stats") {
    const stats = db.getFeedbackStats();
    return ctx.reply("Feedback: " + stats.open + " open, " + stats.responded + " responded, " + stats.resolved + " resolved (" + stats.total + " total)");
  }

  ctx.reply("Usage:\n/adminfeedback — list open tickets\n/adminfeedback respond <id> <msg>\n/adminfeedback resolve <id>\n/adminfeedback stats");
});

// ── CV2 Network Governance Commands ──────────────────────

bot.command("cv2", async (ctx) => {
  if (!cv2.isEnabled()) {
    return ctx.reply(
      "On-chain governance (CV2) is not yet enabled.\n\n" +
      "The Foundation's Consultation v2 system will be deployed to mainnet soon. " +
      "Once live, you'll be able to view and participate in formal on-chain votes here.\n\n" +
      "Current governance: use /proposals for off-chain guild votes."
    );
  }

  const args = ctx.message.text.split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  // /cv2 status — sync health
  if (sub === "status") {
    const status = cv2.getSyncStatus();
    return ctx.reply(
      "CV2 Sync Status\n\n" +
      "Enabled: " + (status.enabled ? "Yes" : "No") + "\n" +
      "Component: " + (status.component ? status.component.slice(0, 30) + "..." : "Not set") + "\n" +
      "Deployed: " + (status.deployed ? "Yes" : "Not yet") + "\n" +
      "Polling: " + (status.polling ? "Every " + status.pollInterval : "Off") + "\n" +
      "Last sync: " + (status.lastSync ? new Date(status.lastSync * 1000).toISOString() : "Never") + "\n" +
      "Temp checks: " + status.temperatureCheckCount + "\n" +
      "Proposals: " + status.proposalCount + "\n" +
      "Errors: " + status.errors
    );
  }

  // /cv2 sync — force refresh (admin)
  if (sub === "sync") {
    try {
      await cv2.syncFromChain();
      return ctx.reply("CV2 sync completed successfully.");
    } catch (err) {
      return ctx.reply("CV2 sync failed: " + err.message);
    }
  }

  // /cv2 <id> — detail view
  if (sub && sub !== "list") {
    const proposal = cv2.getProposal(sub);
    if (!proposal) return ctx.reply("CV2 proposal not found: " + sub);
    const opts = proposal.vote_options ? JSON.parse(proposal.vote_options) : [];
    return ctx.reply(
      (proposal.type === "temperature_check" ? "Temp Check" : "Proposal") + " — " + proposal.title + "\n\n" +
      (proposal.short_description || "") + "\n\n" +
      "Type: " + proposal.type + "\n" +
      "Votes: " + (proposal.vote_count - proposal.revote_count) + " unique\n" +
      "Quorum: " + proposal.quorum + " XRD\n" +
      (opts.length > 0 ? "Options: " + opts.join(", ") + "\n" : "") +
      "\nView on dashboard: " + PORTAL + "/proposals"
    );
  }

  // /cv2 — list active
  const proposals = cv2.getActiveProposals();
  if (proposals.length === 0) {
    return ctx.reply(
      "No active network consultations.\n\n" +
      "Temperature checks and formal proposals will appear here when created on-chain.\n" +
      "Use /cv2 status to check sync health."
    );
  }

  let msg = "Network Governance (On-Chain)\n\n";
  for (const p of proposals.slice(0, 10)) {
    const uniqueVotes = p.vote_count - p.revote_count;
    msg += (p.type === "temperature_check" ? "🌡 " : "📋 ") +
      p.title + "\n" +
      "  " + uniqueVotes + " votes | Quorum: " + p.quorum + " XRD\n" +
      "  ID: " + p.id + "\n\n";
  }
  msg += "Use /cv2 <id> for details";
  return ctx.reply(msg);
});

// ── Welcome new members ────────────────────────────────

bot.on("message:new_chat_members", async (ctx) => {
  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;
    const name = member.first_name || member.username || "there";
    await ctx.reply(
      "Welcome " + name + "!\n\n" +
      "Radix Governance — propose ideas, vote, earn XP.\n\n" +
      "Get started:\n" +
      "1. /register <your_account_rdx1...>\n" +
      "2. Mint free badge: " + PORTAL + "/mint\n" +
      "3. /proposals to vote\n\n" +
      "/help for commands | /faq for questions"
    );
  }
});

bot.on("message:text", (ctx) => {
  // Check if user is in wizard flow
  if (handleWizardText(ctx)) return;
  if (handleGuidedText(ctx)) return;

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

    // Notify Discord
    const discordCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([o, c]) => o + ": " + c).join(", ");
    notifyDiscord("**Proposal #" + proposal.id + " — " + result.toUpperCase() + "**\n" + proposal.title + "\n" + discordCounts + " (" + total + " votes)\n" + PORTAL + "/proposals/" + proposal.id);

    // Post to RadixTalk (if API key configured)
    const rtTitle = "[Result] Proposal #" + proposal.id + ": " + proposal.title.slice(0, 80);
    const rtBody = formatProposalForRT(proposal, counts);
    const rtPost = await postToRadixTalk(rtTitle, rtBody);
    if (rtPost) {
      console.log("[AutoClose] Posted to RadixTalk:", rtPost.url);
    }

    // ── Pipeline auto-advancement ──
    if (result === "passed" || result === "completed") {
      // Resolve charter param if linked
      if (proposal.charter_param) {
        const value = extractWinningValue(proposal, counts, total);
        db.resolveCharterParam(proposal.charter_param, value, proposal.id);
        const paramTitle = db.getCharterParam(proposal.charter_param)?.title || proposal.charter_param;
        if (proposal.tg_chat_id) {
          try {
            await bot.api.sendMessage(proposal.tg_chat_id,
              "Charter resolved: " + paramTitle + " = " + value + "\n" +
              "Use /charter to see progress."
            );
          } catch(e) {}
        }
        console.log("[Charter] " + proposal.charter_param + " = " + value);
        notifyDiscord("**Charter Resolved** — " + paramTitle + " = " + value + "\nSee progress: " + PORTAL + "/proposals");
      }
    }

    console.log("[AutoClose] Proposal #" + proposal.id + " → " + result);
  }
}

function extractWinningValue(proposal, counts, total) {
  if (proposal.type === "yesno") {
    return (counts.for || 0) > (counts.against || 0) ? "approved" : "rejected";
  }
  // For polls, return option with most votes
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "unknown";
}

// Check every 5 minutes
setInterval(async () => {
  try {
    await checkExpiredProposals();
  } catch (e) {
    console.error("[AutoClose] Background task failed:", e.message);
  }
}, 5 * 60 * 1000);

// Check expired bounties every hour
setInterval(() => {
  try {
    const cancelled = db.checkExpiredBounties();
    if (cancelled > 0) {
      console.log("[Tasks] Auto-cancelled " + cancelled + " expired open task(s)");
      notifyDiscord("**" + cancelled + " expired task(s) auto-cancelled** — past deadline with no assignee");
    }
  } catch (e) {
    console.error("[Tasks] Deadline check failed:", e.message);
  }
}, 60 * 60 * 1000);

// ── Start ───────────────────────────────────────────────

// ── Start bot + API ─────────────────────────────────────

const { startApi } = require("./services/api");
startApi();

bot.start();
console.log("Radix Guild Bot v4 running! (proposals, polls, auto-close, API, RadixTalk ready)");
