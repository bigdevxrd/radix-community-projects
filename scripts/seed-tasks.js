#!/usr/bin/env node
/**
 * seed-tasks.js — Seed Phase 1 bounties into the database
 * Run: node scripts/seed-tasks.js
 * Idempotent — skips tasks that already exist (by title match)
 */

const path = require("path");

// Use better-sqlite3 from the bot's node_modules
const botDir = path.join(__dirname, "..", "bot");
const Database = require(path.join(botDir, "node_modules", "better-sqlite3"));

const DB_PATH = process.env.BOT_DB_PATH || path.join(botDir, "guild.db");
const ADMIN_TG_ID = 6102618406; // Big Dev

const TASKS = [
  // Content & Marketing
  { title: "Record demo video: wallet connect → mint badge → vote → game", reward: 50, category: "content", difficulty: "medium", deadlineDays: 14, description: "2-3 minute screen recording showing the full user journey. Publish to YouTube or Loom. Include: wallet connect, badge mint, vote on proposal, dice roll, dashboard tour." },
  { title: "Write RadixTalk forum post announcing the Radix Guild", reward: 25, category: "marketing", difficulty: "easy", deadlineDays: 7, description: "Post on radixtalk.com introducing the guild. Include: what it is, how to join, links to dashboard + bot. Use TESTER-INVITE.md as reference." },
  { title: "Create 3 Twitter/X posts with screenshots and links", reward: 25, category: "marketing", difficulty: "easy", deadlineDays: 7, description: "3 engaging posts about Radix Guild. Include screenshots of dashboard, proposals page, bounty board. Tag @radaboratory. Submit as text + images." },
  { title: "Write beginner-friendly Getting Started blog post", reward: 25, category: "content", difficulty: "easy", deadlineDays: 14, description: "Step-by-step guide for someone who has never used Radix. Cover: wallet setup, badge minting, first vote, earning XP. Can publish on Medium, RadixTalk, or personal blog." },
  { title: "Create 1-page pitch deck (PDF) for DeFi project outreach", reward: 75, category: "marketing", difficulty: "medium", deadlineDays: 14, description: "Professional PDF pitch deck showing what the guild offers to DeFi projects. Include: governance, task marketplace, badge system, pricing, architecture. Target audience: Radix project founders." },

  // Testing & Security
  { title: "Mobile responsiveness testing across devices + bug report", reward: 50, category: "testing", difficulty: "medium", deadlineDays: 14, description: "Test radixguild.com on 3+ mobile devices (iOS, Android, tablet). Document any layout issues, broken interactions, or unreadable text. Submit as markdown report with screenshots." },
  { title: "Security review: bot commands + API endpoint audit", reward: 100, category: "testing", difficulty: "hard", deadlineDays: 30, description: "Audit all bot commands for input validation, injection risks, permission bypasses. Test API rate limiting, CORS, error handling. Submit structured security report with severity ratings." },
  { title: "Cross-browser testing (Safari, Firefox, Chrome) + report", reward: 25, category: "testing", difficulty: "easy", deadlineDays: 14, description: "Test dashboard on Safari, Firefox, Chrome (latest). Check: wallet connect, page loads, dark/light mode, proposal voting, bounty board. Report any inconsistencies." },
  { title: "Load test: 100 concurrent API requests performance report", reward: 50, category: "testing", difficulty: "medium", deadlineDays: 14, description: "Use ab, k6, or similar tool to load test radixguild.com/api/stats, /api/proposals, /api/bounties with 100 concurrent requests. Report: response times, error rates, rate limiting behavior." },

  // Design
  { title: "Infographic: task marketplace flow (create → claim → pay)", reward: 50, category: "design", difficulty: "medium", deadlineDays: 14, description: "SVG or PNG infographic showing the task lifecycle: Create task → Fund escrow → Worker claims → Submits work → Verified → Paid. Match existing infographic style in /public/infographics/." },
  { title: "Infographic: governance + marketplace connection diagram", reward: 50, category: "design", difficulty: "medium", deadlineDays: 14, description: "Visual showing how governance (free voting) connects to marketplace (paid tasks) through the badge identity system. Show the dual-product architecture." },
  { title: "Redesign OG image for better social media previews", reward: 25, category: "design", difficulty: "easy", deadlineDays: 7, description: "Current OG image is basic SVG. Design a more compelling 1200x630 image for link previews on Twitter/TG/Discord. Should convey: governance + tasks + Radix." },

  // Infrastructure
  { title: "Set up uptime monitoring + error alerting (free tier)", reward: 75, category: "development", difficulty: "medium", deadlineDays: 14, description: "Configure UptimeRobot, Betterstack, or similar free monitoring for radixguild.com and /api/health. Set up alerts (email or TG) when site goes down. Document the setup." },
  { title: "Automated SQLite backup script (daily to remote)", reward: 50, category: "development", difficulty: "medium", deadlineDays: 14, description: "Script that runs daily via cron, copies guild.db to a remote location (S3, rsync to backup server, or git). Include restore instructions. Test restore process." },
  { title: "Set up Discord server with channels + webhook integration", reward: 25, category: "general", difficulty: "easy", deadlineDays: 7, description: "Create Discord server with channels: general, governance, tasks, support. Configure the DISCORD_WEBHOOK_URL on the VPS so proposals and task updates post automatically." },
  { title: "VPS hardening review: firewall, SSH config, port audit", reward: 100, category: "testing", difficulty: "hard", deadlineDays: 30, description: "Review VPS security: firewall rules (ufw/iptables), SSH config (key-only, no root password), open ports, Caddy config, PM2 security. Submit hardening report with recommendations." },
];

function main() {
  console.log("\n  Seed Phase 1 Tasks\n");
  console.log("  DB: " + DB_PATH);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  const existing = db.prepare("SELECT title FROM bounties").all().map(b => b.title);
  const insert = db.prepare(
    "INSERT INTO bounties (title, description, reward_xrd, creator_tg_id, category, difficulty, deadline, platform_fee_pct, status) VALUES (?, ?, ?, ?, ?, ?, ?, 2.5, 'open')"
  );

  let seeded = 0;
  let skipped = 0;

  for (const task of TASKS) {
    if (existing.includes(task.title)) {
      console.log("  ⏭  " + task.title.slice(0, 50) + "... (exists)");
      skipped++;
      continue;
    }
    const deadline = task.deadlineDays ? Math.floor(Date.now() / 1000) + task.deadlineDays * 86400 : null;
    insert.run(task.title, task.description, task.reward, ADMIN_TG_ID, task.category, task.difficulty, deadline);
    console.log("  ✅ " + task.reward + " XRD | " + task.category + " | " + task.title.slice(0, 50));
    seeded++;
  }

  console.log("\n  Results: " + seeded + " seeded, " + skipped + " skipped");
  console.log("  Total bounties: " + db.prepare("SELECT COUNT(*) as c FROM bounties").get().c);
  console.log();

  db.close();
}

main();
