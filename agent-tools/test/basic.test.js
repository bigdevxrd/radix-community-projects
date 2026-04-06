// Basic tests for agent-tools core modules
// Run with: node --test test/basic.test.js

const { describe, it } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ── OMX Architect ──────────────────────────────────────

describe("architect", () => {
  const architect = require("../omx/architect");

  it("scanProject returns file map", () => {
    const map = architect.scanProject(path.join(__dirname, ".."));
    assert.ok(map.files.length > 0, "should find files");
    assert.ok(map.dirs.length > 0, "should find directories");
    assert.ok(map.summary.includes("files"), "summary should mention files");
  });

  it("plan returns a valid plan object in template mode", async () => {
    const plan = await architect.plan({
      task: "Add a health check endpoint",
      projectRoot: path.join(__dirname, ".."),
    });
    assert.strictEqual(plan.task, "Add a health check endpoint");
    assert.ok(Array.isArray(plan.steps), "steps should be array");
    assert.ok(plan.steps.length >= 1, "should have at least 1 step");
    assert.ok(plan.timestamp, "should have timestamp");
    // Without API key, should be template mode
    assert.ok(["template", "draft", "ready"].includes(plan.status));
    // Each step should have required fields
    for (const step of plan.steps) {
      assert.ok(step.id, "step needs id");
      assert.ok(step.action, "step needs action");
      assert.ok(step.description, "step needs description");
    }
  });
});

// ── OMX Executor ───────────────────────────────────────

describe("executor", () => {
  const executor = require("../omx/executor");

  it("analyze step checks file existence", async () => {
    const step = {
      id: 1,
      action: "analyze",
      description: "Check files",
      files: ["package.json", "nonexistent.xyz"],
      status: "pending",
    };
    const result = await executor.execute({
      step,
      projectRoot: path.join(__dirname, ".."),
      state: { set() {}, get() {} },
    });
    assert.strictEqual(result.status, "passed");
    assert.ok(result.output.includes("nonexistent.xyz"));
  });

  it("implement step skips without API key", async () => {
    // Ensure no API key is set for this test
    const savedKey = process.env.ANTHROPIC_API_KEY;
    const savedOAI = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const step = {
      id: 2,
      action: "implement",
      description: "Write some code",
      files: [],
      status: "pending",
    };
    const result = await executor.execute({
      step,
      projectRoot: path.join(__dirname, ".."),
      state: { set() {}, get() {} },
    });
    assert.strictEqual(result.status, "skipped");
    assert.ok(result.output.includes("API key"));

    // Restore
    if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
    if (savedOAI) process.env.OPENAI_API_KEY = savedOAI;
  });

  it("shell step runs commands", async () => {
    const step = {
      id: 3,
      action: "shell",
      description: "Echo test",
      command: "echo hello",
      status: "pending",
    };
    const result = await executor.execute({
      step,
      projectRoot: path.join(__dirname, ".."),
      state: { set() {}, get() {} },
    });
    assert.strictEqual(result.status, "passed");
    assert.ok(result.output.includes("hello"));
  });
});

// ── OMX Reviewer ───────────────────────────────────────

describe("reviewer", () => {
  const reviewer = require("../omx/reviewer");

  it("review detects failed steps", async () => {
    const review = await reviewer.review({
      plan: { steps: [{ id: 1, status: "passed", files: [] }] },
      results: [{ status: "failed", error: "test broke" }],
      projectRoot: path.join(__dirname, ".."),
    });
    assert.strictEqual(review.verdict, "rejected");
    assert.ok(review.issues.some(i => i.severity === "error"));
  });

  it("review approves clean results", async () => {
    const review = await reviewer.review({
      plan: { steps: [{ id: 1, status: "passed", files: [] }] },
      results: [{ status: "passed" }],
      projectRoot: path.join(__dirname, ".."),
    });
    assert.strictEqual(review.verdict, "approved");
  });

  it("scanSecurity detects eval()", async () => {
    // Create a temp file with eval
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-test-"));
    const tmpFile = path.join(tmpDir, "bad.js");
    fs.writeFileSync(tmpFile, 'const x = eval("1+1");');

    const issues = await reviewer.scanSecurity(tmpDir, {
      steps: [{ files: ["bad.js"] }],
    });
    assert.ok(issues.some(i => i.message.includes("eval()")));

    // Cleanup
    fs.unlinkSync(tmpFile);
    fs.rmdirSync(tmpDir);
  });
});

// ── OmO State ──────────────────────────────────────────

describe("state", () => {
  const StateManager = require("../omo/state");

  it("set/get/delete work", () => {
    const state = new StateManager(path.join(os.tmpdir(), "test-state.json"));
    state.set("foo", "bar");
    assert.strictEqual(state.get("foo"), "bar");
    state.delete("foo");
    assert.strictEqual(state.get("foo"), undefined);
  });

  it("snapshot returns copy of state", () => {
    const state = new StateManager(path.join(os.tmpdir(), "test-state2.json"));
    state.set("a", 1);
    state.set("b", 2);
    const snap = state.snapshot();
    assert.deepStrictEqual(snap, { a: 1, b: 2 });
  });

  it("save and load persist state", () => {
    const file = path.join(os.tmpdir(), "test-state3.json");
    const state1 = new StateManager(file);
    state1.set("key", "value");
    state1.save();

    const state2 = new StateManager(file);
    assert.strictEqual(state2.get("key"), "value");

    // Cleanup
    try { fs.unlinkSync(file); } catch {}
  });
});

// ── OmO Context ────────────────────────────────────────

describe("context", () => {
  const { pruneContext, estimateTokens } = require("../omo/context");

  it("estimateTokens returns reasonable count", () => {
    assert.strictEqual(estimateTokens("hello world"), 3); // 11 chars / 4 = 2.75 → 3
  });

  it("pruneContext filters by relevance", () => {
    const agentDir = path.join(__dirname, "..");
    const files = [
      path.join(agentDir, "package.json"),
      path.join(agentDir, "README.md"),
      path.join(agentDir, "bin", "cli.js"),
    ];
    const pruned = pruneContext(files, "fix the CLI", 100000);
    assert.ok(pruned.length > 0, "should return some files");
    // cli.js should be high priority for "fix the CLI" task
    assert.ok(pruned.some(f => f.includes("cli.js")), "cli.js should be included");
  });
});

// ── OmO Conflict ───────────────────────────────────────

describe("conflict", () => {
  const { resolveConflict } = require("../omo/conflict");

  it("first conflict returns retry", async () => {
    const mockState = { get: () => 0, set() {} };
    const result = await resolveConflict({}, { step: 1, message: "fail" }, mockState);
    assert.strictEqual(result.resolution, "retry");
  });
});

// ── OmO Handoff ────────────────────────────────────────

describe("handoff", () => {
  const { verifyHandoff } = require("../omo/handoff");

  it("passes when no requirements", () => {
    const result = verifyHandoff(
      { status: "passed" },
      {},
      { get: () => undefined }
    );
    assert.strictEqual(result.ready, true);
    assert.strictEqual(result.issues.length, 0);
  });

  it("fails when predecessor failed", () => {
    const result = verifyHandoff(
      { status: "failed", description: "task1" },
      {},
      { get: () => undefined }
    );
    assert.strictEqual(result.ready, false);
    assert.ok(result.issues.some(i => i.type === "predecessor_failed"));
  });
});

// ── LLM Module ─────────────────────────────────────────

describe("llm", () => {
  const { getProvider } = require("../omx/llm");

  it("getProvider returns null without API keys", () => {
    const savedA = process.env.ANTHROPIC_API_KEY;
    const savedO = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    assert.strictEqual(getProvider(), null);

    if (savedA) process.env.ANTHROPIC_API_KEY = savedA;
    if (savedO) process.env.OPENAI_API_KEY = savedO;
  });
});
