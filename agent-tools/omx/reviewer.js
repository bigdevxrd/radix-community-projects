// $team — The Reviewer
// Quality control agent that reviews executor output for security, code smells,
// and adherence to the architect's plan.

const fs = require("fs");
const path = require("path");

const DEFAULT_MODEL = process.env.REVIEWER_MODEL || "claude-sonnet-4-20250514";

/**
 * Review all changes made by the executor
 * @param {object} opts
 * @param {object} opts.plan — the architect's plan
 * @param {object[]} opts.results — executor step results
 * @param {string} opts.projectRoot — project root
 * @param {string} [opts.model] — LLM model override
 * @returns {Promise<object>} review result
 */
async function review(opts) {
  const { plan, results, projectRoot, model = DEFAULT_MODEL } = opts;

  const issues = [];

  // Check 1: Did all steps pass?
  const failed = results.filter(r => r.status === "failed");
  if (failed.length > 0) {
    issues.push({
      severity: "error",
      category: "execution",
      message: `${failed.length} step(s) failed during execution`,
      details: failed.map(f => f.error).filter(Boolean),
    });
  }

  // Check 2: Security scan — look for common patterns
  const securityIssues = await scanSecurity(projectRoot, plan);
  issues.push(...securityIssues);

  // Check 3: Plan adherence — were all steps attempted?
  const skipped = plan.steps.filter(s => s.status === "pending");
  if (skipped.length > 0) {
    issues.push({
      severity: "warning",
      category: "completeness",
      message: `${skipped.length} step(s) were not executed`,
      details: skipped.map(s => s.description),
    });
  }

  const verdict = issues.some(i => i.severity === "error") ? "rejected" : "approved";

  return {
    model,
    timestamp: new Date().toISOString(),
    verdict,
    issues,
    summary: `${issues.length} issue(s) found. Verdict: ${verdict}`,
  };
}

/**
 * Basic security pattern scan
 * @param {string} projectRoot
 * @param {object} plan
 * @returns {Promise<object[]>} list of security issues
 */
async function scanSecurity(projectRoot, plan) {
  const issues = [];
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, label: "eval() usage", severity: "error" },
    { pattern: /child_process.*exec\(/, label: "Unguarded exec()", severity: "warning" },
    { pattern: /innerHTML\s*=/, label: "innerHTML assignment (XSS risk)", severity: "warning" },
    { pattern: /password\s*[:=]\s*['"][^'"]+['"]/, label: "Hardcoded password", severity: "error" },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/, label: "Hardcoded API key", severity: "error" },
    { pattern: /SELECT.*\+.*['"]/, label: "SQL injection risk", severity: "error" },
  ];

  // Only scan files that were part of the plan
  const filesToCheck = plan.steps
    .flatMap(s => s.files || [])
    .filter(f => f.match(/\.(js|ts|tsx|py)$/));

  for (const relPath of filesToCheck) {
    const fullPath = path.join(projectRoot, relPath);
    let content;
    try { content = fs.readFileSync(fullPath, "utf8"); } catch { continue; }

    for (const { pattern, label, severity } of dangerousPatterns) {
      if (pattern.test(content)) {
        issues.push({
          severity,
          category: "security",
          message: `${label} in ${relPath}`,
          file: relPath,
        });
      }
    }
  }

  return issues;
}

module.exports = { review, scanSecurity };
