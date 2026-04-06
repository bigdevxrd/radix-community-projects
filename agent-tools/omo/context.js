// Context Pruning — identifies irrelevant files and trims the context window
// Keeps the agent context lean = smarter + cheaper

const fs = require("fs");
const path = require("path");

// Rough token estimate: 1 token ≈ 4 characters
const CHARS_PER_TOKEN = 4;

/**
 * Prune a list of files to fit within a token budget
 * Prioritizes files by relevance to the task description
 *
 * @param {string[]} files — candidate file paths
 * @param {string} task — current task description
 * @param {number} maxTokens — context token budget
 * @returns {string[]} pruned list of relevant file paths
 */
function pruneContext(files, task, maxTokens) {
  const taskLower = task.toLowerCase();
  const taskWords = taskLower.split(/\s+/).filter(w => w.length > 2);

  // Score each file by relevance
  const scored = files.map(f => {
    let score = 0;
    const fileLower = f.toLowerCase();
    const basename = path.basename(f, path.extname(f)).toLowerCase();

    // Filename matches task words
    for (const word of taskWords) {
      if (fileLower.includes(word)) score += 10;
      if (basename.includes(word)) score += 5;
    }

    // Penalize deep paths (less likely to be relevant)
    const depth = f.split(path.sep).length;
    score -= depth;

    // Boost entry points and config files
    if (basename === "index" || basename === "main") score += 8;
    if (basename === "package" || basename === "config") score += 5;
    if (f.includes("test") || f.includes("spec")) score += 3;

    // Penalize generated/build artifacts
    if (f.includes("node_modules") || f.includes("dist") || f.includes(".next")) {
      score -= 100;
    }

    return { file: f, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select files until token budget is exhausted
  const selected = [];
  let tokensUsed = 0;

  for (const { file } of scored) {
    try {
      const stat = fs.statSync(file);
      const fileTokens = Math.ceil(stat.size / CHARS_PER_TOKEN);
      if (tokensUsed + fileTokens > maxTokens) continue;
      selected.push(file);
      tokensUsed += fileTokens;
    } catch {
      // File doesn't exist or can't be read — skip
    }
  }

  return selected;
}

/**
 * Estimate token count for a string
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

module.exports = { pruneContext, estimateTokens };
