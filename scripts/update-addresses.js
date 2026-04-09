#!/usr/bin/env node
/**
 * update-addresses.js — Update all address references after redeployment
 *
 * Usage:
 *   node scripts/update-addresses.js \
 *     --package "package_rdx1..." \
 *     --factory "component_rdx1..." \
 *     --manager "component_rdx1..." \
 *     --badge "resource_rdx1..."
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Current addresses (v4)
const OLD = {
  package: "package_rdx1phm53al5ztrfw8k5wa3qc5pllwfyeqgl4spjcy83ymgw8jhngx7vu3",
  factory: "component_rdx1cqxdsz6d3zjsjx7shk2fgg8dazmrknygvqsa4943yw0yz4e69taxhg",
  manager: "component_rdx1czexylvvm0q4uhwpjaqmlznj9sd3y2jnmmah6qug9lm9sfm3tyrtva",
  badge: "resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl",
};

// Files to update (relative to repo root)
const FILES = [
  "bot/services/gateway.js",
  "guild-app/src/components/Shell.tsx",
  "guild-app/src/app/page.tsx",
  "guild-app/src/app/admin/page.tsx",
  "scripts/pipeline-test.js",
  "scripts/xp-batch-signer.js",
  "README.md",
  "docs/archive/INFRASTRUCTURE.md",
];

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace("--", "");
    const val = argv[i + 1];
    if (!val) { console.error("Missing value for --" + key); process.exit(1); }
    args[key] = val;
  }
  return args;
}

function main() {
  const newAddrs = parseArgs();

  // Validate
  const required = ["package", "factory", "manager", "badge"];
  for (const key of required) {
    if (!newAddrs[key]) {
      console.error("Missing --" + key);
      console.error("Usage: node scripts/update-addresses.js --package ... --factory ... --manager ... --badge ...");
      process.exit(1);
    }
    // Basic format check
    const prefix = key === "badge" ? "resource_rdx1" : key === "package" ? "package_rdx1" : "component_rdx1";
    if (!newAddrs[key].startsWith(prefix)) {
      console.error("--" + key + " should start with " + prefix);
      process.exit(1);
    }
  }

  console.log("\nAddress Update — v2 → v3\n");
  console.log("  Package:  " + OLD.package.slice(0, 30) + "... → " + newAddrs.package.slice(0, 30) + "...");
  console.log("  Factory:  " + OLD.factory.slice(0, 30) + "... → " + newAddrs.factory.slice(0, 30) + "...");
  console.log("  Manager:  " + OLD.manager.slice(0, 30) + "... → " + newAddrs.manager.slice(0, 30) + "...");
  console.log("  Badge:    " + OLD.badge.slice(0, 30) + "... → " + newAddrs.badge.slice(0, 30) + "...");
  console.log();

  let totalReplacements = 0;

  for (const relPath of FILES) {
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) {
      console.log("  SKIP " + relPath + " (not found)");
      continue;
    }

    let content = fs.readFileSync(filePath, "utf8");
    let count = 0;

    for (const key of required) {
      const oldAddr = OLD[key];
      const newAddr = newAddrs[key];
      const regex = new RegExp(oldAddr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const matches = content.match(regex);
      if (matches) {
        count += matches.length;
        content = content.replace(regex, newAddr);
      }
    }

    if (count > 0) {
      fs.writeFileSync(filePath, content);
      console.log("  OK   " + relPath + " (" + count + " replacements)");
      totalReplacements += count;
    } else {
      console.log("  SKIP " + relPath + " (no matches)");
    }
  }

  console.log("\n  Total: " + totalReplacements + " replacements across " + FILES.length + " files");
  console.log("\n  Remember to also update:");
  console.log("    - VPS /opt/guild/bot/.env (BADGE_NFT)");
  console.log("    - VPS /opt/guild/guild-app/.env.local (NEXT_PUBLIC_BADGE_NFT, NEXT_PUBLIC_MANAGER)");
  console.log("    - Memory file: .claude/projects/.../memory/project_mainnet_addresses.md");
  console.log();
}

main();
