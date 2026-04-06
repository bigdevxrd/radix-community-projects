// Clawhip — The "Nervous System" and Router
// Background daemon that connects the local agent to Discord, GitHub, and tmux.
// Enables the "sleep while it works" loop.

const { EventEmitter } = require("events");

/**
 * Create a Clawhip router instance
 * @param {object} [opts]
 * @param {string} [opts.discordToken] — Discord bot token
 * @param {string} [opts.discordChannel] — Discord channel ID for notifications
 * @param {string} [opts.githubSecret] — GitHub webhook secret
 * @param {string} [opts.githubRepo] — GitHub repo (owner/name)
 * @param {string} [opts.tmuxSession] — tmux session name to monitor
 * @returns {object} Clawhip router
 */
function createRouter(opts = {}) {
  const emitter = new EventEmitter();
  const config = {
    discordToken: opts.discordToken || process.env.DISCORD_BOT_TOKEN,
    discordChannel: opts.discordChannel || process.env.DISCORD_CHANNEL_ID,
    githubSecret: opts.githubSecret || process.env.GITHUB_WEBHOOK_SECRET,
    githubRepo: opts.githubRepo || process.env.GITHUB_REPO,
    tmuxSession: opts.tmuxSession || process.env.TMUX_SESSION || "agent",
  };

  return {
    config,
    emitter,

    /**
     * Start all enabled integrations
     */
    start() {
      console.log("[Clawhip] Starting router...");

      if (config.discordToken) {
        const discord = require("./discord");
        discord.connect(config, emitter);
        console.log("[Clawhip] Discord integration enabled");
      }

      if (config.githubSecret) {
        const github = require("./github");
        github.listen(config, emitter);
        console.log("[Clawhip] GitHub webhook listener enabled");
      }

      // Always start tmux monitor if available
      const tmux = require("./tmux");
      if (tmux.isAvailable()) {
        tmux.monitor(config, emitter);
        console.log("[Clawhip] tmux monitoring enabled for session: " + config.tmuxSession);
      }

      // Route events to appropriate handlers
      emitter.on("discord:command", (msg) => {
        console.log(`[Clawhip] Discord command: ${msg.content}`);
        emitter.emit("task:new", { source: "discord", task: msg.content, channel: msg.channel });
      });

      emitter.on("github:issue", (issue) => {
        console.log(`[Clawhip] GitHub issue #${issue.number}: ${issue.title}`);
        if (issue.labels.includes("bug")) {
          emitter.emit("task:new", {
            source: "github",
            task: `Investigate bug: ${issue.title}\n${issue.body}`,
            issue: issue.number,
          });
        }
      });

      emitter.on("tmux:stuck", (session) => {
        console.log(`[Clawhip] Agent appears stuck in tmux session: ${session}`);
        emitter.emit("notify", { message: `⚠️ Agent stuck in session "${session}"` });
      });

      emitter.on("tmux:done", (session) => {
        console.log(`[Clawhip] Agent finished in tmux session: ${session}`);
        emitter.emit("notify", { message: `✅ Agent completed task in session "${session}"` });
      });

      console.log("[Clawhip] Router started. Listening for events...");
    },

    /**
     * Register a task handler
     * @param {function} handler — async (task) => result
     */
    onTask(handler) {
      emitter.on("task:new", handler);
    },

    /**
     * Register a notification handler
     * @param {function} handler — async ({message}) => void
     */
    onNotify(handler) {
      emitter.on("notify", handler);
    },

    /**
     * Send a notification to all connected channels
     * @param {string} message
     */
    notify(message) {
      emitter.emit("notify", { message });
    },

    /**
     * Stop all integrations
     */
    stop() {
      emitter.removeAllListeners();
      console.log("[Clawhip] Router stopped.");
    },
  };
}

module.exports = { createRouter };
