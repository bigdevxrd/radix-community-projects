// $architect — The Strategist
// Scans a codebase, builds a dependency map, and produces a structured plan.
// Does NOT write code — only writes specifications.

const fs = require("fs");
const path = require("path");
const { askJSON, getProvider } = require("./llm");

const DEFAULT_MODEL = process.env.ARCHITECT_MODEL || "claude-sonnet-4-20250514";

/**
 * Scan a project directory and build a file/dependency map
 * @param {string} projectRoot
 * @returns {object} map of files, dirs, and summary
 */
function scanProject(projectRoot) {
  const map = { files: [], dirs: [], summary: "" };
  const ignored = new Set(["node_modules", ".git", "dist", ".next", "target", "build", "__pycache__"]);

  function walk(dir, depth) {
    if (depth > 6) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (entry.name.startsWith(".") || ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(projectRoot, full);

      if (entry.isDirectory()) {
        map.dirs.push(rel);
        walk(full, depth + 1);
      } else {
        const ext = path.extname(entry.name);
        const stat = fs.statSync(full);
        map.files.push({
          path: rel,
          ext,
          size: stat.size,
          lines: ext.match(/\.(js|ts|tsx|py|rs|md|json)$/)
            ? fs.readFileSync(full, "utf8").split("\n").length
            : null,
        });
      }
    }
  }

  walk(projectRoot, 0);
  map.summary = `${map.files.length} files in ${map.dirs.length} directories`;
  return map;
}

const PLAN_SYSTEM_PROMPT = `You are a software architect. Given a codebase structure and a task, produce a step-by-step execution plan.

Rules:
- Each step must have: id (number), action (one of: analyze, implement, test, shell), description (string), files (array of relative paths)
- "analyze" steps verify files exist and understand the code
- "implement" steps describe what code to write or change (one focused change per step)
- "test" steps run the test suite
- "shell" steps run a shell command (include a "command" field)
- Keep plans short: 3-8 steps maximum
- Be specific about which files to create or modify
- Do NOT include code in the plan — only describe what to do

Respond with ONLY valid JSON in this format:
{
  "steps": [
    { "id": 1, "action": "analyze", "description": "...", "files": ["path/to/file.js"] },
    { "id": 2, "action": "implement", "description": "...", "files": ["path/to/file.js"] },
    { "id": 3, "action": "test", "description": "Run tests", "files": [] }
  ]
}`;

/**
 * Produce a structured plan for a task.
 * Uses LLM if an API key is configured, otherwise falls back to a template.
 * @param {object} opts
 * @param {string} opts.task — what to build/fix
 * @param {string} opts.projectRoot — project root
 * @param {string} [opts.model] — LLM model override
 * @returns {Promise<object>} plan with steps array
 */
async function plan(opts) {
  const { task, projectRoot, model = DEFAULT_MODEL } = opts;
  const codeMap = scanProject(projectRoot);

  const planObj = {
    task,
    model,
    timestamp: new Date().toISOString(),
    codeMap: {
      files: codeMap.files.length,
      dirs: codeMap.dirs.length,
      summary: codeMap.summary,
    },
    steps: [],
    status: "draft",
  };

  // Try LLM-powered planning
  if (getProvider()) {
    try {
      const fileList = codeMap.files
        .slice(0, 100)
        .map(f => `${f.path} (${f.lines ? f.lines + " lines" : f.size + "b"})`)
        .join("\n");

      const userPrompt = `Task: ${task}

Project structure (${codeMap.summary}):
${fileList}

Directories:
${codeMap.dirs.slice(0, 30).join("\n")}

Produce the execution plan.`;

      const result = await askJSON({ system: PLAN_SYSTEM_PROMPT, user: userPrompt, model });
      planObj.steps = (result.steps || []).map((s, i) => ({
        ...s,
        id: s.id || i + 1,
        status: "pending",
        files: s.files || [],
      }));
      planObj.status = "ready";
      console.log(`[Architect] LLM produced ${planObj.steps.length} steps`);
    } catch (err) {
      console.warn(`[Architect] LLM planning failed: ${err.message}`);
      console.warn("[Architect] Falling back to template plan");
      planObj.steps = buildTemplatePlan(task, codeMap);
      planObj.status = "template";
    }
  } else {
    console.log("[Architect] No API key configured — using template plan");
    planObj.steps = buildTemplatePlan(task, codeMap);
    planObj.status = "template";
  }

  return planObj;
}

/**
 * Fallback template plan when no LLM is available
 */
function buildTemplatePlan(task, codeMap) {
  return [
    {
      id: 1,
      action: "analyze",
      description: "Analyze codebase structure and identify affected files",
      files: codeMap.files.slice(0, 10).map(f => f.path),
      status: "pending",
    },
    {
      id: 2,
      action: "implement",
      description: task,
      files: [],
      status: "pending",
    },
    {
      id: 3,
      action: "test",
      description: "Run tests to verify changes",
      files: [],
      status: "pending",
    },
  ];
}

const REVISE_SYSTEM_PROMPT = `You are a software architect revising a failed plan. A step failed during execution.
Given the original plan, the failed step, and the error, produce a revised plan that works around the failure.

Rules:
- Keep steps that already passed (status "passed") unchanged
- Replace or split the failed step
- Adjust remaining steps as needed
- Same step format as before: id, action, description, files

Respond with ONLY valid JSON:
{ "steps": [ ... ] }`;

/**
 * Revise a plan after an executor step fails.
 * Uses LLM if available, otherwise does simple re-queue.
 * @param {object} opts
 * @param {object} opts.plan — original plan
 * @param {object} opts.failedStep — the step that failed
 * @param {string} opts.error — error message
 * @param {string} [opts.model] — LLM model override
 * @returns {Promise<object>} revised plan
 */
async function revise(opts) {
  const { plan: originalPlan, failedStep, error, model = DEFAULT_MODEL } = opts;

  const revised = { ...originalPlan };
  revised.status = "revised";
  revised.revision = {
    failedStep: failedStep.id,
    error,
    model,
    timestamp: new Date().toISOString(),
  };

  if (getProvider()) {
    try {
      const userPrompt = `Original plan:
${JSON.stringify(originalPlan.steps, null, 2)}

Failed step #${failedStep.id}: ${failedStep.description}
Error: ${error}

Produce a revised plan.`;

      const result = await askJSON({ system: REVISE_SYSTEM_PROMPT, user: userPrompt, model });
      revised.steps = (result.steps || []).map((s, i) => ({
        ...s,
        id: s.id || i + 1,
        status: s.status || "pending",
        files: s.files || [],
      }));
      console.log(`[Architect] LLM revised plan: ${revised.steps.length} steps`);
    } catch (err) {
      console.warn(`[Architect] LLM revision failed: ${err.message}`);
      revised.steps = fallbackRevise(originalPlan.steps, failedStep);
    }
  } else {
    revised.steps = fallbackRevise(originalPlan.steps, failedStep);
  }

  return revised;
}

/**
 * Simple fallback: mark failed step and re-queue remaining
 */
function fallbackRevise(steps, failedStep) {
  return steps.map(s => {
    if (s.id === failedStep.id) return { ...s, status: "failed_revised" };
    if (s.id > failedStep.id) return { ...s, status: "pending" };
    return s;
  });
}

module.exports = { plan, revise, scanProject };
