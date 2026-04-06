// $executor — The Worker
// Takes plan steps and implements them in small, verifiable chunks.
// Runs tests after every file change. Self-corrects on failures.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { askJSON, getProvider } = require("./llm");

const DEFAULT_MODEL = process.env.EXECUTOR_MODEL || "claude-sonnet-4-20250514";
const MAX_RETRIES = 3;

/**
 * Execute a single plan step
 * @param {object} opts
 * @param {object} opts.step — plan step from architect
 * @param {string} opts.projectRoot — project root directory
 * @param {string} [opts.model] — LLM model override
 * @param {object} opts.state — OmO state manager
 * @returns {Promise<{status: string, output?: string, error?: string}>}
 */
async function execute(opts) {
  const { step, projectRoot, model = DEFAULT_MODEL, state } = opts;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`[Executor] Step ${step.id}: ${step.description} (attempt ${retries + 1})`);

      let result;
      switch (step.action) {
        case "analyze":
          result = await analyzeStep(step, projectRoot);
          break;
        case "implement":
          result = await implementStep(step, projectRoot, model, state);
          break;
        case "test":
          result = await testStep(step, projectRoot);
          break;
        case "shell":
          result = await shellStep(step, projectRoot);
          break;
        default:
          result = { status: "skipped", output: `Unknown action: ${step.action}` };
      }

      if (result.status === "passed" || result.status === "skipped") {
        step.status = result.status;
        return result;
      }

      // Step failed — retry with error context
      retries++;
      if (state && state.set) {
        state.set(`retry_${step.id}_${retries}`, result.error);
      }

    } catch (err) {
      retries++;
      if (retries >= MAX_RETRIES) {
        step.status = "failed";
        return { status: "failed", error: err.message };
      }
    }
  }

  step.status = "failed";
  return { status: "failed", error: `Exhausted ${MAX_RETRIES} retries` };
}

async function analyzeStep(step, projectRoot) {
  const missing = (step.files || []).filter(f => {
    try { fs.accessSync(path.join(projectRoot, f)); return false; }
    catch { return true; }
  });

  if (missing.length > 0) {
    return { status: "passed", output: `Analyzed. Missing files: ${missing.join(", ")}` };
  }
  return { status: "passed", output: `Analyzed ${(step.files || []).length} files — all present.` };
}

const IMPLEMENT_SYSTEM_PROMPT = `You are a code executor. Given a task description and the current contents of relevant files, produce the exact file changes needed.

Rules:
- Only modify files that need changing
- Include the FULL content of each file you modify (not diffs)
- Create new files when the task requires it
- Keep changes minimal and focused
- Do NOT explain — just produce the edits

Respond with ONLY valid JSON:
{
  "edits": [
    { "path": "relative/path/to/file.js", "content": "full file content here" }
  ],
  "summary": "Brief description of what was changed"
}`;

async function implementStep(step, projectRoot, model, state) {
  if (!getProvider()) {
    return {
      status: "skipped",
      output: "No LLM API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable code generation.",
    };
  }

  // Read relevant file contents to send as context
  const fileContents = [];
  for (const relPath of (step.files || [])) {
    const fullPath = path.join(projectRoot, relPath);
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      // Cap individual files at 8000 chars to avoid blowing token budget
      fileContents.push({
        path: relPath,
        content: content.length > 8000 ? content.slice(0, 8000) + "\n// ... (truncated)" : content,
      });
    } catch {
      fileContents.push({ path: relPath, content: "(file does not exist — create it)" });
    }
  }

  // Include retry context if this is a retry
  let retryContext = "";
  if (state && state.get) {
    const lastError = state.get(`retry_${step.id}_1`);
    if (lastError) {
      retryContext = `\n\nPrevious attempt failed with: ${lastError}\nFix the issue in this attempt.`;
    }
  }

  const userPrompt = `Task: ${step.description}

Files:
${fileContents.map(f => `--- ${f.path} ---\n${f.content}`).join("\n\n")}${retryContext}

Produce the file edits.`;

  try {
    const result = await askJSON({
      system: IMPLEMENT_SYSTEM_PROMPT,
      user: userPrompt,
      model,
    });

    // Apply edits to disk
    let editCount = 0;
    for (const edit of (result.edits || [])) {
      if (!edit.path || edit.content === undefined) continue;

      const fullPath = path.join(projectRoot, edit.path);
      const dir = path.dirname(fullPath);

      // Create parent directories if needed
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, edit.content);
      editCount++;
      console.log(`[Executor] Wrote: ${edit.path}`);
    }

    return {
      status: editCount > 0 ? "passed" : "skipped",
      output: result.summary || `Applied ${editCount} file edit(s)`,
    };
  } catch (err) {
    return { status: "failed", error: `LLM implementation failed: ${err.message}` };
  }
}

async function testStep(step, projectRoot) {
  // Auto-detect and run the project's test suite
  const pkg = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkg)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkg, "utf8"));
    if (pkgJson.scripts && pkgJson.scripts.test) {
      try {
        const output = execSync("npm test", {
          cwd: projectRoot,
          timeout: 120000,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        return { status: "passed", output: output.slice(-500) };
      } catch (err) {
        return { status: "failed", error: (err.stderr || err.message).slice(-500) };
      }
    }
  }

  // Check for Python tests
  if (fs.existsSync(path.join(projectRoot, "pytest.ini")) ||
      fs.existsSync(path.join(projectRoot, "setup.py"))) {
    try {
      const output = execSync("python -m pytest", {
        cwd: projectRoot,
        timeout: 120000,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { status: "passed", output: output.slice(-500) };
    } catch (err) {
      return { status: "failed", error: (err.stderr || err.message).slice(-500) };
    }
  }

  return { status: "skipped", output: "No test suite detected" };
}

async function shellStep(step, projectRoot) {
  if (!step.command) {
    return { status: "failed", error: "Shell step requires a 'command' field" };
  }

  try {
    const output = execSync(step.command, {
      cwd: projectRoot,
      timeout: 60000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: "passed", output: output.slice(-500) };
  } catch (err) {
    return { status: "failed", error: (err.stderr || err.message).slice(-500) };
  }
}

module.exports = { execute };
