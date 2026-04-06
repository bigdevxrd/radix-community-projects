// Conflict Resolution — mediates between architect and executor
// When the executor hits an impossibility, this module manages the "argument"

/**
 * Resolve a conflict between the architect's plan and an executor failure
 *
 * @param {object} plan — the architect's plan
 * @param {object} error — the executor's error details
 * @param {object} state — OmO state manager
 * @returns {Promise<object>} resolution
 */
async function resolveConflict(plan, error, state) {
  const conflictCount = (state.get("conflictCount") || 0) + 1;
  state.set("conflictCount", conflictCount);

  // Track conflict history for pattern detection
  const conflicts = state.get("conflicts") || [];
  conflicts.push({
    planStep: error.step,
    error: error.message || String(error),
    timestamp: Date.now(),
  });
  state.set("conflicts", conflicts);

  // Strategy 1: Simple retry (first failure)
  if (conflictCount === 1) {
    return {
      resolution: "retry",
      action: "Re-execute the failed step with additional context",
      context: error,
    };
  }

  // Strategy 2: Escalate to architect for replanning (second failure)
  if (conflictCount === 2) {
    return {
      resolution: "replan",
      action: "Send failure back to architect for plan revision",
      context: {
        originalPlan: plan,
        failureHistory: conflicts,
      },
    };
  }

  // Strategy 3: Decompose (third failure — break step into smaller pieces)
  if (conflictCount === 3) {
    return {
      resolution: "decompose",
      action: "Break the failing step into smaller sub-steps",
      context: {
        originalStep: error.step,
        suggestedSplit: "Try implementing one file at a time",
      },
    };
  }

  // Strategy 4: Escalate to human (fourth+ failure)
  return {
    resolution: "escalate",
    action: "Request human intervention — automated resolution exhausted",
    context: {
      conflictCount,
      history: conflicts,
    },
  };
}

module.exports = { resolveConflict };
