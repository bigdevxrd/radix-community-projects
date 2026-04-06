// OMX — Oh My CodeEX: The Command Center
// Orchestrates $architect, $executor, and $team roles

const architect = require("./architect");
const executor = require("./executor");
const reviewer = require("./reviewer");
const { getProvider } = require("./llm");

/**
 * Run the full OMX pipeline: plan → execute → review
 * @param {object} opts
 * @param {string} opts.task — natural-language task description
 * @param {string} opts.projectRoot — root directory of the project
 * @param {object} opts.state — OmO manager instance (with resolveConflict, verifyHandoff)
 * @param {object} [opts.models] — model overrides per role
 * @returns {Promise<{plan: object, results: object[], review: object}>}
 */
async function run(opts) {
  const { task, projectRoot, state, models = {} } = opts;

  const provider = getProvider();
  if (!provider) {
    console.log("[OMX] ⚠️  No LLM API key configured. Implement steps will be skipped.");
    console.log("[OMX] Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable full pipeline.");
  }

  // Step 1 — Architect scans codebase and produces a plan
  console.log("[OMX] $architect planning...");
  const plan = await architect.plan({
    task,
    projectRoot,
    model: models.architect,
  });
  state.set("plan", plan);
  console.log(`[OMX] Plan: ${plan.steps.length} steps (${plan.status})`);

  // Step 2 — Executor implements the plan step by step
  console.log("[OMX] $executor implementing...");
  const results = [];
  for (const step of plan.steps) {
    if (step.status === "passed" || step.status === "failed_revised") continue;

    const result = await executor.execute({
      step,
      projectRoot,
      model: models.executor,
      state: state.state || state,
    });
    results.push(result);
    state.set("lastStep", { step: step.id, status: result.status });

    // If a step fails, use conflict resolution
    if (result.status === "failed") {
      console.log("[OMX] Step failed — resolving conflict...");

      if (state.resolveConflict) {
        const resolution = await state.resolveConflict(plan, {
          step: step.id,
          message: result.error,
        });

        if (resolution.resolution === "replan" || resolution.resolution === "retry") {
          console.log(`[OMX] Conflict resolution: ${resolution.resolution}`);
          const revision = await architect.revise({
            plan,
            failedStep: step,
            error: result.error,
            model: models.architect,
          });
          state.set("plan", revision);
          plan.steps = revision.steps;
        } else if (resolution.resolution === "escalate") {
          console.log("[OMX] ⚠️  Conflict escalated — requires human intervention");
          break;
        }
      } else {
        // Fallback if no conflict resolution available
        const revision = await architect.revise({
          plan,
          failedStep: step,
          error: result.error,
          model: models.architect,
        });
        state.set("plan", revision);
        plan.steps = revision.steps;
      }
    }
  }

  // Step 3 — Team reviewer checks all changes
  console.log("[OMX] $team reviewing...");
  const review = await reviewer.review({
    plan,
    results,
    projectRoot,
    model: models.reviewer,
  });
  state.set("review", review);
  state.set("results", results);

  return { plan, results, review };
}

module.exports = { run, architect, executor, reviewer };
