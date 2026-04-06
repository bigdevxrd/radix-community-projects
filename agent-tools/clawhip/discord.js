// Clawhip — Discord Integration
// Connects to Discord to receive commands and send notifications

/**
 * Connect to Discord and wire events
 * @param {object} config — Clawhip config
 * @param {EventEmitter} emitter — event bus
 */
function connect(config, emitter) {
  // Discord integration requires the discord.js library
  // Install with: npm install discord.js
  let Client, GatewayIntentBits;
  try {
    const discord = require("discord.js");
    Client = discord.Client;
    GatewayIntentBits = discord.GatewayIntentBits;
  } catch {
    console.warn("[Clawhip/Discord] discord.js not installed. Run: npm install discord.js");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on("ready", () => {
    console.log(`[Clawhip/Discord] Logged in as ${client.user.tag}`);
  });

  client.on("messageCreate", (msg) => {
    // Ignore bots and messages outside the configured channel
    if (msg.author.bot) return;
    if (config.discordChannel && msg.channel.id !== config.discordChannel) return;

    // Commands start with !agent
    if (msg.content.startsWith("!agent ")) {
      const command = msg.content.slice(7).trim();
      emitter.emit("discord:command", {
        content: command,
        channel: msg.channel.id,
        author: msg.author.tag,
      });
      msg.reply("🤖 Task received. Working on it...");
    }
  });

  // Send notifications back to Discord
  emitter.on("notify", async ({ message }) => {
    if (!config.discordChannel) return;
    try {
      const channel = await client.channels.fetch(config.discordChannel);
      if (channel) await channel.send(message);
    } catch (err) {
      console.error("[Clawhip/Discord] Failed to send notification:", err.message);
    }
  });

  client.login(config.discordToken).catch((err) => {
    console.error("[Clawhip/Discord] Login failed:", err.message);
  });
}

module.exports = { connect };
