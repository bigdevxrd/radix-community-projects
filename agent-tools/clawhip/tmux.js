// Clawhip — tmux Session Monitor
// Watches a tmux session for agent activity, stuck detection, and completion

const { execSync } = require("child_process");

const POLL_INTERVAL_MS = 10000; // check every 10 seconds
const STUCK_THRESHOLD_MS = 300000; // 5 minutes without output = stuck

/**
 * Check if tmux is available on this system
 * @returns {boolean}
 */
function isAvailable() {
  try {
    execSync("which tmux", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a tmux session exists
 * @param {string} sessionName
 * @returns {boolean}
 */
function sessionExists(sessionName) {
  try {
    execSync(`tmux has-session -t ${sessionName} 2>/dev/null`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Capture the last N lines from a tmux pane
 * @param {string} sessionName
 * @param {number} [lines=20]
 * @returns {string}
 */
function captureOutput(sessionName, lines = 20) {
  try {
    return execSync(`tmux capture-pane -t ${sessionName} -p -S -${lines}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Monitor a tmux session and emit events
 * @param {object} config — Clawhip config
 * @param {EventEmitter} emitter — event bus
 */
function monitor(config, emitter) {
  const session = config.tmuxSession;
  let lastOutput = "";
  let lastChangeTime = Date.now();

  const interval = setInterval(() => {
    if (!sessionExists(session)) {
      // Session ended — agent is done
      emitter.emit("tmux:done", session);
      clearInterval(interval);
      return;
    }

    const output = captureOutput(session);

    if (output !== lastOutput) {
      lastOutput = output;
      lastChangeTime = Date.now();
    } else {
      // No change — check for stuck
      const elapsed = Date.now() - lastChangeTime;
      if (elapsed > STUCK_THRESHOLD_MS) {
        emitter.emit("tmux:stuck", session);
        lastChangeTime = Date.now(); // reset to avoid spamming
      }
    }
  }, POLL_INTERVAL_MS);

  // Return cleanup function
  return () => clearInterval(interval);
}

module.exports = { isAvailable, sessionExists, captureOutput, monitor };
