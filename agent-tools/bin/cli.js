#!/usr/bin/env node
// agent-tools CLI — entry point for the OMX/OmO/Clawhip swarm toolkit

const path = require("path");

// Load .env from agent-tools dir if present
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch { /* dotenv is optional */ }

const omx = require("../omx");
const { createManager } = require("../omo");
const { createRouter } = require("../clawhip");

const args = process.argv.slice(2);
const command = args[0] || "help";

const COMMANDS = {
  help: showHelp,
  architect: runArchitect,
  executor: runExecutor,
  reviewer: runReviewer,
  run: runFull,
  scan: runScan,
  daemon: runDaemon,
  state: showState,
};

async function main() {
  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
  }
  await handler();
}

function showHelp() {
  console.log(`
  agent-tools — Agentic Swarm Toolkit

  Usage: agent-tools <command> [options]

  Commands:
    run <task>       Run full pipeline: architect → executor → reviewer
    architect <task> Run only the architect (plan generation)
    executor         Run the executor on an existing plan
    reviewer         Run the reviewer on completed work
    scan             Scan project structure (no LLM needed)
    daemon           Start the Clawhip background daemon
    state            Show current OmO state
    help             Show this help message

  Components:
    OMX      Command Center — $architect, $executor, $team roles
    OmO      Manager — state, context pruning, conflict resolution
    Clawhip  Router — Discord, GitHub, tmux integration

  Examples:
    agent-tools scan
    agent-tools architect "Add rate limiting to the API"
    agent-tools run "Fix the bug in user registration"
    agent-tools daemon
  `);
}

async function runArchitect() {
  const task = args.slice(1).join(" ");
  if (!task) {
    console.error("Usage: agent-tools architect <task description>");
    process.exit(1);
  }

  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const plan = await omx.architect.plan({ task, projectRoot });

  console.log("\n📐 Architect Plan:\n");
  console.log(JSON.stringify(plan, null, 2));
}

async function runExecutor() {
  const omo = createManager();
  const plan = omo.state.get("plan");
  if (!plan) {
    console.error("No plan in state. Run 'architect' first.");
    process.exit(1);
  }

  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  for (const step of plan.steps) {
    const result = await omx.executor.execute({ step, projectRoot, state: omo.state });
    console.log(`  Step ${step.id}: ${result.status}`);
  }
  omo.save();
}

async function runReviewer() {
  const omo = createManager();
  const plan = omo.state.get("plan");
  const results = omo.state.get("results") || [];

  if (!plan) {
    console.error("No plan in state. Run 'architect' first.");
    process.exit(1);
  }

  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const review = await omx.reviewer.review({ plan, results, projectRoot });

  console.log("\n🔍 Review Result:\n");
  console.log(JSON.stringify(review, null, 2));
}

async function runFull() {
  const task = args.slice(1).join(" ");
  if (!task) {
    console.error("Usage: agent-tools run <task description>");
    process.exit(1);
  }

  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const omo = createManager();

  console.log("🚀 Starting full pipeline for:", task);
  console.log("   Project:", projectRoot);

  const provider = require("../omx/llm").getProvider();
  if (provider) {
    console.log("   LLM:", provider);
  } else {
    console.log("   LLM: none (template mode — set API key for full pipeline)");
  }
  console.log();

  const result = await omx.run({ task, projectRoot, state: omo });

  console.log("\n📋 Pipeline Complete\n");
  console.log("Plan:", result.plan.steps.length, "steps (" + result.plan.status + ")");
  console.log("Results:", result.results.length, "executed");
  console.log("Review:", result.review.verdict);
  if (result.review.issues.length > 0) {
    console.log("Issues:");
    result.review.issues.forEach(i => {
      console.log(`  [${i.severity}] ${i.message}`);
    });
  }

  omo.save();
}

async function runScan() {
  const projectRoot = args[1] || process.env.PROJECT_ROOT || process.cwd();
  const map = omx.architect.scanProject(projectRoot);

  console.log("\n📁 Project Scan:", projectRoot);
  console.log(`   ${map.summary}\n`);

  // Group by extension
  const byExt = {};
  for (const f of map.files) {
    const ext = f.ext || "(none)";
    byExt[ext] = (byExt[ext] || 0) + 1;
  }

  console.log("   File types:");
  Object.entries(byExt)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ext, count]) => {
      console.log(`     ${ext}: ${count}`);
    });

  console.log(`\n   Top directories:`);
  map.dirs.slice(0, 15).forEach(d => console.log(`     ${d}`));
  if (map.dirs.length > 15) console.log(`     ... and ${map.dirs.length - 15} more`);
}

async function runDaemon() {
  const router = createRouter();

  router.onTask(async (task) => {
    console.log("[Daemon] New task from", task.source + ":", task.task);
    const omo = createManager();
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();

    try {
      const result = await omx.run({ task: task.task, projectRoot, state: omo });
      router.notify(`✅ Task complete: ${result.review.verdict} (${result.review.issues.length} issues)`);
      omo.save();
    } catch (err) {
      router.notify(`❌ Task failed: ${err.message}`);
    }
  });

  router.onNotify(({ message }) => {
    console.log("[Daemon] Notification:", message);
  });

  router.start();

  // Keep alive
  process.on("SIGINT", () => {
    console.log("\n[Daemon] Shutting down...");
    router.stop();
    process.exit(0);
  });
}

function showState() {
  const omo = createManager();
  const snapshot = omo.snapshot();

  if (Object.keys(snapshot).length === 0) {
    console.log("No state stored. Run a pipeline to create state.");
    return;
  }

  console.log("\n📊 OmO State:\n");
  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
