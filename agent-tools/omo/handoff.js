// Handoff Verification — ensures Task B has everything it needs from Task A

const fs = require("fs");
const path = require("path");

/**
 * Verify that a completed task produced all required outputs for the next task
 *
 * @param {object} completedTask — the task that just finished
 * @param {object} nextTask — the task about to start
 * @param {object} state — OmO state manager
 * @returns {object} verification result
 */
function verifyHandoff(completedTask, nextTask, state) {
  const issues = [];

  // Check 1: Required files exist
  if (nextTask.requiredFiles) {
    for (const f of nextTask.requiredFiles) {
      if (!fs.existsSync(f)) {
        issues.push({ type: "missing_file", file: f, message: `Required file not found: ${f}` });
      }
    }
  }

  // Check 2: Required env vars are set
  if (nextTask.requiredEnv) {
    for (const envVar of nextTask.requiredEnv) {
      if (!process.env[envVar]) {
        issues.push({ type: "missing_env", var: envVar, message: `Required env var not set: ${envVar}` });
      }
    }
  }

  // Check 3: Required state keys are present
  if (nextTask.requiredState) {
    for (const key of nextTask.requiredState) {
      if (state.get(key) === undefined) {
        issues.push({ type: "missing_state", key, message: `Required state key not found: ${key}` });
      }
    }
  }

  // Check 4: Previous task succeeded
  if (completedTask.status === "failed") {
    issues.push({
      type: "predecessor_failed",
      message: `Previous task "${completedTask.description || completedTask.id}" failed`,
    });
  }

  return {
    ready: issues.length === 0,
    issues,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { verifyHandoff };
