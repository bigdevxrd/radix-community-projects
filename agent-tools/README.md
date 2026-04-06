# Agent Tools — Agentic Swarm Toolkit

A multi-agent development toolkit for this repo. Three modules working together:
**OMX** (planning + execution), **OmO** (state management), **Clawhip** (integrations).

```
   You (CLI / Discord / GitHub webhook)
    │
    ▼
┌─────────┐    ┌─────────┐    ┌──────────┐
│ Clawhip │───▶│   OmO   │───▶│   OMX    │
│ (Router)│    │(Manager)│    │(Workers) │
└─────────┘    └─────────┘    └──────────┘
  Discord         State        $architect
  GitHub          Context      $executor
  tmux            Conflicts    $team
```

## What Works Today

| Feature | Status | Requires API Key |
|---------|--------|-----------------|
| **Project scanning** (`scan`) | ✅ Working | No |
| **LLM-powered planning** (`architect`) | ✅ Working | Yes |
| **LLM-powered code generation** (`executor`) | ✅ Working | Yes |
| **Security review** (`reviewer`) | ✅ Working | No (regex-based) |
| **Full pipeline** (`run`) | ✅ Working | Yes (for implement steps) |
| **State persistence** | ✅ Working | No |
| **Conflict resolution** | ✅ Working | No |
| **Discord integration** | ✅ Working | No (needs `discord.js`) |
| **GitHub webhook listener** | ✅ Working | No |
| **tmux session monitoring** | ✅ Working | No |
| **Template-mode fallback** | ✅ Working | No |

**Without an API key:** Scan, analyze, test, and review all work. Implement steps are skipped.  
**With an API key:** The full pipeline works — architect plans, executor writes code, reviewer checks it.

## Quick Start

```bash
cd agent-tools
cp .env.example .env      # Add your API key (ANTHROPIC_API_KEY or OPENAI_API_KEY)
```

### Scan a project (no API key needed)

```bash
node bin/cli.js scan /path/to/project
```

### Generate a plan

```bash
node bin/cli.js architect "Add input validation to the API"
```

### Run the full pipeline

```bash
node bin/cli.js run "Fix the bug in user registration"
```

### Start the daemon (Discord/GitHub/tmux)

```bash
node bin/cli.js daemon
```

## CLI Commands

```
agent-tools scan [dir]       — Scan project structure (no API key needed)
agent-tools architect <task> — Generate an execution plan
agent-tools executor         — Execute the current plan from state
agent-tools reviewer         — Review completed work
agent-tools run <task>       — Full pipeline: plan → execute → review
agent-tools daemon           — Start Clawhip background daemon
agent-tools state            — Show OmO state
agent-tools help             — Show help
```

## Architecture

### OMX — Command Center

| Role | What It Does |
|------|-------------|
| **$architect** | Scans codebase → sends structure + task to LLM → gets back a step-by-step plan |
| **$executor** | For each plan step: reads relevant files → sends to LLM → writes returned edits to disk |
| **$team** | Scans changed files for security issues (eval, hardcoded secrets, SQL injection, etc.) |

### OmO — State Manager

- **State** — Persistent key-value store (JSON file) across sessions
- **Context Pruning** — Scores files by relevance to task, selects within token budget
- **Conflict Resolution** — 4-tier strategy: retry → replan → decompose → escalate to human
- **Handoff Verification** — Checks required files/env/state before passing between tasks

### Clawhip — Router/Daemon

- **Discord** — `!agent <task>` command triggers the pipeline, sends results back
- **GitHub** — Webhook listener; auto-triggers architect on `bug`-labeled issues
- **tmux** — Monitors a session for stuck detection (5 min no output → alert)

## LLM Integration

Uses native `fetch` (Node 20+) — **zero npm dependencies** for LLM calls.

Supported providers:
- **Anthropic** — Set `ANTHROPIC_API_KEY` (uses Claude)
- **OpenAI** — Set `OPENAI_API_KEY` (uses GPT-4o)

The architect, executor, and reviewer each accept a model override via env vars:
- `ARCHITECT_MODEL` (default: `claude-sonnet-4-20250514`)
- `EXECUTOR_MODEL` (default: `claude-sonnet-4-20250514`)
- `REVIEWER_MODEL` (default: `claude-sonnet-4-20250514`)

## Configuration

All configuration via environment variables (see `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | One of | — | Anthropic API key |
| `OPENAI_API_KEY` | these | — | OpenAI API key |
| `ARCHITECT_MODEL` | No | claude-sonnet-4-20250514 | Model for planning |
| `EXECUTOR_MODEL` | No | claude-sonnet-4-20250514 | Model for implementation |
| `REVIEWER_MODEL` | No | claude-sonnet-4-20250514 | Model for review |
| `MAX_CONTEXT_TOKENS` | No | 32000 | Context window budget |
| `DISCORD_BOT_TOKEN` | No | — | Enables Discord routing |
| `GITHUB_WEBHOOK_SECRET` | No | — | Enables GitHub auto-triage |
| `TMUX_SESSION` | No | agent | tmux session to monitor |
| `PROJECT_ROOT` | No | cwd | Root of project to work on |

## Module Structure

```
agent-tools/
├── bin/
│   └── cli.js            # CLI entry point
├── omx/                  # Command Center
│   ├── index.js          # Pipeline orchestrator
│   ├── llm.js            # LLM API caller (Anthropic + OpenAI)
│   ├── architect.js      # $architect — plan generation
│   ├── executor.js       # $executor — code implementation
│   └── reviewer.js       # $team — security review
├── omo/                  # State Manager
│   ├── index.js          # Manager factory
│   ├── state.js          # Persistent key-value state
│   ├── context.js        # Context pruning
│   ├── conflict.js       # Conflict resolution
│   └── handoff.js        # Handoff verification
├── clawhip/              # Router/Daemon
│   ├── index.js          # Event router
│   ├── discord.js        # Discord integration
│   ├── github.js         # GitHub webhook listener
│   └── tmux.js           # tmux session monitor
├── test/
│   └── basic.test.js     # Core module tests
├── package.json
├── .env.example
└── README.md
```

## Optional Dependencies

The core toolkit has **zero npm dependencies**. Optional integrations:

```bash
# Only needed if you want Discord integration
npm install discord.js

# Only needed if you want .env file auto-loading
npm install dotenv
```

## License

MIT — see [LICENSE](../LICENSE).
