// OmO — Oh My OpenAgent: The Manager
// State management, conflict resolution, context pruning, handoff verification

const StateManager = require("./state");
const { pruneContext } = require("./context");
const { resolveConflict } = require("./conflict");
const { verifyHandoff } = require("./handoff");

/**
 * Create an OmO instance for a pipeline run
 * @param {object} [opts]
 * @param {string} [opts.stateFile] — path to persist state
 * @param {number} [opts.maxContextTokens] — context window limit
 * @returns {object} OmO manager
 */
function createManager(opts = {}) {
  const state = new StateManager(opts.stateFile);
  const maxTokens = opts.maxContextTokens || parseInt(process.env.MAX_CONTEXT_TOKENS || "32000");

  return {
    state,

    /** Store a key-value pair in state */
    set(key, value) { state.set(key, value); },

    /** Retrieve a value from state */
    get(key) { return state.get(key); },

    /**
     * Prune context to fit within token budget
     * @param {string[]} files — file paths potentially relevant
     * @param {string} task — current task description
     * @returns {string[]} pruned list of relevant files
     */
    pruneContext(files, task) {
      return pruneContext(files, task, maxTokens);
    },

    /**
     * Resolve a conflict between architect and executor
     * @param {object} plan — architect's plan
     * @param {object} error — executor's error
     * @returns {Promise<object>} resolution (revised plan or escalation)
     */
    resolveConflict(plan, error) {
      return resolveConflict(plan, error, state);
    },

    /**
     * Verify that a completed task has all required outputs for the next task
     * @param {object} completedTask — what just finished
     * @param {object} nextTask — what's about to start
     * @returns {object} verification result
     */
    verifyHandoff(completedTask, nextTask) {
      return verifyHandoff(completedTask, nextTask, state);
    },

    /** Persist state to disk */
    save() { state.save(); },

    /** Load state from disk */
    load() { state.load(); },

    /** Get full state snapshot */
    snapshot() { return state.snapshot(); },
  };
}

module.exports = { createManager };
