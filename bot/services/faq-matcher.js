/**
 * faq-matcher.js — Zero-cost FAQ pattern matching
 *
 * Checks if a user's message matches known FAQ entries by keyword overlap.
 * If 2+ keywords match, suggests the FAQ answer before creating a ticket.
 * Always allows "submit anyway" — never blocks the user.
 */

const FAQ_ENTRIES = [
  {
    keywords: ["free", "cost", "xrd", "pay", "fee", "price"],
    q: "Is it free?",
    a: "Yes. Badge minting is free. Off-chain voting is free. No XRD required. On-chain CV2 votes cost ~0.1 XRD tx fee.",
  },
  {
    keywords: ["badge", "nft", "mint", "identity", "username"],
    q: "What is my badge?",
    a: "An on-chain NFT on the Radix ledger. It stores your username, tier, XP, and governance data. Non-transferable, permanently yours.",
  },
  {
    keywords: ["xp", "earn", "level", "tier", "points", "experience"],
    q: "How do I earn XP?",
    a: "Vote (+10 XP), propose (+25 XP), create polls (+25 XP), complete bounties (variable). Every action triggers a dice roll for bonus XP.",
  },
  {
    keywords: ["charter", "decision", "phase", "parameter", "unlock"],
    q: "What are the charter votes?",
    a: "32 governance decisions across 3 phases. Phase 1 sets rules, Phase 2 sets details, Phase 3 starts the DAO. Each phase unlocks when the previous completes.",
  },
  {
    keywords: ["cv2", "consultation", "chain", "ledger", "formal", "binding"],
    q: "What is Consultation v2?",
    a: "The Radix Foundation's on-chain governance system. We use the same CV2 smart contract. Votes are permanent and XRD-weighted.",
  },
  {
    keywords: ["who", "run", "admin", "control", "bigdev", "owner"],
    q: "Who runs this?",
    a: "bigdev built and maintains it. Open source (MIT). Admin transfers to elected RAC when Charter Step 3 completes. See /docs on the dashboard.",
  },
  {
    keywords: ["bounty", "task", "work", "claim", "submit", "escrow"],
    q: "How do bounties work?",
    a: "Admin creates bounty + reward. Claim with /bounty claim <id>. Submit work. Admin verifies. XRD released from escrow. Type /bounty list to see open bounties.",
  },
  {
    keywords: ["register", "wallet", "address", "connect", "account"],
    q: "How do I register?",
    a: "Type /register account_rdx1... with your Radix wallet address. Then mint a free badge at radixguild.com/mint",
  },
  {
    keywords: ["vote", "how", "where", "proposals", "telegram"],
    q: "How do I vote?",
    a: "Type /proposals to see active votes. Click the vote buttons on the proposal message. Or browse radixguild.com/proposals for the dashboard view.",
  },
  {
    keywords: ["bug", "error", "broken", "crash", "fail", "wrong", "issue"],
    q: "Found a bug?",
    a: "Please describe the issue with /feedback <your message>. Include what you were doing and what went wrong. We'll look into it.",
  },
];

/**
 * Check if a message matches any FAQ entry (2+ keyword hits required)
 * @param {string} message — user's feedback message
 * @returns {{ match: boolean, entry: object|null }} — matched FAQ entry or null
 */
function matchFaq(message) {
  const words = message.toLowerCase().split(/\s+/);

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of FAQ_ENTRIES) {
    const hits = entry.keywords.filter(kw => words.some(w => w.includes(kw) || kw.includes(w)));
    if (hits.length >= 2 && hits.length > bestScore) {
      bestScore = hits.length;
      bestMatch = entry;
    }
  }

  return { match: !!bestMatch, entry: bestMatch };
}

module.exports = { matchFaq, FAQ_ENTRIES };
