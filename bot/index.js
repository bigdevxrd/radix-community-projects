require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const db = require("./db");
const { hasBadge, getBadgeData } = require("./services/gateway");
const { queueXpReward, getXpQueue } = require("./services/xp");
const { setupWizard, setupSkipDesc, pendingProposals } = require("./wizard");
const { setupGuidedWizards, wizardStates } = require("./wizards");
const cv2 = require("./services/consultation");
const { checkContent } = require("./services/content-filter");
const escrowWatcher = require("./services/escrow-watcher");
const cv3Watcher = require("./services/conviction-watcher");
const insurance = require("./services/insurance");
const disputeService = require("./services/dispute");
const arbiterService = require("./services/arbiter");
const projectService = require("./services/project");
const txSigner = require("./services/tx-signer");
const agentBridge = require("./services/agent-bridge");

const TOKEN = process.env.TG_BOT_TOKEN;
if (!TOKEN) { console.error("Set TG_BOT_TOKEN in .env"); process.exit(1); }

// Fail closed: if ADMIN_TG_IDS is unset, NO user is treated as admin. Prevents
// a deploy with a missing env from defaulting privilege to a hardcoded ID.
const ADMIN_IDS = (process.env.ADMIN_TG_IDS || "")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
if (ADMIN_IDS.length === 0) {
  console.warn("[Bot] ADMIN_TG_IDS not set — no admin commands will be authorized until env is provided");
}
const BOT_USERNAME = process.env.BOT_USERNAME || "@rad_gov";

const dbInstance = db.init();
try { cv2.init(dbInstance); } catch (e) { console.error("[Init] CV2 init failed (non-fatal):", e.message); }
try { insurance.init(db); } catch (e) { console.error("[Init] Insurance init failed (non-fatal):", e.message); }
try { arbiterService.init(db); } catch (e) { console.error("[Init] Arbiter init failed (non-fatal):", e.message); }
try { disputeService.init(db); } catch (e) { console.error("[Init] Dispute service init failed (non-fatal):", e.message); }
try { projectService.init(db); } catch (e) { console.error("[Init] Project service init failed (non-fatal):", e.message); }
try {
  txSigner.init(db, (msg) => {
    // Admin notifier — sends TG alerts to the first configured admin only
    const adminId = ADMIN_IDS[0];
    if (adminId && bot) bot.api.sendMessage(adminId, "[Signer] " + msg).catch(() => {});
  });
} catch (e) { console.error("[Init] TX signer init failed (non-fatal):", e.message); }
try { agentBridge.init(db); } catch (e) { console.error("[Init] Agent bridge init failed (non-fatal):", e.message); }
const bot = new Bot(TOKEN);

// ── Global Error Handlers ────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  const e = err.error;
  console.error("[Bot] Error in handler for " + (ctx?.update?.message?.text || ctx?.update?.callback_query?.data || "unknown") + ":", e.message || e);
  try { ctx?.reply("Something went wrong. Try again or contact @bigdev_xrd.").catch(() => {}); } catch (_) {}
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process] Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Process] Uncaught exception:", err);
  // Don't exit — PM2 will restart if needed
});

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
  try {
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
  } catch (e) {
    console.error("[requireBadge] Error:", e.message);
    await ctx.reply("Could not verify your badge. The Radix Gateway may be temporarily unavailable. Try again in a minute.").catch(() => {});
    return null;
  }
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
      "DM me to get started: " + BOT_USERNAME + "\n" +
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
    "/wallet — Badge + wallet info\n" +
    "/trust — Your trust score (Bronze/Silver/Gold)\n\n" +

    "Governance (badge required):\n" +
    "/new — Guided proposal wizard\n" +
    "/propose <title> — Quick Yes/No/Amend vote\n" +
    "/poll <q> | opt1 | opt2 — Multi-choice\n" +
    "/temp <question> — Temperature check\n" +
    "/amend <id> <text> — Refine a passed proposal\n\n" +

    "View + Manage:\n" +
    "/proposals — Active proposals\n" +
    "/temps — Active temp checks only\n" +
    "/decisions — Dashboard decisions page\n" +
    "/results <id> — Vote counts\n" +
    "/history — Recent proposals\n" +
    "/cancel <id> — Cancel your proposal\n" +
    "/stats — Bot statistics\n\n" +

    "Bounties:\n" +
    "/bounty list — Open bounties\n" +
    "/bounty create <xrd> <title> — Create bounty\n" +
    "/bounty claim <id> — Claim a bounty\n" +
    "/bounty stats — Stats + escrow balance\n\n" +

    "Working Groups:\n" +
    "/groups — List all working groups\n" +
    "/group <name> — View group details\n" +
    "/wg report <group> — File a WG report\n" +
    "/wg assign <id> <group> — Link task to group\n" +
    "/wg budget <group> — View budget status\n" +
    "/wg sunset <group> <date> — Set charter expiry\n" +
    "/wg renew <group> <months> — Extend charter\n" +
    "/wg overdue — Groups with no report this period\n\n" +

    "Game:\n" +
    "/game — Your dice roll stats\n" +
    "/leaderboard — Top players by bonus XP\n\n" +

    "Network Governance:\n" +
    "/cv2 — On-chain consultations (CV2)\n" +
    "/cv2 status — CV2 sync health\n" +
    "/cv3 — Conviction voting proposals (CV3)\n" +
    "/cv3 status — CV3 sync + pool balance\n" +
    "/cv3 pool — Shared funding pool\n\n" +

    "Help + Resources:\n" +
    "/faq — Frequently asked questions\n" +
    "/readme — Project overview + links\n" +
    "/support — Get help + report bugs\n" +
    "/charter — DAO Charter progress\n" +
    "/dao — CrumbsUp DAO page\n" +
    "/source — GitHub repo\n\n" +

    "Dashboard: radixguild.com\n" +
    "Create proposals + bounties from the dashboard too!\n" +
    "Profile + trust score: radixguild.com/profile\n\n" +

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
  const tierLevels = { member: "Lv.1", contributor: "Lv.2", builder: "Lv.3", steward: "Lv.4", elder: "Lv.5" };
  const trust = db.getTrustScore(ctx.from.id);
  const trustLine = trust ? "\nTrust: " + trust.score + " (" + trust.tier.toUpperCase() + ")" : "";
  ctx.reply(
    "Your Guild Badge\n\n" +
    "Name: " + badge.issued_to + "\n" +
    "Tier: " + badge.tier + " (" + (tierLevels[badge.tier] || "Lv.1") + ")\n" +
    "XP: " + badge.xp + " / Level: " + badge.level + "\n" +
    "Status: " + badge.status + trustLine + "\n" +
    "ID: " + badge.id + "\n\n" +
    "Earn XP: vote (+10), propose (+25), poll (+25), temp check (+10)\n" +
    "/trust for full breakdown"
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
  const filterResult = checkContent(title);
  if (filterResult.blocked) return ctx.reply("Content not allowed. Please rephrase your proposal.");

  const id = db.createProposal(title, ctx.from.id, { type: "yesno", daysActive: 3 });
  const counts = db.getVoteCounts(id);

  const msg = await ctx.reply(
    "Proposal #" + id + "\n\n" +
    title + "\n\n" +
    "By: @" + (ctx.from.username || ctx.from.first_name) + "\n" +
    "Ends: " + endsLabel() + " (" + HOURS + "h)\n" +
    "Type: Yes/No/Amend\n\n" +
    "Vote: " + PORTAL + "/proposals/" + id,
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
  const pollFilter = checkContent(text);
  if (pollFilter.blocked) return ctx.reply("Content not allowed. Please rephrase your poll.");
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
    "Type: Multi-choice (pick one)\n\n" +
    "Vote: " + PORTAL + "/proposals/" + id,
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
  const tempFilter = checkContent(question);
  if (tempFilter.blocked) return ctx.reply("Content not allowed. Please rephrase your question.");

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
    "Non-binding — just gauging interest\n\n" +
    "Vote: " + PORTAL + "/proposals/" + id + "\n" +
    "Or tap the buttons below. Badge required.",
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
  try {
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

  let has = false;
  try { has = await hasBadge(user.radix_address); } catch (e) {
    console.error("[Vote] hasBadge error:", e.message);
    return ctx.answerCallbackQuery({ text: "Could not verify badge. Try again in a moment.", show_alert: true });
  }
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
  } catch (e) {
    console.error("[Vote] Callback error:", e.message);
    try { ctx.answerCallbackQuery({ text: "Error processing vote. Try again.", show_alert: true }); } catch (_) {}
  }
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

// ── /temps — list active temp checks only ────────────────

bot.command("temps", (ctx) => {
  db.closeExpiredProposals();
  const active = db.getActiveProposals().filter(p => p.type === "temp");
  if (active.length === 0) {
    return ctx.reply("No active temp checks.\n\nCreate one: /temp Your question here");
  }

  let text = "Active Temp Checks (" + active.length + "):\n\n";
  active.slice(0, 15).forEach(p => {
    const counts = db.getVoteCounts(p.id);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const ends = new Date(p.ends_at * 1000).toISOString().slice(0, 16).replace("T", " ");
    text += "#" + p.id + " " + p.title + "\n";
    text += "  " + total + " vote" + (total !== 1 ? "s" : "") + " | Ends: " + ends + "\n";
    text += "  Vote: /vote " + p.id + "\n\n";
  });
  if (active.length > 15) text += "... and " + (active.length - 15) + " more\n\n";
  text += "Dashboard: " + PORTAL + "/decisions\n";
  text += "All non-binding pulse checks. Create: /temp <question>";
  ctx.reply(text);
});

// ── /decisions — link to dashboard decisions page ────────

bot.command("decisions", (ctx) => {
  const decisionCount = db.getDecisions().length;
  ctx.reply(
    "Governance Decisions\n\n" +
    decisionCount + " decisions mapped across charter, structural, and P3 service categories.\n" +
    "All currently running as non-binding temp checks.\n\n" +
    "Vote on the dashboard: " + PORTAL + "/decisions\n" +
    "Or view temp checks here: /temps"
  );
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

  // Look up linked decision for summary context
  const decision = db.getDecisionByProposal ? db.getDecisionByProposal(id) : null;
  const summary = decision ? "\n" + decision.summary + "\n" : "";

  const msg = await ctx.reply(
    "[" + type + "] Proposal #" + id + roundLabel + "\n\n" +
    proposal.title + "\n" + summary + "\n" +
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
    // Parse flags: --approval pr_merged --repo owner/repo --skills "x,y" --criteria "text" --depends 5,7 --template name
    const fullText = args.slice(1).join(" ");
    const approvalMatch = fullText.match(/--approval\s+(\S+)/);
    const repoMatch = fullText.match(/--repo\s+(\S+)/);
    const skillsMatch = fullText.match(/--skills\s+"([^"]+)"/);
    const criteriaMatch = fullText.match(/--criteria\s+"([^"]+)"/);
    const dependsMatch = fullText.match(/--depends\s+(\S+)/);
    const templateMatch = fullText.match(/--template\s+(\S+)/);
    const rewardOverride = fullText.match(/--reward\s+(\d+)/);
    // Remove all flags from title
    const cleanTitle = fullText
      .replace(/--approval\s+\S+/g, "")
      .replace(/--repo\s+\S+/g, "")
      .replace(/--skills\s+"[^"]+"/g, "")
      .replace(/--criteria\s+"[^"]+"/g, "")
      .replace(/--depends\s+\S+/g, "")
      .replace(/--template\s+\S+/g, "")
      .replace(/--reward\s+\d+/g, "")
      .trim();

    // Template support
    let xrd, title, skills, criteria;
    if (templateMatch) {
      const tmpl = db.getTemplate(templateMatch[1]);
      if (!tmpl) return ctx.reply("Template '" + templateMatch[1] + "' not found. Use /bounty templates to see available templates.");
      const detail = cleanTitle.replace(/^\d+\s*/, "").trim() || "TBD";
      title = tmpl.title_template.replace("{detail}", detail);
      xrd = rewardOverride ? parseInt(rewardOverride[1]) : (parseInt(args[1]) || tmpl.default_reward_xrd);
      skills = skillsMatch ? skillsMatch[1] : JSON.parse(tmpl.default_skills || "[]").join(",");
      criteria = criteriaMatch ? criteriaMatch[1] : tmpl.default_criteria;
    } else {
      xrd = parseInt(args[1]);
      title = cleanTitle.replace(/^\d+\s*/, "");
      skills = skillsMatch ? skillsMatch[1] : null;
      criteria = criteriaMatch ? criteriaMatch[1] : null;
    }

    if (!xrd || !title) return ctx.reply("Usage: /bounty create <xrd> <title> [--skills \"x,y\" --criteria \"text\"] [--depends 5,7] [--template name]");
    if (title.length > 500) return ctx.reply("Title too long (max 500)");
    const bountyFilter = checkContent(title);
    if (bountyFilter.blocked) return ctx.reply("Content not allowed. Please rephrase your task title.");
    const id = db.createBounty(title, xrd, ctx.from.id, { skills, criteria });

    // Handle dependencies
    if (dependsMatch) {
      const depIds = dependsMatch[1].split(",").map(Number).filter(n => n > 0);
      for (const depId of depIds) {
        const depResult = db.addDependency(id, depId);
        if (depResult.error) {
          ctx.reply("Warning: dependency on #" + depId + " failed — " + (depResult.detail || depResult.error));
        }
      }
    }
    // Set approval type if specified
    const approvalType = approvalMatch ? approvalMatch[1] : "admin_approved";
    const approvalRepo = repoMatch ? repoMatch[1] : null;
    if (approvalType !== "admin_approved") {
      try { db.prepare("UPDATE bounties SET approval_type = ?, approval_repo = ? WHERE id = ?").run(approvalType, approvalRepo, id); } catch(e) {}
    }
    // Calculate and store insurance fee
    const insFee = insurance.calculateInsuranceFee(xrd);
    queueXpReward(user.radix_address, "bounty_create");
    const createdBounty = db.getBounty(id);
    let reply = "Task #" + id + " created: " + xrd + " XRD\n" + title + "\n";
    if (skills) reply += "Skills: " + skills + "\n";
    if (criteria) reply += "Criteria: " + criteria + "\n";
    reply += "Insurance fee: " + insFee.fee_amount + " XRD (" + insFee.fee_pct + "%)\n";
    reply += "Net to worker: " + insFee.net_to_worker + " XRD\n";
    if (createdBounty && createdBounty.is_blocked) reply += "Status: BLOCKED (waiting on dependencies)\n";
    reply += "\nNext: fund it on-chain so workers can claim it.\n\n" +
      "1. Open the Radix Dashboard and send a transaction:\n" +
      "   Deposit " + xrd + " XRD into the escrow vault\n" +
      "2. Copy the transaction hash\n" +
      "3. Run: /bounty fund " + id + " <tx_hash>\n\n" +
      "The bot verifies your TX on-chain before marking it funded.\n" +
      "Escrow: component_rdx1cp8m...pyg56r\n" +
      "Min deposit: " + (db.getPlatformConfig().min_bounty_xrd || 5) + " XRD\n\n" +
      "View: " + PORTAL + "/bounties/" + id;
    ctx.reply(reply);
    return;
  }

  if (sub === "claim") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const id = parseInt(args[1]);
    if (!id) return ctx.reply("Usage: /bounty claim <id>");
    const result = db.assignBounty(id, ctx.from.id, user.radix_address);
    if (result.error === "not_funded") return ctx.reply("Task #" + id + " isn't funded yet.\n\nThe creator needs to deposit XRD into the on-chain escrow, then verify with:\n/bounty fund " + id + " <tx_hash>");
    if (result.error === "not_found") return ctx.reply("Task #" + id + " not found.");
    if (result.error === "not_open") return ctx.reply("Task #" + id + " is not open for claiming.");
    if (result.error === "application_required") return ctx.reply("Task #" + id + " requires an application (reward > " + result.threshold + " XRD).\n\nUse: /bounty apply " + id + " <your pitch>\n\nThe task creator will review and approve applications.");
    if (result.changes === 0) return ctx.reply("Could not claim task #" + id + ".");
    // Collect insurance fee on claim (bounty is now funded + assigned)
    const insResult = insurance.collectInsuranceFee(id);
    const bountyDetail = db.getBounty(id);
    let claimReply = "Task #" + id + " claimed!";
    if (insResult.ok) {
      claimReply += "\nReward: " + bountyDetail.reward_xrd + " XRD | Insurance: " + insResult.fee_amount + " XRD (" + insResult.fee_pct + "%)";
      claimReply += "\nYou'll receive: " + (bountyDetail.reward_xrd - insResult.fee_amount) + " XRD";
    }
    claimReply += "\n\nSubmit your work with: /bounty submit " + id + " <deliverable_url>";
    ctx.reply(claimReply);
    return;
  }

  if (sub === "submit") {
    const id = parseInt(args[1]);
    const pr = args[2];
    if (!id || !pr) return ctx.reply("Usage: /bounty submit <id> <github_pr_url>");
    // Validate PR URL
    const { parsePRUrl } = require("./services/github");
    const parsed = parsePRUrl(pr);
    if (!parsed) return ctx.reply("Invalid PR URL. Expected: https://github.com/owner/repo/pull/123");
    const result = db.submitBounty(id, pr);
    if (result.changes === 0) return ctx.reply("Bounty not found or not assigned to you.");
    // Check if this bounty has pr_merged approval
    const bounty = db.getBounty(id);
    const approvalType = bounty?.approval_type || "admin_approved";
    if (approvalType === "pr_merged") {
      ctx.reply(
        "Task #" + id + " submitted for auto-verification.\n" +
        "PR: " + pr + "\n\n" +
        "When this PR is merged, escrow releases automatically.\n" +
        "The bot checks every 5 minutes."
      );
    } else {
      ctx.reply("Task #" + id + " submitted for review.\nPR: " + pr + "\nAwaiting verification.");
    }
    return;
  }

  if (sub === "verify") {
    // Admin only — prevents self-verification
    if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");
    const id = parseInt(args[1]);
    if (!id) return ctx.reply("Usage: /bounty verify <id>");
    const bounty = db.getBounty(id);
    if (!bounty) return ctx.reply("Bounty #" + id + " not found.");
    if (bounty.assignee_tg_id && ADMIN_IDS.length > 0 && bounty.assignee_tg_id === ctx.from.id) {
      return ctx.reply("Cannot verify a bounty you are assigned to.");
    }
    const result = db.verifyBounty(id);
    if (result.changes === 0) return ctx.reply("Bounty not found or not submitted.");
    const updated = db.getBounty(id);

    // Auto-release escrow if signer is enabled and bounty has on-chain task ID
    if (updated.onchain_task_id && txSigner.isEnabled()) {
      ctx.reply("Bounty #" + id + " verified! Auto-releasing escrow...");
      const txResult = await txSigner.releaseTask(updated.onchain_task_id, id);
      if (txResult.ok) {
        db.payBounty(id, txResult.txHash);
        const insRelease = insurance.releaseToTreasury(id);
        const unblocked = db.checkAndUnblock(id);
        queueXpReward(updated.assignee_address, "bounty_complete");
        let reply = "Bounty #" + id + " PAID (auto-signed)! " + updated.reward_xrd + " XRD\nTX: " + txResult.txHash.slice(0, 30) + "...";
        if (insRelease.ok) reply += "\nInsurance: " + insRelease.amount + " XRD to treasury.";
        if (unblocked.length > 0) reply += "\nUnblocked: " + unblocked.map(u => "#" + u.id).join(", ");
        ctx.reply(reply);
      } else {
        ctx.reply("Bounty #" + id + " verified but auto-release failed: " + (txResult.detail || txResult.error) + "\nManual payment: /bounty pay " + id + " <tx_hash>");
      }
    } else {
      ctx.reply("Bounty #" + id + " verified! Ready for payment: " + updated.reward_xrd + " XRD\nAdmin: /bounty pay " + id + " <tx_hash>");
    }
    return;
  }

  if (sub === "pay") {
    if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");
    const id = parseInt(args[1]);
    const txHash = args[2];
    if (!id || !txHash) return ctx.reply("Usage: /bounty pay <id> <tx_hash>");
    const result = db.payBounty(id, txHash);
    if (!result.ok) return ctx.reply("Error: " + result.error);
    const bounty = db.getBounty(id);
    queueXpReward(bounty.assignee_address, "bounty_complete");
    // Release insurance fee to treasury (no dispute)
    const insRelease = insurance.releaseToTreasury(id);
    let payReply = "Bounty #" + id + " PAID! " + bounty.reward_xrd + " XRD\nTX: " + txHash.slice(0, 30) + "...\nAssignee earned +50 XP.";
    if (insRelease.ok) payReply += "\nInsurance fee (" + insRelease.amount + " XRD) released to treasury pool.";
    // Auto-unblock dependent tasks
    const unblocked = db.checkAndUnblock(id);
    if (unblocked.length > 0) {
      payReply += "\nUnblocked tasks: " + unblocked.map(u => "#" + u.id + " " + u.title).join(", ");
    }
    ctx.reply(payReply);
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
    // Refund insurance if collected and no work started
    const insRefund = insurance.refundInsurance(id);
    let cancelReply = "Bounty #" + id + " cancelled.\nReason: " + reason;
    if (insRefund.ok) cancelReply += "\nInsurance fee (" + insRefund.amount + " XRD) refunded.";
    ctx.reply(cancelReply);
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
    const application = db.getApplication(appId);
    if (!application) return ctx.reply("Application #" + appId + " not found.");
    const bounty = db.getBounty(application.bounty_id);
    if (!bounty) return ctx.reply("Bounty not found.");
    if (bounty.creator_tg_id !== ctx.from.id && !ADMIN_IDS.includes(ctx.from.id)) {
      return ctx.reply("Only the bounty creator can approve applications.");
    }
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
    const id = parseInt(args[1]);
    const txHash = args[2];
    if (!id || !txHash) return ctx.reply(
      "Usage: /bounty fund <task_id> <tx_hash>\n\n" +
      "Fund a task via the on-chain escrow.\n" +
      "1. Create a task on the dashboard or with /bounty create\n" +
      "2. Send XRD to the TaskEscrow component via Radix Wallet\n" +
      "3. Paste the transaction hash here to verify\n\n" +
      "The escrow vault holds your XRD — no admin wallet custody."
    );

    // Verify the tx actually deposited into the escrow component
    const { verifyEscrowTx } = require("./services/gateway");
    ctx.reply("Verifying transaction on-chain...");
    try {
      const result = await verifyEscrowTx(txHash);
      if (!result.verified) {
        console.log("[Escrow] Verification failed for bounty #" + id + ":", result.reason, "tx:", txHash);
        return ctx.reply(
          "Could not verify this transaction.\n" +
          "Reason: " + result.reason + "\n\n" +
          "Make sure the TX called the TaskEscrow component:\n" +
          "component_rdx1cp8mwwe...pyg56r"
        );
      }

      // Update SQLite with verified funding
      const dbResult = db.fundTask(id, txHash);
      if (!dbResult.ok) return ctx.reply("DB error: " + dbResult.error);

      // Log with audit trail
      db.prepare(
        "INSERT INTO bounty_transactions (bounty_id, tx_type, amount_xrd, tx_hash, description, actor_tg_id, verified_onchain, onchain_task_id) VALUES (?, 'deposit', ?, ?, ?, ?, 1, ?)"
      ).run(id, parseFloat(result.amount) || 0, txHash, "On-chain escrow deposit verified", ctx.from.id, result.task_id);

      // Update on-chain tracking
      if (result.task_id) {
        try { db.prepare("UPDATE bounties SET onchain_task_id = ?, escrow_verified = 1 WHERE id = ?").run(result.task_id, id); } catch(e) {}
      }

      const bounty = db.getBounty(id);
      console.log("[Escrow] VERIFIED: bounty #" + id + " funded, onchain_task_id=" + result.task_id + ", amount=" + result.amount + " XRD, actor=" + ctx.from.id);

      ctx.reply(
        "Task #" + id + " FUNDED (verified on-chain)\n\n" +
        (bounty ? bounty.title + "\n" : "") +
        "Amount: " + (result.amount || "?") + " XRD\n" +
        "Escrow task ID: " + (result.task_id || "?") + "\n" +
        "TX: " + txHash.slice(0, 40) + "...\n\n" +
        "XRD is locked in the Scrypto vault. Workers can now claim this task."
      );
      notifyDiscord("**Task #" + id + " funded (on-chain verified)** — " + (result.amount || "?") + " XRD\n" + (bounty ? bounty.title : "") + "\nWorkers can now claim: " + PORTAL + "/bounties/" + id);
    } catch (e) {
      console.error("[Escrow] Fund verification error:", e.message);
      ctx.reply("Error verifying transaction: " + e.message);
    }
    return;
  }

  if (sub === "deps") {
    const id = parseInt(args[1]);
    if (!id) return ctx.reply("Usage: /bounty deps <id>");
    const info = db.getDependencyInfo(id);
    if (!info) return ctx.reply("Bounty #" + id + " not found.");
    let reply = "Dependencies for task #" + id + ":\n";
    if (info.depends_on.length === 0) {
      reply += "  No dependencies\n";
    } else {
      reply += "  Depends on:\n";
      info.depends_on.forEach(d => {
        const icon = d.status === "paid" ? "done" : d.status === "assigned" ? "in progress" : "pending";
        reply += "    #" + d.id + " " + d.title.slice(0, 40) + " (" + icon + ")\n";
      });
    }
    if (info.blocks.length > 0) {
      reply += "  Blocks:\n";
      info.blocks.forEach(b => reply += "    #" + b.id + " " + b.title.slice(0, 40) + "\n");
    }
    if (info.is_blocked) reply += "\nStatus: BLOCKED";
    ctx.reply(reply);
    return;
  }

  if (sub === "match") {
    const userSkills = args.slice(1).join(",").split(",").map(s => s.trim()).filter(Boolean);
    if (userSkills.length === 0) return ctx.reply("Usage: /bounty match <skills>\nExample: /bounty match scrypto,testing");
    const results = db.matchBounties(userSkills);
    const top = results.filter(r => r.match_score > 0).slice(0, 10);
    if (top.length === 0) return ctx.reply("No matching open tasks for skills: " + userSkills.join(", "));
    const lines = top.map((r, i) =>
      (i + 1) + ". #" + r.id + " " + r.title.slice(0, 40) + " — " + r.reward_xrd + " XRD — Match: " +
      Math.round(r.match_score * 100) + "%" +
      (r.matched_skills.length > 0 ? " (" + r.matched_skills.join(", ") + ")" : "")
    );
    ctx.reply("Matching tasks for [" + userSkills.join(", ") + "]:\n\n" + lines.join("\n"));
    return;
  }

  if (sub === "templates") {
    const templates = db.getTemplates();
    if (templates.length === 0) return ctx.reply("No templates available.");
    const lines = templates.map(t =>
      "  " + t.name + " — " + t.default_reward_xrd + " XRD, " + t.default_difficulty + ", " + t.default_deadline_days + "d"
    );
    ctx.reply("Task Templates:\n\n" + lines.join("\n") + "\n\nUsage: /bounty create --template " + templates[0].name + " \"description\"");
    return;
  }

  ctx.reply(
    "Task commands:\n\n" +
    "/bounty — guided menu\n" +
    "/bounty list — open tasks\n" +
    "/bounty stats — stats + escrow\n" +
    "/bounty create <xrd> <title> — quick create\n" +
    "/bounty create --template <name> \"detail\" — from template\n" +
    "/bounty claim <id> — claim a task\n" +
    "/bounty apply <id> [pitch] — apply for tasks >100 XRD\n" +
    "/bounty cancel <id> [reason] — cancel your task\n" +
    "/bounty submit <id> <pr_url> — submit work\n" +
    "/bounty deps <id> — view dependencies\n" +
    "/bounty match <skills> — find matching tasks\n" +
    "/bounty templates — list templates\n" +
    "/bounty verify <id> — verify delivery (admin)\n" +
    "/bounty pay <id> <tx_hash> — release payment (admin)\n" +
    "/bounty fund <id> <tx_hash> — verify on-chain escrow deposit"
  );
});

// ── /dispute ──────────────────────────────────────────

bot.command("dispute", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "raise") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const bountyId = parseInt(args[1]);
    const reason = args.slice(2).join(" ");
    if (!bountyId || !reason) return ctx.reply("Usage: /dispute raise <bounty_id> <reason>");
    const result = disputeService.raiseDispute(bountyId, ctx.from.id, reason);
    if (result.error) return ctx.reply("Cannot raise dispute: " + (result.detail || result.error));
    let reply = "Dispute #" + result.disputeId + " raised for task #" + result.bountyId + ".\n";
    if (result.arbiter) {
      reply += "Arbiter assigned (ID: " + result.arbiter + "). Deadline: 7 days.\n";
    } else {
      reply += "No eligible arbiter found — escalated to admin.\n";
    }
    reply += "\nSubmit evidence: /dispute evidence " + result.disputeId + " <url_or_text>";
    ctx.reply(reply);
    return;
  }

  if (sub === "evidence") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const disputeId = parseInt(args[1]);
    const content = args.slice(2).join(" ");
    if (!disputeId || !content) return ctx.reply("Usage: /dispute evidence <dispute_id> <url_or_text>");
    // Auto-detect type
    const evidenceType = content.startsWith("http") ? "url" : "text";
    const result = disputeService.addEvidence(disputeId, ctx.from.id, evidenceType, content);
    if (result.error) return ctx.reply("Error: " + (result.detail || result.error));
    ctx.reply("Evidence #" + result.evidenceId + " added to dispute #" + disputeId + ". Other party notified.");
    return;
  }

  if (sub === "status") {
    const disputeId = parseInt(args[1]);
    if (!disputeId) return ctx.reply("Usage: /dispute status <dispute_id>");
    const detail = disputeService.getDisputeDetail(disputeId);
    if (!detail) return ctx.reply("Dispute #" + disputeId + " not found.");
    let reply = "Dispute #" + detail.id + " — " + detail.status.toUpperCase() + "\n";
    reply += "Task: #" + detail.bounty_id + (detail.bounty ? " — " + detail.bounty.title : "") + "\n";
    reply += "Raised by: " + detail.raised_by_tg_id + " vs " + detail.raised_against_tg_id + "\n";
    reply += "Reason: " + detail.reason.slice(0, 200) + "\n";
    if (detail.arbiter) reply += "Arbiter: " + detail.arbiter.tg_id + " (rep: " + detail.arbiter.reputation_score + ")\n";
    if (detail.decision) reply += "Decision: " + detail.decision + (detail.decision_split_pct ? " (" + detail.decision_split_pct + "% to worker)" : "") + "\n";
    if (detail.decision_notes) reply += "Reasoning: " + detail.decision_notes.slice(0, 200) + "\n";
    reply += "Evidence: " + detail.evidence.length + " items | Timeline: " + detail.timeline.length + " events";
    if (detail.appeal_status !== "none") reply += "\nAppeal: " + detail.appeal_status;
    ctx.reply(reply);
    return;
  }

  if (sub === "decide") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const disputeId = parseInt(args[1]);
    const decision = (args[2] || "").toLowerCase();
    // Parse: /dispute decide <id> split <pct> <notes...>  OR  /dispute decide <id> release <notes...>
    let splitPct = null;
    let notesStart = 3;
    if (decision === "split") {
      splitPct = parseInt(args[3]);
      if (isNaN(splitPct)) return ctx.reply("Usage: /dispute decide <id> split <1-99> <reasoning>\nExample: /dispute decide 1 split 70 Worker completed 70% of deliverables");
      notesStart = 4;
    }
    const notes = args.slice(notesStart).join(" ");
    // Map shorthand
    const decisionMap = { release: "full_release", return: "full_return", split: "split", mediate: "mediated" };
    const mappedDecision = decisionMap[decision] || decision;
    if (!disputeId || !mappedDecision || !notes) {
      return ctx.reply("Usage: /dispute decide <id> <release|return|split <pct>|mediate> <reasoning>\nExample: /dispute decide 1 split 70 Worker completed 70% of deliverables");
    }
    const result = disputeService.makeDecision(disputeId, ctx.from.id, mappedDecision, splitPct, notes);
    if (result.error) return ctx.reply("Error: " + (result.detail || result.error));
    let reply = "Decision recorded: " + result.decision;
    if (result.splitPct) reply += " (" + result.splitPct + "% to worker)";
    reply += "\nInsurance fee paid to arbiter.";
    if (result.canAppeal) reply += "\nAppeal window: " + result.appealWindowDays + " days.";
    ctx.reply(reply);
    return;
  }

  if (sub === "appeal") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const disputeId = parseInt(args[1]);
    if (!disputeId) return ctx.reply("Usage: /dispute appeal <dispute_id>");
    const result = disputeService.fileAppeal(disputeId, ctx.from.id);
    if (result.error) return ctx.reply("Cannot appeal: " + (result.detail || result.error));
    ctx.reply("Appeal filed for dispute #" + disputeId + ".\nFee: " + result.appealFee + " XRD\nPanel of 3 arbiters assigned. Decision within 7 days.");
    return;
  }

  if (sub === "list") {
    const filter = (args[1] || "").replace("--", "");
    let disputes;
    if (filter === "mine") {
      const d = db._raw();
      disputes = d.prepare(
        "SELECT d.*, b.title as bounty_title FROM disputes d LEFT JOIN bounties b ON d.bounty_id = b.id WHERE d.raised_by_tg_id = ? OR d.raised_against_tg_id = ? ORDER BY d.created_at DESC LIMIT 20"
      ).all(ctx.from.id, ctx.from.id);
    } else if (filter === "open") {
      disputes = disputeService.getOpenDisputes();
    } else {
      disputes = disputeService.getAllDisputes(20);
    }
    if (!disputes || disputes.length === 0) return ctx.reply("No disputes found.");
    const lines = disputes.map(d =>
      "#" + d.id + " [" + d.status + "] Task #" + d.bounty_id + (d.bounty_title ? " — " + d.bounty_title.slice(0, 40) : "")
    );
    ctx.reply("Disputes:\n" + lines.join("\n"));
    return;
  }

  // Help
  ctx.reply(
    "/dispute raise <bounty_id> <reason> — raise a dispute\n" +
    "/dispute evidence <id> <content> — submit evidence\n" +
    "/dispute status <id> — view dispute details\n" +
    "/dispute decide <id> <decision> <notes> — arbiter decision\n" +
    "/dispute appeal <id> — appeal a decision\n" +
    "/dispute list [--mine|--open] — list disputes"
  );
});

// ── /arbiter ──────────────────────────────────────────

bot.command("arbiter", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "register") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const tags = args.slice(1).join(",").replace(/\s/g, "") || null;
    const result = arbiterService.registerArbiter(ctx.from.id, user.badge_id || null, user.radix_address, tags);
    if (result.error === "already_registered") return ctx.reply("You're already registered as an arbiter.");
    if (result.error === "too_new") return ctx.reply("Must be a member for 30+ days (current: " + result.days + " days).");
    if (result.error) return ctx.reply("Error: " + result.error);
    ctx.reply("Registered as arbiter!" + (tags ? " Specialties: " + tags : "") + (result.reactivated ? " (reactivated)" : ""));
    return;
  }

  if (sub === "status") {
    const stats = arbiterService.getArbiterStats(ctx.from.id);
    if (!stats) return ctx.reply("Not registered as an arbiter. Use: /arbiter register [specialties]");
    ctx.reply(
      "Arbiter Status:\n" +
      "Reputation: " + stats.reputation_score + "\n" +
      "Handled: " + stats.total_handled + " | Upheld: " + stats.total_upheld + " | Overturned: " + stats.total_overturned + "\n" +
      "Availability: " + stats.availability + "\n" +
      (stats.specialty_tags ? "Specialties: " + stats.specialty_tags : "")
    );
    return;
  }

  if (sub === "available") {
    const result = arbiterService.updateAvailability(ctx.from.id, "available");
    if (result.error) return ctx.reply("Error: " + result.error);
    ctx.reply("You're now available for dispute assignments.");
    return;
  }

  if (sub === "unavailable") {
    const result = arbiterService.updateAvailability(ctx.from.id, "unavailable");
    if (result.error) return ctx.reply("Error: " + result.error);
    ctx.reply("You're now unavailable. You won't receive new dispute assignments.");
    return;
  }

  if (sub === "pool") {
    const pool = arbiterService.getArbiterPool();
    if (pool.length === 0) return ctx.reply("No arbiters registered yet. Be the first: /arbiter register");
    const lines = pool.map(a =>
      (a.availability === "available" ? "+" : "-") + " " + a.tg_id +
      " (rep: " + a.reputation_score + ", handled: " + a.total_handled + ")" +
      (a.specialty_tags ? " [" + a.specialty_tags + "]" : "")
    );
    ctx.reply("Arbiter Pool (" + pool.length + "):\n" + lines.join("\n"));
    return;
  }

  ctx.reply(
    "/arbiter register [specialties] — register as arbiter\n" +
    "/arbiter status — your arbiter stats\n" +
    "/arbiter available — mark available\n" +
    "/arbiter unavailable — mark unavailable\n" +
    "/arbiter pool — view all arbiters"
  );
});

// ── /project ──────────────────────────────────────────

bot.command("project", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "status") {
    const groupId = parseInt(args[1]);
    if (!groupId) return ctx.reply("Usage: /project status <group_id>");
    const status = projectService.getFullProjectStatus(groupId);
    if (!status) return ctx.reply("Group #" + groupId + " not found.");
    if (!status.progress) return ctx.reply("No tasks in project '" + status.group.name + "'.");
    const p = status.progress;
    const b = status.budget;
    let reply = "Project: " + status.group.name + " [" + status.pipeline + "]\n" +
      "Progress: " + p.progress_pct + "% (" + p.completed + "/" + p.total_tasks + " tasks)\n" +
      "  Open: " + p.open + " | In progress: " + p.in_progress + " | Blocked: " + p.blocked + "\n" +
      "Budget: " + b.spent + "/" + b.total + " XRD (" + b.remaining + " remaining)\n" +
      "Insurance: " + b.insurance + " XRD | Contributors: " + status.contributors.length;
    if (status.activeTasks.length > 0) {
      reply += "\n\nActive:\n" + status.activeTasks.map(t =>
        "  #" + t.id + " " + t.title.slice(0, 35) + " — " + t.status
      ).join("\n");
    }
    reply += "\n\nFull details: " + PORTAL + "/projects/" + groupId;
    ctx.reply(reply);
    return;
  }

  if (sub === "tasks") {
    const groupId = parseInt(args[1]);
    if (!groupId) return ctx.reply("Usage: /project tasks <group_id>");
    const tasks = db.getProjectBounties(groupId);
    if (tasks.length === 0) return ctx.reply("No tasks in this project.");
    const lines = tasks.map(t => {
      const icon = t.status === "paid" ? "done" : t.status === "assigned" ? "wip" : t.is_blocked ? "blocked" : "open";
      return "  #" + t.id + " [" + icon + "] " + t.title.slice(0, 40) + " — " + t.reward_xrd + " XRD";
    });
    ctx.reply("Project tasks:\n\n" + lines.join("\n") + "\n\nDetails: " + PORTAL + "/projects/" + groupId);
    return;
  }

  if (sub === "ship") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const groupId = parseInt(args[1]);
    if (!groupId) return ctx.reply("Usage: /project ship <group_id>");
    const notes = args.slice(2).join(" ") || null;
    const result = projectService.shipProject(groupId, notes);
    if (result.error) return ctx.reply("Cannot ship: " + (result.detail || result.error));
    ctx.reply(
      "Project '" + result.title + "' SHIPPED!\n\n" +
      "Tasks: " + result.tasks_completed + " completed, " + result.tasks_cancelled + " cancelled\n" +
      "Spent: " + result.total_spent + " XRD to " + result.contributors.length + " contributors\n" +
      "Insurance: " + result.total_insurance + " XRD | Disputes: " + result.disputes + "\n" +
      "Duration: " + result.actual_days + " days\n" +
      "Deliverables: " + result.deliverable_count + " items\n" +
      (result.deliverable_hash ? "Ledger hash: " + result.deliverable_hash.slice(0, 16) + "..." : "") +
      "\n\nRecorded in project ledger."
    );
    return;
  }

  ctx.reply(
    "/project status <id> — project overview\n" +
    "/project tasks <id> — list project tasks\n" +
    "/project ship <id> [notes] — mark project shipped\n\n" +
    "Full project management: " + PORTAL + "/projects"
  );
});

// ── /signer (admin only) ──────────────────────────────────

bot.command("signer", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");
  const args = ctx.message.text.split(" ").slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "status") {
    const status = txSigner.getSignerStatus();
    ctx.reply(
      "TX Signer: " + (status.enabled ? "ENABLED" : "DISABLED") + "\n" +
      "Account: " + status.account + "\n" +
      "Today: " + status.today.count + " TX, " + status.today.value_xrd.toFixed(1) + " XRD" +
      (status.today.failed > 0 ? " (" + status.today.failed + " failed)" : "") + "\n" +
      "This hour: " + status.this_hour.count + " TX\n" +
      "Total: " + status.total_tx + " TX\n" +
      "Limits: " + status.limits.max_per_hour + "/hr, " + status.limits.max_per_day + "/day, " +
      status.limits.max_xrd_per_tx + " XRD/tx, " + status.limits.max_xrd_per_day + " XRD/day"
    );
    return;
  }

  if (sub === "disable") {
    const reason = args.slice(1).join(" ") || "Manual disable via TG";
    txSigner.disableSigner(reason);
    ctx.reply("TX signer DISABLED. Reason: " + reason);
    return;
  }

  if (sub === "enable") {
    txSigner.enableSigner();
    ctx.reply("TX signer ENABLED.");
    return;
  }

  if (sub === "audit") {
    const limit = parseInt(args[1]) || 10;
    const log = txSigner.getAuditLog(limit);
    if (log.length === 0) return ctx.reply("No audit entries.");
    const lines = log.map(e => {
      const time = new Date(e.created_at * 1000).toISOString().slice(5, 16);
      return time + " " + e.action + " [" + e.status + "]" +
        (e.value_xrd ? " " + e.value_xrd + "XRD" : "") +
        (e.tx_hash ? " " + e.tx_hash.slice(0, 12) + "..." : "") +
        (e.error_message ? " ERR:" + e.error_message.slice(0, 30) : "");
    });
    ctx.reply("Signer Audit (" + log.length + "):\n\n" + lines.join("\n"));
    return;
  }

  if (sub === "balance") {
    const bal = await txSigner.checkBalance();
    if (bal.error) return ctx.reply("Balance check failed: " + (bal.detail || bal.error));
    ctx.reply("Signer balance: " + bal.balance.toFixed(2) + " XRD" + (bal.alert ? " (LOW!)" : ""));
    return;
  }

  ctx.reply(
    "/signer status — overview\n" +
    "/signer disable [reason] — kill switch\n" +
    "/signer enable — re-enable\n" +
    "/signer audit [N] — last N transactions\n" +
    "/signer balance — wallet balance"
  );
});

// ── /milestone ──────────────────────────────────────────

bot.command("milestone", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "add") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const bountyId = parseInt(args[1]);
    const pct = parseInt(args[2]);
    const title = args.slice(3).join(" ");
    if (!bountyId || !pct || !title) return ctx.reply("Usage: /milestone add <bounty_id> <percentage> <title>");
    const bounty = db.getBounty(bountyId);
    if (!bounty) return ctx.reply("Bounty #" + bountyId + " not found.");
    if (bounty.creator_tg_id !== ctx.from.id && !ADMIN_IDS.includes(ctx.from.id)) {
      return ctx.reply("Only the bounty creator or admin can add milestones.");
    }
    const result = db.addMilestone(bountyId, title, null, pct);
    if (result.error) return ctx.reply("Error: " + (result.detail || result.error));
    ctx.reply(
      "Milestone added to Task #" + bountyId + ":\n" +
      "\"" + title + "\" — " + pct + "% (" + result.amountXrd.toFixed(1) + " XRD)\n\n" +
      "Allocated: " + result.totalAllocated + "% | Remaining: " + result.remaining + "%"
    );
    return;
  }

  if (sub === "list") {
    const bountyId = parseInt(args[1]);
    if (!bountyId) return ctx.reply("Usage: /milestone list <bounty_id>");
    const milestones = db.getMilestones(bountyId);
    if (milestones.length === 0) return ctx.reply("No milestones for Task #" + bountyId + ".");
    const bounty = db.getBounty(bountyId);
    const progress = db.getMilestoneProgress(bountyId);
    const icons = { pending: "⏳", submitted: "🔄", verified: "✅", paid: "💰" };
    let msg = "Task #" + bountyId + " Milestones" + (bounty ? " (" + bounty.reward_xrd + " XRD)" : "") + "\n\n";
    milestones.forEach((m, i) => {
      msg += (icons[m.status] || "?") + " " + (i + 1) + ". " + m.title + " — " + m.percentage + "% (" + m.amount_xrd.toFixed(1) + " XRD) [" + m.status + "]\n";
    });
    if (progress) {
      msg += "\nProgress: " + progress.paidPct + "% paid, " + progress.remainingXrd.toFixed(1) + " XRD remaining";
    }
    ctx.reply(msg);
    return;
  }

  if (sub === "submit") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const msId = parseInt(args[1]);
    if (!msId) return ctx.reply("Usage: /milestone submit <milestone_id>");
    const result = db.submitMilestone(msId, ctx.from.id);
    if (result.error) return ctx.reply("Error: " + (result.detail || result.error));
    ctx.reply("Milestone #" + msId + " submitted: \"" + result.title + "\"\nAwaiting verification.");
    // Notify bounty creator
    const bounty = db.getBounty(result.bountyId);
    if (bounty && bounty.creator_tg_id !== ctx.from.id) {
      try { await ctx.api.sendMessage(bounty.creator_tg_id, "🔔 Milestone submitted for Task #" + result.bountyId + ":\n\"" + result.title + "\"\n\nVerify: /milestone verify " + msId); } catch(_) {}
    }
    return;
  }

  if (sub === "verify") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const msId = parseInt(args[1]);
    if (!msId) return ctx.reply("Usage: /milestone verify <milestone_id>");
    const result = db.verifyMilestone(msId, ctx.from.id);
    if (result.error) return ctx.reply("Error: " + (result.detail || result.error));
    ctx.reply("Milestone #" + msId + " verified: \"" + result.title + "\" (" + result.amount.toFixed(1) + " XRD)\nReady for payment: /milestone pay " + msId + " <tx_hash>");
    return;
  }

  if (sub === "pay") {
    if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");
    const msId = parseInt(args[1]);
    const txHash = args[2];
    if (!msId || !txHash) return ctx.reply("Usage: /milestone pay <milestone_id> <tx_hash>");
    const result = db.payMilestone(msId, txHash);
    if (result.error) return ctx.reply("Error: " + (result.detail || result.error));
    let msg = "Milestone #" + msId + " PAID: " + result.amount.toFixed(1) + " XRD\n\"" + result.title + "\"\nTX: " + txHash.slice(0, 25) + "...";
    if (result.bountyComplete) msg += "\n\n🎉 All milestones paid — Task #" + result.bountyId + " is COMPLETE!";
    ctx.reply(msg);
    return;
  }

  if (sub === "remove") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const msId = parseInt(args[1]);
    if (!msId) return ctx.reply("Usage: /milestone remove <milestone_id>");
    const ms = db.getMilestoneById(msId);
    if (!ms) return ctx.reply("Milestone not found.");
    const bounty = db.getBounty(ms.bounty_id);
    if (bounty && bounty.creator_tg_id !== ctx.from.id && !ADMIN_IDS.includes(ctx.from.id)) {
      return ctx.reply("Only the bounty creator or admin can remove milestones.");
    }
    const result = db.removeMilestone(msId);
    if (result.error) return ctx.reply("Error: " + (result.detail || result.error));
    ctx.reply("Milestone #" + msId + " removed from Task #" + result.bountyId + ".");
    return;
  }

  ctx.reply(
    "Milestone Commands\n\n" +
    "/milestone add <bounty_id> <pct> <title> — add milestone\n" +
    "/milestone list <bounty_id> — show milestones\n" +
    "/milestone submit <ms_id> — submit work (assignee)\n" +
    "/milestone verify <ms_id> — verify delivery (reviewer)\n" +
    "/milestone pay <ms_id> <tx_hash> — release payment (admin)\n" +
    "/milestone remove <ms_id> — remove pending milestone"
  );
});

// ── /groups (Working Groups) ──────────────────────────

bot.command("groups", (ctx) => {
  const groups = db.getGroups();
  if (groups.length === 0) return ctx.reply("No working groups yet.");
  let msg = "Working Groups\n\n";
  groups.forEach(g => {
    msg += g.name + " (" + g.member_count + " members)\n";
    msg += "  " + g.description + "\n\n";
  });
  msg += "Join: /group join <name>\nView: " + PORTAL + "/groups";
  ctx.reply(msg);
});

bot.command("group", async (ctx) => {
  const args = ctx.message.text.split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  if (sub === "join") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const name = args.slice(1).join(" ");
    if (!name) return ctx.reply("Usage: /group join <group name>");
    const group = db.getGroupByName(name);
    if (!group) return ctx.reply("Group not found. See /groups for available groups.");
    const result = db.joinGroup(group.id, ctx.from.id, user.radix_address);
    if (result.error === "already_member") return ctx.reply("You're already in " + group.name + "!");
    if (!result.ok) return ctx.reply("Error: " + result.error);
    ctx.reply("Joined " + group.name + "! View: " + PORTAL + "/groups/" + group.id);
    return;
  }

  if (sub === "leave") {
    const name = args.slice(1).join(" ");
    if (!name) return ctx.reply("Usage: /group leave <group name>");
    const group = db.getGroupByName(name);
    if (!group) return ctx.reply("Group not found.");
    const user = db.getUser(ctx.from.id);
    if (!user) return ctx.reply("Register first: /register <account_rdx1...>");
    const result = db.leaveGroup(group.id, user.radix_address);
    if (!result.ok) return ctx.reply("You're not a member or you're the lead (leads can't leave).");
    ctx.reply("Left " + group.name + ".");
    return;
  }

  // View a specific group
  const name = args.join(" ");
  if (!name) return ctx.reply("Usage: /group <name> or /group join <name> or /group leave <name>");
  const group = db.getGroupByName(name);
  if (!group) return ctx.reply("Group not found. See /groups for available groups.");
  const detail = db.getGroupDetail(group.id);
  let msg = detail.name + "\n" + detail.description + "\n\n";
  msg += "Members (" + detail.member_count + "):\n";
  detail.members.forEach(m => {
    msg += "  " + (m.role === "lead" ? "Lead: " : "") + m.radix_address.slice(0, 16) + "...\n";
  });
  if (detail.bounties.length > 0) {
    msg += "\nLinked Tasks: " + detail.bounties.length + "\n";
  }
  msg += "\nView: " + PORTAL + "/groups/" + detail.id;
  ctx.reply(msg);
});

// ── /wg (Working Group management) ────────────────────

bot.command("wg", async (ctx) => {
  const args = ctx.message.text.split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  // /wg report <group_name> — create a WG report (wizard or inline)
  if (sub === "report") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const name = args.slice(1).join(" ");
    if (!name) return ctx.reply("Usage: /wg report <group name>\n\nExample: /wg report Guild");
    const group = db.getGroupByName(name);
    if (!group) return ctx.reply("Group not found. See /groups for available groups.");

    // Check inline args: /wg report Guild delivered="X" next="Y" blocked="Z" spent=500
    const inline = args.slice(1).join(" ");
    const deliveredMatch = inline.match(/delivered="([^"]+)"/);
    const nextMatch = inline.match(/next="([^"]+)"/);
    const blockedMatch = inline.match(/blocked="([^"]+)"/);
    const spentMatch = inline.match(/spent=(\d+(?:\.\d+)?)/);

    if (deliveredMatch) {
      // Inline mode — create report immediately
      const delivered = deliveredMatch[1];
      const nextSteps = nextMatch ? nextMatch[1] : null;
      const blocked = blockedMatch ? blockedMatch[1] : null;
      const spent = spentMatch ? parseFloat(spentMatch[1]) : 0;
      const now = new Date();
      const period = now.toISOString().slice(0, 7); // YYYY-MM
      const reportId = db.createWGReport(group.id, ctx.from.id, delivered, nextSteps, blocked, spent, period);
      return ctx.reply(
        "Report #" + reportId + " filed for " + group.name + "\n\n" +
        "Delivered: " + delivered + "\n" +
        (nextSteps ? "Next: " + nextSteps + "\n" : "") +
        (blocked ? "Blocked: " + blocked + "\n" : "") +
        (spent > 0 ? "Spent: " + spent + " XRD\n" : "") +
        "Period: " + period
      );
    }

    // Wizard mode — store state and prompt for fields
    wizardStates.set(ctx.from.id, {
      wizard: "wg_report",
      step: "delivered",
      groupId: group.id,
      groupName: group.name,
      data: {},
    });
    return ctx.reply(
      "WG Report: " + group.name + "\n\n" +
      "Step 1/4: What was delivered this period?\n" +
      "(Type your answer, or /cancel to abort)"
    );
  }

  // /wg assign <task_id> <group_name> — link a bounty to a WG
  if (sub === "assign") {
    const user = await requireBadge(ctx);
    if (!user) return;
    const taskId = parseInt(args[1]);
    const name = args.slice(2).join(" ");
    if (!taskId || !name) return ctx.reply("Usage: /wg assign <task_id> <group name>");
    const group = db.getGroupByName(name);
    if (!group) return ctx.reply("Group not found. See /groups for available groups.");
    const result = db.assignTaskToGroup(taskId, group.id);
    if (!result.ok) return ctx.reply("Error: " + result.error);
    return ctx.reply("Task #" + taskId + " assigned to " + group.name + ".");
  }

  // /wg budget <group_name> — show budget status
  if (sub === "budget") {
    const name = args.slice(1).join(" ");
    if (!name) return ctx.reply("Usage: /wg budget <group name>");
    const group = db.getGroupByName(name);
    if (!group) return ctx.reply("Group not found. See /groups for available groups.");
    const budget = db.getGroupBudgetStatus(group.id);
    if (!budget) return ctx.reply("Could not load budget.");
    const bar = budget.monthly > 0
      ? "[" + "#".repeat(Math.min(20, Math.round(budget.percentage / 5))) + "-".repeat(Math.max(0, 20 - Math.round(budget.percentage / 5))) + "] " + budget.percentage + "%"
      : "No budget set";
    return ctx.reply(
      "Budget: " + group.name + "\n\n" +
      "Monthly: " + budget.monthly + " XRD\n" +
      "Spent:   " + budget.spent + " XRD\n" +
      "Left:    " + budget.remaining + " XRD\n" +
      bar
    );
  }

  // /wg sunset <group> <YYYY-MM-DD> — set charter expiry
  if (sub === "sunset") {
    if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");
    const dateStr = args[args.length - 1]; // last arg is date
    const name = args.slice(1, -1).join(" ");
    if (!name || !dateStr) return ctx.reply("Usage: /wg sunset <group name> <YYYY-MM-DD>");
    const group = db.getGroupByName(name);
    if (!group) return ctx.reply("Group not found: " + name);
    const ts = Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000);
    if (isNaN(ts) || ts < Math.floor(Date.now() / 1000)) return ctx.reply("Invalid or past date. Use YYYY-MM-DD format.");
    db.updateSunsetDate(group.id, ts);
    const daysLeft = Math.round((ts - Date.now() / 1000) / 86400);
    return ctx.reply("Charter sunset set for " + group.name + ": " + dateStr + " (" + daysLeft + " days from now)");
  }

  // /wg renew <group> <months> — extend charter
  if (sub === "renew") {
    if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");
    const months = parseInt(args[args.length - 1]) || 6;
    const name = args.slice(1, -1).join(" ");
    if (!name) return ctx.reply("Usage: /wg renew <group name> <months>");
    const group = db.getGroupByName(name);
    if (!group) return ctx.reply("Group not found: " + name);
    const baseDate = group.sunset_date && group.sunset_date > Date.now() / 1000
      ? new Date(group.sunset_date * 1000)
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);
    const newSunset = Math.floor(baseDate.getTime() / 1000);
    db.renewCharter(group.id, newSunset);
    const newDate = new Date(newSunset * 1000).toISOString().slice(0, 10);
    return ctx.reply("Charter renewed for " + group.name + ". New sunset: " + newDate + " (+" + months + " months)");
  }

  // /wg overdue — list groups with no report this period
  if (sub === "overdue") {
    const overdue = db.getOverdueReports();
    const period = db.getCurrentPeriod();
    if (overdue.length === 0) return ctx.reply("All groups have filed reports for " + period + ".");
    let msg = "Overdue Reports (" + period + ")\n\n";
    for (const g of overdue) {
      msg += "  " + (g.icon || "") + " " + g.name;
      if (g.lead_tg_id) msg += " (lead: " + g.lead_tg_id + ")";
      msg += "\n";
    }
    msg += "\nFile a report: /wg report <group name>";
    return ctx.reply(msg);
  }

  // Default: show usage
  ctx.reply(
    "Working Group Commands\n\n" +
    "/wg report <group> — File a biweekly WG report\n" +
    "/wg assign <task_id> <group> — Link task to group\n" +
    "/wg budget <group> — View budget status\n" +
    "/wg sunset <group> <YYYY-MM-DD> — Set charter expiry\n" +
    "/wg renew <group> <months> — Extend charter\n" +
    "/wg overdue — Groups with no report this period\n\n" +
    "See /groups for all working groups."
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
    const tierLevels = { member: "Lv.1", contributor: "Lv.2", builder: "Lv.3", steward: "Lv.4", elder: "Lv.5" };
    const trust = db.getTrustScore(ctx.from.id);
    msg += "Guild Member: " + badge.tier + " (" + (tierLevels[badge.tier] || "Lv.1") + ")\n";
    msg += "XP: " + badge.xp + " | Level: " + badge.level + "\n";
    if (trust) msg += "Trust: " + trust.score + " (" + trust.tier.toUpperCase() + ")\n";
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

bot.command("charter", async (ctx) => {
  const args = ctx.message.text.split(/\s+/).slice(1);
  const sub = args[0];

  // /charter guide — interactive guided voting
  if (sub === "guide") {
    const user = await requireBadge(ctx);
    if (!user) return;

    const status = db.getCharterStatus();
    const ready = db.getReadyParams();

    if (ready.length === 0) {
      return ctx.reply(
        "Charter Progress: " + status.resolved + "/" + status.total + " resolved\n\n" +
        "No parameters ready to vote on right now.\n" +
        (status.resolved === 0 ? "The 6 foundation proposals need votes first. Type /proposals to see them." : "Waiting for dependencies to resolve.")
      );
    }

    // Find active proposals linked to ready charter params
    const activeProposals = db.getActiveProposals();
    const charterProposals = activeProposals.filter(p => p.charter_param && ready.some(r => r.param_key === p.charter_param));

    if (charterProposals.length === 0) {
      let msg = "Charter Progress: " + status.resolved + "/" + status.total + " resolved\n\n";
      msg += ready.length + " parameters are ready but no active proposals yet.\n\n";
      msg += "Ready to propose:\n";
      ready.slice(0, 5).forEach(p => {
        const opts = p.options ? JSON.parse(p.options) : null;
        msg += "\n" + p.title + "\n";
        if (opts) msg += "Options: " + opts.join(", ") + "\n";
      });
      msg += "\nCreate a proposal with /propose or /poll to start voting.";
      return ctx.reply(msg);
    }

    // Show guided voting with inline keyboards
    let msg = "Charter Guided Voting\n\n" +
      "Progress: " + status.resolved + "/" + status.total + " (" + Math.round(status.resolved / status.total * 100) + "%)\n" +
      charterProposals.length + " charter votes active — vote below!\n\n";

    // Show first 3 charter proposals with vote prompts
    for (const p of charterProposals.slice(0, 3)) {
      const counts = db.getVoteCounts(p.id);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const timeLeft = p.ends_at - Math.floor(Date.now() / 1000);
      const hours = Math.max(0, Math.round(timeLeft / 3600));

      msg += "#" + p.id + " " + p.title + "\n";
      msg += "Votes: " + total + "/" + p.min_votes + " | " + hours + "h left\n";
      if (Object.keys(counts).length > 0) {
        Object.entries(counts).forEach(([opt, count]) => {
          msg += "  " + opt + ": " + count + "\n";
        });
      }
      msg += "\n";
    }

    msg += "Vote with /vote <id> or tap the buttons on proposal messages.\n";
    msg += "Each vote earns +10 XP + a dice roll!";

    const kb = new InlineKeyboard();
    charterProposals.slice(0, 3).forEach(p => {
      kb.text("Vote on #" + p.id, "charter_vote_" + p.id).row();
    });
    kb.text("View all proposals", "charter_view_all");

    return ctx.reply(msg, { reply_markup: kb });
  }

  // Default: /charter — show status
  const status = db.getCharterStatus();
  const ready = db.getReadyParams();

  let msg = "Radix DAO Charter\n\n" +
    "Progress: " + status.resolved + "/" + status.total + " (" + Math.round(status.resolved / status.total * 100) + "%)\n" +
    "Resolved: " + status.resolved + " | Voting: " + status.voting + " | Pending: " + status.tbd + "\n\n";

  if (ready.length > 0) {
    msg += "Ready to vote (" + ready.length + "):\n";
    ready.slice(0, 10).forEach(p => {
      msg += "  " + p.param_key + " — " + p.title + "\n";
    });
    if (ready.length > 10) msg += "  ... and " + (ready.length - 10) + " more\n";
    msg += "\nUse /charter guide for interactive voting!";
  }

  const resolved = db.getCharterParams().filter(p => p.status === "resolved");
  if (resolved.length > 0) {
    msg += "\nResolved:\n";
    resolved.forEach(p => {
      msg += "  " + p.param_key + " = " + p.param_value + "\n";
    });
  }

  msg += "\nDashboard: " + PORTAL + "/proposals\nCharter: radix.wiki/ideas/radix-network-dao-charter";
  ctx.reply(msg);
});

// Charter guide callback: vote on specific proposal
bot.callbackQuery(/^charter_vote_(\d+)$/, async (ctx) => {
  try {
    const id = parseInt(ctx.match[1]);
    const proposal = db.getProposal(id);
    if (!proposal || proposal.status !== "active") {
      return ctx.answerCallbackQuery({ text: "This vote has ended.", show_alert: true });
    }
    const counts = db.getVoteCounts(id);
    let kb;
    if (proposal.type === "yesno") {
      kb = buildYesNoKeyboard(id, counts);
    } else {
      const opts = proposal.options ? JSON.parse(proposal.options) : [];
      kb = buildPollKeyboard(id, opts, counts);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    await ctx.reply(
      "Charter Vote #" + id + "\n\n" +
      proposal.title + "\n\n" +
      "Votes: " + total + "/" + proposal.min_votes + "\n" +
      "Charter param: " + (proposal.charter_param || "none"),
      { reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  } catch (e) {
    console.error("[Charter] Vote callback error:", e.message);
    try { ctx.answerCallbackQuery({ text: "Error. Try again.", show_alert: true }); } catch (_) {}
  }
});

bot.callbackQuery("charter_view_all", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Use /proposals to see all active votes", show_alert: true });
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
  "Tiers reflect game progression: Member / Contributor / Builder / Steward / Elder.\n" +
  "Voting weights are TBD — decided by the guild through charter votes.\n\n" +

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
  const tierLevels = { member: "Lv.1", contributor: "Lv.2", builder: "Lv.3", steward: "Lv.4", elder: "Lv.5" };

  let msg = "Wallet: " + user.radix_address.slice(0, 25) + "...\n\n";

  if (badge) {
    const trust = db.getTrustScore(ctx.from.id);
    msg += "Badge: " + badge.id + "\n" +
      "Name: " + badge.issued_to + "\n" +
      "Tier: " + badge.tier + " (" + (tierLevels[badge.tier] || "Lv.1") + ")\n" +
      "XP: " + badge.xp + " | Level: " + badge.level + "\n" +
      (trust ? "Trust: " + trust.score + " (" + trust.tier.toUpperCase() + ")\n" : "") +
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
// ── /trust — Trust Score ──────────────────────────────────

bot.command("trust", async (ctx) => {
  const score = db.getTrustScore(ctx.from.id);
  if (!score) return ctx.reply("Register first: /register <account_rdx1...>");

  const b = score.breakdown;
  let msg = "Trust Score: " + score.score + " (" + score.tier.toUpperCase() + ")\n\n";
  msg += "Account age: " + b.age_days + " days (+" + b.age_points + ")\n";
  msg += "Votes cast: " + b.votes + " (+" + b.vote_points + ")\n";
  msg += "Proposals created: " + b.proposals + " (+" + b.proposal_points + ")\n";
  msg += "Tasks completed: " + b.tasks_completed + " (+" + b.task_points + ")\n";
  msg += "Groups joined: " + b.groups + " (+" + b.group_points + ")\n";
  msg += "Feedback submitted: " + b.feedback + " (+" + b.feedback_points + ")\n\n";
  msg += "Tiers: Bronze (0+) → Silver (50+) → Gold (200+)\n";
  msg += "Higher tiers unlock more actions. Earn trust through participation.";
  ctx.reply(msg);
});

bot.command("dao", (ctx) => ctx.reply("Guild DAO:\n" + DAO_URL));
bot.command("source", (ctx) => ctx.reply("Source:\n" + GITHUB));
// charter command defined above with /charter guide support
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
  "• 32 charter decisions with dependency tracking\n" +
  "• Bounty marketplace + multi-token escrow (V3)\n" +
  "• Conviction voting (CV3) — time-weighted fund allocation\n" +
  "• Dashboard with proposals, bounties, profile, trust scores\n" +
  "• Create proposals + bounties from dashboard or Telegram\n\n" +
  "GitHub: " + GITHUB + "\n" +
  "Dashboard: " + PORTAL + "\n" +
  "Charter: radix.wiki/ideas/radix-network-dao-charter\n\n" +
  "MIT licensed. Open source. Built by bigdev."
));

bot.command("support", (ctx) => ctx.reply(
  "Need help?\n\n" +
  "• /faq — frequently asked questions\n" +
  "• /help — all bot commands\n" +
  "• /feedback <message> — report an issue or share feedback\n" +
  "• /mystatus — check your open tickets\n\n" +
  "GitHub: " + GITHUB + "/issues\n" +
  "Contact: @bigdev_xrd (Telegram DM)\n\n" +
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
  try {
    ctx.answerCallbackQuery("Glad that helped!");
    ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✓ Resolved by FAQ").catch(() => {});
  } catch (e) { console.error("[FAQ] resolved callback error:", e.message); }
});

// FAQ callback: submit anyway (create ticket despite FAQ match)
bot.callbackQuery(/^faq_submit_/, (ctx) => {
  try {
    const parts = ctx.callbackQuery.data.split("_");
    const tgId = parseInt(parts[2]);
    const message = decodeURIComponent(parts.slice(3).join("_"));
    const username = ctx.from.username || ctx.from.first_name || "anon";
    const id = db.createFeedback(tgId, username, message || "Feedback submitted after FAQ");
    ctx.answerCallbackQuery("Ticket #" + id + " created");
    ctx.editMessageText(ctx.callbackQuery.message.text + "\n\nTicket #" + id + " created. Check status: /mystatus").catch(() => {});
  } catch (e) { console.error("[FAQ] submit callback error:", e.message); }
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
    if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");
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

// ── /cv3 — Conviction Voting ────────────────────────────

bot.command("cv3", async (ctx) => {
  if (!cv3Watcher.isEnabled()) {
    return ctx.reply(
      "Conviction Voting (CV3) is not yet enabled.\n\n" +
      "When active, community members stake XRD on proposals. " +
      "Conviction builds over time — when threshold is met, funds auto-release from the shared pool.\n\n" +
      "Badge tier multipliers: Member 1x, Contributor 1.5x, Builder+ 2x\n" +
      "Dashboard: " + PORTAL + "/docs (see CV3 section)"
    );
  }

  const args = (ctx.message?.text || "").split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  if (sub === "create") {
    return ctx.reply(
      "CV3 Conviction Voting — Testing Mode\n\n" +
      "On-chain staking is currently disabled while the community reviews the mechanics.\n\n" +
      "The conviction system is deployed on mainnet and the mechanics work in the database. " +
      "The community will vote to activate on-chain staking when ready.\n\n" +
      "View the system: " + PORTAL + "/proposals\n" +
      "Learn how it works: " + PORTAL + "/docs"
    );
  }

  if (sub === "status") {
    const status = cv3Watcher.getSyncStatus();
    return ctx.reply(
      "CV3 Conviction Voting\n\n" +
      "Enabled: " + status.enabled + "\n" +
      "Component: " + (status.component?.slice(0, 25) || "—") + "...\n" +
      "Proposals: " + status.proposalCount + "\n" +
      "Pool Balance: " + (status.poolBalance || 0) + " XRD\n" +
      "Last Sync: " + (status.lastSync ? new Date(status.lastSync * 1000).toISOString().slice(0, 19) : "never") + "\n" +
      "Errors: " + status.errors + "\n\n" +
      "Params (BETA): alpha=0.9904, threshold=10x, half-life=3 days"
    );
  }

  if (sub === "pool") {
    const status = cv3Watcher.getSyncStatus();
    return ctx.reply(
      "CV3 Shared Pool\n\n" +
      "Balance: " + (status.poolBalance || 0) + " XRD\n" +
      "Active Proposals: " + status.proposalCount + "\n\n" +
      "Proposals compete for pool funds. Highest conviction wins first.\n" +
      "Fund the pool on-chain to enable community task funding."
    );
  }

  // /cv3 <id> — detail
  if (sub && sub !== "list") {
    const id = parseInt(sub);
    if (isNaN(id)) return ctx.reply("Usage: /cv3 <proposal_id>");
    const proposal = cv3Watcher.getProposal(id);
    if (!proposal) return ctx.reply("CV3 proposal #" + id + " not found.");
    const stakes = cv3Watcher.getStakes(id);
    const pct = proposal.threshold > 0 ? Math.round((proposal.conviction / proposal.threshold) * 100) : 0;
    const bar = "\u2588".repeat(Math.min(10, Math.floor(pct / 10))) + "\u2591".repeat(10 - Math.min(10, Math.floor(pct / 10)));
    let msg = "CV3 Proposal #" + proposal.id + "\n\n" +
      "Title: " + proposal.title + "\n" +
      "Requested: " + proposal.requested_amount + " XRD\n" +
      "Status: " + proposal.status + "\n\n" +
      "Conviction: [" + bar + "] " + pct + "%\n" +
      "  Score: " + Math.round(proposal.conviction) + " / " + Math.round(proposal.threshold) + "\n\n" +
      "Stakers: " + stakes.length + "\n" +
      "Total Staked: " + proposal.total_staked + " XRD\n" +
      "Weighted: " + proposal.weighted_staked + " XRD\n";
    if (proposal.task_bounty_id) msg += "Linked Bounty: #" + proposal.task_bounty_id + "\n";
    msg += "\nStake XRD on this proposal to increase conviction.\nDashboard: " + PORTAL + "/proposals";
    return ctx.reply(msg);
  }

  // /cv3 — list active
  const proposals = cv3Watcher.getActiveProposals();
  if (proposals.length === 0) {
    return ctx.reply(
      "No active conviction proposals.\n\n" +
      "Create proposals on-chain and stake XRD to signal which tasks the community should fund.\n\n" +
      "Use /cv3 status to check sync health.\n" +
      "Docs: " + PORTAL + "/docs"
    );
  }

  let msg = "CV3 Conviction Voting\n\n";
  for (const p of proposals.slice(0, 10)) {
    const pct = p.threshold > 0 ? Math.round((p.conviction / p.threshold) * 100) : 0;
    const bar = "\u2588".repeat(Math.min(5, Math.floor(pct / 20))) + "\u2591".repeat(5 - Math.min(5, Math.floor(pct / 20)));
    msg += "#" + p.id + " " + (p.title || "Untitled") + "\n" +
      "  [" + bar + "] " + pct + "% | " + p.staker_count + " stakers | " + p.requested_amount + " XRD\n";
    if (p.task_bounty_id) msg += "  Linked: bounty #" + p.task_bounty_id + "\n";
    msg += "\n";
  }
  msg += "Use /cv3 <id> for details";
  return ctx.reply(msg);
});

// ── Agent Management (Phase 8) ────────────────────────

bot.command("agent", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return ctx.reply("Admin only.");

  const args = (ctx.match || "").trim().split(/\s+/);
  const sub = args[0];

  if (sub === "create") {
    const name = args[1];
    const scopeStr = args[2];
    if (!name || !scopeStr) return ctx.reply("Usage: /agent create <name> <scopes>\nScopes (comma-separated): tasks:read, tasks:claim, tasks:submit, proposals:read, proposals:create, projects:read, projects:breakdown, admin");
    const scopes = scopeStr.split(",").map(s => s.trim());
    const result = agentBridge.createAgentKey(name, scopes, ctx.from.id);
    if (result.error) return ctx.reply("Error: " + result.error + (result.detail ? " — " + result.detail : ""));
    return ctx.reply(
      "Agent key created!\n\n" +
      "Name: " + result.name + "\n" +
      "Key ID: " + result.keyId + "\n" +
      "Scopes: " + result.scopes.join(", ") + "\n" +
      "Rate limit: " + result.rateLimitPerHour + "/hour\n" +
      "Daily budget: " + result.dailyBudgetXrd + " XRD\n\n" +
      "API Key (save now — shown ONCE):\n<code>" + result.rawKey + "</code>\n\n" +
      "Usage: Authorization: Bearer " + result.rawKey.slice(0, 12) + "...",
      { parse_mode: "HTML" }
    );
  }

  if (sub === "list") {
    const keys = agentBridge.listKeys();
    if (keys.length === 0) return ctx.reply("No agent keys.");
    let msg = "Agent Keys (" + keys.length + "):\n\n";
    for (const k of keys) {
      const status = k.enabled ? "active" : "REVOKED";
      const lastUsed = k.last_used_at ? new Date(k.last_used_at * 1000).toLocaleDateString() : "never";
      msg += "#" + k.id + " " + k.name + " [" + status + "]\n";
      msg += "  Scopes: " + k.scopes.join(", ") + "\n";
      msg += "  Rate: " + k.rate_limit_per_hour + "/hr | Budget: " + k.daily_budget_xrd + " XRD/day\n";
      msg += "  Last used: " + lastUsed + "\n\n";
    }
    return ctx.reply(msg);
  }

  if (sub === "revoke") {
    const keyId = parseInt(args[1]);
    if (!keyId) return ctx.reply("Usage: /agent revoke <key_id>");
    const result = agentBridge.revokeKey(keyId);
    return ctx.reply(result.ok ? "Key #" + keyId + " revoked." : "Error: " + result.error);
  }

  if (sub === "activity") {
    const keyId = args[1] ? parseInt(args[1]) : null;
    const activity = agentBridge.getActivity(keyId, 10);
    if (activity.length === 0) return ctx.reply("No agent activity" + (keyId ? " for key #" + keyId : "") + ".");
    let msg = "Recent Agent Activity:\n\n";
    for (const a of activity) {
      const time = new Date(a.created_at * 1000).toLocaleString();
      msg += (a.agent_name || "#" + a.agent_key_id) + " | " + a.action + " | " + time + "\n";
    }
    return ctx.reply(msg);
  }

  return ctx.reply(
    "Agent Management:\n" +
    "/agent create <name> <scopes> — Create API key\n" +
    "/agent list — Show all keys\n" +
    "/agent revoke <id> — Disable key\n" +
    "/agent activity [id] — Recent actions"
  );
});

// ── Welcome new members ────────────────────────────────

bot.on("message:new_chat_members", async (ctx) => {
  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;
    const name = member.first_name || member.username || "there";
    try {
      await ctx.reply(
        "Welcome " + name + "!\n\n" +
        "Radix Governance — propose ideas, vote, earn XP.\n\n" +
        "Get started:\n" +
        "1. /register <your_account_rdx1...>\n" +
        "2. Mint free badge: " + PORTAL + "/mint\n" +
        "3. /proposals to vote\n\n" +
        "/help for commands | /faq for questions"
      );
    } catch (e) { console.error("[Welcome] Failed to greet " + name + ":", e.message); }
  }
});

bot.on("message:text", (ctx) => {
  // WG report wizard handler
  const wgState = wizardStates.get(ctx.from.id);
  if (wgState && wgState.wizard === "wg_report") {
    const text = ctx.message.text.trim();
    if (text === "/cancel") {
      wizardStates.delete(ctx.from.id);
      return ctx.reply("Report cancelled.");
    }

    if (wgState.step === "delivered") {
      wgState.data.delivered = text;
      wgState.step = "next_steps";
      wizardStates.set(ctx.from.id, wgState);
      return ctx.reply("Step 2/4: What are the next steps?\n(Type your answer, or \"none\" to skip)");
    }
    if (wgState.step === "next_steps") {
      wgState.data.nextSteps = text.toLowerCase() === "none" ? null : text;
      wgState.step = "blocked";
      wizardStates.set(ctx.from.id, wgState);
      return ctx.reply("Step 3/4: Any blockers?\n(Type your answer, or \"none\" to skip)");
    }
    if (wgState.step === "blocked") {
      wgState.data.blocked = text.toLowerCase() === "none" ? null : text;
      wgState.step = "spent";
      wizardStates.set(ctx.from.id, wgState);
      return ctx.reply("Step 4/4: XRD spent this period?\n(Enter a number, or 0 if none)");
    }
    if (wgState.step === "spent") {
      const spent = parseFloat(text) || 0;
      const now = new Date();
      const period = now.toISOString().slice(0, 7);
      const reportId = db.createWGReport(
        wgState.groupId, ctx.from.id,
        wgState.data.delivered, wgState.data.nextSteps, wgState.data.blocked,
        spent, period
      );
      wizardStates.delete(ctx.from.id);
      return ctx.reply(
        "Report #" + reportId + " filed for " + wgState.groupName + "\n\n" +
        "Delivered: " + wgState.data.delivered + "\n" +
        (wgState.data.nextSteps ? "Next: " + wgState.data.nextSteps + "\n" : "") +
        (wgState.data.blocked ? "Blocked: " + wgState.data.blocked + "\n" : "") +
        (spent > 0 ? "Spent: " + spent + " XRD\n" : "") +
        "Period: " + period
      );
    }
    return;
  }

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
  if (expired.length > 0) console.log("[AutoClose] Found " + expired.length + " expired proposal(s)");

  for (const proposal of expired) {
    try {
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
    try {
      const rtTitle = "[Result] Proposal #" + proposal.id + ": " + proposal.title.slice(0, 80);
      const rtBody = formatProposalForRT(proposal, counts);
      const rtPost = await postToRadixTalk(rtTitle, rtBody);
      if (rtPost) console.log("[AutoClose] Posted to RadixTalk:", rtPost.url);
    } catch (e) {
      console.error("[AutoClose] RadixTalk post failed:", e.message);
    }

    // ── Pipeline auto-advancement ──
    if (result === "passed" || result === "completed") {
      // Resolve charter param if linked
      if (proposal.charter_param) {
        const value = extractWinningValue(proposal, counts, total);
        try {
        db.resolveCharterParam(proposal.charter_param, value, proposal.id);
        } catch (e) { console.error("[Charter] resolve failed for " + proposal.charter_param + ":", e.message); }
        const paramTitle = (function() { try { return db.getCharterParam(proposal.charter_param)?.title || proposal.charter_param; } catch(e) { return proposal.charter_param; } })();
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
    } catch (e) {
      console.error("[AutoClose] Error processing proposal #" + proposal.id + ":", e.message);
    }
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

// ── Dispute Overdue Check (daily) ─────────────────
setInterval(() => {
  try {
    const results = disputeService.checkOverdueDisputes();
    if (results.length > 0) {
      console.log("[Disputes] Overdue check: " + results.length + " arbiter(s) timed out");
      results.forEach(r => {
        const msg = "Dispute #" + r.disputeId + ": arbiter " + r.timedOutArbiter + " timed out.";
        if (r.reassigned) {
          console.log(msg + " Reassigned to " + r.newArbiter);
        } else {
          console.log(msg + " No eligible arbiter — escalated to admin.");
        }
      });
    }
  } catch (e) {
    console.error("[Disputes] Overdue check failed:", e.message);
  }
}, 24 * 60 * 60 * 1000); // daily

// ── Signer Balance Check (hourly) ─────────────────
setInterval(async () => {
  try {
    if (txSigner.isEnabled()) await txSigner.checkBalance();
  } catch (e) {
    console.error("[Signer] Balance check failed:", e.message);
  }
}, 60 * 60 * 1000); // hourly

// ── PR Merge Watcher (auto-verify tasks) ─────────────────

const { parsePRUrl: parsePR, checkPRStatus } = require("./services/github");

async function checkPRMerges() {
  // Find all submitted bounties with PR URLs and pr_merged approval
  let bounties;
  try {
    bounties = db.prepare(
      "SELECT * FROM bounties WHERE status = 'submitted' AND github_pr IS NOT NULL AND approval_type = 'pr_merged'"
    ).all();
  } catch (e) {
    // If approval_type column doesn't exist yet, fall back
    bounties = [];
  }

  if (bounties.length === 0) return;

  let checked = 0;
  for (const bounty of bounties) {
    if (checked >= 10) break; // max 10 per cycle (rate limit safety)

    const parsed = parsePR(bounty.github_pr);
    if (!parsed) continue;

    // If repo is specified, validate
    if (bounty.approval_repo && (parsed.owner + "/" + parsed.repo) !== bounty.approval_repo) {
      console.log("[PRWatcher] PR repo mismatch for bounty #" + bounty.id + ": expected " + bounty.approval_repo + ", got " + parsed.owner + "/" + parsed.repo);
      continue;
    }

    const status = await checkPRStatus(parsed.owner, parsed.repo, parsed.number);
    checked++;

    if (!status || status.error) continue;

    if (status.merged) {
      console.log("[PRWatcher] PR MERGED for bounty #" + bounty.id + ": " + bounty.github_pr);

      // Auto-verify the bounty
      try {
        db.verifyBounty(bounty.id);
        db.prepare("UPDATE bounties SET auto_released_at = ? WHERE id = ?").run(Math.floor(Date.now() / 1000), bounty.id);

        // Log audit trail
        db.prepare(
          "INSERT INTO bounty_transactions (bounty_id, tx_type, amount_xrd, description, verified_onchain) VALUES (?, 'auto_verify', ?, ?, 0)"
        ).run(bounty.id, bounty.reward_xrd, "PR merged: " + bounty.github_pr + " | Merged at: " + status.merged_at);

        console.log("[PRWatcher] Bounty #" + bounty.id + " auto-verified via PR merge");
        notifyDiscord("**Task #" + bounty.id + " auto-verified** — PR merged\n" + bounty.title + "\n" + bounty.github_pr + "\nAwaiting escrow release.");

        // Note: actual escrow release requires a TX signed by the verifier badge holder.
        // For now, auto-verify marks it as verified. Release is still manual (admin /bounty pay)
        // until the bot signer (tx-signer.js) is wired up in Phase 3.

      } catch (e) {
        console.error("[PRWatcher] Failed to auto-verify bounty #" + bounty.id + ":", e.message);
      }
    } else if (status.state === "closed" && !status.merged) {
      console.log("[PRWatcher] PR closed without merge for bounty #" + bounty.id);
    }
  }

  if (checked > 0) console.log("[PRWatcher] Checked " + checked + " PR(s)");
}

// Check PR merges every 5 minutes
setInterval(async () => {
  try {
    await checkPRMerges();
  } catch (e) {
    console.error("[PRWatcher] Background task failed:", e.message);
  }
}, 5 * 60 * 1000);

// ── WG Sunset & Overdue Checker (every 6 hours) ─────────

setInterval(() => {
  try {
    // Check for charters expiring within 30 days
    const expiring = db.getGroupsSunsetSoon(30);
    for (const g of expiring) {
      const daysLeft = Math.round(g.days_remaining / 86400);
      // Only alert at 30, 14, 7, 1 day marks (avoid spam)
      if ([30, 14, 7, 1].includes(daysLeft) && (!g.sunset_alert_sent || g.sunset_alert_sent < Date.now() / 1000 - 86400)) {
        console.log("[WGWatcher] Charter expiring: " + g.name + " in " + daysLeft + " days");
        db.markSunsetAlertSent(g.id);
      }
    }
    // Check overdue reports
    const overdue = db.getOverdueReports();
    if (overdue.length > 0) {
      console.log("[WGWatcher] Overdue reports: " + overdue.map(g => g.name).join(", "));
    }
  } catch (e) {
    console.error("[WGWatcher] Check failed:", e.message);
  }
}, 6 * 60 * 60 * 1000);

// ── Start bot + API ─────────────────────────────────────

const { startApi } = require("./services/api");
startApi();

// Start escrow event watcher (auto-detects on-chain events)
try { escrowWatcher.init(dbInstance, bot, db); } catch (e) { console.error("[Init] Escrow watcher failed (non-fatal):", e.message); }
try { cv3Watcher.init(dbInstance, bot); } catch (e) { console.error("[Init] CV3 watcher failed (non-fatal):", e.message); }

bot.start();
console.log("Radix Guild Bot v5 running! (proposals, polls, auto-close, escrow-watcher, API ready)");
